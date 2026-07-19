# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 0 — BAŞLANGIÇ KILAVUZU (BURADAN BAŞLA)

> **Amaç:** Tüm Flutter prompt serisinin (PART 1–12) hangi sırayla okunacağını ve uygulamanın sıfırdan nasıl kurulacağını tek sayfada gösterir.
> **Backend:** `https://canlifal.com` (production) — tüm parlar %100 gerçek backend koduna dayalıdır.

---

## 1. SERİNİN HARİTASI (12 PARÇA)

| Parça | Konu | Ne zaman okunur |
|-------|------|-----------------|
| **PART 1** | Sistem Mimarisi (base URL, JWT, SSE, TRTC token, zarf formatı) | İlk — zorunlu temel |
| **PART 2** | Premium UI/UX (renk paleti, tipografi, temel widget'lar) | İlk — zorunlu temel |
| **PART 3** | Profil Sistemi (profil, bakiye, geçmiş, takip, ayarlar) | Modül |
| **PART 4** | Sesli Sohbet Odaları (koltuk, TRTC, müzik, SSE) | Modül |
| **PART 5** | Canlı Yayın & PK (yayın, izleyici, co-broadcast) | Modül |
| **PART 6** | Hediye & Gelir (hediye gönderme, animasyon, gelir paylasımı) | Modül |
| **PART 7** | Fal Mantığı (AI fal + canlı falcı oturumu) | Modül |
| **PART 8** | Admin Panel (rol tabanlı yönetim) | Modül (opsiyonel) |
| **PART 9** | Dinamik Yönetim (config, feature flag, TR/EN) | Altyapı |
| **PART 10** | Performans & Güvenlik (ApiClient, token, cache, rate limit) | İlk — zorunlu temel |
| **PART 11** | 2026 Premium Özellikler (kısa video, oyun, ajans, ünlü, rüya) | Modül (opsiyonel) |
| **PART 12** | Entegrasyon, Build & Yayın (iskelet, SDK, test, release) | Son — zorunlu |

---

## 2. ÖNERİLEN OKUMA & UYGULAMA SIRASI

### AŞAMA 1 — TEMEL (önce bunlar)
1. **PART 1** — Sistemin nasıl çalıştığını anla (auth, SSE, TRTC, zarf).
2. **PART 10** — `ApiClient`'ı kur: base URL, JWT Bearer, `{success,data}` parse, 401→refresh, `flutter_secure_storage`.
3. **PART 2** — Tasarım sistemini kur: `AppColors`, `AppText`, `GlassCard`, `PremiumButton`, `AppScaffold`, `FramedAvatar`.
4. **PART 12 §1** — Proje iskeletini (`lib/core`, `features`, `shared`) oluştur.

### AŞAMA 2 — GİRİŞ & ANA İSKELET
5. **PART 12 §3** — Giriş/kayıt: `POST /api/auth/mobile-login`, SSO (Google/Apple/TikTok), token saklama.
6. **PART 9** — Açılışta `GET /api/mobile/config`: feature flag, forceUpdate, TR/EN.
7. **PART 2 §9** — Alt navigasyon (bottom nav) + ana iskelet.

### AŞAMA 3 — ANA MODÜLLER (öncelik sırasıyla)
8. **PART 3** — Profil.
9. **PART 7** — Fal (uygulamanın çekirdeği: AI fal + canlı falcı).
10. **PART 4** — Sesli sohbet odaları (TRTC).
11. **PART 5** — Canlı yayın & PK (TRTC).
12. **PART 6** — Hediye & gelir (PART 4/5 ile birlikte çalışır).

### AŞAMA 4 — EK MODÜLLER (opsiyonel, feature flag ile)
13. **PART 11** — Kısa video, oyun, ajans, ünlü/fan kulüp, rüya, sosyal.
14. **PART 8** — Admin panel (sadece yönetici rolleri için).

### AŞAMA 5 — YAYIN
15. **PART 12 §6–10** — Test matrisi, erişilebilirlik/güvenlik kontrolü, `flutter build appbundle/ipa`, store yayını.

---

## 3. İLK 1 SAATTE YAPILACAKLAR (hızlı başlangıç)

```bash
# 1. Proje oluştur
flutter create canlifal_app
cd canlifal_app

# 2. Temel paketleri ekle (PART 12 §2 tam liste)
flutter pub add http flutter_secure_storage cached_network_image \
  google_sign_in sign_in_with_apple firebase_messaging
```

Ardından sırasıyla:
1. `lib/core/api_client.dart` — PART 10 §1'deki `ApiClient` ıskeleti.
2. `lib/core/theme.dart` — PART 2'deki `AppColors` + `AppText`.
3. `lib/shared/` — PART 2'deki ortak widget'lar.
4. `lib/features/auth/` — PART 12 §3 giriş akışı.
5. Giriş çalışınca `GET /api/user/profile` ile profili çek (PART 3) → ilk ekran hazır.

---

## 4. DEĞİŞMEZ 5 KURAL (tüm seride geçerli)

1. **Gizli anahtar Flutter'da yok.** TRTC secret, Abacus key, DB — hepsi backend'de. Flutter yalnızca JWT taşır. (PART 1, PART 10)
2. **Zarf formatı:** Başarılı `{success:true, data:{...}}`, hatalı `{success:false, error:{code,message}}`. Bazı eski endpoint'ler düz obje döner — tolere eden parse kullan. (PART 1 §2)
3. **TRTC token daima backend'den.** `join-room` / `trtc/token`. (PART 4, PART 5)
4. **Gerçek zamanlı = SSE** (WebSocket değil). Tek bağlantı + backoff reconnect. (PART 10 §4)
5. **Fiyat/yüzde/içerik backend'den.** Uygulamada hardcode fiyat, oda listesi, fal menüsü tutma — hepsi dinamik. (PART 9)

---

## 5. NOT: BACKEND PERFORMANS İYİLEŞTİRMESİ (Flutter'da iş yok)

Backend'de `chat_rooms` tablosuna performans indeksleri eklendi (`isActive+createdAt`, `ownerId`, `roomType`). Bu, sesli oda listeleme sorgusunu (`GET /api/live/rooms?type=voice`) hızlandırır. **Flutter tarafında ekstra bir şey yapmanıza gerek yok** — aynı endpoint'i çağırırsınız, hızdan otomatik faydalanırsınız.

---

**Şimdi başla:** PART 1 → PART 10 → PART 2 → PART 12 §1, sonra modülleri sırayla ekle. İyi çalışmalar! 🔮
