import os

HTML = r'D:\本机电脑查询\restart-life-app\design-demos\dir-1-v6.html'

with open(HTML, 'r', encoding='utf-8') as f:
    html = f.read()

old = '''<p class="cov2-sub">十一年，四格已显影<br>还剩二十一格，等你走到</p>
        </div>
        <div class="cov2-enter"><span>轻触洗第一格</span><i></i></div>'''
new = '''<p class="cov2-sub">十一年，四格已显影<br>还剩二十一格，等你走到</p>
          <div class="cov2-enter"><span>轻触洗第一格</span><i></i></div>
        </div>'''
assert old in html, 'markup not found'
html = html.replace(old, new)

html = html.replace(
    '.cov2-enter { position: absolute; left: 0; right: 0; bottom: 74px; text-align: center; }',
    '.cov2-enter { position: static; margin-top: 20px; text-align: center; }')
html = html.replace('.cov2-type { position: absolute; left: 0; right: 0; top: 60.5%; text-align: center; }',
                    '.cov2-type { position: absolute; left: 0; right: 0; top: 60%; text-align: center; }')
html = html.replace('.cov2-title { margin-top: 16px;', '.cov2-title { margin-top: 14px;')

with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)
print('patched', round(os.path.getsize(HTML) / 1024), 'KB')
