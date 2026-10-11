/**
 * lib/sms/adapters.ts — Sağlayıcı bazlı gerçek HTTP entegrasyonları.
 *
 * DİKKAT (tsconfig): strict:true fakat strictNullChecks:false olduğu için
 * discriminated-union daraltması ÇALIŞMAZ. Bu yüzden tüm sonuç tipleri DÜZ
 * (flat) tutulmuştur: { ok, ... } — dallara cast'siz erişilebilir.
 *
 * DÜRÜSTLÜK KURALI: Yalnızca resmî dokümantasyonu doğrulanmış uçlar yazıldı.
 * Doğrulanamayan sağlayıcı (mobildev) `not_implemented` döner, sahte istek atmaz.
 */

import { getProviderMeta } from './catalog'

export type SmsSendResult = {
  ok: boolean
  providerMessageId?: string
  errorCode?: string
  /** Yalnızca sunucu tarafı log içindir; asla API yanıtına konmaz. */
  errorMessage?: string
}

export type SmsHealthResult = {
  ok: boolean
  /** Gerçek bir ağ çağrısı yapıldı mı (false ise yalnız yapılandırma doğrulandı) */
  live: boolean
  errorCode?: string
  errorMessage?: string
}

export type SmsBalanceResult = {
  ok: boolean
  supported: boolean
  balance?: string
  errorCode?: string
  errorMessage?: string
}

export type SmsConfigValidation = { ok: boolean; missing: string[] }

export type SmsConfig = Record<string, string>

export type SmsAdapter = {
  key: string
  validateConfig: (cfg: SmsConfig) => SmsConfigValidation
  sendSms: (cfg: SmsConfig, phone: string, message: string, timeoutMs?: number) => Promise<SmsSendResult>
  checkBalance: (cfg: SmsConfig, timeoutMs?: number) => Promise<SmsBalanceResult>
  healthCheck: (cfg: SmsConfig, timeoutMs?: number) => Promise<SmsHealthResult>
}

export const DEFAULT_TIMEOUT_MS = 15000

/* ----------------------------- yardımcılar ----------------------------- */

function digits(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '')
}

/** +905xxxxxxxxx -> 5xxxxxxxxx (yalnız TR numaraları için) */
function trLocal(phone: string): string {
  const d = digits(phone)
  if (d.startsWith('90') && d.length === 12) return d.slice(2)
  return d
}

function xmlEscape(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function httpRequest(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string; timedOut: boolean; networkError?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    const text = await res.text().catch(() => '')
    return { ok: res.ok, status: res.status, text, timedOut: false }
  } catch (e: any) {
    const aborted = e && (e.name === 'AbortError' || String(e).includes('aborted'))
    return {
      ok: false,
      status: 0,
      text: '',
      timedOut: !!aborted,
      networkError: aborted ? 'timeout' : (e instanceof Error ? e.message : 'network_error'),
    }
  } finally {
    clearTimeout(timer)
  }
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function requiredValidator(providerKey: string) {
  return (cfg: SmsConfig): SmsConfigValidation => {
    const meta = getProviderMeta(providerKey)
    if (!meta) return { ok: false, missing: ['provider_meta'] }
    const missing: string[] = []
    for (const f of meta.fields) {
      if (f.required && !String((cfg || {})[f.key] || '').trim()) missing.push(f.key)
    }
    return { ok: missing.length === 0, missing }
  }
}

/** Canlı health-check desteklemeyen sağlayıcılar için: yalnız yapılandırma doğrulaması. */
function configOnlyHealth(providerKey: string) {
  return async (cfg: SmsConfig): Promise<SmsHealthResult> => {
    const v = requiredValidator(providerKey)(cfg)
    if (!v.ok) return { ok: false, live: false, errorCode: 'config_missing', errorMessage: v.missing.join(',') }
    return { ok: true, live: false }
  }
}

const noBalance = async (): Promise<SmsBalanceResult> => ({ ok: false, supported: false, errorCode: 'not_supported' })

function netError(r: { timedOut: boolean; networkError?: string }): SmsSendResult {
  return { ok: false, errorCode: r.timedOut ? 'timeout' : 'network_error', errorMessage: r.networkError }
}

/* ------------------------------- Netgsm ------------------------------- */
// GET https://api.netgsm.com.tr/sms/send/get  -> "00 <bulkid>" / "01" / "02" kabul
const netgsm: SmsAdapter = {
  key: 'netgsm',
  validateConfig: requiredValidator('netgsm'),
  healthCheck: configOnlyHealth('netgsm'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const params = new URLSearchParams({
      usercode: cfg.username,
      password: cfg.password,
      gsmno: digits(phone),
      message,
      msgheader: cfg.header,
    })
    const r = await httpRequest('https://api.netgsm.com.tr/sms/send/get?' + params.toString(), { method: 'GET' }, timeoutMs)
    if (r.status === 0) return netError(r)
    const text = (r.text || '').trim()
    const code = text.split(' ')[0]
    if (code === '00' || code === '01' || code === '02') return { ok: true, providerMessageId: text }
    return { ok: false, errorCode: 'netgsm_' + (code || r.status), errorMessage: text }
  },
}

/* ------------------------------- Verimor ------------------------------ */
// POST https://sms.verimor.com.tr/v2/send.json -> 200 + kampanya no
const verimor: SmsAdapter = {
  key: 'verimor',
  validateConfig: requiredValidator('verimor'),
  healthCheck: configOnlyHealth('verimor'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const body = {
      username: cfg.username,
      password: cfg.password,
      source_addr: cfg.source_addr,
      messages: [{ msg: message, dest: digits(phone) }],
    }
    const r = await httpRequest(
      'https://sms.verimor.com.tr/v2/send.json',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    if (r.status === 200) return { ok: true, providerMessageId: (r.text || '').trim() }
    return { ok: false, errorCode: 'verimor_' + r.status, errorMessage: (r.text || '').slice(0, 200) }
  },
}

/* ---------------------------- İleti Merkezi --------------------------- */
// POST https://api.iletimerkezi.com/v1/send-sms/json
// Bakiye: POST https://api.iletimerkezi.com/v1/get-balance/json (SMS göndermez)
const iletimerkezi: SmsAdapter = {
  key: 'iletimerkezi',
  validateConfig: requiredValidator('iletimerkezi'),
  async sendSms(cfg, phone, message, timeoutMs) {
    const body = {
      request: {
        authentication: { key: cfg.api_key, hash: cfg.api_hash },
        order: {
          sender: cfg.sender,
          iys: '0',
          message: { text: message, receipents: { number: [digits(phone)] } },
        },
      },
    }
    const r = await httpRequest(
      'https://api.iletimerkezi.com/v1/send-sms/json',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    const code = String(j?.response?.status?.code || '')
    if (code === '200') return { ok: true, providerMessageId: String(j?.response?.order?.id || '') }
    return { ok: false, errorCode: 'iletimerkezi_' + (code || r.status), errorMessage: String(j?.response?.status?.message || (r.text || '').slice(0, 200)) }
  },
  async checkBalance(cfg, timeoutMs) {
    const body = { request: { authentication: { key: cfg.api_key, hash: cfg.api_hash } } }
    const r = await httpRequest(
      'https://api.iletimerkezi.com/v1/get-balance/json',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      timeoutMs
    )
    if (r.status === 0) return { ok: false, supported: true, errorCode: r.timedOut ? 'timeout' : 'network_error' }
    const j = parseJson(r.text)
    const code = String(j?.response?.status?.code || '')
    if (code === '200') return { ok: true, supported: true, balance: String(j?.response?.balance?.amount ?? j?.response?.balance?.sms ?? '') }
    return { ok: false, supported: true, errorCode: 'iletimerkezi_' + (code || r.status) }
  },
  async healthCheck(cfg, timeoutMs) {
    const v = requiredValidator('iletimerkezi')(cfg)
    if (!v.ok) return { ok: false, live: false, errorCode: 'config_missing', errorMessage: v.missing.join(',') }
    const b = await this.checkBalance(cfg, timeoutMs)
    return { ok: b.ok, live: true, errorCode: b.errorCode }
  },
}

/* ------------------------------ VatanSMS ------------------------------ */
// POST https://api.vatansms.net/api/v1/1toN
const vatansms: SmsAdapter = {
  key: 'vatansms',
  validateConfig: requiredValidator('vatansms'),
  healthCheck: configOnlyHealth('vatansms'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const body = {
      api_id: cfg.api_id,
      api_key: cfg.api_key,
      sender: cfg.sender,
      message_type: 'turkce',
      message,
      message_content_type: 'bilgi',
      phones: [trLocal(phone)],
    }
    const r = await httpRequest(
      'https://api.vatansms.net/api/v1/1toN',
      { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.status === 200 && (j?.status === true || j?.status === 'success' || j?.data)) {
      return { ok: true, providerMessageId: String(j?.data?.report_id ?? j?.report_id ?? '') }
    }
    return { ok: false, errorCode: 'vatansms_' + r.status, errorMessage: String(j?.message || (r.text || '').slice(0, 200)) }
  },
}

/* ------------------------------ Mutlucell ----------------------------- */
// POST https://smsgw.mutlucell.com/smsgw-ws/sndblkex  (XML gövde)
// Bakiye: https://smsgw.mutlucell.com/smsgw-ws/gtcrdtex
const MUTLUCELL_ERRORS = ['20', '21', '22', '23', '24', '25', '30']
const mutlucell: SmsAdapter = {
  key: 'mutlucell',
  validateConfig: requiredValidator('mutlucell'),
  async sendSms(cfg, phone, message, timeoutMs) {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<smspack ka="' + xmlEscape(cfg.username) + '" pwd="' + xmlEscape(cfg.password) + '" org="' + xmlEscape(cfg.originator) + '">' +
      '<mesaj><metin>' + xmlEscape(message) + '</metin><nums>' + digits(phone) + '</nums></mesaj>' +
      '</smspack>'
    const r = await httpRequest(
      'https://smsgw.mutlucell.com/smsgw-ws/sndblkex',
      { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: xml },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const text = (r.text || '').trim()
    if (MUTLUCELL_ERRORS.includes(text)) return { ok: false, errorCode: 'mutlucell_' + text, errorMessage: text }
    if (r.status === 200 && text.length > 0) return { ok: true, providerMessageId: text }
    return { ok: false, errorCode: 'mutlucell_' + r.status, errorMessage: text.slice(0, 200) }
  },
  async checkBalance(cfg, timeoutMs) {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<smskredi ka="' + xmlEscape(cfg.username) + '" pwd="' + xmlEscape(cfg.password) + '" />'
    const r = await httpRequest(
      'https://smsgw.mutlucell.com/smsgw-ws/gtcrdtex',
      { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: xml },
      timeoutMs
    )
    if (r.status === 0) return { ok: false, supported: true, errorCode: r.timedOut ? 'timeout' : 'network_error' }
    const text = (r.text || '').trim()
    if (MUTLUCELL_ERRORS.includes(text)) return { ok: false, supported: true, errorCode: 'mutlucell_' + text }
    if (r.status === 200) return { ok: true, supported: true, balance: text.slice(0, 64) }
    return { ok: false, supported: true, errorCode: 'mutlucell_' + r.status }
  },
  async healthCheck(cfg, timeoutMs) {
    const v = requiredValidator('mutlucell')(cfg)
    if (!v.ok) return { ok: false, live: false, errorCode: 'config_missing', errorMessage: v.missing.join(',') }
    const b = await this.checkBalance(cfg, timeoutMs)
    return { ok: b.ok, live: true, errorCode: b.errorCode }
  },
}

/* ------------------------------- Mobildev ----------------------------- */
// Resmî, herkese açık bir uç/gövde şeması doğrulanamadı -> ENTEGRE EDİLMEDİ.
const mobildev: SmsAdapter = {
  key: 'mobildev',
  validateConfig: () => ({ ok: false, missing: ['not_implemented'] }),
  healthCheck: async () => ({ ok: false, live: false, errorCode: 'not_implemented' }),
  checkBalance: async () => ({ ok: false, supported: false, errorCode: 'not_implemented' }),
  sendSms: async () => ({ ok: false, errorCode: 'not_implemented', errorMessage: 'Mobildev entegrasyonu doğrulanmış dokümantasyon olmadığı için yazılmadı.' }),
}

/* -------------------------------- Twilio ------------------------------ */
const twilio: SmsAdapter = {
  key: 'twilio',
  validateConfig: requiredValidator('twilio'),
  healthCheck: configOnlyHealth('twilio'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(cfg.account_sid) + '/Messages.json'
    const body = new URLSearchParams({ To: phone, From: cfg.from_number, Body: message })
    const r = await httpRequest(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(cfg.account_sid + ':' + cfg.auth_token).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.ok && j?.sid) return { ok: true, providerMessageId: String(j.sid) }
    return { ok: false, errorCode: 'twilio_' + (j?.code || r.status), errorMessage: String(j?.message || '').slice(0, 200) }
  },
}

/* -------------------------------- Vonage ------------------------------ */
// POST https://rest.nexmo.com/sms/json -> messages[0].status === "0" başarı
const vonage: SmsAdapter = {
  key: 'vonage',
  validateConfig: requiredValidator('vonage'),
  healthCheck: configOnlyHealth('vonage'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const body = new URLSearchParams({
      api_key: cfg.api_key,
      api_secret: cfg.api_secret,
      from: cfg.from,
      to: digits(phone),
      text: message,
    })
    const r = await httpRequest(
      'https://rest.nexmo.com/sms/json',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    const m = j?.messages?.[0]
    if (m && String(m.status) === '0') return { ok: true, providerMessageId: String(m['message-id'] || '') }
    return { ok: false, errorCode: 'vonage_' + String(m?.status || r.status), errorMessage: String(m?.['error-text'] || '').slice(0, 200) }
  },
}

/* -------------------------------- Infobip ----------------------------- */
const infobip: SmsAdapter = {
  key: 'infobip',
  validateConfig: requiredValidator('infobip'),
  healthCheck: configOnlyHealth('infobip'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const base = String(cfg.base_url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const body = { messages: [{ destinations: [{ to: digits(phone) }], from: cfg.sender, text: message }] }
    const r = await httpRequest(
      'https://' + base + '/sms/2/text/advanced',
      {
        method: 'POST',
        headers: { Authorization: 'App ' + cfg.api_key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.ok && j?.messages?.[0]?.messageId) return { ok: true, providerMessageId: String(j.messages[0].messageId) }
    return { ok: false, errorCode: 'infobip_' + r.status, errorMessage: String(j?.requestError?.serviceException?.text || '').slice(0, 200) }
  },
}

/* -------------------------------- Telnyx ------------------------------ */
const telnyx: SmsAdapter = {
  key: 'telnyx',
  validateConfig: requiredValidator('telnyx'),
  healthCheck: configOnlyHealth('telnyx'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const r = await httpRequest(
      'https://api.telnyx.com/v2/messages',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.api_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: cfg.from, to: phone, text: message }),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.ok && j?.data?.id) return { ok: true, providerMessageId: String(j.data.id) }
    return { ok: false, errorCode: 'telnyx_' + r.status, errorMessage: String(j?.errors?.[0]?.detail || '').slice(0, 200) }
  },
}

/* --------------------------------- Plivo ------------------------------ */
const plivo: SmsAdapter = {
  key: 'plivo',
  validateConfig: requiredValidator('plivo'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const url = 'https://api.plivo.com/v1/Account/' + encodeURIComponent(cfg.auth_id) + '/Message/'
    const r = await httpRequest(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(cfg.auth_id + ':' + cfg.auth_token).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ src: cfg.src, dst: digits(phone), text: message }),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.status === 200 || r.status === 202) return { ok: true, providerMessageId: String(j?.message_uuid?.[0] || '') }
    return { ok: false, errorCode: 'plivo_' + r.status, errorMessage: String(j?.error || '').slice(0, 200) }
  },
  async healthCheck(cfg, timeoutMs) {
    const v = requiredValidator('plivo')(cfg)
    if (!v.ok) return { ok: false, live: false, errorCode: 'config_missing', errorMessage: v.missing.join(',') }
    const url = 'https://api.plivo.com/v1/Account/' + encodeURIComponent(cfg.auth_id) + '/'
    const r = await httpRequest(
      url,
      { method: 'GET', headers: { Authorization: 'Basic ' + Buffer.from(cfg.auth_id + ':' + cfg.auth_token).toString('base64') } },
      timeoutMs
    )
    if (r.status === 0) return { ok: false, live: true, errorCode: r.timedOut ? 'timeout' : 'network_error' }
    if (r.status === 200) return { ok: true, live: true }
    return { ok: false, live: true, errorCode: 'plivo_' + r.status }
  },
}

/* --------------------------------- Sinch ------------------------------ */
const sinch: SmsAdapter = {
  key: 'sinch',
  validateConfig: requiredValidator('sinch'),
  healthCheck: configOnlyHealth('sinch'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const region = String(cfg.region || 'us').toLowerCase().trim()
    const url = 'https://' + region + '.sms.api.sinch.com/xms/v1/' + encodeURIComponent(cfg.service_plan_id) + '/batches'
    const r = await httpRequest(
      url,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.api_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: cfg.from, to: [phone], body: message }),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.ok && j?.id) return { ok: true, providerMessageId: String(j.id) }
    return { ok: false, errorCode: 'sinch_' + r.status, errorMessage: String(j?.text || '').slice(0, 200) }
  },
}

/* ---------------------------- Bird (MessageBird) ---------------------- */
const bird: SmsAdapter = {
  key: 'bird',
  validateConfig: requiredValidator('bird'),
  healthCheck: configOnlyHealth('bird'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const r = await httpRequest(
      'https://rest.messagebird.com/messages',
      {
        method: 'POST',
        headers: { Authorization: 'AccessKey ' + cfg.access_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: [digits(phone)], originator: cfg.originator, body: message }),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    if (r.status === 201 && j?.id) return { ok: true, providerMessageId: String(j.id) }
    return { ok: false, errorCode: 'bird_' + r.status, errorMessage: String(j?.errors?.[0]?.description || '').slice(0, 200) }
  },
}

/* ------------------------------- ClickSend ---------------------------- */
const clicksend: SmsAdapter = {
  key: 'clicksend',
  validateConfig: requiredValidator('clicksend'),
  healthCheck: configOnlyHealth('clicksend'),
  checkBalance: noBalance,
  async sendSms(cfg, phone, message, timeoutMs) {
    const r = await httpRequest(
      'https://rest.clicksend.com/v3/sms/send',
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(cfg.username + ':' + cfg.api_key).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [{ to: phone, body: message, from: cfg.from, source: 'canlifal' }] }),
      },
      timeoutMs
    )
    if (r.status === 0) return netError(r)
    const j = parseJson(r.text)
    const m = j?.data?.messages?.[0]
    if (r.ok && m && String(m.status).toUpperCase() === 'SUCCESS') {
      return { ok: true, providerMessageId: String(m.message_id || '') }
    }
    return { ok: false, errorCode: 'clicksend_' + r.status, errorMessage: String(m?.status || j?.response_msg || '').slice(0, 200) }
  },
}

/* ------------------------------- kayıt defteri ------------------------ */

export const SMS_ADAPTERS: Record<string, SmsAdapter> = {
  netgsm,
  verimor,
  iletimerkezi,
  vatansms,
  mutlucell,
  mobildev,
  twilio,
  vonage,
  infobip,
  telnyx,
  plivo,
  sinch,
  bird,
  clicksend,
}

export function getAdapter(providerKey: string): SmsAdapter | null {
  return SMS_ADAPTERS[String(providerKey || '').toLowerCase().trim()] || null
}
