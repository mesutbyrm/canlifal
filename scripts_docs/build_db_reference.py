#!/usr/bin/env python3
"""Parse schema.prisma -> DATABASE_REFERENCE.md (models, fields, relations, enums)."""
import os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SCHEMA = os.path.join(ROOT, 'nextjs_space', 'prisma', 'schema.prisma')
OUT = os.path.join(ROOT, 'backend-docs', 'DATABASE_REFERENCE.md')

with open(SCHEMA, encoding='utf-8') as f:
    txt = f.read()

# enums
enums = re.findall(r'enum\s+(\w+)\s*\{([^}]*)\}', txt)

# models
model_blocks = re.findall(r'model\s+(\w+)\s*\{(.*?)\n\}', txt, re.S)

SCALAR = {'String','Int','BigInt','Float','Decimal','Boolean','DateTime','Json','Bytes'}

def parse_model(name, body):
    fields = []
    relations = []
    dbmap = None
    indexes = []
    for raw in body.split('\n'):
        line = raw.strip()
        if not line or line.startswith('//'):
            continue
        if line.startswith('@@map'):
            m = re.search(r'@@map\("([^"]+)"\)', line); dbmap = m.group(1) if m else None; continue
        if line.startswith('@@index') or line.startswith('@@unique'):
            indexes.append(line); continue
        if line.startswith('@@'):
            continue
        m = re.match(r'(\w+)\s+([\w\[\]?]+)(.*)', line)
        if not m:
            continue
        fname, ftype, rest = m.group(1), m.group(2), m.group(3)
        base = ftype.rstrip('?[]')
        optional = ftype.endswith('?')
        is_list = ftype.endswith('[]')
        comment = ''
        if '//' in rest:
            comment = rest.split('//',1)[1].strip()
            rest = rest.split('//',1)[0]
        attrs = []
        if '@id' in rest: attrs.append('PK')
        if '@unique' in rest: attrs.append('unique')
        dm = re.search(r'@default\(([^)]*)\)', rest)
        if dm: attrs.append(f'default={dm.group(1)}')
        if base not in SCALAR and base not in [e[0] for e in enums]:
            rel = re.search(r'@relation\(([^)]*)\)', rest)
            relations.append((fname, ftype, rel.group(1) if rel else '', comment))
        else:
            fields.append((fname, ftype, ', '.join(attrs), comment))
    return fields, relations, dbmap, indexes

lines = []
lines.append('# 🗄️ CanlıFal — Veritabanı Referansı (Prisma)\n')
lines.append(f'> Toplam **{len(model_blocks)} model**, **{len(enums)} enum**. PostgreSQL. Kaynak: `schema.prisma`.\n')
lines.append('> Tam SQL DDL için `database_schema.sql` dosyasına bakın (193 tablo, 149 foreign key, 527 index).\n')
lines.append('\n> **Not:** Proje `prisma db push` kullandığı için ayrı migration geçmişi dosyaları yoktur. `database_schema.sql` tam şemayı (tek migration olarak) içerir.\n')

if enums:
    lines.append('\n## Enumlar\n')
    lines.append('> Not: Bu projede alan tipleri çoğunlukla `String` olarak tutulur; geçerli değerler kod ve açıklamalarda belirtilir.\n')
    for en, body in enums:
        vals = [v.strip() for v in body.split('\n') if v.strip() and not v.strip().startswith('//')]
        lines.append(f'\n### `{en}`\n')
        lines.append('`' + '`, `'.join(vals) + '`\n')
else:
    lines.append('\n## Enumlar\n\nBu şemada Prisma `enum` tanımı kullanılmamıştır. Durum/rol/tip alanları `String` olarak saklanır; geçerli değerler ilgili modelin alan açıklamalarında ve API dokümantasyonunda verilir. Örnekler: `User.role` = `user | admin | yonetici | moderator | finans`, `User.membership` = `basic | premium | gold`.\n')

lines.append('\n## İçindekiler (Modeller)\n')
for name, _ in model_blocks:
    lines.append(f'- [{name}](#model-{name.lower()})')

lines.append('\n---\n')
lines.append('\n## Modeller\n')
for name, body in model_blocks:
    fields, relations, dbmap, indexes = parse_model(name, body)
    lines.append(f'\n### <a name="model-{name.lower()}"></a>`{name}`' + (f' → tablo `{dbmap}`' if dbmap else '') + '\n')
    lines.append('| Alan | Tip | Nitelikler | Açıklama |')
    lines.append('|------|-----|-----------|----------|')
    for fn, ft, at, cm in fields:
        lines.append(f'| `{fn}` | `{ft}` | {at or "—"} | {cm or ""} |')
    if relations:
        lines.append('\n**İlişkiler:**\n')
        lines.append('| Alan | Hedef | @relation | Açıklama |')
        lines.append('|------|-------|-----------|----------|')
        for fn, ft, rl, cm in relations:
            lines.append(f'| `{fn}` | `{ft}` | {rl or "—"} | {cm or ""} |')
    if indexes:
        lines.append('\n**Index/Unique:**\n')
        for ix in indexes:
            lines.append(f'- `{ix}`')
    lines.append('')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('Wrote', OUT, 'models:', len(model_blocks), 'enums:', len(enums))
