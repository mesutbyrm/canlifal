import { prisma } from '@/lib/db'
import { giftPointAmount } from '@/lib/gift-points'

/** Merge BEFORE pagination so rows from a busy source never disappear between pages. */
export function mergeGiftHistory(groups: any[][], offset: number, limit: number) {
  return groups.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`)).slice(offset, offset + limit)
}

export async function adminGiftHistory(params: URLSearchParams, dateFilter: object) {
  const page = Number(params.get('page') || 1), limit = 30
  if (!Number.isInteger(page) || page < 1 || page > 334) throw new Error('Sayfa 1–334 arasında olmalıdır; daha eski kayıtlar için tarih filtresini daraltın')
  const context = params.get('context') || 'all', source = params.get('jetonSource') || 'all'
  if (!['all','chat_room','stream','teller','profile'].includes(context) || !['all','real','fake','legacy'].includes(source)) throw new Error('Geçersiz hediye filtresi')
  const userId = params.get('userId'), roomId = params.get('roomId'), streamId = params.get('streamId'), tellerId = params.get('tellerId')
  const sourceWhere = source === 'all' ? {} : { jetonSource: source === 'legacy' ? null : source }
  const enabled = (kind: string) => (context === 'all' || context === kind) && (!roomId || kind === 'chat_room') && (!streamId || kind === 'stream') && (!tellerId || kind === 'teller')
  const chatWhere = { ...dateFilter, ...sourceWhere, ...(roomId ? { roomId } : {}), ...(userId ? { OR: [{ senderId: userId }, { recipientId: userId }] } : {}) }
  const streamWhere = { ...dateFilter, ...sourceWhere, ...(streamId ? { streamId } : {}), ...(userId ? { OR: [{ senderId: userId }, { recipientId: userId }, { recipientId: null, stream: { userId } }] } : {}) }
  const tellerWhere = { ...dateFilter, ...(tellerId ? { tellerId } : {}), ...(userId ? { OR: [{ senderId: userId }, { tellerId: { in: (await prisma.liveFortuneTeller.findMany({ where: { userId }, select: { id: true } })).map(x => x.id) } }] } : {}) }
  const directWhere = { ...dateFilter, ...sourceWhere, context: 'profile', ...(userId ? { OR: [{ senderId: userId }, { receiverId: userId }] } : {}) }
  const userSelect = { id: true, name: true, username: true, image: true } as const
  const take = page * limit, offset = (page - 1) * limit
  const orderBy = [{ createdAt: 'desc' as const }, { id: 'asc' as const }]
  const load = async (model: any, where: any, on: boolean, include?: any) => on ? Promise.all([
    model.findMany({ where, take, orderBy, ...(include ? { include } : {}) }), model.count({ where }),
  ]) : [[], 0]
  const [[chat, chatCount], [stream, streamCount], [teller, tellerCount], [direct, directCount]] = await Promise.all([
    load(prisma.chatRoomGift, chatWhere, enabled('chat_room'), { sender: { select: userSelect }, recipient: { select: userSelect }, giftType: { select: { name: true, icon: true } }, room: { select: { nameTr: true, slug: true } } }),
    load(prisma.streamGift, streamWhere, enabled('stream'), { sender: { select: userSelect }, giftType: { select: { name: true, icon: true } }, stream: { select: { title: true, user: { select: userSelect } } } }),
    // Legacy teller gifts have no persisted source. Never guess Real/Fake.
    load(prisma.tellerGift, tellerWhere, enabled('teller') && ['all','legacy'].includes(source)),
    load(prisma.giftHistory, directWhere, enabled('profile')),
  ])
  const [tellers, types] = await Promise.all([
    prisma.liveFortuneTeller.findMany({ where: { id: { in: [...new Set<string>(teller.map((g: any) => g.tellerId))] } }, select: { id: true, displayName: true, user: { select: userSelect } } }),
    prisma.giftType.findMany({ where: { id: { in: [...new Set<string>([...direct,...teller].map((g: any) => g.giftTypeId))] } }, select: { id: true, name: true, icon: true } }),
  ])
  const userIds = [...new Set<string>([...direct.flatMap((g: any) => [g.senderId,g.receiverId]), ...teller.map((g: any) => g.senderId), ...stream.map((g: any) => g.recipientId)].filter(Boolean))]
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect })
  const um = new Map(users.map(u => [u.id,u])), tm = new Map(tellers.map(t => [t.id,t])), gm = new Map(types.map(g => [g.id,g]))
  const gifts = mergeGiftHistory([
    chat.map((g: any) => ({ id: g.id, type: 'chat_room', amount: g.totalPrice, pointAmount: giftPointAmount(g), jetonSource: g.jetonSource, commission: g.commissionAmount, receiverAmount: g.receiverAmount, ownerAmount: g.ownerAmount, quantity: g.quantity, createdAt: g.createdAt, giftName: g.giftType?.name || 'Hediye', giftIcon: g.giftType?.icon || '🎁', sender: g.sender, receiver: g.recipient, sourceName: g.room?.nameTr || 'Sohbet Odası', sourceSlug: g.room?.slug })),
    stream.map((g: any) => ({ id: g.id, type: 'stream', amount: g.totalPrice, pointAmount: giftPointAmount(g), jetonSource: g.jetonSource, commission: g.siteAmount, receiverAmount: g.receiverAmount, ownerAmount: g.ownerAmount, quantity: g.quantity, createdAt: g.createdAt, giftName: g.giftType?.name || 'Hediye', giftIcon: g.giftType?.icon || '🎁', sender: g.sender, receiver: g.recipientId ? um.get(g.recipientId) || null : g.stream?.user || null, sourceName: g.stream?.title || 'Yayın' })),
    teller.map((g: any) => ({ id: g.id, type: 'teller', amount: g.totalPrice, pointAmount: g.totalPrice, jetonSource: null, commission: null, receiverAmount: null, ownerAmount: null, quantity: g.quantity, createdAt: g.createdAt, giftName: gm.get(g.giftTypeId)?.name || 'Hediye', giftIcon: gm.get(g.giftTypeId)?.icon || '🎁', sender: um.get(g.senderId) || null, receiver: tm.get(g.tellerId)?.user || null, sourceName: tm.get(g.tellerId)?.displayName || 'Falcı' })),
    direct.map((g: any) => ({ id: g.id, type: 'profile', amount: g.coinAmount, pointAmount: g.pointAmount ?? g.coinAmount, jetonSource: g.jetonSource, commission: null, receiverAmount: null, ownerAmount: null, quantity: g.quantity, createdAt: g.createdAt, giftName: gm.get(g.giftTypeId)?.name || (g.giftTypeId === 'jeton' ? 'Jeton' : 'Hediye'), giftIcon: gm.get(g.giftTypeId)?.icon || '🎁', sender: um.get(g.senderId) || null, receiver: um.get(g.receiverId) || null, sourceName: 'Profil / doğrudan hediye' })),
  ], offset, limit)
  const total = chatCount + streamCount + tellerCount + directCount
  return { gifts, page, limit, total, totalPages: Math.ceil(total / limit), coverage: 'Oda, yayın, falcı ve profil hediye kayıtları. Kaydı olmayan komisyon/net değerler bilinmiyor olarak gösterilir; transfer, kutu ve şanslı hediye bu listeye dahil değildir.' }
}
