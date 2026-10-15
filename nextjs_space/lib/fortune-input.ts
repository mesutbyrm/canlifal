/**
 * Fal uçları için ortak giriş normalleştirme + akış uyumluluğu.
 *
 * Mobil uygulama tüm fal türlerine aynı gövdeyi gönderir
 * (`question/text/dream/note`, `birthDate`, …). Uçlar ise türe özel alan
 * adları bekliyordu (`dreamDescription`, `zodiacSign`, `name`, `cardCount`…);
 * bu yüzden çoğu fal 400 alıp gerçek AI yorumu yerine sahte yorum gösteriliyordu.
 * Burada eş anlamlı alanlar eşlenir ve eksikler kullanıcı profilinden
 * (isim, doğum tarihi, burç, şehir) veya makul varsayılanlardan tamamlanır.
 */

import prisma from '@/lib/db'

export type FortuneRoute =
  | 'tarot-fali'
  | 'katina'
  | 'evet-hayir'
  | 'istihare'
  | 'ruya-yorumu'
  | 'kahve-fali'
  | 'aura-analizi'
  | 'numeroloji'
  | 'burc-yorumu'
  | 'dogum-haritasi'
  | 'ask-uyumu'
  | 'el-fali'
  | 'kahve-fali-image'
  | 'melek-kartlari'
  | 'kursundokme'

const SIGN_ALIASES: Record<string, string> = {
  aries: 'aries', koc: 'aries', 'koç': 'aries',
  taurus: 'taurus', boga: 'taurus', 'boğa': 'taurus',
  gemini: 'gemini', ikizler: 'gemini',
  cancer: 'cancer', yengec: 'cancer', 'yengeç': 'cancer',
  leo: 'leo', aslan: 'leo',
  virgo: 'virgo', basak: 'virgo', 'başak': 'virgo',
  libra: 'libra', terazi: 'libra',
  scorpio: 'scorpio', akrep: 'scorpio',
  sagittarius: 'sagittarius', yay: 'sagittarius',
  capricorn: 'capricorn', oglak: 'capricorn', 'oğlak': 'capricorn',
  aquarius: 'aquarius', kova: 'aquarius',
  pisces: 'pisces', balik: 'pisces', 'balık': 'pisces',
}

export function normalizeSign(raw: unknown): string | null {
  if (raw == null) return null
  const key = String(raw).trim().toLocaleLowerCase('tr-TR')
  return SIGN_ALIASES[key] ?? null
}

/** Doğum tarihinden (tropikal) burç. */
export function signFromDate(raw: unknown): string | null {
  if (!raw) return null
  const d = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return null
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const md = m * 100 + day
  if (md >= 321 && md <= 419) return 'aries'
  if (md >= 420 && md <= 520) return 'taurus'
  if (md >= 521 && md <= 620) return 'gemini'
  if (md >= 621 && md <= 722) return 'cancer'
  if (md >= 723 && md <= 822) return 'leo'
  if (md >= 823 && md <= 922) return 'virgo'
  if (md >= 923 && md <= 1022) return 'libra'
  if (md >= 1023 && md <= 1121) return 'scorpio'
  if (md >= 1122 && md <= 1221) return 'sagittarius'
  if (md >= 1222 || md <= 119) return 'capricorn'
  if (md >= 120 && md <= 218) return 'aquarius'
  return 'pisces'
}

function firstText(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

const DEFAULT_QUESTION: Partial<Record<FortuneRoute, string>> = {
  'tarot-fali': 'Önümüzdeki dönemde hayatımda beni neler bekliyor?',
  katina: 'Aşk hayatımda ve ilişkilerimde beni neler bekliyor?',
  'evet-hayir': 'Yakın zamanda beklediğim güzel haber gelecek mi?',
  istihare: 'Aklımdaki karar benim için hayırlı mı?',
}

export async function normalizeFortuneBody(
  raw: unknown,
  route: FortuneRoute,
  userId?: string | null,
): Promise<Record<string, any>> {
  const b: Record<string, any> = raw && typeof raw === 'object' ? { ...(raw as any) } : {}
  const text = firstText(b.question, b.text, b.note, b.userInput, b.dream, b.description, b.dreamDescription)

  let userCache: { name: string | null; username: string | null; birthDate: Date | null; zodiacSign: string | null; city: string | null } | null | undefined
  const user = async () => {
    if (userCache !== undefined) return userCache
    if (!userId) return (userCache = null)
    try {
      userCache = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true, birthDate: true, zodiacSign: true, city: true },
      })
    } catch {
      userCache = null
    }
    return userCache
  }

  switch (route) {
    case 'tarot-fali': {
      b.question = firstText(b.question, text) ?? DEFAULT_QUESTION['tarot-fali']
      const n = parseInt(String(b.cardCount ?? ''), 10)
      b.cardCount = Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 3
      break
    }
    case 'katina':
    case 'evet-hayir':
    case 'istihare':
      b.question = firstText(b.question, text) ?? DEFAULT_QUESTION[route]
      break
    case 'ruya-yorumu':
      b.dreamDescription = firstText(b.dreamDescription, text)
      break
    case 'kahve-fali':
      b.description = firstText(b.description, text) ?? 'Fincanımda neler görüyorsun? Genel bir kahve falı yorumu yap.'
      break
    case 'aura-analizi':
    case 'numeroloji': {
      const u = await user()
      b.name = firstText(b.name, b.fullName, u?.name, u?.username) ?? 'Misafir'
      b.birthDate = b.birthDate || (u?.birthDate ? u.birthDate.toISOString() : undefined)
      break
    }
    case 'burc-yorumu': {
      let sign = normalizeSign(b.zodiacSign) ?? normalizeSign(b.sign) ?? normalizeSign(b.burc)
      if (!sign) sign = signFromDate(b.birthDate)
      if (!sign) {
        const u = await user()
        sign = normalizeSign(u?.zodiacSign) ?? signFromDate(u?.birthDate)
      }
      b.zodiacSign = sign ?? undefined
      break
    }
    case 'dogum-haritasi': {
      const u = await user()
      b.birthDate = b.birthDate || (u?.birthDate ? u.birthDate.toISOString() : undefined)
      b.birthPlace = firstText(b.birthPlace, b.city, u?.city) ?? 'Türkiye'
      break
    }
    case 'ask-uyumu': {
      let mine = normalizeSign(b.yourSign) ?? signFromDate(b.birthDate)
      if (!mine) {
        const u = await user()
        mine = normalizeSign(u?.zodiacSign) ?? signFromDate(u?.birthDate)
      }
      b.yourSign = mine ?? undefined
      // Mobil: partnerin burcu serbest metin (userInput) olarak da gelebilir.
      b.partnerSign = normalizeSign(b.partnerSign) ?? signFromDate(b.partnerBirthDate) ?? normalizeSign(text) ?? b.partnerSign
      break
    }
    default:
      break
  }
  return b
}

export { normalizeLlmSseChunk, createSseNormalizer } from '@/lib/fortune-sse'
