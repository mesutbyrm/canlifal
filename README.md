# CanliFal

Sesli oda, canli yayin, fal ve sosyal ozellikleri iceren platformun backend deposu.

## Dokumantasyon

Tek kaynak dokumantasyon dizini: **[`docs/README.md`](./docs/README.md)**

| Konu | Dosya |
|---|---|
| Mimari | [`docs/BACKEND_ARCHITECTURE.md`](./docs/BACKEND_ARCHITECTURE.md) |
| Flutter entegrasyonu | [`docs/FLUTTER_INTEGRATION_GUIDE.md`](./docs/FLUTTER_INTEGRATION_GUIDE.md) |
| Uc referansi | [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) |
| Tam envanter (1080 uc) | [`docs/ENDPOINT_INVENTORY.md`](./docs/ENDPOINT_INVENTORY.md) |
| Kimlik dogrulama | [`docs/AUTHENTICATION.md`](./docs/AUTHENTICATION.md) |
| Gercek zamanli (SSE) | [`docs/REALTIME_SSE.md`](./docs/REALTIME_SSE.md) |
| TRTC | [`docs/TRTC_INTEGRATION.md`](./docs/TRTC_INTEGRATION.md) |
| Hata kodlari | [`docs/ERROR_CODES.md`](./docs/ERROR_CODES.md) |
| OpenAPI | [`openapi/openapi.yaml`](./openapi/openapi.yaml) |

## Hizli baslangic (Flutter)

```bash
export BASE=https://canlifal.com
bash examples/curl/01_login.sh     # accessToken al
bash examples/curl/04_room_sse.sh  # oda SSE akisini dinle
```

Dart referans dosyalari: [`examples/flutter/`](./examples/flutter/)

## Ilkeler

- **Sir yok:** Bu depodaki hicbir dokumanda gercek anahtar/parola **degeri** yoktur;
  yalnizca degisken adi ve dosya/satir referansi verilir.
- **Canli kaynak esastir:** Dokumanlar canli backend kaynagindan uretilmistir;
  GitHub kopyasi ile celiski halinde dokumanlar gecerlidir.
