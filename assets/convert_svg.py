import sys
from pathlib import Path
svg = Path('assets/architecture.svg')
png = Path('assets/architecture.png')

if not svg.exists():
    print('SVG not found at', svg)
    sys.exit(1)

# Try cairosvg first
try:
    import cairosvg
    cairosvg.svg2png(url=str(svg), write_to=str(png), output_width=1200)
    print('OK: converted via cairosvg')
    sys.exit(0)
except Exception as e:
    print('cairosvg conversion failed:', e)

# Fallback: create a simple placeholder PNG using Pillow
try:
    from PIL import Image, ImageDraw, ImageFont
    w, h = 1200, 700
    im = Image.new('RGB', (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(im)
    title = 'TempSafe Architecture'
    body = 'See ARCHITECTURE.md for the full diagram.'
    try:
        font_title = ImageFont.truetype('arial.ttf', 36)
        font_body = ImageFont.truetype('arial.ttf', 20)
    except Exception:
        font_title = None
        font_body = None
    draw.text((60, 60), title, fill=(45,55,72), font=font_title)
    draw.text((60, 120), body, fill=(74,85,104), font=font_body)
    im.save(png)
    print('OK: placeholder PNG created via Pillow')
    sys.exit(0)
except Exception as e:
    print('Pillow fallback failed:', e)
    sys.exit(2)
