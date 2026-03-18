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
    { languageCode: 'tr', translationKey: 'nav.credits', translationValue: 'CFC' },

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
    { languageCode: 'tr', translationKey: 'fortune.coffee.cost', translationValue: '5 CFC' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.name', translationValue: 'Tarot Falı' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.description', translationValue: 'Antik tarot bilgeliği ile geleceğinizi keşfedin' },
    { languageCode: 'tr', translationKey: 'fortune.tarot.cost', translationValue: '7 CFC' },
    { languageCode: 'tr', translationKey: 'fortune.dream.name', translationValue: 'Rüya Tabiri' },
    { languageCode: 'tr', translationKey: 'fortune.dream.description', translationValue: 'Rüyalarınızdaki gizli anlamları çözün' },
    { languageCode: 'tr', translationKey: 'fortune.dream.cost', translationValue: '5 CFC' },

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

    // Daily Horoscope
    { languageCode: 'en', translationKey: 'fortune.daily_horoscope.name', translationValue: 'Daily Horoscope' },
    { languageCode: 'tr', translationKey: 'fortune.daily_horoscope.name', translationValue: 'Günlük Burç Yorumu' },

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
    { languageCode: 'tr', translationKey: 'message.insufficient_credits', translationValue: 'Yetersiz CFC. Lütfen yönetici ile iletişime geçin.' },
    { languageCode: 'tr', translationKey: 'message.fortune_generated', translationValue: 'Falınız açığa çıktı!' },
    { languageCode: 'tr', translationKey: 'message.welcome', translationValue: 'Hoş geldiniz! 10 ücretsiz CFC kazandınız.' },
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
    { languageCode: 'tr', translationKey: 'profile.balance', translationValue: 'CFC Bakiyesi' },
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
    { languageCode: 'tr', translationKey: 'admin.add_credits', translationValue: 'CFC Ekle' },
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
    { languageCode: 'tr', translationKey: 'auth.register.subtitle', translationValue: 'Hesap oluşturun ve 10 ücretsiz CFC kazanın' },
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
    { key: 'ad_duration_seconds', value: '5', description: 'Ad duration before live session (seconds)' },
    { key: 'default_theme', value: 'falclub', description: 'Default site theme' },
  ]

  for (const setting of settings) {
    await prisma.platformSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Platform settings seeded')

  // Seed achievements
  const achievements = [
    // Fortune achievements
    { code: 'fortune_explorer', nameTr: 'Fal Kaşifi', nameEn: 'Fortune Explorer', descriptionTr: '50 fal baktır', descriptionEn: 'Get 50 fortunes', icon: '🔮', category: 'fortune', targetValue: 50, rewardCredits: 100, sortOrder: 1 },
    { code: 'coffee_master', nameTr: 'Kahve Ustası', nameEn: 'Coffee Master', descriptionTr: '100 kahve falı baktır', descriptionEn: 'Get 100 coffee fortunes', icon: '☕', category: 'fortune', targetValue: 100, rewardCredits: 200, sortOrder: 2 },
    { code: 'tarot_addict', nameTr: 'Tarot Bağımlısı', nameEn: 'Tarot Addict', descriptionTr: '50 tarot falı baktır', descriptionEn: 'Get 50 tarot readings', icon: '🃏', category: 'fortune', targetValue: 50, rewardCredits: 150, sortOrder: 3 },
    { code: 'astrology_expert', nameTr: 'Astroloji Uzmanı', nameEn: 'Astrology Expert', descriptionTr: '50 burç yorumu oku', descriptionEn: 'Read 50 horoscopes', icon: '⭐', category: 'fortune', targetValue: 50, rewardCredits: 150, sortOrder: 4 },
    { code: 'dream_interpreter', nameTr: 'Rüya Yorumcusu', nameEn: 'Dream Interpreter', descriptionTr: '25 rüya tabiri yaptır', descriptionEn: 'Get 25 dream interpretations', icon: '🌙', category: 'fortune', targetValue: 25, rewardCredits: 100, sortOrder: 5 },
    { code: 'fortune_master', nameTr: 'Fal Ustası', nameEn: 'Fortune Master', descriptionTr: '500 fal baktır', descriptionEn: 'Get 500 fortunes', icon: '👑', category: 'fortune', targetValue: 500, rewardCredits: 500, sortOrder: 6 },
    
    // Social achievements
    { code: 'social_butterfly', nameTr: 'Sosyal Kelebek', nameEn: 'Social Butterfly', descriptionTr: '100 takipçiye ulaş', descriptionEn: 'Reach 100 followers', icon: '🦋', category: 'social', targetValue: 100, rewardCredits: 200, sortOrder: 7 },
    { code: 'influencer', nameTr: 'Influencer', nameEn: 'Influencer', descriptionTr: '500 takipçiye ulaş', descriptionEn: 'Reach 500 followers', icon: '🌟', category: 'social', targetValue: 500, rewardCredits: 500, sortOrder: 8 },
    { code: 'liked_creator', nameTr: 'Sevilen İçerik', nameEn: 'Liked Creator', descriptionTr: '100 beğeni al', descriptionEn: 'Receive 100 likes', icon: '❤️', category: 'social', targetValue: 100, rewardCredits: 100, sortOrder: 9 },
    { code: 'viral_star', nameTr: 'Viral Yıldız', nameEn: 'Viral Star', descriptionTr: '1000 beğeni al', descriptionEn: 'Receive 1000 likes', icon: '🔥', category: 'social', targetValue: 1000, rewardCredits: 300, sortOrder: 10 },
    { code: 'content_creator', nameTr: 'İçerik Üreticisi', nameEn: 'Content Creator', descriptionTr: '50 paylaşım yap', descriptionEn: 'Make 50 posts', icon: '📝', category: 'social', targetValue: 50, rewardCredits: 100, sortOrder: 11 },
    
    // Stream achievements
    { code: 'live_star', nameTr: 'Canlı Yıldızı', nameEn: 'Live Star', descriptionTr: '10 canlı yayın yap', descriptionEn: 'Host 10 live streams', icon: '📺', category: 'stream', targetValue: 10, rewardCredits: 200, sortOrder: 12 },
    { code: 'streaming_pro', nameTr: 'Yayın Profesyoneli', nameEn: 'Streaming Pro', descriptionTr: '50 canlı yayın yap', descriptionEn: 'Host 50 live streams', icon: '🎥', category: 'stream', targetValue: 50, rewardCredits: 500, sortOrder: 13 },
    { code: 'crowd_pleaser', nameTr: 'Kalabalık Ustası', nameEn: 'Crowd Pleaser', descriptionTr: '100 izleyiciye aynı anda ulaş', descriptionEn: 'Reach 100 concurrent viewers', icon: '👥', category: 'stream', targetValue: 100, rewardCredits: 300, sortOrder: 14 },
    
    // Coin achievements
    { code: 'generous_user', nameTr: 'Cömert Kullanıcı', nameEn: 'Generous User', descriptionTr: '10,000 jeton hediye et', descriptionEn: 'Gift 10,000 coins', icon: '💝', category: 'coin', targetValue: 10000, rewardCredits: 500, sortOrder: 15 },
    { code: 'big_spender', nameTr: 'Büyük Harcamacı', nameEn: 'Big Spender', descriptionTr: '50,000 jeton harca', descriptionEn: 'Spend 50,000 coins', icon: '💰', category: 'coin', targetValue: 50000, rewardCredits: 300, sortOrder: 16 },
    { code: 'coin_collector', nameTr: 'Jeton Koleksiyoncusu', nameEn: 'Coin Collector', descriptionTr: '10,000 jeton kazan', descriptionEn: 'Earn 10,000 coins', icon: '🪙', category: 'coin', targetValue: 10000, rewardCredits: 200, sortOrder: 17 },
    
    // Activity achievements
    { code: 'early_bird', nameTr: 'Erken Kuş', nameEn: 'Early Bird', descriptionTr: '30 gün üst üste giriş yap', descriptionEn: 'Login 30 days in a row', icon: '🐤', category: 'activity', targetValue: 30, rewardCredits: 300, sortOrder: 18 },
    { code: 'dedicated_user', nameTr: 'Sadık Kullanıcı', nameEn: 'Dedicated User', descriptionTr: '100 saat platformda geçir', descriptionEn: 'Spend 100 hours on platform', icon: '⏰', category: 'activity', targetValue: 6000, rewardCredits: 500, sortOrder: 19 },
    { code: 'newcomer', nameTr: 'Yeni Üye', nameEn: 'Newcomer', descriptionTr: 'İlk falını baktır', descriptionEn: 'Get your first fortune', icon: '🎉', category: 'activity', targetValue: 1, rewardCredits: 50, sortOrder: 20 },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {},
      create: achievement,
    })
  }
  console.log('Achievements seeded')

  // Seed Bana Özel Items
  const banaOzelItems = [
    { slug: 'gunluk-tarot', nameTr: 'Günlük Tarot Kartı', nameEn: 'Daily Tarot Card', icon: '🃏', jetonCost: 5, category: 'tarot', sortOrder: 1 },
    { slug: 'gunluk-burc', nameTr: 'Günlük Burç Yorumu', nameEn: 'Daily Horoscope', icon: '♈', jetonCost: 3, category: 'astrology', sortOrder: 2 },
    { slug: 'yildizname', nameTr: 'Yıldızname Yorumu', nameEn: 'Star Chart Reading', icon: '🌟', jetonCost: 7, category: 'astrology', sortOrder: 3 },
    { slug: 'ask-uyumu', nameTr: 'Aşk Uyumu Analizi', nameEn: 'Love Compatibility', icon: '❤️', jetonCost: 10, category: 'fortune', sortOrder: 4 },
    { slug: 'para-kariyer', nameTr: 'Para ve Kariyer Falı', nameEn: 'Money & Career Reading', icon: '💰', jetonCost: 6, category: 'fortune', sortOrder: 5 },
    { slug: 'sansli-sayilar', nameTr: 'Günün Şanslı Sayıları', nameEn: 'Lucky Numbers', icon: '🍀', jetonCost: 2, category: 'fortune', sortOrder: 6 },
    { slug: 'evren-mesaj', nameTr: 'Evrenin Sana Mesajı', nameEn: 'Universe Message', icon: '✨', jetonCost: 4, category: 'spiritual', sortOrder: 7 },
    { slug: 'gunluk-kehanet', nameTr: 'Günlük Kehanet', nameEn: 'Daily Prophecy', icon: '🔮', jetonCost: 8, category: 'fortune', sortOrder: 8 },
    { slug: '3-kart-tarot', nameTr: '3 Kart Tarot Açılımı', nameEn: '3 Card Tarot Spread', icon: '🎴', jetonCost: 7, category: 'tarot', sortOrder: 9 },
    { slug: '7-kart-tarot', nameTr: '7 Kart Tarot Açılımı', nameEn: '7 Card Tarot Spread', icon: '🎭', jetonCost: 12, category: 'tarot', sortOrder: 10 },
    { slug: 'kahve-fali', nameTr: 'Kahve Falı Yorumu', nameEn: 'Coffee Reading', icon: '☕', jetonCost: 5, category: 'fortune', sortOrder: 11 },
    { slug: 'ruya-yorumu', nameTr: 'Rüya Yorumu', nameEn: 'Dream Interpretation', icon: '💭', jetonCost: 6, category: 'fortune', sortOrder: 12 },
    { slug: 'nazar-analizi', nameTr: 'Nazar Analizi', nameEn: 'Evil Eye Analysis', icon: '🧿', jetonCost: 4, category: 'spiritual', sortOrder: 13 },
    { slug: 'ask-fali', nameTr: 'Aşk Falı', nameEn: 'Love Fortune', icon: '💕', jetonCost: 8, category: 'fortune', sortOrder: 14 },
    { slug: 'gelecek-kehaneti', nameTr: 'Gelecek Kehaneti', nameEn: 'Future Prophecy', icon: '🌌', jetonCost: 9, category: 'fortune', sortOrder: 15 },
    { slug: 'haftalik-burc', nameTr: 'Haftalık Burç Yorumu', nameEn: 'Weekly Horoscope', icon: '📅', jetonCost: 5, category: 'astrology', sortOrder: 16 },
    { slug: 'ay-burcu', nameTr: 'Ay Burcu Yorumu', nameEn: 'Moon Sign Reading', icon: '🌙', jetonCost: 4, category: 'astrology', sortOrder: 17 },
    { slug: 'yukselen-burc', nameTr: 'Yükselen Burç Analizi', nameEn: 'Rising Sign Analysis', icon: '⬆️', jetonCost: 6, category: 'astrology', sortOrder: 18 },
    { slug: 'enerji-analizi', nameTr: 'Günün Enerji Analizi', nameEn: 'Daily Energy Analysis', icon: '⚡', jetonCost: 3, category: 'spiritual', sortOrder: 19 },
    { slug: 'spiritüel-rehber', nameTr: 'Spiritüel Rehber Mesajı', nameEn: 'Spiritual Guide Message', icon: '👁️', jetonCost: 4, category: 'spiritual', sortOrder: 20 },
    { slug: 'gizli-mesaj', nameTr: 'Evrenin Gizli Mesajı', nameEn: 'Hidden Universe Message', icon: '🌀', jetonCost: 6, category: 'spiritual', sortOrder: 21 },
    { slug: 'iliski-gelecegi', nameTr: 'İlişki Geleceği Analizi', nameEn: 'Relationship Future', icon: '💑', jetonCost: 10, category: 'fortune', sortOrder: 22 },
    { slug: 'ruh-esi', nameTr: 'Ruh Eşi Analizi', nameEn: 'Soulmate Analysis', icon: '🫂', jetonCost: 12, category: 'fortune', sortOrder: 23 },
    { slug: 'gizli-duygular', nameTr: 'Gizli Duygular Falı', nameEn: 'Hidden Feelings Reading', icon: '🎭', jetonCost: 8, category: 'fortune', sortOrder: 24 },
    { slug: 'kader-yorumu', nameTr: 'Kader Yorumu', nameEn: 'Destiny Reading', icon: '🌠', jetonCost: 7, category: 'fortune', sortOrder: 25 },
    { slug: 'sans-kapisi', nameTr: 'Şans Kapısı Falı', nameEn: 'Gate of Fortune', icon: '🚪', jetonCost: 5, category: 'fortune', sortOrder: 26 },
    { slug: 'astro-tavsiye', nameTr: 'Günün Astro Tavsiyesi', nameEn: 'Daily Astro Advice', icon: '💫', jetonCost: 3, category: 'astrology', sortOrder: 27 },
    { slug: 'astro-enerji', nameTr: 'Astrolojik Enerji Yorumu', nameEn: 'Astrological Energy', icon: '🪐', jetonCost: 4, category: 'astrology', sortOrder: 28 },
    { slug: 'karmik-bag', nameTr: 'Karmik Bağ Analizi', nameEn: 'Karmic Bond Analysis', icon: '♾️', jetonCost: 9, category: 'spiritual', sortOrder: 29 },
    { slug: 'evren-uyari', nameTr: 'Evrenin Bugünkü Uyarısı', nameEn: "Today's Universe Warning", icon: '⚠️', jetonCost: 4, category: 'spiritual', sortOrder: 30 },
  ]
  for (const item of banaOzelItems) {
    await prisma.banaOzelItem.upsert({
      where: { slug: item.slug },
      update: { jetonCost: item.jetonCost, icon: item.icon, sortOrder: item.sortOrder },
      create: item,
    })
  }
  console.log('Bana Özel items seeded')

  // Payment Methods - Papara and Bank Transfer
  const paymentMethods = [
    {
      type: 'papara',
      name: 'Papara',
      nameEn: 'Papara',
      description: 'Papara ile ödeme',
      descriptionEn: 'Payment with Papara',
      isActive: true,
      config: JSON.stringify({
        paparaNo: '1555517663',
        accountHolder: 'Mesut Bayram'
      }),
      sortOrder: 1
    },
    {
      type: 'bank_transfer',
      name: 'Havale / IBAN',
      nameEn: 'Bank Transfer / IBAN',
      description: 'Banka havalesi ile ödeme',
      descriptionEn: 'Payment via bank transfer',
      isActive: true,
      config: JSON.stringify({
        bankName: 'Garanti Bankası',
        accountHolder: 'Mesut Bayram',
        iban: 'TR94 0006 2000 0010 0006 8126 92'
      }),
      sortOrder: 2
    }
  ]
  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { type: method.type },
      update: { 
        config: method.config,
        isActive: method.isActive,
        sortOrder: method.sortOrder
      },
      create: method,
    })
  }
  console.log('Payment methods seeded')

  // WhatsApp Settings
  const whatsappSettings = [
    { key: 'whatsapp_number', value: '+905327170173', description: 'WhatsApp destek numarası' },
    { key: 'whatsapp_enabled', value: 'true', description: 'WhatsApp desteği aktif' },
    { key: 'whatsapp_message', value: `Merhaba, jeton almak istiyorum.

📦 Paket: {package}
👤 Kullanıcı Adı: {username}

Papara veya IBAN ile ödeme yapabilirsiniz.

🏦 Garanti Bankası
Mesut Bayram
IBAN: TR94 0006 2000 0010 0006 8126 92

💜 Papara Hesabı
Mesut Bayram
Papara No: 1555517663`, description: 'WhatsApp otomatik mesaj şablonu' }
  ]
  for (const setting of whatsappSettings) {
    await prisma.platformSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log('WhatsApp settings seeded')

  // Chat room creation cost
  await prisma.platformSettings.upsert({
    where: { key: 'chat_room_creation_cost' },
    update: {},
    create: { key: 'chat_room_creation_cost', value: '100', description: 'Cost to create a chat room (in jetons or CFC)' }
  })
  console.log('Chat room settings seeded')

  // Mini Game Center - Default Games
  const defaultGames = [
    { slug: 'fal-carki', title: 'Fal Çarkı', description: 'Çarkı çevir, şansını dene!', icon: '🎡', sortOrder: 1, minReward: 0, maxReward: 5, entryFee: 0 },
    { slug: 'tarot-sec', title: 'Tarot Kartı Seç', description: 'Kapalı tarot kartlarından birini seç ve ödülünü kazan!', icon: '🃏', sortOrder: 2, minReward: 5, maxReward: 75, entryFee: 0 },
    { slug: 'memory', title: 'Kahve Falı Memory', description: 'Kahve falı temalı kart eşleştirme oyunu', icon: '☕', sortOrder: 3, minReward: 10, maxReward: 60, entryFee: 0 },
    { slug: 'quiz', title: 'Astroloji Quiz', description: 'Burçlar ve astroloji hakkında bilgini test et!', icon: '⭐', sortOrder: 4, minReward: 5, maxReward: 50, entryFee: 0 },
    { slug: 'sans-kutusu', title: 'Şans Kutusu', description: 'Gizemli kutuyu aç, sürpriz ödül kazan!', icon: '🎁', sortOrder: 5, minReward: 3, maxReward: 80, entryFee: 0 },
    { slug: 'sayi-tahmin', title: 'Sayı Tahmin', description: '1-100 arasında sayı tahmin et!', icon: '🔢', sortOrder: 6, minReward: 10, maxReward: 50, entryFee: 0 },
    { slug: 'lamba-cini', title: 'Lamba Cini', description: 'Sihirli lambayı ov, cin\'i çağır ve hazine sandığından ödülünü al!', icon: '🪔', sortOrder: 7, minReward: 0, maxReward: 5, entryFee: 0, config: JSON.stringify({ dailyLimit: 3, rewards: [{ type: 'cfc', amount: 0, label: 'Boş Sandık', emoji: '💨', weight: 20 }, { type: 'cfc', amount: 1, label: '1 CFC', emoji: '🪙', weight: 25 }, { type: 'cfc', amount: 2, label: '2 CFC', emoji: '💰', weight: 20 }, { type: 'cfc', amount: 3, label: '3 CFC', emoji: '💎', weight: 15 }, { type: 'free_fortune', amount: 0, label: 'Ücretsiz Fal', emoji: '🔮', weight: 10 }, { type: 'empty', amount: 0, label: 'Boş Kart', emoji: '🃏', weight: 10 }] }) },
  ]
  for (const game of defaultGames) {
    await prisma.miniGame.upsert({
      where: { slug: game.slug },
      update: { title: game.title, description: game.description, icon: game.icon, sortOrder: game.sortOrder, ...(game.config ? { config: game.config } : {}) },
      create: game,
    })
  }
  console.log('Mini games seeded')

  // Fortune Request Types for Live Streams
  const defaultFortuneTypes = [
    { name: 'Tek Soru', nameEn: 'Single Question', icon: '❓', jetonCost: 5, description: 'Tek bir soruya yanıt', sortOrder: 1 },
    { name: 'Evet/Hayır', nameEn: 'Yes/No', icon: '✅', jetonCost: 10, description: 'Evet veya hayır cevaplı soru', sortOrder: 2 },
    { name: 'Detaylı Fal', nameEn: 'Detailed Reading', icon: '☕', jetonCost: 50, description: 'Detaylı kahve falı yorumu', sortOrder: 3 },
    { name: 'Genel Bakış', nameEn: 'General Overview', icon: '🔮', jetonCost: 100, description: 'Genel hayat ve gelecek bakışı', sortOrder: 4 },
    { name: 'Aşk Falı', nameEn: 'Love Reading', icon: '💕', jetonCost: 75, description: 'Aşk ve ilişkiler hakkında', sortOrder: 5 },
    { name: 'Premium VIP', nameEn: 'Premium VIP', icon: '👑', jetonCost: 500, description: 'Özel ve kapsamlı fal bakımı', sortOrder: 6 },
  ]
  for (const type of defaultFortuneTypes) {
    await prisma.fortuneRequestType.upsert({
      where: { id: type.name.toLowerCase().replace(/\s/g, '-').replace(/\//g, '-') },
      update: { 
        name: type.name,
        nameEn: type.nameEn,
        icon: type.icon,
        jetonCost: type.jetonCost,
        description: type.description,
        sortOrder: type.sortOrder
      },
      create: {
        id: type.name.toLowerCase().replace(/\s/g, '-').replace(/\//g, '-'),
        ...type,
        isActive: true
      },
    })
  }
  console.log('Fortune request types seeded')

  // Seed dream interpretations
  const defaultDreams = [
    {
      title: 'Rüyada Yılan Görmek',
      slug: 'ruyada-yilan-gormek',
      summary: 'Rüyada yılan görmek, düşman, hile ve gizli tehlikelere işaret eder. İslami ve psikolojik yorumlarıyla detaylı analiz.',
      content: '<h2>Rüyada Yılan Görmek Ne Anlama Gelir?</h2><p>Rüyada yılan görmek, en sık aranan rüya tabirlerinden biridir. Genel olarak düşman, hile, fitne ve gizli tehlikelere işaret eder.</p><h2>İslami Rüya Tabiri</h2><p>İslami kaynaklara göre rüyada yılan görmek, düşmanla karşılaşmaya ve fitnecilerle mücadeleye işaret eder. Büyük yılan güçlü bir düşmanı, küçük yılan ise zayıf bir düşmanı temsil eder.</p><h2>Psikolojik Yorum</h2><p>Psikolojik açıdan yılan rüyaları, bilinçaltındaki korkuları, bastırılmış duyguları ve değişim süreçlerini simgeler. Yılanın dönüşümü, kişisel gelişim ve yenilenme anlamına da gelebilir.</p><h2>Detaylı Senaryolar</h2><h3>Siyah Yılan Görmek</h3><p>Siyah yılan görmek, güçlü ve sinsi bir düşmanın varlığına işaret eder.</p><h3>Beyaz Yılan Görmek</h3><p>Beyaz yılan görmek, genellikle olumlu yorumlanır ve şifa anlamına gelir.</p><h3>Yılan Sokmak</h3><p>Rüyada yılanın sokması, beklenmedik bir yerden gelecek zarara veya hastalığa dikkat çeker.</p><h2>Genel Değerlendirme</h2><p>Yılan rüyaları bağlamına göre farklı yorumlanır. Rüyanın detaylarını dikkate alarak kapsamlı bir değerlendirme yapılmalıdır.</p>',
      keywords: ['yılan', 'yılan görmek', 'siyah yılan', 'beyaz yılan', 'yılan sokması'],
      metaDescription: 'Rüyada yılan görmek ne anlama gelir? İslami, psikolojik ve geleneksel yorumlarla detaylı rüya tabiri.',
    },
    {
      title: 'Rüyada Köpek Görmek',
      slug: 'ruyada-kopek-gormek',
      summary: 'Rüyada köpek görmek, sadakat, dostluk veya düşmanlık gibi farklı anlamlara gelebilir.',
      content: '<h2>Rüyada Köpek Görmek Ne Anlama Gelir?</h2><p>Rüyada köpek görmek, rüyanın bağlamına göre hem olumlu hem de olumsuz anlamlar taşıyabilir. Genel olarak sadakat, dostluk, koruma veya düşmanlık simgesidir.</p><h2>İslami Rüya Tabiri</h2><p>İslami yoruma göre rüyada köpek görmek farklı şekillerde tabir edilir. Evcil köpek sadık bir dost, saldırgan köpek ise zararlı bir kişiyi temsil eder.</p><h2>Psikolojik Yorum</h2><p>Psikolojik açıdan köpek rüyaları, güven, sadakat ve sosyal ilişkilerle bağlantılıdır.</p><h2>Detaylı Senaryolar</h2><h3>Beyaz Köpek Görmek</h3><p>Beyaz köpek, iyi niyetli ve güvenilir bir dosta işaret eder.</p><h3>Siyah Köpek Görmek</h3><p>Siyah köpek, gizli tehlike veya korkuları simgeler.</p><h3>Köpek Saldırması</h3><p>Köpek saldırması, çevrenizdeki birinin ihaneti veya saldırganlığına dikkat çeker.</p><h2>Genel Değerlendirme</h2><p>Köpek rüyaları kişisel ilişkileriniz ve güven duygularınız hakkında önemli ipuçları verir.</p>',
      keywords: ['köpek', 'köpek görmek', 'beyaz köpek', 'siyah köpek', 'köpek saldırması'],
      metaDescription: 'Rüyada köpek görmek ne anlama gelir? İslami ve psikolojik yorumlarla detaylı rüya tabiri.',
    },
    {
      title: 'Rüyada Su Görmek',
      slug: 'ruyada-su-gormek',
      summary: 'Rüyada su görmek, rızık, bereket, arınma ve duygusal durumla ilişkilidir.',
      content: '<h2>Rüyada Su Görmek Ne Anlama Gelir?</h2><p>Su, rüya tabirinde en önemli sembollerden biridir. Hayat, arınma, bereket ve duygusal durumu simgeler.</p><h2>İslami Rüya Tabiri</h2><p>İslami kaynaklara göre temiz su görmek rızık ve berekete, bulanık su görmek ise sıkıntı ve huzursuzluğa işaret eder.</p><h2>Psikolojik Yorum</h2><p>Psikolojik açıdan su, bilinçaltını ve duygusal dünyayı temsil eder. Durgun su iç huzuru, dalgalı su ise duygusal çalkantıları simgeler.</p><h2>Detaylı Senaryolar</h2><h3>Temiz Su Görmek</h3><p>Temiz ve berrak su, bolluk, sağlık ve huzur demektir.</p><h3>Bulanık Su Görmek</h3><p>Bulanık su, karışık duygular ve zorluklar anlamına gelir.</p><h3>Su İçmek</h3><p>Rüyada su içmek, ilim öğrenmeye ve manevi arınmaya işaret eder.</p><h2>Genel Değerlendirme</h2><p>Su rüyaları, duygusal ve manevi yaşamınız hakkında derin mesajlar taşır.</p>',
      keywords: ['su', 'su görmek', 'temiz su', 'bulanık su', 'su içmek', 'deniz'],
      metaDescription: 'Rüyada su görmek ne anlama gelir? Temiz su, bulanık su ve su içmek rüya tabirleri.',
    },
    {
      title: 'Rüyada Altın Görmek',
      slug: 'ruyada-altin-gormek',
      summary: 'Rüyada altın görmek, zenginlik, başarı ve değerli kazanımlarla ilişkilendirilir.',
      content: '<h2>Rüyada Altın Görmek Ne Anlama Gelir?</h2><p>Altın rüyaları genellikle maddi kazanç, başarı ve değerli fırsatlarla ilişkilendirilir.</p><h2>İslami Rüya Tabiri</h2><p>İslami yoruma göre altın görmek erkekler için sıkıntı, kadınlar için ise süs ve güzellik anlamına gelebilir.</p><h2>Psikolojik Yorum</h2><p>Psikolojik olarak altın, öz değer, başarı hırsı ve maddi güvenlik arayışını simgeler.</p><h2>Detaylı Senaryolar</h2><h3>Altın Bulmak</h3><p>Altın bulmak, beklenmedik bir kazanç veya fırsata işaret eder.</p><h3>Altın Bilezik Görmek</h3><p>Altın bilezik, kadınlar için güzellik ve mutluluk, erkekler için ise sorumluluk anlamına gelir.</p><h2>Genel Değerlendirme</h2><p>Altın rüyaları, maddi ve manevi değerleriniz hakkında önemli mesajlar taşır.</p>',
      keywords: ['altın', 'altın görmek', 'altın bulmak', 'altın bilezik', 'altın yüzük'],
      metaDescription: 'Rüyada altın görmek ne anlama gelir? Altın bulmak, altın bilezik ve detaylı rüya tabiri.',
    },
    {
      title: 'Rüyada Bebek Görmek',
      slug: 'ruyada-bebek-gormek',
      summary: 'Rüyada bebek görmek, yeni başlangıçlar, masumiyet ve hayırlı haberlerle ilişkilidir.',
      content: '<h2>Rüyada Bebek Görmek Ne Anlama Gelir?</h2><p>Bebek rüyaları, yeni başlangıçları, masumiyeti ve umut dolu gelişmeleri simgeler.</p><h2>İslami Rüya Tabiri</h2><p>İslami kaynaklara göre rüyada bebek görmek, hayırlı haberlere, rızka ve berekete işaret eder.</p><h2>Psikolojik Yorum</h2><p>Psikolojik açıdan bebek rüyaları, yeni projeleri, yaratıcılığı ve iç çocuğunuzla bağlantıyı temsil eder.</p><h2>Detaylı Senaryolar</h2><h3>Gülen Bebek Görmek</h3><p>Gülen bir bebek görmek, mutluluk ve güzel haberlere işaret eder.</p><h3>Ağlayan Bebek Görmek</h3><p>Ağlayan bebek, ihmal edilen bir konuya veya duygusal ihtiyaçlara dikkat çeker.</p><h2>Genel Değerlendirme</h2><p>Bebek rüyaları genel olarak olumlu yorumlanır ve hayatınızdaki yeni dönemlere işaret eder.</p>',
      keywords: ['bebek', 'bebek görmek', 'gülen bebek', 'ağlayan bebek', 'yenidoğan'],
      metaDescription: 'Rüyada bebek görmek ne anlama gelir? Gülen bebek, ağlayan bebek ve detaylı rüya tabiri.',
    },
    {
      title: 'Rüyada Uçmak',
      slug: 'ruyada-ucmak',
      summary: 'Rüyada uçmak, özgürlük, yükselme, başarı ve manevi yücelmeye işaret eder.',
      content: '<h2>Rüyada Uçmak Ne Anlama Gelir?</h2><p>Uçma rüyaları en yaygın rüya türlerinden biridir ve genellikle özgürlük, güç ve yükselme ile ilişkilendirilir.</p><h2>İslami Rüya Tabiri</h2><p>İslami yoruma göre rüyada uçmak, makam yükselmesi, seyahat ve manevi yücelme anlamına gelir.</p><h2>Psikolojik Yorum</h2><p>Psikolojik açıdan uçma rüyaları, kısıtlamalardan kurtulma arzusunu ve özgüven duygusunu yansıtır.</p><h2>Detaylı Senaryolar</h2><h3>Yüksekten Uçmak</h3><p>Yüksekten uçmak, büyük hedeflere ulaşmaya ve başarıya işaret eder.</p><h3>Alçaktan Uçmak</h3><p>Alçaktan uçmak, mevcut durumunuzda küçük ama önemli ilerlemelere işaret eder.</p><h3>Uçarken Düşmek</h3><p>Uçarken düşmek, kontrol kaybı ve güvensizlik hissini simgeler.</p><h2>Genel Değerlendirme</h2><p>Uçma rüyaları, kişisel gelişim ve özgürlük arayışınızla doğrudan bağlantılıdır.</p>',
      keywords: ['uçmak', 'uçma', 'gökyüzü', 'kanat', 'düşmek'],
      metaDescription: 'Rüyada uçmak ne anlama gelir? Yüksekten uçmak, alçaktan uçmak ve detaylı rüya tabiri.',
    },
  ]

  for (const dream of defaultDreams) {
    await prisma.dreamInterpretation.upsert({
      where: { slug: dream.slug },
      update: {
        title: dream.title,
        summary: dream.summary,
        keywords: dream.keywords,
        metaDescription: dream.metaDescription,
      },
      create: {
        ...dream,
        isPublished: true,
        isAiGenerated: false,
      },
    })
  }
  console.log('Dream interpretations seeded')

  // Seed Dream Symbols (A-Z Dictionary)
  const dreamSymbols = [
    { name: 'Araba', letter: 'A', meaning: 'Hayattaki yolculu\u011fu ve ilerlemeyi simgeler.', detailedMeaning: 'R\u00fcyada araba g\u00f6rmek, ki\u015finin hayat\u0131ndaki kontrol\u00fc ve y\u00f6n\u00fc temsil eder. Araba kullanmak, kendi kaderini belirleyebilme g\u00fcc\u00fcn\u00fc; yolcu olmak ise ba\u015fkalar\u0131n\u0131n etkisinde kalmay\u0131 ifade eder.' },
    { name: 'A\u011flamak', letter: 'A', meaning: 'Duygusal ar\u0131nma ve rahatlama anlam\u0131na gelir.', detailedMeaning: 'R\u00fcyada a\u011flamak genellikle olumlu yorumlan\u0131r. Birikmi\u015f duygular\u0131n d\u0131\u015fa vurumu ve i\u00e7 huzura kavu\u015fma belirtisidir.' },
    { name: 'Alt\u0131n', letter: 'A', meaning: 'Bolluk, zenginlik ve de\u011ferli olan\u0131 simgeler.', detailedMeaning: 'R\u00fcyada alt\u0131n g\u00f6rmek, maddi veya manevi zenginli\u011fin habercisidir. Alt\u0131n bulmak \u015fans\u0131, kaybetmek ise f\u0131rsat\u0131 ka\u00e7\u0131rmay\u0131 ifade eder.' },
    { name: 'Bebek', letter: 'B', meaning: 'Yeni ba\u015flang\u0131\u00e7lar, masumiyet ve potansiyeli temsil eder.', detailedMeaning: 'R\u00fcyada bebek g\u00f6rmek, yeni bir proje, fikir veya ya\u015fam evresinin ba\u015flang\u0131c\u0131na i\u015faret eder. A\u011flayan bebek dikkat gerektiren bir durumu ifade eder.' },
    { name: 'Bal\u0131k', letter: 'B', meaning: 'Bereket, bolluk ve bilin\u00e7alt\u0131n\u0131 simgeler.', detailedMeaning: 'R\u00fcyada bal\u0131k g\u00f6rmek genellikle r\u0131z\u0131k ve bereketin m\u00fcjdecisidir. Bal\u0131k tutmak ba\u015far\u0131y\u0131, suda y\u00fczen bal\u0131k ise \u00f6zg\u00fcrl\u00fc\u011f\u00fc temsil eder.' },
    { name: 'Cami', letter: 'C', meaning: 'Manevi ar\u0131nma, huzur ve yol g\u00f6stericilik.', detailedMeaning: 'R\u00fcyada cami g\u00f6rmek, manevi bir yolculu\u011fa \u00e7\u0131kmay\u0131 veya i\u00e7 huzur aray\u0131\u015f\u0131n\u0131 simgeler. Camide namaz k\u0131lmak, dualara kavu\u015fmay\u0131 ifade eder.' },
    { name: '\u00c7i\u00e7ek', letter: '\u00c7', meaning: 'G\u00fczellik, sevgi ve ya\u015fam\u0131n k\u0131sa s\u00fcrelili\u011fi.', detailedMeaning: 'R\u00fcyada \u00e7i\u00e7ek g\u00f6rmek, mutluluk ve g\u00fczel haberlerin m\u00fcjdecisidir. Solmu\u015f \u00e7i\u00e7ekler ise hayal k\u0131r\u0131kl\u0131\u011f\u0131 veya ge\u00e7ici bir \u00fcz\u00fcnt\u00fcy\u00fc ifade eder.' },
    { name: 'Deniz', letter: 'D', meaning: 'Bilin\u00e7alt\u0131, duygusal derinlik ve s\u0131n\u0131rs\u0131zl\u0131k.', detailedMeaning: 'R\u00fcyada deniz g\u00f6rmek, ki\u015finin duygusal d\u00fcnyas\u0131n\u0131 yans\u0131t\u0131r. Sakin deniz huzuru, f\u0131rt\u0131nal\u0131 deniz ise i\u00e7sel \u00e7alkant\u0131lar\u0131 simgeler.' },
    { name: 'D\u00fc\u015fmek', letter: 'D', meaning: 'Kontrol kayb\u0131, g\u00fcvensizlik veya yeni bir ba\u015flang\u0131\u00e7.', detailedMeaning: 'R\u00fcyada d\u00fc\u015fmek, hayattaki belirsizliklere kar\u015f\u0131 duyulan kayg\u0131y\u0131 temsil eder. U\u00e7urumdan d\u00fc\u015fmek b\u00fcy\u00fck de\u011fi\u015fimlere, yere d\u00fc\u015fmek ise hayal k\u0131r\u0131kl\u0131\u011f\u0131na i\u015faret edebilir.' },
    { name: 'Ev', letter: 'E', meaning: 'Benlik, g\u00fcvenlik ve aile ba\u011flar\u0131n\u0131 simgeler.', detailedMeaning: 'R\u00fcyada ev g\u00f6rmek, ki\u015finin i\u00e7 d\u00fcnyas\u0131n\u0131 ve g\u00fcvenlik aray\u0131\u015f\u0131n\u0131 temsil eder. Yeni ev ta\u015f\u0131nmak de\u011fi\u015fimi, y\u0131k\u0131k ev ise ge\u00e7mi\u015fte b\u0131rak\u0131lmam\u0131\u015f konular\u0131 ifade eder.' },
    { name: 'Fare', letter: 'F', meaning: 'K\u00fc\u00e7\u00fck endi\u015feler, gizli d\u00fc\u015fmanlar ve detaylar.', detailedMeaning: 'R\u00fcyada fare g\u00f6rmek, k\u00fc\u00e7\u00fck ama rahats\u0131z edici sorunlara dikkat \u00e7eker. Beyaz fare iyi haber, siyah fare ise k\u00f6t\u00fc niyetli birine i\u015faret edebilir.' },
    { name: 'G\u00f6l', letter: 'G', meaning: 'Dinginlik, i\u00e7 g\u00f6zlem ve duygusal denge.', detailedMeaning: 'R\u00fcyada g\u00f6l g\u00f6rmek, sakin ve derin duygular\u0131 temsil eder. Berrak g\u00f6l net bir zihni, bulan\u0131k g\u00f6l ise kafa kar\u0131\u015f\u0131kl\u0131\u011f\u0131n\u0131 ifade eder.' },
    { name: 'G\u00fcne\u015f', letter: 'G', meaning: 'Enerji, ba\u015far\u0131, ayd\u0131nlanma ve umut.', detailedMeaning: 'R\u00fcyada g\u00fcne\u015f g\u00f6rmek, hayat\u0131n\u0131za \u0131\u015f\u0131k ve pozitif enerji gelece\u011fini m\u00fcjdeler. Do\u011fan g\u00fcne\u015f yeni f\u0131rsatlar\u0131, batan g\u00fcne\u015f ise bir d\u00f6nemin kapan\u0131\u015f\u0131n\u0131 simgeler.' },
    { name: 'G\u00fcl', letter: 'G', meaning: 'A\u015fk, tutku ve g\u00fczellik.', detailedMeaning: 'R\u00fcyada g\u00fcl g\u00f6rmek, romantik duygular\u0131n ve g\u00fczel ili\u015fkilerin habercisidir. K\u0131rm\u0131z\u0131 g\u00fcl tutkuyu, beyaz g\u00fcl safl\u0131\u011f\u0131 simgeler.' },
    { name: 'Hastane', letter: 'H', meaning: '\u0130yile\u015fme, yard\u0131m aray\u0131\u015f\u0131 ve \u015fifaya kavu\u015fma.', detailedMeaning: 'R\u00fcyada hastane g\u00f6rmek, fiziksel veya ruhsal iyile\u015fme s\u00fcrecini temsil eder. Genellikle yard\u0131m ihtiyac\u0131n\u0131 veya birinin size destek olaca\u011f\u0131n\u0131 ifade eder.' },
    { name: '\u0130nek', letter: '\u0130', meaning: 'Bereket, annelik ve bolluk.', detailedMeaning: 'R\u00fcyada inek g\u00f6rmek, maddi bolluk ve bereketin simgesidir. S\u00fct veren inek r\u0131z\u0131k ve bereket, zay\u0131f inek ise k\u0131tl\u0131k uyar\u0131s\u0131d\u0131r.' },
    { name: 'Kahve', letter: 'K', meaning: 'Sosyal ba\u011flar, sezgi ve haber alma.', detailedMeaning: 'R\u00fcyada kahve g\u00f6rmek, yak\u0131n \u00e7evreden gelecek haberlere i\u015faret eder. Kahve i\u00e7mek sohbet ve dostlu\u011fu, kahve fal\u0131 ise gelece\u011fe dair merak\u0131 simgeler.' },
    { name: 'Kedi', letter: 'K', meaning: 'Ba\u011f\u0131ms\u0131zl\u0131k, gizemcilik ve kad\u0131ns\u0131 enerji.', detailedMeaning: 'R\u00fcyada kedi g\u00f6rmek, sezgilerin g\u00fc\u00e7lenmesini ve ba\u011f\u0131ms\u0131zl\u0131k arzusunu simgeler. Siyah kedi \u015fans\u0131 veya \u015fanss\u0131zl\u0131\u011f\u0131, beyaz kedi ise maneviyat\u0131 temsil eder.' },
    { name: 'K\u00f6pek', letter: 'K', meaning: 'Sadakat, dostluk ve koruma.', detailedMeaning: 'R\u00fcyada k\u00f6pek g\u00f6rmek, sad\u0131k bir dost veya koruyucu bir ki\u015fiyi temsil eder. Havlayan k\u00f6pek uyar\u0131y\u0131, sevimli k\u00f6pek ise mutlulu\u011fu simgeler.' },
    { name: 'Merdiven', letter: 'M', meaning: 'Y\u00fckselme, ilerleme veya gerileme.', detailedMeaning: 'R\u00fcyada merdiven \u00e7\u0131kmak, kariyer veya manevi y\u00fckselmeyi simgeler. Merdiven inmek ise ge\u00e7mi\u015fe d\u00f6nmek veya bilin\u00e7alt\u0131na inmek anlam\u0131na gelir.' },
    { name: 'Nehir', letter: 'N', meaning: 'Ya\u015fam ak\u0131\u015f\u0131, zaman ve de\u011fi\u015fim.', detailedMeaning: 'R\u00fcyada nehir g\u00f6rmek, ya\u015fam\u0131n do\u011fal ak\u0131\u015f\u0131n\u0131 temsil eder. Berrak akan nehir huzuru, ta\u015fk\u0131n nehir ise kontrol d\u0131\u015f\u0131 duyguları simgeler.' },
    { name: 'Okul', letter: 'O', meaning: '\u00d6\u011frenme, geli\u015fim ve ge\u00e7mi\u015f deneyimler.', detailedMeaning: 'R\u00fcyada okul g\u00f6rmek, hayattan \u00f6\u011frenilecek dersler oldu\u011funu g\u00f6sterir. S\u0131nav g\u00f6rmek kayg\u0131y\u0131, mezuniyet ise ba\u015far\u0131y\u0131 simgeler.' },
    { name: '\u00d6l\u00fcm', letter: '\u00d6', meaning: 'D\u00f6n\u00fc\u015f\u00fcm, son ve yeni ba\u015flang\u0131\u00e7.', detailedMeaning: 'R\u00fcyada \u00f6l\u00fcm g\u00f6rmek genellikle olumsuz de\u011fildir. Bir d\u00f6nemin sona ermesini ve yeni bir ba\u015flang\u0131c\u0131n yak\u0131nla\u015ft\u0131\u011f\u0131n\u0131 simgeler.' },
    { name: 'Para', letter: 'P', meaning: 'De\u011fer, \u00f6zg\u00fcven ve maddi konular.', detailedMeaning: 'R\u00fcyada para g\u00f6rmek, ki\u015finin \u00f6z de\u011ferini ve maddi durumunu yans\u0131t\u0131r. Para bulmak f\u0131rsat\u0131, kaybetmek ise kayg\u0131y\u0131 temsil eder.' },
    { name: 'R\u00fczgar', letter: 'R', meaning: 'De\u011fi\u015fim, \u00f6zg\u00fcrl\u00fck ve g\u00f6r\u00fcnmeyen g\u00fc\u00e7ler.', detailedMeaning: 'R\u00fcyada r\u00fczgar g\u00f6rmek, hayat\u0131n\u0131zdaki de\u011fi\u015fim r\u00fczgarlar\u0131n\u0131 simgeler. Hafif r\u00fczgar olumlu de\u011fi\u015fimi, f\u0131rt\u0131na ise zorluklar\u0131 ifade eder.' },
    { name: 'Su', letter: 'S', meaning: 'Duygular, ar\u0131nma ve ya\u015fam enerjisi.', detailedMeaning: 'R\u00fcyada su g\u00f6rmek, duygusal d\u00fcnyan\u0131z\u0131n aynas\u0131d\u0131r. Temiz su ar\u0131nmay\u0131, bulan\u0131k su kafa kar\u0131\u015f\u0131kl\u0131\u011f\u0131n\u0131, akan su ise ya\u015fam enerjisini simgeler.' },
    { name: 'Y\u0131lan', letter: 'Y', meaning: 'D\u00f6n\u00fc\u015f\u00fcm, \u015fifa, gizli tehlike veya bilgelik.', detailedMeaning: 'R\u00fcyada y\u0131lan g\u00f6rmek \u00e7ok katmanl\u0131 bir sembold\u00fcr. Y\u0131lan\u0131n derisi de\u011fi\u015ftirmesi d\u00f6n\u00fc\u015f\u00fcm\u00fc, \u0131s\u0131rmas\u0131 uyar\u0131y\u0131, sakin y\u0131lan ise bilgeli\u011fi simgeler.' },
    { name: 'Y\u00fcz\u00fck', letter: 'Y', meaning: 'Ba\u011fl\u0131l\u0131k, s\u00f6z ve birliktelik.', detailedMeaning: 'R\u00fcyada y\u00fcz\u00fck g\u00f6rmek, ba\u011fl\u0131l\u0131k ve s\u00f6z verme ile ilgilidir. Y\u00fcz\u00fck takmak birliktelik vaadini, kaybetmek ise bir ba\u011f\u0131n zay\u0131flamas\u0131n\u0131 ifade eder.' },
    { name: 'U\u00e7ak', letter: 'U', meaning: 'Y\u00fcksek hedefler, \u00f6zg\u00fcrl\u00fck ve yolculuk.', detailedMeaning: 'R\u00fcyada u\u00e7ak g\u00f6rmek, b\u00fcy\u00fck hedeflere ula\u015fma arzusunu simgeler. U\u00e7akta olmak yeni ufuklara a\u00e7\u0131lmay\u0131, u\u00e7a\u011f\u0131n d\u00fc\u015fmesi ise kayg\u0131lar\u0131 temsil eder.' },
    { name: '\u00dc\u015f\u00fcmek', letter: '\u00dc', meaning: 'Yaln\u0131zl\u0131k, duygusal uzakl\u0131k ve ihtiya\u00e7.', detailedMeaning: 'R\u00fcyada \u00fc\u015f\u00fcmek, duygusal olarak desteklenmemi\u015f hissetmeyi veya yaln\u0131zl\u0131\u011f\u0131 simgeler. S\u0131cakl\u0131\u011fa kavu\u015fmak ise teselli bulmay\u0131 ifade eder.' },
    { name: 'Volkan', letter: 'V', meaning: 'Bastırılmı\u015f duygular, \u00f6fke ve ani patlamalar.', detailedMeaning: 'R\u00fcyada volkan g\u00f6rmek, i\u00e7inizde biriken duygular\u0131n patlama noktas\u0131na geldi\u011fini simgeler. Patlayan volkan kontrol kayb\u0131n\u0131, s\u00f6nm\u00fc\u015f volkan ise ge\u00e7mi\u015f \u00f6fkeyi temsil eder.' },
    { name: 'Zil', letter: 'Z', meaning: 'Uyar\u0131, haber ve fark\u0131ndal\u0131k.', detailedMeaning: 'R\u00fcyada zil sesi duymak, dikkat etmeniz gereken \u00f6nemli bir mesaj veya uyar\u0131 oldu\u011funu simgeler. Kap\u0131 zili misafir haberini ifade eder.' },
  ]

  for (const symbol of dreamSymbols) {
    const slug = symbol.name.toLowerCase()
      .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/İ/g, 'i').replace(/Ç/g, 'c').replace(/Ğ/g, 'g')
      .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ü/g, 'u')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    await prisma.dreamSymbol.upsert({
      where: { slug },
      update: {
        name: symbol.name,
        letter: symbol.letter,
        meaning: symbol.meaning,
        detailedMeaning: symbol.detailedMeaning,
      },
      create: {
        name: symbol.name,
        slug,
        letter: symbol.letter,
        meaning: symbol.meaning,
        detailedMeaning: symbol.detailedMeaning,
      },
    })
  }
  console.log('Dream symbols seeded')

  // ===== Blog Categories =====
  const blogCategories = [
    { slug: 'haftanin-burcu', nameTr: 'Haftanın Burcu', nameEn: 'Weekly Zodiac', sortOrder: 1 },
    { slug: 'astroloji-rehberi', nameTr: 'Astroloji Rehberi', nameEn: 'Astrology Guide', sortOrder: 2 },
  ]
  for (const cat of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: { nameTr: cat.nameTr, sortOrder: cat.sortOrder },
      create: cat,
    })
  }
  console.log('Blog categories seeded')

  // ===== Blog Posts =====
  const blogPosts = [
    {
      slug: 'haftanin-burcu-koc-mart-2026',
      titleTr: 'Haftanın Burcu: Koç — 16-22 Mart 2026',
      descTr: 'Bu hafta Koç burçları için enerjik ve fırsatlarla dolu bir dönem başlıyor. Mars etkisi altında cesur adımlar atmanın tam zamanı.',
      contentTr: `🔮 Koç Burcu Haftalık Yorum — 16-22 Mart 2026\n\nBu hafta Koç burçları için oldukça dinamik bir dönem. Mars'ın Yay burcundaki konumu sizlere cesaret ve enerji veriyor.\n\n⭐ Aşk: İlişkinizde tutku yeniden alevleniyor. Bekar Koçlar beklenmedik bir tanışma yaşayabilir.\n\n💼 Kariyer: İş hayatında liderlik özellikleriniz ön plana çıkıyor. Yeni projeler için ideal bir hafta.\n\n💰 Para: Finansal konularda dikkatli olun. Ani harcamalardan kaçının ama yatırım fırsatlarını değerlendirin.\n\n🌟 Sağlık: Enerji seviyeniz yüksek. Spor yapmak için harika bir hafta.\n\n📅 Şanslı Günler: Salı ve Perşembe\n🔢 Şanslı Sayılar: 3, 17, 28\n🎨 Şanslı Renk: Kırmızı`,
      category: 'haftanin-burcu',
      keywords: ['koç', 'haftalık burç', 'mart 2026', 'astroloji'],
    },
    {
      slug: 'haftanin-burcu-boga-mart-2026',
      titleTr: 'Haftanın Burcu: Boğa — 16-22 Mart 2026',
      descTr: 'Boğa burçları bu hafta maddi konularda şanslı. Venüs etkisiyle aşk hayatında güzel gelişmeler sizi bekliyor.',
      contentTr: `🔮 Boğa Burcu Haftalık Yorum — 16-22 Mart 2026\n\nBu hafta Boğa burçları için duygusal ve maddi denge ön planda.\n\n⭐ Aşk: Venüs'ün etkisiyle romantik anlar yaşayacaksınız. Partnerinizle özel bir akşam planlayın.\n\n💼 Kariyer: Sabırlı yaklaşımınız meyvelerini veriyor. Uzun süredir beklediğiniz haber bu hafta gelebilir.\n\n💰 Para: Maddi konularda olumlu gelişmeler. Beklenmedik bir gelir kapınızı çalabilir.\n\n🌟 Sağlık: Stres yönetimi önemli. Doğada vakit geçirin.\n\n📅 Şanslı Günler: Çarşamba ve Cuma\n🔢 Şanslı Sayılar: 6, 15, 24\n🎨 Şanslı Renk: Yeşil`,
      category: 'haftanin-burcu',
      keywords: ['boğa', 'haftalık burç', 'mart 2026', 'astroloji'],
    },
    {
      slug: 'astroloji-rehberi-yukselen-burc',
      titleTr: 'Yükselen Burcunuz Ne Anlama Gelir?',
      descTr: 'Yükselen burcunuz, dış dünyanın sizi nasıl gördüğünü belirler. Bu rehberde yükselen burcunuzun tüm sırlarını öğrenin.',
      contentTr: `🌅 Yükselen Burcunuz Ne Anlama Gelir?\n\nAstrolojide yükselen burç, doğum anınızda ufuk çizgisinde yükselen burç işaretidir. Güneş burcunuz iç benliğinizi temsil ederken, yükselen burcunuz dış dünyanın sizi nasıl algıladığını belirler.\n\n🔍 Yükselen Burcunuzu Nasıl Hesaplarsınız?\nDoğum saatinizi, tarihinizi ve yerinizi bilmeniz gerekir. Astroloji panelimizde bu hesaplamayı otomatik yapabilirsiniz.\n\n♈ Koç Yükselen: Enerjik, cesur ve girişimci bir izlenim bırakırsınız.\n♉ Boğa Yükselen: Sakin, güvenilir ve zarif görünürsünüz.\n♊ İkizler Yükselen: Sosyal, meraklı ve iletişime açık birisiniz.\n♋ Yengeç Yükselen: Şefkatli, koruyucu ve sezgisel bir aura yayarsınız.\n♌ Aslan Yükselen: Karizmatik, güçlü ve dikkat çekici bir yapınız var.\n♍ Başak Yükselen: Düzenli, analitik ve mükemmeliyetçi bir izlenim bırakırsınız.\n♎ Terazi Yükselen: Diplomatik, zarif ve uyumlu görünürsünüz.\n♏ Akrep Yükselen: Gizemli, yoğun ve manyetik bir çekiciliğiniz var.\n♐ Yay Yükselen: İyimser, özgür ruhlu ve maceracı birisiniz.\n♑ Oğlak Yükselen: Ciddi, kararlı ve otoriter bir izlenim verirsiniz.\n♒ Kova Yükselen: Farklı, yenilikçi ve bağımsız bir yapınız var.\n♓ Balık Yükselen: Hayalperest, empatik ve sanatsal bir ruhunuz var.\n\n💡 İpucu: Astroloji Panelimizde doğum bilgilerinizi girerek yükselen burcunuzu ve detaylı analizinizi görebilirsiniz!`,
      category: 'astroloji-rehberi',
      keywords: ['yükselen burç', 'astroloji', 'doğum haritası', 'rehber'],
    },
    {
      slug: 'astroloji-rehberi-ay-burclari',
      titleTr: 'Ay Burcunuz ve Duygusal Dünyanız',
      descTr: 'Ay burcunuz duygusal ihtiyaçlarınızı, içgüdülerinizi ve bilinçaltınızı yansıtır. Her ay burcunun özellikleri bu yazıda.',
      contentTr: `🌙 Ay Burcunuz ve Duygusal Dünyanız\n\nAy burcunuz, astrolojide en kişisel gezegen konumudur. Duygusal ihtiyaçlarınızı, içgüdülerinizi ve bilinçaltınızı temsil eder.\n\nAy burcunuzu bilmek, kendinizi daha iyi anlamanız için çok önemlidir.\n\n🔥 Ateş Grubu (Koç, Aslan, Yay):\nDuygularınız yoğun ve tutkulu. Heyecan arar, kolayca sıkılırsınız.\n\n🌍 Toprak Grubu (Boğa, Başak, Oğlak):\nDuygusal güvenlik arayışındasınız. Rutinler ve stabilite sizi rahatlatır.\n\n💨 Hava Grubu (İkizler, Terazi, Kova):\nDuygularınızı düşüncelerinizle ifade edersiniz. İletişim ve entelektüel bağ önemli.\n\n💧 Su Grubu (Yengeç, Akrep, Balık):\nDerinden hissedersiniz. Sezgileriniz güçlüdür, empati yeteneğiniz yüksektir.\n\n💡 Burç Uyumu sayfamızda Ay burcunuzla partnerinizin uyumunu detaylıca analiz edebilirsiniz!`,
      category: 'astroloji-rehberi',
      keywords: ['ay burcu', 'astroloji', 'duygusal dünya', 'burç analizi'],
    },
  ]
  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        titleTr: post.titleTr,
        descTr: post.descTr,
        contentTr: post.contentTr,
        category: post.category,
        keywords: post.keywords,
        isPublished: true,
      },
      create: {
        slug: post.slug,
        titleTr: post.titleTr,
        titleEn: '',
        descTr: post.descTr,
        descEn: '',
        contentTr: post.contentTr,
        contentEn: '',
        category: post.category,
        keywords: post.keywords,
        isPublished: true,
      },
    })
  }
  console.log('Blog posts seeded')

  // ===== Dream Contest =====
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  await prisma.dreamContest.upsert({
    where: { id: 'default-weekly-contest' },
    update: {
      title: 'Haftanın Rüya Yarışması',
      description: 'Bu haftanın teması: Uçmak! Uçma rüyanızı en yaratıcı şekilde yorumlayın ve topluluk oylarıyla birinci olun.',
      dreamPrompt: 'Rüyamda gökyüzünde kuşlar gibi süzülüyordum. Aşağıda şehir ışıkları parlıyordu ve bulutların arasından geçerken tüyler gibi hafif hissettim. Birden bir kartal yanıma geldi ve birlikte uçmaya başladık...',
      startDate: now,
      endDate: weekEnd,
      isActive: true,
    },
    create: {
      id: 'default-weekly-contest',
      title: 'Haftanın Rüya Yarışması',
      description: 'Bu haftanın teması: Uçmak! Uçma rüyanızı en yaratıcı şekilde yorumlayın ve topluluk oylarıyla birinci olun.',
      dreamPrompt: 'Rüyamda gökyüzünde kuşlar gibi süzülüyordum. Aşağıda şehir ışıkları parlıyordu ve bulutların arasından geçerken tüyler gibi hafif hissettim. Birden bir kartal yanıma geldi ve birlikte uçmaya başladık...',
      startDate: now,
      endDate: weekEnd,
      isActive: true,
    },
  })
  console.log('Dream contest seeded')

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