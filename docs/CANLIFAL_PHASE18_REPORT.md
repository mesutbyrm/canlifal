# CanlıFal — Faz 18 Raporu
## Opt-in İmleç (Cursor) Sayfalama — §68 / §66

**Tarih:** 2026-08-27  
**Checkpoint:** `Phase 18: opt-in cursor pagination`  
**Doğrulama:** tsc ✅ · build ✅ · dev sunucu ✅ · kimlikli canlı uç testi ✅ · deploy ❌

---

## 1. Amaç

§68 yüksek hacimli liste uçlarında offset sayfalamanın derin sayfalarda (`OFFSET 5000`) doğrusal yavaşlamasını ve eşzamanlı ekleme sırasında kayıt atlama/yineleme sorununu ortadan kaldırmak.

**Kısıt:** Üretimdeki web ve mobil istemciler kırılamaz. Bu nedenle imleç modu **tamamen opt-in**'dir: istemci `?cursor=...` veya `?paginate=cursor` göndermedikçe uçların davranışı ve yanıt gövdesi **bit düzeyinde aynı** kalır.

---

## 2. Altyapı — `lib/pagination.ts`

Mevcut `parseCursorParams` / `cursorQuery` / `buildCursorMeta` yardımcılarına iki yeni fonksiyon eklendi:

| Fonksiyon | Görev |
|---|---|
| `isCursorMode(req)` | `cursor` parametresi var mı ya da `paginate=cursor` mı? Mod anahtarı. |
| `fetchCursorPage(findMany, cursor, limit, args, idField?)` | `limit+1` kayıt çeker, fazlasını kırpar, `{ items, meta }` döner. |

`meta` zarfı: `{ cursor: string|null, hasMore: boolean, limit: number }`. Son sayfada `cursor: null` ve `hasMore: false` döner.

---

## 3. İmleç desteği eklenen 7 uç

| # | Uç | Model | Varsayılan / Maks limit | Sıralama |
|---|---|---|---|---|
| 1 | `GET /api/notifications` | Notification | 50 / 100 | createdAt ↓ |
| 2 | `GET /api/user/activity` | Notification | 30 / 50 | createdAt ↓ |
| 3 | `GET /api/user/followers` | Follow | 30 / 100 | createdAt ↓ |
| 4 | `GET /api/user/following` | Follow | 30 / 100 | createdAt ↓ |
| 5 | `GET /api/user/received-gifts` | ChatRoomGift | 30 / 100 | createdAt ↓ |
| 6 | `GET /api/messages` (sohbet listesi) | Conversation | 30 / 100 | lastMessageAt ↓ |
| 7 | `GET /api/messages/{userId}` (DM dizisi) | DirectMessage | 30 / 100 | createdAt ↓ |

Hepsi `/api/v1/...` yolundan da erişilebilir (middleware yeniden yazması).

### Özel notlar
- **#3 / #4 (takipçi/takip edilen):** Bu iki uçta önceden **hiçbir limit yoktu** — 100.000 takipçili bir hesapta tüm satırlar tek seferde çekiliyordu. İmleç modu bu senaryo için sınırlı ve sabit maliyetli bir yol sunar. Varsayılan (limitsiz) davranış geriye dönük uyumluluk için korundu.
- **#1 / #2:** `meta.total` alanı okunmamış bildirim sayısını taşır (mevcut `unreadCount` alanının imleç karşılığı).
- **#6:** Okunmamış sayıları tek `groupBy` sorgusuyla toplanır — N+1 yok.
- **#7:** İmleç modu yalnızca mesaj sayfasını döner ve **en yeniden eskiye** sıralıdır (klasik sonsuz kaydırma). Eski mod `asc` sıralı son 100 mesajı + izin/gizlilik meta verisini döndürmeye devam eder.

---

## 4. Yanıt zarfı

İmleç modunda §-standardı zarf kullanılır:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "cursor": "cmri32df7003tqq3fo66bspef", "hasMore": true, "limit": 2, "total": 8 },
  "request_id": "req_mtbsrzdd_jy8m2l8i"
}
```

İstemci sonraki sayfayı `?cursor=<meta.cursor>&limit=<n>` ile ister. `meta.cursor === null` → dizinin sonu.

---

## 5. Canlı doğrulama

Test hesabıyla mobil JWT alınarak yerel sunucuda çalıştırıldı:

| Test | Sonuç |
|---|---|
| 7 ucun tamamı kimliksiz | 401 ✅ |
| 7 ucun tamamı `?paginate=cursor` ile kimlikli | 200 + doğru zarf ✅ |
| Eski (parametresiz) çağrılar | Yanıt gövdesi değişmedi ✅ |
| `/api/v1/notifications?paginate=cursor` | 200 ✅ |
| Bildirimlerde 2 sayfa gezinme | Sayfa 1 → `[…4lx, …pef]`, Sayfa 2 → `[…nfp, …x55]` — **çakışma yok, atlama yok** ✅ |
| DM dizisi imleç modu | 200, tek mesaj + `hasMore:false` ✅ |

---

## 6. Envanter

| Metrik | Değer |
|---|---|
| Handler | 780 |
| Yol (path) | 502 |
| Kategori | 172 |
| Model | 215 |
| İmleç destekli uç | 0 → **7** |

---

## 7. Kalan iş

- İmleç desteğinin diğer liste uçlarına (hediye geçmişi, işlem geçmişi, oda üyeleri, yayın izleyicileri, sistem mesajları) yayılması.
- Mobil istemcinin sonsuz kaydırmada `?paginate=cursor` moduna geçirilmesi.
- Deploy henüz yapılmadı (Faz 16, 17, 18 checkpoint'te bekliyor).
