# 📱 CanlıFal — Müzik Sistemi Flutter Entegrasyon Rehberi

> Sesli sohbet odalarındaki müzik / `!istek` sisteminin Flutter tarafında nasıl tüketileceğini anlatır. **Flutter yalnızca backend'i tüketir; hiçbir iş mantığı (jeton düşürme, sıralama, gelir paylaşımı) istemcide çalışmaz.** Tüm karar backend'de alınır.

API uçlarının tam referansı için: **[MUSIC_API.md](./MUSIC_API.md)**.

---

## 1. Temel İlke: Backend Karar Verir, Flutter Gösterir

| Sorumluluk | Nerede |
|-----------|--------|
| Jeton kontrolü & düşürme | **Backend** |
| Sıralama (ücretli önce, FIFO) | **Backend** |
| Otomatik sonraki şarkıya geçme | **Backend** |
| Gelir paylaşımı | **Backend** |
| 6 dk süre sınırı | **Backend** |
| YouTube embed oynatıcıyı gösterme | **Flutter** |
| Senkron konumu hesaplama (elapsed) | **Flutter** (backend'in verdiği değerle) |
| UI (pencere, A-Z indeksi, sıra listesi) | **Flutter** |

> Flutter asla kendi başına jeton düşürmez ya da "şu şarkı sırada kaçıncı" hesabı yapmaz. Bu değerler her zaman API yanıtından/olaydan alınır.

---

## 2. Müzik Oynatma (YouTube Embed)

Backend ham ses akışı vermez; `videoId` + `startedAt` + `duration` verir. Flutter, YouTube embed oynatıcısını (örn. `youtube_player_iframe` / bir WebView) kullanır.

### Senkronizasyon
Backend `nowPlaying.elapsedSeconds` (şarkının başlamasından bu yana geçen saniye) ve hazır `embedUrl` döner:

```
https://www.youtube.com/embed/{videoId}?autoplay=1&start={elapsedSeconds}&enablejsapi=1&playsinline=1
```

Flutter bu URL'yi yüklediğinde tüm cihazlar aynı konumdan çalmaya başlar (~1-2 sn senkron). Kendi zamanlayıcınızı kurmanıza gerek yok; her `nowPlaying` güncellemesinde `elapsedSeconds`'ı kullanın.

### Ses modu vs Videolu mod
- `requestType == "audio"` → oynatıcıyı **gizli/görünmez** boyutta yükle (yalnızca ses).
- `requestType == "video"` → oynatıcıyı oda **arka planında** göster (koltukların altı, mesaj kutusunun üstü; sohbet/hediye/koltuk katmanları videonun üstünde kalır). YouTube kontrol çubuğu gizli olmalı (`controls=0`).

---

## 3. Tipik Ekran Akışları

### 3.1 Müzik Penceresi (`!istek` veya müzik butonu)
1. Kullanıcı müzik butonuna basar **veya** sohbete `!istek [şarkı]` yazar.
2. `!istek` ise: pencere açılır, `[şarkı]` arama kutusuna doldurulur.
3. Arama: `GET /api/youtube/search?q={sorgu}` → sonuç kartları.
4. **A-Z harf indeksi:** kullanıcı bir harfe basınca o harfle başlayan popüler sanatçılar çip olarak gösterilir; çipe basınca o sanatçı aranır.
5. Kullanıcı şarkı seçer → **Ses (10 💎)** / **Videolu (20 💎)** seçimi.
6. `POST /api/chat/rooms/{roomId}/song-request` gönderilir.
7. Yanıt `queued: true` ise "sıraya eklendi (N. sırada)", `false` ise "çalmaya başladı" mesajı göster.
8. Hata (`400` yetersiz jeton vb.) → API'nin döndürdüğü `error` metnini göster.

### 3.2 Jeton Kontrolü
Jeton yetersizliği kontrolünü **backend yapar** (`400` + `error`). Flutter isteği gönderir ve hata mesajını gösterir; önceden kendi bakiye kontrolüyle butonu engellemek isteğe bağlıdır ama nihai karar backend'dedir.

### 3.3 Sıra & Çalan Bilgisi
- SSE akışından gelen DJ olayı (bkz. Bölüm 4) `musicQueue` ve `nowPlaying` içerir; ekranı bununla güncelleyin.
- İlk yükte / yeniden bağlantıda: `GET /api/chat/rooms/{roomId}/music` ile mevcut durumu alın.

### 3.4 DJ Kontrolleri (yalnızca yetkili)
- Atla: `DELETE /api/chat/rooms/{roomId}/music`
- Durdur: `POST /api/chat/rooms/{roomId}/music/stop`
- (Eski `POST /api/rooms/{roomId}/music/skip` ve `POST /api/rooms/{roomId}/music/stop` uçları hâlâ çalışır ama kullanımdan kaldırıldı.)
- Yetki yoksa backend `403` döner → bu butonları yalnızca yetkili kullanıcıya göster.

---

## 4. Gerçek Zamanlı Olaylar (SSE)

Oda olayları tek bir akıştan gelir:

```
GET /api/chat/rooms/{roomId}/stream
```

Her olay `data: {json}\n\n` biçimindedir ve bir `type` alanı taşır. M\u00fzik için ilgili olay **`type: "dj"`**'dir:

```json
{
  "type": "dj",
  "event": "QUEUE_UPDATED",
  "playing": true,
  "nowPlaying": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Şarkı Adı",
    "startedAt": "2026-08-04T22:00:00.000Z",
    "startedAtMs": 1785835200000,
    "elapsedSeconds": 42,
    "duration": "3:45",
    "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&start=42&enablejsapi=1&playsinline=1"
  },
  "musicUrl": "https://www.youtube.com/embed/...",
  "embedUrl": "https://www.youtube.com/embed/...",
  "musicQueue": [
    {
      "id": "msg_id",
      "videoId": "...",
      "title": "...",
      "dedication": "",
      "note": "",
      "duration": "4:12",
      "requestType": "audio",
      "isPaid": true,
      "userId": "...",
      "userName": "Kullanıcı",
      "createdAt": "..."
    }
  ],
  "queueLength": 3
}
```

### Flutter tarafında işleme
1. SSE akışını dinleyin; her satırda `type` alanına göre `switch` yapın.
2. `type == "dj"` geldiğinde:
   - `playing == false` → oynatıcıyı durdur / gizle.
   - `playing == true` → `nowPlaying.embedUrl`'yi (veya `videoId` + `elapsedSeconds`) oynatıcıya yükle.
   - `musicQueue` ile sıra listesini güncelle.
3. `type == "connected"` → bağlantı kuruldu; ilk poll döngüsünde tam DJ durumu gelir.
4. Yeniden bağlantıda `last-event-id` başlığını gönderin; kaldığınız yerden olayları alırsınız.

> **Önemli:** Sistemde `music_started` / `paused` / `resumed` gibi ayrı olay tipleri **yoktur**. Tüm müzik durumu tek bir `type: "dj"` yayınıyla (birleşik durum) gönderilir. "Çalıyor mu / hangi şarkı / sıra ne" bilgisini bu tek yayından türetin.

### Kullanıcı odaya geç katılırsa (join sync)
SSE bağlantısı kurulduğunda ilk poll döngüsünde backend tam DJ durumunu (`nowPlaying` + `musicQueue`) gönderir. Ek olarak istediğiniz an `GET /api/chat/rooms/{roomId}/music` ile senkron durumu çekebilirsiniz. Böylece sonradan katılan kullanıcı da şarkıyı doğru konumdan duyar.

---

## 5. Hata Yönetimi

| Durum | HTTP | Flutter davranışı |
|-------|------|------------------|
| Yetersiz jeton | 400 | `error` metnini göster, jeton yükleme ekranına yönlendir |
| 6 dk aşımı | 400 | `error` metnini göster ("maksimum 6 dakika") |
| Oturum yok | 401 | Giriş ekranına yönlendir |
| DJ yetkisi yok | 403 | Kontrol butonlarını gizle/pasifleştir |
| Oda yok | 404 | Odadan çık |

Backend hataları her zaman `{ "error": "..." }` biçiminde döner; bu metni doğrudan kullanıcıya gösterebilirsiniz (Türkçe).

---

## 6. Özet Endpoint Listesi (Flutter)

| Amaç | Çağrı |
|------|-------|
| Şarkı ara | `GET /api/youtube/search?q=` |
| Şarkı iste (jeton öde) | `POST /api/chat/rooms/{roomId}/song-request` |
| Çalan + sıra + ücretler | `GET /api/chat/rooms/{roomId}/song-request` |
| Çalan müzik (senkron) | `GET /api/chat/rooms/{roomId}/music` |
| Sıra listesi | `GET /api/chat/rooms/{roomId}/music-queue` |
| Atla (DJ) | `DELETE /api/chat/rooms/{roomId}/music` |
| Durdur (DJ) | `POST /api/chat/rooms/{roomId}/music/stop` |
| Çalma geçmişi | `GET /api/music/history?roomId=&limit=` |
| Gerçek zamanlı olaylar | `GET /api/chat/rooms/{roomId}/stream` (SSE) |
---

## 7. Kullanımdan Kaldırılan Uçlar → Kanonik Karşılıkları

Aşağıdaki eski uçlar **silinmedi**, çalışmaya devam ediyor; ancak yanıtta `Deprecation: true` ve halefini gösteren `Link` başlığı dönüyor. Yeni geliştirmelerde kanonik uçları kullanın.

| Eski uç (deprecated) | Kanonik uç |
|---|---|
| `GET /api/leaderboard` | `GET /api/leaderboards` |
| `GET /api/membership/packages` | `GET /api/memberships/packages` |
| `GET /api/payment/config` | `GET /api/payments/config` |
| `GET|POST /api/payment/requests` | `GET|POST /api/payments/requests` |
| `GET /api/payment-methods` | `GET /api/payments/methods` |
| `GET /api/payment-settings` | `GET /api/payments/settings` |
| `GET /api/rooms/{roomId}/music/current` | `GET /api/chat/rooms/{roomId}/music` |
| `POST /api/rooms/{roomId}/music/skip` | `DELETE /api/chat/rooms/{roomId}/music` |
| `POST /api/rooms/{roomId}/music/stop` | `POST /api/chat/rooms/{roomId}/music/stop` |
| `POST /api/tencent/webhook` (sağlayıcı tarafında kayıtlı, korunur) | `POST /api/trtc/webhook` |

**Not:** `/api/room/{sessionId}/...` (canlı fal seansı) ile `/api/rooms/{roomId}/...` (sohbet odası) farklı kimlik uzaylarıdır ve **birleştirilmemiştir**. Sohbet odası için kanonik ad alanı `/api/chat/rooms/{roomId}/...`'dir.
