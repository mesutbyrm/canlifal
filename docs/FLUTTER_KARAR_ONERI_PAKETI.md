# Flutter ↔ Backend: Onay Bekleyen Kararlar (Öneri Paketi)

Bu doküman, hiçbir kodu değiştirmeden, eksik kalan ve **onay gerektiren** uçlar için Flutter sözleşmesini, backend'deki yakın karşılıkları ve önerilen yaklaşımı özetler. Uygulama yalnızca onay sonrası yapılır.

Kaynak: `mesutbyrm/Cursor-Flutter-` → `mobile/lib/core/network/api_endpoints.dart` ve ilgili data kaynakları.

---

## 1. Cosmetic envanteri (`/api/user/cosmetics*`)

**Flutter:** envanter listesi, `equip`, `loadout` ve `profile/cosmetics/equip` uçları bekleniyor.

**Backend'deki durum:**
- `User` üzerinde yalnızca **seçim** alanları var: `nameEffect`, `entranceEffectId`, `profileFrameId`. Sahiplik (kullanıcının neye sahip olduğu) hiçbir yerde tutulmuyor.
- Katalog modelleri mevcut: `avatar-accessories`, `name-effects`, `profile-frames`, `chat-bubbles`, `mic-frames`, `entrance-effects`.

**Risk:** Sahiplik kontrolü olmadan "equip" yazmak, kullanıcının sahip olmadığı bir cosmetic'i takmasına izin verir.

**Öneri (onay gerekli):**
```
model UserCosmetic {
  id        String   @id @default(cuid())
  userId    String
  kind      String   // profile_frame | name_effect | entrance_effect | chat_bubble | mic_frame | avatar_accessory
  itemId    String   // ilgili katalog kaydının id/key'i
  source    String   // purchase | admin_grant | event
  grantedById String?
  createdAt DateTime @default(now())
  @@unique([userId, kind, itemId])
  @@index([userId])
  @@map("user_cosmetics")
}
```
- `equip` yalnızca `UserCosmetic` kaydı olan öğeyi kabul eder; aksi halde 403.
- Mevcut seçim alanları korunur; equip bunları günceller.
- Yeni tablo, üretim veritabanında **migrasyon** gerektirir.

**Karar:** Yeni tablo + migrasyon onaylansın mı? (Alternatif: yalnızca seçim uçları, sahiplik kontrolü olmadan — önerilmez.)

---

## 2. Cüzdan transferi (`POST /api/wallet/transfer`)

**Flutter:** `recipient`, `currency` (wire), `amount` gönderiyor; `GET` ile geçmiş de çekiliyor.

**Backend'deki durum:** `app/api/wallet/route.ts` mevcut (bakiye/geçmiş). `transfer` alt yolu yok.

**Risk:** Para hareketi. Çift harcama, yetersiz bakiye, kendine transfer, birim (jeton/CFC) ve komisyon kuralları tanımlı değil.

**Öneri (onay gerekli):**
- Atomik transaction + `LedgerEntry` kaydı (mevcut muhasebe kalıbı), bakiye kilidi.
- Komisyon oranı `jeton-pricing` / mevcut ayarlardan okunur; uydurulmaz.
- Alıcı doğrulaması: var olan, banlı olmayan kullanıcı.

**Karar:** `currency` için hangi birimler geçerli (jeton, CFC)? Komisyon uygulanacak mı, hangi oran? Günlük/tek seferlik limit?

---

## 3. Çekim iptali (`POST /api/withdrawals/{id}/cancel`)

**Flutter:** `withdrawalCancel(id)`.

**Backend'deki durum:** Çekim talepleri `WithdrawalRequest` modelinde (`status`: pending, agency_approved, approved, rejected, processing, completed). `cancel` alt yolu yok.

**Öneri (onay gerekli):** Yalnızca **sahibinin** ve yalnızca `pending` durumundaki talebi iptal etmesine izin ver; `processing`/`completed` için 409. Jeton iadesi gerekiyorsa mevcut iade kalıbı kullanılır — iade mantığı onaylanmadan yazılmaz.

**Karar:** İptalde jeton iadesi yapılsın mı? (Evet ise iade kuralı ve kaydı onayla.)

---

## 4. Ödeme talepleri (`/api/payments/requests/pending`, `/{id}/cancel`, `/api/payments/notify/{id}/cancel`)

**Backend'deki durum:** `payments/requests` ve `payments/notify` route'ları mevcut; eksik olan `pending` listesi ve `cancel` alt yolları.

**Öneri (onay gerekli):** Kullanıcının **kendi** bekleyen talebini iptal etmesi (durum: pending → cancelled). Ödeme tamamlanmış kayıtlar iptal edilemez. Bu, para hareketi değil durum değişikliği olduğu için düşük risk; yine de onayını istiyorum.

**Karar:** Kullanıcı iptali açık mı olsun?

---

## 5. Admin kredi işlemi (`/api/admin/users/credits`)

**Backend'deki durum:** `app/api/admin/credits` ve `app/api/admin/users/[userId]/manage` mevcut. Ayrı `users/credits` uç yok.

**Risk:** Doğrudan bakiye değiştirme; denetim izi zorunlu.

**Öneri (onay gerekli):** Mevcut `admin/credits` mantığını yeniden kullan; her işlem `AuditLog`'a yazılsın; `finance.balance.adjust` yetkisi gerekli.

**Karar:** Mevcut `admin/credits` ucu Flutter'a yönlendirilsin mi, yoksa yeni bir `users/credits` alias'ı mı?

---

## 6. Admin üyelik hibesi (`/api/admin/users/grant-membership`)

**Backend'deki durum:** `app/api/admin/membership-grants` mevcut.

**Öneri (onay gerekli):** Mevcut `membership-grants` mantığı tekrar kullanılsın; yalnızca Flutter yol/gövde uyumu için ince bir ek. Süre ve kademe kuralları mevcut koddan okunur.

**Karar:** Alias yeterli mi, yoksa Flutter gövdesi farklıysa uyarlama yapılsın mı?

---

## 7. Rol yetkileri (`/api/admin/role-permissions`)

**Backend'deki durum:** `app/api/admin/roles` ve `RolePermission` modeli mevcut; `getEffectivePermissions` yetki hesabını yapıyor.

**Risk:** Yetki yükseltme — en kritik alan.

**Öneri (onay gerekli):** Yalnızca `system.admin.full` sahibi değiştirebilsin; her değişiklik `AuditLog`'a yazılsın; kendi rolünü yükseltme engellensin.

**Karar:** Mevcut `admin/roles` ucu alias'lanabilir mi?

---

## 8. Sosyal hesaplar (`/api/social-accounts`, `/api/admin/social-accounts`)

**Flutter:** `GET` listesi ve `accounts: [{platform, value, enabled}]` ile toplu güncelleme.

**Backend'deki durum:** Bu tabloya karşılık bir model/route tespit edilmedi (bu adımda doğrulanmadı).

**Karar:** Bu özellik gerçekten planlı mı? Model ve iş kuralı tanımlanmadan uygulanmaz.

---

## Özet — onay sırası önerisi

| # | Konu | Risk | Önerilen adım |
|---|------|------|---------------|
| 4 | Ödeme talebi iptali | Düşük | Onay → uygula |
| 3 | Çekim iptali | Orta | Onay (iade kuralı) → uygula |
| 5 | Admin kredi | Yüksek | Mevcut ucu alias + audit |
| 6 | Üyelik hibesi | Orta | Alias |
| 7 | Rol yetkileri | Çok yüksek | Ayrı PR, güçlü kısıt |
| 2 | Cüzdan transferi | Çok yüksek | Ayrı PR, ledger ile |
| 1 | Cosmetic envanteri | Orta (migrasyon) | Şema onayı |
| 8 | Sosyal hesaplar | Bilinmiyor | Ürün kararı |
