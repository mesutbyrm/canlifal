# CanlıFal — Faz 9 Raporu
## Anti-Fraud / Risk Skorlama Katmanı

Tarih: 2026-08-27

---

### Özet

§89 yayın kapısı listesindeki **#17 — anti-fraud / risk skorlama** maddesi kapatıldı.
Eklenen katman **tamamen gözlem amaçlıdır**: hiçbir para akışını engellemez, hiçbir
mevcut ucun yanıtını veya davranışını değiştirmez. Finansal işlemler sırasında
sinyalleri toplar, 0–100 arası bir skor üretir ve `RiskEvent` tablosuna yazar.
Tüm çağrılar *fire-and-forget* olup hata durumunda ana akışı kesmez.

---

### 1. Yeni veri modeli (eklemeli)

| Model | Tablo | Açıklama |
|---|---|---|
| `RiskEvent` | `risk_events` | Salt-ekleme risk olay kaydı: userId, category, score (0-100), level, signals (JSON), amount, currency, referenceType/Id, ip, reviewed/reviewedBy/reviewedAt/reviewNote, metadata, createdAt. 5 indeks: userId, category, level, reviewed, createdAt. |

Düz `String userId` kullanılır (LedgerEntry / AuditLog ile aynı kural) — `User`
modeline ilişki eklenmedi, mevcut şema ilişkileri değişmedi.

---

### 2. Yeni kütüphane — `lib/risk-score.ts`

| Fonksiyon | Görev |
|---|---|
| `computeRiskScore(input)` | Sinyalleri toplar, skor + seviye döner. Asla throw etmez. |
| `recordRiskEvent(input)` | Skoru hesaplar ve `RiskEvent` kaydı oluşturur. Hata → `null`. |
| `getRiskEvents(opts)` | Sayfalanmış liste + toplam (admin ucu için). |
| `DEFAULT_RISK_RULES` | Varsayılan ağırlıklar; `risk_rules` RemoteConfig kaydı ile ezilebilir (60 sn önbellek). |

#### Sinyaller ve varsayılan ağırlıkları

| Sinyal | Ağırlık | Koşul |
|---|---|---|
| `new_account` | 25 | Hesap < 24 saat |
| `young_account` | 12 | Hesap < 7 gün |
| `velocity` | 20 | Son 60 dk içinde ≥ 3 riskli işlem |
| `amount_spike` | 20 | Tutar, 30 günlük kategori ortalamasının 5 katından fazla |
| `first_large_withdrawal` | 15 | İlk çekim talebi ve tutar ≥ 1000 |
| `rapid_topup_withdraw` | 20 | Son 60 dk içinde yükleme talebi varken çekim |
| `large_amount` | 15 | Tutar ≥ 5000 |

#### Seviye eşikleri

| Seviye | Skor |
|---|---|
| `low` | 0–29 |
| `medium` | 30–54 |
| `high` | 55–79 |
| `critical` | 80–100 |

Tüm eşik ve ağırlıklar `risk_rules` RemoteConfig kaydı üzerinden kod değişikliği
olmadan güncellenebilir.

---

### 3. Bağlanan uçlar (fire-and-forget, mevcut mantık değişmedi)

| Uç | Kategori | Ekleme yeri |
|---|---|---|
| `POST /api/withdrawals` | `withdrawal` | `recordLedger` çağrısının hemen ardına |
| `POST /api/payments/requests` | `payment_request` | `cfcPaymentRequest.create` sonrasına |

Her iki uçta da yanıt gövdesi, durum kodu, doğrulama sırası ve idempotency
davranışı **aynen korundu**.

---

### 4. Yeni yönetim uçları

| Uç | Metot | Açıklama |
|---|---|---|
| `/api/admin/risk-events` | GET | Sayfalanmış liste. Filtreler: `level`, `category`, `userId`, `reviewed`, `page`, `limit`. Kullanıcı adlarıyla zenginleştirilmiş. `apiPaginated` zarfı. |
| `/api/admin/risk-events/[eventId]` | PATCH | İncelendi olarak işaretle + not. `risk_event_review` denetim kaydı yazar. |

Her ikisi de `resolveUser` + `isAdminRole` ile korunur ve standart hata zarfını kullanır.

---

### 5. Yeni yönetim arayüzü

`/[lang]/admin/risk` — koyu tema, `AdminBackButton`, framer-motion.
Seviye / kategori / incelenme durumu filtreleri, sinyal dökümü, satır içi
inceleme notu ve sayfalama.

Yönetim ana sayfasına **⚠️ Risk & Dolandırıcılık** bağlantısı eklendi
(⚙️ Görünüm & Ayarlar grubu, Rol & Yetki satırının altına).

---

### 6. Envanter değişimi

| Ölçüm | Faz 8 | Faz 9 |
|---|---|---|
| Uç nokta işleyicisi | 773 | **775** |
| OpenAPI yolu | 495 | **497** |
| Kategori | 166 | **167** |
| Veri modeli | 213 | **214** |

`backend-docs/` (ENDPOINTS.md, openapi.json, postman_collection.json,
endpoints_index.json) yeniden üretildi.

---

### 7. Doğrulama durumu

| Kontrol | Durum |
|---|---|
| Tip denetimi (tsc) | ✅ Hatasız |
| Üretim derlemesi | ✅ Başarılı |
| Şema senkronizasyonu | ✅ Eklemeli, veri kaybı yok |
| Geliştirme sunucusu | ✅ Ayakta |
| Canlı uçtan uca test | ❌ Yapılmadı |
| Yayına alma | ❌ Yapılmadı |

---

### 8. §89 yayın kapısı güncellemesi

| # | Madde | Önce | Sonra |
|---|---|---|---|
| 17 | Anti-fraud / risk skorlama | ❌ | ✅ |

Kalan açık maddeler: #3 standart hata zarfı yaygınlaştırma, #11 imleç tabanlı
sayfalama standardı, #13 hız sınırı kapsamı, #19 derin bağlantı standardı,
#21 yük testi, #23 test planı, #24 platformlar arası tutarlılık testi.
