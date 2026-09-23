# 🎵 CanlıFal — Müzik / `!istek` Sistemi API Referansı

> Sesli sohbet odalarındaki müzik isteği (`!istek`), sıra (kuyruk) yönetimi ve DJ kontrolleri için eksiksiz backend referansı. Web ve Flutter mobil uygulaması **aynı** backend'i kullanır.

---

## 1. Genel Mimari

Müzik sistemi **YouTube resmi embed oynatıcısı** üzerine kuruludur. Backend ham ses akışını çözümlemez; yalnızca **hangi videonun, ne zaman başladığını ve süresini** tutar ve bu durumu gerçek zamanlı olaylarla yayınlar. Her istemci (web + Flutter) YouTube embed oynatıcısını `startedAt`'tan geçen süre kadar ileriden başlatır → tüm cihazlar ~1-2 sn içinde senkron çalar.

- **Ses modu (audio):** İstemci embed oynatıcıyı gizli/görünmez şekilde yükler, yalnızca ses duyulur. **10 💎 jeton.**
- **Videolu mod (video):** Oda arka planında video oynatılır (koltukların altından mesaj kutusunun üstüne kadar). **20 💎 jeton.**

### Çalan müzik nerede saklanır?
`ChatRoom` kaydında dört alan:

| Alan | Açıklama |
|------|----------|
| `currentMusicVideoId` | Çalan YouTube video kimliği (yoksa `null`) |
| `currentMusicTitle` | Şarkı başlığı |
| `currentMusicStartedAt` | Sunucu saati ile başlangıç anı (senkron için) |
| `currentMusicDuration` | Süre metni, örn. `"3:45"` |

### Sıra (kuyruk) nerede saklanır?
Ayrı bir tablo **yoktur**. Sıradaki istekler `ChatMessage` satırları olarak, içerik ön ekiyle tutulur:

```
[SONG_REQUEST_PAID] videoId|title|dedication|note|duration|typeTag
[SONG_REQUEST_FREE] videoId|title|duration|typeTag
```

- Çalınan istekler içeriğe `[PLAYED]` eklenerek işaretlenir.
- `typeTag` = `VIDEO` veya `AUDIO`.
- Sıralama: **önce ücretli (PAID) istekler**, sonra kronolojik (FIFO).

---

## 2. Jeton Ücretleri

| İstek tipi | Ücret |
|-----------|-------|
| Ses (audio) | **10 💎** |
| Videolu (video) | **20 💎** |

- Jeton, isteği gönderen kullanıcıdan düşülür; bir `jetonTransaction` kaydı oluşturulur.
- Gelir paylaşımı oda tipine göre `calculateMusicDistribution(roomType)` ile hesaplanır ve oda sahibine yansıtılır.
- **Yönetici** rolündeki kullanıcılar ücret ödemez (staff bypass).
- **Maksimum süre: 6 dakika (360 sn).** Daha uzun şarkılar reddedilir.

---

## 3. Endpoint'ler

> Tüm uçlar **dual-auth**'tur: mobil `Authorization: Bearer <token>` **veya** web oturum çerezi kabul eder.

### 3.1 Şarkı İsteği Gönder (ana uç — jeton öder)
`POST /api/chat/rooms/{roomId}/song-request`

**Body:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Şarkı Adı",
  "duration": "3:45",
  "requestType": "audio"        // "audio" (10💎) | "video" (20💎)
}
```

**Davranış:**
- Jeton bakiyesi kontrol edilir; yetersizse `400` döner.
- Şu an müzik çalmıyorsa istek **hemen çalmaya başlar**; çalıyorsa **sıraya eklenir**.

**Yanıt (200):**
```json
{
  "success": true,
  "queued": true,              // true = sıraya eklendi, false = hemen çalıyor
  "queuePosition": 3,
  "newBalance": 240
}
```
**Hatalar:** `400` yetersiz jeton / eksik alan / 6dk aşımı · `401` oturum yok · `404` oda yok.

---

### 3.2 Sıra + Çalan Bilgisi (ücretlerle)
`GET /api/chat/rooms/{roomId}/song-request`

**Yanıt:**
```json
{
  "queue": [ /* sıradaki istekler */ ],
  "playing": true,
  "nowPlaying": { "videoId": "...", "title": "...", "startedAt": "...", "duration": "3:45" },
  "musicQueue": [ /* queue ile aynı */ ],
  "requestCosts": { "audio": 10, "video": 20 }
}
```

---

### 3.3 Çalan Müzik Durumu
`GET /api/chat/rooms/{roomId}/music`

Çalan şarkıyı ve tam DJ yükünü döndürür. **Otomatik ilerleme:** şarkı süresini + 5 sn aştıysa sunucu bir sonraki sıradaki şarkıya otomatik geçer (yoksa müziği durdurur).

**Yanıt:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Şarkı Adı",
  "startedAt": "2026-08-04T22:00:00.000Z",
  "duration": "3:45",
  "requestType": "audio",
  "playing": true,
  "nowPlaying": { "videoId": "...", "elapsedSeconds": 42, "embedUrl": "https://www.youtube.com/embed/...", ... },
  "musicUrl": "https://www.youtube.com/embed/...",
  "musicQueue": [ ... ]
}
```

**Eski alias (kullanımdan kaldırıldı):** `GET /api/rooms/{roomId}/music/current` → hâlâ çalışır, `Deprecation: true` başlığı döner. Yeni geliştirmelerde yukarıdaki kanonik ucu kullanın.

---

### 3.4 DJ ile Şarkı Ekle / Değiştir (yalnızca DJ/sahip)
`POST /api/chat/rooms/{roomId}/music`

DJ yetkisi olanların (oda sahibi, global admin, aktif DJ) ücretsiz olarak şarkı çalması/sıraya eklemesi içindir. Yetki yoksa `403`.

---

### 3.5 Sıradakine Geç (skip)
`DELETE /api/chat/rooms/{roomId}/music` — çalan şarkıyı bitirir, sıradaki ilk şarkıyı otomatik çalar.

**Eski alias (kullanımdan kaldırıldı):** `POST /api/rooms/{roomId}/music/skip` → hâlâ çalışır, `Deprecation: true` başlığı döner. Yeni geliştirmelerde yukarıdaki DELETE ucunu kullanın.

Yalnızca DJ/sahip; yetki yoksa `403`.

---

### 3.6 Müziği Tamamen Durdur (stop)
`POST /api/chat/rooms/{roomId}/music/stop`

**Eski alias (kullanımdan kaldırıldı):** `POST /api/rooms/{roomId}/music/stop` → hâlâ çalışır, `Deprecation: true` başlığı döner.

Çalan şarkıyı temizler **ve** sıradaki tüm bekleyen istekleri `[PLAYED]` işaretler → otomatik olarak yeni şarkı başlamaz. (skip'ten farkı: skip bir sonrakine geçer, stop her şeyi durdurur.)

**Yanıt:** `{ "success": true, "cleared": 4 }` (temizlenen sıra sayısı). Yalnızca DJ/sahip; yetki yoksa `403`.

---

### 3.7 Sıra Listesi
`GET /api/chat/rooms/{roomId}/music-queue` — sıradaki (çalınmamış) istekleri döndürür.

---

### 3.8 Çalma Geçmişi
`GET /api/music/history?roomId={roomId}&limit={n}`

Bir odada daha önce çalınmış (oynatılmış) şarkıların geçmişini döndürür. `roomId` zorunlu; `limit` varsayılan 50, maksimum 100.

**Yanıt:**
```json
{
  "history": [
    {
      "id": "msg_id",
      "videoId": "dQw4w9WgXcQ",
      "title": "Şarkı Adı",
      "duration": "3:45",
      "requestType": "audio",
      "isPaid": true,
      "playedAt": "2026-08-04T21:50:00.000Z",
      "requestedBy": { "id": "...", "name": "Kullanıcı", "image": "..." }
    }
  ],
  "count": 12
}
```

---

### 3.9 YouTube Arama
`GET /api/youtube/search?q={sorgu}` → `{ videos: [{ id, title, thumbnail, duration, channel, views }] }`

Müzik penceresi ve `!istek` komutu bu ucu kullanır.

---

## 4. `!istek` Komutu (sohbet)

Kullanıcı sohbete `!istek [şarkı adı]` yazdığında:

1. Müzik penceresi açılır.
2. Varsa `[şarkı adı]` arama kutusuna otomatik doldurulur ve arama çalıştırılır.
3. Kullanıcı sonuçlardan bir şarkı seçer.
4. **Ses (10 💎)** veya **Videolu (20 💎)** seçimini yapar.
5. İstek `POST /api/chat/rooms/{roomId}/song-request` ile gönderilir (jeton düşer).

> Şarkı isteğini **giriş yapmış herhangi bir kullanıcı** gönderebilir (jeton öder). DJ yetkisi yalnızca durdur/atla kontrollerini yönetir.

---

## 5. DJ Yetki Kuralları (`canControlMusic`)

Müziği kontrol edebilenler (skip/stop/DJ ile ekleme):

- Oda sahibi
- Global admin (`admin` / `yonetici` rolü)
- Aktif DJ (oda sahibi odadaysa yalnızca `activeDjId`; sahip yoksa listedeki ilk mevcut DJ)

Sıradan kullanıcılar bu kontrolleri kullanamaz ama **jeton ödeyerek şarkı isteyebilir.**

---

## 6. Gerçek Zamanlı Olaylar

Müzik durumu, oda SSE akışı (`GET /api/chat/rooms/{roomId}/stream`) üzerinden yayınlanır. Ayrıntılı olay akışı ve Flutter entegrasyonu için: **[FLUTTER_INTEGRATION.md](./FLUTTER_INTEGRATION.md)**.
