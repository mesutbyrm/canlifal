# CanlıFal — Faz 26 Raporu

**Kapsam:** §84 Veri Modeli Dokümanı (yenileme) + §87 Backend Test Planı (yeni)
**Tarih:** 2026-08-27
**Tür:** Salt dokümantasyon — uygulama kodu değişmedi, regresyon riski yok.

---

## 1. Yapılanlar

| # | İş | Dosya | Durum |
|---|---|---|---|
| 1 | Veri modeli dokümanı Sürüm 2.0'a yükseltildi | `docs/CANLIFAL_DATA_MODEL.md` | Yeniden yazıldı (317 → 553 satır) |
| 2 | Backend test planı oluşturuldu | `docs/CANLIFAL_BACKEND_TEST_PLAN.md` | Yeni (289 satır) |
| 3 | Faz raporu | `docs/CANLIFAL_PHASE26_REPORT.md` | Yeni |

---

## 2. §84 — Veri Modeli Dokümanı Sürüm 2.0

Sürüm 1.0, Faz 1 envanteriydi: 198 model listesi ve "eksikler" tablosu. Bugün geçersizdi.

### Güncellenen sayılar

| Ölçüm | Sürüm 1.0 | Sürüm 2.0 |
|---|---|---|
| Model | 198 | **215** |
| Alan | 2338 | **2534** |
| `@@index` | 429 | **492** |
| `@@unique` | 62 | **65** |
| İlişki alanı | 180 | **306** |

### Eklenen bölümler

- **Bölüm 3 — İlişki Haritası.** §84'ün asıl istediği kısım: entity ilişkilerinin açıklanması.
  - 3.1 `User` merkezli yıldız topoloji (74 ilişki alanı) ve pratik sonuçları
  - 3.2 Yedi çekirdek zincir, şema diyagramlarıyla: falcı seansı, sesli oda, video yayın, hediye/gelir dağıtımı, cüzdan/para çekme, sosyal akış, PK/takım/turnuva
  - 3.3 Kendine referanslı ilişkiler (3 adet: davet zinciri, düet, iç içe yorum)
  - 3.4 Açık join modelleri ve bileşik tekillik kısıtları (8 doğrulanmış tablo)
  - 3.5 Silme davranışı: **135 Cascade / 5 SetNull**; finansal kayıtların hiçbir cascade zincirinde olmadığı kuralı
  - 3.6 Denormalize sayaçlar — hangi alanların yaklaşık olduğu, hangilerinin mutabakat için kullanılamayacağı
- **Bölüm 4 — Faz 3-23'te eklenen 17 model.** Sürüm 1.0'daki "eksik" tablosunun tamamı kapatıldı; her model hangi fazda ve hangi boşluğu kapattığı ile eşlendi.
- **Bölüm 5 — İndeks stratejisi.** 492 indeksin beş deseni ve büyük/küçük harf duyarsız arama yasağı.
- **Bölüm 6 — İstemci notları.** Sayfalama modları, idempotency, sayaç alanlarının güvenilirliği, `ownerId: null` durumu.

### Şemadan doğrulanan düzeltmeler

Taslakta yazılan ancak şemayla uyuşmayan dört iddia, `prisma/schema.prisma` üzerinden kontrol edilip düzeltildi:

| İddia | Gerçek | Aksiyon |
|---|---|---|
| `AgencyUser` bileşik unique taşır | Taşımıyor | Tablodan çıkarıldı |
| `OkeyMatchPlayer` bileşik unique taşır | Taşımıyor | Tablodan çıkarıldı |
| `ChatUserRole` unique = `[userId, roomId]` | `[roomId, userId]` | Düzeltildi |
| Denormalize sayaçlar `ShortVideo`/`SocialPost`/`User` üzerinde | Bu üç modelde sayaç yok | Gerçek sayaç listesi yazıldı + açık uyarı eklendi |

Ayrıca `$transaction` sayısı, ölçülen değerle değiştirildi: **50 çağrı / 38 dosya**.

---

## 3. §87 — Backend Test Planı

Spec'in istediği on sınıfın tamamı ayrı bölüm olarak yazıldı. Mevcut `CANLIFAL_TEST_PLAN.md` API kategorisi bazlıydı; bu doküman onun yerine geçmez, yanında durur ve test **türü** ekseninde organize edilmiştir.

| # | Sınıf | Senaryo sayısı | Öncelik |
|---|---|---|---|
| 1 | Unit | 6 modül | Orta |
| 2 | Integration | 6 akış | Yüksek |
| 3 | API sözleşme | 7 boyutlu matris | Yüksek |
| 4 | Realtime (SSE) | 9 senaryo | Yüksek |
| 5 | Concurrency | 7 yarış senaryosu | Kritik |
| 6 | Financial | 8 mutabakat kontrolü | Kritik |
| 7 | Security | 11 saldırı yolu | Kritik |
| 8 | WebRTC signaling | 7 senaryo | Orta |
| 9 | Performance | 7 ölçüm hedefi | Orta |
| 10 | Regression | 7 koruma kuralı | Kritik |

### Plana giren gerçek ölçümler

Senaryolar tahmine değil, koddan okunan değerlere dayanıyor:

- Rate-limit kovaları: `lib/rate-limit-guard.ts` içinde **18 tanımlı**, handler'larda **16 etkin kullanım**
- Hata kodu sabiti: `lib/api-response.ts` içinde **109**
- SSE ucu: `text/event-stream` içeren **20 route**
- İmleçli uç: `parseCursorParams` kullanan **12 route**
- İdempotent uç: `beginIdempotent` kullanan **11 route**
- Transaction: **50 `$transaction` çağrısı / 38 dosya**

### Altın kural

Paylaşımlı veritabanı nedeniyle plan, toplu veri silme içeren hiçbir test adımı önermez. Her senaryo kendi kayıtlarını üretir.

---

## 4. Doğrulama

| Kontrol | Sonuç |
|---|---|
| Uygulama kodu değişikliği | Yok (0 dosya) |
| Şema değişikliği | Yok |
| Sayısal iddiaların şemadan/koddan doğrulanması | Tamamlandı; 4 hatalı iddia düzeltildi |
| Tarayıcı UI testi | Yapılmadı (gerekmiyor — kod değişmedi) |
| Dağıtım | Yapılmadı |

---

## 5. Envanter (değişmedi)

780 handler · 502 path · 172 kategori · 215 model · 109 hata kodu · 20 SSE ucu · 18 rate-limit kovası · 12 imleçli uç · 11 idempotent uç · 50 transaction çağrısı.

---

## 6. Sıradaki Adım

§88 — Flutter'a Teslim Edilecek Paket: teslim kontrol listesinin 11+ maddesinin hangilerinin hazır, hangilerinin eksik olduğunu tek tabloda gösteren kapanış dokümanı.
