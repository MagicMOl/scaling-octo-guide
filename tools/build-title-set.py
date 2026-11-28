import base64, os

IMG = r'D:\本机电脑查询\restart-life-app\crops9\photos\cover-duotone.jpg'
OUT = r'D:\本机电脑查询\restart-life-app\design-demos\home-concepts\TITLES.html'

with open(IMG, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

SETS = [
    ('A', '把「想做」<br>变成「在做」', '十一年，四格已显影<br>剩下的，一条路推到开工'),
    ('B', '今年，<br>做成一件小事', '不用多大，先做完一件<br>它会带你到下一件'),
    ('C', '先搞清楚<br>你擅长什么', '底片里已经写着答案<br>只是还没读出来'),
    ('D', '从想法<br>到开工', '需求、团队、钱、设备<br>四步，推到能下单'),
    ('E', '你人生的<br>下一个项目', '从哪一年开始都不晚<br>挑一格，就是起点'),
    ('F', '重启<br>一次', '这一次不从零开始<br>从你已经有的十一年开始'),
]

cards = []
for key, title, sub in SETS:
    cards.append(f'''
    <div class="card">
      <div class="mini">
        <div class="ph"></div>
        <div class="fade"></div>
        <div class="tx">
          <div class="au">25 号底片</div>
          <div class="ti">{title}</div>
          <p class="su">{sub}</p>
        </div>
        <div class="en"><span>轻触开始</span></div>
      </div>
      <div class="lab"><b>{key}</b></div>
    </div>''')

html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>封面标题六选</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{background:#EDE6D6;padding:44px 0;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}}
  .grid{{width:864px;margin:0 auto;display:flex;flex-wrap:wrap;gap:26px;justify-content:center}}
  .card{{width:260px}}
  .mini{{position:relative;width:260px;height:564px;background:#F6EFE2;overflow:hidden;
    box-shadow:0 8px 24px rgba(28,25,19,.14);border-radius:6px}}
  .ph{{position:absolute;left:0;right:0;top:0;height:58%;
    background-image:url(data:image/jpeg;base64,{b64});background-size:cover;background-position:center 42%}}
  .fade{{position:absolute;left:0;right:0;top:calc(58% - 50px);height:66px;
    background:linear-gradient(to bottom,rgba(246,239,226,0),#F6EFE2 88%)}}
  .tx{{position:absolute;left:0;right:0;top:60%;text-align:center;padding:0 18px}}
  .au{{font-size:7.5px;letter-spacing:.34em;color:#3A4A5C;font-weight:600}}
  .ti{{margin-top:11px;font-family:"Noto Serif SC","Songti SC",serif;font-weight:300;
    font-size:23px;line-height:1.52;letter-spacing:.08em;color:#22262E}}
  .su{{margin-top:12px;font-size:8.5px;line-height:1.95;color:#6F6858;letter-spacing:.04em}}
  .en{{position:absolute;left:0;right:0;bottom:30px;text-align:center}}
  .en span{{font-size:7.5px;letter-spacing:.3em;color:#8A8271}}
  .lab{{margin-top:12px;text-align:center}}
  .lab b{{display:inline-block;width:22px;height:22px;line-height:22px;border-radius:50%;
    background:#22262E;color:#F6EFE2;font-size:11px;text-align:center}}
</style>
</head>
<body><div class="grid">{''.join(cards)}</div>
</body>
</html>
'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('ok', round(os.path.getsize(OUT) / 1024), 'KB')
