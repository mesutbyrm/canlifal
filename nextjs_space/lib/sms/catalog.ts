/**
 * lib/sms/catalog.ts — SMS sağlayıcı kataloğu.
 *
 * DÜRÜSTLÜK KURALI: Burada listelenen her alan, ilgili sağlayıcının GERÇEK
 * resmî dokümantasyonundan doğrulanmıştır. Dokümantasyonu doğrulanamayan
 * sağlayıcılar `implemented: false` ile işaretlenir ve gönderim denemesi
 * yapılmaz (sahte entegrasyon üretilmez).
 */

export type SmsFieldDef = {
  key: string
  label: string
  secret: boolean
  required: boolean
  type: 'text' | 'password' | 'textarea' | 'number'
  envName?: string
  placeholder?: string
  help?: string
}

export type SmsProviderMeta = {
  key: string
  displayName: string
  region: 'TR' | 'GLOBAL'
  /** Gerçek API entegrasyonu yazıldı mı? */
  implemented: boolean
  docsUrl: string
  endpoint: string
  supportsSms: boolean
  supportsOtp: boolean
  /** Bakiye sorgulama gerçek bir uç ile destekleniyor mu? */
  supportsBalance: boolean
  /** SMS göndermeden gerçek bir bağlantı/kimlik testi yapılabiliyor mu? */
  liveHealthCheck: boolean
  coverage: string
  fields: SmsFieldDef[]
  notes?: string
}

export const SMS_PROVIDERS: SmsProviderMeta[] = [
  {
    key: 'netgsm',
    displayName: 'Netgsm',
    region: 'TR',
    implemented: true,
    docsUrl: 'https://www.netgsm.com.tr/dokuman/',
    endpoint: 'GET https://api.netgsm.com.tr/sms/send/get',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Türkiye (yurt dışı için ayrı paket gerekir)',
    fields: [
      { key: 'username', label: 'Abone No / Kullanıcı Kodu', secret: false, required: true, type: 'text', envName: 'NETGSM_USERNAME', placeholder: '850XXXXXXX' },
      { key: 'password', label: 'Alt Kullanıcı Parolası', secret: true, required: true, type: 'password', envName: 'NETGSM_PASSWORD' },
      { key: 'header', label: 'Mesaj Başlığı (Gönderici)', secret: false, required: true, type: 'text', envName: 'NETGSM_HEADER', help: 'Netgsm panelinde onaylı başlık.' },
    ],
    notes: '01.11.2023 sonrası API yetkili ALT KULLANICI hesabı zorunludur. Bakiye sorgulama uç yanıt biçimi resmî dokümanda kullanıcıya özel olduğundan uygulanmadı.',
  },
  {
    key: 'verimor',
    displayName: 'Verimor',
    region: 'TR',
    implemented: true,
    docsUrl: 'https://github.com/verimor/SMS-API/blob/master/user_guide.md',
    endpoint: 'POST https://sms.verimor.com.tr/v2/send.json',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Türkiye',
    fields: [
      { key: 'username', label: 'Kullanıcı Adı (12 haneli numara)', secret: false, required: true, type: 'text', envName: 'VERIMOR_USERNAME' },
      { key: 'password', label: 'API Parolası', secret: true, required: true, type: 'password', envName: 'VERIMOR_PASSWORD' },
      { key: 'source_addr', label: 'Gönderici Başlığı (source_addr)', secret: false, required: true, type: 'text', envName: 'VERIMOR_SOURCE_ADDR' },
    ],
    notes: 'Sunucu IP adresinin Verimor OİM panelinde beyaz listeye alınması zorunludur; aksi halde 401 döner. OTP/bilgilendirme mesajları için is_commercial=false gönderilir.',
  },
  {
    key: 'iletimerkezi',
    displayName: 'İleti Merkezi',
    region: 'TR',
    implemented: true,
    docsUrl: 'https://www.iletimerkezi.com/docs/api/send-sms',
    endpoint: 'POST https://api.iletimerkezi.com/v1/send-sms/json',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: true,
    liveHealthCheck: true,
    coverage: 'Türkiye',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'ILETIMERKEZI_KEY' },
      { key: 'api_hash', label: 'API Hash', secret: true, required: true, type: 'password', envName: 'ILETIMERKEZI_HASH' },
      { key: 'sender', label: 'Gönderici Başlığı (max 11 karakter)', secret: false, required: true, type: 'text', envName: 'ILETIMERKEZI_SENDER' },
    ],
    notes: 'Panelde "API kullanımına izin ver" açık olmalıdır. OTP için iys="0" gönderilir (ticari değil). get-balance ucu SMS göndermeden bağlantı testi için kullanılır.',
  },
  {
    key: 'vatansms',
    displayName: 'VatanSMS',
    region: 'TR',
    implemented: true,
    docsUrl: 'https://docs.vatansms.net/rest-sms-api/1n-sms',
    endpoint: 'POST https://api.vatansms.net/api/v1/1toN',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Türkiye',
    fields: [
      { key: 'api_id', label: 'API ID', secret: true, required: true, type: 'password', envName: 'VATANSMS_API_ID' },
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'VATANSMS_API_KEY' },
      { key: 'sender', label: 'Gönderici Başlığı', secret: false, required: true, type: 'text', envName: 'VATANSMS_SENDER' },
    ],
    notes: 'message_type="turkce", message_content_type="bilgi" (OTP bilgilendirme mesajıdır). Numaralar 5XXXXXXXXX biçiminde gönderilir.',
  },
  {
    key: 'mutlucell',
    displayName: 'Mutlucell',
    region: 'TR',
    implemented: true,
    docsUrl: 'https://www.mutlucell.com.tr/api',
    endpoint: 'POST https://smsgw.mutlucell.com/smsgw-ws/sndblkex (XML)',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: true,
    liveHealthCheck: true,
    coverage: 'Türkiye',
    fields: [
      { key: 'username', label: 'Kullanıcı Adı (ka)', secret: false, required: true, type: 'text', envName: 'MUTLUCELL_USERNAME' },
      { key: 'password', label: 'Parola (pwd)', secret: true, required: true, type: 'password', envName: 'MUTLUCELL_PASSWORD' },
      { key: 'originator', label: 'Gönderici Başlığı (org)', secret: false, required: true, type: 'text', envName: 'MUTLUCELL_ORIGINATOR' },
    ],
    notes: 'XML tabanlı API. Bakiye sorgulama gtcrdtex ucu ile yapılır ve bağlantı testi olarak kullanılır (SMS gönderilmez).',
  },
  {
    key: 'mobildev',
    displayName: 'Mobildev',
    region: 'TR',
    implemented: false,
    docsUrl: 'https://www.mobildev.com/sms-api',
    endpoint: '—',
    supportsSms: false,
    supportsOtp: false,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Türkiye',
    fields: [],
    notes: 'Mobildev, HTTP/XML/JSON/SOAP entegrasyonları sunduğunu belirtiyor ancak uç nokta adresleri ve parametre şeması kurumsal sözleşme sonrası verilen özel dokümantasyonda. Herkese açık ve doğrulanabilir bir şema bulunamadığı için SAHTE entegrasyon yazılmadı. Katalogda kayıtlı, uygulanmadı.',
  },
  {
    key: 'twilio',
    displayName: 'Twilio',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://www.twilio.com/docs/sms/api',
    endpoint: 'POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global (Türkiye dahil; TR için alfanumerik başlık kısıtları geçerlidir)',
    fields: [
      { key: 'account_sid', label: 'Account SID', secret: false, required: true, type: 'text', envName: 'TWILIO_ACCOUNT_SID' },
      { key: 'auth_token', label: 'Auth Token', secret: true, required: true, type: 'password', envName: 'TWILIO_AUTH_TOKEN' },
      { key: 'from_number', label: 'Gönderici Numara / Alfanumerik', secret: false, required: true, type: 'text', envName: 'TWILIO_FROM_NUMBER' },
    ],
  },
  {
    key: 'vonage',
    displayName: 'Vonage (Nexmo)',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://developer.vonage.com/en/messaging/sms/technical-details',
    endpoint: 'POST https://rest.nexmo.com/sms/json',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'VONAGE_API_KEY' },
      { key: 'api_secret', label: 'API Secret', secret: true, required: true, type: 'password', envName: 'VONAGE_API_SECRET' },
      { key: 'from', label: 'Gönderici (from)', secret: false, required: true, type: 'text', envName: 'VONAGE_FROM' },
    ],
    notes: 'Legacy SMS API kullanılır. Yanıt gövdesinde messages[0].status = "0" başarı demektir; HTTP 200 tek başına başarı anlamına GELMEZ.',
  },
  {
    key: 'infobip',
    displayName: 'Infobip',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://www.infobip.com/docs/api/channels/sms/outbound-sms/send-sms-message',
    endpoint: 'POST https://{base_url}/sms/2/text/advanced',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'base_url', label: 'Base URL (hesaba özel alan adı)', secret: false, required: true, type: 'text', envName: 'INFOBIP_BASE_URL', placeholder: 'xxxxx.api.infobip.com' },
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'INFOBIP_API_KEY' },
      { key: 'sender', label: 'Gönderici (from)', secret: false, required: true, type: 'text', envName: 'INFOBIP_SENDER' },
    ],
    notes: 'Kimlik doğrulama başlığı: Authorization: App {apiKey}. Base URL her hesapta farklıdır.',
  },
  {
    key: 'telnyx',
    displayName: 'Telnyx',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://developers.telnyx.com/docs/messaging/messages/send-message',
    endpoint: 'POST https://api.telnyx.com/v2/messages',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'TELNYX_API_KEY' },
      { key: 'from', label: 'Gönderici Numara (E.164)', secret: false, required: true, type: 'text', envName: 'TELNYX_FROM' },
    ],
  },
  {
    key: 'plivo',
    displayName: 'Plivo',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://www.plivo.com/docs/messaging/api/overview',
    endpoint: 'POST https://api.plivo.com/v1/Account/{auth_id}/Message/',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: true,
    coverage: 'Global',
    fields: [
      { key: 'auth_id', label: 'Auth ID', secret: false, required: true, type: 'text', envName: 'PLIVO_AUTH_ID' },
      { key: 'auth_token', label: 'Auth Token', secret: true, required: true, type: 'password', envName: 'PLIVO_AUTH_TOKEN' },
      { key: 'src', label: 'Gönderici (src)', secret: false, required: true, type: 'text', envName: 'PLIVO_SRC' },
    ],
    notes: 'Bağlantı testi GET /v1/Account/{auth_id}/ ucu ile yapılır (SMS gönderilmez).',
  },
  {
    key: 'sinch',
    displayName: 'Sinch',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://developers.sinch.com/docs/sms/api-reference',
    endpoint: 'POST https://{region}.sms.api.sinch.com/xms/v1/{service_plan_id}/batches',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'service_plan_id', label: 'Service Plan ID', secret: false, required: true, type: 'text', envName: 'SINCH_SERVICE_PLAN_ID' },
      { key: 'api_token', label: 'API Token', secret: true, required: true, type: 'password', envName: 'SINCH_API_TOKEN' },
      { key: 'from', label: 'Gönderici (from)', secret: false, required: true, type: 'text', envName: 'SINCH_FROM' },
      { key: 'region', label: 'Bölge (us / eu / au ...)', secret: false, required: false, type: 'text', envName: 'SINCH_REGION', placeholder: 'eu' },
    ],
  },
  {
    key: 'bird',
    displayName: 'Bird (MessageBird)',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://developers.messagebird.com/api/sms-messaging/',
    endpoint: 'POST https://rest.messagebird.com/messages',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'access_key', label: 'Access Key', secret: true, required: true, type: 'password', envName: 'MESSAGEBIRD_ACCESS_KEY' },
      { key: 'originator', label: 'Gönderici (originator, max 11 karakter)', secret: false, required: true, type: 'text', envName: 'MESSAGEBIRD_ORIGINATOR' },
    ],
    notes: 'Kimlik doğrulama başlığı: Authorization: AccessKey {key}. Başarılı yanıt HTTP 201.',
  },
  {
    key: 'clicksend',
    displayName: 'ClickSend',
    region: 'GLOBAL',
    implemented: true,
    docsUrl: 'https://developers.clicksend.com/docs/',
    endpoint: 'POST https://rest.clicksend.com/v3/sms/send',
    supportsSms: true,
    supportsOtp: true,
    supportsBalance: false,
    liveHealthCheck: false,
    coverage: 'Global',
    fields: [
      { key: 'username', label: 'Kullanıcı Adı', secret: false, required: true, type: 'text', envName: 'CLICKSEND_USERNAME' },
      { key: 'api_key', label: 'API Key', secret: true, required: true, type: 'password', envName: 'CLICKSEND_API_KEY' },
      { key: 'from', label: 'Gönderici (from)', secret: false, required: false, type: 'text', envName: 'CLICKSEND_FROM' },
    ],
    notes: 'HTTP Basic Auth: kullanıcı adı + API key.',
  },
]

export function getProviderMeta(key: string): SmsProviderMeta | null {
  return SMS_PROVIDERS.find((p) => p.key === key) ?? null
}

export function listProviderKeys(): string[] {
  return SMS_PROVIDERS.map((p) => p.key)
}
