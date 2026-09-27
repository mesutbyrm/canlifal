# FIX_PROPOSALS — Açık Ürün Hataları İçin Düzeltme Önerileri

> **Kapsam uyarısı:** Bu belge **yalnızca öneridir**. Bu turda **hiçbir backend kodu değiştirilmemiş**,
> hiçbir dağıtım yapılmamış ve **üretim veritabanına hiçbir yazma** gerçekleştirilmemiştir.
> Aşağıdaki her satır ya *kaynak koddan doğrudan okunmuş kanıt* ya da açıkça **HİPOTEZ** etiketlidir.
> Tarih: 2026-09-27 · Referans dal: `docs/backend-flutter-parity-2026-09`

---

## 1. HATA — PK daveti karşı tarafa ulaşmıyor

### 1.1 Belirti

Bir taraf PK daveti oluşturuyor, davet kaydı veritabanında `pending` olarak yaratılıyor,
fakat karşı tarafın istemcisinde davet açılır penceresi görünmüyor. Davet 60 saniye
sonra sessizce sona eriyor (`PK_TIMEOUT_MS = 60_000`, `lib/pk-expiry.ts:9`).

### 1.2 Kanıt — üç PK giriş noktası, üç farklı yayın davranışı

PK oluşturma üç ayrı uçta gerçekleşiyor ve **oluşturma adımında yayınlanan olaylar birbirinden farklı**:

| Uç | `create` adımında yayın | Kapsanan veri yolu |
|---|---|---|
| `app/api/live/pk/route.ts:216-221` | `emitChatEvent(roomId)`, `emitChatEvent(targetRoomId)`, `emitStreamEvent(roomId)`, `emitStreamEvent(targetRoomId)` | **her iki yol** ✔ |
| `app/api/video-streams/pk/route.ts:243-245` | yalnız `emitStreamEvent(streamId)`, `emitStreamEvent(targetStreamId)` | **yalnız yayın yolu** ✘ |
| `app/api/chat/rooms/[roomId]/pk/route.ts:282-291` | `emitChatEvent` iki taraf + `emitPkInvite(targetRoomId, …)` | **yalnız sohbet yolu** ✘ |

Buna karşılık **kabul/iptal/bitiş** geçişleri ortak yardımcıyı kullanıyor:

```ts
// lib/pk-state.ts:106-111
export function emitPkToBothSides(battle: { stream1Id: string; stream2Id: string }, payload: any) {
  for (const id of [battle.stream1Id, battle.stream2Id]) {
    try { emitStreamEvent(id, 'pk', payload) } catch { /* sesli oda PK'sı */ }
    try { emitChatEvent(id, 'pk', payload)   } catch { /* yayın PK'sı */ }
  }
}
```

Yani **yalnızca davet (create) adımı bu ortak yardımcıya taşınmamış**. Daha önce yapılan
`resolveSide()` düzeltmesi sayesinde **oda ↔ yayın karışık PK** artık destekleniyor;
fakat karışık eşleşmede `video-streams/pk` yalnız yayın yoluna, `chat/rooms/[roomId]/pk`
yalnız sohbet yoluna yazdığı için **karşı taraf hiçbir zaman olayı görmüyor**.

Bu, elde kanıtı olan **birincil kök neden**dir.

### 1.3 İkincil bulgu — bağlantı anında bekleyen davet anlık görüntüsü yok

`app/api/chat/rooms/[roomId]/stream/route.ts:76` — SSE bağlantısı açıldığında istemciye
gönderilen tek kare `{"type":"connected","roomId":…}`. PK olayları yalnız
`…:119-124` satırlarındaki döngüde, **bağlantı açıldıktan sonra** üretilen olaylar için iletiliyor.

`…:83-85`: `Last-Event-ID` başlığı yoksa akış **`Date.now()`'dan** başlıyor → önceki olaylar tekrar oynatılmıyor.

Tampon ömrü `lib/chat-events.ts:33` → `EVENT_TTL_MS = 2 * 60 * 1000` (200 olay/oda, `:32`).
Bu pencere davet süresinden (60 sn) uzun, dolayısıyla **tampon süresi başlı başına hata değil**;
hata, `Last-Event-ID` göndermeyen taze bir istemcinin tamponu **hiç okumamasıdır**.

### 1.4 HİPOTEZ — çok örnekli dağıtım

`lib/chat-events.ts` süreç-içi bir `Map` üzerinde çalışıyor (`:29`). Uygulama birden fazla
sunucu örneğinde çalışıyorsa, daveti yaratan örneğin belleğine yazılan olay,
karşı tarafın SSE bağlantısını tutan diğer örnek tarafından **hiçbir zaman görülmez**.
**Bu bir hipotezdir** — buradan örnek sayısını doğrulayamıyorum; dağıtım yapılandırmasının
teyit edilmesi gerekir.

### 1.5 Önerilen düzeltme

**A. Davet adımını ortak yayıncıya taşı (zorunlu, düşük risk)**

Üç uçtaki `create` dalında satır içi `emit*` çağrılarını tek çağrıyla değiştir:

```ts
// her üç uçta, create dalında
emitPkToBothSides(battle, pkData)          // lib/pk-state.ts
try { emitPkInvite(battle.stream2Id, { ...battle, ...pkData }, {
  userId: currentUserId, userName: challenger?.name || undefined
}) } catch (e) { console.error('pk_invite emit error:', e) }
```

- `emitPkToBothSides` zaten her iki veri yolunu `try/catch` ile deniyor → karışık PK'da doğru taraf yakalıyor.
- `emitPkInvite` (`lib/voice-room-events.ts:211-215`) açılır pencere için `pk_invite` + `pk_requested` üretmeye devam eder.
- Yük yükü (`pkData`) alan adları üç uçta zaten aynı; `video-streams/pk` yükündeki fazladan `type: 'pk'` alanı zararsızdır.

**B. Bağlantı anında bekleyen PK anlık görüntüsü (zorunlu, düşük risk)**

İki seçenekten biri:

1. *Sunucu tarafı:* SSE `connected` karesinden hemen sonra, bekleyen/etkin PK varsa tek bir
   `{"type":"pk", action:"pending", …}` karesi gönder. Gerekli veri zaten
   `app/api/chat/rooms/[roomId]/state/route.ts:156-187` içinde `pk` nesnesi olarak üretiliyor
   ve `expireAllStalePKs()` orada çağrılıyor (`:13`).
2. *İstemci tarafı (backend değişikliği gerektirmez):* Flutter/web istemcisi oda veya yayına
   girdiğinde **bir kez** `GET /api/live/pk/active?roomId=<id>&includePending=1` çağırsın.
   Bu uç zaten var (`app/api/live/pk/active/route.ts`), `expireAllStalePKs()` çalıştırıyor ve
   `includePending=1` ile `['active','pending']` döndürüyor.

> Öneri: **her ikisi de**. (2) hemen uygulanabilir ve backend'e dokunmaz; (1) yarış durumunu kapatır.

**C. Yeniden bağlanmada `Last-Event-ID` (orta öncelik)**

İstemci son gördüğü olay kimliğini saklayıp yeniden bağlanırken `Last-Event-ID` başlığıyla
göndermeli; sunucu tarafı bunu zaten destekliyor (`stream/route.ts:83-85`).

**D. Çok örneklilik varsa ortak kanal (HİPOTEZ'e bağlı)**

Uygulama tek örnekten fazlaysa, süreç-içi `Map` yerine veritabanı/ortak önbellek tabanlı
bir yayın kanalı gerekir. **Önce örnek sayısı doğrulanmalı**; tek örnekse bu madde gereksizdir.

### 1.6 Risk ve etki

| Madde | Değişen dosya | Risk | Geri alma |
|---|---|---|---|
| A | 3 route dosyası, ~6 satır | Düşük — mevcut yardımcı, mevcut yük | Tek commit geri alınır |
| B-1 | 1 route dosyası, ~10 satır | Düşük — yalnız ek kare | Kare kaldırılır |
| B-2 | Yalnız istemci | Yok (backend değişmez) | — |
| C | Yalnız istemci | Yok | — |
| D | Altyapı | Yüksek | Ayrı planlanmalı |

### 1.7 Doğrulama planı

1. Oda ↔ oda, yayın ↔ yayın ve **oda ↔ yayın** olmak üzere üç senaryoda davet oluştur.
2. Karşı tarafın SSE akışını `curl -N` ile dinleyip `data.type == "pk"` ve `action == "created"` karesini gör.
3. Davet oluşturulduktan **sonra** bağlanan bir istemcide anlık görüntü karesinin geldiğini doğrula.
4. 60 saniye beklenip `status` alanının `expired` olduğunu `/api/live/pk/active` ile teyit et.
5. Testler arasında en az 70 sn bekle — `pk_create` hız sınırı 4 hızlı istekte 429 döndürüyor.

---

## 2. HATA — Hayalet varlık (5 dakikalık pencere)

### 2.1 Belirti

Odadan çıkan kullanıcı katılımcı listesinde dakikalarca görünmeye devam ediyor;
oda "dolu" görünüyor, çevrimiçi sayaçları şişiyor.

### 2.2 Kanıt — 300 000 ms sabiti 12 ayrı yerde elle yazılmış

`lastSeen >= now - 300000` (5 dakika) ortak bir sabite bağlı değil; şu dosyalarda tekrarlanıyor:

| Dosya | Satır |
|---|---|
| `app/api/chat/rooms/[roomId]/presence/route.ts` | 42, 365, 494, 595, 755 |
| `app/api/chat/rooms/[roomId]/stream/route.ts` | 159 |
| `app/api/chat/rooms/[roomId]/state/route.ts` | 58 |
| `app/api/mobile/home/route.ts` | 32 |
| `app/api/live/join-room/route.ts` | 301 |
| `app/api/live/heartbeat/route.ts` | 128 |
| `app/api/live/rooms/route.ts` | 138 |
| `app/api/live/online-users/route.ts` | 80 |

> `app/api/admin/payments/stream/route.ts:60` de `300000` içerir fakat bu bir **SSE zaman aşımıdır**,
> varlıkla ilgisi yoktur — kapsam dışı.

### 2.3 Kanıt — temizleyici 60 sn, sayaç 300 sn

Aynı dosyanın içinde iki farklı eşik kullanılıyor:

```ts
// app/api/live/heartbeat/route.ts:61-62  → 60 sn'de "left" işaretler
const sixtySecondsAgo = new Date(Date.now() - 60000)
// app/api/live/heartbeat/route.ts:118-121 → 60 sn'de isActive=false
lastPing: { lt: sixtySecondsAgo }
// app/api/live/heartbeat/route.ts:128     → ama sayım 300 sn penceresiyle
const presenceTimeout = new Date(Date.now() - 300000) // 5 min window
```

Yani izleyici/koltuk temizliği **60 saniyede** yapılırken, çevrimiçi sayımı **5 dakikalık**
pencere kullanıyor. Hayalet varlığın **doğrudan ve doğrulanmış** nedeni bu tutarsızlıktır.

### 2.4 Önerilen düzeltme

**A. Tek bir paylaşılan sabit**

```ts
// lib/presence.ts (yeni, küçük dosya)
export const PRESENCE_TTL_MS = 45_000          // 45 sn
export const PRESENCE_CUTOFF = () => new Date(Date.now() - PRESENCE_TTL_MS)
```

Yukarıdaki 12 çağrı yerini bu sabite bağla. Kalp atışı aralığı 10–15 sn olduğundan
45 sn üç kaçırılmış atışa yer bırakır; 60 sn daha muhafazakâr bir alternatiftir.

**B. Ayrılışta kesin silme**

- Odadan çıkışta `DELETE /api/chat/rooms/[roomId]/presence` çağrısını garanti altına al.
- Sekme kapanışı/arka plana alma için `navigator.sendBeacon` (web) ve
  `AppLifecycleState.detached/paused` (mobil) kancaları kullan.

**C. Sunucu tarafı süpürücü**

İstemci hiç haber vermeden kaybolduğunda diye, `PRESENCE_TTL_MS`'i aşan kayıtları
periyodik olarak temizleyen bir süpürücü (mevcut heartbeat içindeki `updateMany`
deseninin aynısı) tüm varlık tablolarında çalışsın.

**D. Sayım ile temizlik eşiğini eşitle**

`heartbeat` içindeki 60 sn temizlik ile sayımın aynı sabiti kullanması — bu tek başına
belirtinin büyük kısmını kapatır.

### 2.5 Risk ve etki

| Madde | Kapsam | Risk | Not |
|---|---|---|---|
| A | 12 çağrı yeri, sabit değişimi | Düşük-orta | Davranış değişikliği görünür: listeler hızlı boşalır |
| B | İstemci + mevcut DELETE ucu | Düşük | Backend değişikliği gerektirmeyebilir |
| C | Yeni süpürücü | Orta | Veritabanı yazma yükü artar; toplu `updateMany` ile sınırla |
| D | 1 dosya | Düşük | En yüksek fayda/risk oranı |

### 2.6 Doğrulama planı

1. İki hesapla odaya gir; birinin istemcisini **zorla** kapat (DELETE gönderilmeden).
2. Katılımcı listesinin ≤ 60 sn içinde küçüldüğünü gözle.
3. Normal çıkışta listenin **anında** güncellendiğini doğrula.
4. `GET /api/live/online-users` ve oda `state` ucunun aynı sayıyı verdiğini karşılaştır.

---

## 3. Uygulama sırası önerisi

| Sıra | İş | Gerekçe |
|---|---|---|
| 1 | 2-D (eşik eşitleme) | Tek dosya, en yüksek fayda |
| 2 | 1-A (`emitPkToBothSides` taşıması) | Kanıtlanmış kök neden, ~6 satır |
| 3 | 1-B-2 (istemcinin `pk/active` çağrısı) | Backend'e dokunmaz |
| 4 | 2-A + 2-B | Kalıcı çözüm |
| 5 | 1-B-1, 1-C | Yarış durumlarını kapatır |
| 6 | 1-D | Yalnız çok örneklilik doğrulanırsa |

## 4. Açık soru

Uygulamanın **kaç sunucu örneğinde** çalıştığı buradan tespit edilemiyor. Tek örnekse
madde 1-D gereksizdir; birden fazlaysa 1-A tek başına yetmez ve ortak yayın kanalı şarttır.
