# MCP_CLEANUP_REPORT.md — MCP Temizlik Değerlendirmesi

> **AŞAMA A çıktısı — HİÇBİR ŞEY SİLİNMEDİ.** Aşağıdaki değerlendirme yalnızca öneri niteliğindedir; uygulama Aşama C'de ve kullanıcı onayıyla yapılır.

## 1. Değerlendirme tablosu

| MCP | Durum | Kanıt | Öneri |
|---|---|---|---|
| `canlifal-backend` (`mcp-server/index.mjs`) | Geliştirme aracı, üretimde kullanılmıyor | `.cursor/mcp.json` dışında hiçbir yerden referans yok; Flutter'da MCP istemcisi yok; sunucunun kendi yanıtı "Runtime MCP: not used by Flutter" diyor | **KORU** — üretim davranışını etkilemiyor, silmenin faydası yok, riski var (geliştirici aracı kaybı) |

## 2. Ölü/duplicate MCP var mı?

**Hayır.** Tarama sonucunda:

- İkinci bir MCP sunucusu **yok** → duplicate temizliği gerekmiyor.
- Çalışma zamanında MCP çağıran hiçbir kod **yok** → ölü MCP bağımlılığı riski yok.
- Kullanıcının "ölü MCP'leri temizle" hedefi bu proje için **konusuz**: temizlenecek ölü MCP bulunamadı.

## 3. Tespit edilen tek gerçek sorun

`.cursor/mcp.json` mutlak yol kullanıyor:

```
"args": ["/workspace/mcp-server/index.mjs"]
```

Bu yol yalnızca belirli bir geliştirme konteynerinde geçerlidir; başka bir makinede MCP sunucusu **başlamaz**. Göreli yola çevrilmesi düşük riskli bir iyileştirmedir.

**Sınıf:** `LOW-RISK-FIX` · **Aşama:** C veya E · **Veri kaybı riski:** yok · **Geri alma:** tek satır geri yazma.

## 4. İkinci sorun — MCP'nin beslendiği belgeler eski olabilir

MCP araçlarının tamamı `docs/API_ENDPOINT_MATRIX.md` ve 3 denetim belgesini okuyor. Bu belgelerin güncelliği **doğrulanmadı**. Aşama A'da üretilen `API_INVENTORY.md` gerçek kod taramasına dayandığı için daha güvenilirdir.

**Öneri:** MCP'nin veri kaynağı Aşama F'de `API_INVENTORY.md`'ye yönlendirilebilir. Bu bir *iyileştirme*dir, temizlik değildir.

## 5. Tek MCP kataloğu hedefi

Kullanıcının "TEK MCP KATALOĞU" hedefi açısından mevcut durum zaten tek katalogludur: **1 sunucu, 5 araç, 4 kaynak.** Yapılacak iş, kataloğun içeriğini güncel tutmaktır — yeni MCP eklemek veya var olanı bölmek değil.
