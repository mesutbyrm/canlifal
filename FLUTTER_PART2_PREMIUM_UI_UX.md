# CANLIFAL — FLUTTER GELİŞTİRME PROMPT'U
## PART 2 — PREMIUM UI/UX & TASARIM SİSTEMİ

> **Kaynak:** Bu doküman %100 gerçek backend + tema koduna dayalıdır (tailwind.config.ts, Prisma schema, canlidark bileşenleri).
> **Hedef:** Flutter uygulamasının, web (canlifal.com) ile birebir aynı premium "mistik/kozmik" görsel dili taşıması.
> **Önceki bölüm:** PART 1 — Sistem Mimarisi (base URL, JWT, SSE, TRTC).

---

## 1. TASARIM FELSEFESİ

Canlıfal, koyu (dark-first) bir "mistik gece / kozmik" estetiğine sahiptir. Amaç: kullanıcının bir falcı/astrolog dünyasına girdiğini hissetmesi. Üç ilke:

1. **Koyu zemin + neon vurgular** — Derin mor arka plan, üzerine pembe/altın parıltılar.
2. **Cam efekti (glassmorphism)** — Kartlar hafif şeffaf, blur'lu, ince ışıklı kenarlıklı.
3. **Yumuşak ışıma (glow)** — Butonlar ve önemli öğeler etrafında soft gradient gölge.

> **Kritik kural:** Flutter'da hiçbir ekran saf beyaz (#FFFFFF) zemin kullanmaz. Her ekran koyu mor gradient zemin üzerine kurulur.

---

## 2. RENK PALETİ (tailwind.config.ts ile birebir)

### 2.1 Ana palet (FalClub)
```dart
class AppColors {
  // Zemin katmanları (koyudan açığa)
  static const purpleDark   = Color(0xFF0F0520); // en koyu zemin (scaffold)
  static const purple       = Color(0xFF1A0A2E); // ana panel zemini
  static const purpleLight  = Color(0xFF2D1B47); // kart / yükseltilmiş yüzey

  // Vurgu renkleri
  static const pink         = Color(0xFFD946EF); // ana aksiyon / marka
  static const pinkLight    = Color(0xFFF0ABFC); // hover / ikincil vurgu
  static const gold         = Color(0xFFFBBF24); // premium / VIP / ödül

  // Metin
  static const text          = Color(0xFFFFFFFF); // başlık / ana metin
  static const textSecondary = Color(0xFFE9D5FF); // açıklama / ikincil metin
}
```

### 2.2 Anlamsal (semantic) renkler
```dart
static const success = Color(0xFF22C55E); // başarı / online
static const warning = Color(0xFFF59E0B); // uyarı
static const danger  = Color(0xFFEF4444); // hata / ban / bitir
static const info    = Color(0xFF3B82F6); // bilgi
```

### 2.3 Marka gradientleri
```dart
// Ana marka gradienti (buton, başlık, logo)
static const brandGradient = LinearGradient(
  begin: Alignment.topLeft, end: Alignment.bottomRight,
  colors: [Color(0xFFD946EF), Color(0xFF8B5CF6)], // pembe → mor
);

// Premium/altın gradient (VIP rozet, gold üyelik)
static const goldGradient = LinearGradient(
  begin: Alignment.topLeft, end: Alignment.bottomRight,
  colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
);

// Scaffold zemin gradienti (her ekranın arkası)
static const bgGradient = LinearGradient(
  begin: Alignment.topCenter, end: Alignment.bottomCenter,
  colors: [Color(0xFF0F0520), Color(0xFF1A0A2E), Color(0xFF0F0520)],
);
```

---

## 3. TİPOGRAFİ

```dart
class AppText {
  static const family = 'Poppins'; // Google Fonts — web ile uyumlu

  static const h1 = TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.text, height: 1.2);
  static const h2 = TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.text);
  static const h3 = TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.text);
  static const body = TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.textSecondary, height: 1.5);
  static const caption = TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondary);
  static const button = TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.text);
}
```

> **Kural:** Başlıklar beyaz (`text`), açıklamalar mor-beyaz (`textSecondary`). Altın rengi yalnızca premium/ödül bağlamında.

---

## 4. TEMEL BİLEŞENLER (Flutter widget'ları)

### 4.1 Glass Card (cam kart)
Tüm liste öğeleri, profil kartları, panel kutuları bu widget üzerine kurulur.
```dart
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  const GlassCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.06),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.12), width: 1),
          ),
          child: child,
        ),
      ),
    );
  }
}
```

### 4.2 Premium Button (ışımalı ana buton)
```dart
class PremiumButton extends StatelessWidget {
  final String label; final VoidCallback onTap; final bool gold;
  const PremiumButton({super.key, required this.label, required this.onTap, this.gold = false});

  @override
  Widget build(BuildContext context) {
    final gradient = gold ? AppColors.goldGradient : AppColors.brandGradient;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(
            color: (gold ? AppColors.gold : AppColors.pink).withOpacity(0.4),
            blurRadius: 20, offset: const Offset(0, 6),
          )],
        ),
        child: Text(label, style: AppText.button),
      ),
    );
  }
}
```
> **Kritik erişilebilirlik kuralı:** Buton metni her zaman beyaz, zemin gradient koyu. Asla açık zemin üzerine beyaz metin kullanma (kontrast kaybı). Gold buton üzerinde metin koyu (#1A0A2E) kullan.

### 4.3 Scaffold sarmalayıcı (her ekran)
```dart
class AppScaffold extends StatelessWidget {
  final Widget body; final PreferredSizeWidget? appBar;
  const AppScaffold({super.key, required this.body, this.appBar});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.bgGradient),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: appBar,
        body: SafeArea(child: body),
      ),
    );
  }
}
```

---

## 5. ÜYELİK SEVİYELERİ (backend: User.membership)

Backend `User.membership` üç değer alır: `basic`, `premium`, `gold` (default `basic`). `membershipExpiresAt` süre bitişini tutar.

| Üyelik | Renk | Rozet | Ayrıcalıklar (UI'da gösterim) |
|--------|------|-------|-------------------------------|
| `basic` | mor (`purpleLight`) | yok | Standart deneyim |
| `premium` | pembe (`pink`) | ✦ Premium | İsim yanında pembe rozet, özel çerçeve seçenekleri |
| `gold` | altın (`gold`) | 👑 Gold | Altın isim parıltısı, altın çerçeve, öncelikli sıra |

```dart
Color membershipColor(String m) => switch (m) {
  'gold'    => AppColors.gold,
  'premium' => AppColors.pink,
  _         => AppColors.purpleLight,
};

Widget membershipBadge(String m) {
  if (m == 'gold')    return _badge('👑 Gold', AppColors.goldGradient, Colors.black);
  if (m == 'premium') return _badge('✦ Premium', AppColors.brandGradient, Colors.white);
  return const SizedBox.shrink();
}
```

> **Kural:** Üyelik bilgisini `/api/user/profile` yanıtından oku (PART 1 — profil endpoint'i `role` ve `membership` döner). UI'da isim rengini ve rozeti buna göre uygula.

---

## 6. PROFİL ÇERÇEVELERİ & ROZETLER

### 6.1 Profil Çerçevesi (ProfileFrame)
Backend `User.profileFrameId` (kullanıcı seçimi) ve `adminAssignedFrameId` (admin ataması, seçimi ezer) tutar. Çerçeve, avatarın etrafına animasyonlu/statik bir PNG overlay olarak bindirilir.

```dart
class FramedAvatar extends StatelessWidget {
  final String avatarUrl; final String? frameUrl; final double size;
  const FramedAvatar({super.key, required this.avatarUrl, this.frameUrl, this.size = 64});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size, height: size,
      child: Stack(alignment: Alignment.center, children: [
        ClipOval(child: Image.network(avatarUrl, width: size * 0.82, height: size * 0.82, fit: BoxFit.cover)),
        if (frameUrl != null)
          Image.network(frameUrl!, width: size, height: size, fit: BoxFit.contain),
      ]),
    );
  }
}
```
> **Öncelik:** `adminAssignedFrame` varsa onu kullan, yoksa `profileFrame`. İkisi de yoksa çerçeve gösterme.

### 6.2 Özel Rozetler (specialBadges — JSON array)
`User.specialBadges` bir JSON dizisidir: `["vip", "verified", "beta_tester", ...]`. Her rozet küçük bir ikon/etiket olarak isim yanında gösterilir.

```dart
const badgeMap = {
  'vip':         ('👑', AppColors.gold),
  'verified':    ('✔', Color(0xFF3B82F6)),
  'beta_tester': ('🧪', AppColors.pink),
};
```

---

## 7. XP & SEVİYE SİSTEMİ (User.level, gamification)

Backend `User.level` (default 1) ve XP tabanlı ilerleme tutar. Falcılar ayrıca `tellerLevel` (bronze/silver/gold/diamond) taşır.

### 7.1 Seviye rozeti (kullanıcı)
```dart
Widget levelBadge(int level) => Container(
  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
  decoration: BoxDecoration(
    gradient: AppColors.brandGradient,
    borderRadius: BorderRadius.circular(10),
  ),
  child: Text('Lv $level', style: AppText.caption.copyWith(fontWeight: FontWeight.w700, color: Colors.white)),
);
```

### 7.2 Falcı seviyesi renkleri (tellerLevel)
```dart
Color tellerLevelColor(String l) => switch (l) {
  'diamond' => const Color(0xFF67E8F9), // parlak turkuaz
  'gold'    => AppColors.gold,
  'silver'  => const Color(0xFFCBD5E1),
  _         => const Color(0xFFB45309), // bronze
};
```

### 7.3 XP ilerleme çubuğu
```dart
LinearProgressIndicator(
  value: currentXp / nextLevelXp,
  minHeight: 8,
  backgroundColor: Colors.white.withOpacity(0.1),
  valueColor: const AlwaysStoppedAnimation(AppColors.pink),
);
```

---

## 8. ANİMASYON & MİKRO-ETKİLEŞİM

Premium his için zorunlu detaylar:

1. **Giriş efekti (entry effect):** VIP/gold kullanıcı bir canlı odaya girdiğinde ekranda kayan bir banner animasyonu (backend `entryEffect` alanına bakılır). `AnimatedSlide` + `Opacity` ile 2-3 sn gösterilip kaybolur.
2. **Hediye animasyonu:** Hediye gönderildiğinde tam ekran Lottie/GIF overlay (PART 6'da hediye mantığı detaylandırılacak).
3. **Buton basılma:** `AnimatedScale` ile 0.96'ya küçülme (100ms).
4. **Kart görünme:** Liste öğeleri `FadeIn` + hafif `slideY` (staggered, 40ms gecikmeli).
5. **Parıltı (shimmer):** Yükleniyor durumlarında koyu mor üzerine mor-beyaz shimmer (skeleton). Asla boş beyaz ekran gösterme.

```dart
// Skeleton shimmer temel rengi
baseColor: AppColors.purpleLight,
highlightColor: AppColors.pink.withOpacity(0.25),
```

---

## 9. NAVİGASYON YAPISI

Web navbar'ı (components/navbar.tsx) ile hizalı alt navigasyon (bottom nav):

| Sekme | İkon | Rota (Flutter) | Not |
|-------|------|----------------|-----|
| Ana Sayfa | ✨ Sparkles | `/home` | Canlı yayınlar, fal kartları, canlı falcılar |
| Canlı | 📡 | `/live` | Canlı yayın + sesli oda listesi |
| Fal | 🔮 | `/fortune` | AI + canlı falcı fal türleri |
| Mesajlar | 💬 | `/messages` | Bildirim rozetli |
| Panelim | 👤 | `/profile` | Role göre: admin→admin panel, diğer→profil |

> **Rol tabanlı "Panelim":** Backend `role` alanına göre etiket değişir — `admin`→"Admin Paneli", `yonetici`→"Yönetici Paneli", diğer→"Panelim". (Web navbar davranışıyla birebir.)

### 9.1 Bottom nav stili
```dart
// Aktif sekme: pembe ikon + üstte ince gradient çizgi + hafif glow
// Pasif sekme: textSecondary (mor-beyaz) ikon
BottomNavigationBar(
  backgroundColor: AppColors.purple,
  selectedItemColor: AppColors.pink,
  unselectedItemColor: AppColors.textSecondary,
  type: BottomNavigationBarType.fixed,
);
```

---

## 10. FAL KARTLARI (ana sayfa)

Ana sayfada mistik fal kartları (kahve, tarot, el falı, rüya, aşk, numeroloji, melek, aura, doğum haritası, evet/hayır, katina) gösterilir. Her kart:
- 4:3 en-boy oranlı arka plan görseli (backend `/public/fortunes/*.jpg` — koyu/mor/altın kozmik tema).
- Üzerine koyu gradient overlay (alttan yukarı) + başlık (beyaz).
- Dokununca ilgili fal akışına gider.

```dart
AspectRatio(
  aspectRatio: 4/3,
  child: Stack(fit: StackFit.expand, children: [
    Image.network(coverUrl, fit: BoxFit.cover),
    DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(
      begin: Alignment.bottomCenter, end: Alignment.topCenter,
      colors: [Colors.black.withOpacity(0.75), Colors.transparent],
    ))),
    Positioned(left: 12, bottom: 12, child: Text(title, style: AppText.h3)),
  ]),
);
```

> Fal kartı listesi backend `/api/homepage-fortune-cards` endpoint'inden gelir (PART 7 — Fal Mantığı bölümünde detaylandırılacak).

---

## 11. ERİŞİLEBİLİRLİK & KALİTE KONTROL LİSTESİ

Her ekran için doğrula:
- [ ] Zemin koyu gradient, saf beyaz yok.
- [ ] Metin/zemin kontrast oranı ≥ 4.5:1 (özellikle gold buton → koyu metin).
- [ ] Tüm butonların `onTap` handler'ı var (işlevsiz buton yok).
- [ ] Yükleniyor durumunda skeleton shimmer, boş beyaz ekran yok.
- [ ] Görsel yüklenemezse placeholder (mor kutu + ikon).
- [ ] Küçük ekranda (360px) taşma yok, `SingleChildScrollView`/`Flexible` kullanılmış.
- [ ] Üyelik/rol/rozet bilgisi `/api/user/profile` gerçek yanıtından geliyor, hardcode değil.

---

## 12. PART 2 ÖZET & SONRAKİ ADIM

Bu bölümde tanımlananlar: renk paleti (FalClub), tipografi (Poppins), temel widget'lar (GlassCard, PremiumButton, AppScaffold, FramedAvatar), üyelik seviyeleri (basic/premium/gold), profil çerçeveleri & rozetler, XP/seviye sistemi, animasyonlar, navigasyon ve fal kartları.

**Sonraki:** PART 3 — Profil Sistemi (profil ekranı, düzenleme, kredi/jeton bakiyesi, işlem geçmişi, ayarlar — `/api/user/profile`, `/api/user/...` endpoint'leriyle birebir).
