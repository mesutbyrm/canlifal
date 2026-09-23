# CanlıFal Yük Testi Planı (§89 #21)

**Versiyon:** 1.0  
**Tarih:** 2026-08-27  
**Platform:** canlifal.com  
**Envanter:** 776 handler / 498 path / 214 model

---

## 1. Genel Bakış

Bu doküman, CanlıFal platformunun yük altındaki davranışını ölçmek ve darboğazları tespit etmek için hazırlanmış yük testi planıdır.

### 1.1 Hedefler

- API yanıt sürelerini ölçme (p50, p95, p99)
- Eşzamanlı kullanıcı kapasitesini belirleme
- SSE bağlantı limitlerini test etme
- Veritabanı bağlantı havuzu davranışını gözlemleme
- Rate limiter'ın yük altında doğru çalıştığını doğrulama

### 1.2 Kısıtlamalar

| Bileşen | Kısıt |
|---|---|
| DB bağlantı havuzu | Maks 25 eşzamanlı bağlantı |
| DB idle timeout | Kısa (~birkaç saniye) |
| Statement timeout | 5 saniye |
| Idle-in-transaction timeout | 30 saniye |
| Rate limiter | In-memory (tek süreç) |
| SSE | In-memory event bus |

---

## 2. Test Senaryoları

### 2.1 Smoke Test (Temel Sağlık)

**Amaç:** Sistemin temel düzeyde çalıştığını doğrulama  
**Yük:** 5 VU (virtual user), 1 dakika  
**Hedef:** Tüm istekler < 2s, hata oranı < 1%

```
Senaryolar:
- GET /api/v1/bootstrap (public, cached)
- GET /api/config (public, cached)
- GET /api/credit-packages (public, cached)
- GET /api/user/profile (auth required)
- GET /api/me (auth required)
```

### 2.2 Normal Yük (Günlük Kullanım)

**Amaç:** Tipik günlük trafiği simüle etme  
**Yük:** 50 VU, 5 dakika ramp-up, 10 dakika sabit, 5 dakika ramp-down  
**Hedef:** p95 < 500ms, hata oranı < 2%

```
Kullanıcı Profili Dağılımı:
- %40 Pasif Okuyucu: GET uçları (anasayfa, blog, profiller)
- %25 Aktif Kullanıcı: Mesajlaşma, yorum, fal bakma
- %20 Yayıncı: Canlı yayın, sohbet odası yönetimi
- %10 Alıcı: Hediye gönderme, üyelik satın alma
- %5 Admin: Admin panel okuma
```

#### Senaryo Detayları

| Profil | İşlem | Ağırlık | Hedef RPS |
|---|---|---|---|
| Pasif | GET /api/blog, GET /api/dreams, GET /api/horoscope | %40 | 20 |
| Aktif | POST /api/messages/{id}, POST /api/blog/comments | %25 | 12.5 |
| Yayıncı | POST /api/live/message, GET /api/chat/rooms/{id}/stream | %20 | 10 |
| Alıcı | POST /api/live/gift/send, POST /api/memberships/purchase | %10 | 5 |
| Admin | GET /api/admin/*, GET /api/admin/audit | %5 | 2.5 |

### 2.3 Yoğun Yük (Pik Saatleri)

**Amaç:** Akşam saatlerindeki yoğun trafik simülasyonu  
**Yük:** 200 VU, 10 dakika ramp-up, 15 dakika sabit  
**Hedef:** p95 < 1s, hata oranı < 5%, DB bağlantı taşması yok

```
Odak noktaları:
- SSE bağlantı sayısı: maks 100 eşzamanlı
- Hediye gönderme fırtınası: 50 istek/dk
- Mesaj bombardımanı: 200 mesaj/dk
- Eşzamanlı fal oturumları: 20
```

### 2.4 Stres Testi

**Amaç:** Kırılma noktasını belirleme  
**Yük:** 10 VU → 500 VU (kademeli artış, her 2 dakikada 2x)  
**Hedef:** Kırılma noktasının tespiti, graceful degradation

```
İzlenecek metrikler:
- DB connection pool exhaustion noktası
- İlk 5xx hata anı
- SSE bağlantı kopması başlangıcı
- In-memory rate limiter bellek kullanımı
```

### 2.5 Dayanıklılık Testi (Soak Test)

**Amaç:** Uzun süreli çalışmada bellek sızıntısı/performans bozulması tespiti  
**Yük:** 30 VU, 2 saat sabit  
**Hedef:** Yanıt sürelerinde trend yok, bellek kararlı

```
İzlenecekler:
- RSS bellek trendi
- Heap kullanımı
- DB connection count (sabit kalmalı)
- SSE listener count (sabit kalmalı)
- Rate limiter Map boyutu
```

---

## 3. Kritik Uç Noktalar (Detaylı Test)

### 3.1 Hediye Gönderme Pipeline

En karmaşık işlem zinciri — tek istekte 5+ veritabanı sorgusu.

```
POST /api/live/gift/send adımları:
1. authenticateRequest (JWT decode)
2. requireFeature('GIFTS_ENABLED') (cached)
3. guardRateLimit (in-memory)
4. user.findUnique (bakiye kontrolü)
5. giftType.findUnique (fiyat)
6. $transaction: user.update + giftLog.create
7. recordMultiLeg (fire-and-forget, 4+ insert)
8. recordContribution (fire-and-forget)
9. recordTeamPoints (fire-and-forget)
10. recordRiskEvent (fire-and-forget, conditional)
11. emitStreamEvent (SSE broadcast)
12. Notification (push)
```

**Test:** 50 eşzamanlı hediye/dk, 5 dakika → DB bağlantı havuzu davranışı, transaction deadlock riski

### 3.2 SSE Bağlantıları

```
SSE endpoint'leri (20 adet):
- /api/video-streams/{id}/stream
- /api/chat/rooms/{id}/stream
- /api/room/{id}/stream
- /api/pk/{id}/stream
- /api/notifications/stream
- /api/fortune-tellers/sessions/stream
- /api/fortunes/* (14 fal SSE)
```

**Test:** 100 eşzamanlı SSE bağlantısı + normal trafik → bellek, event delivery latency

### 3.3 Fal Oturumları (LLM + SSE)

```
POST /api/fortunes/tarot-fali:
- Auth check
- LLM API çağrısı (streaming)
- SSE response (token-by-token)
- Tipik süre: 10-30 saniye
```

**Test:** 20 eşzamanlı fal oturumu → LLM API timeout riski, yanıt süresi

---

## 4. Araç Yapılandırması

### 4.1 k6 (Önerilen)

```javascript
// Örnek k6 yapılandırması
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
    },
    normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '5m', target: 0 },
      ],
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};
```

### 4.2 İzleme Metrikleri

| Metrik | Kaynak | Eşik |
|---|---|---|
| http_req_duration p95 | k6 | < 500ms (normal), < 1s (yoğun) |
| http_req_failed | k6 | < 2% (normal), < 5% (yoğun) |
| DB active connections | PostgreSQL | < 25 (pool max) |
| DB query duration p95 | PostgreSQL | < 100ms |
| Memory RSS | Process | < 512MB (kararlı) |
| SSE active connections | Uygulama log | < 200 |
| Rate limit 429 oranı | k6 | Beklenen aralıkta |

---

## 5. Test Ortamı Gereksinimleri

| Bileşen | Gereksinim |
|---|---|
| Test istemcisi | k6 veya Artillery kurulu makine |
| Hedef | Staging ortamı (prod ile aynı yapılandırma) |
| Auth tokenları | Test kullanıcıları için önceden hazırlanmış JWT'ler |
| Test verisi | Seed script ile yüklenmiş temel veriler |
| İzleme | DB metrics, process metrics, k6 dashboard |

---

## 6. Test Çalıştırma Sırası

1. **Smoke test** → Temel sağlık doğrulama
2. **Normal yük** → Günlük kullanım simülasyonu
3. **Yoğun yük** → Pik saat simülasyonu
4. **Stres testi** → Kırılma noktası tespiti
5. **Dayanıklılık testi** → Uzun süreli kararlılık

Her test arası en az 5 dakika bekleme süresi (rate limiter sıfırlanması, DB connection drain).

---

## 7. Bilinen Riskler & Darboğaz Adayları

| Risk | Açıklama | Çözüm Önerisi |
|---|---|---|
| DB connection pool exhaustion | 25 bağlantı limiti, hediye pipeline'ı 5+ sorgu | Fire-and-forget pattern, connection pooler (PgBouncer) |
| SSE bellek sızıntısı | Listener temizlenmezse büyüyen Map | Timeout + cleanup interval |
| Rate limiter bellek | Her bucket+identity çifti için Map entry | TTL ile otomatik temizlik (mevcut) |
| LLM API timeout | Fal SSE 30s+ sürebilir | Client-side timeout, retry |
| Transaction deadlock | Eşzamanlı hediye/çekim aynı kullanıcıya | Serializable isolation yok, retry pattern |
