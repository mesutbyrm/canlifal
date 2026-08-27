# CanlıFal — Faz 19 Raporu
## Opt-in İmleç (Cursor) Sayfalama — Dalga 2 (§68)

**Tarih:** 2026-08-27  
**Checkpoint:** `Phase 19: cursor pagination wave 2`  
**Doğrulama:** tsc ✅ · build ✅ · dev sunucu ✅ · kimlikli canlı uç testi ✅ · deploy ❌ (yapılmadı)

---

## 1. Amaç

Faz 18'de eklenen `isCursorMode()` / `fetchCursorPage()` altyapısını, listeleme yapan **5 uç noktaya daha** genişletmek. Tüm değişiklikler **opt-in**'dir: istemci `?cursor=` veya `?paginate=cursor` göndermedikçe eski gövde ve davranış **bit düzeyinde korunur**.

---

## 2. İmleç desteği eklenen uçlar

| # | Uç nokta | Model | Varsayılan / Maks. limit | Önceki durum |
|---|----------|-------|--------------------------|--------------|
| 1 | `GET /api/user/likers` | `SocialLike` | 30 / 100 | **Hiç limit yoktu** |
| 2 | `GET /api/user/broadcast-history` | `VideoStream` | 20 / 50 | offset (page/limit) |
| 3 | `GET /api/gifts/insights/me/history` | `GiftEvent` | 50 / 100 | offset (page/limit) |
| 4 | `GET /api/admin/risk-events` | `RiskEvent` | 50 / 100 | offset (page/limit) |
| 5 | `GET /api/agency/members` | `AgencyUser` | 30 / 100 | **Hiç limit yoktu** |

### Zaten imleçli bulunan uç
`GET /api/admin/audit-logs` denetim sırasında **zaten zaman damgalı imleç** (`?cursor=<ISO tarih>` + `nextCursor`) kullandığı tespit edildi. Geriye dönük uyumluluğu bozmamak için **dokunulmadı**.

---

## 3. Uygulama detayları

### 3.1 Ortak desen
```ts
if (isCursorMode(req)) {
  const cp = parseCursorParams(req, <varsayılan>, <maks>)
  const { items, meta } = await fetchCursorPage(
    (args) => prisma.<model>.findMany(args),
    cp.cursor, cp.limit,
    { where, orderBy: { createdAt: 'desc' }, include/select }
  )
  return apiPaginated(items, meta)
}
// ...eski kod aynen devam eder
```

Zarf: `{ success, data, meta: { cursor, hasMore, limit, total? }, request_id }`

### 3.2 Uç bazlı özel durumlar

- **`/api/user/likers`** — `SocialLike` üzerinden çekilir; sayfa içinde aynı kullanıcı birden fazla beğeni yapmışsa tekilleştirme uygulanır (eski davranışla aynı mantık).
- **`/api/user/broadcast-history`** — `broadcastSelect` ve `mapBroadcast()` yardımcıları dışarı çıkarıldı; iki mod da aynı dönüşümü kullanıyor, dolayısıyla eski gövde şekli birebir korunuyor.
- **`/api/gifts/insights/me/history`** — karşı taraf kullanıcıları ve hediye türleri ikinci sorguda toplu çekilip eşleştiriliyor. Bu son-işleme mantığı `shapeEvents()` fonksiyonuna çıkarıldı; imleç modu ve eski mod aynı çıktıyı üretiyor.
- **`/api/admin/risk-events`** — imleç modunda `getRiskEvents()` yerine doğrudan `prisma.riskEvent.findMany` kullanılıyor (yardımcı yalnızca offset destekliyor). Kullanıcı adı zenginleştirmesi her iki modda da aynı.
- **`/api/agency/members`** — imleç modunda yalnızca üye listesi imleçli döner; `leaveRequests` bloğu (ayrı, küçük ve doğası gereği sınırlı bir liste) yalnızca eski modda gönderilmeye devam eder.

---

## 4. Canlı doğrulama

Test hesabı: `POST /api/auth/mobile-login` → `accessToken`.

| Kontrol | Sonuç |
|---------|-------|
| `/api/health` | 200 ✅ |
| 4 uç — eski (parametresiz) çağrı | Eski gövde birebir ✅ |
| 4 uç — `?paginate=cursor&limit=2` | `{success, data, meta, request_id}` zarfı ✅ |
| `/api/admin/risk-events?paginate=cursor` (admin olmayan) | `FORBIDDEN` zarfı ✅ |
| `/api/agency/members` (ajans üyesi olmayan) | `Yetkiniz yok` — her iki modda aynı ✅ |
| Hediye geçmişi 2 sayfa imleç gezinmesi (`limit=1`) | s1 `hasMore:true` + imleç, s2 farklı kayıt + `hasMore:false` — **çakışma/atlama yok** ✅ |

---

## 5. Envanter

| Metrik | Faz 18 | Faz 19 |
|--------|--------|--------|
| Handler | 780 | 780 |
| Path | 502 | 502 |
| Kategori | 172 | 172 |
| Model | 215 | 215 |
| **İmleç destekli rota** | **7** | **12** |

Yeni uç nokta eklenmediği için envanter sayıları değişmedi; yalnızca mevcut uçlara opt-in yetenek eklendi.

---

## 6. Geriye dönük uyumluluk

- Hiçbir mevcut yanıt alanı kaldırılmadı veya yeniden adlandırılmadı.
- İmleç bloğu her zaman **erken dönüş** olarak eklendi; eski kod yolu değiştirilmedi.
- Web arayüzü ve Flutter istemcisi hiçbir değişiklik yapmadan çalışmaya devam eder.
- Yeni istemciler `?paginate=cursor` ekleyerek kademeli geçiş yapabilir.

---

## 7. Durum

- Checkpoint kaydedildi ✅
- Üretime alınmadı ❌ (kullanıcı talebi beklendi)
- `backend-docs/` (ENDPOINTS.md, openapi.json, postman_collection.json) yeniden üretildi ✅
