# Flutter ↔ Backend route parity (Canlifal)

**Kaynaklar**

| Kaynak | Açıklama |
|--------|----------|
| Flutter | `mesutbyrm/Cursor-Flutter-` — `mobile/lib/**/*.dart` (`api_endpoints.dart`, `pk_room_remote_datasource.dart`, `agency_wallet_datasource.dart`) |
| Backend | `mesutbyrm/canlifal` — `nextjs_space/app/api/**/route.ts` |
| Doğrulama | `python3 scripts/backend-route-parity.py <nextjs_space> --used-only` ve `backend-method-parity.py` (Flutter repo kökü) |

**Base:** `main` @ `79823e6` (PR #56 birleşimi, ~771 route). Parity dalı: `cursor/mobile-parity-apis-dfca-48ea` (PK + ajans cüzdan hareketleri + test push).

## Parity script sonuçları

| Aşama | Backend route sayısı | `--used-only` eksik | `backend-method-parity.py` |
|-------|----------------------|---------------------|------------------------------|
| **Önce** (main, PR #56) | 771 | **9** | `bad=0`, `ok=692` |
| **Sonra** (bu PR) | 777 | **0** | `bad=0`, `ok=692` |

### Önce eksik olan (Flutter’da kullanılan) uçlar

- `GET /api/agency/wallet/transactions` — `ApiEndpoints.agencyWalletTransactions`
- `POST /api/notifications/test-push` — tanılama ekranı
- `GET /api/pk/me/history` — sayfalı geçmiş (`history` \| `items` \| `data` list)
- `GET /api/pk/me/matches` — aktif maç listesi (`matches` \| `data` \| `items`)
- `GET /api/pk/me/stats` — `{ success, stats, data }` (Flutter `PkStats.fromJson` wrapper destekler)
- `GET /api/pk/stats/{userId}` — public istatistik map

### Bu PR’da eklenen / korunan

- **PK:** `lib/pk-user-stats.ts` + dört route; mevcut `GET /api/pk/active`, `/api/pk/me/invites`, `/api/pk/[matchId]` dokunulmadı.
- **Ajans cüzdan:** `GET /api/agency/wallet/transactions` (`page`, `limit`; `requireAuth` / JWT Bearer); yanıt `data.transactions`, kök `transactions` / `items` / `txns` — `AgencyWalletDataSource.fetchWalletTransactions` ile uyumlu. Tam snapshot için resmi uç hâlâ `GET /api/agency/wallet`.
- **Push tanılama:** `POST /api/notifications/test-push` — `authenticateRequest` + `sendTestPushDetailed` (`lib/onesignal.ts`).
- **PR #56 route’ları silinmedi:** örn. `PATCH /api/agency`, `GET /api/agency/periods`, admin/social-accounts/complaints, wallet transfer, payments pending/cancel, `GET /api/me/permissions`.

## Üretim smoke (Bearer JWT)

Deploy **öncesi** (2026-10-13): birçok uç `ENDPOINT_NOT_FOUND` (404) — prod henüz main/PR #56+parity commit’inde değil. Deploy sonrası doğrulanacak uçlar:

- `GET /api/me/permissions`
- `GET /api/agency/periods`
- `PATCH /api/agency`
- `GET /api/pk/me/matches`, `GET /api/pk/me/history`
- `GET /api/agency/wallet/transactions`

**Kısıt:** Otomatik toplu veri değiştirme / finans işlemi yok; smoke yalnızca okuma ve yetkisiz isteklerde 401/403 kontrolü.

## Geniş aday listesi (used-only dışı)

Tam birleşim karşılaştırmasında (~100 aday) hâlâ gürültü (string birleştirme, test fixture, yorum) ve ürün kararı gerektiren maddeler olabilir. **Mobil `--used-only` hedefi:** eksik **0**, method parity **bad=0**.

### Bilinen yol uyuşmazlıkları (Flutter veya backend hizalaması gerekir)

- `GET /api/agency/invites` (Flutter) vs `GET /api/agency/invite` (tekil) — her iki uç da backend’de mevcut olabilir; mobil `agencyInvites` kullanıyor.

### Notlar

- Flutter değişiklikleri için `Cursor-Flutter-` deposuna yazma erişimi ayrıca gerekir.
- Yerel `yarn build`: `prisma/schema.prisma` ve `yarn.lock` Abacus/shared ortam symlink’lerine bağlı; CI/Abacus build’i referans alınmalı.
