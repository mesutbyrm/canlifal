# OpenAPI

`openapi.yaml` — OpenAPI 3.0.3, **cekirdek gruplar** (auth, chat, live, trtc, gifts,
gift-box, pk, room, music, notifications, messages, me, presence, memberships):
**170 yol**. `openapi-spec-validator` ile **dogrulandi**.

Tum 717 route / 1084 metot-uc icin `docs/ENDPOINT_INVENTORY.md` esastir.
Spesifikasyon canli kaynak agacindan otomatik uretilmistir; govde semalari
kodda tam cikarilamadigi icin serbest nesne (`type: object`) olarak birakilmistir.

`/api/v1/*` sunucusu ile `/api/*` sunucusu **ayni handler'lari** calistirir.
