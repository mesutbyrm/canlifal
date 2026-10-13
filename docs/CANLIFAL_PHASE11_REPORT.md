# CanlıFal Faz 11 Raporu — Rate Limit Kapsam Genişletme (§89 #13)

**Tarih:** 2026-08-27  
**Durum:** Tamamlandı (tsc ✅ / build ✅ / dev ✅). Canlı e2e ❌, deploy ❌.  
**Kural:** Tamamı eklemeli — hiçbir mevcut uç değiştirilmedi, geriye dönük uyumluluk korundu.

---

## 1. Özet

`guardRateLimit` korumasını 10 uçtan **30 uca** genişlettik. Yeni korunan 20 uç, finansal işlemler (hediye, bahşiş, üyelik, çekim), mesajlaşma, yorum yazma, içerik oluşturma, şikayet/destek ve medya yükleme gibi hassas yazma operasyonlarını kapsar.

Ayrıca `DEFAULT_RATE_LIMITS` sözlüğüne 7 yeni scope tanımlandı. Tüm limitler `rate_limits` RemoteConfig kaydı üzerinden canlı ortamda ezilebilir.

## 2. Yeni Scope Tanımları

`lib/rate-limit-guard.ts` dosyasına eklenen yeni scope varsayılanları:

| Scope | Varsayılan (istek/dk) | Kullanım |
|---|---|---|
| `lucky_gift` | 10 | Şanslı hediye gönderme |
| `comment` | 20 | Tüm yorum uçları |
| `content_create` | 10 | Sosyal paylaşım, hikaye |
| `tip` | 10 | Bahşiş gönderme |
| `membership` | 5 | Üyelik satın alma |
| `report` | 5 | Şikayet, destek talebi, doğrulama |
| `upload` | 5 | Video yükleme |

`chat_message` scope'u 5 → **30**/dk olarak güncellendi (sohbet odalarında daha yüksek hacim bekleniyor).

## 3. Korunan Uçlar — Tam Liste

### Önceden korumalı (10 uç, değişmedi)
| Uç | Scope | Faz |
|---|---|---|
| POST /api/live/pk | pk_create | 4 |
| POST /api/withdrawals | withdrawal | 4 |
| POST /api/agency/join | agency_action | 4 |
| POST /api/agency/apply | agency_action | 4 |
| POST /api/video-streams | stream_create | 4 |
| POST /api/video-streams/pk | pk_create | 4 |
| POST /api/payments/requests | payment | 4 |
| POST /api/chat/rooms/create | room_create | 4 |
| POST /api/chat/rooms/[roomId]/pk | pk_create | 4 |

### Faz 11'de eklenen (20 uç)

#### Finansal (8 uç)
| Uç | Scope |
|---|---|
| POST /api/live/gift/send | gift_send |
| POST /api/gifts/lucky/send | lucky_gift |
| POST /api/chat/rooms/[roomId]/gifts | gift_send |
| POST /api/video-streams/[streamId]/gifts | gift_send |
| POST /api/room/[sessionId]/tip | tip |
| POST /api/memberships/purchase | membership |
| POST /api/agency/withdrawals | withdrawal |

*Not: `POST /api/gifts/send` zaten `heavyLimiter` ile doğrudan korumalıydı (Faz 4 öncesi legacy), dokunulmadı.*

#### Mesajlaşma (4 uç)
| Uç | Scope |
|---|---|
| POST /api/messages/[userId] | chat_message |
| POST /api/live/message | chat_message |
| POST /api/chat/rooms/[roomId]/messages | chat_message |

#### Yorum (6 uç)
| Uç | Scope |
|---|---|
| POST /api/blog/comments | comment |
| POST /api/dreams/[slug]/comments | comment |
| POST /api/video-streams/[streamId]/comments | comment |
| POST /api/social/posts/[postId]/comments | comment |
| POST /api/short-videos/[id]/comments | comment |

#### İçerik Oluşturma (2 uç)
| Uç | Scope |
|---|---|
| POST /api/social/posts | content_create |
| POST /api/stories | content_create |

#### Şikayet/Destek/Doğrulama (3 uç)
| Uç | Scope |
|---|---|
| POST /api/user/report | report |
| POST /api/support/tickets | report |
| POST /api/verification | report |

#### Medya Yükleme (1 uç)
| Uç | Scope |
|---|---|
| POST /api/short-videos/upload | upload |

## 4. Mimari Notlar

- **Geriye dönük uyumluluk:** Tüm eklentiler mevcut mantığa `guardRateLimit(req, scope, { userId })` + `if (rateLimited) return rateLimited` kalıbıyla yapıldı. Auth akışı, iş mantığı ve yanıt formatı dokunulmadı.
- **RemoteConfig:** `rate_limits` RemoteConfig kaydı (60sn cache) üzerinden tüm scope'lar canlı ortamda ezilebilir.
- **Auth uçları:** `auth/mobile-login`, `signup`, `forgot-password` vb. zaten `authLimiter` ile korumalıydı (15dk pencere), dokunulmadı.
- **Legacy:** `gifts/send` `heavyLimiter` ile korumalıydı, dokunulmadı.

## 5. Envanter

| Metrik | Önce | Sonra |
|---|---|---|
| Handler | 776 | **776** |
| Path | 498 | **498** |
| Kategori | 167 | **167** |
| Model | 214 | **214** |
| guardRateLimit çağrısı | 10 | **30** |

Yeni uç veya model eklenmedi — yalnızca mevcut uçlara koruma katmanı eklendi.

## 6. Doğrulama Durumu

- tsc: **0 hata** ✅
- build: **başarılı** ✅
- dev server: **çalışıyor** ✅
- Canlı e2e: ❌ yapılmadı
- Deploy: ❌ yapılmadı

## 7. §89 Gate Güncellemesi

| # | Madde | Durum |
|---|---|---|
| 3 | Standart hata zarfı (~376 rota) | ❌ |
| 11 | İmleç sayfalama (helper var, geniş adopsiyon) | ❌ |
| **13** | **Rate limit kapsamı** | **✅ TAMAMLANDI** |
| 19 | Derin bağlantı standardı | ✅ (Faz 10) |
| 21 | Yük testi | ❌ |
| 23 | Test planı | ❌ |
| 24 | Platformlar arası tutarlılık | ❌ |
