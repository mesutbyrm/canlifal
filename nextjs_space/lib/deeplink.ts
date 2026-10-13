/**
 * Faz 10 — Derin Bağlantı (Deep Link) Standardı
 *
 * Tek bir kayıt defteri üzerinden hem web yolunu hem mobil uygulama URI'sini
 * (canlifal://) üretir ve gelen bir bağlantıyı hedef varlığa çözümler.
 *
 * Tamamen eklemeli: mevcut rotalar veya paylasım akışları değişmez. Web ve
 * mobil istemciler aynı kaynağı tutarlı biçimde adresleyebilsin diye ortak
 * bir sözleşme sağlar.
 *
 * Kullanım:
 *   const link = buildDeepLink('teller', { id: 'abc' })
 *   // link.web  = "/canli-falcilar/abc"
 *   // link.app  = "canlifal://teller/abc"
 *   const target = resolveDeepLink('canlifal://teller/abc')
 *   const target2 = resolveDeepLink('https://canlifal.com/tr/canli-falcilar/abc')
 */

export const DEEPLINK_SCHEME = 'canlifal'

export type DeepLinkType =
  | 'teller'
  | 'room'
  | 'stream'
  | 'video'
  | 'post'
  | 'blog'
  | 'profile'
  | 'chatroom'
  | 'dream'
  | 'dreamdict'
  | 'page'
  | 'message'
  | 'question'
  | 'home'

interface DeepLinkDef {
  /** URI param adı (canlifal://<type>/<param>) */
  param: string
  /** Web yolu üretici (dil öneki hariç; önek çağrıldığı yerde eklenir) */
  web: (v: string) => string
  /** Bu tip için web yolunu tanıyan regex (dil öneki opsiyonel) */
  match: RegExp
  /** Varlık modeli (bilgi amaçlı; çözümleyici doğrulamaz) */
  entity: string
}

/**
 * Kayıt defteri. Her giriş web rotası ile canlifal:// URI arasında köprü kurar.
 * match regex'leri isteğe bağlı `/{lang}` önekini ({tr|en}) tolere eder.
 */
const REGISTRY: Record<Exclude<DeepLinkType, 'home'>, DeepLinkDef> = {
  teller: {
    param: 'id',
    web: (v) => `/canli-falcilar/${v}`,
    match: /^\/(?:(?:tr|en)\/)?canli-falcilar\/([^/?#]+)$/,
    entity: 'LiveFortuneTeller',
  },
  room: {
    param: 'id',
    web: (v) => `/canli-oda/${v}`,
    match: /^\/(?:(?:tr|en)\/)?canli-oda\/([^/?#]+)$/,
    entity: 'LiveSession',
  },
  stream: {
    param: 'id',
    web: (v) => `/videolar/izle/${v}`,
    match: /^\/(?:(?:tr|en)\/)?videolar\/izle\/([^/?#]+)$/,
    entity: 'VideoStream',
  },
  video: {
    param: 'id',
    web: (v) => `/tiktok/${v}`,
    match: /^\/(?:(?:tr|en)\/)?tiktok\/([^/?#]+)$/,
    entity: 'ShortVideo',
  },
  post: {
    param: 'id',
    web: (v) => `/fal/${v}`,
    match: /^\/(?:(?:tr|en)\/)?fal\/([^/?#]+)$/,
    entity: 'FortunePost',
  },
  blog: {
    param: 'slug',
    web: (v) => `/blog/${v}`,
    match: /^\/(?:(?:tr|en)\/)?blog\/([^/?#]+)$/,
    entity: 'BlogPost',
  },
  profile: {
    param: 'username',
    web: (v) => `/profil/${v}`,
    match: /^\/(?:(?:tr|en)\/)?profil\/([^/?#]+)$/,
    entity: 'User',
  },
  chatroom: {
    param: 'slug',
    web: (v) => `/sohbet/${v}`,
    match: /^\/(?:(?:tr|en)\/)?sohbet\/([^/?#]+)$/,
    entity: 'ChatRoom',
  },
  dream: {
    param: 'slug',
    web: (v) => `/ruya/${v}`,
    match: /^\/(?:(?:tr|en)\/)?ruya\/([^/?#]+)$/,
    entity: 'DreamInterpretation',
  },
  dreamdict: {
    param: 'slug',
    web: (v) => `/ruya-sozlugu/${v}`,
    match: /^\/(?:(?:tr|en)\/)?ruya-sozlugu\/([^/?#]+)$/,
    entity: 'DreamDictionary',
  },
  page: {
    param: 'slug',
    web: (v) => `/sayfa/${v}`,
    match: /^\/(?:(?:tr|en)\/)?sayfa\/([^/?#]+)$/,
    entity: 'CustomPage',
  },
  message: {
    param: 'userId',
    web: (v) => `/mesajlar/${v}`,
    match: /^\/(?:(?:tr|en)\/)?mesajlar\/([^/?#]+)$/,
    entity: 'User',
  },
  question: {
    param: 'slug',
    web: (v) => `/sorbak/soru/${v}`,
    match: /^\/(?:(?:tr|en)\/)?sorbak\/soru\/([^/?#]+)$/,
    entity: 'Question',
  },
}

export interface DeepLink {
  type: DeepLinkType
  value: string | null
  /** Dil öneksiz web yolu (ör: /canli-falcilar/abc) */
  web: string
  /** Mobil uygulama URI'si (ör: canlifal://teller/abc) */
  app: string
  entity: string | null
}

/**
 * Belirtilen tip ve parametreden hem web yolu hem uygulama URI'si üretir.
 */
export function buildDeepLink(
  type: DeepLinkType,
  params?: { id?: string; slug?: string; username?: string; userId?: string }
): DeepLink {
  if (type === 'home') {
    return { type, value: null, web: '/', app: `${DEEPLINK_SCHEME}://home`, entity: null }
  }
  const def = REGISTRY[type]
  const value =
    params?.[def.param as keyof typeof params] ??
    params?.id ??
    params?.slug ??
    params?.username ??
    params?.userId ??
    ''
  return {
    type,
    value: value || null,
    web: value ? def.web(value) : '/',
    app: value ? `${DEEPLINK_SCHEME}://${type}/${value}` : `${DEEPLINK_SCHEME}://home`,
    entity: def.entity,
  }
}

/**
 * Tam bir uygulama URI'si (canlifal://type/value) veya bir web yolunu/URL'sini
 * alıp hedef DeepLink tanımına çözümler. Tanınamazsa null döner.
 */
export function resolveDeepLink(input: string): DeepLink | null {
  if (!input || typeof input !== 'string') return null
  const raw = input.trim()

  // 1) canlifal:// URI
  if (raw.startsWith(`${DEEPLINK_SCHEME}://`)) {
    const rest = raw.slice(`${DEEPLINK_SCHEME}://`.length)
    if (!rest || rest === 'home') return buildDeepLink('home')
    const [type, ...segs] = rest.split('/')
    const value = segs.join('/').split(/[?#]/)[0]
    if (type in REGISTRY) {
      return buildDeepLink(type as DeepLinkType, { id: value, slug: value, username: value, userId: value })
    }
    return null
  }

  // 2) Web yolu veya tam URL → pathname çıkar
  let path = raw
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname
    }
  } catch {
    return null
  }
  if (!path.startsWith('/')) path = `/${path}`

  for (const [type, def] of Object.entries(REGISTRY)) {
    const m = path.match(def.match)
    if (m) {
      const value = decodeURIComponent(m[1])
      return buildDeepLink(type as DeepLinkType, { id: value, slug: value, username: value, userId: value })
    }
  }

  // 3) Kök / ana sayfa
  if (path === '/' || /^\/(?:tr|en)\/?$/.test(path)) return buildDeepLink('home')

  return null
}
