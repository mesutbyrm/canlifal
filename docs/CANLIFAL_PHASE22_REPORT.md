# CanlıFal Phase 22 — Idempotency (§71)

**Tarih:** 2026-08-27  
**Durum:** tsc ✅ / build ✅ / dev ✅ / canlı uç doğrulaması ✅  
**Deploy:** ❌ (kullanıcı talebi bekleniyor)

---

## Kapsam

Finansal / yan-etkili kritik uç noktalara `Idempotency-Key` header desteği eklendi.  
Mevcut `lib/idempotency.ts` kütüphanesi (beginIdempotent / completeIdempotent / releaseIdempotent) kullanıldı.

## Önceki Durum (Phase 21 sonu)

İdempotency header desteği olan 4 uç:

| # | Endpoint | Scope |
|---|----------|-------|
| 1 | `/api/memberships/purchase` | `membership_purchase` |
| 2 | `/api/payments/requests` | `payment_request` |
| 3 | `/api/chat/rooms/[roomId]/sessions/[sessionId]/tip` | `session_tip` |
| 4 | `/api/withdrawals` | `withdrawal` |

## Eklenen 7 Uç Nokta

| # | Endpoint | Scope | Kritiklik |
|---|----------|-------|----------|
| 5 | `/api/gifts/send` | `gift_send` | Jeton harcama |
| 6 | `/api/chat/rooms/[roomId]/gifts` | `chatroom_gift` | Oda içi hediye |
| 7 | `/api/video-streams/[streamId]/gifts` | `stream_gift` | Yayın hediyesi |
| 8 | `/api/chat/rooms/[roomId]/pk` | `pk_action` | PK başlat/kabul/reddet |
| 9 | `/api/video-streams/pk` | `stream_pk` | Video PK |
| 10 | `/api/live/pk` | `live_pk` | Canlı PK |
| 11 | `/api/gifts/missions/[missionId]/claim` | `mission_claim` | Görev ödülü talebi |

## Kapsam Dışı Bırakılanlar

| Endpoint | Neden |
|----------|-------|
| `/api/gifts/battles` | Uygulama düzeyinde idempotency mevcut (aynı bağlamda aktif savaş kontrolü) |
| `/api/daily-missions` | Phase 20'de interactive tx + P2002 guard ile korunmuş |
| `/api/jeton` (daily login) | Phase 20'de interactive tx + P2002 guard ile korunmuş |

## Uygulama Deseni

Her dosyaya uygulanan kalıp:

```typescript
let _idempotencyRecord: string | null = null;
try {
  // ... auth + rate limit ...
  const replay = await beginIdempotent(req, SCOPE, userId);
  if (replay.response) return replay.response;
  _idempotencyRecord = replay.record;

  // ... iş mantığı ...

  const payload = { /* response data */ };
  await completeIdempotent(replay.record, 200, payload);
  return NextResponse.json(apiSuccess(payload));
} catch (err) {
  await releaseIdempotent(_idempotencyRecord);
  // ... hata yönetimi ...
}
```

**Önemli:** `replay` değişkeni `try` bloğu içinde tanımlandığı için `catch` bloğundan erişilemez. Bu yüzden `_idempotencyRecord` try bloğu öncesinde tanımlanıp, başarılı `beginIdempotent` sonrası doldurulur.

## Doğrulama

- **tsc:** 7 TS2304 hatası → hoist düzeltmesi → 0 hata ✅
- **Build:** production build başarılı ✅
- **Canlı test:** `Idempotency-Key` header'ı ile `/api/gifts/send` — 2. çağrı `DUPLICATE_REQUEST` döndü ✅

## Envanter

| Metrik | Önceki | Sonraki |
|--------|--------|--------|
| Handler | 780 | 780 |
| Path | 502 | 502 |
| Kategori | 172 | 172 |
| Model | 215 | 215 |
| Idempotency route | 4 | **11** |
| $transaction | 51 | 51 |
