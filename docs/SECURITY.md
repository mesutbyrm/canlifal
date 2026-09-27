# SECURITY — Güvenlik İncelemesi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


> Bu dokümanda **hiçbir gizli anahtar değeri yer almaz**. Tüm sırlar yalnızca dosya + satır
> referansıyla anılır.

## Sır yönetimi

| Sır | Nerede okunur |
|---|---|
| JWT imzalama anahtarı | `lib/mobile-auth.ts:7` (ortam değişkeni) |
| TRTC SDKAppID / secret | `app/api/trtc/usersig/route.ts:31-40` |
| TRTC webhook anahtarı | `app/api/tencent/webhook/route.ts:34` |
| Veritabanı bağlantısı | `lib/db.ts` (ortam değişkeni) |

Kaynak ağacında **sabit kodlanmış anahtar bulunmadı**; tümü `process.env` üzerinden okunuyor.
Tek istisna: JWT anahtarı için `'fallback-secret'` yedeği (`lib/mobile-auth.ts:7`) —
ortam değişkeni tanımsızsa zayıf bir anahtarla imzalama yapılır. **Öneri:** yedeği kaldırıp
uygulamayı başlangıçta hata vermeye zorlamak.

## Kimlik doğrulama kapsamı (koddan sayım)

| Kontrol | Route sayısı |
|---|---:|
| Bearer JWT (`authenticateRequest`) | 318 |
| Web oturumu (`getServerSession`) | 202 |
| Admin/RBAC | 43 |
| VIP yetenek | 9 |
| İmza/webhook | 8 |

## Gözden geçirilmesi gereken uçlar (durum: **ERİŞİM BEKLİYOR / doğrulanmadı**)

Aşağıdaki **54** route durum değiştiren metot içerir ve statik tarama ile bilinen bir
yetki yardımcısı **tespit edilememiştir**. Bir kısmı **kasıtlı olarak herkese açıktır**
(kayıt, giriş, şifre sıfırlama, iletişim formu, webhook'lar). Bu liste bir güvenlik açığı iddiası
**değildir** — el ile incelenmesi gereken adaylar listesidir.

| Metot | Yol | Dosya |
|---|---|---|
| `POST, PUT, PATCH, DELETE` | `/api/[...unmatched]` | `app/api/[...unmatched]/route.ts` |
| `POST` | `/api/admin/ad-placements` | `app/api/admin/ad-placements/route.ts` |
| `PATCH, DELETE` | `/api/admin/ad-placements/[id]` | `app/api/admin/ad-placements/[id]/route.ts` |
| `PUT` | `/api/admin/agencies/[agencyId]/commission` | `app/api/admin/agencies/[agencyId]/commission/route.ts` |
| `POST` | `/api/admin/agencies/[agencyId]/wallet` | `app/api/admin/agencies/[agencyId]/wallet/route.ts` |
| `PUT` | `/api/admin/agency-applicant-config` | `app/api/admin/agency-applicant-config/route.ts` |
| `PUT` | `/api/admin/agency-finance` | `app/api/admin/agency-finance/route.ts` |
| `POST` | `/api/admin/cfc-arena` | `app/api/admin/cfc-arena/route.ts` |
| `PUT, DELETE` | `/api/admin/integrations/apple` | `app/api/admin/integrations/apple/route.ts` |
| `PUT, DELETE` | `/api/admin/integrations/google-play` | `app/api/admin/integrations/google-play/route.ts` |
| `PATCH` | `/api/admin/integrations/sms` | `app/api/admin/integrations/sms/route.ts` |
| `PUT, PATCH, DELETE` | `/api/admin/integrations/sms/[providerKey]` | `app/api/admin/integrations/sms/[providerKey]/route.ts` |
| `POST` | `/api/admin/integrations/sms/[providerKey]/test` | `app/api/admin/integrations/sms/[providerKey]/test/route.ts` |
| `POST, PUT, DELETE` | `/api/admin/membership-events` | `app/api/admin/membership-events/route.ts` |
| `POST, PUT, DELETE` | `/api/admin/membership-features` | `app/api/admin/membership-features/route.ts` |
| `POST, PUT, DELETE` | `/api/admin/membership-tiers` | `app/api/admin/membership-tiers/route.ts` |
| `POST` | `/api/ads/reward-callback` | `app/api/ads/reward-callback/route.ts` |
| `POST` | `/api/agency/wallet/transfer` | `app/api/agency/wallet/transfer/route.ts` |
| `POST` | `/api/anonymous` | `app/api/anonymous/route.ts` |
| `POST` | `/api/anonymous/watch-ad` | `app/api/anonymous/watch-ad/route.ts` |
| `POST` | `/api/auth/email/verify` | `app/api/auth/email/verify/route.ts` |
| `POST` | `/api/auth/forgot-password` | `app/api/auth/forgot-password/route.ts` |
| `POST` | `/api/auth/mobile-apple` | `app/api/auth/mobile-apple/route.ts` |
| `POST` | `/api/auth/mobile-google` | `app/api/auth/mobile-google/route.ts` |
| `POST` | `/api/auth/mobile-login` | `app/api/auth/mobile-login/route.ts` |
| `POST` | `/api/auth/mobile-refresh` | `app/api/auth/mobile-refresh/route.ts` |
| `POST` | `/api/auth/mobile-register` | `app/api/auth/mobile-register/route.ts` |
| `POST` | `/api/auth/mobile-tiktok` | `app/api/auth/mobile-tiktok/route.ts` |
| `POST` | `/api/auth/reset-password` | `app/api/auth/reset-password/route.ts` |
| `POST` | `/api/cfc-arena/join` | `app/api/cfc-arena/join/route.ts` |
| `PATCH` | `/api/chat/rooms/[roomId]/background` | `app/api/chat/rooms/[roomId]/background/route.ts` |
| `POST` | `/api/chat/rooms/[roomId]/banned-words` | `app/api/chat/rooms/[roomId]/banned-words/route.ts` |
| `DELETE` | `/api/chat/rooms/[roomId]/banned-words/[word]` | `app/api/chat/rooms/[roomId]/banned-words/[word]/route.ts` |
| `PATCH` | `/api/chat/rooms/[roomId]/music-settings` | `app/api/chat/rooms/[roomId]/music-settings/route.ts` |
| `DELETE` | `/api/chat/rooms/[roomId]/queue` | `app/api/chat/rooms/[roomId]/queue/route.ts` |
| `DELETE` | `/api/chat/rooms/[roomId]/song/[queueId]` | `app/api/chat/rooms/[roomId]/song/[queueId]/route.ts` |
| `POST` | `/api/chat/youtube-audio` | `app/api/chat/youtube-audio/route.ts` |
| `POST` | `/api/compatibility` | `app/api/compatibility/route.ts` |
| `POST` | `/api/contact` | `app/api/contact/route.ts` |
| `POST` | `/api/dreams/generate` | `app/api/dreams/generate/route.ts` |
| `POST` | `/api/live/fal-request/[requestId]/complete` | `app/api/live/fal-request/[requestId]/complete/route.ts` |
| `POST, PATCH` | `/api/live/fal-request/[requestId]/update` | `app/api/live/fal-request/[requestId]/update/route.ts` |
| `POST` | `/api/live/fal-request/create` | `app/api/live/fal-request/create/route.ts` |
| `POST` | `/api/messages/conversations/[peerId]/messages` | `app/api/messages/conversations/[peerId]/messages/route.ts` |
| `POST` | `/api/signup` | `app/api/signup/route.ts` |
| `POST` | `/api/social/actions` | `app/api/social/actions/route.ts` |
| `POST` | `/api/social/posts/[postId]/view` | `app/api/social/posts/[postId]/view/route.ts` |
| `POST` | `/api/trend-videos` | `app/api/trend-videos/route.ts` |
| `POST` | `/api/trtc/webhook` | `app/api/trtc/webhook/route.ts` |
| `POST` | `/api/user/location` | `app/api/user/location/route.ts` |
| `PUT` | `/api/user/social-settings` | `app/api/user/social-settings/route.ts` |
| `POST, PATCH` | `/api/video-streams/[streamId]/background` | `app/api/video-streams/[streamId]/background/route.ts` |
| `POST, PATCH` | `/api/video-streams/[streamId]/image` | `app/api/video-streams/[streamId]/image/route.ts` |
| `POST, DELETE` | `/api/video-streams/[streamId]/moderator` | `app/api/video-streams/[streamId]/moderator/route.ts` |

### Öncelikli incelenmesi önerilenler

Kayıt/giriş/webhook dışında kalan ve oda veya yayın durumunu değiştiren uçlar:

- `PATCH /api/chat/rooms/{roomId}/background`
- `POST /api/chat/rooms/{roomId}/banned-words`, `DELETE /banned-words/{word}`
- `PATCH /api/chat/rooms/{roomId}/music-settings`
- `DELETE /api/chat/rooms/{roomId}/queue`, `DELETE /song/{queueId}`
- `POST /api/chat/youtube-audio`
- `POST,PATCH /api/video-streams/{streamId}/background`, `/image`
- `POST,DELETE /api/video-streams/{streamId}/moderator`
- `POST /api/user/location`, `PUT /api/user/social-settings`
- `POST /api/messages/conversations/{peerId}/messages`
- `POST /api/social/actions`

Bir kısmı admin grubundadır (`/api/admin/*`) — admin sayfaları middleware ile korunuyor olabilir,
ancak **API route'ları doğrudan çağrılabildiği için route düzeyinde kontrol şarttır**.

## Diğer bulgular

1. **TRTC webhook imzası opsiyonel.** `TRTC_WEBHOOK_KEY` tanımsızsa doğrulama atlanır
   (`app/api/tencent/webhook/route.ts:40`). Üretimde zorunlu hâle getirilmeli.
2. **Enum yok.** 270 modelin tamamı durum alanlarını `String` olarak tutar; geçersiz durum değerleri
   veritabanı düzeyinde engellenmez.
3. **Rate limit bellek-içidir** (`lib/rate-limiter.ts`). Çok örnekli dağıtımda örnek başına sayar.
