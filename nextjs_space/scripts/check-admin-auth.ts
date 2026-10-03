/**
 * Admin auth guard scanner.
 *
 * Walks every `app/api/admin/**\/route.ts` file and fails (exit code 1) if a
 * route handler file has no recognised authentication/authorisation guard.
 *
 * Usage:
 *   yarn tsx scripts/check-admin-auth.ts
 *
 * This is a build/CI helper only - it is never imported by the application
 * runtime and therefore has no effect on the deployed bundle.
 */

import fs from 'fs';
import path from 'path';

const ADMIN_API_DIR = path.join(process.cwd(), 'app', 'api', 'admin');

/**
 * Any one of these tokens appearing in a route file means the file delegates
 * identity/permission resolution to a known guard.
 *
 * - getStaffSession / resolveStaff  -> lib/admin-auth.ts (Bearer + cookie)
 * - getServerSession               -> NextAuth cookie session
 * - authenticateRequest            -> lib/mobile-auth.ts (Bearer + cookie)
 * - resolveUser / require*         -> lib/rbac.ts guards (Bearer + cookie)
 * - createCosmeticAdminHandlers    -> lib/cosmetics.ts (guards internally)
 * - requireAnimationAdmin          -> lib/animation-admin.ts
 * - requireAdAdmin                 -> lib/ad-placements.ts
 */
const GUARD_TOKENS = [
  'getStaffSession',
  'resolveStaff',
  'resolveUser',
  'getServerSession',
  'authenticateRequest',
  'requirePermission',
  'requireAnyPermission',
  'requireAuth',
  'requireRole',
  'requireAdmin',
  'requireFullAdmin',
  'requireSuperAdmin',
  'requireOwnerOrAdmin',
  'createCosmeticAdminHandlers',
  'requireAnimationAdmin',
  'requireAdAdmin',
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** A file that only re-exports another route module inherits that route's guard. */
function isPureReExport(source: string): boolean {
  const meaningful = stripComments(source)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (meaningful.length === 0) return false;

  const hasReExport = meaningful.some((line) => line.startsWith('export ') && line.includes(' from '));
  if (!hasReExport) return false;

  // Route segment config (dynamic / revalidate / runtime / fetchCache) is allowed alongside.
  const isConfigLine = (line: string) =>
    /^export const (dynamic|revalidate|runtime|fetchCache|preferredRegion|maxDuration)\s*=/.test(line);

  return meaningful.every(
    (line) => isConfigLine(line) || (line.startsWith('export ') && line.includes(' from '))
  );
}

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouteFiles(full, out);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  if (!fs.existsSync(ADMIN_API_DIR)) {
    console.error(`Admin API directory not found: ${ADMIN_API_DIR}`);
    process.exit(1);
  }

  const files = collectRouteFiles(ADMIN_API_DIR);
  const unprotected: string[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (isPureReExport(source)) continue;
    if (GUARD_TOKENS.some((token) => source.includes(token))) continue;
    unprotected.push(path.relative(process.cwd(), file));
  }

  console.log(`Scanned ${files.length} admin route files.`);

  if (unprotected.length > 0) {
    console.error(`\nFAIL - ${unprotected.length} admin route file(s) without a recognised guard:`);
    for (const file of unprotected) console.error(`  - ${file}`);
    console.error('\nAdd a guard (getStaffSession / requirePermission / ...) or re-export a guarded route.');
    process.exit(1);
  }

  console.log('OK - every admin route file has a recognised auth guard.');
}

main();
