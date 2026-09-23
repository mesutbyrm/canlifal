# CANLIFAL — AŞAMA B1.8
## FLUTTER TEMİZ BUILD ve RELEASE ÖNCESİ DOĞRULAMA RAPORU

**Tarih:** 2026-08-10 23:47 UTC  
**Kapsam:** Yalnızca doğrulama. APK/AAB build YOK, deployment YOK, yeni commit YOK, backend/DB/Redis'e dokunulmadı, endpoint değiştirilmedi.  
**Flutter SDK:** 3.44.2 • stable • Dart 3.8+  
**Uygulama:** `canlifal_social` — sürüm `1.0.148+182`

---

## 1 — REPOSITORY DOĞRULAMA

| Alan | Değer |
|---|---|
| Repository | `mesutbyrm/Cursor-Flutter-` |
| Branch | `main` |
| Doğrulama için istenen commit | `a5ce815378fb92185e8a400a85e17f92a8afcbbf` |
| **main branch güncel HEAD** | **`bdebe2769aa92978ff86855220d42fd1d7b48c51`** |
| Erişim yöntemi | GitHub REST API (salt-okunur tarball) — `git clone` ikili dosyası ortam politikasıyla engellendi |
| Working tree | Temiz (commit'ten birebir çıkarılan kaynak; yerel kaynak değişikliği yok) |

### ⚠️ ÖNEMLİ BULGU — HEAD, a5ce815 DEĞİL

B1.7'den sonra `main` dalına **1 yeni commit** eklenmiş:

- `bdebe276` — `chore(ci): GitHub cleanup report [skip ci]`

**Bu commit'in tek değişikliği:** `docs/GITHUB_CLEANUP_REPORT.md` (+3 / −3 satır).  
**Flutter kaynak kodunda (mobile/) HİÇBİR değişiklik yok.** `a5ce815 → bdebe276` karşılaştırması: ahead_by=1, sadece 1 markdown dosyası. B1.5 routing düzeltmesi `main` içinde bozulmadan duruyor.

> Doğrulama, kullanıcının belirttiği `a5ce815` commit'i üzerinde yapılmıştır. Kod açısından `bdebe276` ile birebir aynıdır (fark yalnızca bir CI rapor dosyasıdır).

---

## 2 — FLUTTER TEMİZLEME

| Komut | Sonuç |
|---|---|
| `flutter clean` | ✅ BAŞARILI (exit 0) |
| `flutter pub get` | ✅ BAŞARILI (exit 0) — `Got dependencies!` |

Notlar:
- `tencent_rtc_sdk 13.2.2` yerel `packages/tencent_rtc_sdk` yolundan çözüldü (path override) — ✅.
- 149 paketin daha yeni sürümü var ama mevcut kısıtlarla uyumsuz; bu **bilgi amaçlı**, hata değil.

---

## 3 — ANALYZE

**Komut:** `flutter analyze` — **exit 1**

| Önem | Adet |
|---|---|
| **error (build engelleyici)** | **0** |
| warning | 103 (102 `lib/`, 1 `test/`) |
| info | 219 |
| **Toplam** | **322** |

**Build engelleyici hata YOK.** 322 sorunun tamamı lint düzeyindedir: kullanılmayan import'lar, gereksiz cast, gereksiz alt çizgi (`__` → `_`), referans edilmeyen private eleman. Bunlar release derlemesini engellemez.

> Not: B1.5/B1.7 aşamalarında "No issues found" yalnızca router test dosyası bağlamında raporlanmıştı. Bu aşamada **tüm proje** analiz edildiği için lint uyarıları görünür hale geldi. Talimat gereği ("Hata varsa DUR") yalnızca error seviyesi bloklayıcıdır; error 0 olduğu için doğrulamaya devam edildi. **Kod değiştirilmedi.**

---

## 4 — TEST

**Komut:** `flutter test` — **exit 0**

| Alan | Sonuç |
|---|---|
| Toplam geçen | **+409** |
| Atlanan (skipped) | ~2 |
| Başarısız | **0** |
| Sonuç | ✅ `All tests passed!` |

### Router testi (özel doğrulama)

`test/core/network/api_backend_router_test.dart` → **12/12 GEÇTİ** ✅

İlgili senaryolar:
- `oyun odası tekil + play → Main backend (B1.5 fix)` ✅
- `çoğul üyelik + rozetler → Main backend (B1.5 fix)` ✅
- `tekil üyelik planları → Game backend (değişmedi)` ✅

---

## 5 — RELEASE BUILD ÖNCESİ KONTROL

> APK/AAB oluşturulmadı — yalnızca yapılandırma incelendi.

### pubspec.yaml
| Alan | Değer | Durum |
|---|---|---|
| name | `canlifal_social` | ✅ |
| version | `1.0.148+182` (versionName 1.0.148 / versionCode 182) | ✅ |
| Dart SDK | `>=3.8.0 <4.0.0` | ✅ |
| publish_to | `none` | ✅ |

### Android (`android/app/build.gradle.kts`)
| Alan | Değer | Durum |
|---|---|---|
| applicationId | `com.mesutbyrm.canlifal` | ✅ |
| namespace | `com.mesutbyrm.canlifal` | ✅ |
| minSdk | `26` | ✅ |
| targetSdk | `36` | ✅ |
| compileSdk | `36` | ✅ |
| versionCode / versionName | `flutter.versionCode` / `flutter.versionName` (pubspec'ten) | ✅ |
| Java/Kotlin | 17 / jvmTarget 17, core library desugaring açık | ✅ |
| Gradle | wrapper 8.14, AGP 8.13.0, Kotlin 2.2.21 | ✅ |
| Release optimizasyon | `minifyEnabled=true`, `shrinkResources=true`, `isDebuggable=false`, ProGuard açık | ✅ |
| AAB split | language/density/abi split açık | ✅ |

### Signing (imzalama)
| Alan | Durum |
|---|---|
| Release imza mantığı | `key.properties` + `release.keystore` **veya** CI env (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) | 
| Debug fallback | ❌ Yasak — release'de debug imza kullanılmaz (kod içinde açık koruma) |
| Koruma | Keystore yoksa release görevi `GradleException` ile **durdurulur** (afterEvaluate guard) ✅ |
| Keystore repo'da mı? | **HAYIR** (doğru — gizli materyal commit'lenmez) |
| ⚠️ Build ön koşulu | Release AAB/APK üretmek için keystore build anında **sağlanmalıdır**; aksi halde build tasarım gereği başarısız olur |

### SDK
- compileSdk 36 / targetSdk 36 / minSdk 26 → ✅ Play Store güncel hedef gereksinimleriyle uyumlu.

### İzinler (`AndroidManifest.xml`)
| İzin | Durum |
|---|---|
| INTERNET | ✅ |
| ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE | ✅ |
| RECORD_AUDIO (mikrofon) | ✅ |
| CAMERA | ✅ |
| MODIFY_AUDIO_SETTINGS | ✅ |
| BLUETOOTH / BLUETOOTH_CONNECT | ✅ |
| FOREGROUND_SERVICE + MICROPHONE/CAMERA/MEDIA_PLAYBACK/MEDIA_PROJECTION | ✅ |
| POST_NOTIFICATIONS / WAKE_LOCK / VIBRATE | ✅ |
| READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE (maxSdk 32) | ✅ |
| uses-feature camera & microphone (required=false) | ✅ |

### TRTC native yapılandırma
| Alan | Durum |
|---|---|
| Paket | Yerel `packages/tencent_rtc_sdk` v13.2.2 (path override) ✅ |
| ProGuard keep | `com.tencent.**`, `com.tencent.trtc.**`, `com.tencent.liteav.**` korunuyor ✅ |
| jniLibs | `libliteavsdk.so` + `libc++_shared.so` `pickFirsts`; kullanılmayan Agora extension `.so`'ları hariç tutuluyor ✅ |
| useLegacyPackaging | false ✅ |

### Environment / config
| Alan | Değer | Durum |
|---|---|---|
| API_BASE_URL (MAIN) | `https://canlifal.com` | ✅ |
| WEB_ORIGIN | `https://canlifal.com` | ✅ |
| GAMES_API_BASE_URL (SECOND) | `https://canlifalapi.abacusai.app` | ✅ |
| GATEWAY_API_BASE_URL | boş (yalnızca acil yedek) | ✅ |
| useSplitGamesApi | `true` (games != main) | ✅ |
| google-services.json | **Mevcut** (`android/app/`) → Google Sign-In riski yok | ✅ |

---

## 6 — BACKEND ROUTER DOĞRULAMASI

Kaynak: `lib/core/network/api_backend_router.dart` + `lib/core/config/env.dart`.  
12/12 router testi ve manuel iz sürme ile doğrulanmıştır.

### MAIN → `https://canlifal.com`
| Endpoint | Yönlendirme | Durum |
|---|---|---|
| `/api/memberships` | MAIN (`/api/membership/` ile başlamaz) | ✅ |
| `/api/memberships/packages` | MAIN | ✅ |
| `/api/membership-badges` | MAIN | ✅ |
| `/api/games/room` | MAIN (`rooms`/`auto-match` değil) | ✅ |
| `/api/games/play` | MAIN | ✅ |

### SECOND → `https://canlifalapi.abacusai.app`
| Endpoint | Yönlendirme | Durum |
|---|---|---|
| `/api/membership/plans` | SECOND (`/api/membership/` eşleşir) | ✅ |

Tüm yönlendirmeler B1.5 tasarımıyla birebir uyumludur.

---

## ÖZET TABLO

| Kontrol | Sonuç |
|---|---|
| commit SHA (doğrulanan) | `a5ce815` (main HEAD şu an `bdebe276` — sadece 1 CI rapor commit'i, kod farkı yok) |
| branch | `main` |
| git status | temiz |
| flutter clean | ✅ |
| flutter pub get | ✅ |
| flutter analyze | 0 error, 103 warning, 219 info (bloklayıcı yok) |
| flutter test | ✅ +409 / 0 fail / ~2 skip |
| router test | ✅ 12/12 |
| Android release config | ✅ (minify/shrink/proguard, AAB split) |
| signing durumu | ✅ mantık doğru + debug fallback yasak; ⚠️ keystore build anında sağlanmalı |
| SDK durumu | ✅ compile 36 / target 36 / min 26 |
| permission durumu | ✅ tüm gerekli izinler mevcut |
| TRTC config durumu | ✅ yerel paket + proguard + jniLibs |
| backend router doğrulaması | ✅ 5 MAIN + 1 SECOND doğru |

---

## BUILD READY: YES (KOŞULLU)

**Kod derlenebilir durumdadır:** error yok, 409 test geçiyor, router 12/12, tüm Android/TRTC/izin/config kontrolleri temiz.

**Release build'i başlatmadan önce karşılanması gereken TEK zorunlu ön koşul:**
- **Release signing keystore build ortamında sağlanmalıdır** (`key.properties` + `release.keystore` veya `ANDROID_KEYSTORE_BASE64` vb. env değişkenleri). Keystore repo'da yoktur (doğru davranış); sağlanmazsa release görevi tasarım gereği `GradleException` ile durur.

**Bloklayıcı olmayan not:**
- 322 lint uyarısı (0 error) mevcuttur; build'i etkilemez, isteğe bağlı temizlenebilir.

> Not: Fiziksel Android cihaz olmadığı için TRTC/kamera/mikrofon canlı (E2E) doğrulaması **YAPILMADI** — kapsam dışı. Yapılandırma statik olarak doğrulanmıştır.
