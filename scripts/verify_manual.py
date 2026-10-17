"""Check the generated manual and render contact sheets for visual review.
Run with the bundled Python (pypdf, pdfplumber, pypdfium2 and Pillow).
"""
import json
import re
from pathlib import Path
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
manual = root / 'Instrukcja/Podrecznik_Uzytkownika.md'
pdf_path = root / 'Instrukcja/Podrecznik_Uzytkownika.pdf'
out = root / 'outputs/qa/manual_7_8_1'
out.mkdir(parents=True, exist_ok=True)
references = re.findall(r'!\[[^\]]*\]\(([^)]+)\)', manual.read_text(encoding='utf-8'))
missing = [name for name in references if not (manual.parent / name).is_file()]
with pdfplumber.open(pdf_path) as document:
    texts = [page.extract_text() or '' for page in document.pages]
    bounds = []
    for number, page in enumerate(document.pages, 1):
        for word in page.extract_words():
            if word['x0'] < 0 or word['x1'] > page.width + 1 or word['top'] < 0 or word['bottom'] > page.height + 1:
                bounds.append({'page': number, 'text': word['text']})
    required = ['3.1.', '3.2.', '3.3.', '3.4.', '3.5.', '3.6.', '3.7.', '3.8.', '3.9.', '4. Ważne zasady']
    joined = '\n'.join(texts)
    absent = [item for item in required if item not in joined]
    blank = [i + 1 for i, text in enumerate(texts) if not text.strip()]
renderer = pdfium.PdfDocument(str(pdf_path))
for start in range(0, len(renderer), 16):
    sheet = Image.new('RGB', (1240, 1840), '#dbe1e8')
    draw = ImageDraw.Draw(sheet)
    for offset in range(min(16, len(renderer) - start)):
        page = renderer[start + offset]
        picture = page.render(scale=0.5).to_pil().convert('RGB')
        picture.thumbnail((295, 425))
        x = (offset % 4) * 310 + 7
        y = (offset // 4) * 460 + 25
        sheet.paste(picture, (x, y))
        draw.text((x, y - 18), f'Strona {start + offset + 1}', fill='black')
        page.close()
    sheet.save(out / f'contact_{start // 16 + 1}.png')
for number in [1, len(renderer)]:
    page = renderer[number - 1]
    page.render(scale=1.3).to_pil().save(out / f'page_{number}.png')
    page.close()
report = {'pages': len(renderer), 'imageReferences': len(references), 'missingImages': missing,
          'absentSections': absent, 'blankPages': blank, 'wordsOutsidePage': bounds,
          'pagesBySection': {item: [i + 1 for i, text in enumerate(texts) if item in text] for item in required}}
renderer.close()
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
if missing or absent or blank or bounds:
    raise SystemExit('Manual verification failed; inspect generated pages.')
