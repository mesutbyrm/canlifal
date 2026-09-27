# AUTHENTICATION — Kimlik Doğrulama

> **Kaynak:** Abacus.AI üzerinde çalışan CANLI backend kaynak ağacı (`nextjs_space/`), 2026-09-27 tarihli durum.
> **Üretim yöntemi:** Route dosyaları programatik olarak taranarak (`app/api/**/route.ts`) üretildi; el ile uydurulmuş uç/alan yoktur.
> **Durum etiketleri:** `DOĞRULANDI` (çalışan sistemde test edildi) · `KODDAN TESPİT EDİLDİ` (kaynak koddan okundu, canlı test edilmedi) · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Modeller

| Mod | Nasıl | Nerede doğrulanır |
|---|---|---|
| Mobil | `Authorization: Bearer <accessToken>` | `lib/mobile-auth.ts → authenticateRequest()` |
| Web | NextAuth oturum çerezi | `lib/auth-options.ts → authOptions` + `getServerSession` |
| Admin | Rol/izin kontrolü | `lib/rbac.ts → resolveUser/isAdminRole`, `lib/permissions.ts → hasPermission` |
| VIP yetenek | Üyelik kademesine bağlı yetki | `lib/vip-guard.ts → requireCapability/resolveUserId` |

> `@/lib/auth-helpers` **yoktur**; mobil uçlarda doğru import `@/lib/mobile-auth`'tır.

## Token ömürleri (koddan)

| Token | Süre | Kaynak |
|---|---|---|
| accessToken | **7 gün** | `lib/mobile-auth.ts:8` (`ACCESS_TOKEN_EXPIRY = '7d'`) |
| refreshToken | **30 gün** | `lib/mobile-auth.ts:9` (`REFRESH_TOKEN_EXPIRY = '30d'`) |

İmzalama anahtarı ortam değişkeninden okunur (`lib/mobile-auth.ts:7`). **Değer hiçbir dokümanda yer almaz.**
Yenileme uçunda 15 saniyelik tekrar-isteği tekilleştirmesi vardır (`app/api/auth/mobile-refresh/route.ts:14`,
`REFRESH_DEDUPE_TTL = 15_000`) — paralel 401 sonrası çoklu refresh çağrısı aynı token çiftini alır.

## Rate limit

`auth` kovası **15 dakikada 10 istek** (`lib/rate-limit-guard.ts` → `DEFAULT_RATE_LIMITS.auth = 10`, `WINDOW_OVERRIDES.auth = 15*60*1000`).

## Auth uçları

| Metot | Yol | Yetki | Durum |
|---|---|---|---|
| `GET, POST` | `/api/auth/[...nextauth]` | NextAuth handler | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/change-password` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/email/send-verification` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/auth/email/verify` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/forgot-password` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/logout` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/logout-all` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-apple` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-google` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-login` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-refresh` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-register` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/auth/mobile-sessions` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/auth/mobile-sessions/[id]` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/mobile-tiktok` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/auth/mobile/device-token` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/phone/send-otp` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/phone/verify-otp` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/reclaim-device` | Web oturumu (cookie) | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/auth/reset-password` | Yok (herkese açık) ⚠ | KODDAN TESPİT EDİLDİ |
| `GET, DELETE` | `/api/auth/sessions` | Bearer JWT (mobil) | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/auth/verify-device` | Web oturumu (cookie) | KODDAN TESPİT EDİLDİ |

## Flutter akışı

1. `POST /api/auth/mobile-login` → `{accessToken, refreshToken}`
2. Her istekte `Authorization: Bearer <accessToken>`
3. `401` alındığında `POST /api/auth/mobile-refresh` (`{refreshToken}`) → yeni çift
4. Yenileme de başarısızsa oturumu kapat.

**SSE için kritik:** uzun ömürlü SSE bağlantıları token süresi dolduğunda sunucu tarafından düşer.
İstemci yeniden bağlanırken **önce token yenilemeli**, sonra stream açmalıdır
(`mobile/lib/core/network/sse/base_sse_service.dart`).
