# STAGE 16 — FLUTTER FIX PLAN

**Kapsam:** Yalnızca Flutter mobil uygulama kaynağı (`mobile/`).
**Referans:** canlifal.com production backend (Stage 15 durumu).
**BACKEND CHANGES = 0** — hiçbir backend dosyası değiştirilmedi, yeni endpoint/API sözleşmesi oluşturulmadı. Backend kodu yalnızca **okundu** (davranış doğrulaması için).

**Çıktılar**
- Uygulanabilir yama: `docs/STAGE16_FLUTTER_FIXES.patch` (mobil repo kökünde `git apply -p1` veya `patch -p1`)
- Bu plan: `docs/STAGE16_FLUTTER_FIX_PLAN.md`

**Yama kapsamı:** 26 dosya (25 × `lib/`, 1 × `test/`); 4 dosya silindi. Build/tooling artefaktları (`local.properties`, `Generated*.xcconfig`, `GeneratedPluginRegistrant.*`) yamadan çıkarıldı.

**Doğrulama:** yama boş baseline kopyasına uygulandı (`patch -p1`) ve sonuç ağacı, testleri geçen çalışma ağacıyla **birebir aynı** çıktı.

---

## 1. PK isteklerinin yanlış origin'e gitmesi

| | |
|---|---|
| **DOSYA** | `lib/core/network/api_backend_router.dart` |
| **FONKSİYON** | `_isVoiceRoomPkBackendPath` (kaldırıldı), `_voicePkRe` (kaldırıldı), `_isLiveGamesBackendPath` |
| **MEVCUT** | `/api/chat/rooms/{id}/pk*` yolları Games origin'ine yönlendiriliyordu. `/api/live/pk` de Games origin'ine gidiyordu. |
| **BEKLENEN** | PK yazma işlemleri, PK olaylarını yayınlayan SSE kaynağıyla **aynı** origin'de (ana backend) oluşmalı. Canlı probe: `/api/chat/rooms/{id}/pk` → main 200; `/api/live/pk` → main 200 / games 404; yalnız `/api/live/pk/active` ve `/api/live/guest/*` games origin'inde 200. |
| **DEĞİŞİKLİK** | Sesli oda PK kuralı ve regex'i kaldırıldı (gerekçe yorumu bırakıldı). `_isLiveGamesBackendPath` daraltıldı: sadece `/api/live/pk/active` ve `/api/live/guest/`. `_isPkBackendPath`, `_isGiftBattleBackendPath`, `_isMembershipBackendPath`, `_isGameBackendPath` **dokunulmadı**. |
| **TEST** | `test/core/network/api_backend_router_test.dart` güncellendi: `/api/chat/rooms/cm123/pk` (GET+POST), `/pk/score`, `/api/live/pk?roomId=abc` → `main`; `/api/live/pk/active` → `games`. `flutter test test/core/network/` → **passed**. |

---

## 2. PK istek gövdesinin backend sözleşmesine uymaması

| | |
|---|---|
| **DOSYA** | `lib/features/voice_hub/data/datasources/pk_battle_remote_datasource.dart` |
| **FONKSİYON** | `inviteVoiceRoom`, `_respondInvite`, `endBattle`, yeni `_postPkAction`, yeni `cancelBattle` |
| **MEVCUT** | Davet için 3 farklı gövde/uç ardışık deneniyordu ("shotgun"): farklı alan adları ve `/pk/{id}/respond`, `/pk/{id}/end` gibi backend'de **404** dönen yollar. |
| **BEKLENEN** | Backend sözleşmesi tek: `POST /api/chat/rooms/{roomId}/pk` gövde `{action, targetRoomId?, battleId?, duration?}`, geçerli action'lar `create / accept / reject / cancel / end`. |
| **DEĞİŞİKLİK** | Tek ortak yardımcı `_postPkAction({roomId, alternateRoomId, body})` eklendi; tek uç `ApiEndpoints.chatRoomPk(key)`. Yalnızca **404/405** durumunda alternatif oda anahtarı denenir; **400/403** doğrudan yukarı fırlatılır (sessiz yutma yok). `inviteVoiceRoom` → `{action:'create', targetRoomId, duration}`; `_respondInvite` → `{action, battleId}`; `endBattle` → `{action:'end', battleId}`; yeni `cancelBattle` → `{action:'cancel', battleId}`. Kullanılmayan `live_field_api_remote_datasource.dart` importu silindi. |
| **TEST** | `flutter analyze` 0 hata; tam test paketi geçti. Gerçek PK akışı fiziksel cihaz gerektirdiği için **NOT PERFORMED**. |

---

## 3. Ölü Socket.IO istemcileri (backend'de karşılığı yok)

| | |
|---|---|
| **DOSYA** | **Silindi:** `lib/features/voice_hub/data/services/pk_battle_socket_service.dart`, `lib/features/voice_hub/data/services/voice_room_gift_socket.dart`, `lib/features/live/data/services/live_gift_socket_bridge.dart`, `lib/features/voice_hub/presentation/providers/voice_pk_owned_rooms_socket_provider.dart` |
| **FONKSİYON** | Bu servisleri kuran/tüketen tüm çağrı noktaları |
| **MEVCUT** | Uygulama, ana backend origin'inde **var olmayan** `/socket.io/` uçlarına bağlanmaya çalışıyor, sürekli yeniden bağlanma denemesi yapıyor ve olay almadığı için PK/hediye state'i güncellenmiyordu. |
| **BEKLENEN** | Sesli oda PK ve hediye olayları SSE üzerinden geliyor; bu Socket.IO yolları ölü koddur. |
| **DEĞİŞİKLİK** | 4 dosya silindi; referanslar temizlendi: `pk_battle_remote_provider.dart` (socket alanları/metotları/`onDispose` kaldırıldı, `build() => null`, **`ingestSseBattle` korundu**), `voice_pk_battle_page.dart`, `pk_invite_page.dart`, `voice_room_basic_premium_section.dart`, `chat_room_providers_entry.dart`, `chat_room_providers.dart`, `chat_room_providers_sse.dart`, `chat_room_providers_gift.dart` (`_startGiftSocket` tamamen kaldırıldı), `voice_gift_providers.dart`, `live_gift_providers.dart`, `live_room_providers.dart`, `live_pk_battle_page.dart`, `voice_pk_invite_listener.dart`. `chat_room_providers.dart` içinde `applyPresenceSnapshot` imzası `List<ChatPresenceRow>` → `List<ChatRoomPresence>` olarak düzeltildi (typedef silinen dosyadaydı). |
| **KORUNAN** | `live/data/services/live_namespace_socket_service.dart`, `live_namespace_providers.dart`, `live_pk_owned_streams_socket_provider.dart`, `live/data/pk/pk_match_sse_service.dart`, `voice_room_socket_helper.dart` — bunlar Games origin'inde gerçekten çalışan `/socket.io/` üzerinden kullanılıyor. |
| **TEST** | `flutter analyze --no-pub` → **0 error, 0 warning**; tam test paketi geçti; `flutter build apk --debug` başarılı. |

---

## 4. Backend'de 404 dönen uçların çağrılması

| | |
|---|---|
| **DOSYA** | `lib/core/network/api_endpoints.dart`, `lib/features/voice_hub/music/data/datasources/room_music_remote_datasource.dart`, `lib/features/live/data/datasources/live_api_remote_datasource.dart`, `lib/features/voice_hub/data/datasources/chat_room_remote_datasource.dart`, `lib/features/live_psychics/data/repositories/live_psychics_remote_datasource.dart` |
| **FONKSİYON** | `chatRoomCurrentSong`, `chatRoomMusicStream`, `livePkSweep`, `resolveStreamUrl`, `sweepPk`, `joinSeat`, `fetchIncomingRequests` |
| **MEVCUT** | Var olmayan uçlara istek: `/current-song`, `/music-stream`, `/api/live/pk/sweep`; `joinSeat` önce 404 dönen yolu deniyordu; `fetchIncomingRequests` iki adet 404 ucu deniyordu. |
| **BEKLENEN** | Yalnızca canlı backend'de gerçekten var olan uçlar çağrılmalı; gereksiz 404 turu yapılmamalı. |
| **DEĞİŞİKLİK** | `chatRoomCurrentSong(roomId)` artık `chatRoomMusic(roomId)` döndürüyor (yanıt gövdesi aynı `nowPlaying` şeklini içeriyor); `chatRoomMusicStream` ve `livePkSweep` sabitleri silindi; `resolveStreamUrl` içindeki `music-stream` POST bloğu kaldırıldı (yalnız `chatYoutubeStream` GET kaldı); `sweepPk` metodu kaldırıldı; `joinSeat` sıralaması `seatsPath(key)` önce olacak şekilde değiştirildi; `fetchIncomingRequests` uç listesinden `liveFalPending` ve `fortuneTellerIncomingSessions` çıkarıldı (2 çalışan uç kaldı). |
| **TEST** | `flutter analyze` 0 hata; tam test paketi geçti. |

---

## 5. Aşırı agresif polling

| | |
|---|---|
| **DOSYA** | `lib/features/live/presentation/pages/live_pk_battle_page.dart`, `lib/features/voice_hub/presentation/widgets/voice_pk_invite_listener.dart` |
| **FONKSİYON** | `_pollPk`, PK davet dinleyicisi timer'ı |
| **MEVCUT** | 3 saniyede bir sürekli istek — pil ve backend yükü. |
| **BEKLENEN** | SSE birincil kanal olduğundan polling yalnızca yedek; daha uzun aralık yeterli. |
| **DEĞİŞİKLİK** | `_pollPk` 3 sn → **8 sn**; davet dinleyicisi 3 sn → **10 sn** (ikisine de gerekçe yorumu eklendi). |
| **TEST** | `flutter analyze` 0 hata; tam test paketi geçti. Süre davranışının saha ölçümü **NOT PERFORMED**. |

---

## 6. Games origin 401'inin oturumu düşürmesi

| | |
|---|---|
| **DOSYA** | `lib/core/network/dio_provider.dart` |
| **FONKSİYON** | `onError` (401 handler) |
| **MEVCUT** | Herhangi bir origin'den gelen 401, ana backend token refresh akışını tetikliyordu; Games origin'inden gelen 401 gereksiz refresh/oturum kaybına yol açabiliyordu. |
| **BEKLENEN** | Refresh yalnızca ana backend origin'inden gelen 401'lerde tetiklenmeli. |
| **DEĞİŞİKLİK** | `mainHost = Uri.parse(Env.apiBaseUrl).host`, `reqHost = e.requestOptions.uri.host`, `isMainOrigin = reqHost.isEmpty || reqHost == mainHost` kontrolü eklendi; refresh yalnız `isMainOrigin` iken çalışıyor. |
| **TEST** | `flutter analyze` 0 hata; tam test paketi geçti. Canlı token süresi dolma senaryosu **NOT PERFORMED**. |

---

## 7. Hediye tutar alanları — **DEĞİŞİKLİK YOK**

**Gerekçe:** Audit sırasında `receiverAmount` / `siteAmount` alanlarının Flutter'da beklendiği fakat SSE olayında görünmediği not edilmişti. Backend kodu okunduğunda bu alanların hediye SSE payload'ında **hiç üretilmediği** doğrulandı. Flutter tarafındaki parse zinciri bu alanlar yokken null-safe çalışıyor ve UI bozulmuyor. Alan uydurmak (kullanıcı kuralı 4) veya backend'i değiştirmek (kural 1) yasak olduğundan **kod değiştirilmedi**. Bu, backend tarafında ayrı bir karar gerektiren açık bir maddedir.

## 8. SSE olay kapsaması — **DEĞİŞİKLİK YOK**

**Gerekçe:** Backend'in yaydığı SSE olay adları ve alias'ları ile Flutter'ın dinlediği set karşılaştırıldı; kapsama tam ve state uygulaması (`ingestSseBattle` dahil) doğru. Gereksiz değişiklik yapılmadı (kullanıcı kuralı 6).

---

## Test Sonuçları (gerçek çalıştırmalar)

| Adım | Komut | Sonuç |
|---|---|---|
| Bağımlılıklar | `flutter pub get` | **OK** |
| Statik analiz | `flutter analyze --no-pub` | **0 error, 0 warning**, 325 info (lint/stil; büyük kısmı baseline'dan gelen test dosyası uyarıları) |
| Birim/widget testleri | `flutter test --no-pub` (tam paket) | **exit 0** — `+404 ~2`, “All other tests passed!”, **0 failure**, 2 skipped |
| Android derleme | `flutter build apk --debug --no-pub` | **exit 0** — `✓ Built build/app/outputs/flutter-apk/app-debug.apk` |
| Yama doğrulama | `patch -p1` (temiz baseline üzerine) | **OK**, sonuç ağacı çalışma ağacıyla birebir aynı |
| TRTC ses/görüntü E2E | fiziksel Android cihaz | **NOT PERFORMED** — ortamda fiziksel cihaz/emülatör yok |
| Canlı PK / hediye akışı E2E | fiziksel cihaz + iki hesap | **NOT PERFORMED** |

---

## Sonuç

```
BACKEND CHANGES = 0
FLUTTER BACKEND PARITY = NOT COMPLETE
```

**Neden NOT COMPLETE:** Kod düzeyindeki tüm uyumsuzluklar (origin yönlendirme, PK sözleşmesi, ölü soketler, 404 uçlar, polling, 401 kapsamı) düzeltildi ve statik analiz + test + derleme yeşil. Ancak PK, hediye ve TRTC ses/görüntü akışlarının **gerçek cihaz üzerinde uçtan uca doğrulaması yapılamadı**; ayrıca madde 7 (hediye tutar alanları) backend tarafında açık bir karar olarak duruyor. Bu iki koşul karşılanmadan parity **COMPLETE** ilan edilemez.
