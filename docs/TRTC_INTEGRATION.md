# TRTC ENTEGRASYONU (Tencent Real-Time Communication)

> **Kaynak:** Abacus.AI üzerinde çalışan CANLI backend kaynak ağacı (`nextjs_space/`), 2026-09-27 tarihli durum.
> **Üretim yöntemi:** Route dosyaları programatik olarak taranarak (`app/api/**/route.ts`) üretildi; el ile uydurulmuş uç/alan yoktur.
> **Durum etiketleri:** `DOĞRULANDI` (çalışan sistemde test edildi) · `KODDAN TESPİT EDİLDİ` (kaynak koddan okundu, canlı test edilmedi) · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Yapılandırma

TRTC parametreleri **kaynak kodda sabit değildir**, ortam değişkenlerinden okunur:

| Değişken | Kullanım | Kaynak |
|---|---|---|
| `TRTC_SDK_APP_ID` (yedek: `TENCENT_TRTC_SDK_APP_ID`) | SDKAppID | `app/api/trtc/usersig/route.ts:31-35`, `app/api/live/join-room/route.ts:50` |
| `TRTC_SDK_SECRET_KEY` (yedek: `TRTC_SECRET_KEY`, `TENCENT_TRTC_SECRET_KEY`) | UserSig imzalama anahtarı | `app/api/trtc/usersig/route.ts:37-40` |
| `TRTC_EXPIRE` | UserSig ömrü, saniye (**varsayılan 86400 = 24 saat**) | `app/api/trtc/usersig/route.ts:52` |
| `TRTC_WEBHOOK_KEY` | Tencent webhook imza doğrulaması | `app/api/tencent/webhook/route.ts:34` |

> **`sdkAppId: 20040423` iddiası — DOĞRULANDI.** Çalışan ortamdaki `TRTC_SDK_APP_ID` değeri
> `20040423` ile eşleşmektedir (karşılaştırma maskeli yapıldı; gizli anahtar değerleri bu
> dokümanların hiçbirinde yer almaz). Yine de **istemci bu değeri sabit kodlamamalı**, `/api/trtc/usersig`
> yanıtındaki `sdkAppId` alanını kullanmalıdır — ortam değişkeni değiştirilebilir.

## UserSig üretimi

`tls-sig-api-v2` (`TLSSigAPIv2.Api(sdkAppId, secretKey)`) ile sunucu tarafında üretilir.
UserSig **asla istemcide üretilmez**, secret key istemciye gönderilmez.

| Uç | Metot | Yetki | Dönen alanlar |
|---|---|---|---|
| `/api/trtc/usersig` | POST | Bearer JWT | `sdkAppId`, `userId`, `userSig`, `expireTime` |
| `/api/trtc/token` | POST | Bearer JWT | `sdkAppId`, `userId`, `userSig`, `roomId`, `expireTime` |
| `/api/live/create-room` | POST | Bearer JWT | yayın kaydı + gömülü `trtc{sdkAppId,userId,userSig,roomId,expireTime}` |
| `/api/live/join-room` | POST | Bearer JWT | oda bilgisi + `trtc` bloğu |
| `/api/tencent/webhook` | POST | `TRTC_WEBHOOK_KEY` imzası + SDKAppID başlık kontrolü | Tencent olay geri çağrıları |

`TRTC_SDK_APP_ID` veya secret yoksa `/api/live/join-room` **503 `TRTC_NOT_CONFIGURED`** döndürür
(`app/api/live/join-room/route.ts:53-57`).

## Webhook güvenliği

- `sdkappid` başlığı `TRTC_SDK_APP_ID` ile karşılaştırılır; uyuşmazsa **403 `Invalid SDKAppID`**
  (`app/api/tencent/webhook/route.ts:255-260`).
- `TRTC_WEBHOOK_KEY` tanımlı değilse imza kontrolü **atlanır** ve uyarı loglanır
  (`app/api/tencent/webhook/route.ts:40`). Üretimde bu anahtar mutlaka tanımlı olmalıdır. — **Durum: gözden geçirilmeli**

## Flutter tarafı için kurallar

1. Odaya girmeden önce `/api/trtc/usersig` (veya `/api/live/join-room`) çağrılır.
2. `expireTime` (varsayılan 24 saat) dolmadan yenilenmelidir; uzun oturumlarda periyodik yenileme gerekir.
3. `userId` TRTC tarafında uygulama kullanıcı kimliğiyle aynıdır — kendi kimliğinizi uydurmayın.
