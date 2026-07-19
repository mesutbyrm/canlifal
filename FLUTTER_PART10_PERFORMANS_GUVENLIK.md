# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 10 — PERFORMANS & GÜVENLİK OPTİMİZASYONLARI

> **Kaynak:** %100 gerçek backend davranışı (cache katmanı, JWT, rate limit, upload). **Önceki:** PART 9.

---

## 1. İSTEK KATMANI (tek merkez)
Tüm HTTP tek bir `ApiClient` üzerinden geçer: base URL, JWT ekleme, zarf parse, hata standardı, otomatik token yenileme.
```dart
class ApiClient {
  Future<Map> _send(String method, String path, {Map? body}) async {
    var res = await _raw(method, path, body);
    if (res.statusCode == 401) { await _refresh(); res = await _raw(method, path, body); }
    final json = jsonDecode(res.body);
    if (json is Map && json['success'] == false) throw ApiException(json['error']?['message'] ?? 'Hata');
    return json is Map ? json : {'data': json};
  }
}
```

## 2. TOKEN YAŞAM DÖNGÜSÜ (PART 1)
- Access token 7 gün, refresh token 30 gün. `flutter_secure_storage`'da sakla — asla SharedPreferences/plain dosya.
- 401'de `POST /api/auth/mobile-refresh` ile yenile; başarısızsa login'e at.
- Cihaz doğrulama: `POST /api/auth/verify-device`, `POST /api/auth/reclaim-device`.
> **Güvenlik:** TRTC secret, Abacus key, DB Flutter'da **yok**. Sadece JWT taşınır.

## 3. ÖNBELLEK (client-side)
- Backend zaten cache'liyor (jeton paketleri, ödeme yöntemleri 10 sn+, video listesi 10 sn). Client'ta:
  - Statik listeler (fal menüsü, hediye türleri, config) bellek + kısa TTL cache.
  - Görseller `cached_network_image` ile disk cache.
- Cache invalidasyonu: kullanıcı pull-to-refresh yapınca zorla yenile.

## 4. GERÇEK ZAMANLI VERİMİ
- SSE tercih edilir (WebSocket değil — backend SSE tabanlı). Tek SSE bağlantısı aç, ekran kapanınca kapat.
- Reconnect: exponential backoff (1s, 2s, 4s... max 30s). `Last-Event-ID` ile kaldığı yerden devam.
- Presence: 25 sn heartbeat (PART 4). Uygulama arka plana düşinde SSE'yi askıya al.

## 5. RATE LİMİT (backend enforced)
- Hediye gönderme gibi ağır işlemlerde backend `heavyLimiter` uygular (örn. `gift:${userId}`). 429 alınırsa Flutter Тürkçe "Çok hızlı işlem, lütfen bekleyin" gösterir ve butonu kısa süre disable eder.
- Debounce: mesaj/hediye/beğeni butonlarına client-side debounce ekle.

## 6. DOSYA YÜKLEME (S3 presigned)
- Akış: `POST /api/upload/presigned` (veya `/api/upload/get-url`) → presigned PUT URL + `cloud_storage_path`.
- ≤100MB tek parça; büyük video (short-videos) için `POST /api/short-videos/upload-url` (multipart).
- Yüklemeden sonra sadece `cloud_storage_path` backend'e gönder. Local kayıt yok.
- İndirme: URL'i tarayıcı/indirici ile aç, fetch etme (CORS).

## 7. LİSTE & RENDER PERFORMANSI
- `ListView.builder`/`SliverList` + sayfalama (backend `page`/`limit`). Sonsuz kaydırma.
- Ağır animasyonları (hediye) ekran görünürken çalıştır; arka planda durdur.
- Skeleton shimmer (PART 2 §8) — boş ekran gösterme.

## 8. HATA & OFFLINE
- Global hata yakalayıcı: tüm `ApiException` mesajları Тürkçe snackbar. Beklenmeyen hatada genel "Bir hata oluştu".
- Offline banner + otomatik retry. Kritik ekranları (oturum/oda) bağlantı kopunca uyar.

## 9. KALİTE KONTROL
- [ ] Token `flutter_secure_storage`'da; 401'de otomatik refresh.
- [ ] Hiçbir gizli anahtar client'ta yok.
- [ ] SSE tek bağlantı + backoff reconnect + arka plan askıya alma.
- [ ] 429'da kullanıcıya Тürkçe uyarı + buton debounce.
- [ ] Upload presigned; local dosya saklanmıyor.

**Sonraki:** PART 11 — 2026 Premium Özellikler.
