#!/usr/bin/env node
// CanliFal Backend MCP Server
// ---------------------------------------------------------------------------
// A read-only Model Context Protocol server that lets Cursor (and any MCP
// client) read the LIVE backend directly: REST endpoints, the Prisma schema &
// data models, the authentication flow, and the lib/* service layer.
//
// The goal is that the Flutter app can be developed 1:1 against the backend
// without hand-maintained API docs — every answer comes from the current
// source files in this repo, so it can never go stale.
//
// Transport: stdio (the standard for local Cursor MCP servers).
// Everything is read-only; no tool mutates the repo.
// ---------------------------------------------------------------------------

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import fs from 'node:fs'
import path from 'node:path'

import {
  REPO_ROOT,
  NEXT_DIR,
  API_DIR,
  LIB_DIR,
  DOCS_DIR,
  SCHEMA_PATH,
  loadEndpointsIndex,
  loadOpenApi,
  readSchema,
  parseSchemaBlocks,
  endpointToRouteFile,
  readFileSafe,
  walkFiles,
  grepFiles,
  leadingComment,
} from './lib.mjs'

const SERVER_NAME = 'canlifal-backend'
const SERVER_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function textResult(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  return { content: [{ type: 'text', text }] }
}

function errResult(message) {
  return { content: [{ type: 'text', text: `ERROR: ${message}` }], isError: true }
}

function normalizePath(p) {
  if (!p) return p
  let s = String(p).trim()
  if (!s.startsWith('/')) s = '/' + s
  // Ensure it targets the /api namespace when a bare path is given.
  return s
}

// ---------------------------------------------------------------------------
// Tool definitions (JSON Schema — no zod, to stay version-stable).
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'list_endpoints',
    description:
      'List backend REST API endpoints with optional filters. Returns a compact list (path, method, auth, adminOnly, tag). Use this to discover what the backend exposes before diving into a specific endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Filter by tag/group (e.g. "auth", "admin", "gifts").' },
        method: { type: 'string', description: 'Filter by HTTP method (GET, POST, PUT, PATCH, DELETE).' },
        auth: { type: 'boolean', description: 'If true, only endpoints that require authentication.' },
        adminOnly: { type: 'boolean', description: 'If true, only admin-restricted endpoints.' },
        search: { type: 'string', description: 'Substring match against the path.' },
      },
    },
  },
  {
    name: 'get_endpoint',
    description:
      'Get full detail for a single endpoint: the endpoints-index entry, the OpenAPI spec for the path, and the ACTUAL route.ts handler source from the backend. This is the highest-value tool for implementing a Flutter API call correctly.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'API path, e.g. "/api/auth/login" or "/api/admin/blog/{postId}".' },
        method: { type: 'string', description: 'Optional HTTP method to narrow the match.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_endpoints',
    description: 'Full-text search across endpoint paths, tags and body field names. Returns matching endpoints.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term.' } },
      required: ['query'],
    },
  },
  {
    name: 'list_models',
    description:
      'List all Prisma data models (and enums) with their field counts. Use this to discover the database data models the API returns.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_model',
    description:
      'Get the full Prisma definition for a model or enum by name, plus a list of other models that reference it (relations).',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Model or enum name (case-insensitive).' } },
      required: ['name'],
    },
  },
  {
    name: 'search_schema',
    description: 'Search the raw Prisma schema text (fields, attributes, types). Returns matching lines with context.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term.' } },
      required: ['query'],
    },
  },
  {
    name: 'get_auth_flow',
    description:
      'Explain the backend authentication flow and return the actual auth source (NextAuth options + mobile JWT auth). Essential for wiring up Flutter login, token refresh and authenticated requests.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_source',
    description:
      'Read any source file from the backend repo by relative path (relative to the app root or repo root). Read-only, path-traversal guarded.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'e.g. "lib/mobile-auth.ts" or "app/api/auth/login/route.ts".' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_services',
    description:
      'List the lib/* service/helper modules with a one-line summary from each file\'s leading comment. Use to discover reusable backend logic (payments, credits, gifts, notifications, etc.).',
    inputSchema: {
      type: 'object',
      properties: { search: { type: 'string', description: 'Optional substring filter on file name.' } },
    },
  },
  {
    name: 'search_source',
    description:
      'Grep across the backend source (app/api + lib by default) for a string or regex. Returns file:line matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or regex.' },
        dir: { type: 'string', description: 'Optional sub-directory to limit search (relative to app root), e.g. "app/api/gifts".' },
        regex: { type: 'boolean', description: 'Treat query as a regular expression.' },
      },
      required: ['query'],
    },
  },
]

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------
function toolListEndpoints(args = {}) {
  const { tag, method, auth, adminOnly, search } = args
  const index = loadEndpointsIndex()
  let items = index
  if (tag) items = items.filter((e) => (e.tag || '').toLowerCase() === String(tag).toLowerCase())
  if (method) items = items.filter((e) => (e.method || '').toUpperCase() === String(method).toUpperCase())
  if (auth === true) items = items.filter((e) => !!e.auth)
  if (adminOnly === true) items = items.filter((e) => !!e.admin)
  if (search) items = items.filter((e) => (e.path || '').toLowerCase().includes(String(search).toLowerCase()))
  const compact = items.map((e) => ({
    path: e.path,
    method: e.method,
    auth: !!e.auth,
    admin: !!e.admin,
    tag: e.tag,
    rateLimit: e.rateLimit,
  }))
  return textResult({ count: compact.length, endpoints: compact })
}

function toolGetEndpoint(args = {}) {
  const apiPath = normalizePath(args.path)
  const method = args.method ? String(args.method).toUpperCase() : null
  const index = loadEndpointsIndex()
  let entries = index.filter((e) => e.path === apiPath)
  if (!entries.length) {
    // Try a loose match ignoring trailing slash / param-name differences.
    entries = index.filter((e) => (e.path || '').replace(/\/$/, '') === apiPath.replace(/\/$/, ''))
  }
  if (method) entries = entries.filter((e) => (e.method || '').toUpperCase() === method)

  const openapi = loadOpenApi()
  const openapiPath = openapi && openapi.paths ? openapi.paths[apiPath] || null : null

  let source = null
  const routeFile = endpointToRouteFile(apiPath)
  try {
    if (fs.existsSync(routeFile)) {
      const { rel, content, truncated } = readFileSafe(routeFile)
      source = { file: rel, truncated, content }
    } else {
      source = { file: path.relative(REPO_ROOT, routeFile), error: 'route file not found on disk' }
    }
  } catch (e) {
    source = { error: String(e.message || e) }
  }

  return textResult({
    path: apiPath,
    matchedEntries: entries,
    openapi: openapiPath,
    source,
  })
}

function toolSearchEndpoints(args = {}) {
  const q = String(args.query || '').toLowerCase()
  if (!q) return errResult('query is required')
  const index = loadEndpointsIndex()
  const items = index.filter((e) => {
    if ((e.path || '').toLowerCase().includes(q)) return true
    if ((e.tag || '').toLowerCase().includes(q)) return true
    const fields = Array.isArray(e.bodyFields) ? e.bodyFields : []
    if (fields.some((f) => String(f).toLowerCase().includes(q))) return true
    return false
  })
  const compact = items.map((e) => ({ path: e.path, method: e.method, auth: !!e.auth, admin: !!e.admin, tag: e.tag }))
  return textResult({ count: compact.length, endpoints: compact })
}

function toolListModels() {
  const { models, enums } = parseSchemaBlocks()
  const modelList = [...models.values()]
    .map((m) => ({
      name: m.name,
      fields: m.body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@')).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const enumList = [...enums.values()].map((e) => e.name).sort()
  return textResult({ modelCount: modelList.length, enumCount: enumList.length, models: modelList, enums: enumList })
}

function toolGetModel(args = {}) {
  const name = String(args.name || '').trim()
  if (!name) return errResult('name is required')
  const { models, enums } = parseSchemaBlocks()
  const lower = name.toLowerCase()
  let found = null
  let kind = null
  for (const [k, v] of models) {
    if (k.toLowerCase() === lower) {
      found = v
      kind = 'model'
      break
    }
  }
  if (!found) {
    for (const [k, v] of enums) {
      if (k.toLowerCase() === lower) {
        found = v
        kind = 'enum'
        break
      }
    }
  }
  if (!found) return errResult(`model or enum "${name}" not found`)

  // Which other models reference this one by type.
  const referencedBy = []
  if (kind === 'model') {
    const typeRe = new RegExp(`\\b${found.name}\\b`)
    for (const [k, v] of models) {
      if (k === found.name) continue
      if (typeRe.test(v.body)) referencedBy.push(k)
    }
  }
  return textResult({ name: found.name, kind, referencedBy, definition: found.block })
}

function toolSearchSchema(args = {}) {
  const q = String(args.query || '')
  if (!q) return errResult('query is required')
  const matches = grepFiles([SCHEMA_PATH], q, { maxMatches: 300 })
  return textResult({ count: matches.length, matches })
}

function toolGetAuthFlow() {
  const summary = [
    'CanliFal backend supports TWO authentication paths against the same shared database:',
    '',
    '1) WEB (NextAuth) — lib/auth-options.ts. Providers: Google OAuth + Credentials (email/password, bcrypt). Session strategy JWT. Used by the web app.',
    '2) MOBILE / FLUTTER (custom JWT) — lib/mobile-auth.ts. Issues an access token (7d) and refresh token (30d) signed with JWT_SECRET (= NEXTAUTH_SECRET). Flutter should:',
    '   - POST credentials to the mobile login endpoint to receive { accessToken, refreshToken }.',
    '   - Send "Authorization: Bearer <accessToken>" on authenticated requests.',
    '   - Refresh via the refresh endpoint when the access token expires.',
    '',
    'Look at lib/mobile-auth.ts for token generation/verification helpers and the exact payload shape (MobileTokenPayload / AuthenticatedUser). API routes typically call an authenticate helper that accepts either a NextAuth session or a mobile Bearer token.',
    '',
    'The full source of both files is included below.',
  ].join('\n')

  const files = ['lib/auth-options.ts', 'lib/mobile-auth.ts']
  const sources = []
  for (const f of files) {
    try {
      const { rel, content, truncated } = readFileSafe(f)
      sources.push({ file: rel, truncated, content })
    } catch (e) {
      sources.push({ file: f, error: String(e.message || e) })
    }
  }
  // Also surface any auth-related helper modules for discoverability.
  let authHelpers = []
  try {
    authHelpers = walkFiles([LIB_DIR])
      .map((f) => path.relative(NEXT_DIR, f))
      .filter((f) => /auth|token|jwt|session/i.test(f))
      .sort()
  } catch {}

  return textResult({ summary, authHelpers, sources })
}

function toolReadSource(args = {}) {
  try {
    const { rel, content, truncated } = readFileSafe(args.path)
    return textResult({ file: rel, truncated, content })
  } catch (e) {
    return errResult(String(e.message || e))
  }
}

function toolListServices(args = {}) {
  const search = args.search ? String(args.search).toLowerCase() : null
  let files = []
  try {
    files = walkFiles([LIB_DIR], ['.ts'])
  } catch (e) {
    return errResult(String(e.message || e))
  }
  let items = files.map((f) => ({
    file: path.relative(NEXT_DIR, f),
    summary: leadingComment(f),
  }))
  if (search) items = items.filter((i) => i.file.toLowerCase().includes(search))
  items.sort((a, b) => a.file.localeCompare(b.file))
  return textResult({ count: items.length, services: items })
}

function toolSearchSource(args = {}) {
  const q = String(args.query || '')
  if (!q) return errResult('query is required')
  let roots = [API_DIR, LIB_DIR]
  if (args.dir) {
    const sub = path.resolve(NEXT_DIR, String(args.dir))
    if (!(sub === NEXT_DIR || sub.startsWith(NEXT_DIR + path.sep))) return errResult('dir escapes the app root')
    roots = [sub]
  }
  const files = walkFiles(roots, ['.ts', '.tsx'])
  const matches = grepFiles(files, q, { maxMatches: 200, regex: !!args.regex })
  return textResult({ count: matches.length, matches })
}

const TOOL_IMPL = {
  list_endpoints: toolListEndpoints,
  get_endpoint: toolGetEndpoint,
  search_endpoints: toolSearchEndpoints,
  list_models: toolListModels,
  get_model: toolGetModel,
  search_schema: toolSearchSchema,
  get_auth_flow: toolGetAuthFlow,
  read_source: toolReadSource,
  list_services: toolListServices,
  search_source: toolSearchSource,
}

// ---------------------------------------------------------------------------
// Resources — live files exposed directly to the client.
// ---------------------------------------------------------------------------
const RESOURCES = [
  { uri: 'schema://prisma', name: 'Prisma schema (live)', mimeType: 'text/plain', kind: 'schema' },
  { uri: 'openapi://spec', name: 'OpenAPI specification', mimeType: 'application/json', kind: 'openapi' },
  { uri: 'endpoints://index', name: 'Endpoints index', mimeType: 'application/json', kind: 'endpoints' },
]

function listDocResources() {
  const out = []
  try {
    for (const f of fs.readdirSync(DOCS_DIR)) {
      if (f.endsWith('.md')) {
        out.push({
          uri: `docs://${f}`,
          name: `backend-docs/${f}`,
          mimeType: 'text/markdown',
          kind: 'doc',
          file: path.join(DOCS_DIR, f),
        })
      }
    }
  } catch {}
  return out
}

function readResource(uri) {
  if (uri === 'schema://prisma') return { mimeType: 'text/plain', text: readSchema() }
  if (uri === 'openapi://spec') return { mimeType: 'application/json', text: JSON.stringify(loadOpenApi(), null, 2) }
  if (uri === 'endpoints://index')
    return { mimeType: 'application/json', text: JSON.stringify(loadEndpointsIndex(), null, 2) }
  if (uri.startsWith('docs://')) {
    const name = uri.slice('docs://'.length)
    const file = path.join(DOCS_DIR, name)
    if (!file.startsWith(DOCS_DIR + path.sep)) throw new Error('invalid resource path')
    return { mimeType: 'text/markdown', text: fs.readFileSync(file, 'utf8') }
  }
  throw new Error(`unknown resource: ${uri}`)
}

// ---------------------------------------------------------------------------
// Self-test (no MCP handshake) — used to validate the data layer in the VM.
// ---------------------------------------------------------------------------
function selftest() {
  const results = {}
  try {
    results.repoRoot = REPO_ROOT
    results.endpoints = loadEndpointsIndex().length
    const openapi = loadOpenApi()
    results.openapiPaths = openapi && openapi.paths ? Object.keys(openapi.paths).length : 0
    const { models, enums } = parseSchemaBlocks()
    results.models = models.size
    results.enums = enums.size
    results.libServices = walkFiles([LIB_DIR], ['.ts']).length
    results.docResources = listDocResources().length
    // sample tool calls
    const ep = toolGetEndpoint({ path: '/api/auth/login' })
    results.sampleGetEndpointOk = !ep.isError
    const auth = toolGetAuthFlow()
    results.sampleAuthFlowOk = !auth.isError
    results.status = 'OK'
  } catch (e) {
    results.status = 'FAILED'
    results.error = String(e && e.stack ? e.stack : e)
  }
  console.log(JSON.stringify(results, null, 2))
  process.exit(results.status === 'OK' ? 0 : 1)
}

// ---------------------------------------------------------------------------
// Wire up the MCP server.
// ---------------------------------------------------------------------------
async function main() {
  if (process.argv.includes('--selftest')) {
    selftest()
    return
  }

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    const impl = TOOL_IMPL[name]
    if (!impl) return errResult(`unknown tool: ${name}`)
    try {
      return impl(args || {})
    } catch (e) {
      return errResult(String(e && e.message ? e.message : e))
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [...RESOURCES, ...listDocResources()].map((r) => ({
      uri: r.uri,
      name: r.name,
      mimeType: r.mimeType,
    }))
    return { resources }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params
    const { mimeType, text } = readResource(uri)
    return { contents: [{ uri, mimeType, text }] }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr is safe for logs (stdout is the JSON-RPC channel).
  console.error(`[${SERVER_NAME}] MCP server running on stdio`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
