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

## Gözden geçirilmesi gereken uçlar (durum: **DOĞRULANDI** — 2026-09-27)

> **Düzeltme:** Bu bölümün önceki sürümü **54** route listeliyordu. O sayı, statik
> taramanın yalnız iki yetki desenini tanımasından kaynaklanan **yanlış pozitiflerle**
> şişmişti. Tarama genişletilip yeniden dışa aktarımlar çözümlendikten sonra yetki izi
> bulunmayan uç sayısı **15**'e indi. Ayrıntılı kanıt: [`LIVE_VERIFICATION.md`](./LIVE_VERIFICATION.md).

Ek olarak, herkese açık sanılan **17 uç** üretimde canlı olarak çağrıldı ve **401**
döndürdüğü görüldü; korumaları **doğrulanmıştır**.

### A. Kasıtlı olarak herkese açık (9)

| Metot | Yol |
|---|---|
| `POST, PUT, PATCH, DELETE` | `/api/[...unmatched]` (404 yakalayıcı) |
| `POST` | `/api/anonymous` |
| `POST` | `/api/anonymous/watch-ad` |
| `POST` | `/api/auth/email/verify` |
| `POST` | `/api/auth/forgot-password` |
| `POST` | `/api/auth/mobile-register` |
| `POST` | `/api/auth/reset-password` |
| `POST` | `/api/contact` |
| `POST` | `/api/signup` |

### B. İmza ile korunan (1)

| Metot | Yol | Not |
|---|---|---|
| `POST` | `/api/trtc/webhook` | İmza doğrulaması var; `TRTC_WEBHOOK_KEY` yoksa atlanır |

### C. Gerçek inceleme adayları (5)

| Metot | Yol | Risk |
|---|---|---|
| `POST` | `/api/compatibility` | Kimliksiz dil modeli maliyeti |
| `POST` | `/api/dreams/generate` | Kimliksiz dil modeli maliyeti |
| `POST` | `/api/chat/youtube-audio` | Kimliksiz dış kaynak çekimi |
| `POST` | `/api/trend-videos` | Kimliksiz liste/çekim |
| `POST` | `/api/social/posts/[postId]/view` | Görüntülenme sayacı şişirmesi |

### Yanlış alarm olarak kapatılanlar

| Uç | Gerçek koruma |
|---|---|
| `/api/video-streams/[streamId]/moderator` | `../moderators/route.ts` → `authenticateRequest` |
| `/api/video-streams/[streamId]/background` | `../route.ts` `PATCH` → `authenticateRequest` + oturum |
| `/api/video-streams/[streamId]/image` | `../route.ts` `PATCH` → aynı |
| `/api/messages/conversations/[peerId]/messages` | `../../../[userId]/route.ts` → `authenticateRequest` |

Yönetici (`/api/admin/*`), ajans ve üyelik uçları bu listeden çıkarılmıştır: hepsi
`requireAuth`/`requireRole` ya da alan bazlı koruyucular üzerinden yetkilendirilir.

## Diğer bulgular

1. **TRTC webhook imzası opsiyonel.** `TRTC_WEBHOOK_KEY` tanımsızsa doğrulama atlanır
   (`app/api/tencent/webhook/route.ts:40`). Üretimde zorunlu hâle getirilmeli.
2. **Enum yok.** 270 modelin tamamı durum alanlarını `String` olarak tutar; geçersiz durum değerleri
   veritabanı düzeyinde engellenmez.
3. **Rate limit bellek-içidir** (`lib/rate-limiter.ts`). Çok örnekli dağıtımda örnek başına sayar.
