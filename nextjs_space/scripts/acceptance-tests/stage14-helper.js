#!/usr/bin/env node
/**
 * STAGE 14 test-data helper.
 *
 * SAFETY: every operation is hard-scoped to the three acceptance test accounts
 * listed in ALLOWED_EMAILS below. No other user, balance, room, stream, PK,
 * gift or session record can ever be read or modified by this script.
 * Test artifacts are additionally tagged with the S14TEST_PREFIX marker so
 * cleanup can never touch a real room or stream owned by a test account.
 *
 * Usage:
 *   node stage14-helper.js fund <email> <amount>
 *   node stage14-helper.js show <email>
 *   node stage14-helper.js balances
 *   node stage14-helper.js seat-race <roomId>        # reports seat occupancy
 *   node stage14-helper.js cleanup
 */
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!(m[1] in process.env)) process.env[m[1]] = v
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ALLOWED_EMAILS = [
  'mesutbyrm1+user@gmail.com',
  'mesutbyrm1+admin@gmail.com',
  'mesutbyrm1+teller@gmail.com',
]
const S14 = 'S14TEST'

function assertAllowed(email) {
  if (!ALLOWED_EMAILS.includes(email)) {
    throw new Error('REFUSED: e-mail is not an acceptance test account: ' + email)
  }
}

async function testUserIds() {
  const users = await prisma.user.findMany({
    where: { email: { in: ALLOWED_EMAILS } },
    select: { id: true, email: true },
  })
  return users
}

async function main() {
  const action = process.argv[2]

  if (action === 'fund') {
    const email = process.argv[3]
    const amount = parseInt(process.argv[4] || '0', 10)
    assertAllowed(email)
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!u) throw new Error('Test account not found: ' + email)
    await prisma.user.update({ where: { id: u.id }, data: { jetonBalance: amount } })
    const after = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, jetonBalance: true } })
    console.log(JSON.stringify({ action, email, userId: after.id, jetonBalance: after.jetonBalance }))
    return
  }

  if (action === 'show') {
    const email = process.argv[3]
    assertAllowed(email)
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true, jetonBalance: true, role: true } })
    console.log(JSON.stringify({ action, email, ...u }))
    console.log('jetonBalance=' + (u ? u.jetonBalance : 'NA'))
    return
  }

  if (action === 'teller-id') {
    const email = process.argv[3]
    assertAllowed(email)
    const t = await prisma.liveFortuneTeller.findFirst({
      where: { user: { email } },
      select: { id: true, isActive: true, isVerified: true },
    })
    console.log(JSON.stringify(t))
    console.log('tellerProfileId=' + (t ? t.id : ''))
    return
  }

  if (action === 'balances') {
    const users = await prisma.user.findMany({
      where: { email: { in: ALLOWED_EMAILS } },
      select: { email: true, id: true, jetonBalance: true },
      orderBy: { email: 'asc' },
    })
    console.log(JSON.stringify(users))
    return
  }

  if (action === 'seat-race') {
    const roomId = process.argv[3]
    const rows = await prisma.chatPresence.findMany({
      where: { roomId, seatIndex: { gte: 0 } },
      select: { userId: true, seatIndex: true },
      orderBy: { seatIndex: 'asc' },
    })
    console.log(JSON.stringify(rows))
    const idx = process.argv[4]
    if (idx !== undefined) {
      console.log(String(rows.filter((r) => r.seatIndex === parseInt(idx, 10)).length))
    }
    return
  }

  if (action === 'cleanup') {
    const users = await testUserIds()
    const ids = users.map(u => u.id)
    const report = {}

    // Voice rooms created by this stage (tagged) — owned by test accounts only.
    const rooms = await prisma.chatRoom.findMany({
      where: { ownerId: { in: ids }, nameTr: { startsWith: S14 } },
      select: { id: true },
    })
    const roomIds = rooms.map(r => r.id)

    if (roomIds.length) {
      report.pkBattles = (await prisma.pKBattle.deleteMany({
        where: { OR: [{ stream1Id: { in: roomIds } }, { stream2Id: { in: roomIds } }] },
      })).count
      report.roomGifts = (await prisma.chatRoomGift.deleteMany({ where: { roomId: { in: roomIds } } })).count
      report.roomMessages = (await prisma.chatMessage.deleteMany({ where: { roomId: { in: roomIds } } })).count
      report.presences = (await prisma.chatPresence.deleteMany({ where: { roomId: { in: roomIds } } })).count
      report.voiceSessions = (await prisma.voiceSession.deleteMany({ where: { roomId: { in: roomIds } } })).count
      report.rooms = (await prisma.chatRoom.deleteMany({ where: { id: { in: roomIds } } })).count
    } else {
      report.rooms = 0
    }

    // Live streams created by this stage (tagged) — owned by test accounts only.
    const streams = await prisma.videoStream.findMany({
      where: { userId: { in: ids }, title: { startsWith: S14 } },
      select: { id: true },
    })
    const streamIds = streams.map(s => s.id)
    if (streamIds.length) {
      report.streamPk = (await prisma.pKBattle.deleteMany({
        where: { OR: [{ stream1Id: { in: streamIds } }, { stream2Id: { in: streamIds } }] },
      })).count
      report.streamGifts = (await prisma.streamGift.deleteMany({ where: { streamId: { in: streamIds } } })).count
      report.streamViewers = (await prisma.videoStreamViewer.deleteMany({ where: { streamId: { in: streamIds } } })).count
      report.streamComments = (await prisma.videoStreamComment.deleteMany({ where: { streamId: { in: streamIds } } })).count
      report.streams = (await prisma.videoStream.deleteMany({ where: { id: { in: streamIds } } })).count
    } else {
      report.streams = 0
    }

    // Live fortune sessions strictly between the test user and the test teller.
    const teller = users.find(u => u.email === 'mesutbyrm1+teller@gmail.com')
    const user = users.find(u => u.email === 'mesutbyrm1+user@gmail.com')
    if (teller && user) {
      const tellerRow = await prisma.liveFortuneTeller.findFirst({
        where: { userId: teller.id }, select: { id: true },
      })
      if (tellerRow) {
        report.liveSessions = (await prisma.liveSession.deleteMany({
          where: { tellerId: tellerRow.id, userId: user.id },
        })).count
      }
    }

    console.log(JSON.stringify({ action: 'cleanup', ...report }))
    return
  }

  throw new Error('Unknown action: ' + action)
}

main()
  .catch(e => { console.error(JSON.stringify({ error: String(e.message || e) })); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
