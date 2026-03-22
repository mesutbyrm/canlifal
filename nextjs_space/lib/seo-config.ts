// Centralized SEO configuration for the fortune telling platform

export const SITE_NAME = 'Canlifal'
export const SITE_URL = process.env.NEXTAUTH_URL || 'https://canlifal.com'
export const SITE_DESCRIPTION_TR = 'Gerçek falcılarla canlı fal deneyimi. Kahve falı, tarot falı, el falı, rüya tabiri ve astroloji yorumları ile geleceğinizi keşfedin.'
export const SITE_DESCRIPTION_EN = 'Live fortune telling experience with real fortune tellers. Discover your future with coffee reading, tarot, palm reading, dream interpretation and astrology.'

export const FORTUNE_SEO: Record<string, { titleTr: string; titleEn: string; descTr: string; descEn: string; keywords: string[] }> = {
  coffee: {
    titleTr: 'Kahve Falı - Online Kahve Falı Baktır',
    titleEn: 'Coffee Reading - Online Coffee Fortune',
    descTr: 'Yapay zeka destekli kahve falı. Fincanınızın fotoğrafını yükleyin, detaylı kahve falı yorumunuzu anında alın. Ücretsiz kahve falı deneyimi.',
    descEn: 'AI-powered coffee reading. Upload your cup photo, get detailed coffee fortune interpretation instantly.',
    keywords: ['kahve falı', 'online kahve falı', 'kahve falı baktır', 'fincan falı', 'türk kahvesi falı', 'coffee reading', 'turkish coffee fortune'],
  },
  tarot: {
    titleTr: 'Tarot Falı - Online Tarot Kartı Aç',
    titleEn: 'Tarot Reading - Online Tarot Cards',
    descTr: 'Ücretsiz tarot falı. Tarot kartlarınızı seçin ve geleceğiniz hakkında detaylı yorumlar alın. Aşk, kariyer, sağlık tarot falı.',
    descEn: 'Free tarot reading. Select your tarot cards and get detailed interpretations about your future.',
    keywords: ['tarot falı', 'online tarot', 'tarot kartları', 'ücretsiz tarot', 'aşk tarosu', 'tarot reading', 'free tarot'],
  },
  palm: {
    titleTr: 'El Falı - Online El Falı Baktır',
    titleEn: 'Palm Reading - Online Palmistry',
    descTr: 'Elinizin fotoğrafını yükleyin, yapay zeka destekli el falı yorumunuzu alın. Yaşam çizgisi, kalp çizgisi, kader çizgisi analizi.',
    descEn: 'Upload your palm photo, get AI-powered palm reading. Life line, heart line, fate line analysis.',
    keywords: ['el falı', 'el falı baktır', 'avuç içi falı', 'çizgi analizi', 'palm reading', 'palmistry'],
  },
  dream: {
    titleTr: 'Rüya Tabiri - Online Rüya Yorumu',
    titleEn: 'Dream Interpretation - Online Dream Analysis',
    descTr: 'Rüyanızı anlatın, detaylı rüya tabiri ve yorumunu alın. İslami rüya tabiri, psikolojik rüya analizi.',
    descEn: 'Describe your dream, get detailed dream interpretation and analysis.',
    keywords: ['rüya tabiri', 'rüya yorumu', 'online rüya tabiri', 'rüya analizi', 'dream interpretation'],
  },
  love: {
    titleTr: 'Aşk Uyumu - İsim Uyumu Hesapla',
    titleEn: 'Love Compatibility - Name Match Calculator',
    descTr: 'İsim uyumu ve aşk uyumu hesaplama. Sevgilinizle uyumunuzu öğrenin. Burç uyumu, isim analizi.',
    descEn: 'Name and love compatibility calculator. Find out your compatibility with your partner.',
    keywords: ['aşk uyumu', 'isim uyumu', 'burç uyumu', 'sevgili uyumu', 'love compatibility'],
  },
  horoscope: {
    titleTr: 'Günlük Burç Yorumları - Bugünün Burç Falı',
    titleEn: 'Daily Horoscope - Today\'s Zodiac Readings',
    descTr: 'Günlük, haftalık ve aylık burç yorumları. Tüm burçların detaylı astroloji yorumları. Koç, boğa, ikizler ve diğer burçlar.',
    descEn: 'Daily, weekly and monthly horoscope readings. Detailed astrology interpretations for all zodiac signs.',
    keywords: ['günlük burç', 'burç yorumu', 'astroloji', 'koç burcu', 'boğa burcu', 'horoscope', 'zodiac'],
  },
  numerology: {
    titleTr: 'Numeroloji - Sayıların Gizemi',
    titleEn: 'Numerology - Mystery of Numbers',
    descTr: 'Doğum tarihinize göre numeroloji analizi. Yaşam yolu sayınız, kader sayınız ve kişilik analizinizi keşfedin.',
    descEn: 'Numerology analysis based on your birth date. Discover your life path number and personality analysis.',
    keywords: ['numeroloji', 'sayılar', 'yaşam yolu sayısı', 'doğum tarihi analizi', 'numerology'],
  },
  angel: {
    titleTr: 'Melek Kartları - Melek Mesajları',
    titleEn: 'Angel Cards - Angel Messages',
    descTr: 'Melek kartlarından mesajınızı alın. Koruyucu meleklerinizden rehberlik ve ilham dolu mesajlar.',
    descEn: 'Receive messages from angel cards. Guidance and inspirational messages from your guardian angels.',
    keywords: ['melek kartları', 'melek mesajları', 'koruyucu melek', 'angel cards', 'angel messages'],
  },
  aura: {
    titleTr: 'Aura Okuma - Enerji Analizi',
    titleEn: 'Aura Reading - Energy Analysis',
    descTr: 'Auranızın rengini ve enerjinizi keşfedin. Çakra analizi ve enerji dengesi hakkında bilgi alın.',
    descEn: 'Discover your aura color and energy. Get information about chakra analysis and energy balance.',
    keywords: ['aura okuma', 'enerji analizi', 'çakra', 'aura rengi', 'aura reading'],
  },
  birthchart: {
    titleTr: 'Doğum Haritası - Natal Harita Analizi',
    titleEn: 'Birth Chart - Natal Chart Analysis',
    descTr: 'Doğum haritanızı çıkarın ve gezegen konumlarınızı analiz edin. Yükselen burç, ay burcu ve detaylı natal harita yorumu.',
    descEn: 'Generate your birth chart and analyze your planetary positions.',
    keywords: ['doğum haritası', 'natal harita', 'yükselen burç', 'ay burcu', 'birth chart'],
  },
  katina: {
    titleTr: 'Katina Falı - Online Katina Aç',
    titleEn: 'Katina Reading - Online Katina Cards',
    descTr: 'Katina falı ile geleceğinizi öğrenin. 13 kart ile detaylı katina falı yorumu.',
    descEn: 'Learn your future with Katina reading. Detailed Katina card interpretation.',
    keywords: ['katina falı', 'katina açma', 'katina kartları', 'katina reading'],
  },
  yesno: {
    titleTr: 'Evet Hayır Falı - Online Fal Bak',
    titleEn: 'Yes No Oracle - Online Fortune',
    descTr: 'Sorununuza evet veya hayır cevabı alın. Hızlı ve eğlenceli online fal deneyimi.',
    descEn: 'Get a yes or no answer to your question. Quick and fun online fortune experience.',
    keywords: ['evet hayır falı', 'online fal', 'soru cevap falı', 'yes no oracle'],
  },
  kursundokme: {
    titleTr: 'Kurşun Dökme - Online Kurşun Falı',
    titleEn: 'Lead Pouring Fortune',
    descTr: 'Geleneksel kurşun dökme falı. Nazar ve kötü enerjiden arınma, kurşun yorumu.',
    descEn: 'Traditional lead pouring fortune telling. Cleansing from evil eye and negative energy.',
    keywords: ['kurşun dökme', 'kurşun falı', 'nazar', 'kötü enerji', 'lead pouring'],
  },
  istikhara: {
    titleTr: 'İstihare - Online İstihare Duası',
    titleEn: 'Istikhara Prayer - Online Guidance',
    descTr: 'İstihare duası ile karar vermekte zorlandığınız konularda ilahi rehberlik alın.',
    descEn: 'Get divine guidance through Istikhara prayer for decisions you struggle with.',
    keywords: ['istikhare', 'istikhare duası', 'istikhare namazı', 'ilahi rehberlik'],
  },
}

// Blog post data for SEO content
export const BLOG_POSTS = [
  {
    slug: 'kahve-falinda-kalp-ne-demek',
    titleTr: 'Kahve Falında Kalp Ne Demek? Aşk ve İlişki Yorumları',
    titleEn: 'What Does Heart Mean in Coffee Reading? Love Interpretations',
    descTr: 'Kahve falında kalp sembolü ne anlama gelir? Fincanınızda çıkan kalp şekillerinin detaylı yorumları ve aşk hayatınız hakkında ipuçları.',
    descEn: 'What does the heart symbol mean in coffee reading? Detailed interpretations of heart shapes in your cup.',
    category: 'kahve-fali',
    contentTr: `<h2>Kahve Falında Kalp Sembolü</h2>
<p>Kahve falında kalp sembolü, genellikle aşk, romantizm ve duygusal bağlantılarla ilişkilendirilir. Fincanınızda bir kalp şekli gördüğünüzde, bu hayatınızdaki sevgi dolu enerjilere işaret edebilir.</p>
<h3>Kalbin Konumuna Göre Yorumlar</h3>
<p><strong>Fincanın üst kısmında kalp:</strong> Yakın zamanda güzel bir aşk sürprizi sizi bekliyor olabilir. Yeni bir ilişki veya mevcut ilişkinizde güzel gelişmeler yaşanabilir.</p>
<p><strong>Fincanın ortasında kalp:</strong> Duygusal hayatınızda dengeli bir dönem geçiriyorsunuz. İlişkiniz sağlam temeller üzerine kurulu.</p>
<p><strong>Fincanın alt kısmında kalp:</strong> Geçmişten gelen duygusal bağlar hâlâ etkisini sürdürüyor. Eski bir aşk yeniden gündeme gelebilir.</p>
<h3>Kalp Şeklinin Büyüklüğü</h3>
<p>Büyük kalp: Güçlü ve tutkulu bir aşk</p>
<p>Küçük kalp: Sakin ve huzurlu bir sevgi</p>
<p>Kırık kalp: Duygusal zorluklar ve iyileşme süreci</p>`,
    contentEn: `<h2>Heart Symbol in Coffee Reading</h2><p>The heart symbol in coffee reading is generally associated with love, romance, and emotional connections.</p>`,
    keywords: ['kahve falında kalp', 'fincan falı kalp', 'aşk falı', 'kahve falı yorumu'],
  },
  {
    slug: 'tarot-fali-nasil-bakilir',
    titleTr: 'Tarot Falı Nasıl Bakılır? Başlangıç Rehberi',
    titleEn: 'How to Read Tarot Cards? Beginner\'s Guide',
    descTr: 'Tarot falı nasıl bakılır, kartların anlamları nedir? Yeni başlayanlar için kapsamlı tarot rehberi. Major ve Minor Arcana kartları.',
    descEn: 'How to read tarot cards, what do they mean? Comprehensive tarot guide for beginners.',
    category: 'tarot',
    contentTr: `<h2>Tarot Falına Giriş</h2>
<p>Tarot, yüzyıllardır insanların geleceğe dair içgörü edinmek için kullandığı kadim bir kehanet sanatıdır. 78 karttan oluşan bir tarot destesi, hayatın farklı yönlerini temsil eden sembolik görsellerle doludur.</p>
<h3>Major Arcana Kartları</h3>
<p>22 Major Arcana kartı, hayattaki büyük temalar ve dönüm noktalarını temsil eder: Aptal (0), Büyücü (I), Yüksek Rahibe (II), İmparatoriçe (III), İmparator (IV)...</p>
<h3>Tarot Falı Nasıl Bakılır?</h3>
<p>1. Sakin bir ortam hazırlayın</p>
<p>2. Kartları karıştırırken sorunuzu düşünün</p>
<p>3. İçgüdülerinize güvenerek kartları seçin</p>
<p>4. Kartların konumlarına ve birbirleriyle ilişkilerine bakın</p>`,
    contentEn: `<h2>Introduction to Tarot Reading</h2><p>Tarot is an ancient divination art that people have used for centuries to gain insight into the future.</p>`,
    keywords: ['tarot falı', 'tarot nasıl bakılır', 'tarot kartları', 'tarot rehberi'],
  },
  {
    slug: 'gunluk-burc-yorumlari-rehberi',
    titleTr: 'Günlük Burç Yorumları - Tüm Burçlar İçin Detaylı Rehber',
    titleEn: 'Daily Horoscope Guide - Detailed Guide for All Signs',
    descTr: 'Günlük burç yorumlarınızı okuyun. 12 burç için aşk, kariyer, sağlık ve para yorumları. Astroloji uzmanlarından günlük tahminler.',
    descEn: 'Read your daily horoscope. Love, career, health and money readings for all 12 zodiac signs.',
    category: 'burc',
    contentTr: `<h2>Günlük Burç Yorumları</h2>
<p>Astroloji, gökyüzündeki gezegen hareketlerinin insan hayatına etkilerini inceleyen kadim bir bilimdir. Günlük burç yorumları, o güne özel gezegen konumlarına göre hazırlanır.</p>
<h3>12 Burç ve Özellikleri</h3>
<p><strong>Koç (21 Mart - 19 Nisan):</strong> Ateş grubu, cesur ve enerjik</p>
<p><strong>Boğa (20 Nisan - 20 Mayıs):</strong> Toprak grubu, kararlı ve güvenilir</p>
<p><strong>İkizler (21 Mayıs - 20 Haziran):</strong> Hava grubu, meraklı ve iletişimci</p>
<p><strong>Yengeç (21 Haziran - 22 Temmuz):</strong> Su grubu, duygusal ve koruyucu</p>`,
    contentEn: `<h2>Daily Horoscope Guide</h2><p>Astrology is an ancient science that studies the effects of planetary movements on human life.</p>`,
    keywords: ['günlük burç', 'burç yorumu', 'astroloji', 'koç burcu', 'boğa burcu'],
  },
  {
    slug: 'fal-gercek-mi',
    titleTr: 'Fal Gerçek Mi? Bilimsel ve Manevi Perspektif',
    titleEn: 'Is Fortune Telling Real? Scientific and Spiritual Perspective',
    descTr: 'Fal gerçek mi, güvenilir mi? Bilimsel araştırmalar ve manevi perspektiften fal bakma sanatının değerlendirmesi.',
    descEn: 'Is fortune telling real and reliable? Assessment from scientific research and spiritual perspectives.',
    category: 'genel',
    contentTr: `<h2>Fal Gerçek Mi?</h2>
<p>Fal bakma, insanlık tarihi kadar eski bir gelenektir. Antik Mısır'dan Osmanlı'ya, pek çok uygarlıkta fal bakma sanatı önemli bir yer tutmuştur.</p>
<h3>Bilimsel Bakış Açısı</h3>
<p>Modern bilim, fal bakmanın kesin geleceği tahmin edemeyeceğini söylese de, fal seanlarının psikolojik faydaları olabileceğini kabul eder. Fal, kişinin kendi düşüncelerini ve duygularını keşfetmesine yardımcı olabilir.</p>
<h3>Manevi Perspektif</h3>
<p>Pek çok kültürde fal, evrensel enerjilerle bağlantı kurmanın bir yolu olarak görülür. Sezgisel bilgelik ve spiritüel rehberlik araçları olarak tarot, kahve falı gibi yöntemler kullanılmaktadır.</p>`,
    contentEn: `<h2>Is Fortune Telling Real?</h2><p>Fortune telling is a tradition as old as human history. From ancient Egypt to the Ottoman Empire, it has held an important place in many civilizations.</p>`,
    keywords: ['fal gerçek mi', 'fal güvenilir mi', 'fal bakma', 'fal hakkında'],
  },
  {
    slug: 'en-iyi-fal-bakma-yontemleri',
    titleTr: 'En İyi Fal Bakma Yöntemleri - Kapsamlı Rehber',
    titleEn: 'Best Fortune Telling Methods - Comprehensive Guide',
    descTr: 'En popüler ve etkili fal bakma yöntemleri. Kahve falı, tarot, el falı, rüya tabiri, numeroloji ve daha fazlası.',
    descEn: 'Most popular and effective fortune telling methods. Coffee reading, tarot, palmistry and more.',
    category: 'genel',
    contentTr: `<h2>En İyi Fal Bakma Yöntemleri</h2>
<p>Fal bakma, farklı kültürlerde farklı yöntemlerle uygulanmaktadır. İşte en popüler ve etkili fal bakma yöntemleri:</p>
<h3>1. Kahve Falı</h3>
<p>Türk kahvesi falı, Türk kültürünün ayrılmaz bir parçasıdır. Fincanın dibindeki telve kalıntıları okunarak yorum yapılır.</p>
<h3>2. Tarot Falı</h3>
<p>78 kartlık bir deste ile yapılan tarot, dünyanın en yaygın fal yöntemlerinden biridir.</p>
<h3>3. El Falı (Palmistri)</h3>
<p>Avuç içindeki çizgilerin yorumlanması ile kişinin karakteri ve geleceği hakkında bilgi edinilir.</p>
<h3>4. Rüya Tabiri</h3>
<p>Rüyalardaki semboller ve olaylar analiz edilerek kişinin bilinçaltı ve gelecek hakkında yorumlar yapılır.</p>
<h3>5. Numeroloji</h3>
<p>Sayıların gizemli gücünden faydalanarak kişinin yaşam yolu ve kader sayısı hesaplanır.</p>`,
    contentEn: `<h2>Best Fortune Telling Methods</h2><p>Fortune telling is practiced with different methods in different cultures.</p>`,
    keywords: ['fal bakma yöntemleri', 'en iyi fal', 'fal çeşitleri', 'fortune telling methods'],
  },
]

// SEO pages for fortune telling
export const SEO_PAGES = [
  { slug: 'canli-falcilar', titleTr: 'Canlı Falcılar - Online Fal Baktır', titleEn: 'Live Fortune Tellers', descTr: 'En iyi canlı falcılarla birebir görüşme. Online fal baktırın, geleceğinizi keşfedin.', descEn: 'One-on-one sessions with the best live fortune tellers.' },
  { slug: 'en-iyi-falcilar', titleTr: 'En İyi Falcılar - Güvenilir Falcı Önerileri', titleEn: 'Best Fortune Tellers', descTr: 'En iyi ve güvenilir falcı önerileri. Kullanıcı yorumları ile en çok tercih edilen falcılar.', descEn: 'Best and most reliable fortune teller recommendations.' },
  { slug: 'canli-tarot', titleTr: 'Canlı Tarot - Online Tarot Falı Baktır', titleEn: 'Live Tarot Reading', descTr: 'Canlı tarot falcıları ile online tarot seansı. Gerçek tarot uzmanlarından canlı yorum alın.', descEn: 'Online tarot session with live tarot readers.' },
  { slug: 'canli-kahve-fali', titleTr: 'Canlı Kahve Falı - Online Kahve Falı Baktır', titleEn: 'Live Coffee Reading', descTr: 'Canlı kahve falcıları ile online kahve falı. Fincanınızı gerçek uzmanlara gösterin.', descEn: 'Online coffee reading with live coffee fortune tellers.' },
  { slug: 'online-fal', titleTr: 'Online Fal - İnternetten Fal Baktır', titleEn: 'Online Fortune Telling', descTr: 'Online fal baktırmanın en kolay yolu. Yapay zeka ve gerçek falcılarla online fal deneyimi.', descEn: 'The easiest way to get online fortune reading.' },
]
