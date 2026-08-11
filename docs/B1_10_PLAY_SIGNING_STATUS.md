# CANLIFAL — AŞAMA B1.10 / PLAY STORE SIGNING KEY DURUM RAPORU

| Alan | Değer |
|------|-------|
| Rapor tarihi (UTC) | 2026-08-11 |
| Kapsam | **Sadece araştırma / envanter.** Build yok, commit yok, push yok, keystore üretimi yok. |
| Yeni keystore üretildi mi? | **HAYIR** — hiçbir `keytool` komutu çalıştırılmadı. |
| Secret değeri yazıldı mı? | **HAYIR** — hiçbir şifre, private key veya base64 içerik bu rapora veya herhangi bir dosyaya yazılmadı. |

---

## 1. Current HEAD

| Alan | Değer |
|------|-------|
| Depo | `mesutbyrm/Cursor-Flutter-` |
| Branch | `main` |
| Kullanıcının bildirdiği HEAD | `bdebe276` |
| Bu ortamda incelenen kaynak ağacı | `a5ce815` tarball (B1.8'de indirildi, `/tmp/b18/src/...`) |
| İki commit arasındaki fark | 1 commit — yalnızca `docs/GITHUB_CLEANUP_REPORT.md` (+3/−3). **Flutter/Android kaynak kodu ve signing yapılandırması aynı.** |

> Not: Signing yapılandırması açısından `a5ce815` ile `bdebe276` arasında fark yoktur; bulgular HEAD için geçerlidir.

---

## 2. Application ID

| Alan | Değer |
|------|-------|
| applicationId | `com.mesutbyrm.canlifal` |
| namespace | `com.mesutbyrm.canlifal` |
| Sürüm (pubspec) | `1.0.148+182` |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 |

---

## 3. Play Store status

| Soru | Cevap | Dayanak |
|------|-------|---------|
| A) Daha önce Play Store release var mı? | **UNKNOWN** | Bu ortamda Play Console erişimi yok. Depo içi kayıtlar closed test'in **başlamadığını** ve AAB'nin Play'e **yüklenemediğini** belirtiyor (`docs/PLAY_STORE_PRODUCTION_ACCESS.md`), fakat bu Play Console tarafından doğrulanmış bir bilgi değildir. Tahmin yapılmadı. |
| Play Console API/servis hesabı erişimi | **ABSENT** | Ortamda Google Play Developer API kimlik bilgisi, servis hesabı JSON'u veya Play Console bağlantısı bulunamadı. |
| Depo içi Play kanıtı | Closed test **BLOCKED**, sebep: mevcut AAB `CN=Android Debug` imzalı | `docs/PLAY_STORE_PRODUCTION_ACCESS.md` |

**Sonuç:** Play Store yayın durumu **UNKNOWN** (doğrudan erişim yok).

---

## 4. Play App Signing status

| Soru | Cevap | Dayanak |
|------|-------|---------|
| B) Play App Signing kullanılıyor mu? | **UNKNOWN** | Play Console erişimi yok. Depoda yalnızca bir referans var: `docs/GOOGLE_SIGNIN_FIX_SHA1_TR.md` içinde "Play App Signing → Play Console → Uygulama imzalama" satırı, **değer boş bırakılmış**. Bu, Play App Signing'in aktif olduğunu kanıtlamaz. |
| Play App Signing sertifikası bu ortamda | **ABSENT** |

---

## 5. Upload key status

| Öğe | Durum | Not |
|-----|-------|-----|
| `mobile/android/key.properties` | **ABSENT** | `.gitignore`'da; depoda yok. |
| `mobile/android/key.properties.example` | **PRESENT** | Sadece placeholder; gerçek değer içermez. |
| `mobile/android/app/release.keystore` | **ABSENT** | Build sırasında env'den üretilmesi bekleniyor. |
| Depo genelinde `*.jks` / `*.keystore` | **ABSENT** | `.gitignore`: `**/*.keystore`, `**/*.jks`. |
| `mobile/android/KEYSTORE_CREDENTIALS.local.txt` | **REFERENCED, ABSENT** | `docs/GOOGLE_SIGNIN_FIX_SHA1_TR.md` bu dosyayı "geliştirme ortamında" olarak işaret ediyor; `.gitignore` satır 12 ile dışlanmış; **bu ortamda mevcut değil**. |
| Key alias | **REFERENCED** — dokümantasyonda `canlifal-upload` olarak geçiyor | Yalnızca alias adı; şifre/anahtar materyali yok. |
| Yerel `~/.android/debug.keystore` | **PRESENT** | **Sadece debug.** Release için kullanılması yasak ve Gradle tarafından da engelleniyor. |
| Filesystem geneli `.apk` / `.aab` / `.jks` / `.keystore` taraması | 1 APK bulundu (bkz. bölüm 6), release keystore **bulunamadı** | `/home/ubuntu` ve `/tmp` altında tarandı. |

**C) Upload key mevcut mu? → HAYIR (bu ortamda ABSENT).**

**E) Release/upload keystore nerede tutuluyor biliniyor mu? → KISMEN.** Depo dokümanı, keystore bilgilerinin geliştirici makinesindeki `mobile/android/KEYSTORE_CREDENTIALS.local.txt` dosyasında tutulduğunu belirtiyor. Bu dosya versiyon kontrolüne alınmamış ve bu ortamda erişilebilir değil. Dosyanın hâlâ var olup olmadığı **UNKNOWN**.

---

## 6. Certificate status

### 6.1 Depoda bulunan mevcut APK artefaktı

| Alan | Değer |
|------|-------|
| Dosya | `downloads/canlifal-mobile-release.apk` (depoya işlenmiş) |
| İmza şeması | v2 = doğrulandı; v1/v3/v3.1/v4 = hayır |
| İmzalayan sertifika DN | `C=US, O=Android, CN=Android Debug` |
| Değerlendirme | ⚠️ **Bu "release" adlı APK aslında DEBUG anahtarla imzalanmıştır.** Play yüklemesi için geçersizdir ve upload key kanıtı değildir. |
| Sertifika SHA-256 / SHA-1 | Okundu, **rapora yazılmadı** (debug sertifikası; değeri anlamsız) |

### 6.2 Firebase `google-services.json` sertifika parmak izi

| Alan | Durum |
|------|-------|
| `oauth_client` sayısı (android) | 2 |
| `android_info.certificate_hash` | **PRESENT** (1 adet) |
| Bu ortamdaki debug keystore ile eşleşiyor mu? | **HAYIR** — farklı bir sertifikaya ait |
| Yorum | Firebase'e `com.mesutbyrm.canlifal` için **başka bir imzalama sertifikasının SHA-1'i kayıtlı**. Bu, geçmişte debug dışı bir anahtarın var olduğuna dair güçlü bir ipucudur, ancak hangi anahtar olduğu (upload key mi, Play App Signing key mi, başka bir makinenin debug key'i mi) **UNKNOWN**. |

### 6.3 Dokümante edilmiş release keystore parmak izi

| Alan | Durum |
|------|-------|
| Release keystore SHA-1 | **PRESENT (dokümante edilmiş)** — `docs/GOOGLE_SIGNIN_FIX_SHA1_TR.md` içinde kayıtlı |
| Play App Signing SHA-1 | **ABSENT** — aynı dokümanda boş bırakılmış ("Play Console → Uygulama imzalama") |

**D) Upload certificate SHA-256 mevcut mu? → HAYIR.** Yalnızca bir SHA-1 dokümante edilmiş; SHA-256 hiçbir yerde kayıtlı değil.

> Önemli: Parmak izinin dokümante edilmiş olması, **anahtarın kendisinin mevcut olduğu anlamına gelmez.** Parmak izi doğrulama içindir, imzalama için kullanılamaz.

---

## 7. CI secrets status

GitHub Actions secret **değerleri** API üzerinden hiçbir koşulda okunamaz; yalnızca **isim listesi** okunabilir. İsim listesi başarıyla alındı (HTTP 200).

### 7.1 `mesutbyrm/Cursor-Flutter-` → Actions secrets (toplam 11)

| Secret adı | Durum |
|------------|-------|
| `ACCEPTANCE_ADMIN_EMAIL` / `_PASSWORD` / `_USERNAME` | PRESENT |
| `ACCEPTANCE_TELLER_EMAIL` / `_PASSWORD` / `_USERNAME` | PRESENT |
| `ACCEPTANCE_USER_EMAIL` / `_PASSWORD` / `_USERNAME` | PRESENT |
| `API_BASE_URL` | PRESENT |
| `GOOGLE_SERVICES_JSON_BASE64` | PRESENT |

### 7.2 Signing secret'ları — kritik bulgu

| Secret adı | Gradle/CI'da referans | Depoda tanımlı mı |
|------------|----------------------|-------------------|
| `ANDROID_KEYSTORE_BASE64` | **REFERENCED** (`build.gradle.kts`, `.github/workflows/build-apk.yml`) | ❌ **ABSENT** |
| `ANDROID_KEYSTORE_PASSWORD` | **REFERENCED** | ❌ **ABSENT** |
| `ANDROID_KEY_ALIAS` | **REFERENCED** | ❌ **ABSENT** |
| `ANDROID_KEY_PASSWORD` | **REFERENCED** | ❌ **ABSENT** |

### 7.3 Diğer kapsamlar

| Kapsam | Sonuç |
|--------|-------|
| Repo Actions **variables** | 1 adet: `GOOGLE_SERVICES_JSON_BASE64`. Signing değişkeni **ABSENT**. |
| Environment `production` → secrets | **0 adet** |
| Environment `production` → variables | **0 adet** |
| Organization secrets | Sorgulanamadı (HTTP 422 — hesap kişisel, organizasyon değil) → uygulanamaz |
| Self-hosted runner | 0 adet (runner üzerinde saklı keystore ihtimali yok) |
| `mesutbyrm/canlifal` deposu secrets/variables | **0 / 0** |

**Sonuç: CI tarafında release signing secret'ları TANIMLI DEĞİL.** Bu nedenle `build-apk.yml` release adımı, mevcut haliyle `ANDROID_KEYSTORE_BASE64 yok — release build reddedildi (debug imza yasak)` hatasıyla `exit 1` verecektir.

---

## 8. Abacus secrets status

| Kontrol | Sonuç |
|---------|-------|
| Shell ortam değişkenleri (`ANDROID*`, `KEYSTORE*`, `SIGNING*`, `UPLOAD_KEY*`, `PLAY_*`) | Yalnızca `ANDROID_HOME` ve `ANDROID_SDK_ROOT` (SDK yolları). Signing değişkeni **ABSENT**. |
| Abacus secret deposu (anahtar **isimleri**, değerler okunmadı) | `agora`, `football data`, `onesignal`, `tencent trtc`, `tmdb`. **Android signing / keystore / Play ile ilgili hiçbir kayıt yok → ABSENT.** |
| Abacus build/deployment secrets | Android imzalama ile ilgili giriş **ABSENT** (bu ortamdaki dağıtım hattı web uygulamasına aittir, mobil imzalama içermez). |
| Play Console servis hesabı kimliği | **ABSENT** |

---

## 9. Recommended next action

### 9.1 Kesin durum

```
EXISTING UPLOAD KEY: NOT FOUND
```

Erişilebilir hiçbir kaynakta (yerel dosya sistemi, depo, GitHub Actions secrets/variables, environment secrets, Abacus secret deposu, ortam değişkenleri) release/upload keystore materyali bulunamadı. **B1.10 talimatı gereği burada DURULDU. Yeni anahtar oluşturulmadı.**

### 9.2 Anahtarın büyük olasılıkla bulunduğu yer (yalnızca ipucu — doğrulanmadı)

Depo dokümantasyonu, `canlifal-upload` alias'lı bir release keystore'un **geliştirici makinesinde** `mobile/android/KEYSTORE_CREDENTIALS.local.txt` yanında tutulduğunu belirtiyor ve bu keystore'un SHA-1'i dokümante edilmiş. Ayrıca Firebase'de debug dışı bir sertifika parmak izi kayıtlı. Bu üç kanıt birlikte, **anahtarın geçmişte var olduğunu** gösteriyor; **hâlâ var olup olmadığı bu ortamdan doğrulanamaz.**

### 9.3 Kullanıcının yapması gerekenler (sıralı)

1. **Kendi geliştirme makinenizde** şu dosyaları arayın: `KEYSTORE_CREDENTIALS.local.txt`, `*.jks`, `*.keystore`, `key.properties`, alias `canlifal-upload`. Yedek disk / parola yöneticisi / bulut yedeklerini de kontrol edin.
2. **Play Console → Test ve yayınla → Uygulama bütünlüğü → Uygulama imzalama** ekranını açıp şunları not edin: Play App Signing aktif mi, upload sertifikası SHA-1/SHA-256 nedir, daha önce yüklenmiş bir sürüm var mı. Bu bilgi olmadan doğru karar verilemez.
3. Bulunan keystore'un doğru olduğunu **imzalamadan** doğrulayın: yerel keystore'un sertifika SHA-1'i, dokümante edilmiş SHA-1 ve Play Console'daki upload sertifikası ile eşleşmelidir.
4. Eşleşme sağlanırsa, anahtar materyalini **dosyaya yazmadan** doğrudan GitHub → Settings → Secrets and variables → Actions altına 4 secret olarak girin: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Kod tarafında **hiçbir değişiklik gerekmez** — `mobile/android/app/build.gradle.kts` ve `.github/workflows/build-apk.yml` bu isimleri zaten okuyor.
5. Anahtar **kesin olarak kayıpsa**: yeni anahtar üretmeden önce Play Console durumu belirleyici olur — Play App Signing aktifse Google'dan **upload key sıfırlama** talep edilebilir (uygulama kimliği korunur); Play App Signing yoksa ve yayınlanmış sürüm varsa anahtar kurtarılamaz. Bu karar **Play Console verisi olmadan verilmemelidir**.

### 9.4 Ek teknik not (bilgi amaçlı, aksiyon değil)

`.github/workflows/build-apk.yml` yalnızca **APK** üretiyor (`flutter build apk --release --split-per-abi`). Play Store yüklemesi **AAB** gerektirir. Anahtar sorunu çözüldüğünde ayrıca bir `bundleRelease` / `flutter build appbundle` adımı gerekecektir. Bu aşamada **hiçbir değişiklik yapılmadı**.

---

## 10. SECURITY NOTES

1. Bu rapora ve hiçbir dosyaya **şifre, private key, keystore içeriği veya base64 değeri yazılmadı**.
2. Secret'lar yalnızca **isim** düzeyinde raporlandı; GitHub Actions secret değerleri API üzerinden zaten okunamaz.
3. Abacus secret deposundan yalnızca **anahtar isimleri** listelendi; hiçbir değer okunmadı veya yazdırılmadı.
4. Depodaki `downloads/canlifal-mobile-release.apk` **debug imzalıdır** — dağıtıma ve Play yüklemesine uygun değildir; kullanıcıya release sürümü olarak sunulmamalıdır.
5. `~/.android/debug.keystore` mevcuttur ancak **release imzalama için kullanılmamalıdır**; `build.gradle.kts` içindeki `afterEvaluate` koruması bunu zaten `GradleException` ile engelliyor. Bu koruma **kaldırılmamalıdır**.
6. Bulunacak keystore dosyası **hiçbir zaman** depoya işlenmemeli; `.gitignore` kuralları (`**/*.keystore`, `**/*.jks`, `key.properties`, `KEYSTORE_CREDENTIALS.local.txt`) mevcuttur ve korunmalıdır.
7. Keystore'un tek nüshası varsa kaybı **geri döndürülemez**; şifreli bir yedek (parola yöneticisi veya çevrimdışı şifreli arşiv) alınması önerilir.
8. Bu aşamada **build yapılmadı, commit atılmadı, push yapılmadı, keystore oluşturulmadı, mevcut hiçbir imzalama yapılandırması değiştirilmedi.**

---

```
EXISTING UPLOAD KEY: NOT FOUND

SIGNING STATUS: NOT_FOUND
```

**DUR.**
