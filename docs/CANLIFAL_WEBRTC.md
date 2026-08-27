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

## 10. Telemetri (§76 — Planlanan)

Şu an için backend tarafında WebRTC telemetri kaydı **mevcut değildir**. Planlanan metrikler:

| Metrik | Açıklama |
|--------|----------|
| connection_state | Bağlantı durumu |
| ice_state | ICE bağlantı durumu |
| reconnect_count | Yeniden bağlanma sayısı |
| rtt | Round-trip time |
| packet_loss | Paket kaybı |
| jitter | Ses/video titreşimi |
| bitrate | Bit hızı |
| freeze | Donma olayları |
| connection_duration | Bağlantı süresi |

**Not:** Bu metrikler istemci tarafında toplanıp periyodik olarak backend'e raporlanabilir. TRTC SDK kalite callback'leri bu verileri sağlar.
