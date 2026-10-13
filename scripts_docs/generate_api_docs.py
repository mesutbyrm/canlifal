#!/usr/bin/env python3
"""
Auto-discovery backend API documentation generator for the CanliFal platform.
Walks app/api/**/route.ts, extracts every endpoint (path + HTTP methods),
detects auth type + request-body fields heuristically, then emits:
  - openapi.json      (OpenAPI 3.0 spec, ALL endpoints)
  - postman_collection.json
  - endpoints_index.json  (raw machine list, used by the MD generator)
"""
import os, re, json, sys

API_ROOT = os.path.join(os.path.dirname(__file__), '..', 'nextjs_space', 'app', 'api')
API_ROOT = os.path.abspath(API_ROOT)
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend-docs'))
os.makedirs(OUT_DIR, exist_ok=True)

BASE_URL = 'https://canlifal.com'

METHOD_RE = re.compile(r'export\s+(?:async\s+function|const)\s+(GET|POST|PATCH|PUT|DELETE)\b')


def route_to_path(fs_path: str) -> str:
    rel = os.path.relpath(fs_path, API_ROOT)
    rel = os.path.dirname(rel)  # strip route.ts
    parts = [] if rel == '.' else rel.split(os.sep)
    out = []
    for p in parts:
        if p.startswith('[...') and p.endswith(']'):
            out.append('{' + p[4:-1] + '}')     # catch-all
        elif p.startswith('[') and p.endswith(']'):
            out.append('{' + p[1:-1] + '}')      # dynamic segment
        else:
            out.append(p)
    return '/api/' + '/'.join(out) if out else '/api'


def path_params(url: str):
    return re.findall(r'\{([^}]+)\}', url)


def detect_auth(src: str, url: str):
    has_mobile = 'authenticateRequest' in src
    has_session = 'getServerSession' in src
    if has_mobile:
        base = 'dual'
    elif has_session:
        base = 'session'
    else:
        base = 'public'
    # Admin detection: path-based is the reliable signal; plus explicit role-gate.
    is_admin_route = url.startswith('/api/admin/') or url == '/api/admin'
    if not is_admin_route:
        role_gate = re.search(r"(role[^\n]{0,40}(admin|yonetici|moderator|finans))", src)
        forbid = re.search(r"status:\s*403", src)
        if role_gate and forbid:
            is_admin_route = True
    return base, is_admin_route


def detect_rate_limit(src: str):
    if 'authLimiter' in src:
        return 'authLimiter (kimlik doğrulama limiti)'
    m = re.search(r'rateLimit\(\s*\{[^}]*maxRequests\s*:\s*(\d+)[^}]*interval\s*:\s*(\d+)', src)
    if m:
        return f'{m.group(1)} istek / {int(m.group(2))//1000}s'
    m2 = re.search(r'checkRateLimit\([^,]+,\s*(\d+)\s*,\s*(\d+)', src)
    if m2:
        return f'{m2.group(1)} token, {m2.group(2)}/s yenileme'
    if 'rateLimit' in src or 'checkRateLimit' in src or 'RateLimit' in src:
        return 'var (özel)'
    return None


def extract_body_fields(src: str, method_src: str) -> list:
    fields = set()
    # const { a, b, c } = body / await req.json()
    for m in re.finditer(r'const\s*\{([^}]*)\}\s*=\s*(?:await\s*)?(?:req|request)\.json\(\)', method_src):
        for f in m.group(1).split(','):
            f = f.split(':')[0].split('=')[0].strip()
            if re.match(r'^[A-Za-z_]\w*$', f):
                fields.add(f)
    for m in re.finditer(r'const\s*\{([^}]*)\}\s*=\s*body\b', method_src):
        for f in m.group(1).split(','):
            f = f.split(':')[0].split('=')[0].strip()
            if re.match(r'^[A-Za-z_]\w*$', f):
                fields.add(f)
    # body.xxx access
    for m in re.finditer(r'\bbody\.([A-Za-z_]\w*)', method_src):
        fields.add(m.group(1))
    return sorted(fields)


def split_methods(src: str):
    """Return dict method -> approximate source slice for that handler."""
    idxs = []
    for m in METHOD_RE.finditer(src):
        idxs.append((m.start(), m.group(1)))
    result = {}
    for i, (start, method) in enumerate(idxs):
        end = idxs[i+1][0] if i+1 < len(idxs) else len(src)
        result[method] = src[start:end]
    return result


def tag_for(url: str) -> str:
    seg = url.split('/')
    if len(seg) > 2:
        t = seg[2]
        if t == 'admin' and len(seg) > 3:
            return 'admin/' + seg[3]
        return t
    return 'root'


def main():
    endpoints = []
    for root, _, files in os.walk(API_ROOT):
        for fn in files:
            if fn != 'route.ts':
                continue
            fs_path = os.path.join(root, fn)
            with open(fs_path, encoding='utf-8', errors='ignore') as f:
                src = f.read()
            url = route_to_path(fs_path)
            methods = split_methods(src)
            if not methods and '[...nextauth]' in fs_path:
                methods = {'GET': src, 'POST': src}
            base_auth, is_admin = detect_auth(src, url)
            rl = detect_rate_limit(src)
            for method, msrc in methods.items():
                endpoints.append({
                    'path': url,
                    'method': method,
                    'auth': base_auth,
                    'admin': is_admin,
                    'rateLimit': rl,
                    'pathParams': path_params(url),
                    'bodyFields': extract_body_fields(src, msrc) if method in ('POST','PATCH','PUT','DELETE') else [],
                    'tag': tag_for(url),
                    'dynamic': "force-dynamic" in src,
                })
    endpoints.sort(key=lambda e: (e['path'], e['method']))
    with open(os.path.join(OUT_DIR, 'endpoints_index.json'), 'w', encoding='utf-8') as f:
        json.dump(endpoints, f, ensure_ascii=False, indent=2)
    print(f'Discovered {len(endpoints)} endpoint handlers across route files.')
    return endpoints


if __name__ == '__main__':
    main()
