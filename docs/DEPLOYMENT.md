# DEPLOYMENT — Dağıtım

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


| Konu | Durum |
|---|---|
| Barındırma | Abacus.AI yönetilen uygulama platformu |
| Üretim adresi | `https://canlifal.com` |
| Sürüm yönetimi | Platform checkpoint + deploy akışı |
| Ortam değişkenleri | Platform tarafından yönetilir; `.env` depoda **yer almaz** |
| Veritabanı | Yönetilen PostgreSQL, havuz sınırı 5 bağlantı (`lib/db.ts:15`) |

## Önizleme ve üretim ayrımı

Checkpoint kaydetmek **yalnızca önizlemeyi** günceller. `canlifal.com` yeni bir dağıtım
çalıştırılana kadar önceki sürümü sunmaya devam eder.

## GitHub deposu ile ilişki — **ÖNEMLİ**

| Kaynak | Durum |
|---|---|
| Çalışan backend (Abacus.AI) | **Tek doğru kaynak** |
| `github.com/mesutbyrm/canlifal` → `main` | Yalnızca 31 baytlık `README.md` — **boş** |
| `github.com/mesutbyrm/canlifal` → `full-source` | Kaynak aynası, **2026-09-23 tarihli — ESKİ** |

Aynanın oluşturulduğu tarihten sonra canlı kodda değişiklikler yapılmıştır (SSE kararlılık düzeltmesi,
reklam ödül uçları vb.). **GitHub içeriği canlı sistemle birebir kabul edilmemelidir.**
