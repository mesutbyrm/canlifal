# API REFERENCE — Çekirdek Uçlar

> **Kaynak:** canlı backend kaynak ağacı (`nextjs_space/`), 2026-09-27.
> **Üretim:** `app/api/**/route.ts` programatik taraması; el ile uydurulmuş uç yoktur.
> **Durum:** Aksi yazmadıkça her satır **KODDAN TESPİT EDİLDİ** (kaynakta okundu, canlı HTTP testi yapılmadı).
> Etiketler: `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


Bu dosya **Flutter istemcisinin kullandığı çekirdek grupları** ayrıntılandırır.
Tüm 717 route için bkz. [`ENDPOINT_INVENTORY.md`](./ENDPOINT_INVENTORY.md).

## Ortak kurallar

- **Base URL:** `https://canlifal.com` · `/api/v1/*` → `middleware.ts` rewrite → `/api/*` (yanıtta `x-api-version: v1`).
- **Kimlik:** `Authorization: Bearer <accessToken>` (mobil) veya NextAuth cookie (web) — `lib/mobile-auth.ts → authenticateRequest()`.
- **Zarf:** Yeni uçlar `lib/api-response.ts` zarfı (`{success, data?, error:{code,message,details?}, meta?, request_id?}`);
  eski uçlar düz gövde veya `{error:'...'}` dönebilir — **uç bazında değişir**.
- **İstek kimliği:** Her yanıtta `x-request-id` (`middleware.ts`).
- **Rate limit:** Kova belirtilmeyen uçlar `api_default` = 60/dk. Aşımda `429`.
- **Sayfalama:** Cursor tabanlı uçlar `?cursor=&limit=` alır, `meta.hasMore` döner.
- **Yan etki:** `POST/PUT/PATCH/DELETE` aksi belirtilmedikçe **idempotent değildir**.


---

## /api/auth  (22 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | — | — | hayır | — | POST → durum değiştirir |
| `/api/auth/change-password` | POST | JWT | — | — | evet | `user` | POST → durum değiştirir |
| `/api/auth/email/send-verification` | POST | JWT | — | — | evet | `emailVerificationToken`, `user` | POST → durum değiştirir |
| `/api/auth/email/verify` | GET, POST | Yok ⚠ | — | — | evet | `emailVerificationToken`, `user` | POST → durum değiştirir |
| `/api/auth/forgot-password` | POST | Yok ⚠ | — | — | evet | `passwordResetToken`, `user` | POST → durum değiştirir |
| `/api/auth/logout` | POST | JWT | — | — | evet | `userDevice` | POST → durum değiştirir |
| `/api/auth/logout-all` | POST | JWT | — | — | evet | `userDevice` | POST → durum değiştirir |
| `/api/auth/mobile-apple` | POST | Yok ⚠ | — | — | evet | `account`, `follow`, `referral`, `sitePresence`, `user` | POST → durum değiştirir |
| `/api/auth/mobile-google` | POST | Yok ⚠ | — | — | evet | `account`, `follow`, `referral`, `sitePresence`, `user` | POST → durum değiştirir |
| `/api/auth/mobile-login` | POST | Yok ⚠ | — | — | evet | `sitePresence`, `user` | POST → durum değiştirir |
| `/api/auth/mobile-refresh` | POST | Yok ⚠ | — | — | evet | `user` | POST → durum değiştirir |
| `/api/auth/mobile-register` | POST | Yok ⚠ | — | — | evet | `follow`, `referral`, `user` | POST → durum değiştirir |
| `/api/auth/mobile-sessions` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/auth/mobile-sessions/[id]` | DELETE | JWT | — | — | evet | `userDevice` | DELETE → durum değiştirir |
| `/api/auth/mobile-tiktok` | POST | Yok ⚠ | — | — | evet | `account`, `follow`, `referral`, `sitePresence`, `user` | POST → durum değiştirir |
| `/api/auth/mobile/device-token` | POST, DELETE | Yok ⚠ | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/auth/phone/send-otp` | POST | JWT | — | — | evet | `phoneOtp` | POST → durum değiştirir |
| `/api/auth/phone/verify-otp` | POST | JWT | — | — | evet | `phoneOtp`, `user` | POST → durum değiştirir |
| `/api/auth/reclaim-device` | POST | Oturum | — | — | hayır | `user` | POST → durum değiştirir |
| `/api/auth/reset-password` | POST | Yok ⚠ | — | — | evet | `passwordResetToken`, `user` | POST → durum değiştirir |
| `/api/auth/sessions` | GET, DELETE | JWT | — | — | evet | `userDevice` | DELETE → durum değiştirir |
| `/api/auth/verify-device` | GET | Oturum | — | — | evet | `user` | salt-okunur |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/auth/mobile-sessions` → `@/app/api/auth/sessions/route`
- `/api/auth/mobile/device-token` → `@/app/api/devices/fcm/route`

---

## /api/chat  (54 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/chat/broadcast-images` | GET | Yok ⚠ | — | — | evet | `broadcastImage` | salt-okunur |
| `/api/chat/cleanup` | GET, POST, DELETE | signature/webhook | — | — | evet | `chatMessage` | POST, DELETE → durum değiştirir |
| `/api/chat/music/popular` | GET | Yok ⚠ | — | — | evet | `chatMessage` | salt-okunur |
| `/api/chat/rooms` | GET | Yok ⚠ | — | — | evet | `chatRoom` | salt-okunur |
| `/api/chat/rooms/[roomId]/background` | GET, PATCH | Yok ⚠ | — | — | evet | `chatRoom` | PATCH → durum değiştirir |
| `/api/chat/rooms/[roomId]/banned-words` | GET, POST | Yok ⚠ | — | — | evet | `chatRoom` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/banned-words/[word]` | DELETE | Yok ⚠ | — | — | evet | `chatRoom` | DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/bans/[userId]` | POST, DELETE | Proxy | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/dj` | GET, POST | Oturum+JWT | — | — | evet | `chatPresence`, `chatRoom`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/dj/[targetUserId]` | POST, DELETE | Proxy | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/gifts` | GET, POST | Oturum+JWT | gift_send | — | evet | `chatMessage`, `chatPresence`, `chatRoom`, `chatRoomGift`, `giftType`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/join-seat` | POST | Proxy | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/kick` | POST | Proxy | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/mentions` | POST | Oturum+JWT | — | — | evet | `chatRoom`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/messages` | GET, POST, DELETE | Oturum+JWT | chat_message | — | evet | `chatMessage`, `chatPresence`, `chatRoom`, `chatUserRole` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/messages/[messageId]` | DELETE | Proxy | — | — | evet | — | DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/moderation` | GET, POST | Oturum+JWT | — | — | evet | `chatBan`, `chatMessage`, `chatMute`, `chatPresence`, `chatRoom`, `chatUserRole` +1 | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/music` | GET, POST, DELETE | Oturum+JWT | — | — | evet | `chatMessage`, `chatRoom`, `user` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/music-queue` | GET | Oturum+JWT | — | — | evet | `chatMessage` | salt-okunur |
| `/api/chat/rooms/[roomId]/music-request-by-query` | POST | Oturum+JWT+Proxy | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/music-settings` | GET, PATCH | Yok ⚠ | — | — | evet | `chatRoom` | PATCH → durum değiştirir |
| `/api/chat/rooms/[roomId]/music/stop` | POST | Oturum+JWT | — | — | evet | `chatMessage`, `chatRoom` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/mute` | POST | Proxy | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/pin-message` | POST | VIP | — | — | evet | `chatMessage`, `chatRoom` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/pk` | GET, POST | Oturum+JWT | pk_create | — | evet | `chatPresence`, `chatRoom`, `chatUserRole`, `pKBattle`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/pk/score` | POST | Oturum+JWT | — | — | evet | `pKBattle`, `pkScore`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/presence` | GET, POST, DELETE | Oturum+JWT | — | — | evet | `chatMessage`, `chatPresence`, `chatRoom`, `chatUserRole`, `user`, `voiceSession` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/queue` | GET, DELETE | Yok ⚠ | — | — | evet | `chatMessage` | DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/report` | POST | Oturum+JWT | report | — | evet | `chatRoom`, `user`, `userReport` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/roles` | POST | Proxy | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/seats` | GET, PATCH | Oturum+JWT | — | — | evet | `chatPresence`, `chatRoom`, `chatUserRole`, `user`, `voiceSession` | PATCH → durum değiştirir |
| `/api/chat/rooms/[roomId]/settings` | GET, PATCH | Oturum+JWT | — | — | evet | `chatRoom` | PATCH → durum değiştirir |
| `/api/chat/rooms/[roomId]/song-request` | GET, POST, PATCH | Oturum+JWT | — | — | evet | `chatMessage`, `chatRoom`, `jetonTransaction`, `user` | POST, PATCH → durum değiştirir |
| `/api/chat/rooms/[roomId]/song/[queueId]` | DELETE | Yok ⚠ | — | — | evet | `chatMessage` | DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-request` | GET, POST, DELETE | Oturum+JWT | — | — | evet | `chatRoom`, `chatSpeakRequest`, `user` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-request/[userId]/block` | POST, DELETE | Oturum+JWT | — | — | evet | `chatSpeakBlock`, `chatSpeakRequest`, `user` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-request/[userId]/reject` | POST, DELETE | Oturum+JWT | — | — | evet | `chatSpeakRequest`, `user` | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-requests` | GET | Oturum+JWT | — | — | evet | `chatSpeakRequest`, `user` | salt-okunur |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]` | DELETE | Yok ⚠ | — | — | hayır | — | DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/approve` | POST | Oturum+JWT | — | — | evet | `chatSpeakRequest`, `chatUserRole`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/block` | POST, DELETE | Yok ⚠ | — | — | hayır | — | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/reject` | POST, DELETE | Yok ⚠ | — | — | hayır | — | POST, DELETE → durum değiştirir |
| `/api/chat/rooms/[roomId]/state` | GET | Oturum+JWT | — | — | evet | `chatPresence`, `chatRoom`, `chatUserRole`, `pKBattle`, `user`, `voiceSession` | salt-okunur |
| `/api/chat/rooms/[roomId]/stream` | GET | Oturum+JWT | — | — | evet | `chatPresence`, `chatRoom`, `chatUserRole`, `voiceSession` | salt-okunur |
| `/api/chat/rooms/[roomId]/sync` | GET | Oturum+JWT | — | — | evet | `chatRoom`, `giftBox`, `pKBattle` | salt-okunur |
| `/api/chat/rooms/[roomId]/transfer-ownership` | POST | Oturum+JWT | — | — | evet | `chatRoom`, `chatUserRole`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/typing` | GET, POST | Oturum+JWT | — | — | evet | `chatPresence` | POST → durum değiştirir |
| `/api/chat/rooms/[roomId]/voice` | GET, POST | Oturum+JWT | — | — | evet | `chatRoom`, `chatUserRole`, `user`, `voiceSession` | POST → durum değiştirir |
| `/api/chat/rooms/backgrounds` | GET | Yok ⚠ | — | — | evet | `chatRoom` | salt-okunur |
| `/api/chat/rooms/create` | POST | JWT | room_create | — | evet | `chatRoom`, `jetonTransaction`, `user` | POST → durum değiştirir |
| `/api/chat/rooms/pk-list` | GET | Yok ⚠ | — | — | evet | `chatRoom`, `pKBattle`, `user` | salt-okunur |
| `/api/chat/rooms/pk/candidates` | GET | Oturum+JWT | — | — | evet | `chatPresence`, `chatRoom`, `pKBattle` | salt-okunur |
| `/api/chat/youtube-audio` | GET, POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/chat/youtube-stream` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]` → `../../speak-request/[userId]/reject/route`
- `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/block` → `../../../speak-request/[userId]/block/route`
- `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/reject` → `../../../speak-request/[userId]/reject/route`

---

## /api/live  (19 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/live/create-room` | POST | JWT | — | — | evet | `follow`, `liveFortuneTeller`, `notification`, `videoStream` | POST → durum değiştirir |
| `/api/live/fal-request/[requestId]/complete` | POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/live/fal-request/[requestId]/update` | POST, PATCH | Yok ⚠ | — | — | evet | — | POST, PATCH → durum değiştirir |
| `/api/live/fal-request/create` | POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/live/fal-requests` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/live/gift-types` | GET | JWT | — | — | evet | `giftType` | salt-okunur |
| `/api/live/gift/send` | POST | Oturum+JWT | gift_send | — | evet | `chatRoom`, `chatRoomGift`, `giftType`, `streamGift`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/live/guest` | GET, POST | Oturum+JWT | — | — | evet | `liveGuestInvite`, `liveGuestSession`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/live/guest/list` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/live/heartbeat` | POST | JWT | — | — | evet | `chatPresence`, `chatRoom`, `videoStream`, `videoStreamViewer`, `voiceSession` | POST → durum değiştirir |
| `/api/live/join-room` | POST | JWT | — | — | evet | `chatBan`, `chatPresence`, `chatRoomGift`, `chatUserRole`, `streamGift`, `user` +3 | POST → durum değiştirir |
| `/api/live/leave-room` | POST | JWT | — | — | evet | `chatMessage`, `chatPresence`, `chatRoom`, `videoStream`, `videoStreamViewer`, `voiceSession` | POST → durum değiştirir |
| `/api/live/message` | GET, POST | JWT | chat_message | — | evet | `chatMessage`, `chatPresence`, `chatRoom`, `chatUserRole`, `videoStream`, `videoStreamComment` | POST → durum değiştirir |
| `/api/live/online-users` | GET | JWT | — | — | evet | `chatPresence`, `user`, `videoStreamViewer` | salt-okunur |
| `/api/live/pk` | GET, POST | JWT | pk_create | — | evet | `chatRoom`, `pKBattle`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/live/pk/active` | GET | Yok ⚠ | — | — | evet | `pKBattle` | salt-okunur |
| `/api/live/pk/score` | POST | JWT+Admin | — | — | evet | `pKBattle`, `pkScore` | POST → durum değiştirir |
| `/api/live/rooms` | GET | JWT | — | — | evet | `chatPresence`, `chatRoom`, `videoStream`, `videoStreamViewer` | salt-okunur |
| `/api/live/seats` | GET, POST | JWT | — | — | evet | `chatPresence`, `chatRoom`, `chatUserRole`, `user` | POST → durum değiştirir |

---

## /api/trtc  (3 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/trtc/token` | POST | JWT | — | — | evet | — | POST → durum değiştirir |
| `/api/trtc/usersig` | POST | JWT | — | — | evet | — | POST → durum değiştirir |
| `/api/trtc/webhook` | POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |

---

## /api/video-streams  (34 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/video-streams` | GET, POST | Oturum+JWT | stream_create | — | hayır | `follow`, `liveFortuneTeller`, `notification`, `videoStream`, `videoStreamViewer` | POST → durum değiştirir |
| `/api/video-streams/[streamId]` | GET, PATCH | Oturum+JWT | — | — | evet | `user`, `videoStream`, `videoStreamViewer` | PATCH → durum değiştirir |
| `/api/video-streams/[streamId]/auto-close` | GET, POST | JWT | — | — | evet | `videoStream`, `videoStreamViewer` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/background` | POST, PATCH | Yok ⚠ | — | — | evet | — | POST, PATCH → durum değiştirir |
| `/api/video-streams/[streamId]/ban` | GET, POST, DELETE | JWT | — | — | hayır | `streamBan`, `streamCoBroadcaster`, `user`, `videoStream` | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/co-broadcast` | GET, POST, PATCH | JWT | — | — | hayır | `streamCoBroadcaster`, `user`, `videoStream` | POST, PATCH → durum değiştirir |
| `/api/video-streams/[streamId]/co-broadcast/invite` | POST | JWT | — | — | evet | `streamCoBroadcaster`, `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/comments` | GET, POST | JWT | comment | no-store | hayır | `videoStreamComment` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/end` | POST | JWT | — | — | evet | `videoStream`, `videoStreamViewer` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/fortune-requests` | GET, POST, PATCH, DELETE | JWT | — | — | hayır | `fortuneRequestType`, `streamFortuneRequest`, `user`, `videoStream` | POST, PATCH, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/fortune-requests/my-status` | GET | JWT | — | — | hayır | `streamFortuneRequest` | salt-okunur |
| `/api/video-streams/[streamId]/gifts` | GET, POST | Oturum+JWT | gift_send | — | hayır | `giftType`, `siteAnnouncement`, `streamGift`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/gifts/leaderboard` | GET | Yok ⚠ | — | — | evet | `streamGift`, `user` | salt-okunur |
| `/api/video-streams/[streamId]/image` | POST, PATCH | Yok ⚠ | — | — | evet | — | POST, PATCH → durum değiştirir |
| `/api/video-streams/[streamId]/join` | POST, DELETE | JWT | — | — | evet | `videoStream`, `videoStreamViewer` | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/leave` | POST | JWT | — | — | evet | `videoStream`, `videoStreamViewer` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/like` | GET, POST | JWT | — | — | hayır | `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/live-started` | POST | JWT | — | — | evet | `follow`, `notification`, `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/media-heartbeat` | POST | JWT | — | — | evet | `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/messages` | GET, POST | JWT | — | — | evet | `videoStream`, `videoStreamComment` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/moderator` | GET, POST, DELETE | Yok ⚠ | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/moderators` | GET, POST, DELETE | JWT | — | — | hayır | `streamModerator`, `user`, `videoStream` | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/mute` | GET, POST, DELETE | JWT | — | — | hayır | `streamModerator`, `streamMutedViewer`, `videoStream` | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/pk-battle` | GET, POST | JWT | — | — | evet | `pKBattle`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/video-streams/[streamId]/signal` | GET, POST, DELETE | JWT | — | — | evet | `videoStreamSignal` | POST, DELETE → durum değiştirir |
| `/api/video-streams/[streamId]/stream` | GET | JWT | — | — | evet | `videoStream`, `videoStreamViewer` | salt-okunur |
| `/api/video-streams/[streamId]/sync` | GET | Oturum+JWT | — | — | evet | `giftBox`, `pKBattle`, `videoStream` | salt-okunur |
| `/api/video-streams/[streamId]/viewers` | GET | Yok ⚠ | — | — | evet | `streamGift`, `user`, `videoStreamViewer` | salt-okunur |
| `/api/video-streams/gifts` | GET | JWT | — | — | hayır | — | salt-okunur |
| `/api/video-streams/pk` | GET, POST | Oturum+JWT | pk_create | — | evet | `chatRoom`, `chatUserRole`, `liveGuestSession`, `pKBattle`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/video-streams/pk/candidates` | GET | Oturum+JWT | — | — | evet | `pKBattle`, `videoStream` | salt-okunur |
| `/api/video-streams/pk/list` | GET | Yok ⚠ | — | — | evet | `pKBattle`, `user` | salt-okunur |
| `/api/video-streams/pk/score` | POST | Oturum+JWT | — | — | evet | `pKBattle`, `user` | POST → durum değiştirir |
| `/api/video-streams/signal` | GET, POST, DELETE | JWT | — | — | evet | `videoStreamSignal` | POST, DELETE → durum değiştirir |

---

## /api/gifts  (26 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/gifts/battles` | GET, POST | Oturum+JWT | — | — | evet | `giftBattle` | POST → durum değiştirir |
| `/api/gifts/battles/[battleId]` | GET | Yok ⚠ | — | — | evet | `giftBattle` | salt-okunur |
| `/api/gifts/catalog` | GET | Oturum+JWT | — | — | evet | `giftCollection`, `giftType` | salt-okunur |
| `/api/gifts/check-reciprocal` | POST | JWT | — | — | hayır | `notification` | POST → durum değiştirir |
| `/api/gifts/display-settings` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/gifts/goals` | GET, POST | Oturum+JWT | — | — | evet | `giftGoal` | POST → durum değiştirir |
| `/api/gifts/insights/album/[userId]` | GET | Yok ⚠ | — | — | evet | `giftEvent`, `giftType` | salt-okunur |
| `/api/gifts/insights/badge/[userId]` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/gifts/insights/collection/[userId]` | GET | Yok ⚠ | — | — | evet | `giftEvent`, `giftType` | salt-okunur |
| `/api/gifts/insights/feed` | GET | Yok ⚠ | — | — | evet | `giftEvent`, `giftType`, `user` | salt-okunur |
| `/api/gifts/insights/first-gifter/[context]/[contextId]` | GET | Yok ⚠ | — | — | evet | `giftEvent`, `user` | salt-okunur |
| `/api/gifts/insights/leaderboard` | GET | Yok ⚠ | — | — | evet | `giftEvent`, `user` | salt-okunur |
| `/api/gifts/insights/map` | GET | Yok ⚠ | — | — | evet | `giftEvent` | salt-okunur |
| `/api/gifts/insights/me/badge` | GET | Oturum+JWT | — | — | evet | — | salt-okunur |
| `/api/gifts/insights/me/history` | GET | Oturum+JWT | — | — | evet | `giftEvent`, `giftType`, `user` | salt-okunur |
| `/api/gifts/insights/me/recommendations` | GET | Oturum+JWT | — | — | evet | `giftEvent`, `giftType` | salt-okunur |
| `/api/gifts/lucky/config` | GET | Oturum+JWT | — | — | evet | `giftType`, `luckyGiftTier` | salt-okunur |
| `/api/gifts/lucky/history` | GET | Oturum+JWT | — | — | evet | `giftType`, `luckyGiftReward`, `user` | salt-okunur |
| `/api/gifts/lucky/send` | POST | Oturum+JWT | lucky_gift | — | evet | `creditTransaction`, `giftType`, `luckyGiftReward`, `luckyGiftTier`, `siteAnnouncement`, `user` | POST → durum değiştirir |
| `/api/gifts/missions` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/gifts/missions/[missionId]/claim` | POST | Oturum+JWT | — | — | evet | `giftMission` | POST → durum değiştirir |
| `/api/gifts/missions/me` | GET | Oturum+JWT | — | — | evet | — | salt-okunur |
| `/api/gifts/recent-big` | GET | Yok ⚠ | — | — | hayır | `giftType`, `notification` | salt-okunur |
| `/api/gifts/send` | POST | JWT | — | — | hayır | `giftType`, `jetonTransaction`, `notification`, `siteAnnouncement`, `user` | POST → durum değiştirir |
| `/api/gifts/types` | GET | Yok ⚠ | — | public-10m | evet | — | salt-okunur |
| `/api/gifts/version` | GET | Yok ⚠ | — | — | evet | `giftType`, `roomTheme` | salt-okunur |

---

## /api/gift-box  (4 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/gift-box` | GET, POST | Oturum+JWT | — | — | evet | `chatRoom`, `giftBox`, `giftBoxEntry`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/gift-box/[boxId]` | GET | Yok ⚠ | — | — | evet | `giftBox`, `giftBoxEntry`, `user` | salt-okunur |
| `/api/gift-box/[boxId]/join` | POST | Oturum+JWT | gift_box_join | — | evet | `chatRoom`, `giftBox`, `giftBoxEntry`, `user`, `videoStream` | POST → durum değiştirir |
| `/api/gift-box/share` | POST | Oturum+JWT | gift_box_join | — | evet | `chatRoom`, `shareEvent`, `videoStream` | POST → durum değiştirir |

---

## /api/pk  (5 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/pk/[matchId]` | GET | Yok ⚠ | — | — | evet | `pKBattle` | salt-okunur |
| `/api/pk/[matchId]/stream` | GET | Yok ⚠ | — | — | evet | `pKBattle` | salt-okunur |
| `/api/pk/active` | GET | Yok ⚠ | — | — | evet | `pKBattle` | salt-okunur |
| `/api/pk/leaderboard` | GET | Yok ⚠ | — | — | evet | `pKBattle`, `user` | salt-okunur |
| `/api/pk/me/invites` | GET | Oturum+JWT | — | — | evet | `pKBattle` | salt-okunur |

---

## /api/room  (7 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/room/[sessionId]` | GET, PATCH | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession`, `tellerChatSession`, `user` | PATCH → durum değiştirir |
| `/api/room/[sessionId]/messages` | GET, POST | Oturum+JWT | — | — | evet | `liveSession`, `liveSessionMessage` | POST → durum değiştirir |
| `/api/room/[sessionId]/review` | GET, POST | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession`, `liveTellerReview` | POST → durum değiştirir |
| `/api/room/[sessionId]/stream` | GET | Oturum+JWT | — | — | evet | `liveSession`, `liveSessionMessage` | salt-okunur |
| `/api/room/[sessionId]/summary` | GET | Oturum+JWT | — | — | evet | `liveSession` | salt-okunur |
| `/api/room/[sessionId]/tip` | POST | Oturum+JWT | tip | — | evet | `liveFortuneTeller`, `liveSession`, `liveSessionMessage`, `user` | POST → durum değiştirir |
| `/api/room/signal` | GET, POST, DELETE | Oturum+JWT | — | — | evet | `liveSession`, `roomSignal` | POST, DELETE → durum değiştirir |

---

## /api/music  (2 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/music/history` | GET | Yok ⚠ | — | — | evet | `chatMessage` | salt-okunur |
| `/api/music/search` | GET | JWT | — | — | evet | — | salt-okunur |

---

## /api/notifications  (5 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/notifications` | GET, POST, DELETE | JWT | — | — | evet | `notification` | POST, DELETE → durum değiştirir |
| `/api/notifications/[notificationId]/read` | POST, PATCH | JWT | — | — | evet | `notification` | POST, PATCH → durum değiştirir |
| `/api/notifications/payment` | GET, DELETE | JWT | — | — | evet | `notification` | DELETE → durum değiştirir |
| `/api/notifications/stream` | GET | JWT | — | — | evet | `notification` | salt-okunur |
| `/api/notifications/unread` | GET | JWT | — | — | evet | `notification` | salt-okunur |

---

## /api/messages  (7 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/messages` | GET | JWT | — | — | hayır | `conversation`, `directMessage`, `messageRequest` | salt-okunur |
| `/api/messages/[userId]` | GET, POST | JWT | chat_message | — | hayır | `conversation`, `directMessage`, `follow`, `messageRequest`, `user` | POST → durum değiştirir |
| `/api/messages/[userId]/[messageId]` | GET, DELETE | JWT | — | — | evet | `directMessage` | DELETE → durum değiştirir |
| `/api/messages/conversations/[peerId]/messages` | GET, POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/messages/conversations/[peerId]/stream` | GET | JWT | — | — | evet | `directMessage` | salt-okunur |
| `/api/messages/conversations/[peerId]/typing` | GET, POST | JWT | — | — | evet | — | POST → durum değiştirir |
| `/api/messages/request` | POST, PATCH | JWT | — | — | hayır | `messageRequest` | POST, PATCH → durum değiştirir |

---

## /api/user  (37 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/user/[userId]/achievements` | GET | JWT | — | — | evet | `achievement`, `jetonTransaction`, `socialLike`, `user`, `userAchievement`, `videoStream` | salt-okunur |
| `/api/user/[userId]/follow` | POST, DELETE | JWT | — | — | evet | `follow` | POST, DELETE → durum değiştirir |
| `/api/user/[userId]/follow-status` | GET | JWT | — | — | evet | `follow` | salt-okunur |
| `/api/user/account` | POST, DELETE | JWT | — | — | evet | `account`, `accountDeletion`, `session`, `user`, `userDevice`, `videoStream` | POST, DELETE → durum değiştirir |
| `/api/user/account/delete` | POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/user/achievements` | GET | JWT | — | — | evet | `achievement`, `creditTransaction`, `fortune`, `socialLike`, `user`, `userAchievement` +1 | salt-okunur |
| `/api/user/active-sessions` | GET | JWT | — | — | evet | `liveSession` | salt-okunur |
| `/api/user/activity` | GET, PATCH | JWT | — | — | evet | `notification` | PATCH → durum değiştirir |
| `/api/user/block` | GET, POST | JWT | — | — | evet | `follow`, `user`, `userBlock` | POST → durum değiştirir |
| `/api/user/blocked` | GET, DELETE | JWT | — | — | evet | `chatBan`, `streamBan`, `user`, `videoStream` | DELETE → durum değiştirir |
| `/api/user/broadcast-history` | GET | JWT | — | — | evet | `videoStream` | salt-okunur |
| `/api/user/co-broadcast-invites` | GET | JWT | — | — | evet | `streamCoBroadcaster`, `videoStream` | salt-okunur |
| `/api/user/credits` | GET | JWT | — | — | evet | `user` | salt-okunur |
| `/api/user/daily-tasks` | GET, POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/user/device-token` | POST, DELETE | Yok ⚠ | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/user/favorites` | GET, POST | JWT | — | — | evet | `userFavorite` | POST → durum değiştirir |
| `/api/user/favorites/[favoriteId]` | DELETE | JWT | — | — | evet | `userFavorite` | DELETE → durum değiştirir |
| `/api/user/followers` | GET | JWT | — | private-5m | evet | `follow` | salt-okunur |
| `/api/user/following` | GET | JWT | — | private-5m | evet | `follow` | salt-okunur |
| `/api/user/fortunes` | GET | JWT | — | — | evet | `fortune` | salt-okunur |
| `/api/user/fortunes/[fortuneId]` | PATCH | JWT | — | — | evet | `fortune` | PATCH → durum değiştirir |
| `/api/user/fortunes/[fortuneId]/pin` | POST, PATCH | JWT | — | — | evet | `fortune` | POST, PATCH → durum değiştirir |
| `/api/user/fortunes/[fortuneId]/rate` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/user/likers` | GET | JWT | — | — | evet | `socialLike`, `socialPost` | salt-okunur |
| `/api/user/location` | GET, POST | Yok ⚠ | — | — | evet | `user` | POST → durum değiştirir |
| `/api/user/profile` | GET, PATCH | JWT | — | — | evet | `socialLike`, `user` | PATCH → durum değiştirir |
| `/api/user/received-gifts` | GET | JWT | — | — | evet | `chatRoomGift` | salt-okunur |
| `/api/user/referral-earnings` | GET | Oturum+JWT | — | — | evet | `referralCommission`, `user` | salt-okunur |
| `/api/user/report` | POST | JWT | report | — | evet | `user`, `userReport` | POST → durum değiştirir |
| `/api/user/social-settings` | GET, PUT | Yok ⚠ | — | — | evet | `user` | PUT → durum değiştirir |
| `/api/user/statistics` | GET | JWT | — | — | evet | `creditTransaction`, `fortune`, `fortuneRating`, `profileView`, `socialComment`, `socialLike` +6 | salt-okunur |
| `/api/user/stats` | GET, POST | JWT | — | — | evet | `fortune`, `socialLike`, `user` | POST → durum değiştirir |
| `/api/user/story` | GET, POST, DELETE | Yok ⚠ | — | — | evet | — | POST, DELETE → durum değiştirir |
| `/api/user/theme` | GET, PATCH | JWT | — | — | evet | `user` | PATCH → durum değiştirir |
| `/api/user/wallet` | GET | Oturum+JWT | — | — | evet | `creditTransaction`, `jetonTransaction`, `liveFortuneTeller`, `user`, `withdrawalRequest` | salt-okunur |
| `/api/user/watch-ad` | GET, POST | JWT | — | — | evet | `siteSetting`, `user` | POST → durum değiştirir |
| `/api/user/xp` | GET | JWT | — | — | evet | `user` | salt-okunur |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/user/account/delete` → `../route`
- `/api/user/daily-tasks` → `@/app/api/daily-missions/route`
- `/api/user/device-token` → `@/app/api/devices/fcm/route`
- `/api/user/story` → `@/app/api/stories/route`

---

## /api/users  (10 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/users/[userId]` | GET | JWT | — | — | evet | `follow`, `notification`, `profileView`, `socialLike`, `user` | salt-okunur |
| `/api/users/[userId]/follow` | GET, POST | JWT | — | — | evet | `follow`, `user` | POST → durum değiştirir |
| `/api/users/[userId]/posts` | GET | JWT | — | — | evet | `socialPost`, `user` | salt-okunur |
| `/api/users/lookup/[username]` | GET | JWT | — | — | evet | `follow`, `socialLike`, `user` | salt-okunur |
| `/api/users/me/activity` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/users/me/broadcast-history` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/users/me/profile-visitors` | GET, POST | Yok ⚠ | — | — | evet | — | POST → durum değiştirir |
| `/api/users/me/stats` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/users/online` | GET | Yok ⚠ | — | — | evet | `sitePresence`, `user` | salt-okunur |
| `/api/users/search` | GET | JWT | — | — | evet | `user` | salt-okunur |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/users/me/activity` → `@/app/api/user/activity/route`
- `/api/users/me/broadcast-history` → `@/app/api/user/broadcast-history/route`
- `/api/users/me/profile-visitors` → `@/app/api/me/profile-visitors/route`
- `/api/users/me/stats` → `@/app/api/user/stats/route`

---

## /api/me  (9 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/me` | GET, PATCH | JWT | — | — | evet | `user` | PATCH → durum değiştirir |
| `/api/me/admin-capabilities` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/me/membership` | GET | VIP | — | — | evet | `user` | salt-okunur |
| `/api/me/membership-events` | GET | VIP | — | — | evet | `membershipEvent` | salt-okunur |
| `/api/me/membership-history` | GET, PUT | VIP | — | — | evet | `membershipGrant`, `membershipPurchase` | PUT → durum değiştirir |
| `/api/me/profile-visitors` | GET, POST | VIP | — | — | evet | `profileVisit`, `user` | POST → durum değiştirir |
| `/api/me/vip-identity` | GET, PUT | VIP | — | — | evet | `user` | PUT → durum değiştirir |
| `/api/me/vip-preferences` | GET, PUT | VIP | — | — | evet | `userVipPreference` | PUT → durum değiştirir |
| `/api/me/vip-xp` | GET, POST | VIP | — | — | evet | — | POST → durum değiştirir |

---

## /api/fortunes  (15 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/fortunes/ask-uyumu` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/aura-analizi` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/burc-yorumu` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/dogum-haritasi` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/el-fali` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/evet-hayir` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/istihare` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/kahve-fali` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/kahve-fali-image` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/katina` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/kursundokme` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/melek-kartlari` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/numeroloji` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/ruya-yorumu` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |
| `/api/fortunes/tarot-fali` | POST | JWT | — | — | evet | `fortune` | POST → durum değiştirir |

---

## /api/fortune-tellers  (13 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/fortune-tellers` | GET, POST | JWT | — | — | evet | `favoriteTeller`, `liveFortuneTeller`, `liveTellerReview`, `videoStream` | POST → durum değiştirir |
| `/api/fortune-tellers/[tellerId]` | GET, PATCH | Oturum+JWT | — | — | evet | `favoriteTeller`, `liveFortuneTeller` | PATCH → durum değiştirir |
| `/api/fortune-tellers/[tellerId]/reviews` | GET | Yok ⚠ | — | — | evet | `liveTellerReview` | salt-okunur |
| `/api/fortune-tellers/[tellerId]/session` | GET, POST | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession`, `user` | POST → durum değiştirir |
| `/api/fortune-tellers/apply` | POST | JWT | — | — | evet | `liveFortuneTeller`, `user` | POST → durum değiştirir |
| `/api/fortune-tellers/awards` | GET | Yok ⚠ | — | — | evet | `tellerAward` | salt-okunur |
| `/api/fortune-tellers/gifts` | GET | Yok ⚠ | — | — | evet | `tellerGift`, `user` | salt-okunur |
| `/api/fortune-tellers/my-profile` | GET | JWT | — | — | evet | `liveFortuneTeller` | salt-okunur |
| `/api/fortune-tellers/session` | GET, POST | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession`, `user` | POST → durum değiştirir |
| `/api/fortune-tellers/sessions` | GET | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession` | salt-okunur |
| `/api/fortune-tellers/sessions/[sessionId]` | PATCH | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession`, `tellerChatSession`, `user` | PATCH → durum değiştirir |
| `/api/fortune-tellers/sessions/stream` | GET | Oturum+JWT | — | — | evet | `liveFortuneTeller`, `liveSession` | salt-okunur |
| `/api/fortune-tellers/toggle-online` | GET, POST | JWT | — | — | evet | `liveFortuneTeller` | POST → durum değiştirir |

---

## /api/short-videos  (25 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/short-videos` | GET | JWT | — | — | evet | `follow`, `shortVideo` | salt-okunur |
| `/api/short-videos/[id]` | GET, DELETE | JWT | — | — | evet | `shortVideo` | DELETE → durum değiştirir |
| `/api/short-videos/[id]/comments` | GET, POST | JWT | comment | — | evet | `follow`, `shortVideo`, `shortVideoComment`, `user` | POST → durum değiştirir |
| `/api/short-videos/[id]/comments/[commentId]` | DELETE | JWT | — | — | evet | `shortVideo`, `shortVideoComment` | DELETE → durum değiştirir |
| `/api/short-videos/[id]/comments/[commentId]/like` | POST | JWT | — | — | evet | `shortVideoComment`, `shortVideoCommentLike` | POST → durum değiştirir |
| `/api/short-videos/[id]/comments/[commentId]/pin` | POST | JWT | — | — | evet | `shortVideo`, `shortVideoComment` | POST → durum değiştirir |
| `/api/short-videos/[id]/duets` | GET | JWT | — | — | evet | `shortVideo` | salt-okunur |
| `/api/short-videos/[id]/like` | POST | JWT | — | — | evet | `shortVideo`, `shortVideoLike`, `user` | POST → durum değiştirir |
| `/api/short-videos/[id]/save` | POST | JWT | — | — | evet | `shortVideo`, `shortVideoSave` | POST → durum değiştirir |
| `/api/short-videos/[id]/share` | POST | JWT | — | — | evet | `shortVideo` | POST → durum değiştirir |
| `/api/short-videos/[id]/subtitles/generate` | POST | JWT | ai_generate | — | evet | `shortVideo` | POST → durum değiştirir |
| `/api/short-videos/[id]/view` | POST | JWT | — | — | evet | `shortVideo`, `shortVideoView` | POST → durum değiştirir |
| `/api/short-videos/explore` | GET | JWT | — | — | evet | `hashtag`, `shortVideo`, `shortVideoMusic` | salt-okunur |
| `/api/short-videos/explore/nearby` | GET | JWT | — | — | evet | `shortVideo` | salt-okunur |
| `/api/short-videos/hashtags/search` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/short-videos/hashtags/trending` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/short-videos/mentions/search` | GET | Yok ⚠ | — | — | evet | `user` | salt-okunur |
| `/api/short-videos/music` | GET | Yok ⚠ | — | — | evet | `shortVideoMusic` | salt-okunur |
| `/api/short-videos/music/recommend` | GET | Yok ⚠ | — | — | evet | `shortVideoMusic` | salt-okunur |
| `/api/short-videos/profile/[userId]` | GET | JWT | — | — | evet | `follow`, `shortVideo`, `user` | salt-okunur |
| `/api/short-videos/register` | POST | JWT | — | — | evet | — | POST → durum değiştirir |
| `/api/short-videos/upload` | POST | JWT | upload | — | evet | — | POST → durum değiştirir |
| `/api/short-videos/upload-url` | POST | JWT | — | — | evet | — | POST → durum değiştirir |
| `/api/short-videos/user/[userId]` | GET | JWT | — | — | evet | `shortVideo`, `shortVideoLike`, `shortVideoSave` | salt-okunur |
| `/api/short-videos/viewed/me` | GET | JWT | — | — | evet | `shortVideoView` | salt-okunur |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/short-videos/hashtags/search` → `@/app/api/hashtags/search/route`
- `/api/short-videos/hashtags/trending` → `@/app/api/hashtags/trending/route`

---

## /api/social  (11 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/social/actions` | GET, POST | Yok ⚠ | — | — | evet | `socialAction`, `user` | POST → durum değiştirir |
| `/api/social/announcements` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/social/discovery` | GET | Yok ⚠ | — | — | evet | `user` | salt-okunur |
| `/api/social/posts` | GET, POST | JWT | content_create | — | evet | `fortune`, `socialPost` | POST → durum değiştirir |
| `/api/social/posts/[postId]` | GET, DELETE | JWT | — | — | evet | `socialPost` | DELETE → durum değiştirir |
| `/api/social/posts/[postId]/comments` | GET, POST, DELETE | JWT | comment | — | evet | `socialComment`, `socialPost` | POST, DELETE → durum değiştirir |
| `/api/social/posts/[postId]/likes` | POST | JWT | — | — | evet | `socialLike`, `socialPost` | POST → durum değiştirir |
| `/api/social/posts/[postId]/view` | POST | Yok ⚠ | — | — | evet | `fortune`, `socialPost` | POST → durum değiştirir |
| `/api/social/profile` | GET | Yok ⚠ | — | — | evet | `customBadge`, `follow`, `profileVisit`, `socialAction`, `user` | salt-okunur |
| `/api/social/public-stats` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/social/stories` | GET, POST, DELETE | Yok ⚠ | — | — | evet | — | POST, DELETE → durum değiştirir |

**Yönlendirme/yeniden dışa aktarım:**

- `/api/social/announcements` → `@/app/api/announcements/route`
- `/api/social/public-stats` → `@/app/api/public-stats/route`
- `/api/social/stories` → `@/app/api/stories/route`

---

## /api/payments  (6 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/payments/config` | GET | JWT | — | — | evet | — | salt-okunur |
| `/api/payments/methods` | GET | Yok ⚠ | — | — | hayır | — | salt-okunur |
| `/api/payments/notifications/[notificationId]/dispute` | GET, POST | Admin | report | — | evet | `paymentNotification`, `supportTicket`, `user` | POST → durum değiştirir |
| `/api/payments/notify` | GET, POST | Oturum+JWT | — | — | evet | `paymentNotification`, `supportTicket`, `user` | POST → durum değiştirir |
| `/api/payments/requests` | GET, POST | JWT | payment | — | evet | `cfcPaymentRequest`, `user` | POST → durum değiştirir |
| `/api/payments/settings` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |

---

## /api/memberships  (5 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/memberships` | GET | Yok ⚠ | — | — | evet | `membershipPlan` | salt-okunur |
| `/api/memberships/comparison` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/memberships/gift` | POST | JWT | membership | — | evet | `jetonTransaction`, `membershipPlan`, `membershipPurchase`, `user` | POST → durum değiştirir |
| `/api/memberships/packages` | GET | Yok ⚠ | — | — | evet | `membershipPlan` | salt-okunur |
| `/api/memberships/purchase` | POST | JWT | membership | — | evet | `jetonTransaction`, `membershipPlan`, `membershipPurchase`, `user` | POST → durum değiştirir |

---

## /api/presence  (3 route)

| Yol | Metot | Yetki | Rate | Cache | Dinamik | Veri modelleri | Yan etki |
|---|---|---|---|---|---|---|---|
| `/api/presence` | GET, POST | JWT | — | — | evet | `sitePresence`, `siteVisit`, `user`, `userDailyActivity`, `userHourlyActivity`, `userLoginSession` | POST → durum değiştirir |
| `/api/presence/online-events` | GET | Yok ⚠ | — | — | evet | — | salt-okunur |
| `/api/presence/sections` | GET | Yok ⚠ | — | — | evet | `sitePresence` | salt-okunur |
