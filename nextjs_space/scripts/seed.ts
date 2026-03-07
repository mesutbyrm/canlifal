import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123.', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'mesutbyrm1@gmail.com' },
    update: {
      password: adminPassword,
      role: 'admin',
      credits: 9999,
    },
    create: {
      email: 'mesutbyrm1@gmail.com',
      password: adminPassword,
      name: 'Admin',
      preferredLanguage: 'tr',
      credits: 9999,
      role: 'admin',
    },
  })
  console.log('Admin user created:', admin.email)

  // Create test user for testing (john@doe.com / johndoe123)
  const testPassword = await bcrypt.hash('johndoe123', 10)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: testPassword,
      name: 'John Doe',
      preferredLanguage: 'en',
      credits: 50,
      role: 'user',
    },
  })
  console.log('Test user created:', testUser.email)

  // Create additional test user for the auth system
  const testPassword2 = await bcrypt.hash('password123', 10)
  
  const testUser2 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: testPassword2,
      name: 'Test User',
      preferredLanguage: 'en',
      credits: 30,
      role: 'user',
    },
  })
  console.log('Additional test user created:', testUser2.email)

  // Translation data
  const translations = [
    // Navigation - English
    { languageCode: 'en', translationKey: 'nav.home', translationValue: 'Home' },
    { languageCode: 'en', translationKey: 'nav.fortunes', translationValue: 'Fortunes' },
    { languageCode: 'en', translationKey: 'nav.login', translationValue: 'Login' },
    { languageCode: 'en', translationKey: 'nav.register', translationValue: 'Register' },
    { languageCode: 'en', translationKey: 'nav.dashboard', translationValue: 'Dashboard' },
    { languageCode: 'en', translationKey: 'nav.profile', translationValue: 'Profile' },
    { languageCode: 'en', translationKey: 'nav.admin', translationValue: 'Admin Panel' },
    { languageCode: 'en', translationKey: 'nav.logout', translationValue: 'Logout' },
    { languageCode: 'en', translationKey: 'nav.credits', translationValue: 'Credits' },

    // Navigation - Turkish
    { languageCode: 'tr', translationKey: 'nav.home', translationValue: 'Ana Sayfa' },
    { languageCode: 'tr', translationKey: 'nav.fortunes', translationValue: 'Fallar' },
    { languageCode: 'tr', translationKey: 'nav.login', translationValue: 'Giriş Yap' },
    { languageCode: 'tr', translationKey: 'nav.register', translationValue: 'Kayıt Ol' },
    { languageCode: 'tr', translationKey: 'nav.dashboard', translationValue: 'Gösterge Paneli' },
    { languageCode: 'tr', translationKey: 'nav.profile', translationValue: 'Profil' },
    { languageCode: 'tr', translationKey: 'nav.admin', translationValue: 'Admin Paneli' },
    { languageCode: 'tr', translationKey: 'nav.logout', translationValue: 'Çıkış Yap' },
    { languageCode: 'tr', translationKey: 'nav.credits', translationValue: 'Kredi' },

    // Fortune Types - English
    { languageCode: 'en', translationKey: 'fortune.coffee.name', translationValue: 'Coffee Fortune' },
    { languageCode: 'en', translationKey: 'fortune.coffee.description', translationValue: 'Discover the mystical messages hidden in your coffee cup' },
    { languageCode: 'en', translationKey: 'fortune.coffee.cost', translationValue: '5 Credits' },
    { languageCode: 'en', translationKey: 'fortune.tarot.name', translationValue: 'Tarot Reading' },
    { languageCode: 'en', translationKey: 'fortune.tarot.description', translationValue: 'Unveil your future with ancient tarot wisdom' },
    { languageCode: 'en', translationKey: 'fortune.tarot.cost', translationValue: '7 Credits' },
    { languageCode: 'en', translationKey: 'fortune.dream.name', translationValue: 'Dream Interpretation' },
    { languageCode: 'en', translationKey: 'fortune.dream.description', translationValue: 'Decode the hidden meanings in your dreams' },
    { languageCode: 'en', translationKey: 'fortune.dream.cost', translationValue: '5 Credits' },

    // Fortune Types - Turkish
    { languageCode: 'tr', translationKey: 'fortune.coffee.name', translationValue: 'Kahve Falı' },
    { languageCode: 'tr', translationKey: 'fortune.coffee.description', translationValue: 'Kahve fincanınızda gizli mistik mesajları keşfedin' },
    { languageCode: 'tr', translationKey: 'fortune.coffee.cost', translationValue: '5 Kredi' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.name', translationValue: 'Tarot Falı' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.description', translationValue: 'Antik tarot bilgeliği ile geleceğinizi keşfedin' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.cost', translationValue: '7 Kredi' },
    { languageCode: 'tr', translationKey: 'fortune.dream.name', translationValue: 'Rüya Tabiri' },
    { languageCode: 'tr', translationKey: 'fortune.dream.description', translationValue: 'Rüyalarınızdaki gizli anlamları çözün' },
    { languageCode: 'tr', translationKey: 'fortune.dream.cost', translationValue: '5 Kredi' },

    // Additional Fortune Types - English
    { languageCode: 'en', translationKey: 'fortune.katina.name', translationValue: 'Katina Fortune' },
    { languageCode: 'en', translationKey: 'fortune.kursundokme.name', translationValue: 'Lead Pouring' },
    { languageCode: 'en', translationKey: 'fortune.horoscope.name', translationValue: 'Horoscope' },
    { languageCode: 'en', translationKey: 'fortune.palm.name', translationValue: 'Palm Reading' },
    { languageCode: 'en', translationKey: 'fortune.numerology.name', translationValue: 'Numerology' },
    { languageCode: 'en', translationKey: 'fortune.angel.name', translationValue: 'Angel Cards' },
    { languageCode: 'en', translationKey: 'fortune.aura.name', translationValue: 'Aura Reading' },
    { languageCode: 'en', translationKey: 'fortune.birthchart.name', translationValue: 'Birth Chart' },
    { languageCode: 'en', translationKey: 'fortune.istikhara.name', translationValue: 'Istikhara' },
    { languageCode: 'en', translationKey: 'fortune.love.name', translationValue: 'Love Fortune' },
    { languageCode: 'en', translationKey: 'fortune.yesno.name', translationValue: 'Yes/No Fortune' },

    // Additional Fortune Types - Turkish
    { languageCode: 'tr', translationKey: 'fortune.katina.name', translationValue: 'Katina Falı' },
    { languageCode: 'tr', translationKey: 'fortune.kursundokme.name', translationValue: 'Kurşun Dökme' },
    { languageCode: 'tr', translationKey: 'fortune.horoscope.name', translationValue: 'Burç Yorumu' },
    { languageCode: 'tr', translationKey: 'fortune.palm.name', translationValue: 'El Falı' },
    { languageCode: 'tr', translationKey: 'fortune.numerology.name', translationValue: 'Numeroloji' },
    { languageCode: 'tr', translationKey: 'fortune.angel.name', translationValue: 'Melek Kartları' },
    { languageCode: 'tr', translationKey: 'fortune.aura.name', translationValue: 'Aura Analizi' },
    { languageCode: 'tr', translationKey: 'fortune.birthchart.name', translationValue: 'Doğum Haritası' },
    { languageCode: 'tr', translationKey: 'fortune.istikhara.name', translationValue: 'İstihare' },
    { languageCode: 'tr', translationKey: 'fortune.love.name', translationValue: 'Aşk Falı' },
    { languageCode: 'tr', translationKey: 'fortune.yesno.name', translationValue: 'Evet/Hayır Falı' },

    // Share translations
    { languageCode: 'en', translationKey: 'share.title', translationValue: 'Share your reading' },
    { languageCode: 'tr', translationKey: 'share.title', translationValue: 'Falını paylaş' },

    // Landing Page - English
    { languageCode: 'en', translationKey: 'landing.hero.title', translationValue: 'Unlock the Mysteries of Your Future' },
    { languageCode: 'en', translationKey: 'landing.hero.subtitle', translationValue: 'AI-powered fortune telling with ancient wisdom' },
    { languageCode: 'en', translationKey: 'landing.hero.cta', translationValue: 'Start Your Journey' },
    { languageCode: 'en', translationKey: 'landing.features.title', translationValue: 'How It Works' },
    { languageCode: 'en', translationKey: 'landing.features.step1', translationValue: 'Choose Your Fortune Type' },
    { languageCode: 'en', translationKey: 'landing.features.step2', translationValue: 'Share Your Story' },
    { languageCode: 'en', translationKey: 'landing.features.step3', translationValue: 'Receive Your Reading' },

    // Landing Page - Turkish
    { languageCode: 'tr', translationKey: 'landing.hero.title', translationValue: 'Geleceğinizin Gizemlerini Açın' },
    { languageCode: 'tr', translationKey: 'landing.hero.subtitle', translationValue: 'Antik bilgelik ile yapay zeka destekli fal' },
    { languageCode: 'tr', translationKey: 'landing.hero.cta', translationValue: 'Yolculuğunuza Başlayın' },
    { languageCode: 'tr', translationKey: 'landing.features.title', translationValue: 'Nasıl Çalışır' },
    { languageCode: 'tr', translationKey: 'landing.features.step1', translationValue: 'Fal Türünüzü Seçin' },
    { languageCode: 'tr', translationKey: 'landing.features.step2', translationValue: 'Hikayenizi Paylaşın' },
    { languageCode: 'tr', translationKey: 'landing.features.step3', translationValue: 'Falınızı Alın' },

    // Forms - English
    { languageCode: 'en', translationKey: 'form.email', translationValue: 'Email' },
    { languageCode: 'en', translationKey: 'form.password', translationValue: 'Password' },
    { languageCode: 'en', translationKey: 'form.name', translationValue: 'Name' },
    { languageCode: 'en', translationKey: 'form.language', translationValue: 'Preferred Language' },
    { languageCode: 'en', translationKey: 'form.submit', translationValue: 'Submit' },
    { languageCode: 'en', translationKey: 'form.cancel', translationValue: 'Cancel' },
    { languageCode: 'en', translationKey: 'form.required', translationValue: 'This field is required' },

    // Forms - Turkish
    { languageCode: 'tr', translationKey: 'form.email', translationValue: 'E-posta' },
    { languageCode: 'tr', translationKey: 'form.password', translationValue: 'Şifre' },
    { languageCode: 'tr', translationKey: 'form.name', translationValue: 'İsim' },
    { languageCode: 'tr', translationKey: 'form.language', translationValue: 'Tercih Edilen Dil' },
    { languageCode: 'tr', translationKey: 'form.submit', translationValue: 'Gönder' },
    { languageCode: 'tr', translationKey: 'form.cancel', translationValue: 'İptal' },
    { languageCode: 'tr', translationKey: 'form.required', translationValue: 'Bu alan gereklidir' },

    // Messages - English
    { languageCode: 'en', translationKey: 'message.insufficient_credits', translationValue: 'Insufficient credits. Please contact admin.' },
    { languageCode: 'en', translationKey: 'message.fortune_generated', translationValue: 'Your fortune has been revealed!' },
    { languageCode: 'en', translationKey: 'message.welcome', translationValue: 'Welcome! You received 10 free credits.' },
    { languageCode: 'en', translationKey: 'message.error', translationValue: 'An error occurred. Please try again.' },

    // Messages - Turkish
    { languageCode: 'tr', translationKey: 'message.insufficient_credits', translationValue: 'Yetersiz kredi. Lütfen yönetici ile iletişime geçin.' },
    { languageCode: 'tr', translationKey: 'message.fortune_generated', translationValue: 'Falınız açığa çıktı!' },
    { languageCode: 'tr', translationKey: 'message.welcome', translationValue: 'Hoş geldiniz! 10 ücretsiz kredi kazandınız.' },
    { languageCode: 'tr', translationKey: 'message.error', translationValue: 'Bir hata oluştu. Lütfen tekrar deneyin.' },

    // Dashboard - English
    { languageCode: 'en', translationKey: 'dashboard.title', translationValue: 'My Fortune Readings' },
    { languageCode: 'en', translationKey: 'dashboard.no_fortunes', translationValue: 'No fortunes yet. Start your mystical journey!' },
    { languageCode: 'en', translationKey: 'dashboard.view_fortune', translationValue: 'View Reading' },

    // Dashboard - Turkish
    { languageCode: 'tr', translationKey: 'dashboard.title', translationValue: 'Fal Geçmişim' },
    { languageCode: 'tr', translationKey: 'dashboard.no_fortunes', translationValue: 'Henüz fal yok. Mistik yolculuğunuza başlayın!' },
    { languageCode: 'tr', translationKey: 'dashboard.view_fortune', translationValue: 'Falı Görüntüle' },

    // Profile - English
    { languageCode: 'en', translationKey: 'profile.title', translationValue: 'My Profile' },
    { languageCode: 'en', translationKey: 'profile.balance', translationValue: 'Credit Balance' },
    { languageCode: 'en', translationKey: 'profile.member_since', translationValue: 'Member Since' },

    // Profile - Turkish
    { languageCode: 'tr', translationKey: 'profile.title', translationValue: 'Profilim' },
    { languageCode: 'tr', translationKey: 'profile.balance', translationValue: 'Kredi Bakiyesi' },
    { languageCode: 'tr', translationKey: 'profile.member_since', translationValue: 'Üyelik Tarihi' },

    // Admin - English
    { languageCode: 'en', translationKey: 'admin.users', translationValue: 'Users' },
    { languageCode: 'en', translationKey: 'admin.fortunes', translationValue: 'Fortunes' },
    { languageCode: 'en', translationKey: 'admin.statistics', translationValue: 'Statistics' },
    { languageCode: 'en', translationKey: 'admin.add_credits', translationValue: 'Add Credits' },
    { languageCode: 'en', translationKey: 'admin.total_users', translationValue: 'Total Users' },
    { languageCode: 'en', translationKey: 'admin.total_fortunes', translationValue: 'Total Fortunes' },

    // Admin - Turkish
    { languageCode: 'tr', translationKey: 'admin.users', translationValue: 'Kullanıcılar' },
    { languageCode: 'tr', translationKey: 'admin.fortunes', translationValue: 'Fallar' },
    { languageCode: 'tr', translationKey: 'admin.statistics', translationValue: 'İstatistikler' },
    { languageCode: 'tr', translationKey: 'admin.add_credits', translationValue: 'Kredi Ekle' },
    { languageCode: 'tr', translationKey: 'admin.total_users', translationValue: 'Toplam Kullanıcı' },
    { languageCode: 'tr', translationKey: 'admin.total_fortunes', translationValue: 'Toplam Fal' },

    // Coffee Fortune - English
    { languageCode: 'en', translationKey: 'coffee.title', translationValue: 'Coffee Fortune Reading' },
    { languageCode: 'en', translationKey: 'coffee.prompt', translationValue: 'Describe what you see in your coffee cup' },
    { languageCode: 'en', translationKey: 'coffee.placeholder', translationValue: 'I see a bird, a tree, and some circles...' },

    // Coffee Fortune - Turkish
    { languageCode: 'tr', translationKey: 'coffee.title', translationValue: 'Kahve Falı' },
    { languageCode: 'tr', translationKey: 'coffee.prompt', translationValue: 'Kahve fincanınızda ne gördüğünüzü anlatın' },
    { languageCode: 'tr', translationKey: 'coffee.placeholder', translationValue: 'Bir kuş, bir ağaç ve bazı daireler görüyorum...' },

    // Tarot - English
    { languageCode: 'en', translationKey: 'tarot.title', translationValue: 'Tarot Reading' },
    { languageCode: 'en', translationKey: 'tarot.prompt', translationValue: 'What question weighs on your heart?' },
    { languageCode: 'en', translationKey: 'tarot.placeholder', translationValue: 'Share your question or concern...' },
    { languageCode: 'en', translationKey: 'tarot.cards', translationValue: 'Number of Cards' },

    // Tarot - Turkish
    { languageCode: 'tr', translationKey: 'tarot.title', translationValue: 'Tarot Falı' },
    { languageCode: 'tr', translationKey: 'tarot.prompt', translationValue: 'Kalbinizi hangi soru ağırlaştırıyor?' },
    { languageCode: 'tr', translationKey: 'tarot.placeholder', translationValue: 'Sorunuzu veya endişenizi paylaşın...' },
    { languageCode: 'tr', translationKey: 'tarot.cards', translationValue: 'Kart Sayısı' },

    // Dream - English
    { languageCode: 'en', translationKey: 'dream.title', translationValue: 'Dream Interpretation' },
    { languageCode: 'en', translationKey: 'dream.prompt', translationValue: 'Describe your dream in detail' },
    { languageCode: 'en', translationKey: 'dream.placeholder', translationValue: 'I was flying over mountains, then I saw...' },

    // Dream - Turkish
    { languageCode: 'tr', translationKey: 'dream.title', translationValue: 'Rüya Tabiri' },
    { languageCode: 'tr', translationKey: 'dream.prompt', translationValue: 'Rüyanızı detaylı olarak anlatın' },
    { languageCode: 'tr', translationKey: 'dream.placeholder', translationValue: 'Dağların üzerinde uçuyordum, sonra gördüm ki...' },

    // Auth - English
    { languageCode: 'en', translationKey: 'auth.login.title', translationValue: 'Welcome Back' },
    { languageCode: 'en', translationKey: 'auth.login.subtitle', translationValue: 'Sign in to continue your mystical journey' },
    { languageCode: 'en', translationKey: 'auth.register.title', translationValue: 'Begin Your Journey' },
    { languageCode: 'en', translationKey: 'auth.register.subtitle', translationValue: 'Create an account and receive 10 free credits' },
    { languageCode: 'en', translationKey: 'auth.no_account', translationValue: "Don't have an account?" },
    { languageCode: 'en', translationKey: 'auth.have_account', translationValue: 'Already have an account?' },

    // Auth - Turkish
    { languageCode: 'tr', translationKey: 'auth.login.title', translationValue: 'Tekrar Hoş Geldiniz' },
    { languageCode: 'tr', translationKey: 'auth.login.subtitle', translationValue: 'Mistik yolculuğunuza devam etmek için giriş yapın' },
    { languageCode: 'tr', translationKey: 'auth.register.title', translationValue: 'Yolculuğunuza Başlayın' },
    { languageCode: 'tr', translationKey: 'auth.register.subtitle', translationValue: 'Hesap oluşturun ve 10 ücretsiz kredi kazanın' },
    { languageCode: 'tr', translationKey: 'auth.no_account', translationValue: 'Hesabınız yok mu?' },
    { languageCode: 'tr', translationKey: 'auth.have_account', translationValue: 'Zaten hesabınız var mı?' },

    // Chat - English
    { languageCode: 'en', translationKey: 'chat.title', translationValue: 'Social Chat Rooms' },
    { languageCode: 'en', translationKey: 'chat.subtitle', translationValue: 'Connect with fellow seekers of mystical wisdom' },
    { languageCode: 'en', translationKey: 'chat.online', translationValue: 'online' },
    { languageCode: 'en', translationKey: 'chat.send', translationValue: 'Send' },
    { languageCode: 'en', translationKey: 'chat.placeholder', translationValue: 'Type your message...' },
    { languageCode: 'en', translationKey: 'chat.join', translationValue: 'Join Room' },
    { languageCode: 'en', translationKey: 'chat.active_users', translationValue: 'Active Users' },
    { languageCode: 'en', translationKey: 'chat.no_messages', translationValue: 'No messages yet. Be the first to say hello!' },
    { languageCode: 'en', translationKey: 'chat.login_required', translationValue: 'Please login to join the chat' },

    // Chat - Turkish
    { languageCode: 'tr', translationKey: 'chat.title', translationValue: 'Sosyal Sohbet Odaları' },
    { languageCode: 'tr', translationKey: 'chat.subtitle', translationValue: 'Mistik bilgelik arayanlarla bağlantı kurun' },
    { languageCode: 'tr', translationKey: 'chat.online', translationValue: 'çevrimiçi' },
    { languageCode: 'tr', translationKey: 'chat.send', translationValue: 'Gönder' },
    { languageCode: 'tr', translationKey: 'chat.placeholder', translationValue: 'Mesajınızı yazın...' },
    { languageCode: 'tr', translationKey: 'chat.join', translationValue: 'Odaya Katıl' },
    { languageCode: 'tr', translationKey: 'chat.active_users', translationValue: 'Aktif Kullanıcılar' },
    { languageCode: 'tr', translationKey: 'chat.no_messages', translationValue: 'Henüz mesaj yok. İlk merhaba diyen siz olun!' },
    { languageCode: 'tr', translationKey: 'chat.login_required', translationValue: 'Sohbete katılmak için lütfen giriş yapın' },
  ]

  // Seed Chat Rooms
  const chatRooms = [
    {
      slug: 'coffee',
      nameEn: 'Coffee Fortune Room',
      nameTr: 'Kahve Falı Odası',
      descEn: 'Discuss coffee readings and share experiences',
      descTr: 'Kahve falı yorumlarını tartışın ve deneyimlerinizi paylaşın',
      icon: '☕',
    },
    {
      slug: 'tarot',
      nameEn: 'Tarot Room',
      nameTr: 'Tarot Odası',
      descEn: 'Talk about tarot cards and their meanings',
      descTr: 'Tarot kartları ve anlamları hakkında konuşun',
      icon: '🎴',
    },
    {
      slug: 'astrology',
      nameEn: 'Astrology Room',
      nameTr: 'Astroloji Odası',
      descEn: 'Discuss zodiac signs, horoscopes and birth charts',
      descTr: 'Burçlar, günlük fallar ve doğum haritaları hakkında konuşun',
      icon: '⭐',
    },
    {
      slug: 'dreams',
      nameEn: 'Dream Interpretation Room',
      nameTr: 'Rüya Tabiri Odası',
      descEn: 'Share your dreams and their interpretations',
      descTr: 'Rüyalarınızı ve yorumlarınızı paylaşın',
      icon: '🌙',
    },
    {
      slug: 'general',
      nameEn: 'General Chat',
      nameTr: 'Genel Sohbet',
      descEn: 'Chat about anything mystical and spiritual',
      descTr: 'Mistik ve ruhani her konuda sohbet edin',
      icon: '💬',
    },
  ]

  for (const room of chatRooms) {
    await prisma.chatRoom.upsert({
      where: { slug: room.slug },
      update: {},
      create: room,
    })
  }
  console.log(`Seeded ${chatRooms.length} chat rooms`)

  // Insert translations
  for (const translation of translations) {
    await prisma.translation.upsert({
      where: {
        languageCode_translationKey: {
          languageCode: translation.languageCode,
          translationKey: translation.translationKey,
        },
      },
      update: {},
      create: translation,
    })
  }

  console.log(`Seeded ${translations.length} translations`)

  // Seed credit packages
  const creditPackages = [
    { name: 'Başlangıç', nameEn: 'Starter', credits: 50, price: 49, currency: 'TRY', bonusCredits: 0, sortOrder: 0 },
    { name: 'Popüler', nameEn: 'Popular', credits: 100, price: 89, currency: 'TRY', bonusCredits: 10, isFeatured: true, sortOrder: 1 },
    { name: 'Premium', nameEn: 'Premium', credits: 250, price: 199, currency: 'TRY', bonusCredits: 50, sortOrder: 2 },
    { name: 'Mega', nameEn: 'Mega', credits: 500, price: 349, currency: 'TRY', bonusCredits: 150, sortOrder: 3 },
  ]

  for (const pkg of creditPackages) {
    const existing = await prisma.creditPackage.findFirst({ where: { name: pkg.name } })
    if (!existing) {
      await prisma.creditPackage.create({ data: pkg })
    }
  }
  console.log('Credit packages seeded')

  // Seed platform settings
  const settings = [
    { key: 'commission_rate', value: '20', description: 'Commission rate for teller earnings (%)' },
    { key: 'min_withdrawal', value: '100', description: 'Minimum credits for withdrawal' },
    { key: 'referral_bonus', value: '50', description: 'Bonus credits for referrals' },
    { key: 'welcome_credits', value: '10', description: 'Starting credits for new users' },
    { key: 'session_duration_minutes', value: '5', description: 'Default duration for live sessions (minutes)' },
    { key: 'credits_per_minute', value: '10', description: 'Credits charged per minute for session extension' },
  ]

  for (const setting of settings) {
    await prisma.platformSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Platform settings seeded')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
