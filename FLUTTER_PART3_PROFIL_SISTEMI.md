# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 3 — PROFİL SİSTEMİ

> **Kaynak:** %100 gerçek backend endpoint'leri. **Önceki:** PART 2 (Premium UI/UX).

---

## 1. PROFİL VERİSİ (`GET /api/user/profile`)
Kimlik doğrulama gerektirir (JWT `Authorization: Bearer`). Dönen başlıca alanlar: `id, name, username, email, image, role, membership, membershipExpiresAt, level, credits (jeton), cfcBalance, bio, profileFrame, adminAssignedFrame, specialBadges, followersCount, followingCount`.

```dart
Future<UserProfile> fetchProfile() async {
  final r = await api.get('/api/user/profile'); // Bearer token
  return UserProfile.fromJson(r['data'] ?? r);
}
```
> **Kural:** `role` ve `membership` UI efektlerini (isim rengi, rozet, çerçeve) belirler — PART 2 §5-6.

## 2. PROFİL GÜNCELLEME (`PATCH /api/user/profile`)
Body (kısmi): `{ name?, username?, bio?, image?, profileFrameId? }`. `username` benzersiz olmalı; çakışmada 400 + Türkçe hata döner. Avatar yükleme için önce `POST /api/upload/presigned` (PART 10) ile cloud'a yükle, dönen `cloud_storage_path`'i `image` olarak gönder.

## 3. BAKİYE & CÜZDAN
- **Jeton (kredi):** `GET /api/user/credits` → `{ credits }`. Ana bakiye birimi.
- **CFC bakiyesi:** `GET /api/wallet` → kazanç/çekim bakiyesi (falcı/oda sahibi geliri).
- **Jeton fiyatı:** `GET /api/public/jeton-price` (public).
- **Jeton paketleri:** `GET /api/credit-packages` (public, cache'li).
- **Ödeme yöntemleri:** `GET /api/payment-methods` (public, cache'li).

```dart
// Bakiye rozeti (her ekranın üstünde)
Widget balanceChip(int jeton) => GlassCard(padding: EdgeInsets.symmetric(horizontal:12,vertical:6),
  child: Row(mainAxisSize: MainAxisSize.min, children:[
    const Text('🪙 '), Text('$jeton', style: AppText.button)]));
```

## 4. İŞLEM & FAL GEÇMİŞİ
- **Fal geçmişi:** `GET /api/user/fortunes` (sayfalı) → kullanıcının aldığı tüm fallar. Detay: `GET /api/user/fortunes/[fortuneId]`.
- **Alınan hediyeler:** `GET /api/user/received-gifts`.
- **Yayın geçmişi:** `GET /api/user/broadcast-history`.
- **İstatistikler:** `GET /api/user/statistics` ve `GET /api/user/stats`.
- **XP:** `GET /api/user/xp` → seviye ilerleme çubuğu (PART 2 §7).

## 5. TAKİP & SOSYAL
- Takip et/bırak: `POST /api/user/[userId]/follow` (toggle).
- Takip durumu: `GET /api/user/[userId]/follow-status`.
- Takipçiler/takip edilenler: `GET /api/user/followers`, `GET /api/user/following`.
- Engelle: `POST /api/user/block`; engellenenler: `GET /api/user/blocked`.
- Şikayet: `POST /api/user/report` (body: `{ targetUserId, reason }`).
- Başka kullanıcı profili (mobil): `GET /api/mobile/user-profile/[userId]`.

## 6. BAŞARIMLAR (ACHIEVEMENTS)
- `GET /api/user/achievements` (kendi), `GET /api/user/[userId]/achievements` (başkası). Rozet grid'i olarak göster (PART 2 rozet stili).

## 7. AYARLAR
- Tema: `GET/POST /api/user/theme`.
- Şifre değiştir: `POST /api/auth/change-password` (body: `{ oldPassword, newPassword }`).
- Çıkış: `POST /api/auth/logout` + local token temizle (PART 1 JWT).
- FCM token kayıt (push): `POST /api/devices/fcm` (body: `{ token, platform }`).

## 8. PROFİL EKRANI YERLEŞİMİ
1. Üst: `FramedAvatar` + isim (üyelik renginde) + rozetler + `Lv` rozeti.
2. Bakiye kartları (jeton + CFC) yan yana `GlassCard`.
3. Sekmeler: Fallarım / Hediyeler / Başarımlar / İstatistik.
4. Alt: Ayarlar listesi (tema, şifre, çıkış).

## 9. KALİTE KONTROL
- [ ] Profil `role/membership` gerçek yanıttan; hardcode yok.
- [ ] Avatar yükleme presigned URL akışıyla; local dosya yok.
- [ ] username çakışma hatası Türkçe gösteriliyor.
- [ ] Çıkışta token + refresh token siliniyor.

**Sonraki:** PART 4 — Sesli Sohbet Odaları.
