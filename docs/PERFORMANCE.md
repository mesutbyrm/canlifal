# PERFORMANCE — Performans Analizi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Ölçülen yapılandırma

| Konu | Değer | Kaynak |
|---|---|---|
| Bağlantı havuzu | `connection_limit=5`, `pool_timeout=10` | `lib/db.ts:15` |
| Sorgu zaman aşımı | `statement_timeout=5000` (5 sn) | `lib/db.ts:15` |
| Önbellek politikaları | `public-1d`, `public-10m`, `public-1m`, `private-5m`, `no-store` | `lib/perf.ts` |
| Rate limit varsayılanı | `api_default` 60/dk | `lib/rate-limit-guard.ts` |
| SSE yoklama aralıkları | 1–5 sn (uca göre) | bkz. `REALTIME_SSE.md` |

Önbellek politikası uygulanmış route sayısı: **5 / 717**.

## Kategori A — Hemen uygulanabilir (düşük risk)

1. **Önbellek başlığı olmayan salt-okunur uçlar.** 270 adet yalnızca-GET
   route'ta `Cache-Control` politikası yok. Katalog/ayar türü uçlara `public-10m` eklenmesi
   sunucu yükünü belirgin azaltır.
2. **SSE yoklama aralıkları.** `video-streams/[streamId]/stream` ve `room/[sessionId]/stream`
   **1 saniyede bir** veritabanı sorgusu yapar. 2–3 sn'ye çıkarmak, algılanan gecikmeyi bozmadan
   sorgu sayısını yarıdan fazla düşürür.
3. **Varlık penceresi.** 5 dakikalık `lastSeen` penceresi hem yanlış sonuç üretiyor hem de
   gereksiz büyük sonuç kümesi getiriyor (bkz. `LIVE_ROOMS.md`).

## Kategori B — Planlı çalışma gerektirir

1. **Idempotency anahtarları.** Hediye/ödeme uçlarında `Idempotency-Key` başlığı desteği
   (şemada `IDEMPOTENCY_CONFLICT` kodu var, uygulama kısmi).
2. **Dağıtık rate limit.** Bellek-içi sayaç yerine paylaşımlı sayaç.
3. **Sayfalama standardizasyonu.** Uçların bir kısmı cursor, bir kısmı offset kullanıyor;
   ortak `meta{cursor,hasMore}` zarfına geçirilmeli.
4. **Admin raporları.** 5 sn sorgu zaman aşımı nedeniyle ağır toplulaştırmalar risklidir;
   önceden hesaplanmış özet tabloları önerilir.

## Kategori C — Mimari değişiklik

1. **SSE yerine kalıcı bir yayın kanalı.** Şu an her SSE bağlantısı kendi yoklama döngüsünü çalıştırır;
   eşzamanlı N kullanıcı = N× sorgu. Merkezi bir olay yayıncısı (pub/sub) yükü sabitler.
2. **Enum'a geçiş.** Durum alanlarının veritabanı düzeyinde kısıtlanması.
3. **Okuma replikası** veya CDN önbelleği ile katalog uçlarının tamamen ayrılması.

> Bu kategorilerdeki hiçbir değişiklik bu çalışma kapsamında **uygulanmamıştır** — yalnızca analizdir.
