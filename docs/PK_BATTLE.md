# PK BATTLE — Düello Sistemi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Üç ayrı giriş noktası (yanıt biçimleri farklıdır — **dikkat**)

| Uç | Kapsam | Yanıt biçimi |
|---|---|---|
| `GET,POST /api/live/pk` | Oda↔oda, yayın↔yayın ve karışık | **Zarflı** (`{success,data}`) |
| `GET,POST /api/chat/rooms/{roomId}/pk` | Sohbet odası PK | **Düz** |
| `POST /api/video-streams/pk` | Video yayını PK | **Düz** |
| `GET,POST /api/video-streams/{streamId}/pk-battle` | Yayın içi düello | Düz |

Taraf çözümlemesi hem `id` hem `roomId` anahtarını kabul eder (`OR:[{id},{roomId}]`).

## Hata kodları

`STREAM_NOT_FOUND` 404 · `NOT_STREAM_OWNER` 403 · `STREAM_NOT_LIVE` 400 · `TARGET_NOT_FOUND` 404 ·
`TARGET_NOT_LIVE` 400 · `ROOM_NOT_FOUND` · `NOT_OWNER` · `ROOM_INACTIVE` · `TARGET_INACTIVE` · `SELF_PK` · `PK_NOT_FOUND`

## Durum makinesi

`pending` → `accepted/active` → `ended`
- `pending` bir PK **`end` edilemez**; `cancel` veya `reject` kullanılır.
- `POST /api/live/pk/score` **yalnızca admin**dir; normal skor artışı hediye akışından türetilir.

## Rate limit

`pk_create` kovası **10/dk**; pratikte hızlı ardışık 4–5 oluşturma 429 döndürebilir
(`lib/rate-limit-guard.ts`). Test senaryolarında istekler arasında bekleme gerekir.

## Gerçek zamanlı

- Maç kanalı: `GET /api/pk/{matchId}/stream` → `connected`, `match_update`, `pk`, `not_found` (heartbeat 15 sn, yoklama 2 sn).
- Oda kanalında `pk` tipi olay yayınlanır (`GET /api/chat/rooms/{roomId}/stream`).
- Davetler: `GET /api/pk/me/invites`.

## AÇIK SORUN — "PK daveti karşı tarafa ulaşmıyor" (durum: EKSİK)

Kullanıcı raporu doğrulanmış bir hata olarak açıktır. Kod okumasından çıkan **hipotezler**
(hiçbiri uçtan uca testle kanıtlanmamıştır):

1. Davet `/api/live/pk` üzerinden oluşturulurken davet edilen tarafın **oda SSE kanalına** olay
   yayınlanmıyor olabilir — davet eden tarafın kanalına yayınlanıyor olabilir.
2. Davet edilen istemci `pk` olayını değil yalnızca `GET /api/pk/me/invites` yoklamasını dinliyorsa,
   yoklama yoksa davet hiç görünmez.
3. Üç farklı PK ucunun yanıt biçimi farklı olduğundan (zarflı/düz), istemci yanlış ucu dinliyor olabilir.

**Sonraki adım:** iki test hesabıyla uçtan uca izleme (davet edenin ve edilenin SSE çıktısı eşzamanlı
kaydedilerek). Bu, üretim verisine yazmadan test hesaplarıyla yapılmalıdır.

## Tüm PK uçları

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `GET, POST` | `/api/chat/rooms/[roomId]/pk` | Web oturumu, Bearer JWT | pk_create | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/pk/score` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/pk-list` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/pk/candidates` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/pk` | Bearer JWT | pk_create | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/pk/active` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/pk/score` | Bearer JWT, Admin/RBAC | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/pk/[matchId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/pk/[matchId]/stream` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/pk/active` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/pk/leaderboard` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/pk/me/invites` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/video-streams/[streamId]/pk-battle` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/video-streams/pk` | Web oturumu, Bearer JWT | pk_create | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/video-streams/pk/candidates` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/video-streams/pk/list` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/video-streams/pk/score` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
