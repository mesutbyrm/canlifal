/**
 * GirLive moderasyon çekirdeği — SAF fonksiyonlar (veritabanı yok).
 *
 * Sesli oda + canlı yayın sohbeti aynı kuralları kullanır. Tek bir kelime
 * görünce doğrudan ban verilmez: kelimenin ciddiyeti (severity) ve kullanıcının
 * son 24 saatteki ihlal sayısı birlikte eylemi belirler. Eşleme admin
 * tarafından (SiteSetting `girlive.severity_actions` / `girlive.words`)
 * değiştirilebilir.
 */

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ModAction = 'warn' | 'mute' | 'kick' | 'ban'
export interface ActionRule {
  action: ModAction
  /** mute / ban süresi (dakika). `ban` için boş = kalıcı. */
  minutes?: number
}
export type SeverityActions = Record<Severity, ActionRule>
export interface BannedWordEntry {
  word: string
  severity: Severity
  /** true: kelime ile başlayan her sözcük eşleşir (ör. "orospu" → "orospuluk"). */
  prefix?: boolean
}

export const SEVERITY_ORDER: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

/** LOW → uyarı · MEDIUM → uyarı + geçici mute · HIGH → odadan at · CRITICAL → ban */
export const DEFAULT_SEVERITY_ACTIONS: SeverityActions = {
  LOW: { action: 'warn' },
  MEDIUM: { action: 'mute', minutes: 5 },
  HIGH: { action: 'kick' },
  CRITICAL: { action: 'ban', minutes: 1440 },
}

/**
 * Varsayılan Türkçe yasaklı kelime listesi (admin panelinden genişletilir).
 * Kasıtlı olarak kısa ve temkinli tutuldu: yanlış pozitifi azaltmak için çoğu
 * kelime TAM eşleşme ister; yalnızca güvenli kök sözcükler `prefix` kullanır.
 */
export const DEFAULT_BANNED_WORDS: BannedWordEntry[] = [
  // LOW — hafif hakaret
  ...['salak', 'aptal', 'gerizekali', 'mal', 'budala', 'embesil', 'dangalak'].map(
    (word): BannedWordEntry => ({ word, severity: 'LOW' })
  ),
  // MEDIUM — küfür
  ...['amk', 'aq', 'mk', 'sg', 'siktir', 'orospu', 'pic', 'yarrak', 'ibne', 'got', 'gotveren', 'amina', 'amcik'].map(
    (word): BannedWordEntry => ({ word, severity: 'MEDIUM' })
  ),
  { word: 'orospu', severity: 'MEDIUM', prefix: true },
  { word: 'siktir', severity: 'MEDIUM', prefix: true },
  { word: 'yarrak', severity: 'MEDIUM', prefix: true },
  // HIGH — tehdit / ağır hakaret
  ...['oldurecegim', 'gebertirim', 'geberesice', 'kafani kiracagim'].map(
    (word): BannedWordEntry => ({ word, severity: 'HIGH' })
  ),
  { word: 'sikerim', severity: 'HIGH', prefix: true },
  { word: 'taciz', severity: 'HIGH', prefix: true },
  // CRITICAL — çocuk istismarı / terör / ağır nefret
  ...['cocuk pornosu', 'pedofil', 'tecavuz'].map((word): BannedWordEntry => ({ word, severity: 'CRITICAL' })),
]

const TR_FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u',
}
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
}
/** `@` / `$` yalnızca harfin ARDINDAN gelirse dönüştürülür ("a@k"); "@kullanici" etiketi bozulmaz. */
const LEET_AFTER_LETTER: Record<string, string> = { '@': 'a', $: 's' }

/** Küçük harf + Türkçe karakter katlama + basit "leet" çözümü. */
export function normalizeText(input: string): string {
  let out = ''
  for (const ch of input.toLocaleLowerCase('tr-TR').normalize('NFC')) {
    const prev = out[out.length - 1]
    const afterLetter = prev !== undefined && /[a-z]/.test(prev)
    out += (afterLetter ? LEET_AFTER_LETTER[ch] : undefined) ?? LEET[ch] ?? TR_FOLD[ch] ?? ch
  }
  return out
}

/** "amkkkk" → "amk": 3+ tekrarlı harfleri tek harfe indirir. */
function collapseRepeats(s: string): string {
  return s.replace(/(.)\1{2,}/g, '$1')
}

/** Metni sözcüklere böler; tek harflik ardışık sözcükleri ("s.i.k.t.i.r") birleştirir. */
export function tokenize(input: string): string[] {
  const norm = normalizeText(input)
  const raw = norm.split(/[^a-z0-9]+/).filter(Boolean)
  const tokens: string[] = []
  let run = ''
  for (const t of raw) {
    if (t.length === 1) {
      run += t
      continue
    }
    if (run.length >= 3) tokens.push(run)
    run = ''
    tokens.push(collapseRepeats(t))
  }
  if (run.length >= 3) tokens.push(run)
  return tokens
}

export interface WordMatch {
  word: string
  severity: Severity
}

/**
 * Metindeki en ciddi eşleşmeyi döner (yoksa null).
 * `whitelist`: oda sahibinin "güvenli" işaretlediği kelimeler.
 */
export function detectViolation(
  text: string,
  entries: BannedWordEntry[],
  whitelist: string[] = []
): WordMatch | null {
  const tokens = tokenize(text)
  if (tokens.length === 0) return null
  const safe = new Set(whitelist.map((w) => normalizeText(w).trim()).filter(Boolean))
  const phrase = ` ${tokens.join(' ')} `
  let best: WordMatch | null = null
  for (const e of entries) {
    const w = normalizeText(e.word).trim()
    if (!w || safe.has(w)) continue
    let hit = false
    if (w.includes(' ')) {
      hit = phrase.includes(` ${w} `)
    } else if (e.prefix) {
      hit = tokens.some((t) => t === w || t.startsWith(w))
    } else {
      hit = tokens.includes(w)
    }
    if (!hit) continue
    if (!best || SEVERITY_ORDER.indexOf(e.severity) > SEVERITY_ORDER.indexOf(best.severity)) {
      best = { word: e.word, severity: e.severity }
    }
  }
  return best
}

/**
 * Tekrarlayan ihlal yükseltmesi (son 24 saat, aynı oda/yayın + kullanıcı):
 * 1-2 önceki ihlal → +1 seviye, 3-4 → +2, 5+ → +3 (CRITICAL'de durur).
 */
export function escalateSeverity(base: Severity, priorViolations: number): Severity {
  const bump = priorViolations >= 5 ? 3 : priorViolations >= 3 ? 2 : priorViolations >= 1 ? 1 : 0
  const idx = Math.min(SEVERITY_ORDER.indexOf(base) + bump, SEVERITY_ORDER.length - 1)
  return SEVERITY_ORDER[idx]
}

export interface Decision {
  severity: Severity
  rule: ActionRule
}

export function decideAction(
  base: Severity,
  priorViolations: number,
  actions: SeverityActions = DEFAULT_SEVERITY_ACTIONS
): Decision {
  const severity = escalateSeverity(base, priorViolations)
  return { severity, rule: actions[severity] ?? DEFAULT_SEVERITY_ACTIONS[severity] }
}

/** Admin'in kaydettiği JSON'u doğrular; geçersiz alanlar varsayılana düşer. */
export function parseSeverityActions(raw: unknown): SeverityActions {
  const out: SeverityActions = { ...DEFAULT_SEVERITY_ACTIONS }
  if (!raw || typeof raw !== 'object') return out
  const valid: ModAction[] = ['warn', 'mute', 'kick', 'ban']
  for (const sev of SEVERITY_ORDER) {
    const r = (raw as Record<string, any>)[sev]
    if (!r || typeof r !== 'object' || !valid.includes(r.action)) continue
    const minutes = Number(r.minutes)
    out[sev] = {
      action: r.action,
      ...(Number.isFinite(minutes) && minutes > 0 ? { minutes: Math.min(minutes, 60 * 24 * 365) } : {}),
    }
  }
  return out
}

export function parseBannedWordEntries(raw: unknown): BannedWordEntry[] {
  if (!Array.isArray(raw)) return []
  const out: BannedWordEntry[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const word = String((r as any).word ?? '').trim()
    const severity = String((r as any).severity ?? '').toUpperCase() as Severity
    if (!word || word.length > 64 || !SEVERITY_ORDER.includes(severity)) continue
    out.push({ word, severity, prefix: (r as any).prefix === true })
  }
  return out
}

// ── Bot mesaj şablonları (kullanıcı adı {user} ile yerleştirilir) ──────────
export const BOT_NAME = 'GirLive Bot'

export const DEFAULT_WELCOME_TEXT = '👋 Hoş geldin @{user}!\nLütfen oda kurallarına uy. Keyifli yayınlar!'
export const DEFAULT_RULES_TEXT =
  '📢 GirLive Bot:\nLütfen hakaret, küfür, spam, reklam, taciz ve uygunsuz içerik paylaşmayın.\n' +
  'Oda kurallarına uymayan kullanıcılar susturulabilir veya banlanabilir.'

export function renderTemplate(tpl: string, user: string): string {
  return tpl.replace(/\{user\}/g, user)
}

export function botNoticeFor(action: ModAction, user: string): string {
  switch (action) {
    case 'warn':
      return `⚠️ @${user}, lütfen kullandığınız kelimelere dikkat edin. Oda kurallarına uyun.`
    case 'mute':
      return `🔇 @${user} kurallara uymadığı için geçici olarak sessize alındı.`
    case 'kick':
    case 'ban':
      return `🚫 @${user} oda kurallarını ihlal ettiği için odadan uzaklaştırıldı.`
  }
}

// ── Bot sohbet yanıtları (saf) ─────────────────────────────────────────────
function normalizeBotText(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9@\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const GREETINGS = [
  'selam', 'slm', 'selamlar', 'merhaba', 'mrb', 'merhabalar', 'sa', 'selamun aleykum',
  'selamunaleykum', 'gunaydin', 'iyi aksamlar', 'iyi geceler', 'hey', 'hi', 'hello',
]

/** Kullanıcının mesajına bot yanıtı (null = yanıt yok). Saf fonksiyon — testlenebilir. */
export function buildBotReply(text: string, name: string, rulesText: string): { reply: string; greeting: boolean } | null {
  const t = normalizeBotText(text)
  if (!t) return null
  const mentioned = /(^|\s)@?(girlive|girlive bot|girlive_bot|bot)(\s|$)/.test(t) || t.includes('girlive')
  const isGreeting = GREETINGS.some((g) => t === g || t.startsWith(`${g} `) || t.endsWith(` ${g}`))
  if (!mentioned && !isGreeting) return null
  const at = `@${name}`
  if (/kural/.test(t)) return { reply: `📜 ${at} ${rulesText}`, greeting: false }
  if (/(jeton|bakiye|yukle|satin al)/.test(t)) {
    return { reply: `💰 ${at} Jeton yüklemek için profilindeki Cüzdan / Jeton Yükle bölümünü kullanabilirsin.`, greeting: false }
  }
  if (/(hediye|gift)/.test(t)) {
    return { reply: `🎁 ${at} Hediye göndermek için alttaki hediye simgesine dokun, hediyeyi seç ve gönder.`, greeting: false }
  }
  if (/(^|\s)pk(\s|$)/.test(t)) {
    return { reply: `⚔️ ${at} PK sırasında yayıncına hediye göndererek takımına puan kazandırabilirsin.`, greeting: false }
  }
  if (/(yardim|nasil|ne yap|help)/.test(t)) {
    return { reply: `🤖 ${at} Sana yardımcı olabilirim: "kurallar", "jeton", "hediye" veya "pk" yazman yeterli.`, greeting: false }
  }
  if (/(tesekkur|sagol|eyvallah|tsk)/.test(t)) {
    return { reply: `😊 ${at} Rica ederim! İyi eğlenceler.`, greeting: false }
  }
  if (isGreeting) {
    return { reply: `👋 Merhaba ${at}! Keyifli sohbetler dilerim. Yardım için "@GirLive yardım" yazabilirsin.`, greeting: true }
  }
  return { reply: `🤖 ${at} Ben GirLive Bot! "kurallar", "jeton", "hediye" veya "pk" yazarak bana soru sorabilirsin.`, greeting: false }
}

