# curl ornekleri

Tum ornekler ortam degiskeni bekler; **hicbir dosyada gercek sir yoktur**.

```bash
export BASE=https://canlifal.com
export EMAIL=...        # sadece kendi test hesabiniz
export PASSWORD=...
export ACCESS_TOKEN=... # 01_login.sh ciktisindan
export ROOM_ID=...
```

| Dosya | Amac |
|---|---|
| 01_login.sh | Mobil giris |
| 02_refresh.sh | Token yenileme |
| 03_rooms.sh | Oda listesi / detay |
| 04_room_sse.sh | Oda SSE akisi |
| 05_presence.sh | Varlik kaydi |
| 06_gifts.sh | Hediye katalogu |
| 07_trtc_usersig.sh | TRTC UserSig |

> Yazma (POST/DELETE) ornekleri yorum satiri olarak birakilmistir; uretim
> veritabaninda yan etki yaratmamak icin bilerek kapalidir.
