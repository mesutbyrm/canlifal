# CanlıFal — Özellik Bayrakları (Feature Flags) Dokümantasyonu

> **§7 — Spec Referansı:** Feature Flags
>
> Son güncelleme: 2026-08-27

---

## 1. Genel Bakış

Özellik bayrakları, platform özelliklerinin admin panelinden açılıp kapatılmasını sağlar. Bayraklar veritabanında (`FeatureFlag` modeli) tutulur ve 30 saniyelik önbellekle sunulur.

**Önemli kural:** Veritabanında olmayan bir bayrak varsayılan olarak **açık** kabul edilir (mevcut çalışan özelliklerin bozulmaması için).

---

## 2. Mevcut Bayraklar

| Anahtar | Varsayılan | Açıklama | Korunan Uçlar |
|---------|:----------:|----------|---------------|
| `PHONE_LOGIN_ENABLED` | ❌ kapalı | Telefon + OTP ile giriş | Auth uçları |
| `LIVE_ENABLED` | ✅ açık | Canlı yayın özelliği | `POST /api/video-streams` |
| `VOICE_ROOM_ENABLED` | ✅ açık | Sesli sohbet odaları | `POST /api/chat/rooms/create` |
| `PK_ENABLED` | ✅ açık | PK / battle sistemi | `POST /api/chat/rooms/[roomId]/pk`, `POST /api/video-streams/pk`, `POST /api/live/pk` |
| `GIFTS_ENABLED` | ✅ açık | Hediye gönderme | `POST /api/chat/rooms/[roomId]/gifts`, `POST /api/live/gift/send` |
| `WITHDRAWAL_ENABLED` | ✅ açık | Para çekme | `POST /api/withdrawals` |
| `AGENCY_ENABLED` | ✅ açık | Ajans sistemi | `POST /api/agency/apply`, `POST /api/agency/join` |
| `TOURNAMENT_ENABLED` | ✅ açık | Turnuva sistemi | Turnuva uçları |
| `LOCATION_ENABLED` | ❌ kapalı | Yakın mesafe / konum özelliği | Konum uçları |
| `VERIFICATION_ENABLED` | ❌ kapalı | Profil doğrulama (mavi tik) | Doğrulama uçları |
| `MULTI_ACCOUNT_ENABLED` | ❌ kapalı | Çoklu hesap (max 5) | Hesap uçları |
| `DISCOVER_ENABLED` | ✅ açık | Keşfet / explore sayfası | Keşfet uçları |

---

## 3. FeatureFlag Modeli

```
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  enabled     Boolean  @default(true)
  description String?
  platform    String?  // null=tümü, 'web', 'mobile', 'ios', 'android'
  percentage  Int?     // Kademeli yayılım (0-100%)
  metadata    Json?    // Ek ayarlar
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 4. API Uçları

### 4.1 Genel (Public)

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/config` | Yok | Tüm bayraklar + uzak yapılandırma (60sn cache) |
| GET | `/api/v1/bootstrap` | Evet | Bayraklar + yapılandırma + kullanıcı bilgisi tek istekte |

**`/api/config` filtresi:** `?platform=android` → sadece `platform=null` veya `platform=android` kayıtlar döner.

### 4.2 Admin

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/admin/feature-flags` | isAdminRole | Tüm bayrakları listele |
| POST | `/api/admin/feature-flags` | isAdminRole | Yeni bayrak oluştur |
| PATCH | `/api/admin/feature-flags/[flagId]` | isAdminRole | Bayrak güncelle |
| DELETE | `/api/admin/feature-flags/[flagId]` | isAdminRole | Bayrak sil |

---

## 5. Kullanım (Backend)

```typescript
import { isFeatureEnabled, requireFeature } from '@/lib/check-feature'

// Boolean kontrol
if (await isFeatureEnabled('GIFTS_ENABLED')) { ... }

// Guard (kapalıysa 403 döner)
const blocked = await requireFeature('PK_ENABLED')
if (blocked) return blocked  // NextResponse 403
```

---

## 6. Flutter Entegrasyonu

1. Uygulama açılışında `GET /api/v1/bootstrap` çağır → `featureFlags` dizisi al
2. `platform` parametresi ile filtreleme: `?platform=android`
3. Her flag'i yerel state'e kaydet
4. UI elementlerini bayrak durumuna göre göster/gizle
5. **Asla hard-code flag kullanma** — tüm değerler backend'den gelecek
6. Bayrak kapalıysa 403 yanıtı: `{success:false, error:{code:'FEATURE_DISABLED', message:'Bu özellik şu an kullanılamıyor'}}`

---

## 7. Önbellek

- **Sunucu tarafı:** 30 saniyelik TTL (`getCached` ile)
- **Admin değişikliği:** En fazla 30 saniye içinde tüm istemcilere yansır
- **İstemci tarafı:** Bootstrap yanıtı uygulama oturumu boyunca geçerli; yeni oturum veya arka plandan dönüşte yenilenmeli

---

## 8. Admin Paneli

**URL:** `/admin/feature-config`

- Bayrakları toggle ile açma/kapatma
- Yeni bayrak oluşturma
- Platform filtresi ve yüzdelik yayılım ayarı
- Uzak yapılandırma JSON editörü (aynı sayfada)
