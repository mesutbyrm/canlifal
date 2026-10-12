# Flutter ↔ Backend: Onay Bekleyen Kararlar (Öneri Paketi)

Bu doküman, hiçbir kodu değiştirmeden, eksik kalan ve **onay gerektiren** uçlar için Flutter sözleşmesini, backend'deki yakın karşılıkları ve önerilen yaklaşımı özetler. Uygulama yalnızca onay sonrası yapılır.

Kaynak: `mesutbyrm/Cursor-Flutter-` → `mobile/lib/core/network/api_endpoints.dart` ve ilgili data kaynakları.

---

## 1. Cosmetic envanteri — GERÇEK BOŞLUK DEĞİL (karar kapatıldı)

**Doğrulama:** `user/cosmetics*` uçları Flutter kodunda hiç çağrılmıyor. Flutter'da eşleşen tek şeyler uygulama içi UI rotaları (`/profile/cosmetics`). Önceki "eksik" tespiti bir yol taramasından gelen yanlış pozitifti.

**Mevcut çalışan model:**
- Cosmetic kataloğu: `profile-frames`, `mic-frames`, `chat-bubbles`, `name-effects`, `entrance-effects`, `avatar-accessories` (`lib/cosmetics.ts`). Her biri `tier` ile erişim denetler (free / gold / admin_only).
- Seçim: `GET` katalog + seçili öğe; `POST` seçimi kullanıcı alanına (`userField`) yazar ve tier erişimini kontrol eder.
- Flutter cosmetic ekranı (`cosmetics_equip_remote_datasource.dart`) bu uçları kullanıyor.

**Sonuç:** Yeni `UserCosmetic` tablosu ve üretim migrasyonu **gereksiz**; yapılmadı.

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
| 1 | Cosmetic envanteri | — | Gerçek boşluk değil; kapatıldı |
| 8 | Sosyal hesaplar | Bilinmiyor | Ürün kararı |
