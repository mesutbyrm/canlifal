# CanlıFal — WebRTC ve Gerçek Zamanlı Medya Dokümantasyonu

> **§75-76 — Spec Referansları**
>
> Son güncelleme: 2026-08-27

---

## 1. Medya Taşıma Altyapısı

| Bileşen | Değer |
|---------|-------|
| Sağlayıcı | **Tencent TRTC** (trtc-sdk-v5) |
| SDK Sürümü | v5.17.1 |
| SDK App ID | `20040423` |
| Flutter Paketi | `trtc_sdk` v5 |
| Web Yardımcısı | `lib/trtc-client.ts` |

**NOT:** Agora tamamen kaldırıldı. Tüm sesli/görüntülü iletişim TRTC üzerinden.

---

## 2. Oda ID Standardı

```typescript
// lib/trtc-room.ts
voiceTrtcRoomId(chatRoomId) → 'voice_room_<chatRoomId>'
userIdToNumericUid(userId) → deterministic hash (TRTC numeric uid)
```

**KRİTİK:** Web ve Flutter aynı `trtcRoomId` kullanmalıdır (backend döndürür). İstemci kendi room ID'si üretmemelidir.

---

## 3. Token API'leri

### 3.1 POST /api/trtc/token

| Alan | Açıklama |
|------|----------|
| Auth | Dual (JWT + web session) |
| Request | `{roomId, role?}` |
| Response | `{sdkAppId, userId, userSig, trtcRoomId, numericUid, expireTime}` |

### 3.2 POST /api/trtc/usersig

| Alan | Açıklama |
|------|----------|
| Auth | Dual |
| Request | `{userId?, roomId?}` |
| Response | `{sdkAppId, userId, userSig, trtcRoomId?, numericUid?}` |

### 3.3 POST /api/trtc/webhook

TRTC sunucusundan gelen callback'ler (oda olayları).

---

## 4. Sesli Oda Akışı

```
Kullanıcı → POST /api/live/join-room (veya /presence)
  → Backend: auth + ban + seat assignment
  → Response: {trtc: {sdkAppId, trtcRoomId, numericUid}}

Kullanıcı → POST /api/trtc/token {roomId}
  → Response: {userSig, sdkAppId, trtcRoomId, numericUid}

Flutter/Web → TRTC SDK enterRoom(trtcRoomId, userSig)
  → Ses/Video bağlantısı kurulur
```

---

## 5. WebRTC Signaling (1:1 Fal Seansları)

Canlı fal seansları için doğrudan peer-to-peer WebRTC signaling:

### 5.1 POST /api/room/signal

| Alan | Açıklama |
|------|----------|
| Auth | Dual |
| Request | `{sessionId, receiverId, signalType, signalData}` |
| signalType | `offer`, `answer`, `ice-candidate` |

### 5.2 GET /api/room/signal

| Alan | Açıklama |
|------|----------|
| Query | `?sessionId=xxx` |
| Response | Bekleyen sinyaller (işlendikten sonra `processed=true`) |

### 5.3 DELETE /api/room/signal

| Alan | Açıklama |
|------|----------|
| Query | `?sessionId=xxx` |
| Açıklama | Eski sinyalleri temizler (reconnect için) |

---

## 6. SSE ile Realtime Olay Yayını

TRTC medya taşır, backend state yönetir. Olay yayını SSE üzerinden:

| Event Tipi | Kaynak |
|------------|--------|
| `user_joined` | Odaya katılım |
| `user_left` | Odadan ayrılma |
| `mic_changed` | Mikrofon aç/kapat |
| `seat_changed` | Koltuk değişikliği |
| `owner_changed` | Oda sahipliği devri |
| `room_closed` | Oda kapanışı |

SSE Uçları:
- `/api/chat/rooms/[roomId]/stream` — Sesli oda olayları
- `/api/video-streams/[streamId]/stream` — Canlı yayın olayları
- `/api/room/[sessionId]/stream` — Fal seansı olayları

---

## 7. TRTC Yapılandırma

### Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `TRTC_SDK_APP_ID` | TRTC SDK App ID (sunucu) |
| `TRTC_SDK_SECRET_KEY` | TRTC imzalama anahtarı |
| `NEXT_PUBLIC_TRTC_SDK_APP_ID` | TRTC SDK App ID (istemci) |

### UserSig Üretimi

`tls-sig-api-v2` kütüphanesi ile sunucu tarafında üretilir. İstemci **asla** secret key'e erişmez.

---

## 8. Koltuk Yönetimi

| Ayar | Değer |
|------|-------|
| Toplam koltuk | 11 (indeks 0–10) |
| Stale timeout | 45 saniye (3 heartbeat kaçırma) |
| Heartbeat | İstemci 15 saniyede bir presence günceller |
| Auto-seat | Katılımda ilk boş koltuğa otomatik atama |
| Dinleyici | Koltuk yok → seatIndex = -1 |

```typescript
// lib/voice-room-constants.ts
SEAT_COUNT = 11
MAX_SEAT_INDEX = 10
SEAT_STALE_MS = 45000
```

---

## 9. Reconnect Stratejisi

### TRTC Reconnect
- TRTC SDK yerleşik reconnect mekanizmasına sahip
- Ağ değişikliğinde SDK otomatik yeniden bağlanır

### SSE Reconnect
- `Last-Event-Id` header desteği (oda SSE)
- Flutter: bağlantı kopunca → SSE yeniden bağlan → `Last-Event-Id` ile kaçırılan olayları al
- Uzun kopukluk durumunda → `/api/chat/rooms/[roomId]/state` ile tam resync

### Presence Reconnect
- Yeniden katılımda (`POST /presence`): kullanıcının diğer odalarından ghost-leave yapılır
- Eski VoiceSession'lar deaktive edilir
- Yeni koltuk atanır

---

## 10. Telemetri (§76 — UYGULANDI, Faz 15)

WebRTC bağlantı kalite telemetrisi backend tarafında **uygulanmıştır**. Tamamen
eklemeli bir katmandır: medya taşıma mimarisine, sinyalleşme akışına veya mevcut
uç davranışına dokunulmamıştır.

### 10.1 Veri modeli — `RtcTelemetry` (`rtc_telemetry`)

İlişkisiz (relation'sız), yalnızca ekleme yapılan bir tablodur. 5 indeks:
`userId+createdAt`, `context+createdAt`, `contextId`, `qualityLevel+createdAt`,
`createdAt`.

| Alan | Tip | Açıklama |
|------|-----|----------|
| userId | String | Raporlayan kullanıcı |
| context | String | live_session / voice_room / video_stream / pk |
| contextId | String? | Oturum / oda / yayın kimliği |
| peerId | String? | Karşı taraf kimliği |
| connectionState | String? | RTCPeerConnection durumu |
| iceState | String? | ICE bağlantı durumu |
| reconnectCount | Int | Yeniden bağlanma sayısı |
| rttMs | Int? | Gidiş-dönüş gecikmesi (0-60000 kırpılır) |
| packetLossPercent | Float? | Paket kaybı % (0-100 kırpılır) |
| jitterMs | Int? | Titreşim (0-10000 kırpılır) |
| bitrateKbps | Int? | Bit hızı |
| freezeCount | Int | Donma olayı sayısı |
| freezeDurationMs | Int | Toplam donma süresi |
| durationSeconds | Int | Örnekleme penceresi |
| platform | String? | web / android / ios |
| networkType | String? | wifi / 4g / 5g / ethernet |
| qualityScore | Int | 0-100 hesaplanan skor |
| qualityLevel | String | excellent / good / fair / poor / critical |
| metadata | Json? | Serbest alan |

**Gizlilik:** IP adresi, çerez veya medya içeriği saklanmaz — yalnızca sayısal
ağ metrikleri ve kaba platform bilgisi tutulur.

### 10.2 Kalite skoru

`lib/rtc-telemetry.ts` → `computeRtcQuality(input)` 0-100 arası ağırlıklı bir
skor üretir:

| Sinyal | Ağırlık | iyi | orta | kötü |
|--------|---------|-----|------|------|
| RTT (ms) | 30 | ≤150 | ≤300 | ≤500 |
| Paket kaybı (%) | 30 | ≤1 | ≤3 | ≤8 |
| Jitter (ms) | 20 | ≤30 | ≤60 | ≤100 |
| Yeniden bağlanma | 10 | 0 | ≤1 | ≤3 |
| Donma sayısı | 10 | 0 | ≤2 | ≤5 |

Seviye sınırları: excellent ≥85, good ≥70, fair ≥50, poor ≥30, altı critical.
Eşikler `rtc_quality_thresholds` RemoteConfig kaydı ile ezilebilir (60 sn önbellek);
kayıt okunamazsa sessizce varsayılanlara düşer.

### 10.3 Uç noktalar

| Uç | Yöntem | Auth | Açıklama |
|----|--------|------|----------|
| `/api/rtc/telemetry` (ve `/api/v1/rtc/telemetry`) | POST | Kullanıcı | Tekil veya toplu (≤20) örüntü gönderimi. Rate limit scope `rtc_telemetry` (30/dk) |
| `/api/admin/rtc-telemetry` | GET | Admin | Sayfalı liste + özet (ortalamalar, seviye dağılımı) |

Yanıt zarfı yeni uç standardıdır (`apiSuccess` / `apiError` / `apiPaginated`).

### 10.4 Admin arayüzü

`/admin/rtc-telemetry` — 6 özet kartı (kayıt sayısı, ortalama skor, ortalama RTT,
ortalama paket kaybı, ortalama jitter, toplam yeniden bağlanma), seviye dağılım
çubuğu, 4 filtre (bağlam, seviye, kullanıcı, zaman aralığı) ve sayfalama.
Admin panelinde "📡 Bağlantı Kalitesi" bağlantısı ile erişilir.

### 10.5 İstemci entegrasyonu (öneri)

TRTC SDK kalite callback'lerinden (`onNetworkQuality`, `onStatistics`) 10-30
saniyede bir örnek toplanıp toplu olarak `POST /api/v1/rtc/telemetry` ucuna
gönderilmelidir. Gönderim hatası kullanıcı deneyimini etkilememelidir
(fire-and-forget).
