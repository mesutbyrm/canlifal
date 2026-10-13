#!/usr/bin/env python3
"""Build openapi.json + postman_collection.json from endpoints_index.json."""
import os, json

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend-docs'))
BASE_URL = 'https://canlifal.com'

with open(os.path.join(OUT_DIR, 'endpoints_index.json'), encoding='utf-8') as f:
    endpoints = json.load(f)

AUTH_DESC = {
    'dual': 'Dual-auth: mobil JWT Bearer token **veya** web oturumu kabul edilir.',
    'session': 'Web oturumu (NextAuth). Mobilde JWT Bearer ile de çalışır eğer route authenticateRequest kullanıyorsa.',
    'public': 'Kimlik doğrulama gerektirmez (public).',
}

# ---------------- OpenAPI 3.0 ----------------

def build_openapi():
    paths = {}
    for e in endpoints:
        p = e['path']
        item = paths.setdefault(p, {})
        params = []
        for pp in e['pathParams']:
            params.append({
                'name': pp, 'in': 'path', 'required': True,
                'schema': {'type': 'string'},
                'description': f'Yol parametresi: {pp}',
            })
        op = {
            'tags': [e['tag']],
            'summary': f"{e['method']} {p}",
            'description': _op_desc(e),
            'parameters': params,
            'responses': {
                '200': {'description': 'Başarılı', 'content': {'application/json': {'schema': {'type': 'object'}}}},
                '400': {'description': 'Geçersiz istek / doğrulama hatası'},
                '401': {'description': 'Kimlik doğrulama gerekli / geçersiz token'},
                '403': {'description': 'Yetki yok'},
                '404': {'description': 'Bulunamadı'},
                '429': {'description': 'Rate limit aşıldı'},
                '500': {'description': 'Sunucu hatası'},
            },
        }
        if e['auth'] != 'public':
            op['security'] = [{'bearerAuth': []}, {'cookieAuth': []}]
        if e['admin']:
            op['description'] += '\n\n**🔒 Yalnızca yönetici (admin/yonetici) erişimi.**'
        if e['bodyFields']:
            props = {fld: {'type': 'string'} for fld in e['bodyFields']}
            op['requestBody'] = {
                'content': {'application/json': {'schema': {
                    'type': 'object', 'properties': props,
                }}}
            }
        item[e['method'].lower()] = op

    spec = {
        'openapi': '3.0.3',
        'info': {
            'title': 'CanlıFal Backend API',
            'description': 'CanlıFal platformunun eksiksiz backend API referansı. Web ve Flutter mobil uygulaması AYNI backend\'i kullanır. Tüm endpoint\'ler otomatik keşifle çıkarılmıştır.',
            'version': '1.0.0',
            'contact': {'name': 'CanlıFal', 'url': BASE_URL},
        },
        'servers': [{'url': BASE_URL, 'description': 'Production'}],
        'components': {
            'securitySchemes': {
                'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT',
                               'description': 'Mobil: `Authorization: Bearer <accessToken>`'},
                'cookieAuth': {'type': 'apiKey', 'in': 'cookie', 'name': 'next-auth.session-token',
                               'description': 'Web: NextAuth oturum çerezi'},
            },
        },
        'tags': sorted([{'name': t} for t in {e['tag'] for e in endpoints}], key=lambda x: x['name']),
        'paths': paths,
    }
    return spec


def _op_desc(e):
    parts = [AUTH_DESC[e['auth']]]
    if e['rateLimit']:
        parts.append(f"Rate limit: {e['rateLimit']}.")
    if e['dynamic']:
        parts.append('Dinamik (force-dynamic).')
    return ' '.join(parts)


# ---------------- Postman ----------------

def build_postman():
    # group by tag
    folders = {}
    for e in endpoints:
        folders.setdefault(e['tag'], []).append(e)
    items = []
    for tag in sorted(folders):
        sub = []
        for e in sorted(folders[tag], key=lambda x: (x['path'], x['method'])):
            url_path = e['path'].replace('{', ':').replace('}', '')
            seg = [s for s in url_path.split('/') if s]
            req = {
                'name': f"{e['method']} {e['path']}",
                'request': {
                    'method': e['method'],
                    'header': [{'key': 'Content-Type', 'value': 'application/json'}],
                    'url': {
                        'raw': '{{baseUrl}}' + url_path,
                        'host': ['{{baseUrl}}'],
                        'path': seg,
                    },
                    'description': _op_desc(e) + (' [ADMIN]' if e['admin'] else ''),
                },
            }
            if e['auth'] != 'public':
                req['request']['auth'] = {'type': 'bearer', 'bearer': [{'key': 'token', 'value': '{{accessToken}}', 'type': 'string'}]}
            if e['bodyFields']:
                body_obj = {fld: '' for fld in e['bodyFields']}
                req['request']['body'] = {'mode': 'raw', 'raw': json.dumps(body_obj, ensure_ascii=False, indent=2),
                                          'options': {'raw': {'language': 'json'}}}
            # path variables
            if e['pathParams']:
                req['request']['url']['variable'] = [{'key': pp, 'value': ''} for pp in e['pathParams']]
            sub.append(req)
        items.append({'name': tag, 'item': sub})

    collection = {
        'info': {
            'name': 'CanlıFal Backend API',
            'description': 'CanlıFal platformu eksiksiz API koleksiyonu (web + Flutter aynı backend). Otomatik üretildi.',
            'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        'auth': {'type': 'bearer', 'bearer': [{'key': 'token', 'value': '{{accessToken}}', 'type': 'string'}]},
        'variable': [
            {'key': 'baseUrl', 'value': BASE_URL},
            {'key': 'accessToken', 'value': ''},
            {'key': 'refreshToken', 'value': ''},
        ],
        'item': items,
    }
    return collection


if __name__ == '__main__':
    spec = build_openapi()
    with open(os.path.join(OUT_DIR, 'openapi.json'), 'w', encoding='utf-8') as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)
    pm = build_postman()
    with open(os.path.join(OUT_DIR, 'postman_collection.json'), 'w', encoding='utf-8') as f:
        json.dump(pm, f, ensure_ascii=False, indent=2)
    print('openapi.json paths:', len(spec['paths']))
    print('postman folders:', len(pm['item']), 'requests:', sum(len(i['item']) for i in pm['item']))
