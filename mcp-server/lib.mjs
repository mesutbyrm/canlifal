// Data-source helpers for the CanliFal backend MCP server.
// Resolves the repo it lives in and reads LIVE source files (Prisma schema,
// route handlers, lib services) plus the generated docs (openapi / endpoints
// index). Everything is read-only.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// mcp-server lives at <repo>/mcp-server → repo root is its parent.
export const REPO_ROOT = path.resolve(__dirname, '..')
export const NEXT_DIR = path.join(REPO_ROOT, 'nextjs_space')
export const API_DIR = path.join(NEXT_DIR, 'app', 'api')
export const LIB_DIR = path.join(NEXT_DIR, 'lib')
export const DOCS_DIR = path.join(REPO_ROOT, 'backend-docs')
export const SCHEMA_PATH = path.join(NEXT_DIR, 'prisma', 'schema.prisma')

// ---------------------------------------------------------------------------
// Small mtime-aware cache so repeated tool calls are cheap but always fresh.
// ---------------------------------------------------------------------------
const _cache = new Map()
function readCached(filePath, transform) {
  try {
    const stat = fs.statSync(filePath)
    const key = filePath
    const hit = _cache.get(key)
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.value
    const raw = fs.readFileSync(filePath, 'utf8')
    const value = transform ? transform(raw) : raw
    _cache.set(key, { mtimeMs: stat.mtimeMs, value })
    return value
  } catch (e) {
    return null
  }
}

export function loadEndpointsIndex() {
  return readCached(path.join(DOCS_DIR, 'endpoints_index.json'), (r) => JSON.parse(r)) || []
}

export function loadOpenApi() {
  return readCached(path.join(DOCS_DIR, 'openapi.json'), (r) => JSON.parse(r)) || null
}

export function readSchema() {
  return readCached(SCHEMA_PATH) || ''
}

// Parse `model X { ... }` and `enum X { ... }` blocks out of the schema text.
export function parseSchemaBlocks() {
  return readCached(SCHEMA_PATH + '#blocks', undefined) || _parseBlocks()
}
function _parseBlocks() {
  const text = readSchema()
  const models = new Map()
  const enums = new Map()
  const re = /(model|enum)\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g
  let m
  while ((m = re.exec(text)) !== null) {
    const kind = m[1]
    const name = m[2]
    const body = m[3]
    const block = `${kind} ${name} {${body}\n}`
    if (kind === 'model') models.set(name, { name, block, body })
    else enums.set(name, { name, block, body })
  }
  return { models, enums }
}

// Convert an OpenAPI-style path (/api/foo/{id}) to the route.ts file on disk
// (app/api/foo/[id]/route.ts).
export function endpointToRouteFile(apiPath) {
  const rel = apiPath.replace(/^\/api\/?/, '')
  const segs = rel
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/^\{(\.\.\.)?([^}]+)\}$/, (_, spread, name) => (spread ? `[...${name}]` : `[${name}]`)))
  return path.join(API_DIR, ...segs, 'route.ts')
}

// Safely resolve a user-supplied path to somewhere inside the project.
// Accepts paths relative to nextjs_space, relative to the repo root, or
// absolute paths — but always rejects anything that escapes the repo.
export function resolveSafe(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') throw new Error('path is required')
  const candidates = []
  if (path.isAbsolute(inputPath)) {
    candidates.push(path.resolve(inputPath))
  } else {
    candidates.push(path.resolve(NEXT_DIR, inputPath))
    candidates.push(path.resolve(REPO_ROOT, inputPath))
  }
  for (const c of candidates) {
    if ((c === REPO_ROOT || c.startsWith(REPO_ROOT + path.sep)) && fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c
    }
  }
  // Fall back to the first in-repo candidate for a clear error message.
  const first = candidates.find((c) => c === REPO_ROOT || c.startsWith(REPO_ROOT + path.sep))
  if (!first) throw new Error('path escapes the project root')
  throw new Error(`file not found: ${inputPath}`)
}

export function readFileSafe(inputPath, maxBytes = 200_000) {
  const abs = resolveSafe(inputPath)
  let content = fs.readFileSync(abs, 'utf8')
  let truncated = false
  if (content.length > maxBytes) {
    content = content.slice(0, maxBytes)
    truncated = true
  }
  return { abs, rel: path.relative(REPO_ROOT, abs), content, truncated }
}

// Recursive walk collecting .ts/.tsx files under a set of roots.
export function walkFiles(roots, exts = ['.ts', '.tsx']) {
  const out = []
  const stack = [...roots]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (exts.some((x) => e.name.endsWith(x))) out.push(full)
    }
  }
  return out
}

// Simple case-insensitive substring / regex grep across files.
export function grepFiles(files, query, { maxMatches = 200, regex = false } = {}) {
  const matches = []
  let matcher
  if (regex) {
    try {
      matcher = new RegExp(query, 'i')
    } catch {
      matcher = null
    }
  }
  const q = query.toLowerCase()
  for (const f of files) {
    let text
    try {
      text = fs.readFileSync(f, 'utf8')
    } catch {
      continue
    }
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const hit = matcher ? matcher.test(line) : line.toLowerCase().includes(q)
      if (hit) {
        matches.push({ file: path.relative(REPO_ROOT, f), line: i + 1, text: line.trim().slice(0, 300) })
        if (matches.length >= maxMatches) return matches
      }
    }
  }
  return matches
}

// First leading block/JSDoc/comment lines of a file — used as a service summary.
export function leadingComment(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8')
    const lines = text.split('\n')
    const collected = []
    for (const raw of lines) {
      const l = raw.trim()
      if (l === '') {
        if (collected.length) break
        continue
      }
      if (l.startsWith('//') || l.startsWith('/*') || l.startsWith('*') || l.startsWith('*/')) {
        const cleaned = l.replace(/^\/\*+|^\*+\/?|^\/\//g, '').trim()
        if (cleaned) collected.push(cleaned)
        if (collected.length >= 4) break
      } else {
        break
      }
    }
    return collected.join(' ')
  } catch {
    return ''
  }
}
