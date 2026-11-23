import base64, io, os

IMG = r'D:\本机电脑查询\restart-life-app\crops9\photos\cover-duotone.jpg'
OUT = r'D:\本机电脑查询\restart-life-app\design-demos\home-concepts\BOOK-PHOTO.html'

with open(IMG, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>封面 · 长曝光实拍</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--paper:#F6EFE2;--ink:#22262E;--blue:#3A4A5C;--soft:#8A8271;--line:#DED3BE}
  body{width:393px;height:852px;background:var(--paper);color:var(--ink);overflow:hidden;position:relative;
    font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
  .sb{position:relative;z-index:6;height:54px;display:flex;align-items:flex-end;justify-content:space-between;
    padding:0 24px 6px;font-size:11px;font-weight:600;color:#2A2E36;opacity:.8}
  .sb .r{display:flex;gap:5px;align-items:center}
  .sb i{display:block;width:22px;height:10px;border:1px solid currentColor;border-radius:3px;position:relative}
  .sb i::after{content:'';position:absolute;inset:1.5px 8px 1.5px 1.5px;background:currentColor;opacity:.85}

  .scene{position:absolute;left:0;right:0;top:0;height:448px;overflow:hidden}
  .scene img{width:100%;height:100%;object-fit:cover;object-position:center 38%;display:block}
  .fade{position:absolute;left:0;right:0;bottom:0;height:96px;
    background:linear-gradient(to bottom,rgba(246,239,226,0),var(--paper) 82%)}

  .type{position:absolute;left:0;right:0;top:470px;text-align:center;z-index:3}
  .author{font-size:9px;letter-spacing:.36em;color:var(--blue);font-weight:600}
  .title{margin-top:22px;display:inline-block;position:relative;
    font-family:"Noto Serif SC","Songti SC",serif;font-weight:300;
    font-size:42px;line-height:1.5;letter-spacing:.16em;color:var(--ink)}
  .slash{position:absolute;width:1px;background:rgba(58,74,92,.28)}
  .s1{left:-34px;top:4px;height:76px;transform:rotate(-17deg)}
  .s2{right:-30px;bottom:8px;height:54px;transform:rotate(-17deg)}
  .sub{margin-top:20px;font-size:11px;line-height:2;color:#6F6858;letter-spacing:.08em}

  .enter{position:absolute;left:0;right:0;bottom:96px;text-align:center;z-index:3}
  .enter span{font-size:10px;letter-spacing:.32em;color:#7A7261}
  .enter .rule{width:1px;height:22px;background:rgba(58,74,92,.35);margin:14px auto 0}

  .credit{position:absolute;left:0;right:0;bottom:70px;text-align:center;z-index:3;
    font-size:8px;letter-spacing:.12em;color:#B3A992}

  .tabs{position:absolute;left:0;right:0;bottom:0;height:66px;border-top:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-around;font-size:10px;letter-spacing:.16em;
    color:#ADA28B;z-index:5;background:var(--paper)}
  .tabs .on{color:var(--ink)}
</style>
</head>
<body>
  <div class="scene">
    <img src="data:image/jpeg;base64,__B64__" alt="长曝光的人群">
    <div class="fade"></div>
  </div>

  <div class="sb"><span>9:41</span><div class="r"><span>◍</span><span>▮▮▮</span><i></i></div></div>

  <div class="type">
    <div class="author">25 号底片</div>
    <div class="title">
      <span class="slash s1"></span>
      先洗<br>一格
      <span class="slash s2"></span>
    </div>
    <p class="sub">十一年，四格已显影<br>还剩二十一格，等你走到</p>
  </div>

  <div class="enter">
    <span>轻触洗第一格</span>
    <div class="rule"></div>
  </div>

  <div class="credit">照片 Pexels · 免费使用</div>
  <div class="tabs"><span class="on">封面</span><span>底片</span><span>项目</span><span>我</span></div>
</body>
</html>
"""

html = html.replace('__B64__', b64)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('written', OUT, round(os.path.getsize(OUT) / 1024), 'KB')
