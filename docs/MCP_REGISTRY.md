# CanlıFal MCP Kayıt Defteri

MCP sunucusu (`mcp-server/`) REST API'den **tamamen ayrıdır**.

- **REST API** → `https://canlifal.com/api/**` — Flutter ve web istemcileri buradan konuşur.
- **MCP** → yerel stdio sunucusu (`canlifal-backend`) — yalnızca yapay zekâ/ajan araçları (ör. Cursor) içindir.
  Flutter veya web **asla** MCP'yi REST gibi çağırmaz.

## Temel ilkeler

| İlke | Durum |
|---|---|
| Araç adları `snake_case` | ✅ Uygun |
| Araç adlarında sürüm (v1/v2) yok | ✅ Uygun |
| MCP iş mantığını kopyalamıyor | ✅ Uygun — araçlar salt-okunur, kaynak/şema/belge okur, veri değiştirmez |
| Yinelenen araç | ✅ Yok |

## Araçlar

| Araç | Amacı | Kullandığı kaynak | Durum |
|---|---|---|---|
| `list_endpoints` | Tüm uç noktaları listeler | `backend-docs/endpoints_index.json` | Aktif |
| `get_endpoint` | Tek bir ucun ayrıntısı | Uç nokta dizini + kaynak dosya | Aktif |
| `search_endpoints` | Uç noktalarda arama | Uç nokta dizini | Aktif |
| `list_models` | Veri modellerini listeler | Şema dosyası | Aktif |
| `get_model` | Tek bir modelin ayrıntısı | Şema dosyası | Aktif |
| `search_schema` | Şemada arama | Şema dosyası | Aktif |
| `get_auth_flow` | Kimlik doğrulama akışını açıklar | `lib/mobile-auth`, `lib/auth-options` | Aktif |
| `read_source` | Belirtilen kaynak dosyayı okur | Depo dosyaları | Aktif |
| `list_services` | Ortak servis katmanını listeler | `lib/` | Aktif |
| `search_source` | Kaynak kodda arama | Depo dosyaları | Aktif |

## Kaynaklar (resources)

| URI | İçerik |
|---|---|
| `schema://prisma` | Canlı veri şeması |
| `openapi://spec` | OpenAPI tanımı |
| `endpoints://index` | Uç nokta dizini |

> Not: MCP araçları uç nokta dizinini okuduğu için, uç noktalarda yapılan her
> birleştirme belge üretim betikleri çalıştırıldığında MCP tarafına otomatik yansır.
