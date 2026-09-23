import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * §36 — Sosyal Etkileşimler: beğen, favoriye ekle, arkadaşlık isteği, engelle, şikayet et
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const { targetId, type, message } = await req.json()
  if (!targetId || !type) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'targetId ve type gerekli' } }, { status: 400 })
  if (targetId === me.id) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Kendinize işlem yapamazsınız' } }, { status: 400 })

  const validTypes = ['like', 'favorite', 'friend_request', 'block', 'report']
  if (!validTypes.includes(type)) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Geçersiz işlem türü' } }, { status: 400 })

  // Check target exists
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true } })
  if (!target) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } }, { status: 404 })

  // Toggle like/favorite
  if (type === 'like' || type === 'favorite') {
    const existing = await prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: me.id, targetId, type } } })
    if (existing) {
      await prisma.socialAction.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, message: type === 'like' ? 'Beğeni kaldırıldı' : 'Favoriden çıkarıldı', toggled: false })
    }
    await prisma.socialAction.create({ data: { actorId: me.id, targetId, type } })
    return NextResponse.json({ success: true, message: type === 'like' ? 'Beğenildi' : 'Favoriye eklendi', toggled: true })
  }

  // Friend request
  if (type === 'friend_request') {
    const existing = await prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: me.id, targetId, type } } })
    if (existing) return NextResponse.json({ success: false, error: { code: 'DUPLICATE', message: 'Zaten istek gönderilmiş' } }, { status: 409 })
    // Check if they already sent us a request
    const reverse = await prisma.socialAction.findUnique({ where: { actorId_targetId_type: { actorId: targetId, targetId: me.id, type: 'friend_request' } } })
    if (reverse && reverse.status === 'active') {
      // Auto-accept
      await prisma.socialAction.update({ where: { id: reverse.id }, data: { status: 'accepted' } })
      await prisma.socialAction.create({ data: { actorId: me.id, targetId, type: 'friend_request', status: 'accepted' } })
      return NextResponse.json({ success: true, message: 'Arkadaşlık otomatik kabul edildi!' })
    }
    await prisma.socialAction.create({ data: { actorId: me.id, targetId, type: 'friend_request', message: message || null } })
    return NextResponse.json({ success: true, message: 'Arkadaşlık isteği gönderildi' })
  }

  // Block
  if (type === 'block') {
    await prisma.socialAction.upsert({
      where: { actorId_targetId_type: { actorId: me.id, targetId, type: 'block' } },
      update: { status: 'active' },
      create: { actorId: me.id, targetId, type: 'block' },
    })
    return NextResponse.json({ success: true, message: 'Kullanıcı engellendi' })
  }

  // Report
  if (type === 'report') {
    if (!message) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Şikayet sebebi gerekli' } }, { status: 400 })
    await prisma.socialAction.create({ data: { actorId: me.id, targetId, type: 'report', message } })
    return NextResponse.json({ success: true, message: 'Şikayet gönderildi' })
  }

  return NextResponse.json({ success: false, error: { code: 'UNKNOWN', message: 'Bilinmeyen işlem' } }, { status: 400 })
}

/** Kullanıcının sosyal etkileşimleri (gönderdiği / aldığı) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const me = (auth as any).user

  const sp = req.nextUrl.searchParams
  const type = sp.get('type') || 'all' // likes, favorites, friends, friend_requests, blocks
  const direction = sp.get('direction') || 'received' // received | sent

  const where: any = direction === 'received' ? { targetId: me.id } : { actorId: me.id }
  if (type === 'likes') where.type = 'like'
  else if (type === 'favorites') where.type = 'favorite'
  else if (type === 'friends') { where.type = 'friend_request'; where.status = 'accepted' }
  else if (type === 'friend_requests') { where.type = 'friend_request'; where.status = 'active' }
  else if (type === 'blocks') where.type = 'block'

  const actions = await prisma.socialAction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Enrich with user info
  const otherIds = actions.map(a => direction === 'received' ? a.actorId : a.targetId)
  const users = otherIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, name: true, username: true, image: true, membership: true } }) : []
  const userMap = new Map(users.map(u => [u.id, u]))

  const enriched = actions.map(a => ({
    ...a,
    otherUser: userMap.get(direction === 'received' ? a.actorId : a.targetId) || null,
  }))

  return NextResponse.json({ success: true, data: { actions: enriched } })
}
