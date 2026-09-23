# CanlıFal — Faz 16 Raporu
## Sağlık Kontrolü + Sistem İzleme (§74)

**Tarih:** 2026-08-27  
**Checkpoint:** `Phase 16: health endpoint system monitor`  
**Doğrulama:** tsc ✅ / build ✅ / dev ✅ / canlı uç doğrulaması ✅ (health 200, admin 401) / deploy ❌

---

## 1. Amaç

Üretim ortamında temel sağlık kontrolü ve gözlemlenebilirlik metriklerinin
exik olduğu Faz 15'te tespit edildi (`/api/health` 404 dönüyordu). Bu faz
bu boşluğu kapatır.

---

## 2. Yapılan değişiklikler

| Dosya | İşlem |
|-------|-------|
| `app/api/health/route.ts` | **YENİ** — Public sağlık kontrolü (DB ping + uptime) |
| `app/api/admin/system-stats/route.ts` | **YENİ** — Admin özet metrikleri |
| `app/[lang]/admin/system-monitor/page.tsx` | **YENİ** — Canlı izleme paneli |
| `app/[lang]/admin/page.tsx` | `🖥️ Sistem Durumu` navigasyon bağlantısı |

---

## 3. `/api/health` (ve `/api/v1/health`)

- **Auth:** Yok (public)
- **Yanıt:** Yeni zarf standardı (`apiSuccess` / `apiError`)
- **İçerik:**
  - `status`: "ok" veya hata
  - `uptime`: Sunucu çalışma süresi (saniye)
  - `dbLatencyMs`: Veritabanı gecikme testi (SELECT 1)
  - `timestamp`: ISO 8601
- **Hata durumu:** DB bağlantısı kurulamazsa 503 `SERVICE_UNAVAILABLE`
- **Kullanım:** UptimeRobot, load balancer, liveness probe

---

## 4. `/api/admin/system-stats`

- **Auth:** Admin rolü gerekli
- **Yanıt:** Yeni zarf standardı
- **Metriklerin (§74 kapsamı):**

| Metrik | Açıklama |
|--------|----------|
| dbLatencyMs | Veritabanı gecikme |
| users.total | Toplam kullanıcı |
| users.online | Son 5 dakikada aktif |
| realtime.activeRooms | Aktif sesli sohbet odaları |
| realtime.activeLiveStreams | Aktif canlı fal oturumları |
| realtime.activePkSessions | Aktif PK oturumları |
| realtime.activeVideoStreams | Aktif video yayınları |
| activity.riskEventsLastHour | Son 1 saatteki risk olayları |
| activity.auditLogsLastHour | Son 1 saatteki denetim kayıtları |
| rtcTelemetry | Son 1 saatteki bağlantı kalite özeti |

---

## 5. Admin arayüzü

`/admin/system-monitor` — 4 özet kartı (üst sıra), canlı aktivite bölümü,
son 1 saat denetim bölümü, 30 saniyede otomatik yenileme (duraklatma düğmeli).

---

## 6. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | ✅ |
| Üretim derlemesi | ✅ |
| `GET /api/health` | ✅ 200 `{status:"ok", dbLatencyMs:80}` |
| `GET /api/v1/health` | ✅ 200 (middleware rewrite) |
| `GET /api/admin/system-stats` oturumsuz | ✅ 401 `UNAUTHORIZED` |
| Admin UI tarayıcı testi | ❌ yapılmadı |
| Deploy | ❌ yapılmadı |

---

## 7. Envanter

| Ölçüt | Önce (Faz 15) | Sonra |
|---|---|---|
| Handler | 778 | **780** |
| Path | 500 | **502** |
| Kategori | 170 | **172** |
| Model | 215 | **215** |
