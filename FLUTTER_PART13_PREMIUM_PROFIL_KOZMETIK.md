# FLUTTER PART 13 — PREMIUM PROFİL & KOZMETİK SİSTEMİ

> Bu bölüm; profil çerçeveleri, isim/profil efektleri, giriş efektleri, rozetler, Gold üyelik, oda kartları, oda arka planları, hediye animasyonları, seviye/XP ve admin panelinden dinamik yönetim konularını kapsar.
>
> **KRİTİK DÜRÜSTLÜK KURALI:** Aşağıdaki her özellik, `canlifal.com` backend'inin GERÇEK koduna göre iki kategoriye ayrılmıştır:
> - ✅ **HAZIR** — Model, tablo ve API zaten var. Flutter tarafında hemen tüketilebilir.
> - 🔧 **YENİ BACKEND GEREKİR** — Şu an backend'de karşılığı YOK. Flutter'da göstermeden önce backend'e yeni alan/model/endpoint eklenmeli. Bu bölümlerde önerilen Prisma şeması ve API tasarımı verilmiştir; ama "hazırmış" gibi kodlanmamalıdır.
>
> Bir özelliği 🔧 kategorisindeyse ve backend henüz eklenmediyse, Flutter tarafında "coming soon" / gizli tut. Var olmayan endpoint'e istek atan ekran yazma.

---

## 0. BACKEND GERÇEKLİK TABLOSU

| İstenen Özellik | Durum | Backend Dayanağı |
|---|---|---|
| Profil çerçevesi (rol/yetkiye göre) | ✅ HAZIR | `ProfileFrame` modeli, `/api/profile-frames`, `/api/admin/profile-frames`, `/api/admin/profile-frames/assign` |
| Gold üye çerçeve seçebilsin | ✅ HAZIR | `User.profileFrameId` (kullanıcı seçer), `tier: free/gold/admin_only` |
| Admin çerçeve atayabilsin (override) | ✅ HAZIR | `User.adminAssignedFrameId` + assign endpoint |
| Profil efekti (ateş, altın, elmas, aura, kalp, şimşek, gökkuşağı...) | ✅ HAZIR (kısmen) | `User.profileEffect` (string) — mevcut değerler: `sparkles, fire, rainbow, neon, gold, diamond, aura, hearts, cosmic, snow, lightning` |
| Rozet sistemi (Founder, Admin, Gold, VIP, Falcı...) | ✅ HAZIR | `MembershipBadge`, `CustomBadge`, `/api/admin/badges`, `/api/admin/membership-badges` |
| Gold üyelik paketleri | ✅ HAZIR | `MembershipPlan`, `MembershipPurchase`, `/api/memberships` |
| Hediye sistemi (tam ekran, kombo, nadir, lottie/svga) | ✅ HAZIR | `GiftType` (`isFullscreen`, `comboEnabled`, `assetType`, `tier`, `animationDurationMs`), `GiftEvent`, `GiftBattle`, `GiftGoal`, `GiftMission` |
| Oda arka planı (backend'den değiştirilebilir) | ✅ HAZIR | `ChatRoom.backgroundImage`, `ChatRoom.bannerImage` |
| Oda tipi / seviye / kategori | ✅ HAZIR (kısmen) | `ChatRoom.roomType` (FREE/NORMAL/VIP), müzik alanları |
| Seviye (Level 1-100) & XP | ✅ HAZIR | `User.xp`, `User.level`, `/api/user/xp` |
| Başarım / Achievement | ✅ HAZIR | `Achievement`, `UserAchievement`, `/api/user/achievements` |
| Günlük görevler | ✅ HAZIR | `DailyQuest`, `DailyTask`, `UserMissionProgress`, `/api/daily-missions`, `/api/games/quests` |
| Ziyaretçi sayacı / profil görüntüleme geçmişi | ✅ HAZIR | `ProfileView` |
| Sezonluk / haftalık turnuva | ✅ HAZIR (kısmen) | `WeeklyTournament`, `WeeklyTournamentEntry` |
| Oda teması yönetimi (admin) | ✅ HAZIR | `/admin/themes` |
| **İsim yazısı efektleri** (altın/gümüş/neon/rainbow yazı) | 🔧 YENİ | Kolon YOK — `User.nameEffect` eklenmeli |
| **Giriş (entrance) efektleri** (ejderha, altın yağmuru, meteor, kanat) | 🔧 YENİ | Model YOK — `EntranceEffect` + `User.entranceEffectId` |
| **Sohbet balonu skinleri** | 🔧 YENİ | Model YOK — `ChatBubbleSkin` + `User.chatBubbleId` |
| **Mikrofon çerçevesi / skin** | 🔧 YENİ | Model YOK — `MicFrame` + `User.micFrameId` |
| **Emoji paketleri** | 🔧 YENİ | Model YOK — `EmojiPack` |
| **Avatar aksesuarları** (şapka, taç, gözlük, kanat) | 🔧 YENİ | Model YOK — `AvatarAccessory` |
| **3D avatar** | 🔧 YENİ (büyük iş) | Yok — ayrı proje kapsamı |

> **Özet:** İstenen kozmetik özelliklerin yaklaşık yarısı backend'de HAZIR. Diğer yarısı (isim efekti, giriş efekti, sohbet balonu, mikrofon çerçevesi, emoji paketi, avatar aksesuarı, 3D avatar) için önce backend'e model/alan/endpoint eklenmelidir. Bu doküman ikisini de kapsar ama karıştırmaz.

---

## 1. PROFİL ÇERÇEVELERİ  ✅ HAZIR

### Backend gerçeği
`ProfileFrame` modeli:
```
id, name, imageUrl (şeffaf PNG), tier ("free" | "gold" | "admin_only"),
isActive, sortOrder
```
Kullanıcı bağlantıları: `User.profileFrameId` (kullanıcının seçtiği) ve `User.adminAssignedFrameId` (admin'in zorla atadığı — kullanıcı seçimini EZER).

### Endpointler
- `GET /api/profile-frames` → kullanıcının erişebildiği çerçeveler.
  - **Yanıt (legacy düz obje, `{success,data}` zarfı YOK):**
    ```json
    { "frames": [...], "currentFrameId": "...", "adminAssignedFrameId": null, "membership": "gold" }
    ```
- `POST /api/profile-frames` → kullanıcı çerçeve seçer (body: `{ frameId }`). Gold değilse `gold` tier çerçeve seçtiremez.
- `GET/POST/PATCH/DELETE /api/admin/profile-frames` → admin çerçeve ekle/güncelle/sil.
- `POST /api/admin/profile-frames/assign` → admin, belirli kullanıcıya çerçeve atar (`adminAssignedFrameId`).

### Efektif çerçeve mantığı (Flutter)
```dart
final effectiveFrameId = user.adminAssignedFrameId ?? user.profileFrameId;
```
Öncelik: admin ataması > kullanıcı seçimi.

### Flutter uygulaması
- Avatarı `Stack` içinde çiz: en altta avatar (`CircleAvatar` / `ClipOval`), üstte çerçeve PNG'si (`Image.network(frame.imageUrl, fit: BoxFit.contain)`).
- Çerçeve avatardan biraz büyük olmalı (ör. avatar 96px ise çerçeve konteyneri ~120px).
- Statik PNG çerçeveler doğrudan `Image.network`. **Animasyonlu çerçeveler (dönen ışık, neon, ateş) için:** `imageUrl` bir `.json` (Lottie) veya `.svga`/`.gif` olabilir — `assetType` alanı ProfileFrame'de YOK, bu yüzden uzantıdan tespit et: `.json`→Lottie, `.svga`→SVGA, `.gif`→`Image.network` (GIF), aksi halde statik PNG.
  - Lottie: `lottie` paketi. SVGA: `svgaplayer_flutter` paketi.
- Çerçeve seçim ekranı: `GET /api/profile-frames` ile grid göster, kilitli (gold) çerçevelerin üstüne kilit ikonu; kullanıcı gold değilse `POST` yerine "Gold'a yüksel" CTA'sı.

### Rol bazlı otomatik çerçeve
İstek: "Admin, Moderatör, Oda Sahibi, VIP, Gold... için farklı çerçeveler." Backend'de çerçeve `tier` bazlı (free/gold/admin_only); role göre OTOMATİK atama şu an admin'in `assign` endpoint'iyle manuel yapılır. Tam otomatik rol→çerçeve eşlemesi istenirse 🔧 küçük bir backend eklentisi gerekir (aşağıda "Öneri").

> 🔧 **Öneri (opsiyonel):** `ProfileFrame`'e `autoAssignRole String?` alanı eklenip, kullanıcı rolü bu alana eşitse çerçeve otomatik uygulanabilir. Additive (güvenli) bir şema değişikliğidir.

---

## 2. PROFİL EFEKTLERİ (avatar çevresi)  ✅ HAZIR (kısmen)

### Backend gerçeği
`User.profileEffect` (nullable string). Kodda kullanılan mevcut değerler:
`sparkles, fire, rainbow, neon, gold, diamond, aura, hearts, cosmic, snow, lightning`.

İstenen ek efektler (dönen yıldızlar, kar taneleri, güller, kelebekler, ay-yıldız, duman, galaksi, altın tozu, elmas parçacığı) — bunlar YENİ efekt anahtarlarıdır. Backend zaten serbest string tuttuğu için **yeni model gerekmez**; sadece yeni anahtar + Flutter'da o anahtara karşılık gelen animasyon eklenir. Yönetimini tam dinamik yapmak istersen 🔧 (aşağı bak).

### Flutter uygulaması
- `profileEffect` string'ini bir `switch`/map ile particle/animasyon widget'ına çevir.
- Parçacık efektleri için: `Stack` + döngüsel `AnimationController`, ya da hazır Lottie dosyaları (her efekt için bir `.json`). Lottie en pratik yol: `assets/effects/fire.json`, `snow.json` vb.
- Efekt avatarın ARKASINDA veya ÜSTÜNDE overlay olarak konumlandırılır; tıklamayı engellememesi için `IgnorePointer` ile sar.

> 🔧 **Tam dinamik yönetim için öneri:** Efektleri koda gömmek yerine bir `ProfileEffectAsset { key, name, assetUrl, assetType, tier, isActive }` modeli açılırsa, admin yeni efekt (Lottie/SVGA) yükleyip anahtar tanımlayabilir; Flutter `assetUrl`'i indirip oynatır. Böylece "backend'den açılıp kapatılsın" isteği tam karşılanır. Şu an backend'de bu model YOK.

---

## 3. İSİM YAZISI EFEKTLERİ  🔧 YENİ BACKEND GEREKİR

İstek: altın/gümüş/elmas/neon/rainbow/parlayan/ateş/kristal/cam/hologram isim yazısı + animasyonlar (shine, wave, glitter, glow, pulse, gradient akışı).

**Backend'de karşılığı YOK.** Kod yazmadan önce eklenmesi gerekenler:

### Önerilen şema (additive, güvenli)
```prisma
model User {
  // ...
  nameEffect String? // "gold" | "silver" | "diamond" | "neon" | "rainbow" | "fire" | "crystal" | "glass" | "hologram"
}
```
Dinamik yönetim istenirse ayrı katalog:
```prisma
model NameEffect {
  id String @id @default(cuid())
  key String @unique      // "gold", "rainbow"...
  name String
  tier String @default("gold") // free/gold/admin_only
  cssPreset String? @db.Text  // renk/gradyan/animasyon parametreleri (JSON)
  isActive Boolean @default(true)
  sortOrder Int @default(0)
}
```

### API (eklenecek)
- `GET /api/name-effects` → aktif efekt kataloğu.
- `POST /api/user/name-effect` → kullanıcı seçer (gold kontrolü).
- `admin/name-effects` CRUD.

### Flutter (backend eklendikten sonra)
- İsmi `ShaderMask` ile gradient boya (altın/gümüş/rainbow).
- Shine/glitter/pulse için `AnimationController` + `LinearGradient` kaydırma (`GradientRotation` / animated `Alignment`).
- Neon/glow için `Text` üstüne `Shadow` listesi (blur'lı gölgeler).

> Backend bu alanı eklemeden Flutter tarafında isim efekti göstermeye çalışma; veri kaynağı olmaz.

---

## 4. GİRİŞ (ENTRANCE) EFEKTLERİ  🔧 YENİ BACKEND GEREKİR

İstek: kullanıcı odaya girince ejderha / altın yağmuru / meteor / kanat / melek / ateş / havai fişek / taç / galaksi animasyonu.

**Backend'de karşılığı YOK.** Sesli oda / canlı yayın gerçek zamanlı olayları backend'den **SSE** ile akıyor (bkz. PART 4/5). Giriş efekti, kullanıcı odaya join olduğunda bir SSE olayı olarak yayınlanmalı.

### Önerilen şema
```prisma
model EntranceEffect {
  id String @id @default(cuid())
  name String
  assetUrl String       // lottie/svga/mp4
  assetType String @default("lottie")
  tier String @default("gold")
  durationMs Int @default(3000)
  isActive Boolean @default(true)
  sortOrder Int @default(0)
}
model User {
  entranceEffectId String? // seçili giriş efekti
}
```

### Akış
1. Kullanıcı odaya katılır (mevcut `join-room` endpoint'i).
2. Backend, o odadaki herkese SSE ile `user_entered` olayı yollar; payload'a `entranceEffect { assetUrl, assetType, durationMs }` eklenir.
3. Flutter istemcileri olayı alır, tam ekran overlay'de efekti `durationMs` boyunca oynatıp kaldırır (kuyruk mantığı: aynı anda birden fazla giriş varsa sırayla).

### Flutter
- Tam ekran `Overlay` / `Stack` en üst katman.
- SVGA (Tencent ekosisteminde yaygın) veya Lottie oynatıcı; bitince `dispose`.
- Kuyruk: `Queue<EntranceEvent>`; biri biterken sıradakini başlat.

---

## 5. SOHBET BALONU · MİKROFON ÇERÇEVESİ · EMOJİ PAKETİ · AVATAR AKSESUARI  🔧 YENİ BACKEND GEREKİR

Dördü de backend'de YOK. Ortak desen: bir katalog modeli + `User` üzerinde seçili id + gold/tier kontrolü + admin CRUD.

### Önerilen şema (özet)
```prisma
model ChatBubbleSkin { id String @id @default(cuid()) name String assetUrl String tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model MicFrame       { id String @id @default(cuid()) name String assetUrl String tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model EmojiPack      { id String @id @default(cuid()) name String coverUrl String emojis String @db.Text /*JSON*/ tier String @default("gold") isActive Boolean @default(true) }
model AvatarAccessory{ id String @id @default(cuid()) name String slot String /*hat|crown|glasses|wings*/ assetUrl String tier String @default("gold") isActive Boolean @default(true) }
model User { chatBubbleId String? micFrameId String? avatarAccessoryIds String? /*JSON dizi*/ }
```

### Flutter notları (backend eklendikten sonra)
- **Sohbet balonu:** mesaj widget'ının arka planını 9-patch benzeri `DecorationImage` veya özel `CustomPainter` ile skin'e göre çiz.
- **Mikrofon çerçevesi:** sesli oda koltuğundaki avatarın etrafına PNG/Lottie overlay (profil çerçevesiyle aynı teknik).
- **Emoji paketi:** `emojis` JSON'ından `key→imageUrl` map; sohbet inputuna emoji seçici.
- **Avatar aksesuarı:** `slot`'a göre avatar üstünde konumlanan PNG katmanları (taç üstte, gözlük ortada, kanat arkada).

---

## 6. ROZET SİSTEMİ  ✅ HAZIR

### Backend gerçeği
- `MembershipBadge` — tier bazlı şerit/rozet (`tier`, `imageUrl`).
- `CustomBadge` — `icon` (emoji/id), `color`, `bgColor`, ve **`tier`** (üyelik tier'ına otomatik) VEYA **`userId`** (belirli kullanıcıya) atanabilir.
- `User.specialBadges` — JSON dizi (vip, beta_tester, verified vb.).
- Admin: `/api/admin/badges`, `/api/admin/membership-badges`.

Bu yapı; Founder / Admin / Moderatör / Destek / Doğrulanmış / Gold / Premium / VIP / Falcı / Yayıncı / İlk 100 Üye / Bağışçı gibi rozetleri **kodsuz** eklemeye yeter (admin panelinden `CustomBadge` oluştur, `tier` ya da `userId` ile ata).

### Flutter
- Kullanıcı objesindeki rozet listesini isim yanında küçük chip/row olarak göster.
- `CustomBadge`: `icon` + `color`/`bgColor` ile `Container`(rounded) içinde `Text`/emoji.
- `MembershipBadge`: `imageUrl` şerit → isim altında `Image.network`.

---

## 7. GOLD ÜYELİK  ✅ HAZIR

### Backend gerçeği
- `MembershipPlan` (tier basic/premium/gold/diamond, `durationDays`, `priceType` jeton/money, `price`, `features` JSON, `bonusJetons`, `discountPercent`, `exclusiveBadge`).
- `MembershipPurchase` (satın alma kaydı).
- `User.membership` + `User.membershipExpiresAt`.
- Endpointler: `/api/memberships`, `/api/memberships/purchase`, `/api/membership/packages`, admin `/api/admin/memberships`.

### Gold ayrıcalıkları eşlemesi
"Gold kullanıcı çerçeve/isim efekti/profil efekti/sohbet balonu/giriş animasyonu/mikrofon çerçevesi/emoji paketi seçebilsin" isteği, her kozmetik modelin `tier` alanıyla zaten desteklenir: `tier: gold` olan varlığı yalnızca `membership == gold` (veya üstü) seçebilir. Bu kontrol seçim endpointlerinde yapılır (bkz. profile-frames POST örneği).

### Flutter
- Üyelik satın alma ekranı: `GET /api/memberships` → plan kartları; `discountPercent`, `bonusJetons`, `features` göster.
- Gold aktifse kozmetik seçicilerde kilitleri aç; değilse "Gold'a yüksel" yönlendirmesi.
- `membershipExpiresAt` ile kalan gün rozet/geri sayım.

---

## 8. SESLİ SOHBET ODA KARTLARI  ✅ HAZIR (görsel katman Flutter'da)

### Backend gerçeği
`ChatRoom` alanları: `backgroundImage`, `bannerImage`, `roomType` (FREE/NORMAL/VIP), `currentMusicVideoId`, `currentMusicTitle`, `currentMusicStartedAt`. Oda listesi ve online sayısı canlı akar (PART 4).

İstenen kart öğeleri backend verisiyle beslenir; **animasyon/görsel efekt Flutter tarafındadır** (canlı ses dalgası, dönen müzik ikonu, mikrofon animasyonu, konuşan avatarın büyümesi).

### Flutter
- **Canlı ses dalgası / konuşan avatarın büyümesi:** TRTC volume callback'i (`onUserVoiceVolume`) kullan. Volume eşiği aşılınca o kullanıcının avatarını `AnimatedScale` ile ~1.15x büyüt + halka (glow) göster; konuşmayan normal (1.0x).
- **Dönen müzik ikonu:** `currentMusicVideoId != null` ise `RotationTransition` ile sürekli dönen nota ikonu.
- **Rozetler (oda sahibi/admin/gold/vip):** kullanıcı rolü + `roomType`'a göre kartın köşesine chip.
- **Online kişi sayısı sarı parlayan yazı:** `ShaderMask` altın gradient + hafif glow gölge.
- **Oda seviyesi / popülerlik / kategori:** backend'de dedike alan sınırlı (`roomType` var). Seviye/popülerlik puanı istenirse 🔧 `ChatRoom`'a `level Int`, `popularityScore Int`, `category String?` eklenebilir (additive).

---

## 9. ODA ARKA PLANI & TEMALAR  ✅ HAZIR

### Backend gerçeği
- `ChatRoom.backgroundImage` — admin/oda sahibi tarafından değiştirilebilir arka plan URL'i.
- Admin `/admin/themes` sayfası tema yönetimi için mevcut.

Uzay / Galaksi / Kahve Falı / Tarot / Lüks Salon / Gece Kulübü / Altın Salon / Kraliyet / Kristal Oda gibi hazır temalar; her biri bir `backgroundImage` (statik) veya animasyonlu asset (Lottie/mp4/GIF) URL'i olarak tanımlanır.

### Flutter
- Oda ekranının en arka katmanı: `backgroundImage` → `.json` ise Lottie, `.mp4` ise `video_player` (loop), aksi halde `Image.network` (`BoxFit.cover`).
- İçeriğin okunabilirliği için üstüne yarı saydam koyu overlay (`Container(color: Colors.black.withOpacity(.35))`).

> 🔧 **Öneri:** "Oda teması" kataloğu (hazır tema listesi) için `RoomTheme { id, name, backgroundUrl, assetType, tier, isActive }` modeli açılır ve oda sahibi listeden seçer. Şu an tema seçimi tek `backgroundImage` alanıyla serbest URL üzerinden. Mevsimsel temalar (Yılbaşı/Ramazan/Cadılar Bayramı) da bu katalogda `activeFrom/activeTo` alanlarıyla yönetilebilir.

---

## 10. HEDİYE SİSTEMİ  ✅ HAZIR (zengin)

### Backend gerçeği — `GiftType`
```
assetUrl, assetType (image|video|lottie|svga|gif), animationDurationMs,
isFullscreen (tam ekran animasyon), tier (small|big|huge), comboEnabled
```
Ek modeller: `GiftEvent` (gönderim olayı), `GiftBattle`/`GiftBattleParticipant`, `GiftGoal`, `GiftMission`, ve bağlam bazlı hediyeler: `StreamGift`, `TellerGift`, `ChatRoomGift`, `PkGift`.

İstenen özelliklerin karşılığı:
- **Tam ekran animasyon** → `isFullscreen = true`.
- **Kombolu hediye** → `comboEnabled = true` (istemci combo sayacı + hızlı tekrar gönderim).
- **Nadir hediyeler / seviyeler** → `tier` (small/big/huge) + fiyat.
- **Zincir / global bildirim** → hediye gönderimi SSE ile odaya/globale yayınlanır (PART 6'daki hediye akışı).
- **En çok hediye atan / günlük-haftalık-aylık sıralama** → `GiftEvent` toplamları üzerinden leaderboard (PART 6).

### Flutter
- **Animasyon oynatma (assetType'a göre):** `lottie`→Lottie, `svga`→SVGAPlayer, `gif`/`image`→`Image.network`, `video`→`video_player`. `isFullscreen` ise tam ekran overlay; değilse mesaj akışı üstünde küçük banner.
- **Kombo:** aynı hediyeye art arda basınca `comboCount` artır, `x2 x3...` animasyonlu sayaç; `comboEnabled` false ise tek gönderim.
- **Global bildirim:** huge/tier yüksek hediyelerde ekranın üstünde kayan (marquee) global duyuru şeridi.
- **Kuyruk:** aynı anda gelen tam ekran hediyeleri sıraya koy, `animationDurationMs` süresince oynat.

---

## 11. SEVİYE / XP · BAŞARIM · GÖREV  ✅ HAZIR

### Backend gerçeği
- **XP/Level:** `User.xp`, `User.level`. `GET /api/user/xp` →
  ```json
  { "xp": 1234, "level": 12, "xpForNextLevel": 1200, "xpInCurrentLevel": 34, "title": "...", "loginStreak": 5 }
  ```
  Kural: `xpForNextLevel = level * 100`. Level 1-100 hedefi bu formülle desteklenir.
- **Başarım:** `Achievement` (code, nameTr/En, icon, category, targetValue, rewardCredits), `UserAchievement` (progress, isCompleted). `/api/user/achievements`.
- **Günlük görev:** `DailyQuest`, `DailyTask`, `UserMissionProgress`, `/api/daily-missions`, `/api/games/quests`.

### Flutter
- Profil başlığında level rozeti + XP ilerleme çubuğu (`xpInCurrentLevel / xpForNextLevel`).
- Başarım ekranı: kategorilere ayrılmış grid; tamamlanan/ilerleyen; `rewardCredits` göster.
- Günlük görevler: liste + "Ödülü Al" butonu; ilerleme `UserMissionProgress`'ten.

---

## 12. DİĞER PREMIUM ÖZELLİKLER — durum eşlemesi

| Özellik | Durum | Not |
|---|---|---|
| Ziyaretçi sayacı / profil görüntüleme geçmişi | ✅ | `ProfileView` modeli |
| Çevrim içi durum animasyonu | ✅ | Presence verisi mevcut (ChatPresence/SitePresence); animasyon Flutter'da |
| Ses seviyesiyle hareket eden avatar halkası | ✅ (Flutter) | TRTC volume callback (bkz. §8) |
| Gerçek zamanlı popüler odalar sıralaması | ✅ (kısmen) | Oda listesi + katılımcı sayısı var; "popülerlik puanı" alanı 🔧 eklenebilir |
| Haftalık/sezonluk turnuva & ödül | ✅ | `WeeklyTournament(Entry)` |
| Premium'da reklam kaldırma | ✅ (mantık) | `AdNetwork` var; `membership != basic` ise reklam gösterme (Flutter kontrolü) |
| Koleksiyon sistemi (hediye koleksiyonu) | ✅ (kısmen) | `GiftEvent` geçmişinden türetilir |
| Mevsimsel oda temaları | 🔧 | §9 `RoomTheme` önerisi |
| Arkadaşın burada etiketi | 🔧 | `Follow` verisi + oda katılımcı listesi çapraz sorgusu (yeni endpoint) |
| Oda rezervasyon / etkinlik geri sayım | 🔧 | Yeni model (`RoomReservation` / `RoomEvent`) |
| Profil ziyaretçi defteri | 🔧 | Yeni model (`GuestbookEntry`) |
| AI destekli profil önerileri | 🔧 | LLM API + yeni endpoint |
| 3D avatar | 🔧 (büyük) | Ayrı kapsam |
| Mikrofon skin / profil kartı teması / kapak fotoğrafı | 🔧 | §5 desenine göre yeni kataloglar |

---

## 13. ADMİN PANELİNDEN YÖNETİM  (kodsuz)

### Şu an admin panelinde HAZIR olanlar
- Profil çerçevesi ekleme/atama → `/admin/profile-frames` (+assign)
- Rozet ekleme (tier/kullanıcı bazlı) → `/admin/badges`, `/admin/membership-badges`
- Üyelik (Gold) paketleri → `/admin/memberships`
- Oda / tema yönetimi → `/admin/chat-rooms`, `/admin/themes`
- Hediye türleri → (GiftType yönetimi; asset yükleme lottie/svga/gif)
- Görev/başarım verisi → seed + ilgili admin uçları

### Kodsuz yönetim için 🔧 EKLENMESİ GEREKENLER
"Hiç kod değiştirmeden yeni isim efekti / giriş efekti / sohbet balonu / mikrofon çerçevesi / emoji paketi / avatar aksesuarı ekleme, GIF/APNG/Lottie yükleme, kullanıcıya özel efekt verme, tarihli kampanya" isteklerinin tümü, §3–§5'te önerilen yeni kataloglar + her biri için admin CRUD sayfası eklenince mümkün olur. Ortak desen:
1. Katalog modeli (`key/name/assetUrl/assetType/tier/isActive/sortOrder` + kampanya için `activeFrom/activeTo`).
2. `User.<x>Id` seçili alan + admin "belirli kullanıcıya ata" endpoint'i (profil çerçevesindeki `assign` deseninin aynısı).
3. Admin sayfası: asset yükleme (cloud storage), tier seçimi, aktif/pasif toggle.

> Bu, backend tarafında yapılacak iş; Flutter yalnızca katalog endpoint'ini okuyup seçili asset'i oynatır.

---

## 14. TOPLU ÖNERİLEN PRİSMA ŞEMASI (yeni kozmetikler)

> Hepsi **additive** (mevcut veriyi bozmaz) → paylaşımlı veritabanında güvenli. Uygulanınca diğer uygulamaların da şemayı senkronlaması gerektiğini unutma.

```prisma
model User {
  nameEffect         String?
  entranceEffectId   String?
  chatBubbleId       String?
  micFrameId         String?
  avatarAccessoryIds String?  @db.Text // JSON dizi
}

model EntranceEffect  { id String @id @default(cuid()) name String assetUrl String assetType String @default("lottie") tier String @default("gold") durationMs Int @default(3000) isActive Boolean @default(true) sortOrder Int @default(0) activeFrom DateTime? activeTo DateTime? }
model ChatBubbleSkin  { id String @id @default(cuid()) name String assetUrl String tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model MicFrame        { id String @id @default(cuid()) name String assetUrl String tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model EmojiPack       { id String @id @default(cuid()) name String coverUrl String emojis String @db.Text tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model AvatarAccessory { id String @id @default(cuid()) name String slot String assetUrl String tier String @default("gold") isActive Boolean @default(true) sortOrder Int @default(0) }
model NameEffect      { id String @id @default(cuid()) key String @unique name String tier String @default("gold") cssPreset String? @db.Text isActive Boolean @default(true) sortOrder Int @default(0) }
model RoomTheme       { id String @id @default(cuid()) name String backgroundUrl String assetType String @default("image") tier String @default("free") isActive Boolean @default(true) activeFrom DateTime? activeTo DateTime? sortOrder Int @default(0) }
```

---

## 15. FLUTTER GENEL UYGULAMA NOTLARI

- **Asset türü tespiti:** her kozmetik asset URL'i için `assetType` alanını tercih et; yoksa uzantıdan (`.json`→Lottie, `.svga`→SVGA, `.gif`→GIF, `.mp4`→video, aksi PNG).
- **Paketler:** `lottie`, `svgaplayer_flutter`, `video_player`, `cached_network_image` (asset cache), `flutter_animate` (shine/pulse/gradient kolaylığı).
- **Performans:** aynı anda çok sayıda animasyon (oda kartları + efektler) FPS düşürür. Görünmeyen (viewport dışı) kartların animasyonlarını durdur; tam ekran efektleri kuyruğa al, üst üste bindirme.
- **Gerçek zaman:** giriş efekti, hediye, konuşan avatar → tümü backend'in **SSE** akışından (PART 4/5/6). WebSocket YOK.
- **`{success,data}` zarfı:** yeni ekleyeceğin uçları bu zarfla döndür; ama §1'deki `profile-frames` gibi bazı LEGACY uçlar düz obje döner — istemcide iki şekli de tolere et.
- **Gold kontrolü client'ta GÜVENLİK değildir:** kilidi UI'da göster ama gerçek `tier` kontrolü her zaman backend seçim endpoint'inde yapılır.
- **Yetki/rol:** roller `admin/yonetici/moderator/finans` + `user`; kozmetik erişimi `membership` (basic/premium/gold/diamond) ve rol kombinasyonuna göre.

---

## ÖZET & SONRAKİ ADIM

- **Hemen yapılabilir (backend HAZIR):** profil çerçeveleri, profil efektleri, rozetler, Gold üyelik, hediye animasyonları (tam ekran/kombo/lottie/svga), oda arka planı, oda kartları (konuşan avatar/ses dalgası), XP/level, başarım, günlük görev, ziyaretçi sayacı, haftalık turnuva.
- **Önce backend eklenmeli (🔧):** isim yazısı efektleri, giriş (entrance) efektleri, sohbet balonu skinleri, mikrofon çerçeveleri, emoji paketleri, avatar aksesuarları, oda teması kataloğu/mevsimsel temalar, rezervasyon/etkinlik, ziyaretçi defteri, AI profil önerileri, 3D avatar.

Bu ayrım sayesinde Flutter ekibi "hazır" olanları bugün entegre edebilir; "yeni" olanlar için önce §14'teki additive şema + admin CRUD'lar backend'e eklenir, sonra Flutter tüketir. Böylece hiçbir ekran var olmayan bir endpoint'e bağlanmaz.
