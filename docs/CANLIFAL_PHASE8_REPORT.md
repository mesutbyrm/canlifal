# CANLIFAL — FAZ 8 RAPORU
## Efekt Entegrasyonu + Takım Puanlama + İdempotency Genişletme + Bootstrap Uç

**Tarih:** 27 Ağustos 2026
**Kapsam:** Tamamı eklemeli (additive). Mevcut çalışan uçların davranışı değişmedi.

---

## 1. Özet

Faz 7'de oluşturulan `EffectRule`, `Team`/`TeamMember` ve `SupporterLevel` modellerini canlı
davranışa bağlayan entegrasyon fazıdır. Ayrıca idempotency kapsamı iki yeni finansal uca
genişletildi ve mobil/web istemcilerin açılışta yaptığı 5-8 isteği tek bir uca indiren
bootstrap ucu eklendi.

---

## 2. Efekt çözümleme ucu

| Uç | Açıklama |
|---|---|
| `GET /api/effects/resolve` | Kimlik doğrulanmış kullanıcının seviye, destekçi seviyesi, üyelik ve toplam harcamasına göre hak ettiği kozmetik efektleri döndürür |

**Sorgu parametreleri:**
- `?broadcasterId=xxx` — belirli bir yayıncı için destekçi seviyesi bağlamı

**Yanıt:** `{ effects: [...], context: { level, supporterLevel, membershipTier, totalSpent } }`

Bu uç, istemcilerin (web veya mobil) profil sayfasında, oda girişinde veya sohbet ekranında
kullanıcının hak ettiği efektleri çözümlemesine olanak tanır. `lib/effect-rules.ts`
(`resolveEffects`) üçünde 60 sn cache ile çalışır.

---

## 3. Takım puan biriktirme

`lib/team-points.ts` — `recordTeamPoints(userId, amount)` fonksiyonu:
- Kullanıcının aktif takım üyeliğini bulur
- Atomik $transaction ile hem `TeamMember.points` hem `Team.totalPoints` artırır
- Takım üyeliği yoksa sessizce atlanır
- Asla throw etmez (fire-and-forget)

**Bağlanan uçlar (ateşle-unut, `recordContribution`’ın hemen ardına):**

| Uç | Puan kaynağı |
|---|---|
| `POST /api/live/gift/send` (yayın dalı) | totalPrice |
| `POST /api/live/gift/send` (sesli oda dalı) | totalPrice |
| `POST /api/chat/rooms/[roomId]/gifts` | price |
| `POST /api/video-streams/[streamId]/gifts` | totalPrice |
| `POST /api/room/[sessionId]/tip` | amount |

Mevcut para/komisyon mantığı DEĞİŞMEDİ.

---

## 4. İdempotency genişletme

Faz 4'te yalnızca `POST /api/withdrawals` ve `POST /api/payments/requests` için olan
idempotency koruması iki yeni finansal uca eklendi:

| Uç | Kapsam | Davranış |
|---|---|---|
| `POST /api/room/[sessionId]/tip` | `tip` | Validasyondan sonra, $transaction’dan önce |
| `POST /api/memberships/purchase` | `membership_purchase` | Validasyondan sonra, ödeme düşümünden önce |

**Toplam idempotent uç:** 2 → **4**

`Idempotency-Key` header’ı yoksa hiçbir şey değişmez — eski istemciler etkilenmez.

---

## 5. Bootstrap ucu

| Uç | Açıklama |
|---|---|
| `GET /api/v1/bootstrap` | Tek istekte: feature flag’lar + remote config + platform ayarları + kullanıcı özeti (auth varsa) |

**Sorgu parametreleri:** `?platform=ios|android|web|mobile`

**İçerik:**
- `featureFlags[]` — bayrak listesi (60sn cache)
- `remoteConfigs[]` — uzak yapılandırma (60sn cache)
- `platformSettings{}` — jeton kuru, dakika ücreti, komisyon, çekim limitleri (120sn cache)
- `user{}` — profil özeti + okunmamış bildirim sayısı (yalnızca auth varsa)

İstemcinin açılışta yaptığı **5-8 ayrı istek tek uca** indi. Mevcut `/api/config` ucu
geriye dönük uyumluluk için korunuyor.

---

## 6. Yeni dosyalar

| Dosya | Amaç |
|---|---|
| `lib/team-points.ts` | Takım puan biriktirme yardımcısı |
| `app/api/effects/resolve/route.ts` | Efekt çözümleme API'si |
| `app/api/v1/bootstrap/route.ts` | Birleşik açılış verisi |

---

## 7. Envanter değişimi

| Metrik | Faz 7 sonu | Faz 8 sonu |
|---|---|---|
| Handler | 771 | **773** |
| Path | 493 | **495** |
| Kategori | 164 | **166** |
| Model | 213 | **213** (değişmedi) |

---

## 8. Doğrulama durumu

| Kontrol | Durum |
|---|---|
| Tip kontrolü (tsc) | ✅ Geçti |
| Derleme (build) | ✅ Geçti |
| Checkpoint | ✅ Kaydedildi |
| Canlı uçtan uca test | ❌ Yapılmadı |
| Production deploy | ❌ Yapılmadı |

---

## 9. §89 Release Gate güncelleme

| # | Kontrol | Faz 1 | Faz 8 |
|---|---|---|---|
| 7 | RBAC merkezi | ❌ | ✅ (Faz 6) |
| 8 | Feature flag | ⚠️ 8 anahtar | ✅ 12 bayrak + CRUD (Faz 2) |
| 9 | Remote config | ❌ | ✅ 7 config + CRUD (Faz 2) |
| 10 | Bootstrap ucu | ❌ | ✅ `GET /api/v1/bootstrap` (Faz 8) |
| 12 | Idempotency | ❌ 4 uç | ⚠️ **4 uç** (withdrawals, payments, tip, membership) |
| 15 | Değiştirilemez ledger | ❌ | ✅ 11 para akışı (Faz 5+6) |
| 16 | Audit log | ❌ | ✅ (Faz 5) |
| 18 | Tek push provider | ❌ | ✅ OneSignal kanonik (Faz 7) |
