/**
 * Kalıcı test koşucusu — veritabanına DOKUNMAYAN tüm birim/kabul testlerini
 * tek komutta çalıştırır.
 *
 *   yarn test
 *
 * Not: `*.sh` uçtan uca betikleri (admob-ssv-http.sh, p0-production-smoke.sh,
 * api-acceptance.sh ...) çalışan bir sunucu ve gerçek oturum gerektirdiği için
 * bu koşucuya DAHİL DEĞİLDİR; ayrıca elle çalıştırılır.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'

const SUITES = [
  'room-access.unit.ts',
  'girlive-moderation.unit.ts',
  'realtime-bridge.unit.ts',
  'google-audience.ts',
  'admob-ssv.ts',
]

const dir = __dirname

function run(file: string): Promise<{ file: string; ok: boolean; code: number }> {
  return new Promise((resolve) => {
    const child = spawn('yarn', ['tsx', path.join(dir, file)], {
      cwd: path.resolve(dir, '..', '..'),
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', (code) => resolve({ file, ok: code === 0, code: code ?? 1 }))
    child.on('error', () => resolve({ file, ok: false, code: 1 }))
  })
}

async function main() {
  const results: { file: string; ok: boolean; code: number }[] = []
  for (const suite of SUITES) {
    console.log(`\n──────── ${suite} ────────`)
    results.push(await run(suite))
  }

  console.log('\n════════ ÖZET ════════')
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'}  ${r.file}${r.ok ? '' : `  (çıkış kodu ${r.code})`}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} paket geçti`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main()
