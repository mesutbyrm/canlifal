# B1.7 REPO SYNC REPORT

> B1.5 routing düzeltmesi GitHub reposuna aktarıldı.

## Repository

- **mesutbyrm/Cursor-Flutter-**
- Erişim: GitHub REST API (git clone platform tarafından engellendiği için)

## Branch

- **main**

## Previous commit

- **SHA:** `108abbd493875f113f1925a5425c270429ca04a6`
- Push öncesi `main` branch'in HEAD'i

## New commit

- **SHA:** `a5ce815378fb92185e8a400a85e17f92a8afcbbf`
- **Tarih:** 2026-08-10T23:30:48Z
- **Parent:** `108abbd493875f113f1925a5425c270429ca04a6`

## Changed files

| Dosya | Durum | Değişiklik |
|---|---|---|
| `mobile/lib/core/network/api_backend_router.dart` | modified | 19 satır |
| `mobile/test/core/network/api_backend_router_test.dart` | modified | 47 satır |

**Değişmeyen dosyalar (doğrulandı):**
- ✅ Datasource dosyaları — dokunulmadı
- ✅ API endpoint sabitleri (`api_endpoints.dart`) — dokunulmadı
- ✅ Modeller — dokunulmadı
- ✅ Auth — dokunulmadı
- ✅ TRTC — dokunulmadı
- ✅ SSE — dokunulmadı
- ✅ Socket — dokunulmadı
- ✅ Backend — dokunulmadı
- ✅ Database — dokunulmadı
- ✅ Redis — dokunulmadı
- ✅ Android native kodu — dokunulmadı
- ✅ iOS native kodu — dokunulmadı

## Commit message

```
fix(flutter): route memberships and game endpoints to main backend
```

## Push result

- **Başarılı** ✅
- GitHub `refs/heads/main` güncellendi: `108abbd` → `a5ce815`
- Yöntem: GitHub Git Data API (blob → tree → commit → ref update)
- Force push KULLANILMADI — normal fast-forward

## Değişiklik özeti

### `api_backend_router.dart`

1. **`_isMembershipBackendPath`:** `path.startsWith('/api/membership')` → `path.startsWith('/api/membership/')` — çoğul üyelik yolları (`/api/memberships*`, `/api/membership-badges`) artık MAIN'e gidiyor; tekil `/api/membership/plans` SECOND'da kaldı.

2. **`_isGameBackendPath`:** `path.startsWith('/api/games/room')` ve `path == '/api/games/play'` kuralları kaldırıldı — `/api/games/room*` ve `/api/games/play` artık MAIN'e gidiyor; `/api/games/rooms` ve `/api/games/auto-match` SECOND'da kaldı.

### `api_backend_router_test.dart`

- Eski `oyun odası uçları Game backend` testi 3 ayrı teste bölündü:
  - `oyun odası listeleme + eşleşme Game backend` (rooms + auto-match → SECOND)
  - `oyun odası tekil + play Main backend (B1.5 fix)` (room, room/join, room/chat, play → MAIN)
  - `çoğul üyelik + rozetler Main backend (B1.5 fix)` (memberships, memberships/packages, membership-badges → MAIN)
  - `tekil üyelik planları Game backend (değişmedi)` (membership/plans → SECOND)

## Flutter analyze sonucu

```
Analyzing api_backend_router.dart...
No issues found! (ran in 0.6s)
```

## Router test sonucu

```
00:00 +12: All tests passed!
```

12/12 test senaryosu başarıyla geçti.

## Deployment

**NO** — Hiçbir APK build veya deployment yapılmamıştır. Yalnızca kaynak kodu GitHub'a aktarılmıştır.
