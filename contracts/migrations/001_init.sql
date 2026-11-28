-- 25号底片 · 初始表结构（Supabase / Postgres 15+）
-- 应用方式：在 Supabase SQL Editor 里整段执行，或 supabase db push
-- 设计约束：所有表行级安全，一条记录只属于一个人；软删除保留 30 天，账号删除走级联

create extension if not exists "pgcrypto";

-- ---------- 档案主体 ----------
create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale       text not null default 'zh' check (locale in ('zh', 'en')),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- 年份块：以自然年为边界，一个用户一年只有一块
create table if not exists film_blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  year       int  not null check (year between 1900 and 2100),
  identity   text check (char_length(identity) <= 40),
  city       text check (char_length(city) <= 40),
  line       text check (char_length(line) <= 200),
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

-- 记录条目：人工补记、模型回写、三条导入通道共用一张表，靠 source 区分
create table if not exists records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  block_id    uuid not null references film_blocks (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  occurred_on date,
  source      text not null default 'manual'
              check (source in ('manual', 'ai', 'import_photo', 'import_calendar', 'import_resume')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- 结论：payload 严格按 contracts/analysis.schema.json，服务端落库前先校验
create table if not exists analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  payload    jsonb not null,
  model      text,
  ok         boolean not null default true,
  error      text,
  created_at timestamptz not null default now()
);

-- 立项
create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  block_id   uuid references film_blocks (id) on delete set null,
  title      text not null check (char_length(title) between 1 and 60),
  need_what  text,
  need_who   text,
  need_when  text,
  plan       jsonb,                      -- 两版方案与三维评审
  chosen     text check (chosen in ('A', 'B')),
  status     text not null default 'draft'
             check (status in ('draft', 'planned', 'team', 'funded', 'ordered', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 下单与物流
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  project_id    uuid references projects (id) on delete set null,
  items         jsonb not null,          -- [{title, vendor, price_cents, qty}]
  vendor        text,
  amount_cents  int  not null check (amount_cents >= 0),
  status        text not null default 'placed'
                check (status in ('placed', 'shipped', 'in_transit', 'delivering', 'delivered')),
  tracking_no   text,
  events        jsonb not null default '[]'::jsonb,  -- [{at, label, done}]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- AI 调用台账：成本熔断与事后审计都靠它，只记元数据，不记正文
create table if not exists ai_calls (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles (id) on delete cascade,
  kind              text not null check (kind in ('analysis', 'plan', 'match', 'pick')),
  model             text,
  prompt_tokens     int,
  completion_tokens int,
  cost_cents        int check (cost_cents >= 0),
  ok                boolean not null default true,
  error             text,
  created_at        timestamptz not null default now()
);

-- ---------- 索引 ----------
create index if not exists idx_blocks_user_year on film_blocks (user_id, year desc);
create index if not exists idx_records_user_block on records (user_id, block_id) where deleted_at is null;
create index if not exists idx_records_occurred on records (user_id, occurred_on) where occurred_on is not null;
create index if not exists idx_analyses_user_time on analyses (user_id, created_at desc);
create index if not exists idx_projects_user on projects (user_id, status);
create index if not exists idx_orders_user on orders (user_id, status);
create index if not exists idx_ai_calls_user_time on ai_calls (user_id, created_at desc);

-- ---------- 行级安全 ----------
alter table profiles    enable row level security;
alter table film_blocks enable row level security;
alter table records     enable row level security;
alter table analyses    enable row level security;
alter table projects    enable row level security;
alter table orders      enable row level security;
alter table ai_calls    enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- 其余表统一：user_id 必须是当前登录用户
do $$
declare t text;
begin
  foreach t in array array['film_blocks', 'records', 'analyses', 'projects', 'orders', 'ai_calls']
  loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- 越权访问由 RLS 直接返回空结果；写越权返回 403

-- ---------- 更新时间戳 ----------
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['film_blocks', 'records', 'projects', 'orders']
  loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$I', t);
    execute format(
      'create trigger trg_touch_%1$s before update on %1$I for each row execute function touch_updated_at()',
      t);
  end loop;
end $$;

-- ---------- 账号删除：24 小时内硬删 ----------
-- 调用方式：先 update profiles set deleted_at = now()，再由每日任务清理
create or replace function purge_deleted_profiles() returns int as $$
declare n int;
begin
  delete from profiles where deleted_at is not null and deleted_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer;

-- ---------- 当日花费（成本熔断用） ----------
create or replace function today_cost_cents(uid uuid) returns int as $$
  select coalesce(sum(cost_cents), 0)::int
  from ai_calls
  where user_id = uid and created_at >= date_trunc('day', now());
$$ language sql stable;
