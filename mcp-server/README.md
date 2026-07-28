# CanlıFal Backend MCP Server

Bu, **Cursor** (veya herhangi bir MCP istemcisi) için hazırlanmış, **salt-okunur** bir Model Context Protocol (MCP) sunucusudur. Amaç: Flutter uygulamasının backend ile **birebir (1:1) uyumlu** geliştirilmesi ve **elle API dokümantasyonu tutma ihtiyacının ortadan kalkması**.

Sunucu, cevaplarını doğrudan **canlı backend kaynak dosyalarından** üretir:

- REST API uç noktaları (`app/api/**/route.ts`) + üretilmiş `openapi.json` / `endpoints_index.json`
- Prisma şeması ve veri modelleri (`prisma/schema.prisma`)
- Kimlik doğrulama akışı (`lib/auth-options.ts` web, `lib/mobile-auth.ts` mobil JWT)
- `lib/*` servis/yardımcı katmanı

Cevaplar canlı dosyalardan geldiği için **asla eskimez** — backend değiştiğinde MCP çıktısı da otomatik güncel olur.

> Bu sunucu yalnızca yerel bir geliştirici aracıdır. Yayınlanan (deploy edilen) uygulamanın parçası **değildir** ve hiçbir şeyi değiştirmez (read-only).

---

## Kurulum

```bash
cd mcp-server
npm install
```

Hızlı sağlık kontrolü (MCP el sıkışması olmadan veri katmanını test eder):

```bash
node index.mjs --selftest
```

Beklenen çıktı: `"status": "OK"` ve endpoint / model sayıları.

---

## Cursor'a Ekleme

### Yöntem 1 — Projeye özel (önerilen)

Proje kökünde `.cursor/mcp.json` dosyası oluşturun (bu depoda örnek olarak eklenmiştir). `command` için mutlak yolu kendi makinenize göre düzeltin:

```json
{
  "mcpServers": {
    "canlifal-backend": {
      "command": "node",
      "args": ["/MUTLAK/YOL/fortune_telling_platform/mcp-server/index.mjs"]
    }
  }
}
```

### Yöntem 2 — Global

`~/.cursor/mcp.json` dosyasına aynı `mcpServers` girdisini ekleyin.

Ardından Cursor'ı yeniden başlatın → **Settings → MCP** altında `canlifal-backend` sunucusunun "green/connected" olduğunu doğrulayın. Cursor sohbetinde artık backend hakkında doğrudan soru sorabilir ("list all gift endpoints", "show the User model", "how does mobile auth work") ve araçlar otomatik çağrılır.

---

## Sağlanan Araçlar (Tools)

| Araç | Ne işe yarar |
|------|--------------|
| `list_endpoints` | Uç noktaları listeler (tag / method / auth / adminOnly / search filtreleriyle). |
| `get_endpoint` | Tek bir uç noktanın tüm detayı: index kaydı + OpenAPI + **gerçek `route.ts` kaynağı**. En değerli araç. |
| `search_endpoints` | Path / tag / body alan adları üzerinde arama. |
| `list_models` | Tüm Prisma modelleri ve enum'ları (alan sayılarıyla). |
| `get_model` | Bir modelin/enum'un tam Prisma tanımı + onu referanslayan modeller. |
| `search_schema` | Prisma şema metninde arama. |
| `get_auth_flow` | Kimlik doğrulama akışının özeti + gerçek auth kaynak dosyaları (web + mobil JWT). |
| `read_source` | Depodaki herhangi bir kaynak dosyayı göreli yolla okur (path-traversal korumalı). |
| `list_services` | `lib/*` servis modüllerini tek satırlık özetleriyle listeler. |
| `search_source` | `app/api` + `lib` içinde string/regex arama. |

## Sağlanan Kaynaklar (Resources)

| URI | İçerik |
|-----|--------|
| `schema://prisma` | Canlı Prisma şeması. |
| `openapi://spec` | OpenAPI spesifikasyonu (JSON). |
| `endpoints://index` | Uç nokta index'i (JSON). |
| `docs://<dosya>.md` | `backend-docs/` altındaki tüm Markdown dokümanlar. |

---

## Notlar

- Sunucu **stdio** üzerinden çalışır (Cursor MCP için standart).
- Tüm işlemler **read-only**'dir; hiçbir araç depoyu değiştirmez.
- `node >= 18` gerekir.
- Kaynak dosyalar `nextjs_space/` altından, üretilmiş dokümanlar `backend-docs/` altından okunur; yollar depo içine sabitlenmiştir.
