# FLUTTER SOURCE CONNECTION AUDIT

> Bu rapor SADECE TESPİT + ANALİZ amaçlıdır. Bu aşamada hiçbir kod değiştirilmemiş, hiçbir commit/deployment yapılmamıştır.
> Aşağıdaki tüm dosya yolları, satır numaraları ve base URL değerleri gerçek kaynak koddan (grep/cat) okunarak doğrulanmıştır — envanterden kopyalanmamıştır.

## REPOSITORY

- **mesutbyrm/Cursor-Flutter-**
- Erişim yöntemi: kaynak arşivi indirilip okundu (git clone platform tarafından engellendiği için arşiv/tarball yöntemi kullanıldı). Salt-okunur inceleme yapıldı; repoya yazma/push YAPILMADI.
- Flutter uygulaması repo içinde `mobile/` klasörü altındadır.

## BRANCH

- **main**

## SOURCE FOUND

- **YES**
- Flutter kaynağı ana uygulama çalışma alanında (`/home/ubuntu/fortune_telling_platform`) MEVCUT DEĞİLDİR — orası yalnızca ana backend kodudur. Flutter kaynağı ayrı repodadır ve bu inceleme için repo arşivinden okunmuştur.

## FLUTTER PROJECT

- **YES**
- `mobile/pubspec.yaml`: `name: canlifal_social`, `version: 1.0.148+182`, Dart SDK `>=3.8.0 <4.0.0`.
- Doğrulanan proje yapısı (`mobile/` altında): `pubspec.yaml` ✅, `lib/` ✅, `android/` ✅, `ios/` ✅, `assets/` ✅ (ayrıca `web/`, `macos/`, `windows/`, `linux/`, `test/`).
- `lib/` üst dizinleri: `app/`, `core/`, `features/`, `services/`, `main.dart`.

## API CLIENT

Ağ katmanı `lib/core/network/` altında toplanmıştır. İlgili çekirdek dosyalar:

| Dosya | Rol |
|---|---|
| `lib/core/network/api_backend_router.dart` | İstek path'ini backend'e yönlendiren tek karar noktası (`ApiBackendRouter.resolve`, `baseUrlFor`) |
| `lib/core/network/api_endpoints.dart` | Tüm endpoint path sabitleri (`ApiEndpoints.*`) |
| `lib/core/config/env.dart` | Base URL tanımları (`Env.apiBaseUrl`, `Env.gamesApiBaseUrl`, `Env.gatewayApiBaseUrl`) |
| `lib/core/network/dio_provider.dart` | Dio istemcisi + `safeGet/safePost/safePut/safePatch/safeDelete` sarmalayıcıları |

**Çağrı deseni:** Feature datasource'ları `_dio.safeGet/safePost(ApiEndpoints.X, ...)` çağırır. Yönlendirme, path bazında `ApiBackendRouter.resolve` tarafından otomatik yapılır; her datasource base URL'i elle belirtmez.

**Kapsam (gerçek grep):** `lib/` içinde toplam **522** adet `safeGet/safePost/safePut/safePatch/safeDelete` çağrısı bulunmaktadır.

## BASE URLS

`lib/core/config/env.dart` içindeki tanımlar (derleme-zamanı `String.fromEnvironment`, varsayılan değerlerle):

| Anahtar | Varsayılan değer | Anlamı |
|---|---|---|
| `Env.apiBaseUrl` | `https://canlifal.com` | **MAIN** (ana backend) |
| `Env.gamesApiBaseUrl` | `https://canlifalapi.abacusai.app` | **SECOND** (ikinci backend) |
| `Env.gatewayApiBaseUrl` | (boş) | Gateway — normal akışta kullanılmaz, yalnızca fallback |

**Router base URL eşlemesi** (`ApiBackendRouter.baseUrlFor`, `api_backend_router.dart` satır 7–11):

- `ApiBackendKind.main` → `Env.apiBaseUrl` → **MAIN** = `https://canlifal.com`
- `ApiBackendKind.game` → `Env.gamesApiBaseUrl` → **SECOND** = `https://canlifalapi.abacusai.app`
- `ApiBackendKind.gateway` → `Env.gatewayApiBaseUrl` (boş)

**Yönlendirme kuralları** (`ApiBackendRouter.resolve`, `api_backend_router.dart` satır 14–72). Aşağıdaki path prefix'leri **SECOND (game)** backend'e gider; geri kalan her şey **MAIN**'e gider:

1. `/api/pk*` (satır 33)
2. `/api/gifts/battles*` veya `/api/gifts/goals*` (satır 42–44)
3. `/api/membership*` (satır 51–52) ← **çoğul üyelik uçlarını yanlışlıkla kapsıyor**
4. `/api/live/pk/active*` veya `/api/live/guest/*` (satır 60–62)
5. `/api/games/rooms`, `/api/games/auto-match`, `/api/games/room*`, `/api/games/play` (satır 65–71) ← **games/room ve games/play burada**

## SECOND BACKEND CALLS

Router kuralına (yukarıdaki 5 prefix grubu) giren ve `api_endpoints.dart` içinde tanımlı **47 distinct endpoint path** ikinci backend'e (`gamesApiBaseUrl` = `https://canlifalapi.abacusai.app`) yönlendirilmektedir. Dağılım:

| Grup | Path adedi | Örnekler |
|---|---|---|
| `/api/pk*` | 29 | `/api/pk/active`, `/api/pk/$matchId`, `/api/pk/battles`, `/api/pk/admin/*`, `/api/pk/me/*` ... |
| `/api/gifts/battles*`, `/api/gifts/goals*` | 3 | `/api/gifts/battles`, `/api/gifts/battles/$id`, `/api/gifts/goals` |
| `/api/membership*` | 4 | `/api/memberships`, `/api/memberships/packages`, `/api/memberships/purchase`, `/api/membership-badges` |
| `/api/live/pk/active*`, `/api/live/guest/*` | 2 | `/api/live/pk/active`, `/api/live/guest/list` |
| `/api/games/room*`, `/api/games/rooms`, `/api/games/play`, `/api/games/auto-match` | 9 | `/api/games/room`, `/api/games/room/$roomId`, `/api/games/room/$roomId/join`, `/api/games/room/$roomId/chat`, `/api/games/room/$roomId/viewers`, `/api/games/rooms`, `/api/games/play`, `/api/games/auto-match` |
| **TOPLAM** | **47** | |

**Doğrulama notu (B0/B1 canlı probe ile tutarlı):** Bu 47 yolun büyük kısmı (özellikle `/api/pk*`, `/api/gifts/battles|goals`, `/api/live/pk/active`, `/api/live/guest`, gerçek oyun-odası uçları) SECOND backend'de gerçekten mevcuttur ve bu yönlendirme DOĞRUDUR. Ancak aşağıdaki 5 yol SECOND'da 404 döner, MAIN'de mevcuttur → yanlış yönlendirilmiştir (bkz. sonraki bölüm).

## FIVE WRONG ROUTES

Aşağıdaki 5 endpoint şu an `/api/membership*` ve `/api/games/room*` / `/api/games/play` prefix kuralları nedeniyle **SECOND**'a yönlendiriliyor; oysa yalnızca **MAIN**'de mevcutlar (B1 canlı probe: SECOND=404, MAIN=200/405).

### 1. `/api/memberships`
- **FILE:** `lib/features/membership/data/membership_remote_datasource.dart` (satır 18) — sabit tanımı: `lib/core/network/api_endpoints.dart:594` (`membershipsCatalog = '/api/memberships'`)
- **CLASS/FUNCTION:** `MembershipRemoteDataSource.loadCatalog()` (satır 15) — `_dio.safeGet(ApiEndpoints.membershipsCatalog)`
- **CURRENT BASE URL:** SECOND = `https://canlifalapi.abacusai.app` (router `/api/membership*` → game)
- **EXPECTED BASE URL:** MAIN = `https://canlifal.com`

### 2. `/api/memberships/packages`
- **FILE:** `lib/features/membership/data/membership_remote_datasource.dart` (satır 17) — sabit tanımı: `api_endpoints.dart:592` (`membershipPackages = '/api/memberships/packages'`)
- **CLASS/FUNCTION:** `MembershipRemoteDataSource.loadCatalog()` (satır 15) — `_dio.safeGet(ApiEndpoints.membershipPackages)`
- **CURRENT BASE URL:** SECOND = `https://canlifalapi.abacusai.app` (router `/api/membership*` → game)
- **EXPECTED BASE URL:** MAIN = `https://canlifal.com`

### 3. `/api/membership-badges`
- **FILE:** `lib/features/cosmetics/data/cosmetics_remote_datasource.dart` (satır 27) — sabit tanımı: `api_endpoints.dart:597` (`membershipBadges = '/api/membership-badges'`)
- **CLASS/FUNCTION:** `CosmeticsRemoteDataSource.fetchMembershipBadges()` (satır 25) — `_dio.safeGet(ApiEndpoints.membershipBadges)`
- **CURRENT BASE URL:** SECOND = `https://canlifalapi.abacusai.app` (router `/api/membership*` → game)
- **EXPECTED BASE URL:** MAIN = `https://canlifal.com`

### 4. `/api/games/room`
- **FILE:** `lib/features/games/data/game_remote_datasource.dart` — sabit tanımı: `api_endpoints.dart:215` (`gameRoomCreate = '/api/games/room'`), `224` (`gameRoom(roomId) => '/api/games/room/$roomId'`)
- **CLASS/FUNCTION:** `GameRemoteDataSource.createRoom()` (satır 27, `gameRoomCreate`), `autoMatch()` (satır 57, `gameRoomCreate`), `fetchRoomState()` (satır 111, `gameRoom(roomId)`), `sendMove()` (satır 136, `gameRoom(roomId)`)
- **CURRENT BASE URL:** SECOND = `https://canlifalapi.abacusai.app` (router `/api/games/room*` → game)
- **EXPECTED BASE URL:** MAIN = `https://canlifal.com`

### 5. `/api/games/play`
- **FILE:** `lib/features/games/data/game_remote_datasource.dart` — sabit tanımı: `api_endpoints.dart:216` (`gamePlay = '/api/games/play'`)
- **CLASS/FUNCTION:** `GameRemoteDataSource.createRoom()` (satır 68), `fetchRoomState()` (satır 119), `sendMove()` (satır 143/150) — `ApiEndpoints.gamePlay`
- **CURRENT BASE URL:** SECOND = `https://canlifalapi.abacusai.app` (router `/api/games/play` → game)
- **EXPECTED BASE URL:** MAIN = `https://canlifal.com`

> **İNCELİK (düzeltme aşamasında dikkat):** `/api/membership*` prefix kuralı hem TEKİL `/api/membership/plans` + `/api/membership/plans/purchase` (bunlar SECOND'da DOĞRU şekilde mevcut — B1: SECOND 200, MAIN 404) hem de ÇOĞUL `/api/memberships*` + `/api/membership-badges` (bunlar YANLIŞ — MAIN'de olmalı) yollarını aynı anda yakalıyor. Bu nedenle düzeltme, kuralı tümden kaldırmak değil, çoğul üyelik + `membership-badges` yollarını MAIN'e istisna etmek şeklinde olmalıdır. Benzer şekilde `/api/games/room*` ve `/api/games/play` MAIN'e alınırken, gerçekten SECOND'da olan diğer oyun-odası uçlarının (rooms, auto-match, room/join, room/chat, room/viewers) yönlendirmesi ayrıca doğrulanmalıdır. **Bu aşamada DÜZELTME YAPILMAMIŞTIR.**

## FILES REQUIRING CHANGE

Düzeltme aşamasında (B1.5 — henüz YAPILMADI) değiştirilecek dosyalar:

| Dosya | Neden |
|---|---|
| `lib/core/network/api_backend_router.dart` | Tek karar noktası. `_isMembershipBackendPath` çoğul üyelik + `membership-badges` yollarını dışlamalı; `_isGameBackendPath` içinde `/api/games/room*` ve `/api/games/play` MAIN'e alınmalı. Tek dosyada 5 routing de düzeltilebilir. |

> Not: Endpoint sabitleri (`api_endpoints.dart`) ve datasource dosyaları DOĞRUDUR (path'ler doğru yazılmış); sorun yalnızca yönlendirme kuralındadır. Bu nedenle asıl değişiklik tek dosyada (`api_backend_router.dart`) yeterli görünmektedir. Kesin düzeltme kapsamı B1.5'te onaylanacaktır.

## CODE CHANGED

**NO** — Bu aşamada hiçbir kaynak dosya değiştirilmemiştir.

## DEPLOYED

**NO** — Hiçbir commit, push veya deployment yapılmamıştır.
