# CanlıFal — Faz 21 Raporu
## Bildirim Tekilleştirme + Derin Bağlantı (§53)

**Tarih:** 27 Ağustos 2026  
**Checkpoint:** `Phase 21: notification dedupe deeplink`  
**Kapsam:** Master mimari §53 (Notification Deduplication) — ek olarak §54 derin bağlantı entegrasyonu

---

## 1. Amaç

§53 iki şey istiyor:

1. **Aynı olay için aynı kullanıcıya kopya bildirim gönderilmemeli.**
2. Her bildirim kaydı şu alanları içermeli: `id`, `user_id`, `type`, `title`, `body`, `data`, `created_at`, `read_at`, **`deep_link`**.

Önceki durumda `Notification` modelinde tekilleştirme anahtarı ve derin bağlantı alanı yoktu; çift tıklama, istemci yeniden denemesi veya eşzamanlı istekler birebir aynı bildirimi birden çok kez üretebiliyordu.

---

## 2. Yapılan Değişiklikler

### 2.1 Veri modeli

`Notification` modeline iki opsiyonel alan ve bir indeks eklendi (tamamen eklemeli, veri kaybı yok):

| Alan | Tip | Açıklama |
|------|-----|----------|
| `dedupeKey` | `String?` | Olayı tanımlayan deterministik anahtar |
| `deepLink` | `String?` | `canlifal://<tip>/<değer>` biçiminde hedef bağlantı |

Yeni indeks: `@@index([userId, dedupeKey, createdAt(sort: Desc)])` — tekilleştirme penceresi sorgusunun indeksten karşılanması için.

### 2.2 `lib/notify.ts` — merkezi tekilleştirme

Uygulamadaki **40 civarı bildirim çağrısının tamamı** bu iki fonksiyondan geçiyor, bu yüzden tek noktadan çözüm uygulandı:

- `createNotificationWithPush()` — kayıt oluşturmadan önce `(userId, dedupeKey, createdAt >= pencere)` sorgusu yapar. Kopya bulunursa **ne yeni kayıt ne de push** üretilir; mevcut bildirim döndürülür (çağıran taraf için davranış değişmez).
- `createBulkNotificationsWithPush()` — pencere içinde aynı anahtarı zaten almış kullanıcılar hedef listesinden çıkarılır; toplu push yalnızca kalan kullanıcılara gider.

Yeni yardımcılar:

| Fonksiyon | Görev |
|-----------|-------|
| `buildNotificationDedupeKey()` | Anahtar verilmediyse `type\|postId\|fromUserId\|mesaj(0-120)` biçiminde deterministik anahtar üretir |
| `resolveNotificationDeepLink()` | `deepLinkType`/`deepLinkValue` verilmişse onu, yoksa `postId` → `post`, mesaj tipleri → `message` bağlantısını üretir |
| `resolveDedupeWindow()` | Tip bazlı pencere çözümlemesi |

### 2.3 Tekilleştirme pencereleri

Varsayılan pencere kasıtlı olarak **kısa** tutuldu; amaç gerçek tekrar eden olayları (yeni hediye, yeni mesaj) engellemek değil, teknik kopyaları elemek.

| Tip | Pencere |
|-----|---------|
| *(varsayılan)* | 60 sn |
| `follow`, `new_follower` | 6 saat |
| `like`, `post_like`, `comment_like` | 1 saat |
| `achievement`, `level_up` | 24 saat |
| `live_started`, `stream_started` | 30 dk |

Çağıran taraf `dedupeKey`, `dedupeWindowSeconds` ile ezebilir; `skipDedupe: true` ile tamamen kapatabilir.

### 2.4 `/api/notifications` yanıtı

- Hem klasik hem imleç (cursor) modunda yanıta `deepLink` alanı eklendi.
- Eski kayıtlarda alan boş olduğu için **okuma anında türetme** yapılır (`withDeepLink`): türetilemiyorsa dürüst şekilde `null` döner.
- Mevcut alanların hiçbiri değişmedi; yalnızca yeni alan eklendi.

---

## 3. Doğrulama

| Kontrol | Sonuç |
|---------|-------|
| Tip denetimi (`tsc`) | ✅ Geçti |
| Üretim derlemesi | ✅ Geçti |
| Şema güncellemesi (`db push`) | ✅ Veri kaybı olmadan |
| Geliştirme sunucusu + `/api/health` | ✅ 200 |
| **Canlı kopya testi** | ✅ Aynı içerikli 3 mesaj gönderildi → 3 mesaj teslim edildi, **yalnızca 1 bildirim** oluştu |
| Derin bağlantı üretimi | ✅ `canlifal://message/<userId>` |
| Gerçek içerik bastırılmadı mı | ✅ `DirectMessage` sayısı 3 (mesajların hiçbiri kaybolmadı) |
| `/api/notifications` klasik mod | ✅ `deepLink` alanı mevcut |
| `/api/notifications` imleç modu | ✅ `deepLink` alanı mevcut |
| Tarayıcı arayüz testi | ❌ Yapılmadı |
| Yayına alma | ❌ Bu fazda yapılmadı |

**Test yöntemi:** `POST /api/messages/<userId>` uç noktasına aynı metinle üç ardışık istek; ardından veritabanında ilgili kullanıcının son 2 dakikalık bildirimleri sayıldı.

---

## 4. Geriye Dönük Uyumluluk

- Yeni alanların ikisi de opsiyonel; eski kayıtlar olduğu gibi kalır.
- Fonksiyon imzalarına yalnızca opsiyonel parametreler eklendi; mevcut 40 çağrının hiçbiri değiştirilmedi.
- Yanıt gövdelerinden alan çıkarılmadı, yalnızca `deepLink` eklendi.
- `lib/db.ts` ve üç doğrudan `notification.create` çağrısı (yayın başlatma akışları) kasıtlı olarak dokunulmadan bırakıldı — bunlar zaten kendi içinde tekil olay üretiyor.

---

## 5. Envanter

| Ölçüt | Değer |
|-------|-------|
| Model sayısı | 215 (değişmedi) |
| Uç nokta işleyicisi | 780 (değişmedi) |
| Yeni alan | 2 (`dedupeKey`, `deepLink`) |
| Yeni indeks | 1 |

---

## 6. Sonraki Adım Önerileri

- §79 **Consistency** — web ve mobilin aynı anda aynı oda/koltuk/cüzdan/skor durumunu görmesi için tek kaynaklı durum uçları
- §56 **Destek/talep sistemi**
- §51 **Çoklu hesap tespiti**
