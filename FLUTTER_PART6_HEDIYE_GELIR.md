# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 6 — HEDİYE SİSTEMİ & GELİR PAYLAŞIMI

> **Kaynak:** %100 gerçek `gifts/*`, `live/gift/*`, `chat/rooms/*/gifts`. **Önceki:** PART 5.

---

## 1. HEDİYE TÜRLERİ
- `GET /api/gifts/types` veya `GET /api/live/gift-types` → `{ id, nameTr, nameEn, icon/animationUrl, price(jeton), tier }`.
- UI: hediye çekmecesi (grid), fiyat + animasyon önizleme. Tier'a göre grupla (normal / premium / lux).

## 2. HEDİYE GÖNDERME
Üç bağlam, üç endpoint:
- **Genel/DM:** `POST /api/gifts/send` — Body: `{ recipientUsername, giftTypeId, jetonAmount, type }`. Döner `{ success: true, ... }`.
- **Canlı yayın:** `POST /api/live/gift/send` (Body: `{ streamId, giftTypeId, quantity }`).
- **Sesli oda:** `POST /api/chat/rooms/[roomId]/gifts` (Body: `{ recipientId, giftTypeId, quantity, currencyType:'jeton'|'cfc' }`).

```dart
Future<void> sendGift(String roomId, String recipientId, String giftId, int qty) async {
  final r = await api.post('/api/chat/rooms/$roomId/gifts',
    {'recipientId': recipientId, 'giftTypeId': giftId, 'quantity': qty, 'currencyType':'jeton'});
  if (r['success'] == true) playGiftAnimation(giftId, qty);
}
```
> Gönderim öncesi bakiye kontrolü yap; yetersizse jeton satın alma sayfasına (PART 3) yönlendir.

## 3. HEDİYE ANİMASYONU
- SSE `gift` olayı gelince tüm izleyicilerde tam ekran overlay (Lottie/GIF). Lux hediyeler tam ekran + parçacık efekti; küçükler köşe animasyonu.
- Son büyük hediyeler: `GET /api/gifts/recent-big` (banner/ticker).
- Karşılıklı hediye kontrolü: `GET /api/gifts/check-reciprocal`.

## 4. GELİR PAYLAŞIMI (admin ayarlarıyla)
Backend platform ayarları (admin panelinden yönetilir, PART 8-9). Sesli oda hediyesi dağılımı:
| Ayar | Varsayılan | Anlam |
|------|-----------|-------|
| `vr_gift_receiver_percent` | 70 | Hediyeyi alan (koltuktaki kişi) payı |
| `vr_room_owner_percent` | 30 | Oda sahibi payı |
| `vr_site_commission_percent` | 50 | Site komisyonu |
| `vr_music_owner_percent` | 50 | Müzik sahibi payı (normal oda) |
| `vr_vip_music_owner_percent` | 70 | Müzik sahibi payı (VIP oda) |

> **Kural:** Flutter bu yüzdeleri **hesaplamaz**; backend hesaplar. Flutter yalnızca sonuç bakiyeyi (`/api/wallet`) gösterir. Yüzde göstermek gerekiyorsa `GET /api/platform/commission-rate`'ten oku.

## 5. FALCI HEDİYELERİ & ÖDÜLLER
- Falcıya hediye: `GET /api/fortune-tellers/gifts`. Ödüller: `GET /api/fortune-tellers/awards`.
- Alınan hediyeler (kullanıcı): `GET /api/user/received-gifts`.

## 6. CÜZDAN & ÇEKİM
- Bakiye: `GET /api/wallet`. Çekim talebi: `POST /api/withdrawals`. Ajans çekimi: `GET /api/agency/withdrawals`.
- Jeton satın alma: paketler `GET /api/credit-packages`, ödeme `POST /api/payment/requests` + `GET /api/payment/config`.
- CFC ödeme talepleri (admin onaylı): `admin/cfc-payment-requests`.

## 7. KALİTE KONTROL
- [ ] Hediye öncesi bakiye kontrolü + yetersiz bakiye yönlendirmesi.
- [ ] Yüzde hesabı backend'de; Flutter sadece gösteriyor.
- [ ] SSE `gift` animasyonu tüm izleyicilerde tetikleniyor.
- [ ] currencyType (jeton/cfc) doğru gönderiliyor.

**Sonraki:** PART 7 — Fal Mantığı (AI + Canlı Falcı).
