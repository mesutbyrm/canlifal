# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 4 — SESLİ SOHBET ODALARI

> **Kaynak:** %100 gerçek `chat/rooms/*` + `live/*` + TRTC. **Önceki:** PART 3.

---

## 1. ODA LİSTESİ
- `GET /api/live/rooms?type=voice&search=&page=&limit=` → `{ success, data: { rooms[], totalVoice, pagination } }`. (PART 1 zarf formatı.)
- Her oda: `id, slug, nameTr, nameEn, descTr, descEn, icon, backgroundImage, bannerImage, ownerId, roomType(FREE|NORMAL|VIP), tags, owner{id,name,image}`.
- Alternatif liste: `GET /api/chat/rooms`. PK yapan odalar: `GET /api/chat/rooms/pk-list`.

> **Performans:** Bu liste `@@index([isActive, createdAt])` indeksinden faydalanır (backend'de eklendi).

## 2. ODAYA GİRİŞ (TRTC token akışı)
1. `POST /api/live/join-room` — Body: `{ roomId, roomType: 'voice', nickname? }`. Döner: `{ success, data: { trtcToken/userSig, sdkAppId, roomId(TRTC), userId, ... } }`.
2. TRTC SDK'yi `sdkAppId` + `userSig` ile başlat, sesli odaya (audio-only) katıl.
3. Ayrılırken: `POST /api/live/leave-room` (Body: `{ roomId, roomType }`).
4. Presence koruması: her 20-30 sn `POST /api/live/heartbeat` — backend `redisCache` ile üye giriş/çıkışını otomatik yönetir.

```dart
// Heartbeat timer
Timer.periodic(const Duration(seconds: 25), (_) => api.post('/api/live/heartbeat', {'roomId': roomId, 'roomType':'voice'}));
```

## 3. KOLTUKLAR (SEATS)
- Koltuk durumu: `GET /api/chat/rooms/[roomId]/seats` → mikrofon koltukları (index, userId, muted).
- Koltuğa otur / kalk / mikrofon aç-kapat: `POST /api/chat/rooms/[roomId]/seats` (Body: `{ action: 'sit'|'leave'|'mute'|'unmute', seatIndex }`).
- Genel koltuk API'si: `GET/POST /api/live/seats`.
- Kapasite: `roomType`'a göre (FREE=15, NORMAL=100, VIP=500 — admin `vr_*_room_max_users` ayarlarından). Aşılırsa giriş reddedilir.

## 4. GERÇEK ZAMANLI OLAYLAR (SSE)
- Stream: `GET /api/chat/rooms/[roomId]/stream` (SSE). Olaylar: `message`, `gift`, `seat_update`, `presence`, `music`, `pk_score`, `typing`.
- Mesaj gönder: `POST /api/chat/rooms/[roomId]/messages` (Body: `{ content }`).
- Yazıyor bilgisi: `POST /api/chat/rooms/[roomId]/typing`.
- Presence (kimler odada): `GET /api/chat/rooms/[roomId]/presence`.

```dart
// SSE dinleme (PART 1 SSE helper)
sse('/api/chat/rooms/$roomId/stream').listen((e){
  switch(e.event){ case 'message': addMessage(e.data); break;
    case 'gift': playGiftAnim(e.data); break;
    case 'seat_update': refreshSeats(e.data); break; }
});
```

## 5. MÜZİK / DJ SİSTEMİ
- Çalan müzik: `GET /api/chat/rooms/[roomId]/music`. Kuyruk: `GET/POST /api/chat/rooms/[roomId]/music-queue`.
- Şarkı isteği: `POST /api/chat/rooms/[roomId]/song-request`. Arama: `GET /api/music/search` + `GET /api/youtube/search`.
- DJ yönetimi: `POST /api/chat/rooms/[roomId]/dj` (Body: `{ action:'add'|'remove'|'setActive', userId }`). Max 5 DJ.
- YouTube canlı akış: `GET /api/chat/youtube-stream`.
> Müzik geliri paylasımı: admin `vr_music_owner_percent` / `vr_vip_music_owner_percent` (PART 6).

## 6. MODERASYON (oda sahibi/admin)
- `POST /api/chat/rooms/[roomId]/moderation` — Body `{ action: 'ban'|'unban'|'mute'|'unmute'|'kick', targetUserId }`.
- Oda ayarları: `GET/POST /api/chat/rooms/[roomId]/settings` (welcomeMessage, pinnedAnnouncement, password, bannedWords).
- Sahiplik devri: `POST /api/chat/rooms/[roomId]/transfer-ownership`.
- Arka planlar: `GET /api/chat/rooms/backgrounds`, `GET /api/chat/broadcast-images`.

## 7. ODA OLUŞTURMA
- `POST /api/chat/rooms/create` — Body: `{ nameTr, nameEn, descTr, descEn, roomType, password? }`. NORMAL/VIP jeton/üyelik gerektirebilir.

## 8. EKRAN YERLEŞİMİ
1. Üst: oda adı + dinleyici sayısı + ayrıl butonu.
2. Orta: koltuk ızgarası (`FramedAvatar` + konuşma dalgası animasyonu).
3. Müzik barı (çalan şarkı + DJ kontrolü).
4. Alt: sohbet akışı + mesaj input + hediye butonu (PART 6).

## 9. KALİTE KONTROL
- [ ] Heartbeat aktif; oda kapanınca `leave-room` çağrılıyor.
- [ ] TRTC audio-only; gizli anahtar Flutter'da yok (userSig backend'den).
- [ ] SSE reconnect stratejisi var (PART 1).
- [ ] Kapasite aşımı Türkçe hata ile gösteriliyor.

**Sonraki:** PART 5 — Canlı Yayın & PK.
