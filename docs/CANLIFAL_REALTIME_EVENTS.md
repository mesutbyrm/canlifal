# CanlıFal — Gerçek Zamanlı Olay Kataloğu

> **Sürüm:** 1.0.0  
> **Tarih:** 2026-08-27  
> **Kapsam:** Tüm SSE kanallarından yayınlanan olayların tam sözleşmesi.

---

## İçindekiler

1. [Genel Mimari](#1-genel-mimari)
2. [Bağlantı ve Yaşam Döngüsü](#2-bağlantı-ve-yaşam-döngüsü)
3. [Sohbet Odası Kanalı](#3-sohbet-odası-kanalı)
4. [Video Yayın Kanalı](#4-video-yayın-kanalı)
5. [Falcı Seans Odası Kanalı](#5-falcı-seans-odası-kanalı)
6. [Falcı Talep Kanalı](#6-falcı-talep-kanalı)
7. [Bildirim Kanalı](#7-bildirim-kanalı)
8. [PK Maç Kanalı](#8-pk-maç-kanalı)
9. [Fal Yanıt Kanalları](#9-fal-yanıt-kanalları)
10. [Hata Yönetimi ve Genel Kurallar](#10-hata-yönetimi-ve-genel-kurallar)

---

## 1. Genel Mimari

| Özellik | Değer |
|---|---|
| Protokol | Server-Sent Events (SSE) |
| Aktarım | `text/event-stream; charset=utf-8` |
| Kimlik doğrulama | `Authorization: Bearer <jwt>` (mobil) VEYA NextAuth oturum çerezi (web) |
| Heartbeat | `: heartbeat\n\n` — her 15 saniyede |
| Olay kimliği | `id: <epoch-ms>\n\n` — yalnızca sohbet odası kanalında |
| Yeniden bağlanma | `Last-Event-ID` başlığı VEYA `?lastEventId=<epoch-ms>` sorgu parametresi |
| Replay tamponu | 2 dakika / 200 olay (bellek içi halka tamponu) |
| İstemci zaman aşımı | Flutter: 45 sn (heartbeat yoksa yeniden bağlan) |

### Kanallar Özeti

| Kanal | Uç Nokta | Kimlik | Olaylar |
|---|---|---|---|
| Sohbet odası | `/api/chat/rooms/{roomId}/stream` | Zorunlu | message, presence, typing, system, gift, pk, room_event, dj |
| Video yayın | `/api/video-streams/{streamId}/stream` | İsteğe bağlı | connected, streamMessage, viewerCount, streamEnded, gift, pk, guest |
| Falcı seans | `/api/room/{sessionId}/stream` | Zorunlu | connected, message, timer_started, time_extended, session_ended, system |
| Falcı talep | `/api/fortune-tellers/sessions/stream` | Zorunlu | connected, pending_sessions, session_request, session_cancelled |
| Bildirim | `/api/notifications/stream` | Zorunlu | connected, notification |
| PK maç | `/api/pk/{matchId}/stream` | Yok (public) | connected, pk |
| Fal yanıt | `/api/fortunes/{falTipi}` | Zorunlu | LLM akış parçaları |

---

## 2. Bağlantı ve Yaşam Döngüsü

### `connected`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `connected` |
| **NE ZAMAN GÖNDERİLİR** | SSE bağlantısı kurulduğunda, ilk olay olarak |
| **KİM ALIR** | Bağlanan istemci |
| **YETKİ** | Kanal bazlı (bkz. kanal tablosu) |
| **YÜK (PAYLOAD)** | Kanala göre değişir: sohbet → `{type, roomId, userId, nickname, onlineCount}`; video yayın → `{type, streamId}`; falcı seans → `{type, sessionId, role, status, timerStartedAt}`; falcı talep → `{type, tellerId, isOnline}`; bildirim → `{type, unreadCount}`; PK → `{type, matchId}` |
| **SIRALAMA** | Her zaman ilk olay |
| **YENİDEN DENEME** | Yeniden bağlanmada tekrar gönderilir |
| **KOPYA İŞLEME** | İdempotent; istemci mevcut durumu sıfırlar |
| **İSTEMCİ AKSİYONU** | Bağlantı durumunu "bağlı" olarak güncelle; başlangıç verilerini UI'a uygula |

---

## 3. Sohbet Odası Kanalı

**Uç:** `GET /api/chat/rooms/{roomId}/stream`  
**Kimlik:** Zorunlu (JWT veya oturum)  
**Poll aralığı:** 2 saniye  
**Bellek tamponu:** 200 olay / 2 dakika TTL (lib/chat-events.ts)  
**SSE `id:`:** En son tüketilen olayın epoch-ms zaman damgası

### 3.1 `message`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `message` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı sohbet odasına mesaj gönderdiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "message", id, content, userId, userName, userImage, seatIndex, chatRole, roleSymbol, isAdmin, createdAt, messageType?, replyTo?, media?, stickerUrl?}` |
| **SIRALAMA** | `timestamp` (epoch-ms) sıralı; istemci `id:` alanıyla takip eder |
| **YENİDEN DENEME** | Replay tamponu içindeyse `Last-Event-ID` ile otomatik |
| **KOPYA İŞLEME** | `id` (mesaj kimliği) ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Mesajı sohbet listesine ekle; kullanıcı alt kısımdaysa otomatik kaydır |

### 3.2 `presence`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `presence` |
| **NE ZAMAN GÖNDERİLİR** | Her 10 saniyede bir (5 poll döngüsü × 2 sn) tam anlık görüntü |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "presence", users: [{id, name, image, nickname, lastSeen, seatIndex, micOn, chatRole, roleSymbol, roleLevel, isAdmin}], onlineCount, totalCount}` |
| **SIRALAMA** | Her veri tam anlık görüntüdür; sıralama önemsiz |
| **YENİDEN DENEME** | Yeniden bağlanmada sonraki 10 sn döngüsünde otomatik gelir |
| **KOPYA İŞLEME** | Tam değiştirme (replace) — eski listeyi tamamen sil, yenisini uygula |
| **İSTEMCİ AKSİYONU** | Çevrimiçi kullanıcı listesini ve koltuk haritasını güncelle |

### 3.3 `typing`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `typing` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı yazı yazmaya başladığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler (yazanın kendisi hariç — sunucu filtreler) |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "typing", userId, nickname}` |
| **SIRALAMA** | Sıralama önemsiz; 3 sn penceresi içinde gruplanır |
| **YENİDEN DENEME** | Geçici sinyal; replay gerekmez |
| **KOPYA İŞLEME** | Aynı kullanıcıdan 3 sn içinde gelen kopyalar birleştirilir |
| **İSTEMCİ AKSİYONU** | "X yazıyor..." göstergesi göster; 3 sn sonra otomatik gizle |

### 3.4 `system`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `system` |
| **NE ZAMAN GÖNDERİLİR** | Sistem mesajları: oda ayarı değişikliği, kullanıcı susturma/ban, duyuru |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "system", message, action?, targetUserId?, duration?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | Mesaj metni + zaman damgası ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Sistem mesajını sohbet akışında özel stil ile göster; `action` varsa ilgili UI güncellemesi yap |

### 3.5 `gift`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `gift` |
| **NE ZAMAN GÖNDERİLİR** | Sohbet odasına hediye gönderildiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "gift", giftId, giftName, giftImage, giftAnimation, senderId, senderName, senderImage, receiverId, receiverName, quantity, totalPrice, combo?, comboCount?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `giftId` (ChatRoomGift kaydı) ile tekilleştir; animasyonu çift tetikleme |
| **İSTEMCİ AKSİYONU** | Hediye animasyonunu oynat; kombo sayacını güncelle; sohbet akışına hediye mesajı ekle |

### 3.6 `pk`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `pk` |
| **NE ZAMAN GÖNDERİLİR** | PK savaşı başladığında, skor güncellendiğinde, iptal/bitiş olduğunda |
| **KİM ALIR** | Her iki odadaki tüm bağlı istemciler (stream1Id + stream2Id) |
| **YETKİ** | İlgili odaya giriş izni olan herkes |
| **YÜK** | `{type: "pk", battleId, action, ...}` — `action` değerleri: |
| | • `pk_start` → `{battleId, room1Id, room2Id, room1Name, room2Name, duration, startsAt}` |
| | • `score_update` → `{battleId, score1, score2, addedAmount, addedSide}` |
| | • `pk_end` → `{battleId, winnerId, score1, score2, status}` |
| | • `pk_cancel` → `{battleId, reason}` |
| **SIRALAMA** | `battleId` + `action` sırası ile deterministik |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `battleId` + `action` çifti ile tekilleştir |
| **İSTEMCİ AKSİYONU** | PK UI'ı göster/güncelle; skor çubuğunu animasyonla güncelle; bitiş/iptal durumunda sonuç ekranı göster |

### 3.7 `room_event`

`room_event`, sesli sohbet odası olaylarını taşıyan zarf tipidir. Gerçek olay türü `event` alanında belirtilir.

#### 3.7.1 `user_joined`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "user_joined"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı sesli sohbet odasına katıldığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "user_joined", roomId, userId, name, image, ts}` |
| **SIRALAMA** | `ts` (epoch-ms) sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | "X odaya katıldı" bildirimi göster; kullanıcı listesine ekle |

#### 3.7.2 `user_left`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "user_left"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı sesli sohbet odasından ayrıldığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "user_left", roomId, userId, name, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | "X ayrıldı" bildirimi göster; kullanıcı listesinden çıkar |

#### 3.7.3 `mic_changed`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "mic_changed"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı mikrofonunu açtığında/kapattığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "mic_changed", roomId, userId, micOn, name, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir; en son durumu uygula |
| **İSTEMCİ AKSİYONU** | Koltuk haritasında mikrofon simgesini güncelle |

#### 3.7.4 `seat_changed`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "seat_changed"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı koltuk değiştirdiğinde veya koltuğa oturduğunda/kalktığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "seat_changed", roomId, userId, seatIndex, previousSeatIndex, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Koltuk haritasında kullanıcıyı yeni konuma taşı |

#### 3.7.5 `room_closed`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "room_closed"` |
| **NE ZAMAN GÖNDERİLİR** | Oda sahibi odayı kapattığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "room_closed", roomId, ts}` |
| **SIRALAMA** | Son olay; sonrasında kanal kapanır |
| **YENİDEN DENEME** | Gerekli değil — oda artık mevcut değil |
| **KOPYA İŞLEME** | İdempotent; çift alınsa da aynı etki |
| **İSTEMCİ AKSİYONU** | "Oda kapatıldı" mesajı göster; SSE bağlantısını kes; oda listesine yönlendir |

#### 3.7.6 `owner_changed`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "owner_changed"` |
| **NE ZAMAN GÖNDERİLİR** | Oda sahipliği devredildiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "owner_changed", roomId, newOwnerId, newOwnerName, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `newOwnerId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Oda başlığında sahip bilgisini güncelle; yeni sahibin UI yetkilerini aç |

#### 3.7.7 `voice_request` / `hand_raised`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request"` veya `"hand_raised"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı konuşma izni istediğinde (el kaldırma) |
| **KİM ALIR** | Oda yöneticileri (admin/op/owner) + el kaldıran kullanıcı |
| **YETKİ** | Odaya giriş izni olan herkes alır; yalnızca yönetici işlem yapabilir |
| **YÜK** | `{type: "room_event", event: "voice_request", roomId, userId, userName, avatar, requestId, message?, expiresAt?, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `requestId` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | El kaldırma isteği listesine ekle; yönetici UI'ında kabul/red düğmeleri göster |

#### 3.7.8 `voice_request_cancelled`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request_cancelled"` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı el kaldırma isteğini iptal ettiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "voice_request_cancelled", roomId, userId, userName, requestId?, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `requestId` veya `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | İstek listesinden kaldır |

#### 3.7.9 `voice_request_accepted`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request_accepted"` |
| **NE ZAMAN GÖNDERİLİR** | Yönetici konuşma isteğini kabul ettiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "voice_request_accepted", roomId, userId, userName, avatar, handledBy, handledByName, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | İstek listesinden kaldır; kullanıcının mikrofon erişimini aç; koltuk haritasını güncelle |

#### 3.7.10 `voice_request_rejected`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request_rejected"` |
| **NE ZAMAN GÖNDERİLİR** | Yönetici konuşma isteğini reddettiğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "voice_request_rejected", roomId, userId, userName, reason?, handledBy, handledByName, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | İstek listesinden kaldır; red bildirimi göster |

#### 3.7.11 `voice_request_blocked`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request_blocked"` |
| **NE ZAMAN GÖNDERİLİR** | Yönetici kullanıcının konuşma isteği hakkını engellediğinde |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "voice_request_blocked", roomId, userId, userName, handledBy, handledByName, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Engellenen kullanıcının el kaldırma düğmesini devre dışı bırak |

#### 3.7.12 `voice_request_unblocked`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "voice_request_unblocked"` |
| **NE ZAMAN GÖNDERİLİR** | Yönetici engeli kaldırdığında |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "voice_request_unblocked", roomId, userId, userName, handledBy?, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `userId` + `ts` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | El kaldırma düğmesini yeniden etkinleştir |

#### 3.7.13 `pk_invite`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "pk_invite"` |
| **NE ZAMAN GÖNDERİLİR** | Başka bir oda PK daveti gönderdiğinde |
| **KİM ALIR** | Hedef odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "pk_invite", roomId, battleId, battle, userId?, userName?, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `battleId` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | PK davet diyaloğunu göster; kabul/red düğmeleri sun |

#### 3.7.14 `pk_requested`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `room_event` → `event: "pk_requested"` |
| **NE ZAMAN GÖNDERİLİR** | Oda sahibi başka bir odaya PK talebi gönderdiğinde |
| **KİM ALIR** | Kaynak odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "room_event", event: "pk_requested", roomId, battleId, battle, ts}` |
| **SIRALAMA** | `ts` sıralı |
| **YENİDEN DENEME** | Replay tamponu içindeyse otomatik |
| **KOPYA İŞLEME** | `battleId` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | "PK talebi gönderildi" bildirimi göster; bekleme durumunu UI'a yansıt |

### 3.8 `dj` (Müzik Durumu)

| Alan | Değer |
|---|---|
| **OLAY ADI** | `dj` |
| **NE ZAMAN GÖNDERİLİR** | İlk bağlantıda tam durum; sonrasında müzik değişikliğinde (şarkı başlama/bitme, kuyruk güncelleme) |
| **KİM ALIR** | Odadaki tüm bağlı istemciler |
| **YETKİ** | Odaya giriş izni olan herkes |
| **YÜK** | `{type: "dj", playing, currentTrack?: {videoId, title, embedUrl, elapsed, duration}, queue: [{id, videoId, title, dedication?, note?, duration, requestType, isPaid, userId, userName, createdAt}], djEnabled}` |
| **SIRALAMA** | Her güncelleme tam durumu içerir (anlık görüntü) |
| **YENİDEN DENEME** | Yeniden bağlanmada ilk poll'da tam durum gelir |
| **KOPYA İŞLEME** | Tam değiştirme — eski DJ durumunu tamamen sil, yenisini uygula |
| **İSTEMCİ AKSİYONU** | Müzik çaları güncelle; YouTube embed'i `embedUrl` ile yükle; kuyruk listesini yenile |

---

## 4. Video Yayın Kanalı

**Uç:** `GET /api/video-streams/{streamId}/stream`  
**Kimlik:** İsteğe bağlı (JWT ile daha zengin veri)  
**Poll aralığı:** 1 saniye  
**Bellek tamponu:** 100 olay / 5 dakika TTL (lib/stream-events.ts)

### 4.1 `streamMessage`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `streamMessage` |
| **NE ZAMAN GÖNDERİLİR** | İzleyici yayına yorum yazdığında |
| **KİM ALIR** | Yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık (yayıncı kısıtlayabilir) |
| **YÜK** | `{type: "streamMessage", id, content, userId, userName, userImage, createdAt}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `id` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Yorum akışına ekle; otomatik kaydır |

### 4.2 `viewerCount`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `viewerCount` |
| **NE ZAMAN GÖNDERİLİR** | İzleyici katıldığında veya ayrıldığında |
| **KİM ALIR** | Yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık |
| **YÜK** | `{type: "viewerCount", streamId, viewerCount}` |
| **SIRALAMA** | Sıralama önemsiz; en son değer geçerli |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | Son değeri uygula |
| **İSTEMCİ AKSİYONU** | İzleyici sayısı göstergesini güncelle |

### 4.3 `streamEnded`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `streamEnded` |
| **NE ZAMAN GÖNDERİLİR** | Yayıncı yayını sonlandırdığında |
| **KİM ALIR** | Yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık |
| **YÜK** | `{type: "streamEnded", streamId, endedAt}` |
| **SIRALAMA** | Son olay |
| **YENİDEN DENEME** | Gerekli değil — yayın artık mevcut değil |
| **KOPYA İŞLEME** | İdempotent |
| **İSTEMCİ AKSİYONU** | "Yayın sona erdi" mesajı göster; SSE bağlantısını kes; keşfet sayfasına yönlendir |

### 4.4 `gift` (Video Yayın)

| Alan | Değer |
|---|---|
| **OLAY ADI** | `gift` |
| **NE ZAMAN GÖNDERİLİR** | İzleyici yayıncıya hediye gönderdiğinde |
| **KİM ALIR** | Yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık |
| **YÜK** | `{type: "gift", giftId, giftName, giftImage, giftAnimation, senderId, senderName, senderImage, receiverId, receiverName, quantity, totalPrice, combo?, comboCount?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | Olay kimliği ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Hediye animasyonunu oynat; sohbet akışına hediye mesajı ekle |

### 4.5 `pk` (Video Yayın)

| Alan | Değer |
|---|---|
| **OLAY ADI** | `pk` |
| **NE ZAMAN GÖNDERİLİR** | Video yayın PK savaşı başladığında, skor güncellendiğinde, iptal/bitiş |
| **KİM ALIR** | Her iki yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık |
| **YÜK** | `{type: "pk", battleId, action, score1, score2, ...}` — `action`: `pk_start`, `score_update`, `pk_end`, `pk_cancel` |
| **SIRALAMA** | `battleId` + `action` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `battleId` + `action` çifti ile tekilleştir |
| **İSTEMCİ AKSİYONU** | PK UI'ı göster/güncelle |

### 4.6 `guest`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `guest` |
| **NE ZAMAN GÖNDERİLİR** | Yayına konuk davet edildiğinde, kabul/red edildiğinde |
| **KİM ALIR** | Yayındaki tüm bağlı istemciler |
| **YETKİ** | Herkese açık |
| **YÜK** | `{type: "guest", event: "guest_invited" | "guest_accepted" | "guest_rejected" | "guest_left", streamId, inviteId, guestId, guestName?, guestImage?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `inviteId` + `event` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Konuk panelini güncelle; kabul edildiğinde split-screen layout'a geç |

---

## 5. Falcı Seans Odası Kanalı

**Uç:** `GET /api/room/{sessionId}/stream`  
**Kimlik:** Zorunlu (JWT veya oturum) — seans katılımcısı olmalı  
**Poll aralığı:** 2 saniye  
**Bellek tamponu:** 100 olay / 5 dakika TTL (lib/room-events.ts)

### 5.1 `message`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `message` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı veya falcı seans içi mesaj gönderdiğinde |
| **KİM ALIR** | Seans katılımcıları (kullanıcı + falcı) |
| **YETKİ** | Seans katılımcısı olmalı |
| **YÜK** | `{type: "message", id, content, senderId, senderName, senderRole, createdAt}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `id` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Mesajı sohbet listesine ekle |

### 5.2 `timer_started`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `timer_started` |
| **NE ZAMAN GÖNDERİLİR** | Falcı seansı kabul ettiğinde (zamanlayıcı başlar) |
| **KİM ALIR** | Seans katılımcıları |
| **YETKİ** | Seans katılımcısı |
| **YÜK** | `{type: "timer_started", timerStartedAt}` |
| **SIRALAMA** | Seans yaşam döngüsünde tek seferlik |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | İdempotent; zamanlayıcı zaten çalışıyorsa yoksay |
| **İSTEMCİ AKSİYONU** | Geri sayım zamanlayıcısını `timerStartedAt` ile başlat |

### 5.3 `time_extended`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `time_extended` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı seans süresini uzattığında |
| **KİM ALIR** | Seans katılımcıları |
| **YETKİ** | Seans katılımcısı |
| **YÜK** | `{type: "time_extended", addedMinutes, newMaxMinutes, creditsCharged}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `newMaxMinutes` değeriyle son durumu uygula |
| **İSTEMCİ AKSİYONU** | Zamanlayıcı süresini güncelle; "Süre uzatıldı" bildirimi göster |

### 5.4 `session_ended`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `session_ended` |
| **NE ZAMAN GÖNDERİLİR** | Seans tamamlandığında veya iptal edildiğinde |
| **KİM ALIR** | Seans katılımcıları |
| **YETKİ** | Seans katılımcısı |
| **YÜK** | `{type: "session_ended", sessionId, status, endedBy, endedAt}` |
| **SIRALAMA** | Son olay |
| **YENİDEN DENEME** | Gerekli değil — seans artık aktif değil |
| **KOPYA İŞLEME** | İdempotent |
| **İSTEMCİ AKSİYONU** | Zamanlayıcıyı durdur; "Seans sona erdi" mesajı göster; değerlendirme ekranına yönlendir |

### 5.5 `system` (Seans)

| Alan | Değer |
|---|---|
| **OLAY ADI** | `system` |
| **NE ZAMAN GÖNDERİLİR** | Seans durum değişikliklerinde |
| **KİM ALIR** | Seans katılımcıları |
| **YETKİ** | Seans katılımcısı |
| **YÜK** | `{type: "system", message, action?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | Mesaj + zaman damgası ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Sistem mesajını özel stil ile göster |

---

## 6. Falcı Talep Kanalı

**Uç:** `GET /api/fortune-tellers/sessions/stream`  
**Kimlik:** Zorunlu (onaylı falcı olmalı)  
**Poll aralığı:** 3 saniye  
**Bellek tamponu:** 100 olay / 5 dakika TTL (lib/room-events.ts — tellerEvents)

### 6.1 `pending_sessions`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `pending_sessions` |
| **NE ZAMAN GÖNDERİLİR** | Bağlantı kurulduğunda, mevcut bekleyen seanslarla birlikte |
| **KİM ALIR** | Bağlanan falcı |
| **YETKİ** | Onaylı falcı |
| **YÜK** | `{type: "pending_sessions", sessions: [{id, userId, fortuneType, maxMinutes, creditsCharged, creditsPerMinute, createdAt, user: {id, name, image}}]}` |
| **SIRALAMA** | `createdAt desc` |
| **YENİDEN DENEME** | Yeniden bağlanmada otomatik gönderilir |
| **KOPYA İŞLEME** | Tam değiştirme — listeyi tamamen yenile |
| **İSTEMCİ AKSİYONU** | Bekleyen talep listesini doldur |

### 6.2 `session_request`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `session_request` |
| **NE ZAMAN GÖNDERİLİR** | Yeni bir kullanıcı seans talep ettiğinde |
| **KİM ALIR** | Hedef falcı |
| **YETKİ** | Onaylı falcı |
| **YÜK** | `{type: "session_request", session: {id, userId, fortuneType, maxMinutes, creditsCharged, creditsPerMinute, createdAt, user: {id, name, image}}}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `session.id` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Gelen arama bildirimi göster; zil/titreşim tetikle; kabul/red düğmeleri sun |

### 6.3 `session_cancelled`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `session_cancelled` |
| **NE ZAMAN GÖNDERİLİR** | Kullanıcı bekleyen seans talebini iptal ettiğinde VEYA falcı reddettiğinde |
| **KİM ALIR** | Hedef falcı |
| **YETKİ** | Onaylı falcı |
| **YÜK** | `{type: "session_cancelled", sessionId, reason?}` |
| **SIRALAMA** | `timestamp` sıralı |
| **YENİDEN DENEME** | Tampon içindeyse otomatik |
| **KOPYA İŞLEME** | `sessionId` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | İlgili seans talebini listeden kaldır; zili/titreşimi durdur |

---

## 7. Bildirim Kanalı

**Uç:** `GET /api/notifications/stream`  
**Kimlik:** Zorunlu (JWT)  
**Poll aralığı:** 5 saniye  
**Veri kaynağı:** Veritabanı sorgusu (bellek tamponu yok)

### 7.1 `notification`

| Alan | Değer |
|---|---|
| **OLAY ADI** | `notification` |
| **NE ZAMAN GÖNDERİLİR** | Yeni bildirim oluştuğunda (5 sn poll döngüsünde tespit edilir) |
| **KİM ALIR** | Bildirimin sahibi olan kullanıcı |
| **YETKİ** | Kimlik doğrulanmış kullanıcı |
| **YÜK** | `{type: "notification", notification: {id, title, body, type, isRead, createdAt, data?}}` |
| **SIRALAMA** | `createdAt asc` |
| **YENİDEN DENEME** | DB tabanlı; yeniden bağlanmada `lastCheck` sıfırlanır, kaçırılan bildirimler tespit edilir |
| **KOPYA İŞLEME** | `id` ile tekilleştir |
| **İSTEMCİ AKSİYONU** | Bildirim rozet sayısını artır; bildirim listesine ekle; derin bağlantı varsa dokunulduğunda ilgili ekrana yönlendir |

---

## 8. PK Maç Kanalı

**Uç:** `GET /api/pk/{matchId}/stream`  
**Kimlik:** Gerekli değil (herkese açık)  
**Poll aralığı:** 2 saniye  
**Veri kaynağı:** Veritabanı sorgusu (bellek tamponu yok)

### 8.1 `pk` (Bağımsız Maç)

| Alan | Değer |
|---|---|
| **OLAY ADI** | `pk` |
| **NE ZAMAN GÖNDERİLİR** | Maç durumu değiştiğinde (skor, bitiş, iptal) |
| **KİM ALIR** | Maç sayfasına bağlı tüm istemciler |
| **YETKİ** | Yok (herkese açık) |
| **YÜK** | `{type: "pk", event: "match_update" | "not_found", match?: {id, status, score1, score2, winnerId, room1, room2, ...}}` |
| **SIRALAMA** | Her güncelleme tam maç anlık görüntüsüdür |
| **YENİDEN DENEME** | DB tabanlı; yeniden bağlanmada güncel durum gelir |
| **KOPYA İŞLEME** | Tam değiştirme — son anlık görüntüyü uygula |
| **İSTEMCİ AKSİYONU** | Skor tablosunu güncelle; maç tamamlandığında (`completed`/`cancelled`/`rejected`/`expired`) sonuç ekranı göster; kanal 3 sn sonra kapanır |

---

## 9. Fal Yanıt Kanalları

**Uçlar:** `/api/fortunes/{falTipi}` (kahve-fali, tarot-fali, burc-yorumu, el-fali, ruya-yorumu, numeroloji, katina, melek-kartlari, evet-hayir, ask-uyumu, aura-analizi, dogum-haritasi, istihare, kahve-fali-image)  
**Kimlik:** Zorunlu  
**Veri kaynağı:** LLM akış yanıtı (tek seferlik)

### 9.1 LLM Akış Parçası

| Alan | Değer |
|---|---|
| **OLAY ADI** | (adsız SSE `data:` satırı) |
| **NE ZAMAN GÖNDERİLİR** | LLM metin parçası ürettiğinde |
| **KİM ALIR** | İsteği yapan kullanıcı |
| **YETKİ** | Kimlik doğrulanmış + yeterli kredi |
| **YÜK** | `{content: "metin parçası"}` veya ham metin satırı |
| **SIRALAMA** | Kesinlikle sıralı; parçalar birleştirilir |
| **YENİDEN DENEME** | Yok — tek seferlik akış; hata durumunda yeni istek gerekir |
| **KOPYA İŞLEME** | Parça sıra numarası (örtük) ile |
| **İSTEMCİ AKSİYONU** | Gelen metni canlı olarak ekrana yaz (typewriter efekti); akış bittiğinde tam metni kaydet |

---

## 10. Hata Yönetimi ve Genel Kurallar

### 10.1 Bağlantı Hataları

| Durum | İstemci Aksiyonu |
|---|---|
| 401 Unauthorized | Giriş ekranına yönlendir; token yenile ve tekrar dene |
| 403 Forbidden | Erişim hatası göster; yeniden bağlanma |
| 404 Not Found | Kaynak mevcut değil; ilgili liste ekranına yönlendir |
| Ağ kesintisi | Üstel geri çekilme ile yeniden bağlan: 1s → 2s → 4s → 8s → 16s → 30s (maks) |
| Heartbeat zaman aşımı (45s) | Bağlantıyı kes ve yeniden bağlan |

### 10.2 Yeniden Bağlanma Stratejisi

1. SSE bağlantısı koptuğunda `Last-Event-ID` başlığı veya `?lastEventId=<son-id>` ile yeniden bağlan.
2. Sunucu, replay tamponu (2 dk / 200 olay) içindeki kaçırılan olayları sırayla gönderir.
3. Tampon dışında kalan olaylar kaybolur; istemci `connected` olayındaki başlangıç verisiyle durumu sıfırlar.
4. DB tabanlı kanallar (bildirim, PK) kaçırılan veriyi otomatik tespit eder.

### 10.3 Olay İşleme Kuralları

| Kural | Açıklama |
|---|---|
| Bilinmeyen olay tipi | Sessizce yoksay; hata fırlatma |
| Eksik alan | Varsayılan değer kullan; çökme |
| Sıra dışı olay | `timestamp` / `ts` ile sırala; geç gelen olayı doğru konuma yerleştir |
| Tampon taşması | En eski olaylar düşer; istemci `connected` ile tam senkronizasyon yapar |
| Aynı olay birden fazla | Tekilleştirme anahtarı ile filtrele (bkz. her olayın KOPYA İŞLEME alanı) |

### 10.4 Kanal Bazlı Yapılandırma Özeti

| Kanal | Poll (sn) | Tampon | TTL | `id:` | Heartbeat | Auth |
|---|---|---|---|---|---|---|
| Sohbet odası | 2 | 200 olay | 2 dk | ✅ epoch-ms | 15 sn | Zorunlu |
| Video yayın | 1 | 100 olay | 5 dk | ❌ | 15 sn | İsteğe bağlı |
| Falcı seans | 2 | 100 olay | 5 dk | ❌ | 15 sn | Zorunlu |
| Falcı talep | 3 | 100 olay | 5 dk | ❌ | 15 sn | Zorunlu |
| Bildirim | 5 | DB | — | ❌ | 15 sn | Zorunlu |
| PK maç | 2 | DB | — | ❌ | 15 sn | Yok |
| Fal yanıt | — | — | — | ❌ | — | Zorunlu |

---

## Sürüm Geçmişi

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| 1.0.0 | 2026-08-27 | İlk sürüm — 7 kanal, 30+ olay tipi |
