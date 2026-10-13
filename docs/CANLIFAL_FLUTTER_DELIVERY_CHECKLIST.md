# CanlıFal — Flutter'a Teslim Edilecek Paket

**Sürüm:** 1.0  
**Tarih:** 2026-08-27  
**Kaynak:** §88 — Backend fazının sonunda aşağıdakiler hazır olmadan Flutter entegrasyonuna geçilmez.

---

## Durum Açıklamaları

| Simge | Anlam |
|-------|-------|
| ✅ | Hazır — doküman mevcut, güncel, md+pdf+docx üçlüsü var |
| ✅📄 | Hazır — farklı formatta (json, md, tek format) |
| ⚠️ | Kısmen hazır — doküman var ama ek genişletme faydalı |
| ❌ | Eksik — henüz üretilmedi |

---

## Teslim Kontrol Listesi (30 Madde)

| # | Madde | Durum | Dosya(lar) | Not |
|---|-------|-------|-----------|-----|
| 1 | API documentation | ✅ | `docs/CANLIFAL_API.md` (1214 satır), `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` (996 satır) | Genel API rehberi + Flutter sözleşmesi |
| 2 | OpenAPI / Swagger | ✅📄 | `backend-docs/openapi.json` (45320 satır) | JSON formatında; Swagger UI ile doğrudan kullanılabilir |
| 3 | API endpoint list | ✅📄 | `backend-docs/ENDPOINTS.md` (1999 satır), `backend-docs/endpoints_index.json` (10532 satır) | 502 path, 780 handler |
| 4 | Request/response schemas | ✅📄 | `backend-docs/openapi.json` (schemas bölümü), `backend-docs/postman_collection.json` (30137 satır) | OpenAPI şemaları + Postman örnekleri |
| 5 | Authentication documentation | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Auth, `docs/CANLIFAL_SECURITY.md` | Mobile JWT (access 7d / refresh 30d), web session; dual-auth |
| 6 | Authorization documentation | ✅ | `docs/CANLIFAL_PERMISSIONS.md` (md+pdf+docx) | 6 sistem rolü, 40+ izin, rol tabanlı erişim |
| 7 | WebSocket documentation | ✅ | `docs/CANLIFAL_REALTIME_EVENTS.md` (719 satır, md+pdf+docx) | SSE tabanlı (WebSocket değil); 7 kanal, 30+ olay tipi |
| 8 | Event schema | ✅ | `docs/CANLIFAL_REALTIME_EVENTS.md` | Her olay: ad, tetik, alıcı, yetki, yük, sıralama, yeniden deneme, kopya, istemci aksiyonu |
| 9 | Room bootstrap | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Room/Chat | `GET /api/chat/rooms/{id}/state` zarflı bootstrap; koltuk, DJ, PK durumu dahil |
| 10 | Live bootstrap | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Live, `docs/CANLIFAL_WEBRTC.md` | Video stream oluşturma, TRTC token, co-broadcaster |
| 11 | PK API | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §PK | Chat-room PK + stream PK + live PK; idempotent |
| 12 | Gift API | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Gift, `backend-docs/CANLIFAL_HEDIYE_SISTEMI_DOKUMANTASYONU.md` | 3 bağlam (chat/stream/live), combo, efekt, gelir dağılımı |
| 13 | Wallet API | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Wallet | `GET /api/wallet` → coins, jetonBalance, cfcBalance, credits |
| 14 | Membership API | ⚠️ | `backend-docs/openapi.json` (supporter-level, fan-club uçları) | Uçlar OpenAPI'de tanımlı; bağımsız doküman henüz yok |
| 15 | Level API | ⚠️ | `backend-docs/openapi.json` (level uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 16 | Effect API | ⚠️ | `backend-docs/openapi.json` (effect-rule uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 17 | Agency API | ✅ | `docs/CANLIFAL_AGENCY.md` (165 satır, md+pdf+docx) | Ajans CRUD, üye yönetimi, komisyon |
| 18 | Tournament API | ✅ | `docs/CANLIFAL_TOURNAMENT.md` (190 satır, md+pdf+docx) | Turnuva oluşturma, katılım, skor tablosu |
| 19 | Leaderboard API | ⚠️ | `backend-docs/openapi.json` (leaderboard uçları) | Uçlar OpenAPI'de; bağımsız rehber henüz yok |
| 20 | Notification API | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Notification | GET/POST/DELETE; okundu işaretleme, deepLink, tekilleştirme |
| 21 | Support API | ⚠️ | `backend-docs/openapi.json` (support-ticket uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 22 | Device/session API | ✅ | `docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` §Device | `POST/DELETE /api/devices/fcm`; token yönetimi |
| 23 | Verification API | ⚠️ | `backend-docs/openapi.json` (verification uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 24 | Explore API | ⚠️ | `backend-docs/openapi.json` (explore/discover uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 25 | Location API | ⚠️ | `backend-docs/openapi.json` (city/location uçları) | Uçlar mevcut; bağımsız rehber henüz yok |
| 26 | Feature flag API | ✅ | `docs/CANLIFAL_FEATURE_FLAGS.md` (117 satır, md+pdf+docx) | Bootstrap + config ucu, istemci kontrol akışı |
| 27 | Remote config API | ✅ | `docs/CANLIFAL_REMOTE_CONFIG.md` (124 satır, md+pdf+docx) | Gruplu yapı, JSON parse rehberi |
| 28 | Error code list | ✅ | `lib/ERROR_CODES.md` (md+pdf+docx), `docs/CANLIFAL_ERROR_CODES.md` | 109 hata kodu, zarf yapısı |
| 29 | Test plan | ✅ | `docs/CANLIFAL_BACKEND_TEST_PLAN.md` (289 satır, md+pdf+docx) | 10 test sınıfı, 75+ senaryo |
| 30 | Security documentation | ✅ | `docs/CANLIFAL_SECURITY.md` (189 satır, md+pdf+docx) | Rate-limit, IDOR koruma, token ömrü, idempotency |

---

## Özet Sayılar

| Metrik | Değer |
|--------|-------|
| Toplam madde | 30 |
| ✅ Hazır | 21 |
| ⚠️ Kısmen hazır (OpenAPI'de var, bağımsız rehber yok) | 9 |
| ❌ Eksik | 0 |

---

## ⚠️ Kısmen Hazır Maddeler — Detay

Aşağıdaki 9 madde için uç noktaları OpenAPI (45320 satır) ve Postman koleksiyonunda (30137 satır) **tam olarak tanımlıdır** — istek/yanıt şemaları, yol parametreleri ve örnekler dahil. Ancak Flutter geliştiricisinin kullanım kolaylığı için **bağımsız bir rehber dokümanı** henüz yazılmamıştır:

| # | Alan | OpenAPI'deki path sayısı (yaklaşık) |
|---|------|-------------------------------------|
| 14 | Membership (Supporter Level, Fan Club) | ~12 |
| 15 | Level (user level, XP) | ~8 |
| 16 | Effect (entrance, chat bubble, name) | ~10 |
| 19 | Leaderboard | ~6 |
| 21 | Support (ticket CRUD) | ~8 |
| 23 | Verification (KYC, identity) | ~10 |
| 24 | Explore / Discover | ~4 |
| 25 | Location / City | ~3 |

**Önerilen aksiyon:** Bu 9 alan için OpenAPI şemaları yeterlidir; Flutter geliştirici Postman koleksiyonunu import ederek doğrudan çalışabilir. İstenirse her biri için 1-2 sayfalık kullanım rehberi üretilebilir.

---

## Teslim Paketi Dosya Listesi

### Ana Dokümanlar (docs/)
| Dosya | Boyut | Formatlar |
|-------|-------|-----------|
| CANLIFAL_FLUTTER_BACKEND_CONTRACT | 996 satır | md + pdf + docx |
| CANLIFAL_REALTIME_EVENTS | 719 satır | md + pdf + docx |
| CANLIFAL_DATA_MODEL | 553 satır | md + pdf + docx |
| CANLIFAL_BACKEND_TEST_PLAN | 289 satır | md + pdf + docx |
| CANLIFAL_API | 1214 satır | md |
| CANLIFAL_PERMISSIONS | 217 satır | md + pdf + docx |
| CANLIFAL_SECURITY | 189 satır | md + pdf + docx |
| CANLIFAL_TOURNAMENT | 190 satır | md + pdf + docx |
| CANLIFAL_AGENCY | 165 satır | md + pdf + docx |
| CANLIFAL_PERFORMANCE | 157 satır | md + pdf + docx |
| CANLIFAL_ERROR_CODES | 145 satır | md + pdf + docx |
| CANLIFAL_REMOTE_CONFIG | 124 satır | md + pdf + docx |
| CANLIFAL_FEATURE_FLAGS | 117 satır | md + pdf + docx |
| CANLIFAL_WEBRTC | 251 satır | md + pdf + docx |

### Makine Okunur Dosyalar (backend-docs/)
| Dosya | Boyut | Format |
|-------|-------|--------|
| openapi.json | 45320 satır | OpenAPI 3.0 |
| postman_collection.json | 30137 satır | Postman v2.1 |
| ENDPOINTS.md | 1999 satır | Markdown |
| endpoints_index.json | 10532 satır | JSON |

### Hata Kodu Referansı (lib/)
| Dosya | Format |
|-------|--------|
| ERROR_CODES.md | md + pdf + docx |

---

## Envanter (değişmedi)

780 handler · 502 path · 172 kategori · 215 model · 2534 alan · 492 indeks · 65 tekillik kısıtı · 306 ilişki alanı · 109 hata kodu · 20 SSE ucu · 18 rate-limit kovası (16 etkin) · 12 imleçli uç · 11 idempotent uç · 50 transaction çağrısı / 38 dosya · 135 Cascade / 5 SetNull.
