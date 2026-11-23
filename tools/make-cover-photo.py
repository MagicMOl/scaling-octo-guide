from PIL import Image, ImageEnhance, ImageOps

SRC = r'D:\本机电脑查询\restart-life-app\crops9\photos\p17357314.jpg'
OUT = r'D:\本机电脑查询\restart-life-app\crops9\photos\cover-duotone.jpg'

img = Image.open(SRC).convert('RGB')
W, H = img.size

ratio = 393 / 438
ch = 632
cw = int(ch * ratio)          # ≈ 567
x0 = 392
y0 = H - ch                   # 从底部往上取，只要人流与斑马线
crop = img.crop((x0, y0, x0 + cw, y0 + ch))

g = ImageOps.grayscale(crop)
g = ImageEnhance.Contrast(g).enhance(1.22)
g = ImageEnhance.Brightness(g).enhance(1.06)

# 真正的双色调：亮度线性映射到 墨蓝 → 米白
ink = (34, 38, 44)
paper = (246, 239, 226)
lut_r = [int(ink[0] + (paper[0] - ink[0]) * (i / 255)) for i in range(256)]
lut_g = [int(ink[1] + (paper[1] - ink[1]) * (i / 255)) for i in range(256)]
lut_b = [int(ink[2] + (paper[2] - ink[2]) * (i / 255)) for i in range(256)]

duo = Image.merge('RGB', (
    g.point(lut_r),
    g.point(lut_g),
    g.point(lut_b),
))
duo = duo.resize((786, 876), Image.LANCZOS)
duo.save(OUT, 'JPEG', quality=86, optimize=True)
print('ok', duo.size)
