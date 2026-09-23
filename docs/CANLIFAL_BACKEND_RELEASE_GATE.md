# CanliFal — Backend Release Gate

**Sürüm:** 1.0  
**Tarih:** 2026-08-27  
**Kaynak:** §89 — Backend production-ready kabul edilmeden önce 24 maddelik kontrol listesi.

---

## Açıklama

Bu belge, backend'in canlı ortama (production) çıkarılmadan önce geçmesi gereken 24 test alanını tanımlar. Her alan için mevcut durum, kanıt ve sonraki adım belirtilmiştir.

**Önemli not:** Projede henüz otomatik test altyapısı (Jest/Vitest) kurulmamıştır. Aşağıdaki değerlendirmeler kod incelemesi, canlı uç testleri ve build doğrulaması üzerinden yapılmıştır. Otomatik testler yazıldıkça bu belge güncellenmelidir.

---

## Durum Açıklamaları

| Simge | Anlam |
|-------|-------|
| GEÇTİ | Kod incelemesi ve/veya canlı test ile doğrulandı |
| KISMI | Mekanizma mevcut ama otomatik test yok |
| BEKLEMEDE | Henüz test edilmedi veya altyapı kurulmadı |

---

## Kontrol Listesi

| # | Alan | Durum | Kanıt / Açıklama |
|---|------|-------|------------------|
| 1 | API tests | KISMI | 780 handler build ediyor (tsc + next build başarılı). Otomatik API testi henüz yok; OpenAPI + Postman koleksiyonu (30137 satır) manuel test için hazır. 8 canlı uç testi Faz 24'te yapıldı. |
| 2 | Database tests | KISMI | 215 model, 492 indeks, 65 tekillik kısıtı. Şema `db push` hatasız uygulanmış. Otomatik DB testi henüz yok. |
| 3 | Authentication tests | GEÇTİ | Dual-auth (web session + mobile JWT) 370 dosyada `getServerSession`/`authenticateRequest` ile korunuyor. Mobile login canlı test edildi (Faz 24). Token ömrü: access 7g, refresh 30g. |
| 4 | Authorization tests | KISMI | 6 sistem rolü, 40+ izin, `checkPermission` guard. Rol tabanlı erişim admin panelinde doğrulanmış. Otomatik RBAC testi henüz yok. |
| 5 | WebSocket tests | KISMI | SSE tabanlı (WebSocket değil). 20 SSE ucu, 7 kanal, 30+ olay tipi. 2sn poll, 15sn heartbeat, Last-Event-ID replay. Canlı SSE doğrulaması Faz 24'te yapıldı. |
| 6 | Room tests | KISMI | Sohbet odası CRUD, koltuk yönetimi, DJ, oda olayları mevcut. `GET /api/chat/rooms/{id}/state` bootstrap doğrulandı (Faz 24). Otomatik test yok. |
| 7 | Seat concurrency tests | GEÇTİ | Faz 23'te TOCTOU yarış durumu interactive `$transaction` ile düzeltildi. ReadCommitted izolasyon seviyesi. Kod incelemesi ile doğrulandı. |
| 8 | PK tests | KISMI | Chat-room PK + stream PK + live PK; 15 ilgili dosya. Idempotency key desteği (Faz 22). Otomatik test yok. |
| 9 | Gift tests | KISMI | 3 bağlam (chat/stream/live), combo, efekt, gelir dağılımı. 25 route dosyası. Interactive tx ile korunuyor (Faz 20). Idempotency key (Faz 22). Otomatik test yok. |
| 10 | Wallet tests | KISMI | `GET /api/wallet` coins/jetonBalance/cfcBalance/credits döndürüyor (Faz 24'te doğrulandı). Bakiye düşme işlemleri interactive tx içinde. Otomatik test yok. |
| 11 | Ledger tests | KISMI | `recordMultiLeg` 6 dosyada kullanılıyor. Çift giriş muhasebe (debit/credit dengesi). Otomatik denge doğrulama testi henüz yok. |
| 12 | Withdrawal tests | KISMI | Çekim API'si mevcut (`/api/withdrawals`). Batch tx ile korunuyor (Faz 20). Otomatik test yok. |
| 13 | Leaderboard tests | KISMI | `/api/leaderboards` mevcut. OpenAPI'de tanımlı. Otomatik test yok. |
| 14 | Reward tests | KISMI | Günlük görev + başarım sistemi mevcut. Interactive tx + P2002 guard (Faz 20). Otomatik test yok. |
| 15 | Notification tests | GEÇTİ | Tekilleştirme (60sn-24sa pencere), deepLink, 40+ çağrıcı. Canlı kopya testi Faz 21'de yapıldı (3 mesaj -> 1 bildirim). |
| 16 | Agency tests | KISMI | 10 route dosyası. Komisyon hesaplama interactive tx içinde (Faz 20). Otomatik test yok. |
| 17 | Tournament tests | KISMI | Turnuva CRUD mevcut. OpenAPI'de tanımlı. Otomatik test yok. |
| 18 | Support tests | KISMI | 4 route dosyası (ticket CRUD). Otomatik test yok. |
| 19 | Device tests | KISMI | FCM token POST/DELETE mevcut (Faz 24'te doğrulandı). Otomatik test yok. |
| 20 | Security tests | GEÇTİ | Rate-limit: 18 kova (16 etkin), 31 dosyada guard. IDOR koruma: userId session'dan türetiliyor. Input validation: zod şema doğrulaması yaygın. Token ömrü sınırlı. CORS ve helmet header'ları mevcut. |
| 21 | Rate-limit tests | GEÇTİ | 18 rate-limit kovası tanımlı, 16'sı etkin. `guardRateLimit` 31 dosyada. 429 yanıtı Retry-After + X-RateLimit-* başlıkları ile. Faz 17'de uygulanıp doğrulandı. |
| 22 | Idempotency tests | GEÇTİ | 11 idempotent uç (Faz 22). `beginIdempotent`/`releaseIdempotent` deseni. 24sa TTL. `idempotency-key` / `x-idempotency-key` başlık desteği. |
| 23 | Performance tests | KISMI | 492 indeks (B-Tree + BRIN). İmleç tabanlı sayfalama 12 uçta. Cache katmanı (`getCached`, `getCachedPlatformSetting`). Otomatik yük testi henüz yok. |
| 24 | Regression tests | KISMI | Build başarılı (tsc + next build). 109 hata kodu, zarf yapısı tanımlı. Eski sayfalama modu korunuyor. Otomatik regresyon testi yok. |

---

## Özet Sayılar

| Metrik | Değer |
|--------|-------|
| Toplam alan | 24 |
| GEÇTİ (kod incelemesi + canlı test) | 6 |
| KISMI (mekanizma var, otomatik test yok) | 18 |
| BEKLEMEDE | 0 |

---

## GEÇTİ Olarak İşaretlenen 6 Alan — Kanıt Özeti

| # | Alan | Doğrulama Yöntemi |
|---|------|-------------------|
| 3 | Authentication | Canlı mobile-login testi (Faz 24), 370 dosya auth guard |
| 7 | Seat concurrency | Interactive tx + ReadCommitted (Faz 23), kod incelemesi |
| 15 | Notification | Canlı kopya testi: 3 mesaj -> 1 bildirim (Faz 21) |
| 20 | Security | Rate-limit + IDOR + input validation + token ömrü (Faz 17-23) |
| 21 | Rate-limit | 18 kova, 31 dosya, 429+Retry-After (Faz 17) |
| 22 | Idempotency | 11 uç, 24sa TTL, başlık desteği (Faz 22) |

---

## KISMI Alanların Tamamlanması İçin Gerekli Adımlar

1. **Test altyapısı kurulumu**: Jest veya Vitest yapılandırması, test veritabanı bağlantısı.
2. **Birim testleri**: `lib/` altındaki yardımcı fonksiyonlar (komisyon hesaplama, sayfalama, hata zarfı, bildirim tekilleştirme).
3. **Entegrasyon testleri**: Her alan için en az 1 mutlu yol + 1 hata yolu testi.
4. **Yük testi**: k6 veya artillery ile kritik uçlar (hediye gönderme, koltuk atama, PK).
5. **Regresyon**: Zarf yapısı, eski sayfalama modu, alan adları için anlık görüntü testleri.

---

## Bağımlılıklar (önerilen öncelik sırası)

1. Test altyapısı (Jest/Vitest + test DB)
2. Birim testleri (lib/ fonksiyonları)
3. Entegrasyon testleri (API uçları)
4. Yük/performans testleri
5. Regresyon test paketi

---

## Envanter (değişmedi)

780 handler · 502 path · 172 kategori · 215 model · 2534 alan · 492 indeks · 65 tekillik kısıtı · 109 hata kodu · 20 SSE ucu · 18 rate-limit kovası · 12 imleçli uç · 11 idempotent uç · 50 transaction / 38 dosya · 135 Cascade / 5 SetNull.
