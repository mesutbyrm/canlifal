# CANLIFAL PHASE 1 — MEVCUT BACKEND AUDIT RAPORU

> §0 ve §90 gereği: **kod yazılmadan önce** mevcut backend'in tam envanteri. Bu fazda **hiçbir kod değiştirilmemiştir**.
>
> Yan dokümanlar: `CANLIFAL_BACKEND_ARCHITECTURE.md` (§1-A, §1-D) · `CANLIFAL_DATA_MODEL.md` (§1-B) · `CANLIFAL_API.md` (§1-C)

---

## ÖZET RAKAMLAR

| Metrik | Değer |
|---|---|
| API route dosyası | 490 |
| Endpoint handler | **737** |
| Benzersiz path | **473** |
| Üst API grubu | 92 |
| Auth dağılımı | dual 390 · session 226 · public 121 |
| Admin korumalı handler | 288 |
| Rate limit uygulanmış handler | **9** |
| Veritabanı modeli | **198** (2338 alan, 429 indeks, 62 unique, 180 ilişki) |
| SSE ucu | 20 (5 gerçek olay kanalı + 15 LLM streaming) |
| WebSocket | **0** |
| Atomik transaction kullanan dosya | 33 |
| Idempotency izi olan uç | 4 |
| Standart hata zarfı kullanan route | 44 / 420 (kalan 376 düz `{error}`) |

---

## E. WEB ÖZELLİK MATRİSİ

| Özellik | WEB | BACKEND | DATABASE | REALTIME | STATUS |
|---|---|---|---|---|---|
| E-posta/şifre giriş | ✅ | ✅ NextAuth + `/api/auth/mobile-login` | `User`, `Account`, `Session` | — | Tam |
| Google giriş | ✅ | ✅ | `Account` | — | Tam |
| TikTok / Apple giriş | mobil | ✅ `/api/auth/mobile-tiktok|mobile-apple` | `Account` | — | Tam (mobil) |
| Telefon + OTP giriş | ❌ | ❌ | ❌ | — | **Yok** |
| Refresh token | ✅ | ✅ `/api/auth/mobile-refresh` | `UserLoginSession` | — | Tam |
| Profil / avatar / çerçeve | ✅ | ✅ `/api/user/*`, `/api/profile-frames` | `User`, `ProfileFrame` | — | Tam |
| Takip / engelleme | ✅ | ✅ | `Follow`, `UserBlock` | — | Tam |
| Sesli oda (giriş, mikrofon, koltuk) | ✅ | ✅ `/api/chat/rooms/*` | `ChatRoom`, `ChatPresence`, `ChatUserRole` | ✅ SSE | Tam |
| Konuşma isteği / onay / red / blok | ✅ | ✅ | `ChatSpeakRequest`, `ChatSpeakBlock` | ✅ SSE | Tam |
| Oda moderasyonu (mute/ban/rol) | ✅ | ✅ | `ChatMute`, `ChatBan`, `ChatUserRole` | ✅ SSE | Tam |
| Oda DJ / müzik | ✅ | ✅ | — | ✅ SSE | Tam |
| Canlı video yayın | ✅ | ✅ `/api/video-streams/*` (53 handler) | `VideoStream` ailesi | ✅ SSE | Tam |
| Co-broadcaster / misafir | ✅ | ✅ | `StreamCoBroadcaster`, `LiveGuestSession` | ✅ SSE | Tam |
| TRTC signaling | ✅ | ✅ `/api/trtc/*`, `/api/tencent/*` | `*Signal` tabloları | DB polling | Tam |
| PK / battle | ✅ | ✅ (bir kısmı ikinci backend'de) | `PkMatch`, `PkSeat`, `PkScore`, `PkEvent` | ✅ SSE | Kısmi — skor otoritesi tam sunucu tarafında değil |
| PK davet | ✅ | ✅ `/api/pk/me/invites` (ana backend) | `PkParticipant` | ✅ SSE | Tam |
| Hediye gönderme (oda) | ✅ | ✅ `/api/chat/rooms/[id]/gifts` | `GiftType`, `GiftHistory`, `ChatRoomGift` | ✅ SSE | Tam |
| Hediye gönderme (yayın) | ✅ | ✅ `/api/video-streams/[id]/gifts` | `StreamGift` | ✅ SSE | Tam |
| Hediye motoru (öncelik/kuyruk/combo) | ✅ | ✅ `/api/gift-engine/*` | `GiftQueue`, `GiftCombo`, `GiftHistory` | ✅ SSE | Tam |
| Hediye video/animasyon medyası | ✅ | ✅ R2 CDN + unified media alanları | `GiftType` | ✅ | Tam |
| Hediye görevleri / hedef / battle | ✅ | ✅ | `GiftGoal`, `GiftMission`, `GiftBattle` | kısmi | Tam |
| Şanslı hediye | ✅ | ✅ | `LuckyGiftTier`, `LuckyGiftReward` | ✅ | Tam |
| Jeton satın alma | ✅ | ✅ `/api/payments/*`, `/api/jeton/*` | `Payment`, `JetonTransaction` | — | Tam |
| Cüzdan / bakiye | ✅ | ✅ `/api/wallet` | `User.credits`, `CreditTransaction` | — | Kısmi — TL karşılığı/pending/withdrawable ayrımı yok |
| Para çekme | ✅ | ✅ `/api/withdrawals` | `WithdrawalRequest` | — | Kısmi — durum bildirimi eksik |
| Üyelik (Basic/Gold/Premium/Diamond) | ✅ | ✅ `/api/memberships/*` | `MembershipPlan`, `MembershipPurchase` | — | Tam |
| Seviye / rozet / başarım | ✅ | ✅ | `Achievement`, `UserAchievement`, `CustomBadge` | — | Kısmi — 1-100 global seviye motoru yok |
| Efektler (giriş, isim, mic frame, balon) | ✅ | ✅ | `EntranceEffect`, `NameEffect`, `MicFrame`, `ChatBubbleSkin`, `AvatarAccessory`, `EmojiPack` | ✅ (giriş efekti) | Kısmi — tetikleyici/öncelik motoru yok |
| Liderlik tabloları | ✅ | ✅ `/api/leaderboards` | dinamik aggregate | — | Kısmi — saatlik/sezonluk + ödül dağıtımı yok |
| Turnuva | ✅ | ✅ `/api/tournaments` | `WeeklyTournament*` | — | Kısmi |
| Ajans | ✅ | ✅ `/api/agency/*` (16 handler) | `Agency`, `AgencyUser`, `AgencyEarning` | — | Tam |
| Bildirim (in-app) | ✅ | ✅ `/api/notifications/*` | `Notification` | ✅ SSE | Tam |
| Push bildirim | ✅ | ✅ OneSignal | `UserDevice`, `PushNotificationLog` | — | ⚠️ FCM ucu da var (çift provider) |
| Cihaz yönetimi | ✅ | ✅ `/api/devices/*` | `UserDevice` | — | Kısmi — IP/şehir/oturum geçmişi ve yeni cihaz güvenlik bildirimi yok |
| Mesajlaşma (DM) | ✅ | ✅ `/api/messages/*` | `DirectMessage`, `Conversation`, `MessageRequest` | polling | Tam |
| Sosyal akış / gönderi | ✅ | ✅ `/api/social/*` | `SocialPost` ailesi | — | Tam |
| Kısa video (Shorts) | ✅ | ✅ `/api/short-videos/*` (21) | `ShortVideo` ailesi | — | Tam |
| Hikaye | ✅ | ✅ `/api/stories` | `UserStory` | — | Tam |
| Blog | ✅ | ✅ `/api/blog/*` | `BlogPost` ailesi | — | Tam |
| Fal (15 tür, LLM) | ✅ | ✅ `/api/fortunes/*` | `Fortune` | ✅ token streaming | Tam |
| Canlı falcı seansı | ✅ | ✅ `/api/fortune-tellers/*`, `/api/room/*` | `LiveSession`, `LiveFortuneTeller` | ✅ SSE | Tam |
| Rüya modülü | ✅ | ✅ `/api/dreams/*`, `/api/dream-*` | 10 model | — | Tam |
| Oyunlar (SOS, Okey, mini) | ✅ | ✅ `/api/games/*` (40) | 11 model | polling | Tam |
| Keşfet / arama | ✅ | ✅ `/api/search`, `/api/trends` | — | — | Kısmi — sıralama algoritması yok |
| Konum / mesafe | ❌ | ❌ | ❌ | — | **Yok** |
| Çoklu hesap (max 5) | ❌ | ❌ | ❌ | — | **Yok** |
| Destek / ticket | ❌ | ❌ | ❌ | — | **Yok** |
| Şikayet / rapor | ✅ | ✅ | `UserReport` | — | Kısmi — moderasyon iş akışı yok |
| Doğrulama (mavi tik) iş akışı | ❌ | ❌ | boolean alan | — | **Yok** |
| Admin paneli | ✅ | ✅ 223 handler | — | — | Tam |
| Feature flag | ⚠️ | `/api/settings/public` (8 anahtarlık sabit allowlist) | `PlatformSettings` | — | Kısmi |
| Remote config | ❌ | ❌ | — | — | **Yok** |

---

## F. FLUTTER SÖZLEŞMESİNDEKİ EKSİKLER

Web'de çalışıp mobil sözleşmede tanımlı olmayan / eksik tanımlı olanlar:

1. **Sesli oda konuşma isteği akışı** — `reject`, `block`, `unblock` uçları ve `voice_request_rejected` / `speak_blocked` SSE olayları sözleşmede yeni; Flutter tarafında henüz tüketilmiyor.
2. **Hediye motoru kuyruk protokolü** — `gift_received` → animasyon → `POST /api/gift-engine/finish` döngüsü. Flutter bu `finish` çağrısını yapmazsa kuyruk tıkanır.
3. **Unified gift media alanları** (`mediaType`, `fileUrl`, `thumbnailUrl`, `duration`, `mimeType`) — mp4/webm hediyeler için gerekli.
4. **Oda `online_count` olayı** — yeni eklendi.
5. **DJ / müzik olayları** (`dj_update`) — mobilde karşılığı yok.
6. **Co-broadcaster / misafir daveti olayları** — yayın SSE'sinde var, mobil sözleşmede eksik.
7. **Bootstrap uçları** — hem web hem mobil için **yok**; mobil açılışta 5-8 istek atıyor.
8. **Standart hata modeli** — mobil client'lar `{error:string}` ve `{success,error:{code}}` iki farklı formatı ayrı ayrı ele almak zorunda.
9. **`x-api-version` / `/api/v1` kullanımı** — backend hazır, Flutter router hâlâ `/api/...` kullanıyor (çalışıyor, ama versiyonlama avantajı kullanılmıyor).
10. **Telefon/OTP, konum, çoklu hesap, destek, doğrulama** — backend'de hiç yok; mobil tasarımda varsa karşılıksız.

---

## §89 RELEASE GATE — MEVCUT DURUM

| # | Kontrol | Durum |
|---|---|---|
| 1 | Tüm endpointler dokümante | ⚠️ Otomatik envanter var (473 path), alan bazlı request/response şeması kısmi |
| 2 | Tüm realtime eventler dokümante | ⚠️ Bu fazda listelendi, detaylı sözleşme (§83) yok |
| 3 | Standart hata modeli | ❌ 376 route düz `{error}` |
| 4 | `request_id` | ❌ |
| 5 | API versiyonlama | ✅ `/api/v1` aktif |
| 6 | Geriye dönük uyumluluk | ✅ rewrite ile korunuyor |
| 7 | RBAC/PBAC merkezi | ❌ |
| 8 | Feature flag servisi | ⚠️ 8 anahtar |
| 9 | Remote config servisi | ❌ |
| 10 | Bootstrap uçları | ❌ |
| 11 | Cursor pagination standardı | ❌ |
| 12 | Idempotency | ❌ (4 uç) |
| 13 | Rate limit | ❌ (9 handler) |
| 14 | Atomik para akışı | ⚠️ hediye/ödeme ✅, PK skor ve ajans komisyonu kısmi |
| 15 | Değiştirilemez ledger | ❌ |
| 16 | Audit log | ❌ |
| 17 | Anti-fraud risk skoru | ❌ |
| 18 | Tek push provider | ❌ OneSignal + FCM |
| 19 | Deep link standardı | ❌ |
| 20 | Observability / metrik | ⚠️ `/api/monitoring` + timing var, alarm yok |
| 21 | Yük / eşzamanlılık testi | ❌ |
| 22 | OpenAPI | ✅ `backend-docs/openapi.json` (473 path) |
| 23 | Test planı | ❌ |
| 24 | Cross-platform tutarlılık testi | ❌ |

---

## FAZ 2 İÇİN ÖNERİLEN KAPSAM (onay bekliyor)

Hepsi **eklemeli (additive)**, hiçbir çalışan uç bozulmadan:

1. `lib/api-response.ts` — `apiSuccess` / `apiError` / `apiPaginated` + `ErrorCodes` enum + `request_id` üretimi. **Mevcut uçlar dokunulmadan bırakılır**, yeni uçlar ve kademeli olarak yalnızca mobilin kullandığı uçlar bu zarfa geçirilir (zarf eski alanları da içerir → kırılma yok).
2. `middleware.ts` — her isteğe `x-request-id` ekleme (varsa client'ınkini koruyarak).
3. `FeatureFlag` + `RemoteConfig` tabloları (yeni, eklemeli) + `GET /api/v1/config` (bayraklar + uzak yapılandırma tek yanıtta, cache'li) + admin CRUD ekranı.
4. Cursor pagination yardımcı fonksiyonu ve onu kullanan **yeni** liste parametreleri (`cursor`, `limit`) — mevcut `page`/`offset` davranışı korunur.
5. `CANLIFAL_ERROR_CODES.md` yazımı ve OpenAPI'nin yeniden üretimi.

Bu kapsam onaylanırsa Faz 2'ye geçilecek ve §91'e göre 12 maddelik rapor tekrar sunulacaktır.
