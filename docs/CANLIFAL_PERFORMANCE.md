# CanlıFal — Performans ve Gözlemlenebilirlik Dokümantasyonu

> **§66, §74 — Spec Referansları**
>
> Son güncelleme: 2026-08-27

---

## 1. Genel Mimari

| Bileşen | Teknoloji | Notlar |
|---------|-----------|--------|
| Runtime | Node.js (standalone) | Tek sunucu instance |
| Cache | Bellek içi (in-memory) | `lib/cache.ts`, Redis-uyumlu API |
| Realtime | SSE (Server-Sent Events) | `lib/*-events.ts`, 20 SSE ucu |
| Veritabanı | Paylaşımlı ilişkisel DB | Max 25 bağlantı, 5sn statement timeout |
| CDN | Cloudflare R2 | `cdn.girlive.com` |

---

## 2. Önbellek Stratejisi

### 2.1 Sunucu Tarafı Cache (`lib/cache.ts`)

| Yardımcı | TTL | Kullanım |
|----------|-----|----------|
| `getCached(key, ttl, fetcher)` | Değişken | Genel önbellek |
| `getCachedGiftTypes()` | 60s | Hediye katalog |
| `getCachedPaymentMethods()` | 60s | Ödeme yöntemleri |
| `getCachedCreditPackages()` | 60s | Kredi paketleri |
| `getCachedPlatformSetting(key)` | 30s | Platform ayarları |
| `getCachedChatRoom(idOrSlug)` | 15s | Oda bilgisi |
| `getCached('feature:X', 30, ...)` | 30s | Feature flags |
| `getCached('rbac:role:X', 60, ...)` | 60s | RBAC yetkileri |
| `getCached('effect_rules:active', 60, ...)` | 60s | Efekt kuralları |

### 2.2 HTTP Cache-Control Header'ları

| Uç Nokta | Değer |
|----------|-------|
| `GET /api/gifts/types` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/payment-methods` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/credit-packages` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/gift-engine/gifts` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/gifts/version` | `public, s-maxage=60, stale-while-revalidate=120` |
| `GET /api/room-themes/catalog` | `public, s-maxage=60, stale-while-revalidate=120` |

**Kural:** Auth/kullanıcı-özel uçlarda Cache-Control kullanılmaz.

---

## 3. Performans İzleme (`lib/perf.ts`)

### 3.1 Yanıt Süresi İzleme

- `recordTiming(route, ms, method)` — Per-rota istatistik (count, avg, max, slowCount)
- `withTiming(route, handler)` — Middleware wrapper
- `SLOW_THRESHOLD_MS = 500` — 500ms üzeri istekler `[PERF] SLOW ...` olarak loglanır

### 3.2 İzlenen Rotalar

| Rota | Yöntem |
|------|--------|
| `/api/live/join-room` | POST |
| `/api/chat/rooms/[roomId]/state` | GET |

### 3.3 Bellek Sınırları

| Tampon | Maksimum |
|--------|----------|
| Rota istatistikleri | 300 rota |
| Yavaş istek ring buffer | 100 kayıt |

---

## 4. Monitoring Endpoint

`GET /api/monitoring` — Admin-gated (`isAdminRole`)

```json
{
  "routes": { "/api/live/join-room": { "count": 142, "avg": 285, "max": 1200, "slowCount": 3 } },
  "slowRequests": [{ "route": "/api/...", "ms": 620, "method": "POST", "ts": "2026-08-27T..." }],
  "memory": { "rss": 156000000, "heapUsed": 89000000 },
  "uptime": 86400
}
```

---

## 5. Warmup Endpoint

`GET /api/warmup` — Public, cold-start azaltma.

- DB ping (`SELECT 1`)
- Hot cache pre-warm: giftTypes, paymentMethods, creditPackages, platformSettings, homepageButtons, homepageFortuneCards, fortuneRequestTypes
- Paralel best-effort, hata ana akışı kesmez
- Deploy sonrası bir kez çağrılabilir

---

## 6. Veritabanı Performansı

### 6.1 Bağlantı Havuzu

| Ayar | Değer |
|------|-------|
| `connection_limit` | 5 (güvenli, paylaşımlı DB max 25) |
| `pool_timeout` | 10s |
| `connect_timeout` | 5s |
| `statement_timeout` | 5000ms |
| `idle_in_transaction_session_timeout` | 30s |

### 6.2 İndeks Durumu

- 214 model, 429 @@index, 62 @@unique
- Realtime hot path'ler (ChatMessage, Notification, VideoStreamViewer, RoomSignal) composite index'lere sahip

### 6.3 Sorgu Optimizasyonları

- `Promise.all` ile paralel sorgular (join-room, state, bootstrap)
- Seçici `select` clause'lar (gereksiz alan çekme yok)
- `getCached*` yardımcıları ile tekrarlanan sorguları önleme
- N+1 önleme: `include` ile ilişkili veri tek sorguda

---

## 7. SSE Performansı

| Metrik | Değer |
|--------|-------|
| SSE uç sayısı | 20 |
| Heartbeat | Event-bus bazlı (rota bağımlı) |
| Reconnect | `Last-Event-Id` header desteği (oda SSE) |
| Event ID | Bellek-içi timestamp bazlı |

---

## 8. Bootstrap Optimizasyonu

| Uç Nokta | Birleştirilen İstekler |
|----------|------------------------|
| `POST /api/live/join-room` | Oda bilgisi + katılımcılar + koltuklar + hediye sıralaması + TRTC token + mic durumu + roller |
| `GET /api/chat/rooms/[roomId]/state` | Oda + katılımcılar + koltuklar + online sayısı + TRTC bilgisi |
| `GET /api/v1/bootstrap` | Feature flags + remote configs + platform settings + user özeti |

---

## 9. Bilinen Kısıtlamalar

| Kısıt | Durum | Not |
|-------|-------|-----|
| Harici Redis | Yok | Bellek-içi cache, sunucu yeniden başlatılınca sıfırlanır |
| Harici APM | Yok | Sadece `/api/monitoring` + console log |
| gzip/Brotli | Platform/CDN katmanı | Uygulama içi yapılandırılamaz |
| HTTP/2-3 | Platform katmanı | Uygulama içi yapılandırılamaz |
| Çoklu instance | Desteklenmiyor | Cache + SSE event-bus bellek-içi (tek instance) |
