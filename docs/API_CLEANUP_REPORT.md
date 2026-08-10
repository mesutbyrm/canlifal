# API_CLEANUP_REPORT.md — Temizlik Adayları ve Kanıt Durumu

> **AŞAMA A çıktısı — HİÇBİR ŞEY SİLİNMEDİ.** Bu rapor yalnızca *aday* listeler ve her aday için elimizdeki kanıtı belirtir.  
> Silme kararı **Aşama C**'de, aşağıdaki her satır için ayrı ayrı kanıt tamamlandıktan sonra ve kullanıcı onayıyla verilecektir.

## Sınıflandırma anahtarı

| Etiket | Anlamı |
|---|---|
| `DUPLICATE-CONFIRMED` | İki backend'de aynı path mevcut — kod kanıtı var |
| `UNREFERENCED` | Taranan istemci kaynaklarında hiçbir çağrı bulunamadı |
| `EXTERNAL-CALLER-LIKELY` | Referanssız ama dışarıdan çağrılıyor olabilir (webhook / mağaza / cron) — **silinemez** |
| `CLIENT-CALLS-MISSING-ENDPOINT` | Flutter çağırıyor ama hiçbir backend'de yok → 404 üretiyor |
| `SCHEMA-WITHOUT-ENDPOINT` | Veritabanı modeli var, uç yok |
| `UNKNOWN` | Karar için ek kanıt gerekiyor |

---

## 1. `DUPLICATE-CONFIRMED` — İki backend'de aynı path (110 adet)

Ana backend (`canlifal.com`) ile ikinci backend (Express, `canlifalapi.abacusai.app`) **birebir aynı 110 adresi** yayınlıyor.
Bu, projedeki en büyük yapısal sorun: aynı iş iki yerde, iki ayrı veritabanı şemasıyla yapılıyor.

| # | Duplicate path |
|---:|---|
| 1 | `/api/admin/cfc-payment-requests` |
| 2 | `/api/admin/cfc-settings` |
| 3 | `/api/admin/notifications` |
| 4 | `/api/announcements` |
| 5 | `/api/auth/forgot-password` |
| 6 | `/api/auth/logout` |
| 7 | `/api/auth/mobile-google` |
| 8 | `/api/auth/mobile-login` |
| 9 | `/api/auth/mobile-refresh` |
| 10 | `/api/auth/mobile-register` |
| 11 | `/api/auth/mobile-tiktok` |
| 12 | `/api/chat/rooms` |
| 13 | `/api/chat/rooms/*/dj` |
| 14 | `/api/chat/rooms/*/gifts` |
| 15 | `/api/chat/rooms/*/messages` |
| 16 | `/api/chat/rooms/*/music-queue` |
| 17 | `/api/chat/rooms/*/presence` |
| 18 | `/api/chat/rooms/*/seats` |
| 19 | `/api/chat/rooms/*/song-request` |
| 20 | `/api/chat/rooms/*/stream` |
| 21 | `/api/chat/rooms/backgrounds` |
| 22 | `/api/chat/rooms/create` |
| 23 | `/api/chat/youtube-stream` |
| 24 | `/api/devices/fcm` |
| 25 | `/api/fortune-tellers` |
| 26 | `/api/fortune-tellers/*` |
| 27 | `/api/fortune-tellers/apply` |
| 28 | `/api/fortune-tellers/my-profile` |
| 29 | `/api/fortune-tellers/session` |
| 30 | `/api/fortune-tellers/sessions` |
| 31 | `/api/fortune-tellers/sessions/*` |
| 32 | `/api/fortune-tellers/sessions/stream` |
| 33 | `/api/fortune-tellers/toggle-online` |
| 34 | `/api/games` |
| 35 | `/api/games/leaderboard` |
| 36 | `/api/games/profile` |
| 37 | `/api/games/room/*` |
| 38 | `/api/games/room/*/chat` |
| 39 | `/api/jeton` |
| 40 | `/api/live/create-room` |
| 41 | `/api/live/gift-types` |
| 42 | `/api/live/gift/send` |
| 43 | `/api/live/heartbeat` |
| 44 | `/api/live/join-room` |
| 45 | `/api/live/leave-room` |
| 46 | `/api/live/message` |
| 47 | `/api/live/online-users` |
| 48 | `/api/live/pk` |
| 49 | `/api/live/pk/score` |
| 50 | `/api/live/rooms` |
| 51 | `/api/live/seats` |
| 52 | `/api/me` |
| 53 | `/api/messages` |
| 54 | `/api/messages/*` |
| 55 | `/api/music/search` |
| 56 | `/api/notifications` |
| 57 | `/api/platform/commission-rate` |
| 58 | `/api/public-stats` |
| 59 | `/api/referral` |
| 60 | `/api/short-videos` |
| 61 | `/api/short-videos/*` |
| 62 | `/api/short-videos/*/comments` |
| 63 | `/api/short-videos/*/like` |
| 64 | `/api/short-videos/*/save` |
| 65 | `/api/short-videos/*/share` |
| 66 | `/api/short-videos/*/view` |
| 67 | `/api/short-videos/profile/*` |
| 68 | `/api/short-videos/upload` |
| 69 | `/api/short-videos/user/*` |
| 70 | `/api/social/posts` |
| 71 | `/api/social/posts/*` |
| 72 | `/api/social/posts/*/comments` |
| 73 | `/api/social/posts/*/likes` |
| 74 | `/api/stories` |
| 75 | `/api/teller-chat/*` |
| 76 | `/api/tournaments` |
| 77 | `/api/trend-videos` |
| 78 | `/api/trtc/token` |
| 79 | `/api/trtc/usersig` |
| 80 | `/api/user/activity` |
| 81 | `/api/user/broadcast-history` |
| 82 | `/api/user/co-broadcast-invites` |
| 83 | `/api/user/credits` |
| 84 | `/api/user/fortunes` |
| 85 | `/api/user/fortunes/*` |
| 86 | `/api/users/*` |
| 87 | `/api/users/*/follow` |
| 88 | `/api/users/lookup/*` |
| 89 | `/api/users/search` |
| 90 | `/api/video-streams` |
| 91 | `/api/video-streams/*` |
| 92 | `/api/video-streams/*/ban` |
| 93 | `/api/video-streams/*/co-broadcast` |
| 94 | `/api/video-streams/*/co-broadcast/invite` |
| 95 | `/api/video-streams/*/end` |
| 96 | `/api/video-streams/*/fortune-requests` |
| 97 | `/api/video-streams/*/fortune-requests/my-status` |
| 98 | `/api/video-streams/*/gifts` |
| 99 | `/api/video-streams/*/join` |
| 100 | `/api/video-streams/*/leave` |
| 101 | `/api/video-streams/*/like` |
| 102 | `/api/video-streams/*/live-started` |
| 103 | `/api/video-streams/*/messages` |
| 104 | `/api/video-streams/*/moderators` |
| 105 | `/api/video-streams/*/mute` |
| 106 | `/api/video-streams/*/pk-battle` |
| 107 | `/api/video-streams/*/signal` |
| 108 | `/api/video-streams/*/stream` |
| 109 | `/api/video-streams/gifts` |
| 110 | `/api/wallet` |

**Karar notu:** Bu 110 uçtan hiçbiri Aşama A'da silinmez. Aşama C'de her biri için şu sorular yanıtlanacak:
hangi backend'i Flutter fiilen çağırıyor · hangi veritabanı tablosuna yazıyor · veri iki tarafta da var mı · tek tarafa alınırsa veri kaybı olur mu.

## 2. `CLIENT-CALLS-MISSING-ENDPOINT` — Flutter çağırıyor, hiçbir backend'de yok (120 adet)

Bunlar **çalışmayan özelliklerdir**; temizlik değil, *tamamlama* konusudur.

| # | Flutter'ın çağırdığı path |
|---:|---|
| 1 | `/api/` |
| 2 | `/api/admin/gifts/revenue/rules` |
| 3 | `/api/admin/mobile-auth` |
| 4 | `/api/admin/voice-room-backgrounds` |
| 5 | `/api/auth/mobile/device-token` |
| 6 | `/api/blog/$slug` |
| 7 | `/api/blog/recent` |
| 8 | `/api/celebrities/$id` |
| 9 | `/api/celebrities/$id/follow` |
| 10 | `/api/celebrities/$id/posts` |
| 11 | `/api/chat/rooms/$roomId` |
| 12 | `/api/chat/rooms/$roomId/join-seat` |
| 13 | `/api/chat/rooms/$roomId/kick` |
| 14 | `/api/chat/rooms/$roomId/messages/$messageId` |
| 15 | `/api/chat/rooms/$roomId/mute` |
| 16 | `/api/chat/rooms/$roomId/pk/$battleId/end` |
| 17 | `/api/chat/rooms/$roomId/pk/$inviteId/respond` |
| 18 | `/api/chat/rooms/$roomId/roles` |
| 19 | `/api/chat/rooms/cm123/pk/battle-1/end` |
| 20 | `/api/chat/rooms/cm123/pk/inv-1/respond` |
| 21 | `/api/chat/rooms/{id}/pk[...]` |
| 22 | `/api/fan-clubs/$id/join` |
| 23 | `/api/fan-clubs/$id/polls` |
| 24 | `/api/fan-clubs/$id/posts` |
| 25 | `/api/fan-clubs/popular` |
| 26 | `/api/fortune-access/consume` |
| 27 | `/api/fortune-access/settings` |
| 28 | `/api/fortunes/$slug` |
| 29 | `/api/games/quests/$questId` |
| 30 | `/api/gifts/battles` |
| 31 | `/api/gifts/battles/$id` |
| 32 | `/api/gifts/goals` |
| 33 | `/api/gifts/insights/` |
| 34 | `/api/gifts/insights/album/$userId` |
| 35 | `/api/gifts/insights/album/{userId}` |
| 36 | `/api/gifts/insights/badge/$userId` |
| 37 | `/api/gifts/insights/badge/{id}` |
| 38 | `/api/gifts/insights/collection/$userId` |
| 39 | `/api/gifts/insights/collection/{userId}` |
| 40 | `/api/gifts/insights/feed` |
| 41 | `/api/gifts/insights/first-gifter/$context/$contextId` |
| 42 | `/api/gifts/insights/first-gifter/{ctx}/{id}` |
| 43 | `/api/gifts/insights/leaderboard` |
| 44 | `/api/gifts/insights/map` |
| 45 | `/api/gifts/insights/me/badge` |
| 46 | `/api/gifts/insights/me/history` |
| 47 | `/api/gifts/insights/me/recommendations` |
| 48 | `/api/gifts/missions` |
| 49 | `/api/gifts/missions/$id/claim` |
| 50 | `/api/gifts/missions/me` |
| 51 | `/api/live-fal/pending` |
| 52 | `/api/live-fal/request/$requestId/accept` |
| 53 | `/api/live-fal/request/$requestId/reject` |
| 54 | `/api/live/guest/` |
| 55 | `/api/live/guest/list` |
| 56 | `/api/live/pk/active` |
| 57 | `/api/live/pk/sweep` |
| 58 | `/api/live/streams` |
| 59 | `/api/membership/plans` |
| 60 | `/api/messages/conversations/$id/stream` |
| 61 | `/api/mobile/auth/web-session` |
| 62 | `/api/notifications/unread` |
| 63 | `/api/pk/$matchId` |
| 64 | `/api/pk/$matchId/cancel` |
| 65 | `/api/pk/$matchId/end` |
| 66 | `/api/pk/$matchId/events` |
| 67 | `/api/pk/$matchId/respond` |
| 68 | `/api/pk/$matchId/seats/join` |
| 69 | `/api/pk/$matchId/seats/kick` |
| 70 | `/api/pk/$matchId/seats/leave` |
| 71 | `/api/pk/$matchId/start` |
| 72 | `/api/pk/$matchId/stream` |
| 73 | `/api/pk/active` |
| 74 | `/api/pk/admin/$matchId/force-end` |
| 75 | `/api/pk/admin/$matchId/force-kick/$userId` |
| 76 | `/api/pk/admin/ban` |
| 77 | `/api/pk/admin/bans` |
| 78 | `/api/pk/admin/unban/$userId` |
| 79 | `/api/pk/cm123/stream` |
| 80 | `/api/pk/leaderboard` |
| 81 | `/api/pk/me/history` |
| 82 | `/api/pk/me/invites` |
| 83 | `/api/pk/me/matches` |
| 84 | `/api/pk/me/stats` |
| 85 | `/api/pk/request` |
| 86 | `/api/pk/room` |
| 87 | `/api/pk/stats/$userId` |
| 88 | `/api/pk/stats/:userId` |
| 89 | `/api/pk/{id}/events` |
| 90 | `/api/rooms/$roomId/music/current` |
| 91 | `/api/short-videos/$id/analytics` |
| 92 | `/api/short-videos/$id/gifts` |
| 93 | `/api/short-videos/$id/subtitles/generate` |
| 94 | `/api/short-videos/explore/nearby` |
| 95 | `/api/short-videos/hashtags/$name` |
| 96 | `/api/short-videos/hashtags/search` |
| 97 | `/api/short-videos/hashtags/trending` |
| 98 | `/api/short-videos/music/recommend` |
| 99 | `/api/social/announcements` |
| 100 | `/api/social/fortune-tellers` |
| 101 | `/api/social/public-stats` |
| 102 | `/api/teller/gifts` |
| 103 | `/api/teller/reviews` |
| 104 | `/api/user/cosmetics` |
| 105 | `/api/user/cosmetics/equip` |
| 106 | `/api/user/cosmetics/loadout` |
| 107 | `/api/user/daily-tasks` |
| 108 | `/api/user/device-token` |
| 109 | `/api/user/fortunes/$fortuneId/pin` |
| 110 | `/api/user/fortunes/$fortuneId/rate` |
| 111 | `/api/user/profile/cosmetics/equip` |
| 112 | `/api/user/story` |
| 113 | `/api/users/me/profile-visitors` |
| 114 | `/api/v1/$trimmed` |
| 115 | `/api/v1/${trimmed.substring` |
| 116 | `/api/v1/...` |
| 117 | `/api/v1/auth/mobile-login` |
| 118 | `/api/v1/me` |
| 119 | `/api/video-streams/$streamId/background` |
| 120 | `/api/video-streams/$streamId/image` |

> `/api/v1/...` ile başlayanlar Express'in `/api/v1` mount'una ait sürüm karmaşasıdır; `/api/`, `/api/v1/...` gibi kalıplar dinamik string üretiminden gelen taranamayan adreslerdir ve `UNKNOWN` sayılmalıdır.

## 3. `UNREFERENCED` — Hiçbir istemciden çağrılmayan ana backend route'ları (42 adet)

| Route | Derin grep ipucu | Ön sınıf |
|---|---|---|
| `/api/admin/blog/import` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/admin/blog/schedule-publish` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/admin/cache` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/admin/fortunes` | — | `UNREFERENCED` |
| `/api/admin/teller-levels` | — | `UNREFERENCED` |
| `/api/announcements/event` | — | `UNREFERENCED` |
| `/api/anonymous` | — | `UNREFERENCED` |
| `/api/anonymous/watch-ad` | — | `UNREFERENCED` |
| `/api/avatar-accessories` | — | `UNREFERENCED` |
| `/api/cache` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/chat-bubbles` | — | `UNREFERENCED` |
| `/api/chat/cleanup` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/chat/rooms/pk-list` | — | `UNREFERENCED` |
| `/api/dreams/[slug]/comments` | — | `UNREFERENCED` |
| `/api/dreams/[slug]/favorite` | {'web': 1} | `UNKNOWN` |
| `/api/dreams/[slug]/view` | — | `UNREFERENCED` |
| `/api/dreams/morning-reminder` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/emoji-packs` | — | `UNREFERENCED` |
| `/api/entrance-effects` | — | `UNREFERENCED` |
| `/api/fortune-tellers/[tellerId]/reviews` | — | `UNREFERENCED` |
| `/api/games/room/[roomId]/replace-ai` | — | `UNREFERENCED` |
| `/api/gift-engine/finish` | — | `UNREFERENCED` |
| `/api/gift-engine/gifts` | — | `UNREFERENCED` |
| `/api/gift-engine/queue` | — | `UNREFERENCED` |
| `/api/hashtags/[name]` | — | `UNREFERENCED` |
| `/api/hashtags/search` | {'flutter': 1} | `UNKNOWN` |
| `/api/hashtags/trending` | {'flutter': 1} | `UNKNOWN` |
| `/api/legal/child-safety` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/mic-frames` | — | `UNREFERENCED` |
| `/api/monitoring` | {'lib': 1} | `EXTERNAL-CALLER-LIKELY` |
| `/api/music/history` | — | `UNREFERENCED` |
| `/api/name-effects` | — | `UNREFERENCED` |
| `/api/room-themes` | — | `UNREFERENCED` |
| `/api/room-themes/catalog` | — | `UNREFERENCED` |
| `/api/room/[sessionId]/stream` | — | `UNREFERENCED` |
| `/api/seo-settings` | — | `UNREFERENCED` |
| `/api/teller/verification` | — | `UNREFERENCED` |
| `/api/tencent/webhook` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/tiktok-videos/oembed` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/trends/[slug]` | {'web': 1, 'flutter': 1} | `UNKNOWN` |
| `/api/trtc/webhook` | — | `EXTERNAL-CALLER-LIKELY` |
| `/api/video-streams/signal` | — | `UNREFERENCED` |

**Uyarı:** `UNREFERENCED` etiketi "sil" demek değildir. Webhook uçları (`/api/tencent/webhook`, `/api/trtc/webhook`), mağaza uyum sayfası (`/api/legal/child-safety`), izleme (`/api/monitoring`, `/api/cache`) ve zamanlanmış görev uçları dışarıdan çağrılır; istemci kodunda referansları görünmez. **Bunlar silinemez.**

## 4. `SCHEMA-WITHOUT-ENDPOINT` — Kodda hiç sorgulanmayan veritabanı modelleri (36 adet)

`AnonymousFortune`, `AvatarAccessory`, `CelebrityFollow`, `CelebrityPostComment`, `CelebrityPostLike`, `ChatBubbleSkin`, `EmojiPack`, `EntranceEffect`, `FanClub`, `FanClubMember`, `FanClubPoll`, `FanClubPollVote`, `FanClubPost`, `FanClubPostLike`, `GiftBattle`, `GiftBattleParticipant`, `GiftGoal`, `GiftMission`, `LiveGuestInvite`, `MicFrame`, `NameEffect`, `OkeyMatch`, `OkeyMatchPlayer`, `PkBan`, `PkEvent`, `PkGift`, `PkParticipant`, `PkScore`, `PkSeat`, `PkStat`, `RevenueRule`, `Session`, `UserMissionProgress`, `VerificationToken`, `VoiceSignal`, `WeeklyTournamentEntry`

Bunların bir bölümü (`PkSeat`, `PkGift`, `PkParticipant`, `PkStat`, `PkBan`, `PkEvent`, `PkScore`, `GiftBattle`, `GiftGoal`, `GiftMission`, `FanClub*`, `Celebrity*`, `AvatarAccessory`, `MicFrame`, `NameEffect`, `EntranceEffect`, `ChatBubbleSkin`, `EmojiPack`, `LiveGuestInvite`) Bölüm 2'deki eksik uçlarla birebir örtüşüyor → **tablo hazır, uç yazılmamış.**
`Session` ve `VerificationToken` kimlik doğrulama altyapısına aittir, ORM üzerinden değil adaptör üzerinden kullanılıyor olabilir → `UNKNOWN`, dokunulmayacak.

## 5. İkinci RTC sistemi — `livekit`

- Express backend'de `POST /api/livekit/token` mevcut.
- Ana backend'de LiveKit **yok**.
- Flutter'da `livekit` kelimesi 3 dosyada geçiyor, ancak bunlar SDK kullanımı değil (`api_cache_policy.dart`, `voice_seat_rest_service.dart`, `voice_room_music_audio_session.dart` içindeki referanslar) — `pubspec.yaml`'da LiveKit paketi **yok**.
- Sınıf: `UNKNOWN → muhtemel kalıntı`. Aşama C'de canlı çağrı kanıtı aranacak.

## 6. Agora kalıntıları

- Ana backend: Agora referansı **0**.
- Express backend: Agora referansı **0**.
- Flutter `pubspec.yaml`: Agora paketi **yok**.
- Flutter kaynak kodu: yalnızca **23 adet isimlendirme/yorum kalıntısı** (`VoiceAgoraException` typedef'i, `audio.agora.*` log etiketleri, yorum satırları).
- Sınıf: `SAFE-RENAME` — davranışı etkilemez, Aşama E'de isim temizliği yapılabilir. Agora **geri getirilmeyecek**.

## 7. Aşama C'ye taşınan zorunlu kontrol listesi

Silinmesi önerilecek her yapı için şunlar belgelenmeden işlem yapılmayacak:
nerede kullanılıyor · kim çağırıyor (Flutter / Web / Admin / dış servis) · veritabanı ilişkisi · veri kaybı riski · geri alma adımı.