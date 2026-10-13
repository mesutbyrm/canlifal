# CanlıFal — Uzak Yapılandırma (Remote Config) Dokümantasyonu

> **§8 — Spec Referansı:** Remote Config
>
> Son güncelleme: 2026-08-27

---

## 1. Genel Bakış

Uzak yapılandırma, platform ayarlarının admin panelinden dinamik olarak yönetilmesini sağlar. Yapılandırma verileri veritabanında (`RemoteConfig` modeli) JSON değer olarak tutulur.

---

## 2. RemoteConfig Modeli

```
model RemoteConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  valueType   String?  // json, string, number, boolean
  group       String?  // Gruplama anahtarı
  description String?
  platform    String?  // null=tümü, 'web', 'mobile'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 3. Mevcut Yapılandırma Kayıtları

| Anahtar | Grup | Varsayılan Değer | Açıklama |
|---------|------|-----------------|----------|
| `level_thresholds` | levels | `{maxLevel:100, xpPerLevel:1000}` | Seviye eşikleri (XP) |
| `pk_durations` | pk | `{options:[60,120,180,300], default:120}` | PK süresi seçenekleri (saniye) |
| `gift_combo_windows` | gifts | `{'1x':0, '10x':5000, '50x':3000, '100x':2000}` | Combo pencere süreleri (ms) |
| `leaderboard_periods` | leaderboard | `['hourly','daily','weekly','monthly','seasonal']` | Liderlik tablosu dönemleri |
| `withdrawal_limits` | wallet | `{minAmount:100, maxDaily:10000, cooldownHours:24}` | Para çekme limitleri (TL) |
| `room_capacity` | rooms | `{free:15, normal:100, vip:500}` | Oda kapasite limitleri |
| `rate_limits` | general | `{chat_message:5, gift_send:10, api_default:60}` | Varsayılan rate limitler (/dk) |
| `risk_rules` | security | (opsiyonel) | Risk skorlama kuralları / ağırlıkları |

### Ek Platform Ayarları (PlatformSettings tablosu)

Bazı ayarlar ayrıca `PlatformSettings` tablosunda key-value olarak tutulur:

| Anahtar | Varsayılan | Açıklama |
|---------|-----------|----------|
| `credits_per_minute` | 10 | Fal seansı dakika başı kredi |
| `jeton_tl_rate` | 0.5 | Jeton → TL dönüşüm oranı |
| `vr_gift_receiver_percent` | 70 | Sesli oda hediye alıcı payı (%) |
| `vr_room_owner_percent` | 30 | Sesli oda sahibi payı (%) |
| `vr_site_commission_percent` | 50 | Sesli oda platform komisyonu (%) |
| `daily_login_jeton` | 5 | Günlük giriş bonusu (jeton) |

---

## 4. API Uçları

### 4.1 Genel (Public)

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/config` | Yok | Feature flags + remote configs birlikte (60sn cache) |
| GET | `/api/v1/bootstrap` | Evet | Flags + configs + platformSettings + user özeti |

### 4.2 Admin

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/admin/remote-config` | isAdminRole | Tüm yapılandırmaları listele |
| POST | `/api/admin/remote-config` | isAdminRole | Yeni yapılandırma oluştur |
| PATCH | `/api/admin/remote-config/[configId]` | isAdminRole | Yapılandırma güncelle |
| DELETE | `/api/admin/remote-config/[configId]` | isAdminRole | Yapılandırma sil |

---

## 5. Kullanım (Backend)

```typescript
import { getCached } from '@/lib/cache'
import prisma from '@/lib/db'

// Direkt okuma (cache ile)
const config = await getCached('remote:withdrawal_limits', 60, async () => {
  const rc = await prisma.remoteConfig.findUnique({ where: { key: 'withdrawal_limits' } })
  return rc?.value ?? { minAmount: 100, maxDaily: 10000, cooldownHours: 24 }
})
```

### Risk Kuralları Ezme

`lib/risk-score.ts` içinde `risk_rules` anahtarı ile risk skorlama ağırlıkları ezilebilir:

```typescript
const rules = await getCached('risk_rules', 60, async () => {
  const rc = await prisma.remoteConfig.findUnique({ where: { key: 'risk_rules' } })
  return rc?.value ?? DEFAULT_RISK_RULES
})
```

---

## 6. Flutter Entegrasyonu

1. `GET /api/v1/bootstrap` → `remoteConfigs` dizisi
2. Her config `{key, value, group}` şeklinde döner
3. Platform filtresi: `?platform=android`
4. Değerler JSON — Flutter tarafında `jsonDecode` ile parse edilir
5. Önbellek: Uygulama oturumu boyunca geçerli, arka plandan dönüşte yenile

---

## 7. Admin Paneli

**URL:** `/admin/feature-config` (Feature Flags ile aynı sayfada)

- JSON editör ile değer düzenleme
- Grup bazlı filtreleme
- Yeni yapılandırma oluşturma
- Platform hedefleme
