# MUSIC SYSTEM — Oda Müziği ve DJ

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Akış

1. DJ atama: `GET,POST /api/chat/rooms/{roomId}/dj`, `POST,DELETE /api/chat/rooms/{roomId}/dj/{targetUserId}`
2. Arama: `GET /api/music/search` (Bearer JWT)
3. Kuyruğa ekleme: `POST /api/chat/rooms/{roomId}/music` veya `POST /music-request-by-query`
4. Kuyruk: `GET /api/chat/rooms/{roomId}/music-queue`, tekil silme `DELETE /song/{queueId}`
5. Ayarlar: `GET,PATCH /api/chat/rooms/{roomId}/music-settings`
6. Durdurma: `POST /api/chat/rooms/{roomId}/music/stop`
7. Geçmiş: `GET /api/music/history`

Ses kaynağı için `POST /api/chat/youtube-audio` ucu bulunur — **yetki kontrolü tespit edilmedi**,
bkz. [`SECURITY.md`](./SECURITY.md) gözden geçirme listesi.

## Uçlar

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `POST` | `/api/admin/trend-videos/youtube` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/music/popular` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/dj` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/dj/[targetUserId]` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/music` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/music-queue` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/music-request-by-query` | Web oturumu, Bearer JWT, Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/music-settings` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/music/stop` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, PATCH` | `/api/chat/rooms/[roomId]/song-request` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/song/[queueId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/youtube-audio` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/youtube-stream` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/music/history` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/music/search` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/short-videos/music` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/short-videos/music/recommend` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/youtube/search` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
