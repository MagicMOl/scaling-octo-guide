# 拆分单文件原型为多文件模块
import io, json, os, re

SRC = r'D:\本机电脑查询\restart-life-app\design-demos\dir-1-v6.html'
OUT_HTML = r'D:\本机电脑查询\restart-life-app\design-demos\dir-1-v7.html'
APP = r'D:\本机电脑查询\restart-life-app\design-demos\app'

with io.open(SRC, encoding='utf-8') as f:
    src = f.read()
lines = src.split('\n')

def L(a, b):
    """1-based, 含头含尾"""
    return '\n'.join(lines[a - 1:b])

os.makedirs(APP, exist_ok=True)

# ---------- 1. 样式 ----------
css = L(8, 568)  # <style> 内容

TOKENS = '''/* 设计变量 · 由视觉维护，其他文件只引用变量，不写死颜色 */
:root {
  --ink: #1C1913;        /* 主文字、描边 */
  --ink-soft: #4A4334;   /* 次级文字 */
  --paper: #F2EADA;      /* 纸底 */
  --paper-warm: #F6EFE2; /* 封面纸底 */
  --blue: #2B5C86;       /* 强调、链接 */
  --red: #B03A28;        /* 金额专用 */
  --orange: #D97B2E;     /* 风险、活泼强调 */
  --line: #DED3BE;       /* 分隔线 */
  --soft: #8A7E62;       /* 弱化文字 */
}

/* 字号阶梯（参考，逐步替换硬编码） */
:root {
  --fs-page: 26px;   /* 页面标题 */
  --fs-h2: 18px;
  --fs-body: 11.5px;
  --fs-label: 10px;
  --fs-tiny: 9px;
}
'''

styles = css
for old, var in [('#1C1913', 'var(--ink)'), ('#F2EADA', 'var(--paper)'),
                 ('#2B5C86', 'var(--blue)'), ('#B03A28', 'var(--red)')]:
    styles = styles.replace(old, var)

with io.open(os.path.join(APP, 'tokens.css'), 'w', encoding='utf-8') as f:
    f.write(TOKENS)
with io.open(os.path.join(APP, 'styles.css'), 'w', encoding='utf-8') as f:
    f.write(styles)

# ---------- 2. 模板 ----------
body_region = L(607, 956)
tpls = {}
for m in re.finditer(r'<template id="([^"]+)">([\s\S]*?)</template>', body_region):
    tpls[m.group(1)] = m.group(2)

tpl_js = ('/* 界面模板：脚本启动时注入为 <template> 元素。\n'
          '   修改这里等于改界面结构，注意与 app/styles.css 的类名对应。 */\n'
          'window.RL_TEMPLATES = ' + json.dumps(tpls, ensure_ascii=False, indent=0) + ';\n\n'
          '(function injectTemplates() {\n'
          '  Object.keys(window.RL_TEMPLATES).forEach(function (id) {\n'
          '    var t = document.createElement("template");\n'
          '    t.id = id;\n'
          '    t.innerHTML = window.RL_TEMPLATES[id];\n'
          '    document.body.appendChild(t);\n'
          '  });\n'
          '})();\n')
with io.open(os.path.join(APP, 'templates.js'), 'w', encoding='utf-8') as f:
    f.write(tpl_js)

# ---------- 3. 脚本分节 ----------
SECTIONS = [
    ('utils.js',   969,  989,  '通用小工具：撕纸多边形'),
    ('cover.js',   990,  1133, '封面：路口与速写人物（当前封面用实拍图，此段保留备用）'),
    ('core.js',    1134, 1182, '手机骨架：PHONES / TABS / buildPhone'),
    ('data.js',    1183, 1469, '档案数据模型与存储'),
    ('film.js',    1470, 1605, 'AI 读底片'),
    ('project.js', 1606, 1709, '立项：需求录入与方案生成'),
    ('tracking.js',1710, 1931, '下单后的物流追踪'),
    ('mobile.js',  1932, 1994, '手机模式与左右滑动'),
    ('i18n.js',    1995, 2436, '中英切换与启动'),
]
for name, a, b, desc in SECTIONS:
    body = L(a, b)
    with io.open(os.path.join(APP, name), 'w', encoding='utf-8') as f:
        f.write('/* ' + desc + ' */\n' + body + '\n')

# ---------- 4. 新壳 ----------
board = L(574, 606)
mobile = L(960, 967)

html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>寻找人生的 25 号底片</title>
<link rel="stylesheet" href="app/tokens.css">
<link rel="stylesheet" href="app/styles.css">
</head>
<body>

<div id="fit"><div id="board">

''' + board + '''

</div><!-- /#board -->
</div><!-- /#fit -->

''' + mobile + '''

<script src="app/templates.js"></script>
<script src="app/utils.js"></script>
<script src="app/cover.js"></script>
<script src="app/core.js"></script>
<script src="app/data.js"></script>
<script src="app/film.js"></script>
<script src="app/project.js"></script>
<script src="app/tracking.js"></script>
<script src="app/mobile.js"></script>
<script src="app/i18n.js"></script>
</body>
</html>
'''

with io.open(OUT_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('模板数', len(tpls))
for name, a, b, _ in SECTIONS:
    p = os.path.join(APP, name)
    print('%-13s %6.1f KB' % (name, os.path.getsize(p) / 1024))
print('styles.css    %6.1f KB' % (os.path.getsize(os.path.join(APP, 'styles.css')) / 1024))
print('templates.js  %6.1f KB' % (os.path.getsize(os.path.join(APP, 'templates.js')) / 1024))
print('dir-1-v7.html %6.1f KB' % (os.path.getsize(OUT_HTML) / 1024))
