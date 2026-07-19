# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 5 — CANLI YAYIN & PK SAVAŞLARI

> **Kaynak:** %100 gerçek `video-streams/*` + `live/*` + TRTC. **Önceki:** PART 4.

---

## 1. YAYIN LİSTESİ
- `GET /api/video-streams?page=&limit=` → `{ streams[], items[], pagination }` (10 sn cache). Her öğe: `streamId, isLive, viewers, watching, broadcasterId, hostUserId, streamerName, thumbnailUrl, coverUrl`.
> **Kritik parse kuralı:** Yanıt obje döner, dizi değil. `final list = data is List ? data : (data['streams'] ?? data['items'] ?? [])`.
- Detay: `GET /api/video-streams/[streamId]`.

## 2. YAYIN AÇMA (yalnızca onaylı canlı falcı)
- `POST /api/video-streams` — Body: `{ title, description, category, tags, thumbnailUrl, coverUrl }`. Döner: `{ success, data: { streamId, roomId, ... } }`. Ardından `POST /api/video-streams/[streamId]/live-started`.
- TRTC token: `POST /api/live/join-room` (roomType `stream`) veya `POST /api/trtc/token`. Yayıncı anchor rolüyle video+audio push eder.
- Yayını bitir: `POST /api/video-streams/[streamId]/end` veya `PATCH /api/video-streams/[streamId]` (`status:'ended'`). SSE `streamEnded` yayınlar.

## 3. İZLEYİCİ OLARAK KATILMA
1. `POST /api/video-streams/[streamId]/join` → izleyici sayılır + TRTC token.
2. TRTC'ye audience rolüyle katıl (video pull).
3. Ayrıl: `POST /api/video-streams/[streamId]/leave`.
4. İzleyici listesi: `GET /api/video-streams/[streamId]/viewers`.

## 4. GERÇEK ZAMANLI (SSE)
- `GET /api/video-streams/[streamId]/stream` (SSE). Olaylar: `streamMessage`, `gift`, `streamEnded`, `pk_update`, `viewer_count`.
- Yorum gönder: `POST /api/video-streams/[streamId]/comments` (Body: `{ content, nickname?, isHidden? }`).
- Beğeni (toplu): `POST /api/video-streams/[streamId]/like` (Body: `{ count }`, max 100).
- Mesajlar: `GET /api/video-streams/[streamId]/messages`.

## 5. MODERASYON (yayıncı/admin)
- Ban: `POST /api/video-streams/[streamId]/ban`. Sustur: `POST /api/video-streams/[streamId]/mute`.
- Moderatör ata: `GET/POST /api/video-streams/[streamId]/moderators`.
- Otomatik kapanma: `POST /api/video-streams/[streamId]/auto-close` (yayıncı uzun süre yoksa).

## 6. CO-BROADCAST (ortak yayın)
- Davet: `POST /api/video-streams/[streamId]/co-broadcast/invite`. Yönetim: `GET/POST /api/video-streams/[streamId]/co-broadcast`.
- Kullanıcı davetleri: `GET /api/user/co-broadcast-invites`.
- Ekranda çoklu video karesi (2-4 anchor) göster.

## 7. PK SAVAŞLARI (versus)
- PK başlat/eşleş: `POST /api/video-streams/[streamId]/pk-battle`. Liste: `GET /api/video-streams/pk/list`, `GET /api/video-streams/pk`.
- Skor gönder: `POST /api/video-streams/pk/score` (hediye değeri skora eklenir).
- Sesli oda PK'si: `POST /api/chat/rooms/[roomId]/pk` + `POST /api/chat/rooms/[roomId]/pk/score`.
- Genel canlı PK: `POST /api/live/pk`, `POST /api/live/pk/score`.
- UI: iki tarafın skor barı (kırmızı vs mavi), geri sayım timer, kazanan animasyonu.

```dart
// PK skor barı — SSE 'pk_update' ile güncelle
Stack(children:[
  Row(children:[Expanded(flex: leftScore, child: Container(color: AppColors.danger)),
    Expanded(flex: rightScore, child: Container(color: AppColors.info))]),
]);
```

## 8. FAL İSTEĞİ (yayın içi)
- İzleyici yayında fal ister: `POST /api/video-streams/[streamId]/fortune-requests`. Durum: `GET /api/video-streams/[streamId]/fortune-requests/my-status`.

## 9. KALİTE KONTROL
- [ ] Liste parse helper obje/dizi ikisini de tolere ediyor.
- [ ] TRTC rol ayırımı: anchor (yayıncı) vs audience (izleyici).
- [ ] SSE `streamEnded` alınınca izleyici otomatik çıkıyor.
- [ ] PK skor barı gerçek zamanlı güncelleniyor.

**Sonraki:** PART 6 — Hediye Sistemi & Gelir.
