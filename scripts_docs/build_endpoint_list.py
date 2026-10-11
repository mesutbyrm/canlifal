#!/usr/bin/env python3
"""Generate ENDPOINTS.md — categorized full list of every endpoint."""
import os, json
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
with open(os.path.join(ROOT, 'backend-docs', 'endpoints_index.json'), encoding='utf-8') as f:
    eps = json.load(f)

AUTH_BADGE = {'dual': '🔄 Dual', 'session': '🌐 Oturum', 'public': '🌍 Public'}

groups = defaultdict(list)
for e in eps:
    groups[e['tag']].append(e)

lines = []
lines.append('# 📌CanlıFal — Tüm API Endpoint Listesi\n')
lines.append(f'> Otomatik keşifle çıkarılmış **{len(eps)} endpoint handler** ({len(set(e["path"] for e in eps))} benzersiz yol), **{len(groups)} kategori**. Hiçbir endpoint atlanmamıştır.\n')
lines.append('\nAuth rüzgarları: **🔄 Dual** = mobil JWT veya web oturumu · **🌐 Oturum** = web oturumu (NextAuth) · **🌍 Public** = kimliksiz. **🔒 ADMIN** = yönetici rolü gerekir.\n')
lines.append('\n> Makine-okunur tam liste: `openapi.json` (Swagger) ve `postman_collection.json`.\n')

lines.append('\n## Kategoriler\n')
for tag in sorted(groups):
    lines.append(f'- [{tag}](#cat-{tag.replace("/","-")}) ({len(groups[tag])})')

lines.append('\n---\n')
for tag in sorted(groups):
    lines.append(f'\n## <a name="cat-{tag.replace("/","-")}"></a>`{tag}`\n')
    lines.append('| Method | Endpoint | Auth | Rate Limit | Body Alanları |')
    lines.append('|--------|----------|------|-----------|---------------|')
    for e in sorted(groups[tag], key=lambda x: (x['path'], x['method'])):
        badge = AUTH_BADGE[e['auth']]
        if e['admin']:
            badge += ' 🔒'
        rl = e['rateLimit'] or '—'
        body = ', '.join(f'`{b}`' for b in e['bodyFields'][:12]) if e['bodyFields'] else '—'
        if len(e['bodyFields']) > 12:
            body += ' …'
        lines.append(f"| **{e['method']}** | `{e['path']}` | {badge} | {rl} | {body} |")
    lines.append('')

with open(os.path.join(ROOT, 'backend-docs', 'ENDPOINTS.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('Wrote ENDPOINTS.md, endpoints:', len(eps), 'categories:', len(groups))
