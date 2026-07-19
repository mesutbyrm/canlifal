# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 12 — ENTEGRASYON, BUILD & YAYIN KONTROL LİSTESİ

> **Kaynak:** Tüm önceki parçaların birleşimi + gerçek backend altyapısı. **Önceki:** PART 11.

---

## 1. PROJE İSKELETİ (önerilen)
```
lib/
  core/        → ApiClient, secure storage, SSE, TRTC servisi, tema (PART 2/10)
  models/      → UserProfile, Room, Stream, Gift, Fortune, Session
  features/
    auth/  profile/  voice/  live/  gifts/  fortune/  admin/
    shorts/  games/  agency/  celebrity/  dreams/  social/
  shared/      → GlassCard, PremiumButton, AppScaffold, FramedAvatar
  config/      → mobile/config, feature flags, translations
```
Durum yönetimi: Riverpod veya Bloc (tercih projeye). Her feature bağımsız.

## 2. ÜÇÜNCÜ PARTİ SDK'LAR
| Amaç | Paket |
|------|-------|
| Ses/Video | Tencent TRTC Flutter SDK |
| Push | Firebase Messaging + OneSignal (`devices/fcm`) |
| Secure storage | `flutter_secure_storage` |
| Görsel cache | `cached_network_image` |
| SSE | `http` stream / `flutter_client_sse` |
| Google SSO | `google_sign_in` → `/api/auth/mobile-google` |
| Apple SSO | `sign_in_with_apple` → `/api/auth/mobile-apple` |
| TikTok SSO | → `/api/auth/mobile-tiktok` |

> Firebase config dosyaları (`google-services.json`, Apple plist) proje kimlik bilgileriyle eklenmeli. TRTC secret asla client'ta yok (PART 10).

## 3. KİMLİK DOĞRULAMA ENTEGRASYONU (PART 1)
1. Login: `POST /api/auth/mobile-login` → `{ accessToken, refreshToken, user }`.
2. Kayıt: `POST /api/auth/mobile-register`. SSO: google/apple/tiktok endpoint'leri.
3. Token'ları secure storage'a yaz; her istekte Bearer ekle; 401'de refresh.
4. Cihaz: `verify-device` / `reclaim-device`.

## 4. TRTC ENTEGRASYON ÖZETİ
- Token daima backend'den: `join-room` / `trtc/token` / `trtc/usersig`.
- Sesli oda: audio-only. Canlı yayın: anchor=video+audio, audience=pull.
- Webhook (`tencent/webhook`) backend'de oda yaşam döngüsünü + `redisCache` presence'ı yönetir; Flutter sadece SDK olaylarını dinler.

## 5. BİLDİRİM ENTEGRASYONU
- FCM token'ı login sonrası `POST /api/devices/fcm` ile kaydet.
- Uygulama içi bildirim: `GET /api/notifications` + SSE `notifications/stream`.

## 6. YAYIN ÖNCESİ TEST MATRİSİ
| Alan | Test |
|------|------|
| Auth | Login/refresh/logout, SSO, 401 recovery |
| Profil | Güncelleme, avatar upload, bakiye |
| Sesli oda | Giriş/çıkış, koltuk, heartbeat, müzik, SSE |
| Canlı yayın | Aç/izle/bitir, PK, co-broadcast |
| Hediye | Gönderim, animasyon, bakiye düşüşü, 429 |
| Fal | AI fal (foto upload), canlı oturum timer/iade |
| Admin | Rol gizleme, pending-counts, finans |
| Dinamik | config, forceUpdate, TR/EN, feature flag |
| Performans | SSE reconnect, offline, liste sayfalama |

## 7. ÇOK DİLLİ & ERİŞİLEBİLİRLİK SON KONTROL
- [ ] Tüm kullanıcı metinleri TR (varsayılan) + EN; `translations` fallback.
- [ ] Kontrast ≥ 4.5:1; gold buton koyu metin (PART 2).
- [ ] Tüm butonlar işlevsel; boş beyaz ekran yok (skeleton).

## 8. GÜVENLİK SON KONTROL (PART 10)
- [ ] Gizli anahtar yok; token secure storage.
- [ ] Hassas işlemler (ödeme, gelir, moderasyon) backend'de yetki kontrollü.
- [ ] Rate limit 429 ele alınıyor.

## 9. RELEASE
- Android: `flutter build appbundle --release` (signing key). iOS: `flutter build ipa` (provisioning).
- `mobile/config` → `minVersion`/`forceUpdate` ile sürüm kontrolü; eski sürümleri güncellemeye zorla.
- Store metinleri ve görselleri TR/EN.

## 10. SERİ ÖZETİ
PART 1 Sistem Mimarisi → PART 2 UI/UX → PART 3 Profil → PART 4 Sesli Sohbet → PART 5 Canlı Yayın/PK → PART 6 Hediye/Gelir → PART 7 Fal → PART 8 Admin → PART 9 Dinamik Yönetim → PART 10 Performans/Güvenlik → PART 11 2026 Özellikler → PART 12 Entegrasyon/Yayın.

**Seri tamamlandı.** Tüm parçalar %100 gerçek canlifal.com backend koduna dayalıdır.
