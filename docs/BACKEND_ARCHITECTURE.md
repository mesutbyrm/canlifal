# BACKEND ARCHITECTURE — Mimari

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Genel yapı

- **Uygulama:** sunucu tarafı render + API route'ları tek bir uygulamada (`app/api/**/route.ts`).
- **Veritabanı erişimi:** tek paylaşımlı istemci (`lib/db.ts`), havuz 5 bağlantı.
- **Gerçek zamanlı:** SSE + bellek-içi olay veri yolu (WebSocket yok).
- **Medya:** Tencent TRTC (sesli/görüntülü), sunucu yalnızca UserSig üretir.
- **Kimlik:** çift mod (mobil JWT + web oturumu), tek giriş noktası `lib/mobile-auth.ts`.

## Katmanlar

| Katman | Dosyalar |
|---|---|
| Kimlik | `lib/mobile-auth.ts`, `lib/auth-options.ts`, `lib/rbac.ts`, `lib/permissions.ts`, `lib/vip-guard.ts` |
| Hız sınırı | `lib/rate-limit-guard.ts`, `lib/rate-limiter.ts` |
| Önbellek/performans | `lib/perf.ts` (`CACHE_POLICIES`, `withCachePolicy`), `lib/cache.ts` |
| Yanıt zarfı | `lib/api-response.ts` (`ErrorCodes`, `apiSuccess`, `apiError`) |
| Olay veri yolu | `lib/chat-events.ts`, `lib/room-events.ts`, `lib/stream-events.ts` |
| Bakiye | `lib/balance-guard.ts` (`atomicDebitCredits`, `atomicDebitJeton`) |
| Medya URL | `lib/media-url.ts` |
| Denetim | `lib/audit-log.ts` |
| Yönlendirme yardımcıları | `lib/chat-route-proxy.ts` (`forwardToSeats`, `forwardToModeration`) |

## API yüzeyi

**717 route dosyası / 1084 metot-uç.** En büyük 20 grup:

| Grup | Route |
|---|---:|
| `/api/admin` | 182 |
| `/api/chat` | 54 |
| `/api/user` | 37 |
| `/api/video-streams` | 34 |
| `/api/gifts` | 26 |
| `/api/short-videos` | 25 |
| `/api/auth` | 22 |
| `/api/games` | 21 |
| `/api/live` | 19 |
| `/api/agency` | 16 |
| `/api/fortunes` | 15 |
| `/api/fortune-tellers` | 13 |
| `/api/dreams` | 11 |
| `/api/social` | 11 |
| `/api/users` | 10 |
| `/api/blog` | 9 |
| `/api/me` | 9 |
| `/api/referral` | 9 |
| `/api/messages` | 7 |
| `/api/room` | 7 |

## Sürümleme

`middleware.ts` `/api/v1/*` isteklerini `/api/*` yollarına rewrite eder ve `x-api-version: v1`
başlığı ekler. Her iki yol da **aynı** handler'ları çalıştırır.
