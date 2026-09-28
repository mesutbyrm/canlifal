# API TESTING — Test Rehberi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Kurallar

1. **Üretim veritabanına test verisi yazılmaz.** Yalnızca salt-okunur `GET` uçları ve test hesapları.
2. Jeton/kredi bakiyesini etkileyen uçlar (hediye, ödeme, üyelik) **canlı ortamda test edilmez**.
3. `pk_create`, `gift_send`, `auth` kovaları hızlı ardışık isteklerde 429 döndürür — testler arasına bekleme koyun.

## Örnek istekler

Hazır betikler: [`examples/curl/`](../examples/curl/)

```bash
# 1) Giriş
curl -s -X POST https://canlifal.com/api/auth/mobile-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<EMAIL>","password":"<PAROLA>"}'

# 2) Yetkili istek
curl -s https://canlifal.com/api/chat/rooms -H "Authorization: Bearer $TOKEN"

# 3) SSE kanalı (10 sn dinle)
curl -N --max-time 10 -H "Authorization: Bearer $TOKEN" \
  https://canlifal.com/api/chat/rooms/<ROOM_ID>/stream
```

## Bu çalışmada yapılan doğrulamalar

| Doğrulama | Sonuç |
|---|---|
| Route envanteri (717 dosya / 1084 metot-uç) | Kaynak ağaçtan programatik olarak çıkarıldı |
| SSE heartbeat/yoklama değerleri | Kaynak koddan okundu |
| TRTC `sdkAppId = 20040423` | Ortam değişkeniyle **eşleşiyor** (maskeli karşılaştırma) |
| Token ömürleri 7g/30g | `lib/mobile-auth.ts:8-9` |
| Yetki yardımcısı taraması | 8 farklı desen, 54 route incelemeye açık |

> **Canlı uçtan uca HTTP testi bu çalışmada yapılmamıştır.** Bu nedenle envanterdeki uçların
> tamamı `KODDAN TESPİT EDİLDİ` etiketlidir, `DOĞRULANDI` değildir.
