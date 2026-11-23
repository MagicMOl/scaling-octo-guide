import base64, io, os, re

HTML = r'D:\本机电脑查询\restart-life-app\design-demos\dir-1-v6.html'
IMG = r'D:\本机电脑查询\restart-life-app\crops9\photos\cover-duotone.jpg'

with open(IMG, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

with open(HTML, 'r', encoding='utf-8') as f:
    html = f.read()

start = html.index('<div class="scr" data-name="cover">')
end = html.index('</template>', start)

new_block = '''<div class="scr" data-name="cover">
      <div class="cov2" data-go="film">
        <div class="cov2-img"><img src="data:image/jpeg;base64,%s" alt=""></div>
        <div class="cov2-scrim"></div>
        <div class="cov2-fade"></div>
        <div class="cov2-type">
          <div class="cov2-author">25 号底片</div>
          <div class="cov2-title"><span class="cov2-sl s1"></span>先洗<br>一格<span class="cov2-sl s2"></span></div>
          <p class="cov2-sub">十一年，四格已显影<br>还剩二十一格，等你走到</p>
        </div>
        <div class="cov2-enter"><span>轻触洗第一格</span><i></i></div>
      </div>
    </div>
  ''' % b64

html = html[:start] + new_block + html[end:]

css = '''
  /* ---------- 封面（实拍长曝光） ---------- */
  .cov2 { position: absolute; inset: 0; overflow: hidden; background: #F6EFE2; }
  .cov2-img { position: absolute; left: 0; right: 0; top: 0; height: 58%; overflow: hidden; }
  .cov2-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; display: block; }
  .cov2-scrim { position: absolute; left: 0; right: 0; top: 0; height: 64px;
    background: linear-gradient(to bottom, rgba(246,239,226,.92), rgba(246,239,226,0)); }
  .cov2-fade { position: absolute; left: 0; right: 0; top: calc(58% - 74px); height: 96px;
    background: linear-gradient(to bottom, rgba(246,239,226,0), #F6EFE2 88%); }
  .cov2-type { position: absolute; left: 0; right: 0; top: 60.5%; text-align: center; }
  .cov2-author { font-size: 9px; letter-spacing: .36em; color: #3A4A5C; font-weight: 600; }
  .cov2-title { margin-top: 16px; display: inline-block; position: relative;
    font-family: "Noto Serif SC","Songti SC",serif; font-weight: 300;
    font-size: 34px; line-height: 1.5; letter-spacing: .16em; color: #22262E; }
  .cov2-sl { position: absolute; width: 1px; background: rgba(58,74,92,.28); }
  .cov2-sl.s1 { left: -28px; top: 2px; height: 62px; transform: rotate(-17deg); }
  .cov2-sl.s2 { right: -24px; bottom: 6px; height: 44px; transform: rotate(-17deg); }
  .cov2-sub { margin-top: 16px; font-size: 10px; line-height: 1.95; color: #6F6858; letter-spacing: .06em; }
  .cov2-enter { position: absolute; left: 0; right: 0; bottom: 74px; text-align: center; }
  .cov2-enter span { font-size: 9.5px; letter-spacing: .3em; color: #7A7261; }
  .cov2-enter i { display: block; width: 1px; height: 18px; background: rgba(58,74,92,.35); margin: 10px auto 0; }

'''
html = html.replace('</style>', css + '</style>', 1)

# 导航与文案
html = html.replace("{ key: 'cover', label: '路口' }", "{ key: 'cover', label: '封面' }")
html = html.replace("一　路口 · 封面（tab 1）", "一　封面（tab 1）")
html = html.replace("底部四个导航（路口 / 底片 / 项目 / 我）", "底部四个导航（封面 / 底片 / 项目 / 我）")
html = html.replace('"路口": "Crossing",', '"封面": "Cover",')
html = html.replace('"走进路口": "Step into the crossing",',
                    '"走进路口": "Step into the crossing",\n    "轻触洗第一格": "Tap to develop the first frame",\n    "十一年，四格已显影": "Eleven years, four frames developed",\n    "还剩二十一格，等你走到": "Twenty-one left, waiting for you",')

with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('done', round(os.path.getsize(HTML) / 1024), 'KB')
