# CanlıFal — Turnuva ve Yarışma Sistemi Dokümantasyonu

> **§39 — Spec Referansı**
>
> Son güncelleme: 2026-08-27

---

## 1. Genel Bakış

Platformda iki tür yarışma sistemi mevcuttur:
1. **Haftalık Turnuvalar (WeeklyTournament)** — Otomatik dönemsel sıralama
2. **Hediye Savaşları (GiftBattle)** — Canlı oda/yayın içi anlık yarışmalar
3. **PK Savaşları (PKBattle)** — 1v1 canlı yayın düelloları

---

## 2. Haftalık Turnuva

### 2.1 Veri Modeli

**WeeklyTournament:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | String | Benzersiz ID |
| weekStart | DateTime | Hafta başlangıcı (Pazartesi) |
| weekEnd | DateTime | Hafta sonu (Pazar) |
| type | String | jeton_spend, session_count, gift_sent, fortune_count |
| title | String | Turnuva başlığı |
| description | String? | Açıklama |
| status | String | active, completed |
| rewards | String? | JSON: `[{rank:1, prize:500}, ...]` |

**WeeklyTournamentEntry:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| tournamentId | String | Turnuva ID |
| userId | String | Katılımcı ID |
| score | Int | Puan |
| rank | Int? | Sıralama |
| rewarded | Boolean | Ödül verildi mi |

**Benzersizlik:** `@@unique([tournamentId, userId])` — Aynı kullanıcı aynı turnuvaya bir kez katılır.

### 2.2 Turnuva Türleri

| Tür | Açıklama | Skor Kaynağı |
|-----|----------|-------------|
| `jeton_spend` | En çok jeton harcayan | Hediye gönderim toplamı |
| `session_count` | En çok fal seansı yapan | Tamamlanan seanslar |
| `gift_sent` | En çok hediye gönderen | Hediye sayısı |
| `fortune_count` | En çok fal bakan | Fal talebi sayısı |

### 2.3 API

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/tournaments` | Evet | Aktif turnuvalar + sıralama |

---

## 3. Hediye Savaşı (GiftBattle)

### 3.1 Veri Modeli

**GiftBattle:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| context | String | live_stream, voice_room |
| contextId | String | Yayın/oda ID |
| createdById | String | Oluşturan kullanıcı |
| status | String | active, finished, cancelled |
| durationSec | Int | Süre (varsayılan 180sn) |
| startedAt | DateTime | Başlangıç |
| endsAt | DateTime | Bitiş |
| winnerId | String? | Kazanan |
| totalScore | Int | Toplam skor |

**GiftBattleParticipant:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| battleId | String | Savaş ID |
| userId | String | Katılımcı |
| score | Int | Aldığı hediye puanı |
| giftsReceived | Int | Aldığı hediye sayısı |
| rank | Int? | Sıralama |

---

## 4. PK Savaşı

### 4.1 Veri Modelleri

| Model | Açıklama |
|-------|----------|
| `PKBattle` | Ana PK kaydı (durum, süre, kazanan) |
| `PkScore` | PK skor tablosu |
| `PkGift` | PK sırasında gönderilen hediyeler |
| `PkMatch` | PK eşleşme kaydı |
| `PkSeat` | PK koltuğu |
| `PkParticipant` | PK katılımcısı |
| `PkStat` | PK istatistikleri |
| `PkEvent` | PK olayları |
| `PkBan` | PK yasakları |

### 4.2 PK Akışı

```
1. İstek gönder → POST /api/live/pk veya /api/chat/rooms/[roomId]/pk
2. Karşı taraf kabul → PATCH (accept)
3. Başlat → Timer başlar
4. Hediye gönder → Skor güncelle (realtime SSE)
5. Süre dol → Bitir + sonuç hesapla
6. Kazanan belirlenir
```

### 4.3 PK API Uçları

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| POST | `/api/live/pk` | Evet + PK_ENABLED | PK başlat/kabul/ret |
| POST | `/api/chat/rooms/[roomId]/pk` | Evet + PK_ENABLED | Oda içi PK |
| POST | `/api/video-streams/pk` | Evet + PK_ENABLED | Yayın PK |

### 4.4 Backend Sağladığı PK Verisi (§28)

```json
{
  "playerA": { "userId": "...", "name": "...", "avatar": "..." },
  "playerB": { "userId": "...", "name": "...", "avatar": "..." },
  "scoreA": 1250,
  "scoreB": 890,
  "timeRemaining": 45,
  "status": "active",
  "audioStateA": "unmuted",
  "audioStateB": "muted"
}
```

---

## 5. Liderlik Tablosu (Leaderboard)

### 5.1 Desteklenen Dönemler

- Saatlik (hourly)
- Günlük (daily)
- Haftalık (weekly)
- Aylık (monthly)
- Sezonluk (seasonal)

### 5.2 Kategoriler

| Kategori | Açıklama |
|----------|----------|
| Top Gifter | En çok hediye gönderen |
| Top Creator | En çok kazanan yayıncı |
| Top Viewer | En çok izleyen |
| Most Gifts Received | En çok hediye alan |
| PK Winners | PK kazananları |
| Top Agency | En iyi ajanslar |

### 5.3 API

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/leaderboard` | Evet | Ana sıralama |
| GET | `/api/agency/leaderboard` | Evet | Ajans sıralaması |

---

## 6. Feature Flag

| Bayrak | Açıklama |
|--------|----------|
| `TOURNAMENT_ENABLED` | Turnuva sistemi açık/kapalı |
| `PK_ENABLED` | PK sistemi açık/kapalı |

---

## 7. Güvenlik

- `guardRateLimit('pk_create')` — 10 istek/dakika (3 uç)
- PK skor güncellemeleri backend-authoritative (istemci skor hesaplamaz)
- Hediye savaşı sonuçları atomik transaction ile hesaplanır
- Aynı turnuvaya çift kayıt engeli (`@@unique([tournamentId, userId])`)
