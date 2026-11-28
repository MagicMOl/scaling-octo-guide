import os

HTML = r'D:\本机电脑查询\restart-life-app\design-demos\dir-1-v6.html'

with open(HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# 1) 封面标题换成 A
old_title = '''<div class="cov2-title"><span class="cov2-sl s1"></span>先洗<br>一格<span class="cov2-sl s2"></span></div>'''
new_title = '''<div class="cov2-title"><span class="cov2-sl s1"></span>把「想做」<br>变成「在做」<span class="cov2-sl s2"></span></div>'''
assert old_title in html, 'title not found'
html = html.replace(old_title, new_title)

# 2) 入口文案去掉“洗”
html = html.replace('<span>轻触洗第一格</span>', '<span>轻触开始</span>')

# 3) 词条：删旧的，加新的
html = html.replace('    "先洗": "Develop",\n    "一格": "one frame",\n', '')
html = html.replace('    "轻触洗第一格": "Tap to develop the first frame",',
                    '    "轻触开始": "Tap to start",\n'
                    '    "把「想做」": "From “want to”",\n'
                    '    "变成「在做」": "to “doing”",')

# 4) 页面标题下加一行说明（副标已有），把「25 号底片」保留为署名
with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print('ok', round(os.path.getsize(HTML) / 1024), 'KB')
