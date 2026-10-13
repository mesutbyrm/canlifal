# B1.13 — HEDİYE (GIFTS) P0 YÖNLENDİRME DÜZELTMESİ

**Faz:** B1.13 — Kod değişikliği (yalnızca P0 GIFTS yönlendirme sorunu)
**Tarih:** 2026-08-11
**Durum:** ✅ TAMAMLANDI (yerelde uygulandı + doğrulandı; henüz push/deploy YAPILMADI)

---

## 1. Özet

B1.12'de kanıtlanan **P0 hediye yönlendirme hatası** düzeltildi. Sorun: Flutter
yönlendiricisi (router) yalnızca `/api/gifts/battles` ve `/api/gifts/goals`
uçlarını ikinci backend'e (game) gönderiyordu. Ancak `gift_insights_remote_datasource.dart`
tarafından çağrılan `/api/gifts/insights/*` ve `/api/gifts/missions*` uçları da
SADECE ikinci backend'de mevcut (SECOND 200/401), ana backend'de 404 dönüyor.
Router bu uçları ana backend'e gönderdiği için **tüm hediye insights/missions
özelliği production'da 404** alıyordu.

Düzeltme yalnızca yönlendirici kuralına 3 prefix ekler. Kanıtlanamayan hiçbir
uç değiştirilmedi; yeni uç icat edilmedi; backend/DB/auth/MCP'ye dokunulmadı;
kanıtlanmış `battles` + `goals` yönlendirmesi bozulmadı.

---

## 2. Değiştirilen dosya(lar)

| # | Dosya | Değişiklik türü |
|---|-------|-----------------|
| 1 | `mobile/lib/core/network/api_backend_router.dart` | Yönlendirme kuralı + çağrı yeri + doküman yorumu |
| 2 | `mobile/test/core/network/api_backend_router_test.dart` | 3 yeni doğrulama testi (regresyon dahil) |

**Başka HİÇBİR dosya değiştirilmedi.** Datasource (`gift_insights_remote_datasource.dart`)
kendisinde host seçimi yapmıyor — yalnızca path ile `_dio.safeGet/safePost`
çağırıyor. Host seçimi %100 merkezi olarak `BackendRoutingInterceptor.onRequest`
içinde `ApiBackendRouter.resolve(path, method)` ile yapılıyor. Bu yüzden doğru ve
tek düzeltme yeri router'dır.

---

## 3. Değiştirilen fonksiyon

**Fonksiyon:** `ApiBackendRouter._isGiftBattleBackendPath` → **`_isGiftSplitBackendPath`**
(adı, kapsamı genişlediği için güncellendi) ve `resolve()` içindeki çağrı yeri.

### Önceki yönlendirme
```dart
// resolve() içinde:
if (_isGiftBattleBackendPath(p)) return ApiBackendKind.game;

static bool _isGiftBattleBackendPath(String path) =>
    path.startsWith('/api/gifts/battles') ||
    path.startsWith('/api/gifts/goals');
```

### Yeni yönlendirme
```dart
// resolve() içinde:
if (_isGiftSplitBackendPath(p)) return ApiBackendKind.game;

static bool _isGiftSplitBackendPath(String path) =>
    path.startsWith('/api/gifts/battles') ||
    path.startsWith('/api/gifts/goals') ||
    path.startsWith('/api/gifts/insights/') ||
    path == '/api/gifts/missions' ||
    path.startsWith('/api/gifts/missions/');
```

Doküman yorumu, ikinci backend'e giden hediye ailelerini listeleyecek ve ana
backend'de kalan aileleri (`version`, `catalog`, `types`, `send`, `lucky/*`,
`recent-big`, `check-reciprocal`) açıkça HARİÇ tutacak şekilde yeniden yazıldı.

---

## 4. Düzeltilen uç sayısı: **13**

(10 insights + 3 missions ailesi. `battles` + `goals` zaten doğruydu — değişmedi.)

### İnsights (10)
`feed`, `leaderboard`, `map`, `album/{id}`, `badge/{id}`, `collection/{id}`,
`first-gifter/{ctx}/{id}`, `me/badge`, `me/history`, `me/recommendations`

### Missions (3)
`/api/gifts/missions`, `/api/gifts/missions/me`, `/api/gifts/missions/{id}/claim`

---

## 5. HTTP probe sonuçları (canlı — 2026-08-11)

Her uç iki host'ta da GET ve POST ile denendi:

| Uç | MAIN GET | MAIN POST | SECOND GET | SECOND POST |
|----|:--:|:--:|:--:|:--:|
| `/api/gifts/insights/feed` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/leaderboard` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/map` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/album/{id}` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/badge/{id}` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/collection/{id}` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/first-gifter/{ctx}/{id}` | 404 | 404 | **200** | 404 |
| `/api/gifts/insights/me/badge` | 404 | 404 | **401** | 404 |
| `/api/gifts/insights/me/history` | 404 | 404 | **401** | 404 |
| `/api/gifts/insights/me/recommendations` | 404 | 404 | **401** | 404 |
| `/api/gifts/missions` | 404 | 404 | **200** | 404 |
| `/api/gifts/missions/me` | 404 | 404 | **401** | 404 |
| `/api/gifts/missions/{id}/claim` | 404 | 404 | 404 | **401** |
| `/api/gifts/battles` *(değişmedi)* | 404 | 404 | **200** | 401 |
| `/api/gifts/goals` *(değişmedi)* | 404 | 404 | **200** | 401 |

### Yorum (metod / auth / 2xx doğrulaması)
- **GET vs POST:** insights uçları ve `missions`/`missions/me` GET ile çalışıyor
  (POST 404). `missions/{id}/claim` ise beklendiği gibi **POST-only** (GET 404,
  POST 401). Router bu uçları metodtan bağımsız aynı host'a gönderir; doğru host
  ikinci backend'dir. ✅
- **401/403 auth davranışı:** kimlik gerektiren uçlar (`me/*`, `missions/me`,
  `missions/{id}/claim`) ikinci backend'de anonim istekte **401** döndürüyor —
  yani uç mevcut ve auth koruması aktif. ✅
- **2xx başarı:** herkese açık uçlar (`feed`, `leaderboard`, `map`, `album`,
  `badge`, `collection`, `first-gifter`, `missions`) ikinci backend'de **200**
  döndürüyor. ✅
- **Ana backend:** tüm 13 uç ana backend'de her metodda **404** — yani bu aileler
  ana backend'de YOK. Eski yönlendirme (ana backend) bu yüzden production'da
  komple 404 üretiyordu.

---

## 6. Test sonuçları

### flutter analyze
```
flutter analyze lib/core/network/api_backend_router.dart \
                test/core/network/api_backend_router_test.dart
→ Analyzing 2 items...
→ No issues found! (ran in 2.5s)
```
✅ 0 hata, 0 uyarı.

### flutter test (router)
```
flutter test test/core/network/api_backend_router_test.dart
→ 00:00 +15: All tests passed!
```
✅ 15/15 test geçti. Bunların 3'ü B1.13'te eklendi:
1. **hediye insights + missions ikinci backend (SECOND)** — insights/missions
   uçlarının `ApiBackendKind.game`'e gittiğini doğrular.
2. **hediye battles + goals ikinci backend korunur (regresyon yok)** — kanıtlanmış
   yönlendirmenin bozulmadığını doğrular.
3. **hediye ana backend aileleri korunur (MAIN)** — `version`, `catalog`, `types`,
   `send`, `recent-big`, `check-reciprocal` uçlarının hâlâ ana backend'e
   (`ApiBackendKind.main`) gittiğini doğrular.

---

## 7. Kısıt uyumu

| Kısıt | Durum |
|-------|:--:|
| İmzalama/keystore/Play Store/APK/AAB'ye dönülmedi | ✅ |
| Flutter'a MCP istemcisi eklenmedi | ✅ |
| 273 kullanılmayan backend rotası Flutter'a eklenmedi | ✅ |
| Yeni uç icat edilmedi / backend uç oluşturulmadı | ✅ |
| DB / MCP / auth değişikliği yok | ✅ |
| Diğer özelliklere dokunulmadı | ✅ |
| `battles` + `goals` yönlendirmesi bozulmadı (test ile kanıtlı) | ✅ |
| Ana backend hediye aileleri (catalog/send vb.) korundu (test ile kanıtlı) | ✅ |

Her uç için gerçek host, canlı probe ile kanıtlandı. **BLOCKED uç yoktur** — 13
uçun tamamı ikinci backend'de (SECOND) mevcut olduğu kanıtlandı.

---

## 8. Push / Deploy durumu

B1.13 kapsamı = düzelt + doğrula + raporla. Değişiklik **yerelde uygulandı ve
doğrulandı**; Flutter deposuna **push YAPILMADI**, herhangi bir deploy/imzalama
YAPILMADI. Push istenirse ayrıca yapılabilir.

---

## DUR

B1.13 tamamlandı. Yalnızca GIFTS P0 yönlendirme düzeltmesi yapıldı; 2 Flutter
dosyası değişti (router + test); analyze temiz, 15/15 test geçti; 13 uç canlı
probe ile ikinci backend'de doğrulandı. Onayınız olmadan push/deploy yapılmaz.
