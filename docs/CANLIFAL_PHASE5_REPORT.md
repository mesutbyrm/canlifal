# CANLIFAL — FAZ 5 RAPORU
## Değiştirilemez Finansal Defter (Ledger) + Denetim Kaydı (AuditLog)

Tarih: 2026-08-27  
Kapsam: Eklemeli (additive). Mevcut hiçbir uç kaldırılmadı, mevcut istek/yanıt sözleşmeleri değiştirilmedi.

---

## 1. Neden bu faz?

| Sorun | Mevcut durum |
|---|---|
| Para hareketleri dağınık | `CreditTransaction`, `JetonTransaction`, `RoomRevenueLog`, `AgencyEarning` — 4 farklı tablo, farklı yapılar |
| Değiştirilebilir kayıtlar | Mevcut transaction tabloları UPDATE/DELETE yapabilir — denetlenemez |
| Bakiye uyuşmazlığı | Bakiye farkı çıktığında kaynağı tespit etmek mümkün değil |
| Admin işlem denetimi | Admin işlemleri (bakiye ekleme, ban, ödeme onayı) hiçbir yere kaydedilmiyor |

Bu faz her iki eksiği de **değiştirilemez (immutable), sadece ekleme (append-only)** modellere taşıdı.

---

## 2. Yeni dosyalar

| Dosya | İçerik |
|---|---|
| `lib/ledger.ts` | `recordLedger` (çift taraflı giriş), `recordMultiLeg` (çok bacaklı giriş), `getAccountLedger`, `getTransaction`. Asla throw etmez. |
| `lib/audit-log.ts` | `recordAudit`, `getAuditIp`, `getAuditLogs`. Asla throw etmez. |
| `app/api/admin/audit-logs/route.ts` | `GET /api/admin/audit-logs` — sayfalanmış denetim kaydı |
| `app/api/admin/ledger/route.ts` | `GET /api/admin/ledger` — sayfalanmış defter sorgusu + istatistik |
| `app/[lang]/admin/audit/page.tsx` | Admin UI: Denetim Kaydı + Finansal Defter (iki sekmeli sayfa) |

---

## 3. Şema değişiklikleri (eklemeli)

### 3.1 `LedgerEntry` (`ledger_entries`)

Çift kayıt defteri mantığı. Her finansal hareket en az iki giriş oluşturur (debit + credit), aynı `transactionId` ile gruplandırılır.

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | String (cuid) | PK |
| `transactionId` | String | Debit+Credit çiftini gruplar |
| `accountType` | String | `user_jeton`, `user_cfc`, `platform_jeton`, `platform_cfc`, `agency_jeton`, `teller_earning` |
| `accountId` | String | userId, agencyId veya `"PLATFORM"` |
| `direction` | String | `debit` veya `credit` |
| `amount` | Int | Her zaman pozitif; yön `direction` ile belirlenir |
| `currency` | String | `jeton`, `cfc`, `tl` |
| `balanceBefore` | Int | İşlemden önceki bakiye (en iyi çaba) |
| `balanceAfter` | Int | İşlemden sonraki bakiye (en iyi çaba) |
| `category` | String | `gift_send`, `withdrawal`, `admin_adjust`, `purchase`, vb. (21 kategori) |
| `description` | String? | Açıklama |
| `referenceType` | String? | Kaynak model adı |
| `referenceId` | String? | Kaynak kayıt ID |
| `metadata` | Json? | Ek bağlam |
| `actorId` | String? | İşlemi başlatan kişi |
| `createdAt` | DateTime | Oluşturulma zamanı |

İndeksler: `transactionId`, `(accountType, accountId)`, `(accountId, createdAt)`, `category`, `(referenceType, referenceId)`, `createdAt`.

### 3.2 `AuditLog` (`audit_logs`)

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | String (cuid) | PK |
| `actorId` | String | İşlemi yapan admin/sistem |
| `actorRole` | String? | Rol |
| `actorIp` | String? | IP adresi |
| `action` | String | `balance_adjust`, `withdrawal_approve`, `feature_toggle`, vb. |
| `targetType` | String? | Etkilenen model |
| `targetId` | String? | Etkilenen kayıt ID |
| `before` | Json? | Değişiklikten önceki durum |
| `after` | Json? | Değişiklikten sonraki durum |
| `description` | String? | Açıklama |
| `metadata` | Json? | Ek bağlam |
| `createdAt` | DateTime | Oluşturulma zamanı |

İndeksler: `actorId`, `action`, `(targetType, targetId)`, `createdAt`.

Her iki model de **sadece ekleme**: uygulama kodunda UPDATE veya DELETE işlemi yoktur.

---

## 4. Ledger entegrasyonu eklenen uçlar

| Uç | Kategori | Açıklama |
|---|---|---|
| `POST /api/gifts/send` (hediye tipi) | `gift_send` | Hediye gönderiminde sender→receiver veya sender→platform |
| `POST /api/gifts/send` (jeton transfer) | `gift_send` | Jeton transferinde sender→receiver |
| `POST /api/withdrawals` | `withdrawal` | Para çekme talebinde user→platform |
| `POST /api/admin/credits` | `admin_adjust` | Admin bakiye düzenleme (ekleme veya düşme) |

Tüm ledger yazmaları **fire-and-forget** (`.catch()` ile yakalanmış): başarısız olursa ana iş mantığını kesintiye uğratmaz.

---

## 5. Audit log entegrasyonu eklenen uçlar

| Uç | Aksiyon |
|---|---|
| `POST /api/admin/credits` | `balance_adjust` |
| `PATCH /api/admin/withdrawals` | `withdrawal_approve` / `withdrawal_reject` / `withdrawal_complete` |
| `PATCH /api/admin/feature-flags/[flagId]` | `feature_toggle` |
| `DELETE /api/admin/feature-flags/[flagId]` | `feature_delete` |

Tüm audit yazmaları da fire-and-forget.

---

## 6. Admin UI

Yeni sayfa: `/admin/audit` — iki sekmeli:

1. **Denetim Kaydı**: İşlem türüne göre filtreleme, sayfalanmış tablo (tarih, işlem, aktör, hedef, açıklama)
2. **Finansal Defter**: Hesap ID ve kategoriye göre filtreleme, toplam kayıt sayısı, sayfalanmış tablo (tarih, TX, hesap, tutar, kategori, önceki/sonraki bakiye, açıklama)

Admin paneli ana sayfasına "🛡️ Denetim & Defter" linki eklendi.

---

## 7. Geriye dönük uyumluluk

| Konu | Durum |
|---|---|
| Mevcut uçlar değişti mi? | Hayır — mevcut istek/yanıt gövdeleri aynı |
| Mevcut tablolar değişti mi? | Hayır — sadece 2 yeni tablo eklendi |
| Eski Flutter APK etkilenir mi? | Hayır |
| Mevcut `JetonTransaction` / `CreditTransaction` | Dokunulmadı — paralel yazma, kademeli geçiş |
| Yeni uç sayısı | +2 (audit-logs GET, ledger GET) → toplam 748 handler / 480 path |

---

## 8. Doğrulama

| Kontrol | Sonuç |
|---|---|
| Tip kontrolü (`tsc --noEmit`) | ✅ Hatasız |
| Üretim derlemesi | ✅ Başarılı |
| Geliştirme sunucusu | ✅ |
| Şema DB'ye uygulandı | ✅ |
| Endpoint dokümanları güncellendi | ✅ (748/480) |
| Checkpoint | ✅ |

> Canlı ledger/audit yazma **uçtan uca test edilmedi** — fire-and-forget yapısı olduğu için hatalı bile olsa ana akışı kesmez. Derleme ve kod incelemesi yapıldı.

---

## 9. Faz 6 önerisi — Daha fazla Ledger entegrasyonu + Role/Permission modeli

### 9.1 Ledger kapsamını genişletme

Faz 5'te 4 kritik uç entegre edildi. Kalan yüksek öncelikli uçlar:

| Uç | Kategori |
|---|---|
| `POST /api/live/gift/send` | Canlı yayın hediye gönderme |
| `POST /api/chat/rooms/[roomId]/gifts` | Sesli oda hediye gönderme |
| `POST /api/video-streams/[streamId]/gifts` | Video yayın hediye |
| `PATCH /api/room/[sessionId]` (end) | Fal oturumu kapanışı |
| `POST /api/room/[sessionId]/tip` | Falcıya bahşiş |
| `POST /api/jeton` (purchase) | Jeton satın alma |
| `POST /api/memberships/purchase` | Üyelik satın alma |

### 9.2 Role/Permission modeli

Faz 1'de eksik olduğu belirlenen `Role`, `Permission`, `RolePermission` modelleri. Şu anda roller sabit string olarak kodda geçiyor (`admin`, `yonetici`, `moderator`, `finans`). Bunların veritabanında yönetilen bir RBAC yapısına taşınması önerilir.

Devam edilsin mi?
