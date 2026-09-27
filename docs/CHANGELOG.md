# CHANGELOG — Doküman Değişiklikleri

## 2026-09-27

- Canlı backend kaynak ağacından **programatik envanter** üretildi: 717 route dosyası, 1084 metot-uç.
- SSE heartbeat/yoklama değerleri koddan doğrulanarak belgelendi (oda kanalı heartbeat **10 sn**).
- TRTC `sdkAppId = 20040423` iddiası ortam değişkeniyle karşılaştırılarak **doğrulandı**.
- Token ömürleri (7 gün / 30 gün) ve yenileme tekilleştirmesi (15 sn) belgelendi.
- Yetki taraması: 8 desen; 54 durum değiştiren route el ile incelemeye alındı.
- Açık iki hata (PK daveti iletimi, 5 dakikalık varlık penceresi) belgelenip önerilerle kayda geçirildi.
- OpenAPI 3.0 taslağı route envanterinden üretildi.

> Not: Bu tur **hiçbir backend kodu değiştirmemiştir**; yalnızca dokümantasyon üretilmiştir.
