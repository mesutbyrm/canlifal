# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 8 — ADMIN PANEL (MOBİL YÖNETİM)

> **Kaynak:** %100 gerçek `admin/*` endpoint'leri. **Önceki:** PART 7.
> **Erişim:** Sadece `role` ∈ {admin, yonetici, moderator, finans}. Rolü `/api/user/profile`'dan oku, yetkisizse menüyü gizle.

---

## 1. ROL TABANLI ERİŞİM
| Rol | Erişim |
|-----|--------|
| `admin` | Tam erişim |
| `yonetici` | Tam erişim (backup/kritik ayarlar hariç olabilir) |
| `moderator` | İçerik & kullanıcı moderasyonu |
| `finans` | Ödeme, çekim, finans raporları |

> Her admin endpoint'i backend'de rolü tekrar doğrular; Flutter'daki gizleme yalnızca UX içindir, güvenlik backend'dedir.

## 2. GÖSTERGE PANELİ
- İstatistik: `GET /api/admin/statistics` (kullanıcı, gelir, aktif yayın sayıları).
- Bekleyen iş sayıları (rozet): `GET /api/admin/pending-counts` (onay bekleyen falcı, çekim, ödeme).
- Ziyaretçi: `GET /api/admin/visitor-stats`. Aktivite akışı: `GET /api/admin/activity-feed`.

## 3. KULLANICI YÖNETİMİ
- Liste/arama: `GET /api/admin/users`, `GET /api/admin/users/search`.
- Detay/güncelle: `GET/PATCH /api/admin/users/[userId]` (jeton ekle, rol değiştir, banla).
- Çekim limiti: `POST /api/admin/users/withdrawal-limit`.
- Kredi ver: `POST /api/admin/credits`.

## 4. CANLI FALCI YÖNETİMİ
- Liste: `GET /api/admin/live-tellers`. İşlemler (her biri `POST`): `[tellerId]/approve`, `/ban`, `/freeze`, `/warning`, `/bonus`, `/permissions`.
- Doğrulama: `GET /api/admin/teller-verification`. Performans: `GET /api/admin/teller-performance`. Seviyeler: `GET /api/admin/teller-levels`.

## 5. FİNANS (finans/admin)
- Özet: `GET /api/admin/finance`. Ödemeler: `GET /api/admin/payments`. Çekimler: `GET /api/admin/withdrawals` (onayla/reddet).
- Ödeme yöntemleri: `GET/POST /api/admin/payment-methods` (değişiklikte cache invalidasyonu backend'de otomatik).
- Jeton paketleri: `GET/POST /api/admin/credit-packages` (+ `[packageId]`).
- CFC: `admin/cfc-settings`, `admin/cfc-payment-requests`. Para birimi: `admin/currency-config`.

## 6. İÇERİK MODERASYONU
- Genel: `GET /api/admin/moderation`. Sohbet odaları: `GET/POST /api/admin/chat-rooms`, `admin/rooms`.
- Blog: `admin/blog/*` (oluştur, toplu içe aktar, kategoriler, yorumlar, zamanlanmış yayın).
- Rüya sözlüğü: `admin/dreams/*`. Ünlüler: `admin/celebrities`, `admin/celebrity-posts`.
- Bildirimler: `POST /api/admin/notifications` (toplu push).

## 7. BİLEŞEN & TEMA YÖNETİMİ (PART 9 ile bağlantılı)
- Platform ayarları: `GET/POST /api/admin/settings` (sesli oda gelir yüzdeleri, kapasiteler dahil).
- Ana sayfa butonları: `admin/homepage-buttons`, `admin/button-order`. Fal kartları: `admin/homepage-fortune-cards`.
- Profil çerçeveleri: `admin/profile-frames` (+ `/assign`). Rozetler: `admin/badges`, `admin/membership-badges`.
- Popup/duyuru: `admin/popups`, `admin/ticker-messages`, `admin/announcement-sections`.

## 8. MOBİL ADMİN UI ÖNERİSİ
- Kategorize grid (Dashboard / Kullanıcılar / Falcılar / Finans / İçerik / Ayarlar).
- Bekleyen iş rozetleri (pending-counts) her kartta.
- Kritik işlemlerde (ban, çekim onayı) onay dialog'u.

## 9. KALİTE KONTROL
- [ ] Admin menüsü role göre gizleniyor; backend yetki kontrolü yine de var.
- [ ] Kritik işlemler onay dialog'lu.
- [ ] Finans işlemleri sadece finans/admin rolünde.

**Sonraki:** PART 9 — Dinamik Yönetim & Konfigürasyon.
