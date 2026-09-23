export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin, resolveEndDate } from '@/lib/animation-admin'
import { ANIMATION_CONTEXTS } from '@/lib/animation-constants'

function db(): any {
  return prisma as any
}

const ASSIGNMENT_TYPES = ['admin_custom', 'user_custom', 'event_reward', 'purchase']

// GET /api/admin/animations/assignments?userId=&animationId=&category=
export async function GET(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const animationId = searchParams.get('animationId')
    const category = searchParams.get('category')
    const onlyActive = searchParams.get('onlyActive') !== 'false'

    const where: any = {}
    if (userId) where.userId = userId
    if (animationId) where.animationId = animationId
    if (category && category !== 'all') where.category = category
    if (onlyActive) where.isActive = true

    const items = await db().animationAssignment.findMany({
      where,
      include: {
        animation: { select: { id: true, name: true, category: true, status: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, durationMs: true, priority: true } },
        user: { select: { id: true, name: true, username: true, image: true, membership: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error('[animation assignments GET]', e)
    return NextResponse.json({ error: 'Atamalar yüklenemedi' }, { status: 500 })
  }
}

/**
 * POST /api/admin/animations/assignments
 * body: {
 *   animationId, assignmentType?, context?, priority?, note?,
 *   duration?: 'permanent'|'1'|'7'|'30'|'90'|'custom', endDate?, startDate?,
 *   target: { type: 'user'|'users'|'membership'|'room'|'event',
 *             userId?, userIds?, membership?, roomId?, eventLabel? }
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const animationId = String(body?.animationId || '')
    if (!animationId) return NextResponse.json({ error: 'Animasyon seçiniz' }, { status: 400 })

    const animation = await db().animation.findUnique({ where: { id: animationId }, select: { id: true, category: true } })
    if (!animation) return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })

    const assignmentType = ASSIGNMENT_TYPES.includes(body?.assignmentType) ? body.assignmentType : 'admin_custom'
    let context: string | null = null
    if (body?.context) {
      if (!(ANIMATION_CONTEXTS as readonly string[]).includes(String(body.context))) {
        return NextResponse.json({ error: 'Geçersiz bağlam' }, { status: 400 })
      }
      context = String(body.context)
    }

    const endDate = resolveEndDate(body?.duration, body?.endDate)
    const startDate = body?.startDate ? new Date(body.startDate) : null
    if (startDate && isNaN(startDate.getTime())) return NextResponse.json({ error: 'Başlangıç tarihi hatalı' }, { status: 400 })

    const priority = Number.isFinite(Number(body?.priority)) ? Math.max(0, Math.round(Number(body.priority))) : 50
    const note = body?.note ? String(body.note).slice(0, 500) : null

    // --- hedef kullanicilari cozumle ---
    const target = body?.target || {}
    const targetType = String(target?.type || 'user')
    let userIds: string[] = []

    if (targetType === 'user') {
      if (!target.userId) return NextResponse.json({ error: 'Kullanıcı seçiniz' }, { status: 400 })
      userIds = [String(target.userId)]
    } else if (targetType === 'users' || targetType === 'event') {
      const raw = Array.isArray(target.userIds) ? target.userIds : []
      userIds = raw.map((u: any) => String(u)).filter(Boolean)
      if (!userIds.length) return NextResponse.json({ error: 'En az bir kullanıcı seçiniz' }, { status: 400 })
    } else if (targetType === 'membership') {
      const membership = String(target.membership || '')
      if (!membership) return NextResponse.json({ error: 'Üyelik seviyesi seçiniz' }, { status: 400 })
      const users = await prisma.user.findMany({ where: { membership }, select: { id: true }, take: 5000 })
      userIds = users.map((u) => u.id)
    } else if (targetType === 'room') {
      const roomId = String(target.roomId || '')
      if (!roomId) return NextResponse.json({ error: 'Oda seçiniz' }, { status: 400 })
      const presences = await db().chatPresence.findMany({ where: { roomId }, select: { userId: true }, take: 5000 })
      userIds = Array.from(new Set(presences.map((p: any) => p.userId)))
    } else {
      return NextResponse.json({ error: 'Geçersiz hedef türü' }, { status: 400 })
    }

    if (!userIds.length) {
      return NextResponse.json({ error: 'Hedefe uyan kullanıcı bulunamadı', assigned: 0 }, { status: 400 })
    }

    // gecerli kullanicilari dogrula
    const existing = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })
    const validIds = existing.map((u) => u.id)
    if (!validIds.length) return NextResponse.json({ error: 'Geçerli kullanıcı bulunamadı' }, { status: 400 })

    const finalNote = targetType === 'event' && target?.eventLabel ? `Etkinlik: ${String(target.eventLabel).slice(0, 120)}${note ? ' | ' + note : ''}` : note
    const finalType = targetType === 'event' ? 'event_reward' : assignmentType

    let created = 0
    const chunkSize = 200
    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize)
      const res = await db().animationAssignment.createMany({
        data: chunk.map((uid: string) => ({
          userId: uid,
          animationId,
          assignmentType: finalType,
          context,
          category: animation.category,
          startDate,
          endDate,
          priority,
          isActive: true,
          assignedBy: auth.userId,
          note: finalNote,
        })),
      })
      created += res?.count ?? chunk.length
    }

    return NextResponse.json({ success: true, assigned: created, targetType, totalMatched: validIds.length })
  } catch (e) {
    console.error('[animation assignments POST]', e)
    return NextResponse.json({ error: 'Atama yapılamadı' }, { status: 500 })
  }
}

// PATCH ?id= -> isActive / priority / endDate guncelle
export async function PATCH(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const id = String(body?.id || new URL(request.url).searchParams.get('id') || '')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const data: any = {}
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.priority !== undefined && Number.isFinite(Number(body.priority))) data.priority = Math.max(0, Math.round(Number(body.priority)))
    if (body.duration !== undefined) data.endDate = resolveEndDate(body.duration, body.endDate)
    if (body.note !== undefined) data.note = body.note ? String(body.note).slice(0, 500) : null
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    const item = await db().animationAssignment.update({ where: { id }, data })
    return NextResponse.json(item)
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Atama bulunamadı' }, { status: 404 })
    console.error('[animation assignments PATCH]', e)
    return NextResponse.json({ error: 'Atama güncellenemedi' }, { status: 500 })
  }
}

// DELETE ?id=  veya ?userId=&category=  (kategori bazlı kaldırma)
export async function DELETE(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')

    if (id) {
      await db().animationAssignment.delete({ where: { id } })
      return NextResponse.json({ success: true, removed: 1 })
    }
    if (userId && category) {
      const res = await db().animationAssignment.deleteMany({ where: { userId, category } })
      return NextResponse.json({ success: true, removed: res?.count ?? 0 })
    }
    return NextResponse.json({ error: 'ID veya kullanıcı+kategori gerekli' }, { status: 400 })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Atama bulunamadı' }, { status: 404 })
    console.error('[animation assignments DELETE]', e)
    return NextResponse.json({ error: 'Atama kaldırılamadı' }, { status: 500 })
  }
}
