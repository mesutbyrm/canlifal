#!/usr/bin/env node
/**
 * Test-account helper for the acceptance test suite.
 *
 * SAFETY: every operation is scoped to the single e-mail address passed in
 * ACCEPTANCE_USER_EMAIL. No other account, balance, stream or fortune record
 * is ever read or modified.
 *
 * Usage: node test-account-helper.js <zero|fund|clear|show> [amount]
 */
const fs = require('fs')
const path = require('path')

// ── load .env manually (no dotenv dependency) ────────────────
const envPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const action = process.argv[2]
const amount = parseInt(process.argv[3] || '500', 10)
const email = process.env.ACCEPTANCE_USER_EMAIL

async function main() {
  if (!email) throw new Error('ACCEPTANCE_USER_EMAIL is required')
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, jetonBalance: true }
  })
  if (!user) throw new Error('Test account not found: ' + email)

  if (action === 'zero') {
    await prisma.user.update({ where: { id: user.id }, data: { jetonBalance: 0 } })
  } else if (action === 'fund') {
    await prisma.user.update({ where: { id: user.id }, data: { jetonBalance: amount } })
  } else if (action === 'clear') {
    await prisma.streamFortuneRequest.deleteMany({ where: { userId: user.id } })
  } else if (action === 'show') {
    // no mutation
  } else {
    throw new Error('Unknown action: ' + action)
  }

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: { jetonBalance: true }
  })
  const pending = await prisma.streamFortuneRequest.count({ where: { userId: user.id } })
  console.log(JSON.stringify({ action, email, jetonBalance: after.jetonBalance, fortuneRequests: pending }))
}

main()
  .catch((e) => { console.error('HELPER_ERROR: ' + e.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
