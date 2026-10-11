# FAZ 1 — TEK BACKEND MIGRATION RAPORU
## Hediye Insights + Görevler (13 endpoint)

**Tarih:** 2026-08-11
**Hedef mimari:** `FLUTTER → https://canlifal.com → ANA BACKEND → VERİTABANI → RESPONSE`
**Durum:** 🟢 Local/test ortamında TAMAMLANDI ve doğrulandı — **production deploy YAPILMADI** (onay bekliyor)

---

## 0. Kapsam Doğrulaması (kod değişikliğinden önce)

`docs/TEK_BACKEND_MIGRATION_AUDIT.md` satır 398–410 tekrar okundu. Kapsamdaki endpoint sayısı **tam 13** olarak doğrulandı. Fazla/eksik endpoint yok.

---

## 1. Taşınan 13 Endpoint

| # | Endpoint | Metot | Auth | Ana backend dosyası | Durum |
|---|---|---|---|---|---|
| 1 | `/api/gifts/insights/feed` | GET | Hayır | `app/api/gifts/insights/feed/route.ts` | ✅ |
| 2 | `/api/gifts/insights/leaderboard` | GET | Hayır | `app/api/gifts/insights/leaderboard/route.ts` | ✅ |
| 3 | `/api/gifts/insights/map` | GET | Hayır | `app/api/gifts/insights/map/route.ts` | ✅ |
| 4 | `/api/gifts/insights/album/{userId}` | GET | Hayır | `app/api/gifts/insights/album/[userId]/route.ts` | ✅ |
| 5 | `/api/gifts/insights/badge/{userId}` | GET | Hayır | `app/api/gifts/insights/badge/[userId]/route.ts` | ✅ |
| 6 | `/api/gifts/insights/collection/{userId}` | GET | Hayır | `app/api/gifts/insights/collection/[userId]/route.ts` | ✅ |
| 7 | `/api/gifts/insights/first-gifter/{context}/{contextId}` | GET | Hayır | `app/api/gifts/insights/first-gifter/[context]/[contextId]/route.ts` | ✅ |
| 8 | `/api/gifts/insights/me/badge` | GET | **Evet** | `app/api/gifts/insights/me/badge/route.ts` | ✅ |
| 9 | `/api/gifts/insights/me/history` | GET | **Evet** | `app/api/gifts/insights/me/history/route.ts` | ✅ |
| 10 | `/api/gifts/insights/me/recommendations` | GET | **Evet** | `app/api/gifts/insights/me/recommendations/route.ts` | ✅ |
| 11 | `/api/gifts/missions` | GET | Hayır | `app/api/gifts/missions/route.ts` | ✅ |
| 12 | `/api/gifts/missions/me` | GET | **Evet** | `app/api/gifts/missions/me/route.ts` | ✅ |
| 13 | `/api/gifts/missions/{missionId}/claim` | **POST** | **Evet** | `app/api/gifts/missions/[missionId]/claim/route.ts` | ✅ |

Yeni base URL **eklenmedi**. Proxy/redirect **eklenmedi**. İkinci backend'e yeni routing **eklenmedi**. Redis **eklenmedi**. Duplicate endpoint **oluşturulmadı** (ana backend'de mevcut `catalog / check-reciprocal / lucky / recent-big / send / types / version` uçlarının hiçbiri bu 13 ile örtüşmüyor).

---

## 2. Değiştirilen Backend Dosyaları

Tüm değişiklikler **yalnızca yeni dosya ekleme** şeklindedir. **Mevcut hiçbir backend dosyası değiştirilmedi.**

```
YENİ  nextjs_space/lib/gift-insights.ts        (ortak yardımcı katman)
YENİ  nextjs_space/app/api/gifts/insights/     (10 route dosyası)
YENİ  nextjs_space/app/api/gifts/missions/     (3 route dosyası)
```

### `lib/gift-insights.ts` içeriği
- Periyot normalize (`daily/weekly/monthly/yearly/all`) + zaman penceresi
- Kapsam normalize (`tr` = gönderen ülkesi TR, `world` = filtresiz)
- Bağlam normalize, limit sınırlama, `displayAmount()` (K/M kısaltması)
- Kullanıcı/hediye serileştirme yardımcıları
- Destekçi rozet kademeleri (8 kademe) ve rozet hesaplayıcı
- Görev tanımı serileştirme + `missionProgressForUser()` günlük ilerleme hesabı

---

## 3. Değiştirilen Flutter Dosyaları

**HİÇBİRİ. Sıfır Flutter değişikliği gerekti.**

Gerekçe (kaynak kodla doğrulandı — `lib/core/network/api_backend_router.dart`):
- Yönlendirici yalnızca şu önekleri ikinci backend'e gönderiyor: `/api/pk`, `/api/gifts/battles`, `/api/gifts/goals`, `/api/membership/`, `/api/live/pk/active`, `/api/live/guest/`, `/api/games/rooms`, `/api/games/auto-match`.
- `/api/gifts/insights/*` ve `/api/gifts/missions/*` bu listede **yok** → `ApiBackendKind.main` → `Env.apiBaseUrl` = `https://canlifal.com`.
- `api_endpoints.dart` satır 88–105'teki 13 yol string'i hedeflenen yollarla birebir aynı.
- `GatewayFallbackInterceptor` yalnızca **502/503/504**'te devreye giriyor; 404'te fallback yok.

### 🔴 Bunun ortaya çıkardığı gerçek (canlı probe ile doğrulandı)
Bugün `https://canlifal.com` bu 13 yolun **hepsine 404** dönüyor. Flutter zaten bu yolları ana backend'e gönderdiği için, **mobil uygulamadaki hediye insights/görev ekranları şu anda production'da çalışmıyor**. Bu migration deploy edildiğinde bu kırıklık da düzelecek.

---

## 4. Kullanılan Veritabanı Modelleri (mevcut şemadan)

| Model | Kullanım |
|---|---|
| `GiftEvent` | Tüm insights toplamlarının tek kaynağı (feed, leaderboard, map, album, collection, badge, first-gifter, history, görev ilerlemesi) |
| `GiftType` | Hediye meta verisi + koleksiyon tamamlanma paydası |
| `User` | Gönderen/alıcı profil bilgisi; ödül için jeton ve kredi bakiyesi |
| `GiftMission` | Görev tanımları (şu an 0 kayıt) |
| `UserMissionProgress` | Ödül talebi kaydı (kullanıcı + görev + gün anahtarı benzersiz) |

**Kritik doğrulama:** İkinci backend ile ana backend **aynı veritabanını, aynı tabloları ve aynı satırları** okuyor. Feed'in döndüğü en son kayıt kimliği (`cmri32dow003vqq3fmv5aocx5`) hem ikinci backend yanıtında hem doğrudan veritabanı sorgusunda birebir aynı. **Veri taşıma gerekmedi.**

---

## 5. Eklenen Veritabanı Modeli

**YOK.** Yeni tablo, yeni kolon, yeni enum değeri eklenmedi. Şema dosyasına dokunulmadı, hiçbir şema migration'ı çalıştırılmadı. Gerekli tüm modeller şemada zaten mevcuttu.

---

## 6. Test Sonuçları (A–H)

### A) Ana backend route testleri — ✅ 13/13
Tüm 13 yol ana backend'de çözümlüyor, hiçbirinde 404 yok.

### B) Auth testleri — ✅ 5/5
| Endpoint | Token'sız | Token'lı |
|---|---|---|
| `insights/me/badge` | 401 | 200 |
| `insights/me/history` | 401 | 200 |
| `insights/me/recommendations` | 401 | 200 |
| `missions/me` | 401 | 200 |
| `missions/{id}/claim` (POST) | 401 | 404 (görev tanımı yok — beklenen) |

Hem mobil token hem web oturumu destekleniyor (ikili auth; mevcut `lucky/history` deseniyle aynı).

### C) GET/POST testleri — ✅
- 12 endpoint yalnızca GET.
- `claim` yalnızca POST: GET → **405**, POST → 401/404/200.

### D) 404 testi — ✅
`/api/gifts/insights/does-not-exist` → 404.

### E) Request/response schema testi — ✅ 10/10 (superset)
Otomatik anahtar-ağacı karşılaştırması: ikinci backend'in döndüğü **hiçbir alan eksik değil**. Ana backend ek olarak düz (flat) takma alanlar dönüyor — bkz. "Bilinçli fark".

### F) Flutter router testi — ✅
Kaynak kod incelemesiyle: 13 yolun hepsi ana backend'e çözümleniyor. Hiçbiri oyun backend'ine gitmiyor. Router'a **kural eklenmedi**.

### G) Gerçek HTTP probe — bölüm 7

### H) Web regresyon testi — ✅
- Mevcut hiçbir dosya değiştirilmedi (sürüm durumu: yalnızca 3 yeni yol).
- Web arayüzünde `gifts/insights` veya `gifts/missions` çağrısı **yok** (arama: 0 sonuç).
- Tip kontrolü + tam production build: **BAŞARILI** (çıkış kodu 0).
- Duman testi: `/` 200, `/api/gifts/types` 200, `/api/gifts/recent-big` 200, `/api/gifts/catalog` 401 (önceden de auth'lu).

**Başarısız test yok.**

---

## 7. Gerçek HTTP Probe Sonuçları

### 7.1 Production `canlifal.com` — deploy ÖNCESİ durum
Tüm 13 yol → **404** (henüz deploy edilmedi; beklenen).

### 7.2 İkinci backend vs. ana backend (yerel build) — durum kodları

| Endpoint | İkinci backend | Ana backend | Sonuç |
|---|---|---|---|
| `insights/feed` | 200 | 200 | ✅ |
| `insights/leaderboard` | 200 | 200 | ✅ |
| `insights/map` | 200 | 200 | ✅ |
| `insights/album/{id}` | 200 | 200 | ✅ |
| `insights/badge/{id}` | 200 | 200 | ✅ |
| `insights/collection/{id}` | 200 | 200 | ✅ |
| `insights/first-gifter/{c}/{id}` | 200 | 200 | ✅ |
| `insights/me/badge` | 401 | 401 / 200 | ✅ |
| `insights/me/history` | 401 | 401 / 200 | ✅ |
| `insights/me/recommendations` | 401 | 401 / 200 | ✅ |
| `missions` | 200 (boş dizi) | 200 (boş dizi) | ✅ |
| `missions/me` | 401 | 401 / 200 | ✅ |
| `missions/{id}/claim` POST | 401 | 401 | ✅ |
| `missions/{id}/claim` GET | 404 | **405** | ⚠️ küçük fark |

### 7.3 Yanıt **değerlerinin** birebir karşılaştırılması

Aynı parametrelerle iki backend'in çıktıları alan alan karşılaştırıldı:

| Sorgu | Sonuç |
|---|---|
| `feed?period=all` | **VALUES MATCH** |
| `feed?period=daily` | **VALUES MATCH** (boş) |
| `leaderboard?period=all&type=senders&scope=world` | **VALUES MATCH** |
| `leaderboard?period=all&type=receivers&scope=world` | **VALUES MATCH** |
| `leaderboard?period=all&type=senders&scope=tr` | **VALUES MATCH** |
| `leaderboard?period=weekly&type=senders&scope=tr` | **VALUES MATCH** (boş) |
| `map?period=all&scope=world` | **VALUES MATCH** |
| `map?period=all&scope=tr` | **VALUES MATCH** |
| `album/{userId}` | **VALUES MATCH** |
| `badge/{userId}` | **VALUES MATCH** |
| `collection/{userId}` | **VALUES MATCH** |
| `first-gifter/live_stream/{gerçek-id}` | **VALUES MATCH** |
| `first-gifter/live_stream/{olmayan-id}` | **VALUES MATCH** (null) |
| `missions` | **VALUES MATCH** (boş dizi) |

Karşılaştırma sırasında tespit edilip **düzeltilen** üç sapma:
1. `collection.completion.totalGiftTypes` — ikinci backend hediye türlerinin **tamamını** (26) sayıyor, yalnızca aktif olanları (25) değil. Ana backend aynı davranışa çekildi.
2. `collection.received` sıralaması — ikinci backend tutara göre sıralıyor, adede göre değil. Düzeltildi.
3. `album[].gift` — ikinci backend hediye türünün **tam kaydını** gömüyor. Ana backend de artık tam kaydı dönüyor.

---

## ⚠️ Doğrulandı / Doğrulanamadı — dürüst beyan

**Doğrulandı:** 7 herkese açık insights ucu + `missions` — yanıt şeması ve değerleri birebir eşleşiyor.

**Doğrulanamadı:** `me/badge`, `me/history`, `me/recommendations`, `missions/me`, `missions/{id}/claim` — ikinci backend **farklı bir token imzalama anahtarı** kullandığı için bu 5 ucun gerçek yanıt gövdesi ikinci backend'den **alınamadı** (tüm denemeler 401). Bu 5 uç, Flutter'ın domain modellerindeki alan adlarına göre yeniden kurgulandı. Şema uyumu "ikinci backend ile birebir" olarak **iddia edilemez**; yalnızca "mobil istemcinin beklediği alanları karşılıyor" denebilir.

**Küçük bilinçli fark:** `claim` ucuna GET atılırsa ana backend 405, ikinci backend 404 dönüyor. İkisi de hata; Flutter yalnızca POST kullanıyor.

### Bilinçli fark — düz (flat) takma alanlar
Flutter'ın çözümleyicileri `displayName`, `userId`, `totalCoins`, `giftCount`, `senderName`, `giftName`, `amount`, `label`, `count`, `giftId` gibi **düz** anahtarları okuyor; ikinci backend ise **iç içe** nesneler döndürüyor (kullanıcı, hediye, gönderen alt nesneleri). Bu yüzden leaderboard, feed, map, album, collection ve first-gifter mobil tarafta hâlâ boş/placeholder değerlerle işleniyor — bu **ikinci backend kaynaklı mevcut bir hata**.

**Karar:** Ana backend, ikinci backend'in döndüğü iç içe anahtarların **tamamını** aynen döndürüyor, **ek olarak** düz takma alanları da ekliyor. Tamamen geriye dönük uyumlu bir üst küme; Flutter'a dokunmadan bu görüntüleme hatasını da düzeltiyor.

---

## 8. Web Regresyon Sonucu

**Regresyon yok.** Mevcut hiçbir dosya değiştirilmedi, yalnızca yeni uç noktalar eklendi. Web arayüzü bu 13 ucu hiç çağırmıyor. Tam production build ve tip kontrolü başarılı; checkpoint kaydedildi.

---

## 9. İkinci Backend'de Kalan Endpoint Sayısı

| | Adet |
|---|---|
| Audit raporundaki toplam ikinci backend ucu | 50 |
| Faz 1'de ana backend'e taşınan | **13** |
| **Kalan** | **37** |

Not: Bu 13 uç ikinci backend'den **silinmedi** (kaynak kodu bizde yok). Trafik, Flutter zaten ana backend'e yönlendirdiği için deploy sonrası kendiliğinden ana backend'e geçecek.

---

## 10. Bir Sonraki Faz Önerisi

### 🎯 Faz 2 — Hediye savaşları ve hedefleri
`/api/gifts/battles*`, `/api/gifts/goals*`

Gerekçe:
- `GiftBattle` / `GiftGoal` modelleri **şemada zaten var** ve veri içeriyor (3 savaş kaydı) — Faz 1'deki "tablo zaten paylaşımlı" avantajının aynısı.
- Flutter router'da bu iki önek için **açık kural var** — taşıma sonrası kaldırılacak tek dosya, tek fonksiyon.
- Redis gerektirmiyor, socket gerektirmiyor, PK sistemine dokunmuyor.
- Faz 1 ile aynı hediye alanında kaldığı için ortak yardımcı katman yeniden kullanılabilir.

### ⚠️ Faz 2 öncesi kritik uyarı
Ana backend hediye olay kayıtlarını **yalnızca okuyor**; kayıtları **yazan taraf ikinci backend**. Bu nedenle görev ilerlemeleri ve insights toplamları, hediye gönderimi ana backend'e taşınana kadar ikinci backend'in yazdığı veriye bağımlı kalacak.
**Faz 3 önerisi: hediye gönderim (yazma) akışının taşınması** — tek backend hedefi için asıl kritik adım budur.

---

## 🔴 Karar Bekleyen Konular

1. **Görev tanımı tablosu boş (0 kayıt).** Her iki backend de boş dizi dönüyor. Görev tanımları eklensin mi? Bu bir **veri değişikliği** olduğu için onayınız olmadan yapılmadı.
2. **Production deploy** yapılmadı — onay bekliyor.
3. **Flutter repo push** yapılmadı — zaten değişiklik gerekmediği için push edilecek bir şey yok.
