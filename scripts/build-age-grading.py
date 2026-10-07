"""Builds config/age-grading.road2025.json from the 2025 WMA/USATF road
age-grading tables (Alan Jones, CC0 public domain):
https://github.com/AlanLyttonJones/Age-Grade-Tables/tree/master/2025%20Files

    python3 scripts/build-age-grading.py

Downloads Male/FemaleRoadStd2025.xlsx and keeps the per-age standards (seconds)
for the distances Mettle benchmarks. Standard library only.
"""
import io
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

BASE = 'https://raw.githubusercontent.com/AlanLyttonJones/Age-Grade-Tables/master/2025%20Files/'
FILES = {'male': 'MaleRoadStd2025.xlsx', 'female': 'FemaleRoadStd2025.xlsx'}
DISTANCES = {'5 km': 5000, '10 km': 10000}
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def rows(sheet_xml, strings):
    for r in ET.fromstring(sheet_xml).iter('{%s}row' % NS['m']):
        row = {}
        for c in r.findall('m:c', NS):
            v = c.find('m:v', NS)
            if v is None:
                continue
            col = re.match(r'[A-Z]+', c.get('r')).group(0)
            row[col] = strings[int(v.text)] if c.get('t') == 's' else v.text
        yield row


def standards(xlsx_bytes):
    z = zipfile.ZipFile(io.BytesIO(xlsx_bytes))
    strings = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m']))
               for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    # sheet2 = "Road Age Standards in Seconds"
    data = list(rows(z.read('xl/worksheets/sheet2.xml'), strings))
    header = next(r for r in data if r.get('A') == 'Age')
    cols = {header[c].strip(): c for c in header if c != 'A'}
    out = {}
    for label, metres in DISTANCES.items():
        col = cols[label]
        out[str(metres)] = {r['A']: round(float(r[col])) for r in data if r.get('A', '').isdigit() and col in r}
    return out


tables = {}
for sex, name in FILES.items():
    with urllib.request.urlopen(BASE + name, timeout=60) as resp:
        tables[sex] = standards(resp.read())

Path(__file__).resolve().parent.parent.joinpath('config', 'age-grading.road2025.json').write_text(json.dumps({
    'version': 'wma-usatf-road-2025',
    'source': 'WMA/USATF 2025 road age-grading standards (Alan Jones), CC0',
    'unit': 'seconds',
    'standards': tables,
}, indent=1) + '\n')
print({s: {d: len(v) for d, v in t.items()} for s, t in tables.items()})
