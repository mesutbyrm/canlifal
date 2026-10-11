# B1.5 ROUTING FIX REPORT

> 5 yanlış yönlendirmenin düzeltilmesi — yalnızca `api_backend_router.dart` değiştirildi.

## BEFORE

Aşağıdaki 5 endpoint, `ApiBackendRouter.resolve()` tarafından **SECOND** (`gamesApiBaseUrl` = ikinci backend) yönlendiriliyordu:

| Endpoint | Router kuralı | Hedef |
|---|---|---|
| `/api/memberships` | `_isMembershipBackendPath`: `path.startsWith('/api/membership')` | SECOND |
| `/api/memberships/packages` | aynı kural | SECOND |
| `/api/membership-badges` | aynı kural | SECOND |
| `/api/games/room` (+alt yolları) | `_isGameBackendPath`: `path.startsWith('/api/games/room')` | SECOND |
| `/api/games/play` | `_isGameBackendPath`: `path == '/api/games/play'` | SECOND |

**Sorun:** Bu 5 endpoint ikinci backend'de **404** döner, yalnızca ana backend'de (**MAIN** = `canlifal.com`) mevcuttur (B1 canlı probe ile doğrulanmıştır).

## AFTER

### Değişiklik 1 — `_isMembershipBackendPath`

```dart
// ÖNCE:
static bool _isMembershipBackendPath(String path) =>
    path.startsWith('/api/membership');

// SONRA:
static bool _isMembershipBackendPath(String path) =>
    path.startsWith('/api/membership/');
```

**Etki:** Son elemanına `/` (eğik çizgi) eklenerek:
- `/api/membership/plans` → hâlâ SECOND ✅ (tekil, `/` ile devam)
- `/api/membership/plans/purchase` → hâlâ SECOND ✅
- `/api/memberships` → artık MAIN ✅ (çoğul, `s` ile devam, `/` değil)
- `/api/memberships/packages` → artık MAIN ✅
- `/api/memberships/purchase` → artık MAIN ✅
- `/api/membership-badges` → artık MAIN ✅ (`-` ile devam, `/` değil)

### Değişiklik 2 — `_isGameBackendPath`

```dart
// ÖNCE:
static bool _isGameBackendPath(String path, String method) {
  if (path == '/api/games/rooms') return true;
  if (path == '/api/games/auto-match') return true;
  if (path.startsWith('/api/games/room')) return true;
  if (path == '/api/games/play') return true;
  return false;
}

// SONRA:
static bool _isGameBackendPath(String path, String method) {
  if (path == '/api/games/rooms') return true;
  if (path == '/api/games/auto-match') return true;
  // `/api/games/room*` ve `/api/games/play` artık ANA backend'e gider.
  return false;
}
```

**Etki:**
- `/api/games/rooms` (tam eşleşme) → hâlâ SECOND ✅
- `/api/games/auto-match` (tam eşleşme) → hâlâ SECOND ✅
- `/api/games/room` → artık MAIN ✅ (kural kaldırıldı)
- `/api/games/room/$roomId` → artık MAIN ✅
- `/api/games/room/$roomId/join` → artık MAIN ✅
- `/api/games/room/$roomId/chat` → artık MAIN ✅
- `/api/games/room/$roomId/viewers` → artık MAIN ✅
- `/api/games/play` → artık MAIN ✅ (kural kaldırıldı)

## Değiştirilen dosya

| Dosya | Değişiklik |
|---|---|
| `lib/core/network/api_backend_router.dart` | Membership prefix'ine `/` eklendi; games'den `room*` ve `play` kuralları kaldırıldı |
| `test/core/network/api_backend_router_test.dart` | Yeni beklentiler eklendi (B1.5 fix doğrulama testleri) |

> Datasource, endpoint sabitleri, model, backend, veritabanı, Redis — hiçbirine DOKUNULMADI.

## 5 Endpoint Doğrulaması

| Endpoint | ÖNCE | SONRA | Test sonucu |
|---|---|---|---|
| `/api/memberships` | SECOND (game) | **MAIN** | ✅ |
| `/api/memberships/packages` | SECOND (game) | **MAIN** | ✅ |
| `/api/membership-badges` | SECOND (game) | **MAIN** | ✅ |
| `/api/games/room` (+ alt yollar) | SECOND (game) | **MAIN** | ✅ |
| `/api/games/play` | SECOND (game) | **MAIN** | ✅ |

## `/api/membership/plans` kontrolü

| Endpoint | ÖNCE | SONRA | Test sonucu |
|---|---|---|---|
| `/api/membership/plans` | SECOND (game) | **SECOND (game)** — değişmedi | ✅ |
| `/api/membership/plans/purchase` | SECOND (game) | **SECOND (game)** — değişmedi | ✅ |

## Başka endpointlerin routing değişmediği doğrulaması

Mevcut test dosyasındaki 12 test senaryosunun tamamı geçti. Diğer tüm yönlendirmeler aynen korundu:

- ✅ Auth, profil, banner, sosyal, shorts, falcı, sohbet, kredi → MAIN
- ✅ Oyun kataloğu, sıralama, skor → MAIN
- ✅ `/api/games/rooms`, `/api/games/auto-match` → SECOND (değişmedi)
- ✅ `/api/pk/*` → SECOND (değişmedi)
- ✅ `/api/gifts/battles`, `/api/gifts/goals` → SECOND (değişmedi)
- ✅ `/api/live/pk/active`, `/api/live/guest/*` → SECOND (değişmedi)
- ✅ `/api/live/pk`, `/api/live/pk/score`, `/api/live/pk/sweep` → MAIN (değişmedi)
- ✅ `/api/chat/rooms/*/pk*` → MAIN (değişmedi)
- ✅ `/api/admin/gifts/*` → MAIN (değişmedi)

## Flutter analyze sonucu

```
Analyzing api_backend_router.dart...
No issues found! (ran in 0.6s)
```

## Test sonucu

```
00:00 +12: All tests passed!
```

12/12 test senaryosu başarıyla geçti. Yeni eklenen B1.5 test senaryoları:

- `oyun odası tekil + play Main backend (B1.5 fix)` — 5 assertion, hepsi GEÇTİ
- `çoğul üyelik + rozetler Main backend (B1.5 fix)` — 4 assertion, hepsi GEÇTİ
- `tekil üyelik planları Game backend (değişmedi)` — 2 assertion, hepsi GEÇTİ

## git diff özeti

```diff
--- a/lib/core/network/api_backend_router.dart
+++ b/lib/core/network/api_backend_router.dart

_isMembershipBackendPath:
-  path.startsWith('/api/membership')
+  path.startsWith('/api/membership/')

_isGameBackendPath:
-  if (path.startsWith('/api/games/room')) return true;
-  if (path == '/api/games/play') return true;
+  // kaldırıldı (artık MAIN'e düşer)
```

Toplam: **2 satır kaldırıldı**, **1 satır değiştirildi** (prefix'e `/` eklendi), **yorum/dokümantasyon güncellendi**.

## CODE CHANGED

**YES** — Yalnızca `lib/core/network/api_backend_router.dart` ve ilgili test dosyası değiştirildi.

## DEPLOYED

**NO** — Hiçbir deployment yapılmamıştır. Değişiklik yalnızca kaynak kodda uygulanmış ve test edilmiştir. Flutter uygulamasının yeniden derlenmesi (build) ve dağıtılması (release) ayrı bir adımdır.
