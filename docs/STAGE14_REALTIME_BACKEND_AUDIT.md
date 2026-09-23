# STAGE 14 — Gerçek Zamanlı Sistemler Backend/Production Denetim Raporu

**Tarih:** 9 Ağustos 2026  
**Ortam:** Production — `https://canlifal.com`  
**Yayındaki sürüm:** `e1b61802b38cc60054922072dad5491ec6f8ed05` (branch `master`)  
**Kapsam:** Yalnızca backend / API contract denetimi. **Mobil uygulama (Flutter) tarafında hiçbir dosya okunmadı, değiştirilmedi.**  
**Yöntem:** Gerçek production uçlarına, gerçek test hesaplarıyla, gerçek HTTP çağrıları + veritabanı doğrulaması. Uydurma sonuç yoktur; her satır gerçek çıktıya dayanır.

**Kullanılan koşum kimliği:** `S14TEST-1786285726` — 54 kapı (gate), sonuç **54/54 PASS**.  
Ek olarak, ana koşumdan sonra iki hedefli kanıt denemesi (probe) yapıldı: **video/canlı yayın PK olay yayını** ve **finans-dışı rol hediye tutarı**. Bu iki denemede **iki gerçek kusur tespit edildi** (aşağıda F-1 ve F-2).

---

## 0. Yönetici Özeti — Sonuç Tablosu

| # | Sistem | Sonuç | Not |
|---|--------|-------|-----|
| 1 | TRTC | **PASS** | Kimlik doğrulama, oda eşleşmesi, süre, geçersiz token, duplicate join — hepsi doğru |
| 2 | CANLI YAYIN | **PASS** | Oluşturma / bilgi / katılım / heartbeat / stale temizliği / ayrılma çalışıyor |
| 3 | CANLI FALCI | **PASS** | Talep → kabul → aynı oda → seans → kapanış → iade zinciri uçtan uca doğru |
| 4 | SESLİ ODA | **PASS** | JOIN / LEAVE / HEARTBEAT doğru; ayrılan kullanıcı listeden düşüyor |
| 5 | SEAT | **PASS** | Take / dolu koltuk 409 / geçersiz index 400 / leave / swap / force yetki; **yarış durumunda tek kazanan** |
| 6 | HEDİYE | **KISMİ FAIL** | Normal kullanıcı zinciri kusursuz; **finans-dışı rolde hediye kaydı 0 jeton yazılıyor (F-2)** |
| 7 | JETON | **PASS** | Bakiye düşümü, alıcı payı, iade, müzik ücreti — hepsi tutarlı |
| 8 | PK | **KISMİ FAIL** | Sesli oda PK'sı tam çalışıyor; **canlı yayın (video) PK'sında karşı tarafa canlı olay gitmiyor (F-1)** |
| 9 | PRESENCE / HEARTBEAT | **PASS** | Online sayımı, stale temizliği, ayrılma sonrası güncelleme doğru |
| 10 | SSE | **PASS** | Sohbet odası ve yayın kanalları `text/event-stream` ile canlı yayın yapıyor; STAGE 13 davranışı bozulmamış |
| 11 | MÜZİK / !İSTEK | **PASS** | Arama, ücretlendirme, kuyruk, DJ olayı çalışıyor |
| 12 | 5 DK OTOMATİK KAPATMA | **EKSİK (uygulanmamış)** | Mevcut olan **15 dk "hediye gelmedi"** kuralıdır. **Ses/görüntü/medya hareketsizliğine dayalı 5 dk kuralı sistemde yoktur** |

> **Dürüstlük notu:** 12. satır bir "FAIL" değildir; istenen özelliğin **hiç yazılmamış** olmasıdır. Mevcut uç doğru çalışıyor ama sizin tarif ettiğiniz mantığı uygulamıyor. Talebiniz gereği kod yazılmadı, yalnızca raporlandı.

---

## 1. TENCENT TRTC

**Uçlar:** `POST /api/trtc/token`, `POST /api/trtc/usersig`

| Senaryo | İstek | Gerçek Yanıt |
|---|---|---|
| Kimliksiz erişim | `POST /api/trtc/token` (Authorization yok) | **HTTP 401** |
| Eksik parametre | `POST /api/trtc/token` `{}` | **HTTP 400**, `code=MISSING_ROOM_ID` |
| Başarılı token | `{ "roomId": "<oda>" }` + Bearer | **HTTP 200** — uygulama kimliği dolu, `userId` giriş yapan kullanıcıyla **eşleşiyor**, imza uzunluğu 212 karakter, `expireTime=86400` (24 saat), `trtcRoomId=voice_room_<roomId>`, sayısal kullanıcı kimliği üretiliyor |
| Geçersiz oturum anahtarı | Bozuk Bearer | **HTTP 401** |
| Duplicate join | Aynı kullanıcı + aynı oda, arka arkaya 2 token | **200 / 200** — yeniden katılım destekleniyor, oda kilitlenmiyor |
| Yetkilendirme kaçağı denemesi | `POST /api/trtc/usersig` kimliksiz, gövdede `userId` | **HTTP 400** — imza **üretilmedi** |

**Veritabanı etkisi:** Yok (token üretimi durum tutmaz).  
**TRTC etkisi:** Oda adı kuralı `voice_room_<roomId>`; danışan ve falcı aynı seans için **aynı** oda adını, **farklı** kullanıcı kimliğiyle alıyor (bölüm 3'te kanıtlandı).  
**SSE olayı:** Yok.  
**Sonuç: PASS.** Gizli değerler (uygulama kimliği, imza, token) bu rapora bilinçli olarak yazılmamıştır.

---

## 2. CANLI YAYIN

**Uçlar:** `POST /api/video-streams`, `GET /api/video-streams/{id}`, `POST /api/live/join`, `POST /api/live/heartbeat`, `GET /api/live/online-users`, `POST /api/live/leave-room`, `POST /api/video-streams/{id}/end`

| Senaryo | Gerçek Sonuç |
|---|---|
| Yayın oluştur | **200**, yayın kimliği döndü, `status=live` |
| Yayın bilgisi | **200**, `status=live`, sahip alanı dolu |
| Duplicate yayın (aynı sahip 2. kez) | **200** — **yeni bir kayıt açılıyor, mevcut yayın döndürülmüyor** (aşağıda risk R-3) |
| İzleyici katılımı | **200** |
| Heartbeat | **200**, `onlineCount=1`, `staleRemoved=0`, sunucu saati alanı mevcut |
| Online kullanıcı listesi | **200**, `totalCount=1` |
| İzleyici ayrılma | **200** |
| Yayın kapatma | **200**, durum `ended` |

**Ek doğrulama:** Yalnızca falcı profili olan hesaplar yayın açabiliyor — normal kullanıcı `POST /api/video-streams` çağrısında **`NOT_A_TELLER`** hatası aldı. Bu doğru bir kısıt olarak kaydedildi.

**Veritabanı etkisi:** `videoStream` kaydı + izleyici/presence kayıtları.  
**SSE olayı:** `connected`, `viewerCount` olayları gerçek koşumda görüldü.  
**Sonuç: PASS.** Yeni uç oluşturulmadı.

---

## 3. CANLI FALCI (danışan → falcı → seans)

**Uçlar:** `GET /api/fortune-tellers`, `POST /api/fortune-tellers/{tellerId}/session`, `GET /api/fortune-tellers/sessions`, `PATCH /api/fortune-tellers/sessions/{sessionId}`, `GET /api/fortune-tellers/room/{sessionId}`

| Adım | Gerçek Sonuç |
|---|---|
| Falcı listesi | **200**, test falcısı ilk sayfada görünüyor |
| Danışan seans talebi | **HTTP 201**, seans kimliği üretildi, durum `pending` |
| Falcı bekleyen talebi görüyor mu | **200** — **EVET, talep listede** |
| Falcı kabul | **200**, `status=active`, `roomId=room_<sessionId>_<zaman damgası>` |
| İki taraf aynı görüşme odasında mı | **EVET** — danışan ve falcı **birebir aynı** oda adını aldı, **kullanıcı kimlikleri farklı** |
| Oda bilgisi (danışan) | **200**, `status=active` |
| Yetkisiz 3. kişi oda erişimi | **HTTP 403** (doğru) |
| Seans tamamlama | **200**, oda durumu `completed` |
| Reddedilen seans iadesi | Bakiye **2950 → 2900 → 2950** — **tam iade** |

**Veritabanı etkisi:** `liveSession` (pending → active → completed), `tellerChatSession`, jeton hareketi ve iade.  
**TRTC etkisi:** Ortak oda adı üzerinden iki taraf da aynı odaya bağlanabiliyor.  
**SSE olayı:** Falcı tarafına bildirim/olay yayını yapılıyor.  
**Sonuç: PASS.**

---

## 4. SESLİ SOHBET ODALARI

**Uçlar:** `POST /api/chat/rooms/create`, `POST /api/live/join`, `POST /api/live/heartbeat`, `POST /api/live/leave-room`, `GET /api/live/online-users`

| Senaryo | Gerçek Sonuç |
|---|---|
| Oda A oluştur (sahip: kullanıcı) | **200** |
| Oda B oluştur (sahip: falcı) | **200** |
| JOIN (iki hesap) | **200 / 200** |
| HEARTBEAT | **200**, `onlineCount=2`, `staleRemoved=0`, sunucu saati var |
| Katılım sonrası presence | Online **2**, kullanıcı listede **EVET** |
| Ayrılma sonrası presence | Leave **200**, online **2 → 1**, ayrılan kullanıcı listede **HAYIR** |

**Not:** Oda oluşturma `name`, `description`, `icon` alanlarını zorunlu tutuyor ve ayar üzerinden ücret (varsayılan 100 jeton) düşüyor; `yonetici` rolü ücretsiz.  
**Sonuç: PASS.**

---

## 5. SEAT (KOLTUK) SİSTEMİ

**Uçlar:** `POST /api/chat/rooms/{roomId}/seats` (take / leave / swap / force-remove)  
**Sabitler:** koltuk sayısı 11, koltuk stale eşiği 45 sn.

| Senaryo | Gerçek Sonuç |
|---|---|
| Koltuk alma (index 3) | **200**, `seatIndex=3` |
| Dolu koltuğa ikinci talep | **HTTP 409**, `code=SEAT_TAKEN` |
| Geçersiz index (99) | **HTTP 400** |
| **YARIŞ TESTİ** — index 7'ye eş zamanlı 2 talep | **200 / 409**; veritabanında o koltuğun sahibi sayısı **1** → **tek kullanıcı kazandı** |
| Koltuk bırakma | **200** |
| Yetkisiz kullanıcının zorla çıkarması | **HTTP 403** |
| Koltuk değiştirme (oda sahibi) | **200** |

**Sonuç: PASS.**  
**Risk R-1 (öneri):** Koltuk alma akışı önce doluluk kontrolü yapıp sonra yazıyor; arada veritabanı düzeyinde kilit/işlem yok ve şemada `(roomId, seatIndex)` için tekil kısıt bulunmuyor. Production testinde tek kazanan çıktı, yani pratikte sorun görülmedi; yine de yoğun trafikte teorik açık kalıyor. **Önerilen düzeltme:** ilgili tabloya `(roomId, seatIndex)` tekil kısıtı eklemek ve alma işlemini tek bir işlem (transaction) içinde yürütmek.

---

## 6. HEDİYE / JETON

**Uçlar:** `GET /api/live/gift-types`, `POST /api/live/gift/send`

### 6.1 Normal kullanıcı — 500 jetonluk hediye (istenen kritik senaryo)

| Ölçüm | Gerçek Değer |
|---|---|
| Seçilen hediye | 500 jeton, adet 1 → toplam **500** |
| API yanıtı | **200**, `totalPrice=500`, `newBalance=2350` |
| Gönderen bakiyesi (veritabanı) | **2850 → 2350** = **−500** ✔ |
| Alıcı bakiyesi (veritabanı) | **900 → 1075** = **+175** (net pay, %35 — komisyon ayarı gereği) ✔ |
| Hediye kaydı | `totalPrice = 500` ✔ |
| Kendine hediye | **HTTP 400** (doğru) |

**Yanlış "0 jeton" yanıtı normal kullanıcı akışında ÜRETİLMİYOR.** Zincir: bakiye → işlem → hediye kaydı → alıcı → oda/yayın → PK skoru → olay yayını → animasyon verisi — hepsi 500 değeriyle tutarlı.

### 6.2 F-2 — FİNANS-DIŞI ROLDE "0 JETON" KUSURU (KANITLANDI)

Aynı hediye (`Elmas`, 500 jeton), aynı yayına, **`admin` rolündeki hesapla** gönderildi:

| Ölçüm | Normal kullanıcı | Admin (finans-dışı) |
|---|---|---|
| API yanıtı | 200, `totalPrice=500` | 200, **`totalPrice=500`** |
| Gönderen bakiyesi | 1840 → 1340 (−500) | **1000 → 1000 (değişmedi)** |
| Alıcı bakiyesi | arttı | **1500 → 1500 (değişmedi)** |
| **Veritabanındaki hediye kaydı** | `totalPrice = 500` | **`totalPrice = 0`** |
| Canlı olay (animasyon/sıralama) verisi | 500 | **0** |

**Zincirin kırıldığı tam nokta:** `app/api/live/gift/send/route.ts` — yayın (stream) dalında hediye kaydı `totalPrice: senderExcluded ? 0 : totalPrice` ile yazılıyor ve aynı ifade canlı olay verisine de uygulanıyor. Yani API yanıtı 500 derken, **kalıcı kayıt ve canlı olay 0** gidiyor. Sesli oda dalında aynı sıfırlama yok — orada gerçek tutar yazılıyor. Bu tutarsızlık, uygulamada "0 jeton" görünmesinin kaynağıdır.

**Önerilen düzeltme (uygulanmadı, onayınıza bırakıldı):** Finans-dışı rollerin kâr/zarar hesabına girmemesi için tutarı sıfırlamak yerine, kayıt gerçek tutarla yazılmalı ve raporlamada `excludedFromFinance` bayrağı ile ayrıştırılmalı. Böylece animasyon, sıralama ve PK skoru doğru tutarı görür; muhasebe yine etkilenmez.

**Ek not:** `admin` rolü bakiye kontrolünden **muaf değildir** (muafiyet yalnızca `yonetici` rolünde). Bakiyesi 0 olan admin hesabı `INSUFFICIENT_BALANCE` / **HTTP 400** aldı. Bu davranış, kusuru maskeleyerek ilk koşumda görünmesini engellemişti.

### 6.3 Jeton

Seans ücreti, iade, hediye düşümü, müzik isteği ücreti — dört akışta da bakiye hareketi beklenen değerle birebir uyuştu. **JETON: PASS.**

---

## 7. PK SİSTEMİ

**Uçlar:** `GET /api/live/pk?roomId=`, `POST /api/live/pk` (create / accept / reject / cancel / end)

### 7.1 Sesli oda PK — tam zincir çalışıyor

| Adım | Gerçek Sonuç |
|---|---|
| PK oluştur (oda A → oda B) | **200**, `status=pending` |
| Karşı oda GET ile görüyor mu | **200**, **EVET**, `status=pending` |
| **Karşı taraf canlı olay alıyor mu** | Oda B'nin canlı kanalı **PK isteğinden önce** açıldı, 25 sn dinlendi → **14 satır, 1 adet `pk` olayı**, olay tipleri: `connected`, `dj`, `pk`, `presence` → **EVET, gerçekten alıyor** |
| Kabul | **200**, `status=active` |
| Skor (hediye sonrası) | **0 → 500** |
| İzolasyon | Video PK ucu aynı karşılaşmayı **döndürmüyor** — sesli ve video PK durumları birbirini bozmuyor |
| Bitir | **200**, `status=completed` |

### 7.2 F-1 — CANLI YAYIN (VIDEO) PK'SINDA OLAY YAYINI YOK (KANITLANDI)

İki canlı yayın arasında PK isteği gönderildi ve hedef yayının canlı kanalı **istekten önce** açıldı:

| Ölçüm | Gerçek Değer |
|---|---|
| `POST /api/live/pk` create (yayın A → yayın B) | **HTTP 200**, karşılaşma oluştu, `status=pending` |
| Hedef yayının canlı kanalı (20 sn dinleme) | 6 satır — olay tipleri yalnızca **`connected`, `viewerCount`** |
| **Kanalda `pk` olayı sayısı** | **0** |
| `GET /api/live/pk?roomId=<yayın B>` | **200**, karşılaşma **görünüyor** (sorgulama çalışıyor) |

**Zincirin kırıldığı tam nokta:** `app/api/live/pk/route.ts` PK olaylarını yalnızca sohbet kanalına yayınlıyor (`emitChatEvent`). Yayın kanalını besleyen fonksiyon dosyanın başında içeri alınmış ama **hiçbir yerde çağrılmıyor**. Canlı yayın kanalı (`/api/video-streams/{id}/stream`) yalnızca yayın olaylarını okuduğu için PK olayı bu kanala hiç ulaşmıyor. Aynı eksik `app/api/video-streams/pk/route.ts` ve `pk/score/route.ts` dosyalarında da var: bu uçlar hiç olay yayınlamıyor. Ayrıca hediye gönderiminin yayın dalında PK skoru veritabanında güncelleniyor ama skor olayı yayınlanmıyor (sesli oda dalında yayınlanıyor).

**Etkisi:** Canlı yayın PK'sında karşı taraf, ekranda anlık PK daveti/başlangıç/skor bildirimi **alamaz**; yalnızca periyodik sorgulama yaparsa görür. Bu bir mobil uygulama kusuru **değildir** — kırılma noktası backend olay yayınıdır.

**Önerilen düzeltme (uygulanmadı):** PK create / accept / reject / end / score adımlarında, oda yayın türü ise sohbet kanalına ek olarak yayın kanalına da aynı olayı göndermek. Mevcut API contract'ı hiç değişmez, yalnızca eksik olay yayını eklenir.

---

## 8. PRESENCE / HEARTBEAT

**Uçlar:** `POST /api/live/heartbeat`, `GET /api/live/online-users`, `POST /api/live/leave-room`

| Senaryo | Gerçek Sonuç |
|---|---|
| Heartbeat (sesli oda) | **200**, `onlineCount=2`, `staleRemoved=0`, sunucu saati alanı mevcut |
| Heartbeat (yayın) | **200**, `onlineCount=1`, `staleRemoved=0` |
| Ayrılma sonrası | online **2 → 1**, ayrılan kullanıcı listede **HAYIR** |
| Yeniden bağlanma | Aynı kullanıcı tekrar katılınca sayım doğru güncelleniyor |

**Contract bozulmadı** — istek ve yanıt alanları değiştirilmedi.  
**Sonuç: PASS.**

**Risk R-2 (öneri):** Heartbeat'te "eskimiş katılımcı" eşiği 60 saniye, online sayımı ise 5 dakikalık pencere kullanıyor. Düzgün ayrılmada sorun görünmüyor (ayrılma kaydı zamanı geçmişe çekiyor). Ancak ağ kopması gibi kirli kesilmelerde online sayısı 5 dakikaya kadar şişik kalabilir. **Öneri:** iki eşiği tek değerde birleştirmek.

---

## 9. SSE (CANLI OLAY AKIŞI)

**Uçlar:** `/api/chat/rooms/{roomId}/stream`, `/api/video-streams/{streamId}/stream`

| Kanal | Gerçek Sonuç |
|---|---|
| Sohbet odası | `content-type: text/event-stream`, 3 olay satırı, olay tipleri `connected`, `presence`, `dj`, `pk` |
| Canlı yayın | `content-type: text/event-stream`, 2 olay satırı, olay tipleri `connected`, `viewerCount` |

**STAGE 13'te doğrulanan 20/20 davranış korunmuştur; yeni SSE sistemi oluşturulmamıştır.**  
**Sonuç: PASS** (yayın kanalındaki eksik PK olayı F-1 altında ayrıca raporlanmıştır).

**Risk R-3 (mimari, öneri):** Olay veri yolu süreç içi bellekte tutuluyor (olay başına en fazla 100 kayıt, 5 dakika ömür). Uygulama birden fazla sunucu örneğinde çalıştırıldığında, bir örnekte üretilen olay diğerine bağlı kullanıcıya ulaşmayabilir. Tek örnekte sorun yok. **Öneri:** ölçekleme planlanıyorsa olay yolunu paylaşımlı bir kanal üzerinden dağıtmak.

---

## 10. MÜZİK / !İSTEK

**Uçlar:** müzik arama, `song-request`, kuyruk, DJ olay kanalı

| Senaryo | Gerçek Sonuç |
|---|---|
| Arama, kimliksiz | **HTTP 401** |
| Çok kısa sorgu | **HTTP 400** |
| Arama | **200**, 12 sonuç döndü |
| `!istek` (ses modu) | **200**, bakiye **1850 → 1840** = **−10** (beklenen 10) ✔ |
| Kuyruk | **200**, istek kuyrukta **EVET** |
| DJ / müzik canlı olayı | 6 satır, `dj` olayı **mevcut** |

**Sonuç: PASS.** Yeni müzik sistemi oluşturulmadı.

**Risk R-4 (öneri):** Şarkı isteği ayrı bir tabloda değil, sohbet mesajı içeriğinde `|` ile ayrılmış tek satır olarak saklanıyor. Şarkı başlığında `|` karakteri geçerse ayrıştırma bozulur. Ücretler kod içinde sabit (ses 10, video 20) — panelden yönetilemiyor.

---

## 11. 5 DAKİKA OTOMATİK YAYIN KAPATMA

**Uç:** `GET/POST /api/video-streams/{streamId}/auto-close`

| Ölçüm | Gerçek Değer |
|---|---|
| GET yanıtı | **200**, `shouldClose:false`, `timeoutMinutes=15`, `remainingMinutes=15` |
| Ses / görüntü / medya hareketsizliği alanı | **YOK** |

**Mevcut davranış:** Kural, **son hediyeden bu yana geçen süre**dir (varsayılan 15 dakika, ayardan değiştirilebilir; 0 yapılırsa kapalı). Kontrol **yayıncının uygulaması tarafından sorgulanır**; sunucu tarafında zamanlanmış bir görev yoktur — yayıncı uygulaması sormazsa yayın kapanmaz. Kapatma işlemini yalnızca yayın sahibi yapabilir (`403` ile korunuyor).

**İstenen davranış:** "Ses yok **VE** görüntü yok **VE** aktif medya hareketi yok → 5 dakika sonra kapansın; sıradan heartbeat tek başına aktivite sayılmasın."

**Tespit: BU MANTIK SİSTEMDE UYGULANMAMIŞTIR.** Talimatınız gereği hiçbir zamanlanmış görev veya kod yazılmadı; yalnızca durum raporlandı.

**Önerilen yaklaşım (uygulanmadı, onayınızı bekliyor):** Yayın kaydına "son gerçek medya hareketi" zamanı eklenip; ses/görüntü açık kalma sinyali, hediye, mesaj ve koltuk hareketi bu zamanı tazeler; sıradan heartbeat tazelemez. Eşik ayardan yönetilir (5 dakika). Kapatma hem yayıncı sorgusunda hem de sunucu tarafında tetiklenir. Mevcut 15 dakikalık hediye kuralı ayrı bir ayar olarak korunabilir.

---

## 12. Test Verisi ve Yapılan Değişiklikler (şeffaflık)

**Gerçek kullanıcı verisine dokunulmadı.** Tüm işlemler yalnızca üç test hesabına ve `S14TEST` ön ekli kayıtlara sınırlandırıldı (yardımcı betikte sabit beyaz liste ile donanımsal olarak kısıtlı).

**Test sırasında yapılan kalıcı değişiklikler:**
1. Test falcı kaydı `isVerified: false → true`, `isOnline: false → true` yapıldı (falcı listesinde görünebilmesi için). **Geri alınmasını isterseniz bildirin.**
2. Önceki aşamalardan devam eden durum: test hesaplarından biri `admin` rolünde, biri aktif falcı kaydına sahip.

**Temizlik (gerçekten çalıştırıldı):**
```
pkBattles 3 | roomGifts 6 | roomMessages 15 | presences 6 | voiceSessions 0 | rooms 6
streamPk 1 | streamGifts 2 | streamViewers 4 | streamComments 0 | streams 11 | liveSessions 6
```
Temizlik sonrası üç test hesabının jeton bakiyesi **0**'a çekildi ve doğrulandı.

**Gizlilik:** Uygulama kimliği, imzalar, oturum anahtarları ve token değerleri bu raporda, komutlarda veya günlüklerde hiçbir yerde yer almamaktadır.

---

## 13. Düzeltme Önerileri — Öncelik Sırası

| Öncelik | Kod | Konu | Etki |
|---|---|---|---|
| **P0** | F-2 | Finans-dışı rolde hediye kaydı ve canlı olayının 0 jeton yazılması | Yanlış "0 jeton" görünümü, bozuk sıralama/animasyon |
| **P0** | F-1 | Canlı yayın PK'sında olay yayınının hiç yapılmaması | Karşı taraf PK davetini/skorunu anlık göremiyor |
| **P1** | — | 5 dk medya hareketsizliğine dayalı otomatik kapatma (hiç yok) | İstenen özellik eksik |
| **P2** | R-1 | Koltuk tekil kısıtı ve işlem kilidi | Yoğun trafikte teorik çift atama |
| **P2** | R-2 | Presence 60 sn / 5 dk eşik tutarsızlığı | Kirli kopmada şişik online sayısı |
| **P3** | R-3 | Süreç içi olay veri yolu | Çok örnekli ölçeklemede olay kaybı |
| **P3** | R-4 | Şarkı isteği ayrıştırma ve sabit ücretler | Başlıkta `|` varsa bozulma |

**Bu raporda hiçbir düzeltme uygulanmamıştır.** Talebiniz gereği yalnızca analiz yapıldı, mevcut çalışan API sözleşmeleri korundu, yeni uç/sistem oluşturulmadı ve mobil uygulama tarafına dokunulmadı.
