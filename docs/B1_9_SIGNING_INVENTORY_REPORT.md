# CANLIFAL — AŞAMA B1.9
## RELEASE SIGNING ENVANTERİ + APK/AAB ÖNCESİ KONTROL

**Tarih:** 2026-08-10 • UTC  
**Kapsam:** Yalnızca envanter (salt-okunur). Kod/backend/DB/Redis/endpoint/router/pubspec **DEĞİŞTİRİLMEDİ**. APK/AAB build YOK, deployment YOK, commit/push YOK, yeni keystore oluşturulmadı.  
**Şifreler, private key değerleri ve base64 anahtar içerikleri rapora YAZILMAMIŞTIR** — yalnızca PRESENT / ABSENT / REFERENCED durumu bildirilir.

---

## A) CURRENT HEAD

| Alan | Değer |
|---|---|
| Repository | `mesutbyrm/Cursor-Flutter-` |
| Branch | `main` |
| Güncel HEAD | `bdebe2769aa92978ff86855220d42fd1d7b48c51` (`bdebe276`) |
| Kod durumu | B1.5 routing düzeltmesiyle **aynı** (bdebe276 yalnızca `docs/GITHUB_CLEANUP_REPORT.md` değişikliği; Flutter kaynak farkı yok) |
| İnceleme kaynağı | `a5ce815` commit tarball'ı (kod olarak bdebe276 ile birebir aynı) |

---

## B) SIGNING FILES (dosya envanteri)

| Dosya | Durum |
|---|---|
| `android/key.properties` | **ABSENT** |
| `android/key.properties.example` | **PRESENT** (şablon — gerçek değer yok, placeholder: `YOUR_STORE_PASSWORD` vb.) |
| `android/app/release.keystore` | **ABSENT** |
| `android/app/*.jks` | **ABSENT** |
| `android/app/*.keystore` | **ABSENT** |
| `upload-keystore.*` | **ABSENT** |
| repo genelinde `*.jks` / `*.keystore` | **ABSENT** (hiç bulunamadı) |
| `android/gradle.properties` | **PRESENT** — ancak içinde **signing referansı YOK** |
| kök `gradle.properties` | ABSENT |

> Not: Gerçek keystore ve `key.properties` repoya bilinçli olarak **dâhil edilmemiştir** (doğru güvenlik davranışı). `.gitignore` `/android/app/release` yolunu hariç tutar. Repoda yalnızca `.example` şablonu bulunur.

---

## C) ENVIRONMENT REFERENCES

### C.1 — Bu build ortamında (Abacus VM shell) tanımlı env değişkenleri

| Değişken | Durum |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | **ABSENT** (bu ortamda set edilmemiş) |
| `ANDROID_KEYSTORE_PATH` | **ABSENT** |
| `ANDROID_KEYSTORE_PASSWORD` | **ABSENT** |
| `ANDROID_KEY_ALIAS` | **ABSENT** |
| `ANDROID_KEY_PASSWORD` | **ABSENT** |

### C.2 — Gradle/Kotlin kodunda referanslar (`android/app/build.gradle.kts`)

| Değişken | Durum |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | **REFERENCED** |
| `ANDROID_KEYSTORE_PASSWORD` | **REFERENCED** |
| `ANDROID_KEY_ALIAS` | **REFERENCED** |
| `ANDROID_KEY_PASSWORD` | **REFERENCED** |
| `ANDROID_KEYSTORE_PATH` | **NOT REFERENCED** (kod base64 yöntemini kullanır, path env'i beklemez) |

### C.3 — CI/CD (GitHub Actions) secret referansları

`.github/workflows/build-apk.yml` (release APK iş akışı):

| Secret ismi | Durum |
|---|---|
| `secrets.ANDROID_KEYSTORE_BASE64` | **REFERENCED** |
| `secrets.ANDROID_KEYSTORE_PASSWORD` | **REFERENCED** |
| `secrets.ANDROID_KEY_ALIAS` | **REFERENCED** |
| `secrets.ANDROID_KEY_PASSWORD` | **REFERENCED** |
| `secrets.GOOGLE_SERVICES_JSON_BASE64` | **REFERENCED** |
| `secrets.API_BASE_URL` + ACCEPTANCE_* | **REFERENCED** (test/kabul) |
| `secrets.GH_RELEASE_PAT` / `secrets.GITHUB_TOKEN` | **REFERENCED** (artifact/release y[UKLEME) |

CI davranışı: `ANDROID_KEYSTORE_BASE64` boşsa release build **reddedilir** (`exit 1`, "debug imza yasak"). Aksi halde build anında `release.keystore` + `key.properties` oluşturulur.

> Bu secret'ların GitHub reposunda **tanımlı olup olmadığı** salt-okunur kod incelemesiyle **doğrulanamaz** (Actions secret değerleri API ile okunamaz). Yalnızca **REFERENCED** (iş akışı tarafından bekleniyor) durumu tespit edilebilir.

### C.4 — Abacus build environment
Bu Next.js/Abacus build ortamı **mobil APK/AAB üretmez**; Android signing secret'ı barndırmaz. Android release imzalama tamamen GitHub Actions (yukarıdaki secret'lar) veya yerel geliştirici makinesindeki `key.properties`+`release.keystore` ile yapılır. **Abacus tarafznda signing referansı: ABSENT.**

---

## D) PLAY STORE SIGNING COMPATIBILITY

| Alan | Değer / Durum |
|---|---|
| applicationId | `com.mesutbyrm.canlifal` ✅ (doğrulandı) |
| namespace | `com.mesutbyrm.canlifal` ✅ |
| İmzalama modeli | **Upload key** (kod yorumu: "Play upload keystore") — Play App Signing ile uyumlu upload anahtarı yaklaşımı |
| Release signingConfig | Var — yalnızca keystore sağlandığında oluşturulur; **debug fallback yasak** (afterEvaluate guard `GradleException`) ✅ |
| Play App Signing config | Repoda açık bir referans **YOK** (normaldir — Play App Signing sunucu tarafndadır; geliştirici yalnızca upload key sağlar) |
| Gerçek upload/release keystore | Bu ortamda **bulunamadı** (dosya yok + env yok) |

### ⚠️ Sonuç
**RELEASE SIGNING KEY: MISSING** (bu çalışma ortamında erişilm gerçek keystore/parola yok). Anahtar yalnızca GitHub Actions secret'ı olarak **referans edilir**; değerleri buradan görülemez/doğrulanamaz. **Yeni keystore OLUŞTURULMADI** (talimat gereği).

---

## E) ANDROID RELEASE CONFIGURATION (`android/app/build.gradle.kts` — salt-okunur)

| Alan | Değer | Durum |
|---|---|---|
| applicationId | `com.mesutbyrm.canlifal` | ✅ |
| versionName | `flutter.versionName` ← pubspec `1.0.148` | ✅ |
| versionCode | `flutter.versionCode` ← pubspec `182` | ✅ |
| minSdk | `26` | ✅ |
| targetSdk | `36` | ✅ |
| compileSdk | `36` | ✅ |
| release buildType | Tanımlı | ✅ |
| minifyEnabled | `true` | ✅ |
| shrinkResources | `true` | ✅ |
| ProGuard/R8 | `proguard-android-optimize.txt` + `proguard-rules.pro` | ✅ |
| JNI libs | `pickFirsts`: `libliteavsdk.so`, `libc++_shared.so`; kullanılmayan Agora extension `.so`'ları hariç; `useLegacyPackaging=false` | ✅ |
| ABI/split | AAB için `bundle { language/density/abi split=true }`; CI APK üretiminde `--split-per-abi` (arm, arm64, x64) | ✅ |
| signingConfig | `release` yalnızca keystore varsa; yoksa release görevi durur (debug fallback yok) | ✅ (koşullu) |
| isDebuggable (release) | `false` | ✅ |
| Java/Kotlin | 17 / jvmTarget 17, core library desugaring açık | ✅ |
| Gradle / AGP / Kotlin | wrapper 8.14 / AGP 8.13.0 / Kotlin 2.2.21 | ✅ |
| Cleartext trafik | `usesCleartextTraffic=false` + `networkSecurityConfig` | ✅ (HTTPS-only) |
| google-services.json | Repo checkout'ta PRESENT; CI'da `GOOGLE_SERVICES_JSON_BASE64`'ten üretilir | ✅ |

### AAB durumu
CI iş akışı (`build-apk.yml`) yalnızca **APK** üretir (`flutter build apk --release --split-per-abi`). **`bundleRelease` / `.aab` üreten bir akış YOK.** Gradle `bundle{}` bloğu AAB'yi teknik olarak destekler; ancak Play Store'a AAB gerekiyorsa ayrı bir `flutter build appbundle --release` adımı/iş akışı eklenmelidir (bu aşamada eklenmedi — kod değişikliği yasak).

---

## F) TRTC RELEASE CONFIGURATION

| Alan | Durum |
|---|---|
| Paket | Yerel `packages/tencent_rtc_sdk` v13.2.2 (path override) — PRESENT ✅ |
| Plugin minSdkVersion | 16 (uygulama minSdk 26 bunu kapsar) ✅ |
| Plugin compileSdkVersion | 31 (uygulama compileSdk 36 ile uyumlu) ✅ |
| ProGuard keep | `com.tencent.**`, `com.tencent.trtc.**`, `com.tencent.liteav.**` korunuyor ✅ |
| jniLibs (release paketleme) | `libliteavsdk.so` + `libc++_shared.so` `pickFirsts`; `useLegacyPackaging=false` ✅ |
| İzinler | RECORD_AUDIO, CAMERA, MODIFY_AUDIO_SETTINGS, BLUETOOTH(_CONNECT), FOREGROUND_SERVICE_MICROPHONE/CAMERA — tam ✅ |
| Release açısından eksik native ayar | **Tespit edilmedi** — R8/shrink altında keep kuralları mevcut, `.so` paketleme doğru |
| Fiziksel cihaz E2E | **YAPILMADI** (kapsam dışı / cihaz yok) |

---

## G) MISSING REQUIREMENTS

1. **RELEASE SIGNING KEY: MISSING** — Bu çalışma ortamında erişilm gerçek `release.keystore` / `key.properties` yok; imzalama env değişkenleri set değil. Anahtar yalnızca GitHub Actions secret'ı olarak referans edilir (değerleri buradan doğrulanamaz).
2. **AAB üretim akışı YOK** — Mevcut CI yalnızca APK üretir. Play Store için AAB gerekiyorsa `flutter build appbundle --release` adımı eklenmeli (ileride, onayınızla).
3. **CI secret'larının GitHub'da tanımlı olduğu doğrulanamadı** — Actions secret değerleri salt-okunur olarak görülemez; yalnızca iş akışının bunları beklediği (REFERENCED) tespit edildi. Gerçek build'i yalnızca GitHub Actions (secret'lar dolu ise) üretebilir.

---

## H) RELEASE BUILD READY: NO

**Gerekçe:** Bu ortamda erişilm gerçek release/upload keystore **bulunmuyor** (dosya yok + env yok). Talimat gereği yeni keystore oluşturulmadı ve APK/AAB build yapılmadı.

**Önemli açıklama:** Kod, yapılandırma, testler ve TRTC ayarları build'e **hazırdır** (B1.8: 0 error, 409 test PASS, router 12/12). Tek eksik, imzalama materyalinin bu ortamda bulunmamasıdır. Gerçek signed release iki yoldan üretilebilir:

- **GitHub Actions** (önerilen): `build-apk.yml`, gerekli `ANDROID_KEYSTORE_*` secret'ları repoda tanımlıysa signed release APK üretir.
- **Yerel makine**: `android/key.properties` + `android/app/release.keystore` sağlandığında `flutter build apk/appbundle --release`.

> Yeni keystore ASLA oluşturulmamalıdır — daha önce Play Store'a yüklenen sürüm varsa, aynı **upload key** kullanılmalıdır; farklı anahtar Play tarafında reddedilir.

---

### ÖZET

| Bölüm | Sonuç |
|---|---|
| A) Current HEAD | `bdebe276` (kod = a5ce815) |
| B) Signing files | Gerçek keystore/key.properties: ABSENT; yalnızca `.example`: PRESENT |
| C) Environment references | Kod + CI'da REFERENCED; bu ortamda env ABSENT |
| D) Play Store compat | applicationId doğru; upload-key modeli; gerçek anahtar MISSING |
| E) Android release config | ✅ minify/shrink/proguard/ABI split/HTTPS-only |
| F) TRTC release config | ✅ eksik native ayar yok (E2E yapılmadı) |
| G) Missing requirements | Keystore erişimi + (opsiyonel) AAB akışı |
| **H) RELEASE BUILD READY** | **NO** (yalnızca signing eksik) |
