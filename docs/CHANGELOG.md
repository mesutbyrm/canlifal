# CHANGELOG — Doküman Değişiklikleri

## 2026-09-27 (üçüncü tur — düzeltme önerileri)

- Yeni belge: `docs/FIX_PROPOSALS.md` — açık iki ürün hatası için kaynak koddan kanıtlanmış
  kök neden analizi ve somut düzeltme önerileri.
- PK daveti: üç giriş noktasının `create` adımında **farklı** olay yolları kullandığı tespit edildi
  (`video-streams/pk` yalnız yayın yoluna, `chat/rooms/[roomId]/pk` yalnız sohbet yoluna yazıyor).
- Varlık: `heartbeat` ucunun 60 sn temizlik yaparken 300 sn pencereyle sayım yaptığı tespit edildi.

> Bu turda da **hiçbir backend kodu değiştirilmemiş**, dağıtım yapılmamıştır.

## 2026-09-27 (ikinci tur — canlı doğrulama)

- **110 herkese açık GET ucu** üretimde gerçek HTTP ile çağrıldı: 85 × 200, 17 × 401, 8 × 400, 0 hata.
- **20 kimlik gerektiren salt-okuma ucu** test hesabıyla çağrıldı: 14 × 200.
- `/api/notifications/stream` SSE akışı canlı gözlendi: `connected` karesi + `: heartbeat`.
- SSE olay adlarının `event:` alanıyla değil `data.type` ile taşındığı tespit edildi.
- Yetki denetimi düzeltildi: yetki izi bulunmayan uç sayısı **54 → 15**; dört uç yanlış alarm olarak kapatıldı.
- Yeni belge: `docs/LIVE_VERIFICATION.md`.

> Bu turda da **hiçbir backend kodu değiştirilmemiş** ve **üretime hiçbir yazma yapılmamıştır**.

## 2026-09-27

- Canlı backend kaynak ağacından **programatik envanter** üretildi: 717 route dosyası, 1084 metot-uç.
- SSE heartbeat/yoklama değerleri koddan doğrulanarak belgelendi (oda kanalı heartbeat **10 sn**).
- TRTC `sdkAppId = 20040423` iddiası ortam değişkeniyle karşılaştırılarak **doğrulandı**.
- Token ömürleri (7 gün / 30 gün) ve yenileme tekilleştirmesi (15 sn) belgelendi.
- Yetki taraması: 8 desen; 54 durum değiştiren route el ile incelemeye alındı.
- Açık iki hata (PK daveti iletimi, 5 dakikalık varlık penceresi) belgelenip önerilerle kayda geçirildi.
- OpenAPI 3.0 taslağı route envanterinden üretildi.

> Not: Bu tur **hiçbir backend kodu değiştirmemiştir**; yalnızca dokümantasyon üretilmiştir.
