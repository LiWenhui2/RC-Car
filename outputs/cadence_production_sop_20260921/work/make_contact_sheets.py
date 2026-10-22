from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

src = Path(r"H:\RC-Car\outputs\cadence_production_sop_20260921\render5")
pages = sorted(src.glob("page-*.png"))
out = src / "contacts"
out.mkdir(exist_ok=True)

thumb_w = 700
margin = 18
label_h = 36
for group_idx in range(0, len(pages), 4):
    batch = pages[group_idx:group_idx+4]
    thumbs = []
    for p in batch:
        im = Image.open(p).convert("RGB")
        h = round(im.height * thumb_w / im.width)
        im = im.resize((thumb_w, h))
        canvas = Image.new("RGB", (thumb_w + 2*margin, h + label_h + 2*margin), "#D9DEE5")
        canvas.paste(im, (margin, margin + label_h))
        d = ImageDraw.Draw(canvas)
        d.text((margin, 8), p.stem, fill="black")
        thumbs.append(canvas)
    cell_w = max(x.width for x in thumbs)
    cell_h = max(x.height for x in thumbs)
    sheet = Image.new("RGB", (cell_w*2, cell_h*2), "#AEB7C2")
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i%2)*cell_w, (i//2)*cell_h))
    sheet.save(out / f"contact-{group_idx//4+1:02d}.jpg", quality=88)
print(len(pages), len(list(out.glob('contact-*.jpg'))))
