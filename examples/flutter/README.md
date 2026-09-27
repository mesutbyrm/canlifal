# Flutter ornekleri

Bu dosyalar **referans**tir; uygulamaya oldugu gibi kopyalanmak yerine mevcut
mimariye uyarlanmalidir.

| Dosya | Icerik |
|---|---|
| api_client.dart | Zarfli/duz yanit normalizasyonu + ApiException |
| auth_repository.dart | Giris, token yenileme, 401 uzerine tek seferlik retry |
| sse_client.dart | Kusak (generation) korumali SSE, ustel geri cekilme |
| voice_room_flow.dart | Sesli oda giris/cikis akisi |

Kritik kurallar:
- `sdkAppId` istemcide sabit yazilmaz, `/api/trtc/usersig` yanitindan alinir.
- Odadan cikista `DELETE /presence` cagrilmazsa kullanici 5 dk listede kalir.
- SSE timeout >= 40 sn (sunucu kalp atisi 10-15 sn).
