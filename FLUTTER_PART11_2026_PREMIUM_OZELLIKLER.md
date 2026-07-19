# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 11 — 2026 PREMİUM ÖZELLİKLER

> **Kaynak:** %100 gerçek `short-videos/*`, `games/*`, `agency/*`, `celebrities/*`, `dream-*`. **Önceki:** PART 10.

---

## 1. KISA VİDEOLAR (TikTok-tarzı)
- Akış: `GET /api/short-videos/explore` (dikey sayfalı). Kayıt: `POST /api/short-videos/register`, yükleme URL: `POST /api/short-videos/upload-url` (multipart, PART 10).
- Etkileşim: `[id]/like`, `[id]/save`, `[id]/share`, `[id]/view`, `[id]/comments` (+ `[commentId]/like`, `/pin`). Duet: `[id]/duets`.
- Profil akışı: `short-videos/profile/[userId]`, `short-videos/user/[userId]`. Müzik: `short-videos/music`. Mention arama: `short-videos/mentions/search`.
- UI: tam ekran dikey `PageView`, sağ taraf aksiyon kolonu (beğen/yorum/paylaş), altta yazar + açıklama, otomatik oynatma.

## 2. OYUNLAR (canlı sosyal oyunlar)
- Lobi: `GET /api/games/lobby`, odalar `games/room`, `games/room/[roomId]` (+ chat, viewers, replace-ai). SOS oyunu: `games/sos/*`.
- Oyna: `POST /api/games/play`. Günlük ödül/çark: `games/daily-reward`, `games/daily-spin`. Lamba cini: `games/lamba-cini`.
- Liderlik: `GET /api/games/leaderboard`. Profil: `games/profile`. Görevler: `games/quests`.
- UI: oyun grid'i + canlı oda + AI oyuncu yerine geçme.

## 3. AJANS SİSTEMİ (falcı ajansları)
- Başvuru: `POST /api/agency/apply`. Katıl/ayrıl: `agency/join`, `agency/leave`. Davet: `agency/invite`.
- Üyeler: `GET /api/agency/members`. Kazanç: `agency/earnings`. Çekim: `agency/withdrawals`. Görevler: `agency/tasks`.
- Liderlik: `GET /api/agency/leaderboard`. Kendi ajansım: `agency/my`.

## 4. ÜNLÜ & FAN KULÜP
- Ünlüler: `GET /api/celebrities`, detay `celebrities/[slug]`. Takip: `[slug]/follow`. Gönderiler: `[slug]/posts` (+ yorum, beğeni).
- Fan kulüp: `[slug]/fan-club` (+ join, level, members, polls, posts). Popüler: `fan-clubs/popular`.

## 5. RÜYA DÜNYASI (gamified)
- Günlük: `dream-diary`. Yorum: `dreams/interpret`, `dreams/generate`. Sözlük: `dream-symbols`, `dream-symbols/[slug]`.
- Yarışma: `dream-contest` (+ entries, vote). İstatistik: `dream-stats`, `dreams/trends`. Haftalık rapor: `weekly-dream-report`. Sabah hatırlatma: `dreams/morning-reminder`.

## 6. SOSYAL & KEŞFET
- Sosyal gönderi: `social/posts` (+ `[postId]` comments/likes/view). Hikayeler: `stories`. Hashtag: `hashtags/trending`, `hashtags/search`, `hashtags/[name]`.
- Keşif/arama: `search`, `search/advanced`. Liderlik: `leaderboard`, `leaderboards`.

## 7. GÖREV & ÖDÜL
- Günlük giriş: `daily-login`. Günlük görevler: `daily-missions`. Reklamla ödül: `ads/reward`, `user/watch-ad`. Referans: `referral`, `referral/validate`.

## 8. MESAJLAŞMA
- DM: `messages`, `messages/[userId]`, mesaj isteği `messages/request`. Bildirim SSE: `notifications/stream`.

## 9. UYGULAMA STRATEJİSİ
- Bu özellikleri PART 9 feature flag'leriyle kademeli aç. Her biri bağımsız modül (lazy route).
- Ortak bileşenler (PART 2) yeniden kullanılır; her modül aynı premium görsel dili taşır.

## 10. KALİTE KONTROL
- [ ] Kısa video upload multipart + presigned.
- [ ] Her modül feature flag ile açılıp kapanabiliyor.
- [ ] Sosyal etkileşimler SSE/optimistic update ile akıcı.

**Sonraki:** PART 12 — Entegrasyon, Build & Yayın Kontrol Listesi.
