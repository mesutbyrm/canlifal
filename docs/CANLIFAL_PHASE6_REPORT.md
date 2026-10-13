# CANLIFAL — FAZ 6 RAPORU
## Defter Kapsamının Genişletilmesi + Rol/Yetki (RBAC) Katmanı

**Tarih:** 27 Ağustos 2026
**Kapsam:** Tamamı eklemeli (additive). Mevcut çalışan uçların davranışı değişmedi.

---

## 1. Özet

Faz 5'te kurulan değiştirilemez finansal defter (`LedgerEntry`) ve denetim kaydı (`AuditLog`) altyapısı,
bu fazda kalan yüksek öncelikli para akışlarına genişletildi. Ayrıca kod içine gömülü sabit rol
kontrolleri (`admin`, `yonetici`, `moderator`, `finans`) veritabanı tabanlı bir rol/yetki katmanıyla
**paralel** olarak desteklenmeye başlandı — eski kontroller aynen çalışmaya devam ediyor.

---

## 2. Defter entegrasyonu eklenen uçlar

| Uç | Kategori | Bacaklar |
|---|---|---|
| `POST /api/live/gift/send` (yayın dalı) | `gift_send` | gönderen ↓ / yayıncı ↑ / platform ↑ |
| `POST /api/live/gift/send` (sesli oda dalı) | `gift_send` | gönderen ↓ / alıcı ↑ / oda sahibi ↑ / platform ↑ |
| `POST /api/chat/rooms/[roomId]/gifts` | `gift_send` | gönderen ↓ / alıcı ↑ / oda sahibi ↑ / platform ↑ |
| `POST /api/video-streams/[streamId]/gifts` | `gift_send` | gönderen ↓ / yayıncı ↑ / platform ↑ |
| `PATCH /api/room/[sessionId]` (`end`) | `fortune_session` | kullanıcı ↓ / falcı ↑ / platform ↑ |
| `POST /api/room/[sessionId]/tip` | `tip` | kullanıcı ↓ / falcı ↑ / platform ↑ |
| `POST /api/memberships/purchase` | `membership` | kullanıcı ↓ / platform ↑ (+ bonus jeton için ters kayıt) |
| `POST /api/jeton` (`daily_login`) | `daily_bonus` | platform ↓ / kullanıcı ↑ (CFC) |

Faz 5'te zaten kapsanmış olanlarla birlikte defter kapsamı **4 → 11 para akışına** çıktı.

### Davranış garantileri
- Tüm defter yazımları **ateşle-unut** (`fire-and-forget`): `.catch()` ile yakalanır, ana akışı asla kesmez.
- `recordLedger` / `recordMultiLeg` içeride de asla `throw` etmez.
- Personel (`isStaff`) ve finanstan muaf kullanıcılar (`isExcludedFromFinance`) için defter kaydı **oluşturulmaz** — mevcut bakiye mantığıyla birebir tutarlı.
- Hiçbir tutar hesabı, komisyon oranı veya bakiye güncellemesi değiştirilmedi.

---

## 3. Rol & Yetki (RBAC) katmanı

### Yeni veri modelleri (eklemeli, veritabanına yazıldı)

| Model | Tablo | Amaç |
|---|---|---|
| `Role` | `roles` | key (unique), name, description, level, isSystem |
| `Permission` | `permissions` | key (unique), name, group |
| `RolePermission` | `role_permissions` | rol↔yetki bağı, `@@unique([roleId, permissionId])` |

### Yeni dosya: `lib/permissions.ts`
- `PERMISSIONS` — 19 yetki tanımı, 4 grup: **finans**, **içerik**, **moderasyon**, **sistem**
- `SYSTEM_ROLES` — mevcut davranışı birebir yansıtan yedek matris
- `hasPermission(roleKey, permissionKey)` — önce veritabanı (60 sn önbellek), yoksa sabit matris
- `getRolePermissions`, `listRoles`, `setRolePermissions`
- **Geriye uyumluluk:** `admin` ve `yonetici` her koşulda tam erişimli kalır; veritabanında rol satırı yoksa eski sabit matrise düşülür, yani eksik seed kimseyi kilitleyemez.

### Seed (veritabanına yazıldı)
| Rol | Seviye | Yetki sayısı |
|---|---|---|
| `admin` | 100 | 19 |
| `yonetici` | 100 | 19 |
| `finans` | 60 | 7 |
| `moderator` | 40 | 5 |

Seed betiği: `scripts/seed-rbac.ts` (tamamen `upsert` — tekrar çalıştırılabilir, veri silmez).

### Yeni uçlar
| Uç | Açıklama |
|---|---|
| `GET /api/admin/roles` | Roller + yetki kataloğu |
| `POST /api/admin/roles` | Yeni rol oluştur |
| `PATCH /api/admin/roles/[roleId]` | Rol bilgisi ve/veya yetkilerini güncelle |
| `DELETE /api/admin/roles/[roleId]` | Sistem dışı rolleri sil |

Rol oluşturma/güncelleme/silme işlemleri denetim kaydına yazılır (`role_create`, `role_update`, `role_delete`) — öncesi/sonrası yetki listesiyle birlikte.

### Yeni yönetim arayüzü
`/[lang]/admin/roles` — solda rol listesi, sağda gruplara ayrılmış yetki matrisi (tıkla-aç/kapa + kaydet).
Yönetim panelinin "⚙️ Görünüm & Ayarlar" grubuna **🔐 Rol & Yetki** bağlantısı eklendi.

---

## 4. Envanter değişimi

| Ölçüt | Faz 5 sonu | Faz 6 sonu |
|---|---|---|
| Handler | 748 | **752** |
| Benzersiz yol | 480 | **482** |
| Kategori | 156 | **157** |
| Veri modeli | 200 | **203** |

`backend-docs/{endpoints_index.json, openapi.json, postman_collection.json, ENDPOINTS.md}` yeniden üretildi.

---

## 5. Doğrulama durumu

| Kontrol | Sonuç |
|---|---|
| Tip kontrolü (`tsc --noEmit`) | ✅ Geçti |
| Üretim derlemesi | ✅ Geçti |
| Geliştirme sunucusu ayağa kalkışı | ✅ Geçti |
| Kontrol noktası | ✅ "Phase 6: ledger expansion + RBAC roles" |
| Canlı uçtan uca defter/RBAC testi | ⚠️ **Yapılmadı** |

> Defter yazımları ateşle-unut olduğu için bir hata ana para akışını kesmez; yine de gerçek trafikte
> `ledger_entries` tablosuna kayıt düştüğü henüz canlı olarak doğrulanmadı.

Dağıtım (deploy) **yapılmadı** — değişiklikler yalnızca kontrol noktasında.

---

## 6. Değiştirilen / eklenen dosyalar

**Yeni**
- `lib/permissions.ts`
- `scripts/seed-rbac.ts`
- `app/api/admin/roles/route.ts`
- `app/api/admin/roles/[roleId]/route.ts`
- `app/[lang]/admin/roles/page.tsx`
- `docs/CANLIFAL_PHASE6_REPORT.md`

**Düzenlenen (yalnızca ekleme)**
- `prisma/schema.prisma` (+3 model)
- `app/api/live/gift/send/route.ts`
- `app/api/chat/rooms/[roomId]/gifts/route.ts`
- `app/api/video-streams/[streamId]/gifts/route.ts`
- `app/api/room/[sessionId]/route.ts`
- `app/api/room/[sessionId]/tip/route.ts`
- `app/api/memberships/purchase/route.ts`
- `app/api/jeton/route.ts`
- `app/[lang]/admin/page.tsx` (yeni bağlantı)
