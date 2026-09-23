# CanlıFal Phase 23 — Consistency Audit + Error Catalog (§79-§80)

**Tarih:** 2026-08-27  
**Durum:** tsc ✅ / build ✅ / dev ✅ / health ✅  
**Deploy:** ❌ (kullanıcı talebi bekleniyor)

---

## 1. Consistency Audit (§79)

§79'da listelenen 7 kritik state alanı (room count, seat, user status, gift score, PK score, wallet, leaderboard) denetlendi.

### Düzeltilen Sorun

| Dosya | Sorun | Çözüm |
|-------|-------|--------|
| `app/api/chat/rooms/[roomId]/seats/route.ts` | Koltuk atamasında TOCTOU race condition — kontrol ve upsert ayrı işlemler | Tüm check + displace + upsert tek interactive `$transaction` içine alındı |

### Zaten Güvenli Bulunan Yollar

| Alan | Neden |
|------|-------|
| Room count (presence) | Phase 20'de interactive tx'e alınmıştı |
| Wallet (gift send, chatroom/stream gifts) | Interactive tx içinde; Phase 22'de idempotency eklendi |
| PK score | Hediye gönderimi tx içinde; PK state değişikliği tek update, idempotency eklendi |
| PK create | Uygulama düzeyinde aktif PK kontrolü + idempotency (Phase 22) |
| Leaderboard | Salt okunur aggregate sorguları; yazma tarafı tx korumalı |
| User status (online/offline) | Presence heartbeat üzerinden; stale threshold ile otomatik temizlik |

### Web ↔ Flutter Tutarlılık Notu

Her iki istemci aynı API'leri (REST + SSE) kullanır. State değişiklikleri atomik tx'ler içinde gerçekleşir ve SSE event'leri ile her iki tarafa yayılır. Farklı state görme olasılığı sadece SSE bağlantı kopukluğunda olabilir — bu durumda istemci yeniden bağlanınca full state GET ile senkronize olur.

---

## 2. Error Code Catalog (§80)

### Mevcut Zarf Formatı

```json
{
  "success": false,
  "error": { "code": "...", "message": "...", "details": {} },
  "request_id": "req_xxx"
}
```

### Yapılanlar

| İşlem | Sonuç |
|--------|--------|
| ErrorCodes objesindeki mevcut kodlar | 60 |
| Route'larda kullanılıp ErrorCodes'ta eksik olan kodlar | **51 eklendi** |
| Toplam error code | **111** |
| Dökümantasyon dosyası | `lib/ERROR_CODES.md` |

### Yeni Eklenen Kategoriler

- **Genel İstek (11):** INVALID_PARAMS, MISSING_PARAMS, INVALID_BODY, INVALID_ACTION, INVALID_OP, INVALID_FORMAT, INVALID_CONTENT, INVALID_FORM, INVALID_AMOUNT, MISSING_KEY, MISSING_OP
- **Durum (7):** ENDPOINT_NOT_FOUND, DUPLICATE_REQUEST, NOT_AUTHORIZED, NOT_OWNER, COOLDOWN_ACTIVE, NOT_APPROVED, ACCOUNT_RESTRICTED, REGISTER_FAILED
- **Oda Ek (11):** ROOM_INACTIVE, SEAT_TAKEN, INVALID_SEAT, INVALID_ROOM_TYPE, INVALID_ROOM_PASSWORD, CANNOT_SPEAK, FOLLOWERS_ONLY, COMMENTS_OFF, MESSAGE_TOO_LONG, MISSING_ROOM_ID, MISSING_CHANNEL
- **Yayın Ek (8):** STREAM_NOT_LIVE, ALREADY_LIVE, DURATION_TOO_LONG, MISSING_VIDEO, MISSING_VIDEO_URL, TRTC_NOT_CONFIGURED, PRESIGN_FAILED, TARGET_INACTIVE
- **PK Ek (5):** PK_EXISTS, PK_EXPIRED, PK_NOT_PENDING, NO_TARGET_OWNER, MISSING_BATTLE_ID
- **Hediye Ek (6):** SELF_GIFT, NO_RECIPIENT, RECIPIENT_NOT_FOUND, INVALID_GIFT, INVALID_PARENT, BANNED
- **Fal Ek (2):** NOT_A_TELLER, INVALID_FORTUNE_TYPE

---

## 3. Zarf Geçiş Durumu (Bilgilendirme)

| Metrik | Sayı |
|--------|------|
| Toplam API route dosyası | 519 |
| Zarf kullanan (apiSuccess/apiError/apiPaginated) | **31** |
| Henüz eski format ({error:'...'}) | **488** |

**Not:** Zarf geçişi kademeli olarak yapılmaktadır. Eski format uyumlu olmaya devam eder — `success` alanı yoksa Flutter istemcisi `error` alanına bakarak eski/yeni formatı otomatik ayırt edebilir.

---

## Envanter

| Metrik | Önceki | Sonraki |
|--------|--------|--------|
| Handler | 780 | 780 |
| Path | 502 | 502 |
| Kategori | 172 | 172 |
| Model | 215 | 215 |
| ErrorCodes tanımlı | 60 | **111** |
| $transaction | 51 | **52** |
