# MCP_INVENTORY.md — MCP Sunucu Envanteri

> **AŞAMA A çıktısı — SALT OKUMA.** Hiçbir dosya değiştirilmedi.  
> Tarama kapsamı: ana backend (`nextjs_space/`), Flutter reposu (`mobile/`, `api/`, `mcp-server/`, `site/`), editör yapılandırması (`.cursor/`).

## 0. Özet

| Ölçüm | Değer |
|---|---|
| Bulunan MCP sunucusu | **1** |
| Ana backend içinde MCP sunucusu | **0** |
| Flutter uygulaması içinde MCP istemcisi | **0** |
| Çalışma zamanında (üretimde) kullanılan MCP | **0** |
| Toplam MCP aracı (tool) | **5** |

**Sonuç:** Projede çalışma zamanı MCP bağımlılığı yoktur. Tek MCP sunucusu geliştirme aracıdır (editör içi dokümantasyon yardımcısı).

---

## 1. `canlifal-backend` (canlifal-backend-mcp)

| Alan | Değer |
|---|---|
| **NAME** | `canlifal-backend` (paket adı: `canlifal-backend-mcp`, sürüm 1.0.0) |
| **DOSYA** | `mcp-server/index.mjs` (218 satır) + `mcp-server/package.json` |
| **PURPOSE** | Salt-okunur API referansı: depo içindeki denetim (audit) belgelerinden endpoint listesi ve kimlik akışı bilgisi sunar |
| **PROTOKOL** | JSON-RPC üzerinden MCP `2024-11-05`, stdio taşıma |
| **BAĞIMLILIK** | Yok (yalnız Node ≥18 standart kütüphanesi) |
| **USED BY** | `.cursor/mcp.json` → `command: node /workspace/mcp-server/index.mjs`. Yani **yalnızca editör (Cursor) tarafından**, geliştirme sırasında |
| **RUNTIME KULLANIMI** | **Yok.** Sunucunun kendi `get_auth_flow` yanıtı bunu açıkça yazıyor: "Runtime MCP: not used by Flutter; Flutter uses REST/SSE/TRTC." |
| **DUPLICATE?** | Hayır — projede ikinci bir MCP sunucusu yok |
| **ACTIVE?** | Kısmen. Kod çalışır durumda, ancak yalnızca `/workspace/...` mutlak yolu ile yapılandırılmış; bu yol bu ortamda mevcut değil → **bu VM'de çalışmaz** |

### TOOLS (5 adet)

| Araç | İşlev | Veri kaynağı |
|---|---|---|
| `list_endpoints` | Endpoint satırlarını listeler (`search`, `limit` parametreli) | `docs/API_ENDPOINT_MATRIX.md` |
| `get_endpoint` | Tek bir path'in satırını döndürür | `docs/API_ENDPOINT_MATRIX.md` |
| `search_endpoints` | Serbest metin araması | `docs/API_ENDPOINT_MATRIX.md` |
| `get_auth_flow` | Sabit metin: mobil kimlik akışı özeti | Kod içine gömülü sabit |
| `read_audit` | 4 belgeden birini olduğu gibi okur | `API_INTEGRATION_AUDIT.md`, `API_ENDPOINT_MATRIX.md`, `MCP_INTEGRATION_MATRIX.md`, `API_PARITY_FINAL_REPORT.md` |

### RESOURCES (4 adet)

`audit://api-integration` · `audit://endpoint-matrix` · `audit://mcp-matrix` · `audit://parity-final`

---

## 2. Aranan ama bulunmayanlar

| Arama | Sonuç |
|---|---|
| Ana backend içinde MCP sunucu/istemci kodu | Bulunamadı |
| Flutter (`mobile/lib`) içinde MCP istemcisi | Bulunamadı |
| Express backend (`api/src`) içinde MCP | Yalnız `package-lock.json` içinde dolaylı paket adı geçiyor; sunucu/istemci kodu yok |
| Jeton mini-sitesi (`site/`) içinde MCP | Bulunamadı |

---

## 3. Bilinen sınırlar (dürüstlük notu)

- MCP sunucusu **çalıştırılmadı ve test edilmedi** (`--selftest` dahil) → işlevsel doğrulama `NOT PERFORMED`.
- `mcp-server`'ın okuduğu `docs/API_ENDPOINT_MATRIX.md` belgesinin güncelliği doğrulanmadı; bu belge eski olabilir ve MCP eski bilgi sunuyor olabilir.
