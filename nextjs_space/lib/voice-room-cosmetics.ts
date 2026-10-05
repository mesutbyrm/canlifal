import prisma from '@/lib/db'

/**
 * Kozmetik/süsleme alanlarının bir kullanıcı için çözümlenmiş hali.
 * Oda + koltuk + ses uçlarında aynı şekilde döner; böylece mobil (Flutter)
 * istemci web ile BİREBİR aynı görseli üretebilir.
 *
 * Gösterilecek profil çerçevesi kuralı web ile aynıdır:
 *   adminAssignedFrame (admin ataması) → yoksa profileFrame (kullanıcı seçimi)
 * (web: `adminAssignedFrame?.imageUrl || profileFrame?.imageUrl`)
 */
export interface UserCosmetics {
  profileEffect: string | null // CSS tabanlı arka plan efekti anahtarı (sparkles, fire, ...)
  profileFrameId: string | null // etkin çerçeve id (admin ataması önceliklidir)
  profileFrameUrl: string | null // ProfileFrame.imageUrl
  nameEffect: string | null // NameEffect.key (gold, neon, rainbow, ...)
  nameEffectCss: string | null // NameEffect.cssPreset (renk/gradyan/animasyon JSON)
  micFrameId: string | null
  micFrameUrl: string | null // MicFrame.assetUrl (mikrofon koltuğu çerçevesi)
  entranceEffectId: string | null
  entranceEffectUrl: string | null // EntranceEffect.assetUrl (odaya giriş efekti)
  entranceEffectType: string | null // lottie | svga | gif | video | image
  entranceDurationMs: number | null
  chatBubbleId: string | null
  chatBubbleUrl: string | null // ChatBubbleSkin.assetUrl
  avatarAccessories: Array<{ id: string; slot: string; url: string }>
}

export function emptyCosmetics(): UserCosmetics {
  return {
    profileEffect: null,
    profileFrameId: null,
    profileFrameUrl: null,
    nameEffect: null,
    nameEffectCss: null,
    micFrameId: null,
    micFrameUrl: null,
    entranceEffectId: null,
    entranceEffectUrl: null,
    entranceEffectType: null,
    entranceDurationMs: null,
    chatBubbleId: null,
    chatBubbleUrl: null,
    avatarAccessories: [],
  }
}

/**
 * Verilen kullanıcı id listesi için kozmetik alanları toplu (batch) çözer.
 * - Tek bir user.findMany ile kullanıcı seçimleri alınır.
 * - Yalnızca gerçekten atıfta bulunulan katalog kayıtları çekilir; boş
 *   kataloglar için ekstra sorgu çalıştırılmaz (kataloglar çoğunlukla boş).
 * - Geri dönüş: Map<userId, UserCosmetics>. Listede olmayan kullanıcılar
 *   çağırana kalır (emptyCosmetics ile doldurulabilir).
 */
export async function resolveUserCosmetics(userIds: string[]): Promise<Map<string, UserCosmetics>> {
  const map = new Map<string, UserCosmetics>()
  const ids = Array.from(new Set((userIds || []).filter(Boolean)))
  if (ids.length === 0) return map

  const db = prisma as any

  const users: any[] = await db.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      profileEffect: true,
      profileFrameId: true,
      adminAssignedFrameId: true,
      nameEffect: true,
      entranceEffectId: true,
      chatBubbleId: true,
      micFrameId: true,
      avatarAccessoryIds: true,
    },
  })

  const frameIds = new Set<string>()
  const micIds = new Set<string>()
  const entranceIds = new Set<string>()
  const bubbleIds = new Set<string>()
  const accessoryIds = new Set<string>()
  const nameKeys = new Set<string>()

  const effectiveFrameByUser = new Map<string, string | null>()
  const accessoryIdsByUser = new Map<string, string[]>()

  for (const u of users) {
    const effFrame: string | null = u.adminAssignedFrameId || u.profileFrameId || null
    effectiveFrameByUser.set(u.id, effFrame)
    if (effFrame) frameIds.add(effFrame)
    if (u.micFrameId) micIds.add(u.micFrameId)
    if (u.entranceEffectId) entranceIds.add(u.entranceEffectId)
    if (u.chatBubbleId) bubbleIds.add(u.chatBubbleId)
    if (u.nameEffect) nameKeys.add(u.nameEffect)
    let accArr: string[] = []
    if (typeof u.avatarAccessoryIds === 'string' && u.avatarAccessoryIds) {
      try {
        const parsed = JSON.parse(u.avatarAccessoryIds)
        if (Array.isArray(parsed)) accArr = parsed.filter((x: any) => typeof x === 'string')
      } catch {
        accArr = []
      }
    }
    accessoryIdsByUser.set(u.id, accArr)
    accArr.forEach((a) => accessoryIds.add(a))
  }

  const [frames, mics, entrances, bubbles, accessories, names] = await Promise.all([
    frameIds.size
      ? db.profileFrame.findMany({ where: { id: { in: Array.from(frameIds) } }, select: { id: true, imageUrl: true } })
      : Promise.resolve([] as any[]),
    micIds.size
      ? db.micFrame.findMany({ where: { id: { in: Array.from(micIds) } }, select: { id: true, assetUrl: true } })
      : Promise.resolve([] as any[]),
    entranceIds.size
      ? db.entranceEffect.findMany({ where: { id: { in: Array.from(entranceIds) } }, select: { id: true, assetUrl: true, assetType: true, durationMs: true } })
      : Promise.resolve([] as any[]),
    bubbleIds.size
      ? db.chatBubbleSkin.findMany({ where: { id: { in: Array.from(bubbleIds) } }, select: { id: true, assetUrl: true } })
      : Promise.resolve([] as any[]),
    accessoryIds.size
      ? db.avatarAccessory.findMany({ where: { id: { in: Array.from(accessoryIds) } }, select: { id: true, slot: true, assetUrl: true } })
      : Promise.resolve([] as any[]),
    nameKeys.size
      ? db.nameEffect.findMany({ where: { key: { in: Array.from(nameKeys) } }, select: { key: true, cssPreset: true } })
      : Promise.resolve([] as any[]),
  ])

  const frameUrl = new Map<string, string>(frames.map((f: any) => [f.id, f.imageUrl]))
  const micUrl = new Map<string, string>(mics.map((m: any) => [m.id, m.assetUrl]))
  const entranceMap = new Map<string, any>(entrances.map((e: any) => [e.id, e]))
  const bubbleUrl = new Map<string, string>(bubbles.map((b: any) => [b.id, b.assetUrl]))
  const accessoryMap = new Map<string, any>(accessories.map((a: any) => [a.id, a]))
  const nameCss = new Map<string, string | null>(names.map((n: any) => [n.key, n.cssPreset ?? null]))

  for (const u of users) {
    const effFrame = effectiveFrameByUser.get(u.id) || null
    const ent = u.entranceEffectId ? entranceMap.get(u.entranceEffectId) : null
    const accArr = accessoryIdsByUser.get(u.id) || []
    map.set(u.id, {
      profileEffect: u.profileEffect || null,
      profileFrameId: effFrame,
      profileFrameUrl: effFrame ? frameUrl.get(effFrame) || null : null,
      nameEffect: u.nameEffect || null,
      nameEffectCss: u.nameEffect ? nameCss.get(u.nameEffect) || null : null,
      micFrameId: u.micFrameId || null,
      micFrameUrl: u.micFrameId ? micUrl.get(u.micFrameId) || null : null,
      entranceEffectId: u.entranceEffectId || null,
      entranceEffectUrl: ent ? ent.assetUrl : null,
      entranceEffectType: ent ? ent.assetType : null,
      entranceDurationMs: ent ? ent.durationMs : null,
      chatBubbleId: u.chatBubbleId || null,
      chatBubbleUrl: u.chatBubbleId ? bubbleUrl.get(u.chatBubbleId) || null : null,
      avatarAccessories: accArr
        .map((id) => {
          const a = accessoryMap.get(id)
          return a ? { id: a.id, slot: a.slot, url: a.assetUrl } : null
        })
        .filter((x): x is { id: string; slot: string; url: string } => x !== null),
    })
  }

  return map
}
