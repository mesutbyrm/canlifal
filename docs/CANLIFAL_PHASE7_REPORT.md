# CANLIFAL — FAZ 7 RAPORU
## Destek / Doğrulama / Takım / Destekçi Seviyesi / Efekt Kuralları + Push Sağlayıcı Konsolidasyonu (§52)

**Tarih:** 27 Ağustos 2026
**Kapsam:** Tamamı eklemeli (additive). Mevcut çalışan uçların davranışı değişmedi.

---

## 1. Özet

Bu fazda, Faz 1 denetiminde tespit edilen eksik veri modelleri tamamlandı ve §52'de belirtilen çift
push sağlayıcı belirsizliği tek bir soyutlama katmanıyla netleştirildi. Beş yeni işlev alanı eklendi:
destek talepleri, kimlik/yayıncı doğrulama, takımlar, yayıncı bazlı destekçi seviyeleri ve seviye/harcamaya
göre otomatik efekt atama kuralları. Ek olarak hediye/bahşiş akışlarına **destekçi seviyesi otomatik
takibi** bağlandı (ateşle-unut). Hiçbir mevcut uç değiştirilmedi; tüm eklemeler geriye dönük uyumludur.

---

## 2. Yeni veri modelleri (7 adet, tamamı eklemeli)

| Model | Tablo | Amaç |
|---|---|---|
| `SupportTicket` | `support_tickets` | Kullanıcı destek talepleri (kategori, durum, öncelik, atanan) |
| `SupportMessage` | `support_messages` | Talep mesaj dizisi (kullanıcı/yönetici/sistem, dahili not desteği) |
| `Verification` | `verifications` | Kimlik / yayıncı / ajans doğrulama başvuruları (belge URL'leri, inceleme) |
| `Team` | `teams` | Takım/klan (slug, sahip, üye sayısı, toplam puan) |
| `TeamMember` | `team_members` | Takım üyeliği (rol, puan) — `@@unique([teamId, userId])` |
| `SupporterLevel` | `supporter_levels` | Yayıncı bazlı destekçi seviyesi — `@@unique([userId, broadcasterId])` |
| `EffectRule` | `effect_rules` | Koşula göre kozmetik efekt atama kuralı (seviye/destekçi/üyelik/harcama) |

Tüm modeller `LedgerEntry`/`AuditLog` konvansiyonunu takip eder: kullanıcı kimlikleri düz `String`
alanlardır (User modeline foreign-key ilişki YOK), böylece paylaşımlı şemada mevcut ilişkiler etkilenmez.
Şema veritabanına **eklemeli** olarak yansıtıldı (veri kaybı yok).

---

## 3. §52 — Push sağlayıcı konsolidasyonu

**Denetim bulgusu:** §52 gerçek bir çift teslimat DEĞİLDİ. OneSignal (`lib/onesignal.ts`, `external_id`)
push bildirimini **fiilen gönderen tek kanaldır**. `/api/devices/fcm` ucu ise yalnızca ham FCM/APNs
token'larını `UserDevice` tablosuna yazar; sunucu tarafında bu token'lara doğrudan gönderim yapan hiçbir
kod yoktur.

**Çözüm:** `lib/push.ts` adında birleşik bir soyutlama katmanı eklendi.
- `sendPush(userId, payload)` ve `sendPushBulk(userIds, payload)` tek giriş noktası olarak OneSignal'e delege eder.
- `PUSH_PROVIDER = 'onesignal'` kanonik sağlayıcı olarak belgelenir.
- `/api/devices/fcm` ucu **silinmedi** — mobil uygulama token yakalama için hâlâ çağırıyor; geriye dönük
  uyumluluk için korunuyor, ancak artık tek gerçek teslimat kanalının OneSignal olduğu netleştirildi.

---

## 4. Yeni API uçları

### Kullanıcı tarafı
| Uç | Açıklama |
|---|---|
| `GET/POST /api/support/tickets` | Kendi taleplerini listele / yeni talep aç (ilk mesajla) |
| `GET/PATCH /api/support/tickets/[ticketId]` | Detay+mesajlar / sahip yalnızca kapatabilir, yönetici tüm durumlar |
| `POST /api/support/tickets/[ticketId]/messages` | Yanıt ekle (kullanıcı yanıtı `resolved`→yeniden açar) |
| `GET/POST /api/verification` | Kendi doğrulama durumu / başvuru gönder (aynı tip mükerrer engelli) |
| `GET/POST /api/teams` | Takım liderlik tablosu / takım oluştur |
| `GET/PATCH /api/teams/[teamId]` | Detay+üyeler / katıl-ayrıl (sahip ayrılamaz) |
| `GET /api/supporter-levels` | `?broadcasterId` → ilk 50 destekçi; parametresiz → kendi seviyelerin |

### Yönetici tarafı (admin/yonetici/moderator)
| Uç | Açıklama |
|---|---|
| `GET /api/admin/support` | Tüm talepler, sayfalanmış |
| `GET/PATCH /api/admin/verification` | İnceleme kuyruğu / onayla-reddet (denetim kaydı yazar) |
| `GET/POST /api/admin/effect-rules` | Kural listesi / oluştur (denetim + cache invalidation) |
| `PATCH/DELETE /api/admin/effect-rules/[ruleId]` | Güncelle / sil (denetim + cache invalidation) |

Tüm uçlar `lib/api-response.ts` zarfını (`apiSuccess`/`apiPaginated`/`apiError`) ve `lib/rbac.ts`
(`resolveUser`/`isAdminRole`) çift-auth çözümlemesini kullanır.

---

## 5. Destekçi seviyesi otomatik takibi

`lib/supporter-level.ts` kademe tanımları: **Yeni / Bronz / Gümüş / Altın / Platin / Elmas**
(eşikler: 0 / 100 / 1.000 / 5.000 / 20.000 / 100.000 katkı).

`recordContribution(userId, broadcasterId, amount)` fonksiyonu, aşağıdaki mevcut hediye/bahşiş
uçlarına **ateşle-unut** (`.catch()`) olarak bağlandı — mevcut para/komisyon mantığı DEĞİŞMEDİ:

| Uç | Katkı kaynağı |
|---|---|
| `POST /api/live/gift/send` (yayın dalı) | gönderen → yayıncı |
| `POST /api/live/gift/send` (sesli oda dalı) | gönderen → alıcı |
| `POST /api/chat/rooms/[roomId]/gifts` | gönderen → alıcı |
| `POST /api/video-streams/[streamId]/gifts` | gönderen → yayıncı |
| `POST /api/room/[sessionId]/tip` | kullanıcı → falcı |

Kendi kendine destek atlanır; upsert ile mükerrer kayıt oluşmaz.

---

## 6. Efekt kuralları çözümleyicisi

`lib/effect-rules.ts` — `resolveEffects(ctx)` ile seviye / destekçi seviyesi / üyelik / harcama
eşiğine göre uygun kozmetik efektleri döndürür. Aktif kurallar 60 sn cache ile okunur
(`effect_rules:active`). **Mevcut kozmetik tabloları (name-effects, entrance-effects vb.) asla
değiştirilmez** — yalnızca çözümleme kuralı sağlar.

---

## 7. Yeni yönetici arayüzü sayfaları

| Sayfa | Yol | İçerik |
|---|---|---|
| Destek Talepleri | `/admin/support` | Talep listesi + yan panelde detay/yanıt, durum değiştirme, dahili not |
| Doğrulama Talepleri | `/admin/verification` | İnceleme kuyruğu, belge bağlantıları, onayla/reddet + inceleme notu |
| Efekt Kuralları | `/admin/effect-rules` | Kural CRUD, aktif/pasif toggle |

Hepsi mevcut koyu tema, `AdminBackButton` ve `framer-motion` desenini takip eder; yönetici ana
sayfasına (`/admin`) ilgili gruplarda navigasyon bağlantıları eklendi.

---

## 8. Envanter değişimi

| Metrik | Faz 6 sonu | Faz 7 sonu |
|---|---|---|
| Handler | 752 | **771** |
| Path | 482 | **493** |
| Kategori | 157 | **164** |
| Model | 206* | **213** |

\* `backend-docs/` (endpoints_index.json, openapi.json, postman_collection.json, ENDPOINTS.md) yeniden üretildi.

---

## 9. Doğrulama durumu

| Kontrol | Durum |
|---|---|
| Tip kontrolü (tsc) | ✅ Geçti |
| Derleme (build) | ✅ Geçti |
| Checkpoint | ✅ Kaydedildi |
| Canlı uçtan uca test | ❌ Yapılmadı |
| Production deploy | ❌ Yapılmadı |

Tüm yeni yazımlar (destekçi seviyesi, denetim kaydı) ateşle-unut olduğundan hata ana akışı kesmez.
