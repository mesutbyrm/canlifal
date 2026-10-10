/**
 * FCM push — saf testler (DB / ağ gerekmez).
 * Çalıştır: npx tsx scripts/test-fcm-payload.ts
 */
import crypto from 'crypto'
import { buildFcmMessage, channelForType, isHighPriority, loadServiceAccount, signServiceJwt } from '../lib/fcm'
import { pushProvider } from '../lib/push'

let pass = 0
let fail = 0
function check(name: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass++
  else fail++
  console.log(`  ${ok ? '✅' : '❌'} ${name} → ${JSON.stringify(actual)}${ok ? '' : ` (beklenen ${JSON.stringify(expected)})`}`)
}

// 1) Kanal eşlemesi — Flutter AppNotificationChannel.forType ile aynı tablo
const cases: [string, string][] = [
  ['message', 'canlifal_messages'],
  ['chat_message', 'canlifal_messages'],
  ['chat_mention', 'canlifal_social'],
  ['stream_live', 'canlifal_live'],
  ['co_broadcast_request', 'canlifal_live'],
  ['stream_auto_closed', 'canlifal_other'],
  ['stream_gift', 'canlifal_system'],
  ['pk_invite', 'canlifal_other'],
  ['like', 'canlifal_social'],
  ['follow', 'canlifal_social'],
  ['short_video_comment', 'canlifal_social'],
  ['payment_approved', 'canlifal_system'],
  ['cfc_payment_rejected', 'canlifal_system'],
  ['admin_announcement', 'canlifal_system'],
  ['moderation_warning', 'canlifal_system'],
  ['agency_invite', 'canlifal_system'],
  ['gift_received', 'canlifal_system'],
  ['dream_reminder', 'canlifal_daily_fortune'],
  ['session_request', 'canlifal_other'],
  ['achievement', 'canlifal_other'],
]
for (const [t, ch] of cases) check(`kanal ${t}`, channelForType(t), ch)

// 2) Öncelik: yalnız zamanı önemli olanlar HIGH
check('mesaj HIGH', isHighPriority('message'), true)
check('canlı yayın HIGH', isHighPriority('stream_live'), true)
check('pk daveti HIGH', isHighPriority('pk_invite'), true)
check('beğeni NORMAL', isHighPriority('like'), false)
check('başarım NORMAL', isHighPriority('achievement'), false)
check('urgent bayrağı HIGH', isHighPriority('achievement', true), true)

// 3) Mesaj gövdesi: notification + string data + kanal + etiket
const msg = buildFcmMessage({
  title: '✉️ Yeni Mesaj',
  body: 'Ayşe size bir mesaj gönderdi',
  type: 'message',
  targetPath: '/chat/u1',
  targetId: 'u1',
  notificationId: 'n42',
  data: { senderId: 'u1', streamId: undefined, count: 3 },
})
check('kanal alanı', msg.android.notification.channel_id, 'canlifal_messages')
check('DM etiketi gönderene göre', msg.android.notification.tag, 'dm:u1')
check('mesaj gizli görünürlük', msg.android.notification.visibility, 'PRIVATE')
check('öncelik', msg.android.priority, 'HIGH')
check('data string', Object.values(msg.data).every(v => typeof v === 'string'), true)
check('data alanları', [msg.data.type, msg.data.targetPath, msg.data.senderId, msg.data.count, msg.data.notificationId], ['message', '/chat/u1', 'u1', '3', 'n42'])
check('undefined alan yok', 'streamId' in msg.data, false)
check('token mesajda yok', 'token' in msg, false)

const social = buildFcmMessage({ title: 'Beğeni', body: 'x', type: 'like', notificationId: 'n7' })
check('sosyal NORMAL + etiket', [social.android.priority, social.android.notification.tag, social.android.notification.visibility], ['NORMAL', 'n:n7', 'PUBLIC'])

// 4) Servis hesabı okuma (base64 / json / ayrı alanlar) ve eksik yapılandırma
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const saJson = JSON.stringify({ project_id: 'canlifal-android', client_email: 'fcm@x.iam.gserviceaccount.com', private_key: pem })
check('base64', loadServiceAccount({ FCM_SERVICE_ACCOUNT_BASE64: Buffer.from(saJson).toString('base64') } as any)?.projectId, 'canlifal-android')
check('json', loadServiceAccount({ FCM_SERVICE_ACCOUNT_JSON: saJson } as any)?.clientEmail, 'fcm@x.iam.gserviceaccount.com')
check(
  'ayrı alanlar (\\n kaçışlı anahtar)',
  !!loadServiceAccount({ FIREBASE_PROJECT_ID: 'p', FIREBASE_CLIENT_EMAIL: 'e', FIREBASE_PRIVATE_KEY: pem.replace(/\n/g, '\\n') } as any)?.privateKey.includes('\n'),
  true
)
check('eksik → null', loadServiceAccount({} as any), null)
check('bozuk json → null', loadServiceAccount({ FCM_SERVICE_ACCOUNT_JSON: '{bozuk' } as any), null)

// 5) JWT: RS256 imzası açık anahtarla doğrulanır, doğru kapsam/hedef
const sa = loadServiceAccount({ FCM_SERVICE_ACCOUNT_JSON: saJson } as any)!
const jwt = signServiceJwt(sa, 1_700_000_000)
const [h, c, sig] = jwt.split('.')
const verify = crypto.createVerify('RSA-SHA256')
verify.update(`${h}.${c}`)
check('JWT imzası geçerli', verify.verify(publicKey, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')), true)
const claims = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
check('JWT kapsam/hedef/süre', [claims.scope, claims.aud, claims.exp - claims.iat], [
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://oauth2.googleapis.com/token',
  3600,
])

// 6) Kanal seçimi: açık değer her zaman kazanır; tanımsızsa FCM hazırsa fcm
const yes = () => true
const no = () => false
check('açık fcm', pushProvider({ PUSH_PROVIDER: 'fcm' } as any, no), 'fcm')
check('açık onesignal', pushProvider({ PUSH_PROVIDER: 'onesignal' } as any, yes), 'onesignal')
check('kapalı', pushProvider({ PUSH_PROVIDER: 'off' } as any, yes), 'off')
check('tanımsız + FCM hazır → fcm', pushProvider({} as any, yes), 'fcm')
check('tanımsız + FCM yok → geçici onesignal', pushProvider({} as any, no), 'onesignal')
check('bilinmeyen + FCM hazır → fcm', pushProvider({ PUSH_PROVIDER: 'xyz' } as any, yes), 'fcm')

console.log(`\n${pass} geçti, ${fail} kaldı`)
process.exit(fail ? 1 : 0)
