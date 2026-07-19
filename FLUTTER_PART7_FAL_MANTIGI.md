# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 7 — FAL MANTIĞI (AI + CANLI FALCI)

> **Kaynak:** %100 gerçek `fortunes/*`, `fortune-tellers/*`, `room/*`. **Önceki:** PART 6.

---

## 1. İKİ FAL MODU
1. **AI Fal** — Backend, Abacus.ai LLM ile anında yorum üretir. Jeton düşer, sonuç anında gelir.
2. **Canlı Falcı Falı** — Gerçek falcı ile canlı sesli/görüntülü oturum (dakika bazlı ücret). TRTC + SSE ile yönetilir.

## 2. AI FAL TÜRLERİ (fal menüsü)
- Menü: `GET /api/mobile/fortune-menu` (mobil için optimize) veya `GET /api/homepage-fortune-cards`.
- Fal türleri ve endpoint'leri (hepsi `POST`, jeton düşer):

| Fal | Endpoint | Girdi |
|-----|----------|-------|
| Kahve | `/api/fortunes/kahve-fali` | fincan fotoğrafları (cloud path) |
| Tarot | `/api/fortunes/tarot-fali` | seçilen kartlar / soru |
| El falı | `/api/fortunes/el-fali` | el fotoğrafı |
| Rüya | `/api/fortunes/ruya-yorumu` | rüya metni |
| Aşk uyumu | `/api/fortunes/ask-uyumu` | iki isim/burc |
| Numeroloji | `/api/fortunes/numeroloji` | doğum tarihi/isim |
| Melek kartları | `/api/fortunes/melek-kartlari` | soru |
| Aura | `/api/fortunes/aura-analizi` | foto/seçim |
| Doğum haritası | `/api/fortunes/dogum-haritasi` | doğum tarih/saat/yer |
| Evet/Hayır | `/api/fortunes/evet-hayir` | soru |
| Katina | `/api/fortunes/katina` | kartlar |
| Kurşun dökme | `/api/fortunes/kursundokme` | soru |
| İstihare | `/api/fortunes/istihare` | soru |
| Burç yorumu | `/api/fortunes/burc-yorumu` | burç |
| Günlük burç | `/api/horoscope/daily` | burç |

> Fotoğraf gerektiren fallarda (kahve/el): önce `POST /api/upload/presigned` ile cloud'a yükle, dönen path'i gönder. Kahve görseli üretimi: `/api/fortunes/kahve-fali-image`.

## 3. AI FAL AKIŞI
```dart
Future<String> getCoffeeReading(List<String> photoPaths) async {
  final r = await api.post('/api/fortunes/kahve-fali', {'images': photoPaths});
  if (r['success'] == false) throw ApiException(r['error']?['message']);
  return r['data']['interpretation'];
}
```
1. Jeton kontrolü (backend `getCachedPlatformSetting('credits_per_minute'...)` / fal bazlı fiyat).
2. Yetersizse → jeton satın alma. Reklam izleyerek bedava hak: `POST /api/user/watch-ad`, `POST /api/ads/reward`.
3. Sonuç `user/fortunes`'a kaydedilir (PART 3 geçmiş).

## 4. ERİŞİM KONTROLÜ
- `GET /api/fortune-access/check` — kullanıcının fal hakkı/limiti. IP durumu: `GET /api/fortune-access/ip-status` (kayıtsız kullanıcı limiti).
- Anonim fal: `GET /api/anonymous`, reklamla: `POST /api/anonymous/watch-ad`.

## 5. CANLI FALCI LİSTESİ
- `GET /api/fortune-tellers` → falcı kartları (`displayName, avatar, tellerLevel, online, pricePerMinute, rating`).
- Detay: `GET /api/fortune-tellers/[tellerId]`. Yorumlar: `GET /api/fortune-tellers/[tellerId]/reviews`.
- Favori falcılar: `GET /api/favorite-tellers`. Online durumu SSE/`GET /api/users/online`.

## 6. CANLI OTURUM AKIŞI (dakika bazlı)
1. Oturum iste: `POST /api/fortune-tellers/[tellerId]/session` — Body: `{ fortuneType, maxMinutes }`. Jeton bloke edilir, `LiveSession` oluşur.
2. Falcı kabul/red: falcı tarafı `PATCH /api/fortune-tellers/sessions/[sessionId]` (`action: accept|reject`). Red/iptalde SSE `session_cancelled` + jeton iadesi.
3. Odaya gir: `/canli-oda/[sessionId]` → `GET /api/room/[sessionId]` (dual auth). TRTC token ile bağlan.
4. Timer: falcı `PATCH /api/room/[sessionId]` (`action:'start_timer'`) → SSE `timer_started`. Süre uzatma: `teller_add_time` / `extend` → SSE `time_extended`.
5. Mesajlaşma: `GET/POST /api/room/[sessionId]/messages` (SSE `message`). Bahşiş: `POST /api/room/[sessionId]/tip`.
6. Bitir: `PATCH /api/room/[sessionId]` (`action:'end'`) → SSE `session_ended`, gerçek kullanım hesaplanır, iade/kazanç işlenir.
7. WebRTC sinyal (gerekirse): `POST/GET/DELETE /api/room/signal`.

```dart
// Oturum SSE
sse('/api/room/$sessionId/stream').listen((e){
  switch(e.event){ case 'timer_started': startCountdown(e.data['maxMinutes']); break;
    case 'time_extended': extendCountdown(e.data['addedMinutes']); break;
    case 'session_ended': closeRoom(); break;
    case 'message': addMessage(e.data); break; }
});
```

## 7. FALCI TARAFI (falcı kullanıcılar için)
- Gelen istekler: `GET /api/fortune-tellers/sessions` (SSE stream: `/api/fortune-tellers/sessions/stream`).
- Online ol/kapat: `POST /api/fortune-tellers/toggle-online`. Profil: `GET /api/fortune-tellers/my-profile`.
- Başvuru: `POST /api/fortune-tellers/apply`. Seviye: `GET /api/teller/level`, analiz: `GET /api/teller/analytics`.
- Yazılı fal sohbeti: `teller-chat`, `teller-chat/[sessionId]`, `falci-sohbet`.

## 8. KALİTE KONTROL
- [ ] Fotoğraf falları presigned upload ile; PDF/foto backend'e path olarak gidiyor.
- [ ] Yetersiz jetonda satın alma + reklam alternatifi sunuluyor.
- [ ] Canlı oturumda timer SSE ile senkron; iade mantığı backend'de.
- [ ] Falcı red/iptalinde jeton iadesi kullanıcıya bildiriliyor.

**Sonraki:** PART 8 — Admin Panel (mobil yönetim).
