# Flutter ↔ Backend Eksik Uç Raporu

**Yöntem:** `mesutbyrm/Cursor-Flutter-` deposundaki `mobile/lib` altındaki Dart dosyalarında geçen `/api/...` yolları çıkarıldı, normalize edildi (`$id`, `{id}`, `[id]`, `:id` → `{p}`, `/api/v1/` → `/api/`) ve üç kaynağın birleşimine karşı karşılaştırıldı:

1. Ana backend: `nextjs_space/app/api/**/route.ts` (726 yol)
2. İkinci backend (Express): `Cursor-Flutter-/api/src/index.ts` içindeki 33 aktif `app.use` mount'u ve 289 route tanımı

Flutter yönlendirmesi (`mobile/lib/core/network/api_backend_router.dart`) `main`, `game` ve `gateway` olmak üzere üç hedef kullanıyor.

**Sonuç:** Birleşim dışında kalan yaklaşık 100 aday var. Bunların bir kısmı gerçek eksik, bir kısmı gürültü:

- **Gürültü:** Dart string birleştirmeleri (`'/api/agency' + ...`), test fixture'ları (`abc123`, `room1`), yarım kalmış ifadeler (`/api/auth/mobile-`), yorum içindeki örnekler.
- **Gerçek eksik (doğrulandı):**
  - `PATCH /api/agency` (ajans profili düzenleme) — `agency_profile_edit_page.dart:8`
  - `GET /api/agency/periods` — `agency_periods_page.dart:8`
  - `GET /api/agency/invites` — Flutter `invites` (çoğul) kullanıyor; backend'de `agency/invite` (tekil) var → yol uyuşmazlığı
- **Gerçek eksik (aday, doğrulanmadı):** `admin/*` (complaints, finance/summary, health, live-stats, role-permissions, social-accounts, users/*), `gifts/insights/{id}/*` alt yolları, `video-streams/*` (trending, list, score, candidates), `short-videos/*` (recommend, live-clip, suggest-metadata, viewed/{id}), `users/{id}/*` (activity, stats, gifts-received, profile-visitors, broadcast-history), `payments/requests/pending`, `membership/plans/purchase`, `wallet/transfer`, `rooms/{id}/music/current`, `chat/rooms/{id}/candidates`, `girlive/publisher-assistant*`.

**Notlar:**
- Eski bir yol ya da yol uyuşmazlığı, Flutter tarafında hizalanarak da kapatılabilir; her aday için ya backend'e route eklemek ya da Flutter çağrısını düzeltmek gerekir. Hangisinin doğru olduğu ürün kararıdır.
- Her aday için Flutter'ın beklediği yanıt şeması ayrıca doğrulanmalı. Bu rapor yalnızca yol varlığını kontrol eder.
- Flutter değişiklikleri için `Cursor-Flutter-` deposuna **push erişimi** gerekir; şu an yalnızca okuma erişimi var.
