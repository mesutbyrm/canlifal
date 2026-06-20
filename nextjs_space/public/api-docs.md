# CanlıFal.com — Backend API Dokümantasyonu

**Versiyon:** 1.0  
**Tarih:** 20 Haziran 2026  
**Base URL:** `https://canlifal.com`  
**Kimlik Doğrulama:** Tüm korumalı endpointler dual-auth destekler:  
- **Web:** NextAuth oturum çerezi (`getServerSession`)  
- **Mobil (Flutter):** `Authorization: Bearer <JWT>` başlığı (`authenticateRequest`)  

**SSE Stream Formatı (Standart):**  
Akışlı yanıtlar OpenAI uyumlu SSE formatı kullanır:  
```
data: {"id":"...","choices":[{"delta":{"content":"metin parçası"}}]}

data: [DONE]
```
Content-Type: `text/event-stream; charset=utf-8`  
Delta içeriği: `choices[0].delta.content`  

**LLM Altyapısı:**  
- URL: `https://routellm.abacus.ai/v1/chat/completions`  
- Model: `gpt-4.1-nano`  
- Stream: true, Max retries: 2, Timeout: 30s  

---

## İçindekiler

1. [Fal & Tarot Endpointleri](#1-fal--tarot-endpointleri)
2. [Sesli Sohbet Odaları](#2-sesli-sohbet-odaları)
3. [Canlı Yayın (Video Streams)](#3-canlı-yayın-video-streams)
4. [Jeton & Ödeme Sistemi](#4-jeton--ödeme-sistemi)
5. [Canlı Falcılar](#5-canlı-falcılar)
6. [Canlı Fal Seans Odası](#6-canlı-fal-seans-odası)
7. [Kimlik Doğrulama (Auth)](#7-kimlik-doğrulama-auth)
8. [Kullanıcı & Profil](#8-kullanıcı--profil)
9. [Sosyal Özellikler](#9-sosyal-özellikler)
10. [Hediye Sistemi](#10-hediye-sistemi)
11. [Üyelik & VIP](#11-üyelik--vip)
12. [Oyunlar](#12-oyunlar)
13. [Rüya Ansiklopedisi & Günlük](#13-rüya-ansiklopedisi--günlük)
14. [Blog & İçerik](#14-blog--içerik)
15. [Ajans Sistemi](#15-ajans-sistemi)
16. [Dosya Yükleme](#16-dosya-yükleme)
17. [Bildirimler & Mesajlar](#17-bildirimler--mesajlar)
18. [Arama & Keşfet](#18-arama--keşfet)
19. [Diğer Endpointler](#19-diğer-endpointler)
20. [Admin Paneli Endpointleri](#20-admin-paneli-endpointleri)

---

## 1. Fal & Tarot Endpointleri

### Genel Yapı

Tüm fal endpointleri aynı pattern'i takip eder:
1. **Erişim kontrolü:** Kayıtsız kullanıcılar → IP bazlı limit (`checkIpFortuneAccess`). Kayıtlı kullanıcılar → CFC kredi düşümü (`checkAndDeductCredits`). Reklam izleme (`adWatched: true`) ile ücretsiz erişim.
2. **LLM çağrısı:** Fal türüne özel system prompt ile SSE stream.
3. **Kayıt:** Sonuç `Fortune` tablosuna kaydedilir.
4. **Otomatik paylaşım:** `autoShareFortune()` ile sosyal akışa eklenir.
5. **E-posta özeti:** Kayıtlı kullanıcıya `sendFortuneSummaryEmail()` gönderilir.

### Ortak İstek Alanları (Tüm Fal Endpointleri)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `adWatched` | boolean | Hayır | `true` ise kredi düşülmez |
| `language` | string | Hayır | Yanıt dili (varsayılan: Türkçe) |

### Ortak Hata Yanıtları

| Kod | Body | Durum |
|-----|------|-------|
| 403 | `{ error: "...", reason: "ip_limit" }` | IP limiti aşıldı |
| 403 | `{ error: "...", reason: "needs_cfc" }` | CFC kredi yetersiz |
| 500 | `{ error: "Yapay zeka servisi yanıt vermedi" }` | LLM hatası |

---

### 1.1 Kahve Falı (Metin)

**`POST /api/fortunes/kahve-fali`**  
**Alias:** `POST /api/fortunes/coffee`

Kullanıcının metin bazlı kahve falı.

**Request Body:**
```json
{
  "adWatched": false,
  "language": "tr"
}
```

**Kredi Tipi:** `coffee`  
**Response:** SSE Stream (`text/event-stream`)  
**System Prompt Özeti:** Deneyimli kahve falcısı. 300-400 kelime, mistik, duygusal, kişiselleştirilmiş. Aşk, kariyer, sağlık, şans hakkında kehanetler.

---

### 1.2 Kahve Falı (Görsel Analiz)

**`POST /api/fortunes/coffee-image`**  
**Alias:** `POST /api/fortunes/kahve-fali-image`

Kullanıcının yüklediği fincan/tabak görselleri üzerinden fal bakma.

**Request Body:**
```json
{
  "cupImagePath": "uploads/user123/fincan.jpg",
  "saucerImagePath": "uploads/user123/tabak.jpg",
  "adWatched": false,
  "language": "tr"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `cupImagePath` | string | ✅ | S3 cloud storage path (fincan görseli) |
| `saucerImagePath` | string | Hayır | S3 cloud storage path (tabak görseli) |

**Kredi Tipi:** `coffee`  
**Response:** SSE Stream  
**Not:** LLM'ye `image_url` tipiyle gönderilir. S3 signed URL oluşturulur.

---

### 1.3 Tarot Falı

**`POST /api/fortunes/tarot-fali`**  
**Alias:** `POST /api/fortunes/tarot`

**Request Body:**
```json
{
  "question": "İş hayatım nasıl olacak?",
  "cardCount": 3,
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `question` | string | ✅ | Kullanıcının sorusu |
| `cardCount` | number | Hayır | Kart sayısı (varsayılan: 3) |

**Kredi Tipi:** `tarot`  
**Response:** SSE Stream

---

### 1.4 Rüya Yorumu

**`POST /api/fortunes/ruya-yorumu`**  
**Alias:** `POST /api/fortunes/dream`

**Request Body:**
```json
{
  "dreamDescription": "Uçtuğumu gördüm, sonra denize düştüm...",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `dreamDescription` | string | ✅ | Rüya detayı |

**Kredi Tipi:** `dream`  
**Response:** SSE Stream

---

### 1.5 El Falı

**`POST /api/fortunes/el-fali`**  
**Alias:** `POST /api/fortunes/palm`

**Request Body:**
```json
{
  "palmImagePath": "uploads/user123/el.jpg",
  "hand": "right",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `palmImagePath` | string | ✅ | S3 cloud storage path (el görseli) |
| `hand` | string | Hayır | `right` veya `left` |

**Kredi Tipi:** `palm`  
**Response:** SSE Stream  
**Not:** LLM'ye `image_url` tipiyle gönderilir.

---

### 1.6 Melek Kartları

**`POST /api/fortunes/melek-kartlari`**  
**Alias:** `POST /api/fortunes/angel`

**Request Body:**
```json
{
  "question": "Meleklerim bana ne söylüyor?",
  "cardCount": 3,
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `question` | string | ✅ | Kullanıcının sorusu |
| `cardCount` | number | Hayır | Kart sayısı |

**Kredi Tipi:** `angel`  
**Response:** SSE Stream

---

### 1.7 Kurşun Dökme

**`POST /api/fortunes/kursundokme`**

**Request Body:**
```json
{
  "shapes": ["göz", "yılan", "kalp"],
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `shapes` | string[] | ✅ | Kurşundan çıkan şekiller |

**Kredi Tipi:** `kursundokme`  
**Response:** `text/plain` Stream  
**⚠️ Önemli:** Bu endpoint diğerlerinden farklı olarak SSE değil, düz metin (`text/plain`) stream döner. SSE framing yok, ham içerik chunk'ları gönderilir.

---

### 1.8 Burç Yorumu

**`POST /api/fortunes/burc-yorumu`**  
**Alias:** `POST /api/fortunes/horoscope`

**Request Body:**
```json
{
  "zodiacSign": "koc",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `zodiacSign` | string | ✅ | Burç adı (Türkçe: koc, boga, ikizler, yengec, aslan, basak, terazi, akrep, yay, oglak, kova, balik) |

**Kredi Tipi:** `horoscope`  
**Response:** SSE Stream

---

### 1.9 Aşk Uyumu

**`POST /api/fortunes/ask-uyumu`**  
**Alias:** `POST /api/fortunes/love`

**Request Body:**
```json
{
  "yourSign": "aslan",
  "partnerSign": "terazi",
  "names": { "your": "Ayşe", "partner": "Mehmet" },
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `yourSign` | string | ✅ | Sizin burcunuz |
| `partnerSign` | string | ✅ | Partnerinizin burcu |
| `names` | object | Hayır | İsimler |

**Kredi Tipi:** `love`  
**Response:** SSE Stream

---

### 1.10 Katina Falı

**`POST /api/fortunes/katina`**

**Request Body:**
```json
{
  "question": "Geleceğim nasıl olacak?",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `question` | string | ✅ | Kullanıcının sorusu |

**Kredi Tipi:** `katina`  
**Response:** SSE Stream

---

### 1.11 Numeroloji

**`POST /api/fortunes/numeroloji`**  
**Alias:** `POST /api/fortunes/numerology`

**Request Body:**
```json
{
  "name": "Mehmet",
  "birthDate": "1990-05-15",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Kullanıcının ismi |
| `birthDate` | string | ✅ | Doğum tarihi (YYYY-MM-DD) |

**Kredi Tipi:** `numerology`  
**Response:** SSE Stream (max_tokens: 600)

---

### 1.12 Evet/Hayır

**`POST /api/fortunes/evet-hayir`**  
**Alias:** `POST /api/fortunes/yesno`

**Request Body:**
```json
{
  "question": "Bu iş olacak mı?",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `question` | string | ✅ | Evet/hayır sorusu |

**Kredi Tipi:** `yesno`  
**Response:** SSE Stream (max_tokens: 300)

---

### 1.13 İstihare

**`POST /api/fortunes/istihare`**  
**Alias:** `POST /api/fortunes/istikhara`

**Request Body:**
```json
{
  "question": "Bu kararı almalı mıyım?",
  "situation": "İş değişikliği düşünüyorum",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `question` | string | ✅ | İstihare sorusu |
| `situation` | string | Hayır | Durumun detayı |

**Kredi Tipi:** `istikhara`  
**Response:** SSE Stream

---

### 1.14 Aura Analizi

**`POST /api/fortunes/aura-analizi`**  
**Alias:** `POST /api/fortunes/aura`

**Request Body:**
```json
{
  "name": "Ayşe",
  "birthDate": "1995-03-20",
  "currentMood": "Huzurlu",
  "recentExperiences": "Yeni bir işe başladım",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Kullanıcının ismi |
| `birthDate` | string | Hayır | Doğum tarihi |
| `currentMood` | string | Hayır | Mevcut ruh hali |
| `recentExperiences` | string | Hayır | Son deneyimler |

**Kredi Tipi:** `aura`  
**Response:** SSE Stream (max_tokens: 600)

---

### 1.15 Doğum Haritası

**`POST /api/fortunes/dogum-haritasi`**  
**Alias:** `POST /api/fortunes/birthchart`

**Request Body:**
```json
{
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "birthPlace": "İstanbul",
  "adWatched": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `birthDate` | string | ✅ | Doğum tarihi |
| `birthTime` | string | Hayır | Doğum saati |
| `birthPlace` | string | ✅ | Doğum yeri |

**Kredi Tipi:** `birthchart`  
**Response:** SSE Stream (max_tokens: 800)

---

### 1.16 Fal Geçmişi

**`GET /api/user/fortunes`**  
**Auth:** Zorunlu

Kullanıcının geçmiş fallarını listeler.

**Query Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `saved` | boolean | Sadece kaydedilenleri getir |
| `pinned` | boolean | Sadece sabitlenenleri getir |

**Başarılı Yanıt (200):**
```json
[
  {
    "id": "clx...",
    "type": "coffee",
    "content": "Falınızda güzel şeyler görüyorum...",
    "isSaved": true,
    "isPinned": false,
    "createdAt": "2026-06-20T10:30:00.000Z"
  }
]
```

**Desteklenen Fal Tipleri (DB enum):** `coffee`, `tarot`, `dream`, `palm`, `horoscope`, `love`, `angel`, `katina`, `kursundokme`, `numerology`, `yesno`, `istikhara`, `aura`, `birthchart`, `dogum-haritasi`, `evet-hayir`

---

### 1.17 Günlük Burç Yorumu

**`GET /api/horoscope/daily`**

**Query Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `sign` | string | Burç (aries, taurus, gemini, ...) |

**Response:** Günlük burç verisi

---

### 1.18 Fal Erişim Kontrol

**`GET /api/fortune-access/check`** — Erişim durumunu kontrol et  
**`GET /api/fortune-access/ip-status`** — IP bazlı durum

---

## 2. Sesli Sohbet Odaları

### Mimari Notlar
- **SSE polling** (Socket.IO değil) — 2 saniye aralıkla yoklama
- **In-memory event bus:** `lib/chat-events.ts` — Oda başına max 200 event, 2 dakika TTL
- **Ses:** Agora RTC SDK (WebRTC değil)
- **Koltuk sistemi:** 15 koltuk (index 0-14), index 0 = taht koltuğu
- **Rol hiyerarşisi:** superadmin(5) > founder(4) > sop(3) > op(2) > voice(1) > none(0)
- **Rol sembolleri:** `%` superadmin, `~` founder, `&` sop, `@` op, `+` voice

### 2.1 Oda Listeleme & Oluşturma

**`GET /api/chat/rooms`** — Oda listesi  
**Auth:** Opsiyonel (giriş yapmamış kullanıcılar da görebilir)

---

**`POST /api/chat/rooms/create`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "name": "Falcılar Buluşması",
  "description": "Kahve falı sohbeti",
  "roomType": "voice_standard",
  "isPrivate": false,
  "maxUsers": 50
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Oda adı |
| `description` | string | Hayır | Açıklama |
| `roomType` | string | Hayır | Oda tipi (aşağıya bakınız) |
| `isPrivate` | boolean | Hayır | Özel oda |
| `maxUsers` | number | Hayır | Maks kullanıcı |

**Oda Tipleri:**
- `voice_basic` — Temel sesli oda (maks 30)
- `voice_standard` — Standart sesli oda (maks 50)
- `voice_premium` — Premium sesli oda (maks 100)
- `voice_vip` — VIP sesli oda (maks 200)
- `voice_mega` — Mega sesli oda (maks 500)
- `fortune_room` — Fal odası (maks 50)
- `music_room` — Müzik odası (maks 100)

---

### 2.2 Oda Detayı & SSE Stream

**`GET /api/chat/rooms/[roomId]`** — Oda detayı (implicit, create route'ta döner)

---

**`GET /api/chat/rooms/[roomId]/stream`**  
**Auth:** Opsiyonel (mobil JWT veya web session)

Gerçek zamanlı SSE endpoint. 2 saniye polling aralığıyla event'leri gönderir.

**SSE Event Tipleri:**
```
data: {"type": "connected", "roomId": "..."}
data: {"type": "message", "data": {...}}
data: {"type": "presence", "data": {...}}
data: {"type": "typing", "data": {...}}
data: {"type": "system", "data": {...}}
data: {"type": "gift", "data": {...}}
data: {"type": "pk", "data": {...}}
```

**Response:** `text/event-stream; charset=utf-8`

---

### 2.3 Mesajlar

**`GET /api/chat/rooms/[roomId]/messages`**  
Son mesajları getir.

**`POST /api/chat/rooms/[roomId]/messages`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "content": "Merhaba herkese!",
  "nickname": "Gizemli Falcı",
  "isHidden": false
}
```

**Yanıttaki Rol Sembolleri:**
- `%` — Superadmin
- `~` — Founder (oda sahibi)
- `&` — SOP
- `@` — OP (moderatör)
- `+` — Voice

---

### 2.4 Presence (Aktif Kullanıcılar)

**`GET /api/chat/rooms/[roomId]/presence`**  
Aktif kullanıcıları roller ile birlikte getir.

**`POST /api/chat/rooms/[roomId]/presence`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "action": "join"  // veya "leave"
}
```

**Yanıt:** Aktif kullanıcı listesi, roller, maks kullanıcı bilgisi

---

### 2.5 Koltuk Sistemi (15 Koltuk)

**`PATCH /api/chat/rooms/[roomId]/seats`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "seatIndex": 3,      // 0-14 arası koltuk numarası, -1 = koltuktan kalk
  "targetUserId": "..." // Opsiyonel: başka kullanıcıyı oturt (mod/admin)
}
```

| Koltuk | Özellik |
|--------|---------|
| 0 | Taht koltuğu (özel) |
| 1-14 | Normal koltuklar |
| -1 | Koltuktan kalk |

**Rol hiyerarşisi uygulanır:** Üst roldekiler alt roldeki kullanıcıları yerleştirebilir/kaldırabilir.

---

### 2.6 Sesli Sohbet (Agora)

**`GET /api/chat/rooms/[roomId]/voice`**  
Aktif sesli kullanıcıları getir.

**`POST /api/chat/rooms/[roomId]/voice`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "action": "join",     // veya "leave"
  "agoraUid": 12345
}
```

**Agora Token:**
```
POST /api/agora/token
```
**Request Body:**
```json
{
  "channelName": "room_abc123",
  "role": "host",    // "host" veya "audience"
  "uid": 0           // 0 = otomatik atama
}
```
**Yanıt:**
```json
{
  "token": "006...",
  "uid": 12345,
  "appId": "..."
}
```
**Token süresi:** 24 saat

---

### 2.7 Yazıyor... (Typing)

**`GET /api/chat/rooms/[roomId]/typing`** — Yazanları getir  
**`POST /api/chat/rooms/[roomId]/typing`** — Yazıyor durumu gönder

**Typing penceresi:** 3 saniye

---

### 2.8 Hediye Gönderme (Oda İçi)

**`POST /api/chat/rooms/[roomId]/gifts`**  
**Auth:** Zorunlu

Oda içi hediye gönderme. Gelir dağılım modeli (`calculateGiftDistribution`) ve oda gelir kaydı (`logRoomRevenue`) uygulanır.

---

### 2.9 Moderasyon

**`POST /api/chat/rooms/[roomId]/moderation`**  
**Auth:** Zorunlu (mod veya üst rol gerekli)

**Request Body:**
```json
{
  "action": "mute",     // mute | kick | ban | set_role
  "targetUserId": "...",
  "role": "op",         // set_role için
  "reason": "Uygunsuz davranış",
  "duration": 300       // saniye (mute için)
}
```

**Rol hiyerarşisi koruması:** Üst roldekilere moderasyon uygulanamaz. "Reverse action" koruması aktif.

---

### 2.10 PK Battle (Oda)

**`GET /api/chat/rooms/[roomId]/pk`** — Aktif/son PK bilgisi  
**`POST /api/chat/rooms/[roomId]/pk`** — PK oluştur/kabul et/reddet/bitir

**Request Body (POST):**
```json
{
  "action": "create",   // create | accept | reject | cancel | end
  "opponentRoomId": "...",
  "duration": 300       // saniye
}
```

**PK Model:** `PKBattle` — `stream1Id`, `stream2Id`, `score1`, `score2`, `status` (pending/active/completed)

---

### 2.11 Müzik & DJ Sistemi

**`GET /api/chat/rooms/[roomId]/dj`** — DJ listesi  
**`POST /api/chat/rooms/[roomId]/dj`** — DJ ekle/kaldır/aktifleştir (maks 5 DJ)

**`POST /api/chat/rooms/[roomId]/song-request`** — Şarkı isteği (ücretli: 10 jeton / ücretsiz)  
**`GET /api/chat/rooms/[roomId]/music-queue`** — Şarkı kuyruğu (Flutter alias)

**`POST /api/chat/rooms/[roomId]/music`** — Müzik oynat/durdur/senkronize et  
**Auth:** DJ yetkisi gerekli

**Request Body:**
```json
{
  "action": "play",    // play | stop | sync
  "songUrl": "...",
  "songTitle": "...",
  "position": 0
}
```

---

### 2.12 Sahiplik Devri

**`POST /api/chat/rooms/[roomId]/transfer-ownership`**  
**Auth:** Oda sahibi veya global admin

**Request Body:**
```json
{
  "newOwnerId": "user_id_here"
}
```

---

## 3. Canlı Yayın (Video Streams)

### 3.1 Yayın Oluşturma & Listeleme

**`GET /api/video-streams`** — Aktif yayınları listele  
**`POST /api/video-streams`** — Yeni yayın oluştur  
**Auth (POST):** Zorunlu

**Request Body (POST):**
```json
{
  "title": "Canlı Kahve Falı",
  "description": "Herkese fal bakıyorum",
  "streamType": "fortune",
  "thumbnail": "uploads/thumb.jpg"
}
```

**Yan etki:** Takipçilere push bildirim + in-app notification gönderilir.

---

### 3.2 Yayın Detayı

**`GET /api/video-streams/[streamId]`**

**Yanıt:**
```json
{
  "id": "...",
  "title": "Canlı Fal",
  "status": "live",
  "isLive": true,
  "viewerCount": 42,
  "user": { "id": "...", "name": "...", "image": "..." },
  "_count": { "comments": 120, "likes": 340 },
  "streamId": "..."
}
```

---

### 3.3 Yayın Yaşam Döngüsü

**`POST /api/video-streams/[streamId]/join`** — İzleyici olarak katıl  
**`POST /api/video-streams/[streamId]/leave`** — Ayrıl  
**`POST /api/video-streams/[streamId]/end`** — Yayını bitir (sadece yayıncı/admin)  
**`POST /api/video-streams/[streamId]/live-started`** — Mobil: yayın başladı bildirimi  

**Join Body:**
```json
{}
```
*Misafir katılımı desteklenir (auth opsiyonel).*

**Leave Body:**
```json
{
  "viewerId": "guest_123456"  // Auth yoksa gerekli
}
```

---

### 3.4 Yayın SSE Stream

**`GET /api/video-streams/[streamId]/stream`**

Gerçek zamanlı yayın event'leri. In-memory event bus (`lib/stream-events.ts`).

**Event Tipleri:**
```
data: {"type": "connected", "streamId": "..."}
data: {"type": "streamMessage", "data": {...}}
data: {"type": "viewerCount", "streamId": "...", "count": 42}
data: {"type": "streamEnded", "streamId": "..."}
data: {"type": "gift", "data": {...}}
```

---

### 3.5 Yorumlar / Mesajlar

**`GET /api/video-streams/[streamId]/comments`** — Son 50 yorum  
**`POST /api/video-streams/[streamId]/comments`** — Yorum gönder

**`GET /api/video-streams/[streamId]/messages?since=<ISO>&limit=50`** — Flutter uyumlu mesaj endpoint  
**`POST /api/video-streams/[streamId]/messages`** — Mesaj gönder

**POST Body:**
```json
{
  "content": "Harika yayın!",
  "nickname": "Gizli Falcı",
  "isHidden": false
}
```

---

### 3.6 Beğeni

**`GET /api/video-streams/[streamId]/like`** — Beğeni sayısı  
**`POST /api/video-streams/[streamId]/like`** — Beğen (TikTok tarzı, toggle yok)

**POST Body:**
```json
{
  "count": 5   // Batch beğeni, max 100
}
```

---

### 3.7 Yayın İçi Hediye

**`GET /api/video-streams/gifts`** — Hediye türleri listesi (cached, 10dk TTL)  
**`POST /api/video-streams/[streamId]/gifts`** — Hediye gönder

**POST Body:**
```json
{
  "giftTypeId": "...",
  "quantity": 1
}
```

**Hediye akışı:**
1. Gönderen bakiye kontrolü & düşüm
2. Platform komisyonu (`getPlatformSetting`)
3. Ajans komisyonu (`processAgencyCommission`)
4. Alıcıya jeton ekleme
5. PK battle aktifse → skor güncelleme
6. Hediye duyuru sistemi (ayarlanabilir eşik)
7. SSE event emit

---

### 3.8 İzleyiciler & Moderasyon

**`GET /api/video-streams/[streamId]/viewers`** — Aktif izleyiciler + hediye sıralaması  
**`GET /api/video-streams/[streamId]/moderators`** — Moderatör listesi  
**`POST /api/video-streams/[streamId]/moderators`** — Moderatör ekle/kaldır  
**`POST /api/video-streams/[streamId]/mute`** — İzleyici sustur  
**`GET/POST /api/video-streams/[streamId]/ban`** — Ban listesi / ban uygula

---

### 3.9 PK Battle

**`GET /api/video-streams/pk?streamId=...`** — Aktif PK  
**`POST /api/video-streams/pk`** — PK oluştur/kabul et  
**`GET /api/video-streams/pk/list`** — Aktif PK'lar listesi  
**`POST /api/video-streams/pk/score`** — PK skor güncelle

**Score Body:**
```json
{
  "battleId": "...",
  "streamId": "...",
  "points": 100
}
```

---

### 3.10 Co-broadcast (Konuk Yayıncı)

**`GET /api/video-streams/[streamId]/co-broadcast`** — Konuk listesi  
**`POST /api/video-streams/[streamId]/co-broadcast`** — Davet/kabul/reddet  
**`POST /api/video-streams/[streamId]/co-broadcast/invite`** — Flutter alias

**Maks konuk:** 8 (normal), 4 (invite route)

---

### 3.11 Fal İsteği (Yayın İçi)

**`GET /api/video-streams/[streamId]/fortune-requests`** — İstek listesi (jeton sıralı)  
**`POST /api/video-streams/[streamId]/fortune-requests`** — Fal isteği gönder  
**`GET /api/video-streams/[streamId]/fortune-requests/my-status`** — Kendi istek durumum

**POST Body:**
```json
{
  "typeId": "fortune_type_id",
  "question": "Aşk hayatım?",
  "jetonAmount": 50,
  "nickname": "Anonim",
  "isHidden": true
}
```

---

### 3.12 WebRTC Sinyal

**`GET /api/video-streams/[streamId]/signal?recipientId=...`** — Sinyalleri al  
**`GET /api/video-streams/signal?streamId=...&recipientId=...`** — Genel sinyal endpoint  
**`POST /api/video-streams/signal`** — Sinyal gönder

**POST Body:**
```json
{
  "streamId": "...",
  "receiverId": "...",
  "signalType": "offer",   // offer | answer | candidate
  "signalData": { "sdp": "..." }
}
```

**Sinyal ömrü:** 60 saniye, sonra otomatik temizlenir.

---

### 3.13 Otomatik Kapanma

**`GET /api/video-streams/[streamId]/auto-close`** — Otomatik kapanma kontrolü

Yayıncı tarafından polling ile çağrılır. Hediyesiz geçen süre eşiğini (`stream_no_gift_timeout`, varsayılan 15dk) kontrol eder.

**Yanıt:**
```json
{
  "shouldClose": true,
  "reason": "no_gift_timeout",
  "timeoutMinutes": 15,
  "message": "15 dakikadır hediye gelmediği için yayın otomatik kapatılacak."
}
```

---

## 4. Jeton & Ödeme Sistemi

### 4.1 Jeton Bakiye & Günlük Görevler

**`GET /api/jeton`**  
**Auth:** Zorunlu

**Yanıt:**
```json
{
  "jetonBalance": 150,
  "streak": {
    "currentStreak": 5,
    "longestStreak": 12,
    "totalFortunes": 47
  },
  "todayTasks": ["login"],
  "recentHistory": [...],
  "loginBonusAvailable": true
}
```

**`POST /api/jeton`** — Günlük bonus talep et  
**Auth:** Zorunlu

---

### 4.2 Kredi Paketleri

**`GET /api/credit-packages`**  
**Auth:** Yok (public)

Mevcut jeton/CFC paketlerini listeler (cached).

---

### 4.3 Ödeme Yöntemleri

**`GET /api/payment-methods`**  
**Auth:** Yok (public, cached)

---

### 4.4 Ödeme Konfigürasyonu

**`GET /api/payment/config`**  
**Auth:** Zorunlu

**Yanıt:**
```json
{
  "whatsappNumber": "+905...",
  "paparaAddress": "...",
  "bankName": "...",
  "bankIban": "TR...",
  "bankAccountHolder": "...",
  "cfcRate": 1.5,
  "minCfcAmount": 10
}
```

---

### 4.5 CFC Ödeme Talebi

**`POST /api/payment/requests`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "amount": 100,
  "method": "papara",     // whatsapp | papara | bank_transfer
  "senderInfo": "Papara: 1234567",
  "notes": "Acil yükleme"
}
```

**Kural:** Kullanıcının aynı anda sadece 1 bekleyen talebi olabilir.

---

### 4.6 Ödeme Bildirimi

**`POST /api/payments/notify`**  
**Auth:** Zorunlu

Kullanıcı ödeme yaptığını bildirir.

**Request Body:**
```json
{
  "paymentMethod": "papara",
  "amount": 100,
  "transactionId": "TX123456",
  "senderName": "Mehmet Y.",
  "notes": "Jeton yükleme"
}
```

---

### 4.7 Kullanıcı Kredileri

**`GET /api/user/credits`**  
**Auth:** Zorunlu

**Yanıt:**
```json
{
  "credits": 50,
  "jetonBalance": 150,
  "cfcBalance": 0,
  "withdrawalLimit": 1000,
  "membership": "vip",
  "membershipExpiresAt": "2026-12-31T..."
}
```

---

### 4.8 Çekim Talepleri

**`GET /api/withdrawals`** — Kullanıcının çekim geçmişi  
**`POST /api/withdrawals`** — Yeni çekim talebi

---

### 4.9 Günlük Giriş Bonusu

**`GET /api/daily-login`** — Streak durumu  
**`POST /api/daily-login`** — Günlük ödülü al

**Streak Ödülleri:**

| Gün | XP | Jeton |
|-----|----|-------|
| 1 | 10 | 0 |
| 2 | 15 | 0 |
| 3 | 20 | 1 |
| 4 | 25 | 0 |
| 5 | 30 | 2 |
| 6 | 40 | 0 |
| 7 | 50 | 5 |

---

### 4.10 Günlük Görevler

**`GET /api/daily-missions`** — Görev listesi ve tamamlananlar  
**`POST /api/daily-missions`** — Görev tamamla

**Görevler:**

| Görev | Ödül | Açıklama |
|-------|------|----------|
| `login` | 5 XP | Günlük giriş |
| `open_fortune` | 10 XP | Fal baktır |
| `watch_stream` | 5 XP | Canlı yayın izle |
| `send_gift` | 10 XP | Hediye gönder |
| `profile_complete` | 15 XP | Profil tamamla |
| `share` | 5 XP | Paylaş |

---

### 4.11 Reklam Ödülleri

**`GET /api/ads/active`** — Aktif reklam ağları  
**`POST /api/ads/reward`** — Reklam izleme ödülü al  
**`POST /api/user/watch-ad`** — Reklam izleme kaydı  
**`POST /api/anonymous/watch-ad`** — Anonim reklam izleme

---

## 5. Canlı Falcılar

### 5.1 Falcı Listesi

**`GET /api/fortune-tellers`**  
**Auth:** Opsiyonel

**Query Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `specialty` | string | Uzmanlık filtresi |
| `onlineOnly` | boolean | Sadece çevrimiçi |
| `sort` | string | `rating` / `new` / `top_rated` / `price_low` / `price_high` |

**Yanıt:** Falcı listesi (isOnline, rating, totalSessions, pricePerSession, specialties, activeStream, queueLength...)

---

### 5.2 Falcı Profili

**`GET /api/fortune-tellers/[tellerId]`**  
Detaylı profil + son 10 yorum.

---

### 5.3 Falcı Başvurusu

**`POST /api/fortune-tellers/apply`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "displayName": "Mistik Ayşe",
  "bio": "10 yıllık deneyimli falcı",
  "specialties": ["coffee", "tarot", "dream"],
  "applicationNote": "Sertifikalı tarot okuyucusuyum"
}
```

---

### 5.4 Çevrimiçi Durumu

**`POST /api/fortune-tellers/toggle-online`**  
**Auth:** Zorunlu (onaylı falcı)

**Request Body:**
```json
{
  "isOnline": true
}
```

---

### 5.5 Seans Oluşturma

**`POST /api/fortune-tellers/[tellerId]/session`**  
**`POST /api/fortune-tellers/session`** (Flutter alias — body'de `tellerId`)

**Request Body:**
```json
{
  "tellerId": "...",         // Flutter alias için
  "fortuneType": "coffee",
  "duration": 10              // dakika (varsayılan: 10)
}
```

**Maliyet hesabı:** `duration × creditsPerMinute` (platform ayarı, varsayılan 10 jeton/dk)

---

### 5.6 Seans Yönetimi

**`PATCH /api/fortune-tellers/sessions/[sessionId]`**  
**Auth:** Falcı

**Request Body:**
```json
{
  "action": "accept"  // accept | complete | cancel | reject
}
```

---

### 5.7 Falcı SSE Stream

**`GET /api/fortune-tellers/sessions/stream`**

Falcılar için gelen seans isteklerini gerçek zamanlı iletir.

**Event Tipleri:**
```
data: {"type": "connected", "tellerId": "..."}
data: {"type": "session_request", "data": {...}}
data: {"type": "session_cancelled", "data": {...}}
```

---

### 5.8 Falcı Seansları Listesi

**`GET /api/fortune-tellers/sessions?status=pending`**  
**Auth:** Falcı

---

### 5.9 Kendi Profilim

**`GET /api/fortune-tellers/my-profile`**  
**Auth:** Zorunlu (falcı)

Detaylı profil + izinler (canGoOnline, canChat, canStartSession, canSetPrice, canEditProfile, canViewEarnings, canWithdraw, maxSessionsPerDay, commissionRate)

---

### 5.10 Yorumlar

**`GET /api/fortune-tellers/[tellerId]/reviews`**

Yorumlar + ortalama puan + puan dağılımı.

---

### 5.11 Ödüller & Hediyeler

**`GET /api/fortune-tellers/awards?tellerId=...`** — Aktif ödüller  
**`GET /api/fortune-tellers/gifts?tellerId=...`** — Son 7 gün hediyeler (gönderici bazlı)

---

## 6. Canlı Fal Seans Odası

Falcı ile kullanıcı arasındaki birebir seans odası.

### 6.1 Oda Bilgisi

**`GET /api/room/[sessionId]`**  
**Auth:** Zorunlu (sadece seans katılımcıları)

Seans detayları, falcı bilgisi, kullanıcı bilgisi, zamanlayıcı durumu.

---

### 6.2 Mesajlar

**`GET /api/room/[sessionId]/messages?after=<ISO>`**  
**`POST /api/room/[sessionId]/messages`**  
**Auth:** Zorunlu (seans katılımcıları)

**POST Body:**
```json
{
  "content": "Kahve fincanımda ne görüyorsunuz?",
  "type": "text"  // text | image | system
}
```

---

### 6.3 SSE Stream (Seans)

**`GET /api/room/[sessionId]/stream`**

**Event Tipleri:**
```
data: {"type": "message", "data": {...}}
data: {"type": "timer_started", "data": {...}}
data: {"type": "time_extended", "data": {...}}
data: {"type": "session_ended", "data": {...}}
data: {"type": "system", "data": {...}}
```

---

### 6.4 Bahşiş

**`POST /api/room/[sessionId]/tip`**  
**Auth:** Zorunlu (sadece kullanıcı/fal baktıran)

**Request Body:**
```json
{
  "amount": 100
}
```

**Geçerli miktarlar:** 50, 100, 150, 200, 250, 300, 350, 400, 450, 500

---

### 6.5 WebRTC Sinyal

**`POST /api/room/signal`**

**Request Body:**
```json
{
  "sessionId": "...",
  "receiverId": "...",
  "signalType": "offer",
  "signalData": { "sdp": "..." }
}
```

---

## 7. Kimlik Doğrulama (Auth)

### 7.1 Web Auth (NextAuth)

**`POST /api/auth/[...nextauth]`** — NextAuth handler (Google, Credentials)  
**`POST /api/signup`** — Kayıt

**Signup Body:**
```json
{
  "name": "Mehmet",
  "email": "mehmet@example.com",
  "password": "123456",
  "username": "mehmet_fal",
  "birthDate": "1990-05-15",
  "referralCode": "AB1234CD"
}
```

---

### 7.2 Mobil Auth (JWT)

**`POST /api/auth/mobile-login`**

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Yanıt:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "name": "Mehmet",
    "email": "...",
    "role": "user",
    "image": "...",
    "credits": 50,
    "jetonBalance": 150,
    "membership": "vip"
  }
}
```

---

**`POST /api/auth/mobile-register`**

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "Mehmet",
  "username": "mehmet_fal",
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "referralCode": "AB1234CD",
  "preferredLanguage": "tr"
}
```

---

**`POST /api/auth/mobile-google`**

**Request Body:**
```json
{
  "idToken": "google_id_token_from_flutter",
  "referralCode": "AB1234CD"
}
```

---

**`POST /api/auth/mobile-tiktok`**

**Request Body:**
```json
{
  "code": "tiktok_auth_code",
  "redirectUri": "canlifal://auth",
  "referralCode": "AB1234CD"
}
```

---

**`POST /api/auth/mobile-refresh`** — Token yenileme

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

---

### 7.3 Şifre İşlemleri

**`POST /api/auth/forgot-password`** — Şifre sıfırlama e-postası
```json
{ "email": "user@example.com" }
```

**`POST /api/auth/reset-password`** — Yeni şifre belirleme
```json
{ "token": "reset_token", "password": "yeni_sifre" }
```

**`POST /api/auth/change-password`** — Şifre değiştirme (giriş yapmış)  
**Auth:** Zorunlu
```json
{ "currentPassword": "eski", "newPassword": "yeni" }
```

---

### 7.4 Cihaz Yönetimi

**`GET /api/auth/verify-device`** — Aktif cihaz kontrolü  
**`POST /api/auth/reclaim-device`** — Cihaz sahipliğini al (diğer cihazı çıkar)

---

## 8. Kullanıcı & Profil

### 8.1 Profil

**`GET /api/me`** — Tam profil (web + mobil, tüm alanlar)  
**`GET /api/user/profile`** — Profil bilgileri  
**`PATCH /api/user/profile`** — Profil güncelle

---

### 8.2 Diğer Kullanıcı

**`GET /api/users/[userId]`** — Kullanıcı profili  
**`GET /api/users/lookup/[username]`** — Username ile arama  
**`GET /api/users/online`** — Çevrimiçi kullanıcılar  
**`GET /api/users/search?q=...`** — Kullanıcı arama

---

### 8.3 Takip Sistemi

**`POST /api/users/[userId]/follow`** — Takip et/bırak (toggle)  
**`POST /api/user/[userId]/follow`** — Alternatif  
**`GET /api/user/[userId]/follow-status`** — Takip durumu  
**`GET /api/user/followers`** — Takipçilerim  
**`GET /api/user/following`** — Takip ettiklerim

---

### 8.4 XP & Seviye

**`GET /api/user/xp`**  
**Auth:** Zorunlu

**Seviye Unvanları:**

| Seviye | Unvan |
|--------|-------|
| 1 | Yeni Üye |
| 2 | Çırak |
| 3 | Keşifci |
| 4 | Yorumcu |
| 5 | Bilge |
| 6 | Usta Yorumcu |
| 7 | Gizemci |
| 8 | Kahin |
| 9 | Büyük Kahin |
| 10 | Efsanevi |

---

### 8.5 İstatistikler & Başarımlar

**`GET /api/user/statistics`** — Genel istatistikler  
**`GET /api/user/stats`** — Kısa istatistikler  
**`GET /api/user/achievements`** — Başarımlar  
**`GET /api/user/[userId]/achievements`** — Başka kullanıcının başarımları  
**`GET /api/user/activity`** — Aktivite geçmişi

---

### 8.6 Diğer Kullanıcı İşlemleri

**`GET /api/user/blocked`** — Engellenen kullanıcılar  
**`GET /api/user/likers`** — Beğenenler  
**`GET /api/user/received-gifts`** — Alınan hediyeler  
**`GET /api/user/broadcast-history`** — Yayın geçmişi  
**`GET /api/user/co-broadcast-invites`** — Konuk yayın davetleri  
**`GET /api/user/active-sessions`** — Aktif oturumlar  
**`POST /api/user/theme`** — Tema tercihi  

---

### 8.7 Profil Çerçeveleri

**`GET /api/profile-frames`** — Mevcut çerçeveler  

---

### 8.8 Presence (Çevrimiçi Durumu)

**`POST /api/presence`** — Presence kaydı (IP, tarayıcı, geo bilgisi)  
**`GET /api/presence/sections`** — Presence bölümleri

---

## 9. Sosyal Özellikler

### 9.1 Sosyal Gönderi Akışı

**`GET /api/social/posts?page=1&limit=20&type=fortune`** — Gönderi akışı  
**`POST /api/social/posts`** — Gönderi paylaş  

**`GET /api/social/posts/[postId]`** — Tekil gönderi  
**`DELETE /api/social/posts/[postId]`** — Sil

**`GET /api/social/posts/[postId]/comments`** — Yorumlar  
**`POST /api/social/posts/[postId]/comments`** — Yorum yap  
**`POST /api/social/posts/[postId]/likes`** — Beğen  
**`POST /api/social/posts/[postId]/view`** — Görüntüleme kaydı

---

### 9.2 Hikayeler (Stories)

**`GET /api/stories`** — Aktif hikayeler (takip edilenler önce)  
**`POST /api/stories`** — Hikaye paylaş  

---

### 9.3 Kısa Videolar

**`GET /api/short-videos?limit=10&cursor=...`** — Video akışı  
**`POST /api/short-videos/upload`** — Video yükle (max 15 sn)  
**`GET /api/short-videos/[id]`** — Video detayı  
**`POST /api/short-videos/[id]/like`** — Beğen  
**`GET /api/short-videos/[id]/comments`** — Yorumlar  
**`POST /api/short-videos/[id]/view`** — Görüntüleme  
**`GET /api/short-videos/user/[userId]`** — Kullanıcı videoları

---

### 9.4 Paylaşım Kartı

**`POST /api/share-card`** — Paylaşım kartı oluştur

---

### 9.5 Liderlik Tablosu

**`GET /api/leaderboard`** — Genel liderlik (referans, XP, hediye)  
**`GET /api/leaderboards`** — Detaylı liderlik tabloları  

---

### 9.6 Turnuva

**`GET /api/tournaments`** — Haftalık turnuva & sıralama  

---

## 10. Hediye Sistemi

### 10.1 Hediye Türleri

**`GET /api/gifts/types`** — Tüm hediye türleri (cached)

---

### 10.2 Hediye Gönderme (Profil/DM)

**`POST /api/gifts/send`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "recipientId": "user_id",
  "giftTypeId": "gift_type_id",
  "quantity": 1,
  "message": "Sana hediye!"
}
```

**Hediye akışı:** Bakiye kontrolü → Platform komisyonu → Ajans komisyonu → Alıcı bakiye ekleme → Bildirim → Duyuru

---

### 10.3 Yardımcı

**`GET /api/gifts/recent-big`** — Son büyük hediyeler  
**`GET /api/gifts/check-reciprocal`** — Karşılıklı hediye kontrolü

---

## 11. Üyelik & VIP

### 11.1 Üyelik Paketleri

**`GET /api/memberships`** — Paket listesi (web)  
**`GET /api/membership/packages`** — Flutter uyumlu format  
**`GET /api/membership-badges`** — Üyelik rozetleri

---

### 11.2 Üyelik Satın Alma

**`POST /api/memberships/purchase`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "planId": "plan_id",
  "paymentMethod": "jeton"  // "jeton" veya "cfc"
}
```

---

## 12. Oyunlar

### 12.1 Oyun Listesi

**`GET /api/games`** — Aktif mini oyunlar  
**`POST /api/games/play`** — Oyun oyna  
**`GET /api/games/leaderboard`** — Oyun liderliği  
**`GET /api/games/profile`** — Oyun profili  
**`GET /api/games/quests`** — Oyun görevleri  
**`GET /api/games/lobby`** — Oyun lobisi  

---

### 12.2 Günlük Ödüller

**`POST /api/games/daily-reward`** — Günlük ödül al  
**`POST /api/games/daily-spin`** — Çark çevir  

---

### 12.3 Lamba Cini

**`POST /api/games/lamba-cini`** — Lamba cini oyunu

---

### 12.4 SOS Oyunu

**`GET /api/games/sos`** — Aktif oyunlar  
**`POST /api/games/sos`** — Yeni oyun oluştur  
**`GET /api/games/sos/[gameId]`** — Oyun detayı  
**`GET /api/games/sos/[gameId]/viewers`** — İzleyiciler

---

## 13. Rüya Ansiklopedisi & Günlük

### 13.1 Rüya Ansiklopedisi

**`GET /api/dreams?search=...&category=...&page=1&sort=popular`** — Rüya arama  
**`GET /api/dreams/[slug]`** — Rüya detayı  
**`POST /api/dreams/[slug]/comments`** — Yorum  
**`POST /api/dreams/[slug]/favorite`** — Favori  
**`POST /api/dreams/[slug]/view`** — Görüntüleme  
**`GET /api/dreams/favorites`** — Favori rüyalar  
**`GET /api/dreams/trends`** — Trend rüyalar  
**`GET /api/dreams/recommendations`** — Önerilen rüyalar  
**`POST /api/dreams/interpret`** — AI ile rüya yorumlama  
**`POST /api/dreams/generate`** — AI ile rüya içeriği oluşturma  

---

### 13.2 Rüya Sembol Sözlüğü

**`GET /api/dream-symbols`** — Sembol listesi  
**`GET /api/dream-symbols/[slug]`** — Sembol detayı  

---

### 13.3 Rüya Günlüğü

**`GET /api/dream-diary`** — Kişisel rüya günlüğü  
**`POST /api/dream-diary`** — Rüya kaydet (AI analiz ile)  
**`GET /api/dream-stats`** — Rüya istatistikleri  
**`GET /api/weekly-dream-report`** — Haftalık rüya raporu  
**`POST /api/dreams/morning-reminder`** — Sabah hatırlatma  

---

### 13.4 Rüya Yarışması

**`GET /api/dream-contest`** — Aktif yarışmalar  
**`GET /api/dream-contest/[contestId]/entries`** — Katılımlar  
**`POST /api/dream-contest/[contestId]/vote`** — Oylama  

---

## 14. Blog & İçerik

### 14.1 Blog

**`GET /api/blog?slug=...&category=...&page=1&search=...&featured=true`** — Blog yazıları  
**`GET /api/blog/categories`** — Kategoriler  
**`POST /api/blog/comments`** — Yorum  
**`POST /api/blog/like`** — Beğen  
**`POST /api/blog/favorite`** — Favori  
**`GET /api/blog/related?slug=...`** — İlgili yazılar  
**`GET /api/blog/zodiac?sign=...`** — Burca göre yazılar  
**`GET /api/blog/interactions?postId=...`** — Etkileşimler  

---

### 14.2 TikTok Videoları

**`GET /api/tiktok-videos?categoryId=...`** — TikTok video listesi  
**`GET /api/tiktok-videos/[id]`** — Video detayı  
**`GET /api/tiktok-videos/oembed?url=...`** — oEmbed verisi  

---

### 14.3 Trend Videolar

**`GET /api/trend-videos?category=...&sort=order|views`** — YouTube trend videoları  

---

### 14.4 Ünlü Falları

**`GET /api/celebrities`** — Ünlü listesi  
**`GET /api/celebrities/[slug]`** — Ünlü profili  
**`GET /api/celebrities/[slug]/posts`** — Ünlü gönderileri  
**`POST /api/celebrities/[slug]/posts/like`** — Beğen  
**`POST /api/celebrities/[slug]/posts/comments`** — Yorum  
**`POST /api/celebrities/[slug]/follow`** — Takip et  
**`GET /api/celebrities/posts/latest`** — Son ünlü gönderileri  

---

### 14.5 Fan Kulübü

**`GET /api/celebrities/[slug]/fan-club`** — Fan kulübü bilgisi  
**`POST /api/celebrities/[slug]/fan-club/join`** — Katıl  
**`GET /api/celebrities/[slug]/fan-club/members`** — Üyeler  
**`GET /api/celebrities/[slug]/fan-club/posts`** — Gönderiler  
**`POST /api/celebrities/[slug]/fan-club/posts/like`** — Beğen  
**`GET /api/celebrities/[slug]/fan-club/polls`** — Anketler  
**`GET /api/celebrities/[slug]/fan-club/level`** — Seviye bilgisi  
**`GET /api/fan-clubs/popular`** — Popüler fan kulüpleri  

---

### 14.6 Trend Konuları

**`GET /api/trends`** — Trend konuları  
**`GET /api/trends/[slug]`** — Trend detayı  
**`POST /api/trends/[slug]/like`** — Beğen  

---

## 15. Ajans Sistemi

**`POST /api/agency/apply`** — Ajans başvurusu  
**`GET /api/agency/my`** — Kendi ajansım  
**`GET /api/agency/members`** — Ajans üyeleri  
**`POST /api/agency/invite`** — Üye davet et  
**`POST /api/agency/join`** — Ajansa katıl  
**`POST /api/agency/leave`** — Ajanstan ayrıl  
**`GET /api/agency/earnings`** — Ajans kazançları  
**`GET /api/agency/leaderboard`** — Ajans liderliği  
**`GET /api/agency/tasks`** — Ajans görevleri  
**`GET /api/agency/withdrawals`** — Ajans çekim talepleri  

---

## 16. Dosya Yükleme

### 16.1 Presigned URL

**`POST /api/upload/presigned`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "fileName": "fincan.jpg",
  "contentType": "image/jpeg",
  "isPublic": false
}
```

**Yanıt:**
```json
{
  "uploadUrl": "https://images.pexels.com/photos/16695820/pexels-photo-16695820/free-photo-of-close-up-of-a-cup-of-coffee.jpeg",
  "cloud_storage_path": "uploads/user123/fincan.jpg",
  "publicUrl": "https://pbs.twimg.com/media/EU_U8NzWAAAEgnJ.jpg"  // isPublic=true ise
}
```

---

### 16.2 Dosya URL'si Alma

**`POST /api/upload/get-url`**  
**Auth:** Zorunlu

**Request Body:**
```json
{
  "cloud_storage_path": "uploads/user123/fincan.jpg",
  "isPublic": false
}
```

---

## 17. Bildirimler & Mesajlar

### 17.1 Bildirimler

**`GET /api/notifications?unreadOnly=true`** — Bildirim listesi  
**`PATCH /api/notifications`** — Okundu işaretle  
**Auth:** Zorunlu

---

### 17.2 Duyurular

**`GET /api/announcements`** — Site duyuruları  
**`GET /api/announcements/event`** — Event duyuruları (kayan banner)

---

### 17.3 Direkt Mesajlar

**`GET /api/messages`** — Konuşma listesi  
**`GET /api/messages?unreadCount=true`** — Okunmamış sayısı  
**`GET /api/messages/[userId]`** — Konuşma detayı  
**`POST /api/messages/[userId]`** — Mesaj gönder  
**`POST /api/messages/request`** — Mesaj isteği (tanımadığınız kişiye)  

---

### 17.4 Push Bildirim (FCM)

**`POST /api/devices/fcm`** — FCM token kaydet

---

## 18. Arama & Keşfet

**`GET /api/search?q=...`** — Genel arama (fallar, sayfalar, kullanıcılar)  
**`GET /api/search/advanced?q=...&type=...`** — Gelişmiş arama  

---

## 19. Diğer Endpointler

### 19.1 Referans Sistemi

**`GET /api/referral`** — Referans bilgisi & kazançlar  
**`GET /api/referral/validate?code=...`** — Referans kodu doğrulama  

---

### 19.2 Anonim Kullanım

**`GET /api/anonymous`** — Anonim kullanıcı oluştur/getir  

---

### 19.3 Favori Falcılar

**`GET /api/favorite-tellers`** — Favori falcı listesi  
**`POST /api/favorite-tellers`** — Favori ekle/kaldır  

---

### 19.4 Futbol Puan Tablosu

**`GET /api/football?competition=PL&type=standings|matches`** — Futbol verileri (football-data.org API)  

**Desteklenen Ligler:** PL, PD, SA, BL1, FL1, CL, EC, WC, BSA, PPL, DED

---

### 19.5 Bana Özel

**`GET /api/bana-ozel`** — Kişiselleştirilmiş içerik  
**`POST /api/bana-ozel/open`** — İçerik açma  

---

### 19.6 Astroloji Paneli

**`GET /api/astrology-panel`** — Astroloji panel verileri  

---

### 19.7 Uyumluluk

**`GET /api/compatibility?sign1=...&sign2=...`** — Burç uyumu  

---

### 19.8 Müzik Arama

**`GET /api/music/search?q=...`** — Müzik arama  

---

### 19.9 YouTube Arama

**`GET /api/youtube/search?q=...`** — YouTube video arama  

---

### 19.10 TMDB (Film)

**`GET /api/tmdb?type=...`** — Film/dizi verileri  

---

### 19.11 TRTC UserSig

**`POST /api/trtc/usersig`** — TRTC kullanıcı imzası  

---

### 19.12 Fal İsteği Türleri

**`GET /api/fortune-request-types`** — Canlı yayında fal isteği türleri  

---

### 19.13 Çeviri

**`GET /api/translations?lang=en`** — Çeviri verileri  

---

### 19.14 İletişim

**`POST /api/contact`** — İletişim formu  

---

### 19.15 Genel İstatistikler

**`GET /api/public-stats`** — Anlık site istatistikleri (çevrimiçi kullanıcılar, aktif yayınlar vb.)  
Cached: 15 saniye

---

### 19.16 Pop-up'lar

**`GET /api/popups`** — Aktif pop-up'lar  

---

### 19.17 Ana Sayfa Bileşenleri

**`GET /api/homepage-buttons`** — Ana sayfa butonları  
**`GET /api/homepage-fortune-cards`** — Fal kartları  
**`GET /api/homepage-ticker`** — Ticker mesajları  

---

### 19.18 Falcı Analytics & Seviye

**`GET /api/teller/analytics`** — Falcı analytics  
**`GET /api/teller/level`** — Falcı seviyesi  
**`POST /api/teller/verification`** — Falcı doğrulama  

---

### 19.19 Yayın Görselleri

**`GET /api/broadcast-images`** — Yayın arka plan görselleri  

---

### 19.20 Online Fal

**`GET /api/online-fal`** — Online fal sayfası verileri  

---

### 19.21 Jeton Fiyatı (Public)

**`GET /api/public/jeton-price`** — Güncel jeton fiyatı  

---

### 19.22 Platform Komisyon Oranı

**`GET /api/platform/commission-rate`** — Platform komisyon oranı  

---

### 19.23 Ayarlar

**`GET /api/settings/public`** — Genel ayarlar  
**`GET /api/settings/themes`** — Tema ayarları  
**`GET /api/settings/ads`** — Reklam ayarları  
**`GET /api/settings/canlidark-hero`** — Hero ayarı  

---

### 19.24 SEO

**`GET /api/seo-settings`** — SEO ayarları  

---

### 19.25 Site Sayfaları

**`GET /api/site-pages/[slug]`** — Dinamik sayfa içeriği  

---

### 19.26 Kullanıcı Gönderileri

**`GET /api/users/[userId]/posts`** — Kullanıcı gönderileri  

---

### 19.27 Flutter Prompt

**`GET /api/flutter-prompt`** — Flutter uygulama prompt'u  

---

### 19.28 Download Endpoints

**`GET /api/download-docs`** — Döküman indirme  
**`GET /api/download-export`** — Export indirme  
**`GET /api/download-prompt`** — Prompt indirme  

---

### 19.29 Ödeme Ayarları

**`GET /api/payment-settings`** — Ödeme ayarları  

---

### 19.30 Aktiviteler

**`GET /api/activities`** — Aktivite akışı  

---

## 20. Admin Paneli Endpointleri

Tüm admin endpointleri `admin` veya `yonetici` rolü gerektirir.

### 20.1 Kullanıcı Yönetimi

**`GET /api/admin/users?search=...&role=...&page=1`** — Kullanıcı listesi  
**`GET /api/admin/users/search?q=...`** — Kullanıcı arama  
**`GET /api/admin/users/[userId]`** — Kullanıcı detayı  
**`PATCH /api/admin/users/[userId]`** — Kullanıcı güncelle (rol, ban, jeton vb.)  
**`POST /api/admin/users/withdrawal-limit`** — Çekim limiti ayarla  

---

### 20.2 Sohbet Odaları

**`GET /api/admin/chat-rooms`** — Tüm odalar  
**`POST /api/admin/chat-rooms`** — Oda oluştur  
**`PATCH /api/admin/chat-rooms`** — Oda güncelle  
**`DELETE /api/admin/chat-rooms`** — Oda sil  

---

### 20.3 Canlı Falcılar

**`GET /api/admin/live-tellers`** — Falcı listesi  
**`GET /api/admin/live-tellers/[tellerId]`** — Detay  
**`POST /api/admin/live-tellers/[tellerId]/approve`** — Onayla  
**`POST /api/admin/live-tellers/[tellerId]/ban`** — Banla  
**`POST /api/admin/live-tellers/[tellerId]/freeze`** — Dondur  
**`POST /api/admin/live-tellers/[tellerId]/warning`** — Uyar  
**`POST /api/admin/live-tellers/[tellerId]/bonus`** — Bonus ver  
**`PATCH /api/admin/live-tellers/[tellerId]/permissions`** — İzin güncelle  

---

### 20.4 Kredi & Ödeme

**`GET /api/admin/credits`** — Kredi işlemleri  
**`POST /api/admin/credits`** — Manuel kredi ekle/çıkar  
**`GET /api/admin/credit-packages`** — Paket listesi  
**`POST /api/admin/credit-packages`** — Paket oluştur  
**`PATCH /api/admin/credit-packages/[packageId]`** — Paket güncelle  
**`GET /api/admin/payments`** — Ödeme geçmişi  
**`GET /api/admin/cfc-payment-requests`** — CFC talepleri  
**`PATCH /api/admin/cfc-payment-requests`** — Talep onayla/reddet  
**`GET /api/admin/cfc-settings`** — CFC ayarları  
**`PATCH /api/admin/cfc-settings`** — CFC ayarları güncelle  
**`GET /api/admin/withdrawals`** — Çekim talepleri  
**`PATCH /api/admin/withdrawals`** — Çekim onayla/reddet  
**`GET /api/admin/payment-methods`** — Ödeme yöntemleri yönetimi  

---

### 20.5 Blog Yönetimi

**`GET /api/admin/blog`** — Yazı listesi  
**`POST /api/admin/blog`** — Yazı oluştur  
**`GET /api/admin/blog/[postId]`** — Yazı detayı  
**`PATCH /api/admin/blog/[postId]`** — Güncelle  
**`DELETE /api/admin/blog/[postId]`** — Sil  
**`POST /api/admin/blog/generate`** — AI ile yazı oluştur  
**`POST /api/admin/blog/bulk-generate`** — Toplu AI oluşturma  
**`POST /api/admin/blog/bulk-import`** — Toplu içe aktarma  
**`POST /api/admin/blog/import`** — Tekil içe aktarma  
**`POST /api/admin/blog/bulk-publish`** — Toplu yayınla  
**`POST /api/admin/blog/bulk-delete`** — Toplu sil  
**`POST /api/admin/blog/bulk-category`** — Toplu kategori değiştir  
**`GET /api/admin/blog/categories`** — Kategoriler  
**`POST /api/admin/blog/categories`** — Kategori oluştur  
**`GET /api/admin/blog/analytics`** — Blog analytics  
**`GET /api/admin/blog/comments`** — Yorumlar  
**`POST /api/admin/blog/schedule-publish`** — Zamanlanmış yayın  

---

### 20.6 Rüya Yönetimi

**`GET /api/admin/dreams`** — Rüya listesi  
**`POST /api/admin/dreams`** — Oluştur  
**`POST /api/admin/dreams/generate`** — AI ile oluştur  
**`POST /api/admin/dreams/bulk-import`** — Toplu içe aktar  
**`POST /api/admin/dreams/bulk-publish`** — Toplu yayınla  
**`POST /api/admin/dreams/bulk-delete`** — Toplu sil  
**`POST /api/admin/dreams/bulk-category`** — Toplu kategori  

---

### 20.7 İstatistik & Finans

**`GET /api/admin/statistics`** — Genel istatistikler  
**`GET /api/admin/visitor-stats`** — Ziyaretçi istatistikleri  
**`GET /api/admin/finance`** — Finans raporu  
**`GET /api/admin/teller-performance`** — Falcı performansı  

---

### 20.8 İçerik & Duyuru

**`GET/POST /api/admin/announcements-sections`** — Duyuru bölümleri  
**`GET/POST /api/admin/popups`** — Pop-up yönetimi  
**`GET/POST /api/admin/ticker-messages`** — Ticker mesajları  
**`PATCH/DELETE /api/admin/ticker-messages/[messageId]`** — Ticker güncelle/sil  
**`GET/POST /api/admin/broadcast-images`** — Yayın görselleri  
**`GET/POST /api/admin/homepage-buttons`** — Ana sayfa butonları  
**`GET/POST /api/admin/homepage-fortune-cards`** — Fal kartları  

---

### 20.9 Moderasyon

**`GET /api/admin/moderation`** — Moderasyon kuyruğu  
**`POST /api/admin/moderation`** — Moderasyon işlemi  

---

### 20.10 Ayarlar

**`GET /api/admin/settings`** — Platform ayarları  
**`POST /api/admin/settings`** — Ayar güncelle  
**`GET /api/admin/seo-settings`** — SEO ayarları  
**`POST /api/admin/seo-settings`** — SEO güncelle  
**`GET /api/admin/site-pages`** — Dinamik sayfalar  
**`POST /api/admin/site-pages`** — Sayfa oluştur/güncelle  

---

### 20.11 Oyun Yönetimi

**`GET/POST /api/admin/games`** — Oyun CRUD  
**`GET/POST /api/admin/games/settings`** — Oyun ayarları  

---

### 20.12 Diğer Admin

**`GET/POST /api/admin/agencies`** — Ajans yönetimi  
**`GET/POST /api/admin/awards`** — Ödül yönetimi  
**`GET/POST /api/admin/badges`** — Rozet yönetimi  
**`GET/POST /api/admin/bana-ozel`** — Bana Özel yönetimi  
**`GET/POST /api/admin/bots`** — Bot yönetimi  
**`POST /api/admin/bots/simulate`** — Bot simülasyonu  
**`POST /api/admin/bots/simulate-fortune`** — Fal simülasyonu  
**`POST /api/admin/bots/simulate-master`** — Master bot simülasyonu  
**`POST /api/admin/bots/simulate-social`** — Sosyal bot simülasyonu  
**`GET/POST /api/admin/celebrities`** — Ünlü yönetimi  
**`GET/POST /api/admin/celebrity-posts`** — Ünlü gönderileri  
**`POST /api/admin/celebrity-posts/generate`** — AI ile ünlü gönderisi  
**`GET/POST /api/admin/contests`** — Yarışma yönetimi  
**`GET/PATCH /api/admin/currency-config`** — Para birimi ayarları  
**`GET/POST /api/admin/fan-clubs`** — Fan kulübü yönetimi  
**`GET/POST /api/admin/fan-club-manager`** — Fan kulübü yöneticisi  
**`GET/POST /api/admin/fortune-request-types`** — Fal isteği türleri  
**`GET /api/admin/activity-feed`** — Aktivite akışı  
**`GET/POST /api/admin/ad-networks`** — Reklam ağları  
**`POST /api/admin/backup`** — Yedekleme  
**`DELETE /api/admin/cache`** — Önbellek temizle  
**`GET/POST /api/admin/membership-badges`** — Üyelik rozetleri  
**`GET/POST /api/admin/memberships`** — Üyelik planları  
**`GET /api/admin/memberships/purchases`** — Üyelik satışları  
**`GET/POST /api/admin/notifications`** — Toplu bildirim  
**`GET/POST /api/admin/online-fal/buttons`** — Online fal butonları  
**`GET/POST /api/admin/online-fal/sections`** — Online fal bölümleri  
**`GET /api/admin/pending-counts`** — Bekleyen işlem sayıları  
**`GET/POST /api/admin/profile-frames`** — Profil çerçeveleri  
**`POST /api/admin/profile-frames/assign`** — Çerçeve ata  
**`GET/POST /api/admin/teller-levels`** — Falcı seviyeleri  
**`GET/POST /api/admin/teller-verification`** — Falcı doğrulama  
**`GET/POST /api/admin/tiktok-categories`** — TikTok kategorileri  
**`GET/POST /api/admin/tiktok-videos`** — TikTok video yönetimi  
**`GET/POST /api/admin/trend-videos`** — Trend video yönetimi  
**`POST /api/admin/trend-videos/youtube`** — YouTube'dan aktar  
**`GET/POST /api/admin/trends`** — Trend konuları  
**`GET/POST /api/admin/button-order`** — Buton sıralama  

---

## Ek Bilgiler

### Rate Limiting

- Auth endpointleri: IP bazlı rate limit (`authLimiter`)
- Hediye gönderme: Ağır yük limiti (`heavyLimiter`)

### Caching

- Hediye türleri: 10 dakika TTL
- Kredi paketleri: Cached
- Ödeme yöntemleri: Cached
- Platform ayarları: `getCachedPlatformSetting` ile cached
- Falcı listesi: `getCached` ile cached

### Dosya Depolama

- S3 uyumlu cloud storage
- Presigned URL ile yükleme
- Public ve private dosya desteği

### Push Bildirimleri

- OneSignal entegrasyonu
- FCM token kayıt desteği
- `createNotificationWithPush` ile birleşik bildirim + push

### Gelir Dağılım Modeli

- Platform komisyonu (ayarlanabilir, varsayılan %20)
- Ajans komisyonu (`processAgencyCommission`)
- Oda gelir kaydı (`logRoomRevenue`)
- Hediye gelir dağılımı (`calculateGiftDistribution`)
- Staff kullanıcılar finans işlemlerinden hariç (`isExcludedFromFinance`)

---

*Bu döküman CanlıFal.com backend API'sinin kapsamlı referansıdır. Tüm endpointler, istek/yanıt şemaları ve SSE formatları dahil edilmiştir.*

*Son güncelleme: 20 Haziran 2026*
