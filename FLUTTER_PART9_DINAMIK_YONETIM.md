# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 9 — DİNAMİK YÖNETİM & KONFİGÜRASYON

> **Kaynak:** %100 gerçek `mobile/config`, `settings/*`, `homepage-*`, `translations`. **Önceki:** PART 8.

---

## 1. TEMEL İLKE: UYGULAMA BACKEND'DEN BESLENİR
Canlıfal'da ana sayfa düzeni, butonlar, fal kartları, temalar, duyurular ve fiyatlar **admin panelinden** yönetilir. Flutter bunları açılışta çeker ve dinamik render eder — **hardcode etme**.

## 2. UYGULAMA KONFİGÜRASYONU (açılışta)
- `GET /api/mobile/config` → mobil için tek çatı config (feature flag'ler, min sürüm, zorunlu güncelleme, aktif modüller).
- `GET /api/mobile/home` → ana sayfa içeriği (bölümler, sıra).
- `GET /api/settings/public` ve `GET /api/public/announcement-settings` → genel public ayarlar.

```dart
// App boot
final config = await api.get('/api/mobile/config');
if (config['data']['forceUpdate'] == true) showForceUpdateDialog();
```

## 3. DİNAMİK ANA SAYFA ÖĞELERİ
- Butonlar: `GET /api/homepage-buttons` (key, label, icon, href, sortOrder). Dinamik grid olarak render et.
- Fal kartları: `GET /api/homepage-fortune-cards` (görsel + başlık + hedef fal).
- Ticker/kayan yazı: `GET /api/homepage-ticker`.
- Presence bölümleri: `GET /api/presence/sections`. Online fal: `GET /api/online-fal`.

## 4. TEMA & GÖRSEL AYARLAR
- Temalar: `GET /api/settings/themes`. Hero: `GET /api/settings/canlidark-hero`. Reklam ayarı: `GET /api/settings/ads`.
- Kullanıcı teması: `GET/POST /api/user/theme`.
- SEO/site sayfaları: `GET /api/seo-settings`, `GET /api/site-pages/[slug]` (dinamik içerik sayfaları).

## 5. ÇOK DİLLİLİK (TR/EN)
- Çeviriler: `GET /api/translations` → anahtar-değer sözlüğü. Cihaz diline göre TR/EN seç.
- İçerik modellerinde çift alan var (`nameTr`/`nameEn`, `descTr`/`descEn`). Aktif dile göre göster.
```dart
String L(Map j, String base) => locale=='tr' ? j['${base}Tr'] : j['${base}En'];
```

## 6. DUYURU & POPUP
- Popup: `GET /api/popups` (açılışta göster, sıklık backend'de). Duyurular: `GET /api/announcements`, etkinlik: `GET /api/announcements/event`.

## 7. FİYATLANDIRMA (dinamik)
- Jeton fiyatı: `GET /api/public/jeton-price`. Komisyon: `GET /api/platform/commission-rate`.
- Jeton paketleri & ödeme: PART 3/6. Tümü backend'den; uygulamada sabit fiyat tutma.

## 8. FEATURE FLAG DESENİ
```dart
bool feature(String key) => (_config['features']?[key] ?? false) == true;
// Kullanım: if (feature('voice_rooms')) showVoiceTab();
```
> Yeni modüller backend flag'i ile açılıp kapatılabilmeli — uygulama güncellemesi gerekmeden.

## 9. KALİTE KONTROL
- [ ] Ana sayfa öğeleri backend'den; hardcode liste yok.
- [ ] TR/EN cihaz diline göre + `translations` fallback.
- [ ] forceUpdate/minVersion kontrolü açılışta.
- [ ] Fiyatlar backend'den; sabit fiyat yok.

**Sonraki:** PART 10 — Performans & Güvenlik.
