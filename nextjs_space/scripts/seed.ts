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

  // Create system "CanlıFal User" account for guest fortune social posts
  const systemPassword = await bcrypt.hash('canlifal-system-2024!', 10)
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@canlifal.com' },
    update: {
      name: 'CanlıFal User',
    },
    create: {
      email: 'system@canlifal.com',
      password: systemPassword,
      name: 'CanlıFal User',
      preferredLanguage: 'tr',
      credits: 0,
      role: 'user',
    },
  })
  console.log('System user created:', systemUser.email)

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
    { languageCode: 'tr', translationKey: 'chat.title', translationValue: 'Sesli Sohbet Odaları' },
    { languageCode: 'tr', translationKey: 'chat.subtitle', translationValue: 'Mistik bilgelik arayanlarla bağlantı kurun' },
    { languageCode: 'tr', translationKey: 'chat.online', translationValue: 'çevrimiçi' },
    { languageCode: 'tr', translationKey: 'chat.send', translationValue: 'Gönder' },
    { languageCode: 'tr', translationKey: 'chat.placeholder', translationValue: 'Mesajınızı yazın...' },
    { languageCode: 'tr', translationKey: 'chat.join', translationValue: 'Odaya Katıl' },
    { languageCode: 'tr', translationKey: 'chat.active_users', translationValue: 'Aktif Kullanıcılar' },
    { languageCode: 'tr', translationKey: 'chat.no_messages', translationValue: 'Henüz mesaj yok. İlk merhaba diyen siz olun!' },
    { languageCode: 'tr', translationKey: 'chat.login_required', translationValue: 'Sohbete katılmak için lütfen giriş yapın' },
  ]

  // Seed Gift Types - all use transparent PNG images
  const giftTypes = [
    { id: 'canlifal_1', name: 'CanlıFal', nameEn: 'LiveFortune', icon: '/gifts/cfc-coin.png', animation: 'coin_single', price: 1, sortOrder: 1 },
    { id: 'canlifal_5', name: '5 CFC', nameEn: '5 CFC', icon: '/gifts/cfc-coin.png', animation: 'coin_spread_5', price: 5, sortOrder: 2 },
    { id: 'canlifal_10', name: '10 CFC', nameEn: '10 CFC', icon: '/gifts/cfc-coin.png', animation: 'coin_spread_10', price: 10, sortOrder: 3 },
    { id: 'gul', name: 'Gül', nameEn: 'Rose', icon: '/gifts/gul.png', animation: 'sparkle_burst', price: 20, sortOrder: 4 },
    { id: 'kalp', name: 'Kalp', nameEn: 'Heart', icon: '/gifts/kalp.png', animation: 'heart_rain', price: 50, sortOrder: 5 },
    { id: 'yildiz', name: 'Yıldız', nameEn: 'Star', icon: '/gifts/yildiz.png', animation: 'star_burst', price: 100, sortOrder: 6 },
    { id: 'tac', name: 'Taç', nameEn: 'Crown', icon: '/gifts/tac.png', animation: 'sparkle_burst', price: 200, sortOrder: 7 },
    { id: 'elmas', name: 'Elmas', nameEn: 'Diamond', icon: '/gifts/elmas.png', animation: 'sparkle_burst', price: 500, sortOrder: 8 },
    { id: 'kristal', name: 'Kristal Küre', nameEn: 'Crystal Ball', icon: '/gifts/kristal.png', animation: 'sparkle_burst', price: 750, sortOrder: 9 },
    { id: 'aslan', name: 'Aslan', nameEn: 'Lion', icon: '/gifts/aslan.png', animation: 'sparkle_burst', price: 800, sortOrder: 10 },
    { id: 'roket', name: 'Roket', nameEn: 'Rocket', icon: '/gifts/roket.png', animation: 'sparkle_burst', price: 900, sortOrder: 11 },
    { id: 'galaksi', name: 'Galaksi', nameEn: 'Galaxy', icon: '/gifts/galaksi.png', animation: 'sparkle_burst', price: 950, sortOrder: 12 },
    { id: 'kahve', name: 'Kahve', nameEn: 'Coffee', icon: '/gifts/kahve.png', animation: 'coffee_pour', price: 1000, sortOrder: 13 },
  ]
  for (const g of giftTypes) {
    await prisma.giftType.upsert({ where: { id: g.id }, create: { ...g, isActive: true }, update: { ...g, isActive: true } })
  }
  console.log('Gift types seeded')

  // Seed Chat Rooms
  // Chat rooms are managed via admin panel - no seed needed
  console.log('Chat rooms managed via admin panel')

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
    { slug: 'game-2048', title: '2048', description: 'Karoları kaydır, birleştir ve 2048\'e ulaş!', icon: '🧮', sortOrder: 8, minReward: 10, maxReward: 80, entryFee: 0 },
    { slug: 'mayin-tarlasi', title: 'Mayın Tarlası', description: 'Mayınları bulmadan tüm kareleri aç!', icon: '💣', sortOrder: 9, minReward: 15, maxReward: 100, entryFee: 0 },
    { slug: 'sudoku', title: 'Sudoku', description: '9x9 bulmacayı doğru sayılarla doldur!', icon: '🧩', sortOrder: 10, minReward: 20, maxReward: 100, entryFee: 0 },
    { slug: 'hafiza-eslestirme', title: 'Hafıza Eşleştirme', description: 'Kartları çevir ve eşlerini bul! Farklı temalar ve boyutlar.', icon: '🧠', sortOrder: 11, minReward: 10, maxReward: 70, entryFee: 0 },
    { slug: 'adam-asmaca', title: 'Adam Asmaca', description: 'Harf harf tahmin et, kelimeyi bul!', icon: '📝', sortOrder: 12, minReward: 10, maxReward: 60, entryFee: 0 },
    { slug: 'slot', title: 'Slot Makinesi', description: 'Çevir ve kazan! Şansını dene!', icon: '🎰', sortOrder: 13, minReward: 5, maxReward: 100, entryFee: 0 },
    { slug: 'carkifelek', title: 'Çarkıfelek', description: 'Çarkı çevir, ödülünü kap!', icon: '🎡', sortOrder: 14, minReward: 5, maxReward: 100, entryFee: 0 },
    { slug: 'kazi-kazan', title: 'Kazı Kazan', description: 'Kartı kazı, sürprizi gör!', icon: '🪙', sortOrder: 15, minReward: 5, maxReward: 80, entryFee: 0 },
    { slug: 'kelime-bulmaca', title: 'Kelime Bulmaca', description: 'Harfleri birleştir, kelimeyi bul!', icon: '🔤', sortOrder: 16, minReward: 10, maxReward: 70, entryFee: 0 },
    { slug: 'anagram', title: 'Anagram', description: 'Karışık harflerden anlamlı kelime yap!', icon: '🔠', sortOrder: 17, minReward: 10, maxReward: 60, entryFee: 0 },
    { slug: 'mastermind', title: 'Mastermind', description: '4 renkli gizli kodu çöz!', icon: '🧠', sortOrder: 18, minReward: 10, maxReward: 80, entryFee: 0 },
    { slug: 'quiz', title: 'Bilgi Yarışması', description: 'Genel kültür sorularını yanıtla!', icon: '🧪', sortOrder: 19, minReward: 10, maxReward: 100, entryFee: 0 },
    { slug: 'renk-siralama', title: 'Renk Sıralama', description: 'Tüplerdeki renkleri sırala!', icon: '🎨', sortOrder: 20, minReward: 10, maxReward: 70, entryFee: 0 },
    { slug: 'logo-tahmin', title: 'Logo Tahmin', description: 'İpuçlarından markayı bul!', icon: '🏷️', sortOrder: 21, minReward: 10, maxReward: 80, entryFee: 0 },
    { slug: 'kelime-avi', title: 'Kelime Avı', description: 'Gizli kelimeleri bul!', icon: '🔍', sortOrder: 22, minReward: 15, maxReward: 70, entryFee: 0 },
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
    { name: 'Araba', letter: 'A', meaning: 'Hayattaki yolculuğu ve ilerlemeyi simgeler.', detailedMeaning: 'Rüyada araba görmek, kişinin hayatındaki kontrolü ve yönü temsil eder. Araba kullanmak, kendi kaderini belirleyebilme gücünü; yolcu olmak ise başkalarının etkisinde kalmayı ifade eder.' },
    { name: 'Ağlamak', letter: 'A', meaning: 'Duygusal arınma ve rahatlama anlamına gelir.', detailedMeaning: 'Rüyada ağlamak genellikle olumlu yorumlanır. Birikmiş duyguların dışa vurumu ve iç huzura kavuşma belirtisidir.' },
    { name: 'Altın', letter: 'A', meaning: 'Bolluk, zenginlik ve değerli olanı simgeler.', detailedMeaning: 'Rüyada altın görmek, maddi veya manevi zenginliğin habercisidir. Altın bulmak şansı, kaybetmek ise fırsatı kaçırmayı ifade eder.' },
    { name: 'Bebek', letter: 'B', meaning: 'Yeni başlangıçlar, masumiyet ve potansiyeli temsil eder.', detailedMeaning: 'Rüyada bebek görmek, yeni bir proje, fikir veya yaşam evresinin başlangıcına işaret eder. Ağlayan bebek dikkat gerektiren bir durumu ifade eder.' },
    { name: 'Balık', letter: 'B', meaning: 'Bereket, bolluk ve bilinçaltını simgeler.', detailedMeaning: 'Rüyada balık görmek genellikle rızık ve bereketin müjdecisidir. Balık tutmak başarıyı, suda yüzen balık ise özgürlüğü temsil eder.' },
    { name: 'Cami', letter: 'C', meaning: 'Manevi arınma, huzur ve yol göstericilik.', detailedMeaning: 'Rüyada cami görmek, manevi bir yolculuğa çıkmayı veya iç huzur arayışını simgeler. Camide namaz kılmak, dualara kavuşmayı ifade eder.' },
    { name: 'Çiçek', letter: 'Ç', meaning: 'Güzellik, sevgi ve yaşamın kısa süreliliği.', detailedMeaning: 'Rüyada çiçek görmek, mutluluk ve güzel haberlerin müjdecisidir. Solmuş çiçekler ise hayal kırıklığı veya geçici bir üzüntüyü ifade eder.' },
    { name: 'Deniz', letter: 'D', meaning: 'Bilinçaltı, duygusal derinlik ve sınırsızlık.', detailedMeaning: 'Rüyada deniz görmek, kişinin duygusal dünyasını yansıtır. Sakin deniz huzuru, fırtınalı deniz ise içsel çalkantıları simgeler.' },
    { name: 'Düşmek', letter: 'D', meaning: 'Kontrol kaybı, güvensizlik veya yeni bir başlangıç.', detailedMeaning: 'Rüyada düşmek, hayattaki belirsizliklere karşı duyulan kaygıyı temsil eder. Uçurumdan düşmek büyük değişimlere, yere düşmek ise hayal kırıklığına işaret edebilir.' },
    { name: 'Ev', letter: 'E', meaning: 'Benlik, güvenlik ve aile bağlarını simgeler.', detailedMeaning: 'Rüyada ev görmek, kişinin iç dünyasını ve güvenlik arayışını temsil eder. Yeni ev taşınmak değişimi, yıkık ev ise geçmişte bırakılmamış konuları ifade eder.' },
    { name: 'Fare', letter: 'F', meaning: 'Küçük endişeler, gizli düşmanlar ve detaylar.', detailedMeaning: 'Rüyada fare görmek, küçük ama rahatsız edici sorunlara dikkat çeker. Beyaz fare iyi haber, siyah fare ise kötü niyetli birine işaret edebilir.' },
    { name: 'Göl', letter: 'G', meaning: 'Dinginlik, iç gözlem ve duygusal denge.', detailedMeaning: 'Rüyada göl görmek, sakin ve derin duyguları temsil eder. Berrak göl net bir zihni, bulanık göl ise kafa karışıklığını ifade eder.' },
    { name: 'Güneş', letter: 'G', meaning: 'Enerji, başarı, aydınlanma ve umut.', detailedMeaning: 'Rüyada güneş görmek, hayatınıza ışık ve pozitif enerji geleceğini müjdeler. Doğan güneş yeni fırsatları, batan güneş ise bir dönemin kapanışını simgeler.' },
    { name: 'Gül', letter: 'G', meaning: 'Aşk, tutku ve güzellik.', detailedMeaning: 'Rüyada gül görmek, romantik duyguların ve güzel ilişkilerin habercisidir. Kırmızı gül tutkuyu, beyaz gül saflığı simgeler.' },
    { name: 'Hastane', letter: 'H', meaning: 'İyileşme, yardım arayışı ve şifaya kavuşma.', detailedMeaning: 'Rüyada hastane görmek, fiziksel veya ruhsal iyileşme sürecini temsil eder. Genellikle yardım ihtiyacını veya birinin size destek olacağını ifade eder.' },
    { name: 'İnek', letter: 'İ', meaning: 'Bereket, annelik ve bolluk.', detailedMeaning: 'Rüyada inek görmek, maddi bolluk ve bereketin simgesidir. Süt veren inek rızık ve bereket, zayıf inek ise kıtlık uyarısıdır.' },
    { name: 'Kahve', letter: 'K', meaning: 'Sosyal bağlar, sezgi ve haber alma.', detailedMeaning: 'Rüyada kahve görmek, yakın çevreden gelecek haberlere işaret eder. Kahve içmek sohbet ve dostluğu, kahve falı ise geleceğe dair merakı simgeler.' },
    { name: 'Kedi', letter: 'K', meaning: 'Bağımsızlık, gizemcilik ve kadınsı enerji.', detailedMeaning: 'Rüyada kedi görmek, sezgilerin güçlenmesini ve bağımsızlık arzusunu simgeler. Siyah kedi şansı veya şanssızlığı, beyaz kedi ise maneviyatı temsil eder.' },
    { name: 'Köpek', letter: 'K', meaning: 'Sadakat, dostluk ve koruma.', detailedMeaning: 'Rüyada köpek görmek, sadık bir dost veya koruyucu bir kişiyi temsil eder. Havlayan köpek uyarıyı, sevimli köpek ise mutluluğu simgeler.' },
    { name: 'Merdiven', letter: 'M', meaning: 'Yükselme, ilerleme veya gerileme.', detailedMeaning: 'Rüyada merdiven çıkmak, kariyer veya manevi yükselmeyi simgeler. Merdiven inmek ise geçmişe dönmek veya bilinçaltına inmek anlamına gelir.' },
    { name: 'Nehir', letter: 'N', meaning: 'Yaşam akışı, zaman ve değişim.', detailedMeaning: 'Rüyada nehir görmek, yaşamın doğal akışını temsil eder. Berrak akan nehir huzuru, taşkın nehir ise kontrol dışı duyguları simgeler.' },
    { name: 'Okul', letter: 'O', meaning: 'Öğrenme, gelişim ve geçmiş deneyimler.', detailedMeaning: 'Rüyada okul görmek, hayattan öğrenilecek dersler olduğunu gösterir. Sınav görmek kaygıyı, mezuniyet ise başarıyı simgeler.' },
    { name: 'Ölüm', letter: 'Ö', meaning: 'Dönüşüm, son ve yeni başlangıç.', detailedMeaning: 'Rüyada ölüm görmek genellikle olumsuz değildir. Bir dönemin sona ermesini ve yeni bir başlangıcın yakınlaştığını simgeler.' },
    { name: 'Para', letter: 'P', meaning: 'Değer, özgüven ve maddi konular.', detailedMeaning: 'Rüyada para görmek, kişinin öz değerini ve maddi durumunu yansıtır. Para bulmak fırsatı, kaybetmek ise kaygıyı temsil eder.' },
    { name: 'Rüzgar', letter: 'R', meaning: 'Değişim, özgürlük ve görünmeyen güçler.', detailedMeaning: 'Rüyada rüzgar görmek, hayatınızdaki değişim rüzgarlarını simgeler. Hafif rüzgar olumlu değişimi, fırtına ise zorlukları ifade eder.' },
    { name: 'Su', letter: 'S', meaning: 'Duygular, arınma ve yaşam enerjisi.', detailedMeaning: 'Rüyada su görmek, duygusal dünyanızın aynasıdır. Temiz su arınmayı, bulanık su kafa karışıklığını, akan su ise yaşam enerjisini simgeler.' },
    { name: 'Yılan', letter: 'Y', meaning: 'Dönüşüm, şifa, gizli tehlike veya bilgelik.', detailedMeaning: 'Rüyada yılan görmek çok katmanlı bir semboldür. Yılanın derisi değiştirmesi dönüşümü, ısırması uyarıyı, sakin yılan ise bilgeliği simgeler.' },
    { name: 'Yüzük', letter: 'Y', meaning: 'Bağlılık, söz ve birliktelik.', detailedMeaning: 'Rüyada yüzük görmek, bağlılık ve söz verme ile ilgilidir. Yüzük takmak birliktelik vaadini, kaybetmek ise bir bağın zayıflamasını ifade eder.' },
    { name: 'Uçak', letter: 'U', meaning: 'Yüksek hedefler, özgürlük ve yolculuk.', detailedMeaning: 'Rüyada uçak görmek, büyük hedeflere ulaşma arzusunu simgeler. Uçakta olmak yeni ufuklara açılmayı, uçağın düşmesi ise kaygıları temsil eder.' },
    { name: 'Üşümek', letter: 'Ü', meaning: 'Yalnızlık, duygusal uzaklık ve ihtiyaç.', detailedMeaning: 'Rüyada üşümek, duygusal olarak desteklenmemiş hissetmeyi veya yalnızlığı simgeler. Sıcaklığa kavuşmak ise teselli bulmayı ifade eder.' },
    { name: 'Volkan', letter: 'V', meaning: 'Bastırılmış duygular, öfke ve ani patlamalar.', detailedMeaning: 'Rüyada volkan görmek, içinizde biriken duyguların patlama noktasına geldiğini simgeler. Patlayan volkan kontrol kaybını, sönmüş volkan ise geçmiş öfkeyi temsil eder.' },
    { name: 'Zil', letter: 'Z', meaning: 'Uyarı, haber ve farkındalık.', detailedMeaning: 'Rüyada zil sesi duymak, dikkat etmeniz gereken önemli bir mesaj veya uyarı olduğunu simgeler. Kapı zili misafir haberini ifade eder.' },
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
    { slug: 'teknoloji', nameTr: 'Teknoloji', nameEn: 'Technology', descTr: 'Yapay zeka, yazılım ve teknoloji dünyasından en güncel haberler ve analizler', icon: 'Cpu', color: '#3B82F6', sortOrder: 1 },
    { slug: 'saglik-fitness', nameTr: 'Sağlık & Fitness', nameEn: 'Health & Fitness', descTr: 'Sağlıklı yaşam, beslenme ve fitness rehberleri', icon: 'Heart', color: '#EF4444', sortOrder: 2 },
    { slug: 'moda-guzellik', nameTr: 'Moda & Güzellik', nameEn: 'Fashion & Beauty', descTr: 'Moda trendleri, güzellik ipuçları ve stil rehberleri', icon: 'Sparkles', color: '#EC4899', sortOrder: 3 },
    { slug: 'yemek-tarifleri', nameTr: 'Yemek Tarifleri', nameEn: 'Recipes', descTr: 'Lezzetli ve kolay yemek tarifleri, mutfak sırları', icon: 'UtensilsCrossed', color: '#F97316', sortOrder: 4 },
    { slug: 'seyahat-gezi', nameTr: 'Seyahat / Gezi', nameEn: 'Travel', descTr: 'Gezi rehberleri, seyahat ipuçları ve keşfedilecek yerler', icon: 'Plane', color: '#06B6D4', sortOrder: 5 },
    { slug: 'para-kazanma', nameTr: 'Para Kazanma & İş Fikirleri', nameEn: 'Money & Business', descTr: 'Ek gelir kaynakları, iş fikirleri ve finansal özgürlük rehberleri', icon: 'TrendingUp', color: '#22C55E', sortOrder: 6 },
    { slug: 'egitim-ders-notlari', nameTr: 'Eğitim & Ders Notları', nameEn: 'Education', descTr: 'Eğitim kaynakları, ders notları ve kişisel gelişim', icon: 'GraduationCap', color: '#6366F1', sortOrder: 7 },
    { slug: 'iliskiler-psikoloji', nameTr: 'İlişkiler & Psikoloji', nameEn: 'Relationships & Psychology', descTr: 'İlişki tavsiyeleri, psikoloji ve kişisel gelişim yazıları', icon: 'HeartHandshake', color: '#D946EF', sortOrder: 8 },
    { slug: 'anne-cocuk', nameTr: 'Anne & Çocuk', nameEn: 'Parenting', descTr: 'Anne-çocuk sağlığı, ebeveynlik ipuçları ve çocuk gelişimi', icon: 'Baby', color: '#F472B6', sortOrder: 9 },
    { slug: 'oyun-gaming', nameTr: 'Oyun (Gaming)', nameEn: 'Gaming', descTr: 'Oyun incelemeleri, gaming haberleri ve oyun dünyası', icon: 'Gamepad2', color: '#8B5CF6', sortOrder: 10 },
    { slug: 'film-dizi-kitap', nameTr: 'Film / Dizi / Kitap', nameEn: 'Movies & Books', descTr: 'Film, dizi ve kitap incelemeleri, önerileri', icon: 'Clapperboard', color: '#EAB308', sortOrder: 11 },
    { slug: 'haftanin-burcu', nameTr: 'Haftanın Burcu', nameEn: 'Weekly Zodiac', descTr: 'Haftalık burç yorumları ve astroloji tahminleri', icon: 'Star', color: '#A855F7', sortOrder: 12 },
    { slug: 'astroloji-rehberi', nameTr: 'Astroloji Rehberi', nameEn: 'Astrology Guide', descTr: 'Astroloji dünyasını keşfedin: burçlar, gezegenler ve daha fazlası', icon: 'Moon', color: '#7C3AED', sortOrder: 13 },
  ]
  for (const cat of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: { nameTr: cat.nameTr, sortOrder: cat.sortOrder, descTr: cat.descTr, icon: cat.icon, color: cat.color },
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

  // Seed Online Fal Sections
  const onlineFalSections = [
    { key: 'fortune_types', title: 'Fal Türleri', icon: '🔮', sortOrder: 0 },
    { key: 'bana_ozel', title: 'Bana Özel', icon: '✨', sortOrder: 1 },
    { key: 'custom_buttons', title: 'Hızlı Erişim', icon: '🚀', sortOrder: 2 },
  ]
  for (const s of onlineFalSections) {
    await prisma.onlineFalSection.upsert({
      where: { key: s.key },
      update: { title: s.title, icon: s.icon, sortOrder: s.sortOrder },
      create: s,
    })
  }
  console.log('Online fal sections seeded')

  // Seed Homepage Buttons
  const homepageButtons = [
    { key: 'games', label: 'Oyunlar', icon: '🎮', href: '/oyunlar', sortOrder: 0 },
    { key: 'gifts', label: 'Hediyeler', icon: '🎁', href: '/hediyeler', sortOrder: 1 },
    { key: 'teller', label: 'Yayıncı Ol', icon: '📹', href: '/yayinci-ol', sortOrder: 2, specialBehavior: 'teller' },
    { key: 'social', label: 'Sosyal', icon: '👥', href: '/sosyal', sortOrder: 3 },
    { key: 'chat', label: 'Sesli Sohbet', icon: '🎙️', href: '/sohbet', sortOrder: 4 },
    { key: 'blog', label: 'Blog', icon: '📖', href: '/blog', sortOrder: 5 },
    { key: 'ruya', label: 'Rüya Tabiri', icon: '🌙', href: '/ruya', sortOrder: 6 },
    { key: 'bana-ozel', label: 'Bana Özel', icon: '✨', href: '/bana-ozel', sortOrder: 7, specialBehavior: 'bana-ozel' },
    { key: 'sorbak', label: 'Soru&Cevap', icon: '❓', href: '/sorbak', sortOrder: 8 },
    { key: 'ajans', label: 'Ajans Ol', icon: '🏢', href: '/ajans', sortOrder: 9, specialBehavior: 'ajans' },
  ]
  for (const btn of homepageButtons) {
    await prisma.homepageButton.upsert({
      where: { key: btn.key },
      update: { label: btn.label, icon: btn.icon, href: btn.href, sortOrder: btn.sortOrder, specialBehavior: btn.specialBehavior || null },
      create: { ...btn, specialBehavior: btn.specialBehavior || null },
    })
  }
  console.log('Homepage buttons seeded')

  // Seed live session duration options
  await prisma.platformSettings.upsert({
    where: { key: 'live_session_durations' },
    update: {},
    create: { key: 'live_session_durations', value: JSON.stringify([5, 10, 15, 20, 25, 30]), description: 'Canlı fal süre seçenekleri (dakika)' }
  })
  console.log('Live session durations seeded')

  // Seed homepage fortune cards
  const fortuneCards = [
    { name: 'Kahve Falı', icon: '☕', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali', sortOrder: 0 },
    { name: 'Tarot Falı', icon: '🃏', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali', sortOrder: 1 },
    { name: 'El Falı', icon: '🤚', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali', sortOrder: 2 },
    { name: 'Rüya Tabiri', icon: '🌙', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu', sortOrder: 3 },
    { name: 'Aşk Uyumu', icon: '❤️', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu', sortOrder: 4 },
    { name: 'Günlük Burç', icon: '⭐', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu', sortOrder: 5 },
    { name: 'Numeroloji', icon: '🔢', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji', sortOrder: 6 },
    { name: 'Melek Kartları', icon: '👼', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari', sortOrder: 7 },
    { name: 'Aura Okuma', icon: '💫', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi', sortOrder: 8 },
    { name: 'Doğum Haritası', icon: '🌟', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi', sortOrder: 9 },
    { name: 'Katina Falı', icon: '🎴', image: '/fortunes/katina.jpg', href: '/fallar/katina', sortOrder: 10 },
    { name: 'Evet/Hayır', icon: '🔮', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir', sortOrder: 11 },
    { name: 'Kurşun Dökme', icon: '🕯️', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme', sortOrder: 12 },
    { name: 'İstihare', icon: '📿', image: '/fortunes/angel.jpg', href: '/fallar/istihare', sortOrder: 13 },
  ]
  for (const card of fortuneCards) {
    const existing = await prisma.homepageFortuneCard.findFirst({ where: { name: card.name } })
    if (!existing) {
      await prisma.homepageFortuneCard.create({ data: card })
    }
  }
  console.log('Homepage fortune cards seeded')

  // === SITE PAGES: Privacy Policy & Terms ===
  console.log('Seeding site pages...')

  await prisma.sitePage.upsert({
    where: { slug: 'gizlilik-politikasi' },
    update: {},
    create: {
      title: 'Gizlilik Politikası',
      slug: 'gizlilik-politikasi',
      content: `<h2>Gizlilik Politikası</h2>
<p><strong>Son güncelleme:</strong> 22 Mart 2026</p>
<p>CanliFal.com olarak kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu gizlilik politikası, hizmetlerimizi kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.</p>

<h3>1. Toplanan Bilgiler</h3>
<p>Hizmetlerimizi kullanırken aşağıdaki bilgiler toplanabilir:</p>
<ul>
<li><strong>Hesap Bilgileri:</strong> Ad, e-posta adresi, kullanıcı adı, doğum tarihi, burç bilgisi</li>
<li><strong>Profil Bilgileri:</strong> Profil fotoğrafı, biyografi ve iletişim tercihleri</li>
<li><strong>Kullanım Verileri:</strong> Sayfa görüntülemeleri, tıklamalar, oturum süreleri</li>
<li><strong>Ödeme Bilgileri:</strong> Jeton satın alma işlemlerinde gerekli ödeme verileri (kredi kartı bilgileri tarafımızda saklanmaz)</li>
<li><strong>Cihaz Bilgileri:</strong> IP adresi, tarayıcı türü, cihaz bilgileri</li>
</ul>

<h3>2. Bilgilerin Kullanımı</h3>
<p>Toplanan bilgiler şu amaçlarla kullanılır:</p>
<ul>
<li>Hesabınızın oluşturulması ve yönetimi</li>
<li>Fal, rüya yorumu ve astroloji hizmetlerinin sunulması</li>
<li>Canlı fal seanslarının gerçekleştirilmesi</li>
<li>Kullanıcı deneyiminin iyileştirilmesi</li>
<li>Bildirim ve iletişim gönderimi</li>
<li>Güvenlik ve dolandırıcılık önleme</li>
</ul>

<h3>3. Bilgi Paylaşımı</h3>
<p>Kişisel bilgileriniz üçüncü taraflarla <strong>satılmaz</strong>. Yalnızca şu durumlarda paylaşılabilir:</p>
<ul>
<li>Yasal zorunluluklar gereği</li>
<li>Hizmet sağlayıcılarımız ile (ödeme işlemleri, e-posta gönderimi)</li>
<li>Açık onayınız doğrultusunda</li>
</ul>

<h3>4. Çerezler (Cookies)</h3>
<p>Sitemiz, oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.</p>

<h3>5. Veri Güvenliği</h3>
<p>Verileriniz şifreleme ve güvenli protokoller (SSL/TLS) ile korunmaktadır. Ancak internet üzerinden yapılan hiçbir iletimin %100 güvenli olmadığını hatırlatırız.</p>

<h3>6. Kullanıcı Hakları</h3>
<p>KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) kapsamında:</p>
<ul>
<li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
<li>Verilerinizin düzeltilmesini veya silinmesini talep etme</li>
<li>Verilerinizin aktarıldığı üçüncü kişileri öğrenme</li>
<li>Verilerinizin işlenmesine itiraz etme hakkına sahipsiniz</li>
</ul>

<h3>7. İletişim</h3>
<p>Gizlilik politikamız ile ilgili sorularınız için <strong>İletişim</strong> sayfamızdan bize ulaşabilirsiniz.</p>`,
      isPublished: true,
      showInFooter: true,
      showInHeader: false,
      sortOrder: 100,
    }
  })

  await prisma.sitePage.upsert({
    where: { slug: 'kullanim-sartlari' },
    update: {},
    create: {
      title: 'Kullanım Şartları',
      slug: 'kullanim-sartlari',
      content: `<h2>Kullanım Şartları</h2>
<p><strong>Son güncelleme:</strong> 22 Mart 2026</p>
<p>CanliFal.com hizmetlerini kullanarak aşağıdaki şartları kabul etmiş sayılırsınız. Lütfen bu şartları dikkatle okuyunuz.</p>

<h3>1. Hizmet Tanımı</h3>
<p>CanliFal.com; online fal bakma, rüya yorumlama, astroloji, canlı falcı seansları ve ilgili eğlence hizmetleri sunan bir platformdur. Sunulan tüm hizmetler <strong>eğlence amaçlıdır</strong> ve profesyonel danışmanlık yerine geçmez.</p>

<h3>2. Üyelik Koşulları</h3>
<ul>
<li>Üye olmak için 18 yaşından büyük olmanız gerekmektedir</li>
<li>Kayıt sırasında doğru ve güncel bilgiler vermeniz zorunludur</li>
<li>Hesap güvenliğinden siz sorumlusunuz; şifrenizi kimseyle paylaşmayın</li>
<li>Her kullanıcının yalnızca bir hesabı olabilir</li>
</ul>

<h3>3. Jeton Sistemi ve Ödemeler</h3>
<ul>
<li>Platform içi hizmetler jeton (CFC) ile satın alınır</li>
<li>Satın alınan jetonlar <strong>iade edilmez</strong> (yasal zorunluluklar hariç)</li>
<li>Jeton fiyatları önceden bildirilmeksizin değiştirilebilir</li>
<li>Kullanılmayan jetonların süresi dolmaz</li>
</ul>

<h3>4. Kullanıcı Davranış Kuralları</h3>
<p>Platformumuzda aşağıdaki davranışlar <strong>kesinlikle yasaktır:</strong></p>
<ul>
<li>Hakaret, küfür, tehdit veya taciz içerikli mesajlar</li>
<li>Uygunsuz, müstehcen veya yasadışı içerik paylaşımı</li>
<li>Diğer kullanıcıların kişisel bilgilerini izinsiz paylaşma</li>
<li>Sahte kimlik veya yanıltıcı profil bilgileri kullanma</li>
<li>Platform güvenliğini tehdit eden herhangi bir eylem</li>
<li>Spam, reklam veya ticari amaçlı istenmeyen mesajlar</li>
</ul>

<h3>5. Canlı Fal Seansları</h3>
<ul>
<li>Canlı falcılar bağımsız hizmet sağlayıcılardır</li>
<li>Seans süresince saygılı iletişim beklenmektedir</li>
<li>Teknik aksaklıklardan kaynaklanan kesintilerde jeton iadesi değerlendirilebilir</li>
<li>Seans içerikleri gizlidir ve kayıt altına alınmaz</li>
</ul>

<h3>6. Fikri Mülkiyet</h3>
<p>CanliFal.com üzerindeki tüm içerik, tasarım, logo ve yazılım fikri mülkiyet hakları saklıdır. İzinsiz kopyalama, dağıtma veya değiştirme yasaktır.</p>

<h3>7. Sorumluluk Sınırlaması</h3>
<ul>
<li>Platformda sunulan fal ve yorum hizmetleri eğlence amaçlıdır</li>
<li>Kullanıcıların bu hizmetlere dayanarak aldıkları kararlardan CanliFal.com sorumlu tutulamaz</li>
<li>Teknik aksaklıklar ve kesintiler için azami özen gösterilir ancak kesintisiz hizmet garanti edilmez</li>
</ul>

<h3>8. Hesap Askıya Alma ve Fesih</h3>
<p>Kullanım şartlarına aykırı davranan hesaplar uyarılabilir, geçici veya kalıcı olarak askıya alınabilir. Bu durumda mevcut jeton bakiyesi için iade yapılmaz.</p>

<h3>9. Değişiklikler</h3>
<p>Bu kullanım şartları önceden bildirilmeksizin güncellenebilir. Güncellemeler sitede yayınlandığı anda yürürlüğe girer.</p>

<h3>10. İletişim</h3>
<p>Kullanım şartları hakkında sorularınız için <strong>İletişim</strong> sayfamızdan bize ulaşabilirsiniz.</p>`,
      isPublished: true,
      showInFooter: true,
      showInHeader: false,
      sortOrder: 101,
    }
  })


  await prisma.sitePage.upsert({
    where: { slug: 'cocuk-guvenligi-politikasi' },
    update: {},
    create: {
      title: 'Çocuk Güvenliği Politikası',
      slug: 'cocuk-guvenligi-politikasi',
      content: `<h1>Çocuk Güvenliği Politikası</h1>
<p><strong>Son güncelleme:</strong> 3 Ağustos 2026</p>
<p>CanlıFal.com olarak, çocukların çevrimiçi güvenliğini en yüksek öncelik olarak kabul ediyoruz. Bu politika, platformumuzun çocukların cinsel istismarı ve sömürüsüne (CSAE) karşı sıfır tolerans yaklaşımını, uygulanan güvenlik önlemlerini ve yasal yükümlülüklerimizi kapsamlı biçimde açıklar.</p>
<p>Bu politika Google Play, Apple App Store ve Türkiye Cumhuriyeti mevzuatı gereksinimlerine tam uyumludur.</p>

<h2>1. Platform Kapsamı ve Yaş Sınırı</h2>
<ul>
<li>CanlıFal.com yalnızca <strong>18 yaş ve üzeri</strong> yetişkin kullanıcılara yöneliktir.</li>
<li>18 yaşından küçüklerin platforma kayıt olması, hesap oluşturması ve platform hizmetlerini kullanması <strong>kesinlikle yasaktır.</strong></li>
<li>Kayıt sürecinde kullanıcılardan doğum tarihi bilgisi alınarak yaş doğrulaması yapılır.</li>
<li>Reşit olmayan bir kullanıcı tespit edildiğinde hesap <strong>derhal askıya alınır</strong> ve gerekli yasal bildirimler yapılır.</li>
<li>Platform, "Çocuklar için Tasarlanmış" (Kids Category) kapsamında değildir.</li>
</ul>

<h2>2. Çocuk Cinsel İstismarı ve Sömürüsüne (CSAE) Karşı Sıfır Tolerans</h2>
<p>Çocukların cinsel istismarını, sömürüsünü veya bunlara ilişkin materyalleri (CSAM) içeren, teşvik eden, normalleştiren veya kolaylaştıran <strong>her türlü içerik, davranış ve iletişime karşı sıfır tolerans</strong> uygulanır. Bu kapsamda:</p>
<ul>
<li><strong>Çocuk cinsel istismarı materyali (CSAM):</strong> Gerçek veya yapay zekâ ile oluşturulmuş her türlü görsel, video veya metin içerik yasaktır.</li>
<li><strong>Grooming (kandırma/hazırlama):</strong> Reşit olmayan bireyleri cinsel amaçlı iletişime çekme girişimleri yasaktır.</li>
<li><strong>Sextortion (cinsel şantaj):</strong> Reşit olmayan bireylere yönelik her türlü şantaj ve tehdit yasaktır.</li>
<li><strong>Çocuk kaçakçılığı:</strong> Reşit olmayan bireylerin ticaretine ilişkin her türlü içerik yasaktır.</li>
<li><strong>Çocuk istismarını normalleştirme:</strong> Çocuklara yönelik cinsel davranışları makul gösteren içerikler yasaktır.</li>
</ul>
<p>Bu tür içerikler tespit edildiğinde: (1) İçerik anında kaldırılır ve delil olarak saklanır, (2) İlgili hesap kalıcı olarak yasaklanır, (3) Yetkili makamlara derhal bildirilir, (4) Gerektiğinde NCMEC ve/veya ilgili bölgesel kuruluşlara rapor edilir.</p>

<h2>3. İçerik Denetimi ve Moderasyon</h2>
<ul>
<li><strong>Otomatik içerik tarama:</strong> Yüklenen görseller, videolar ve metin içerikler otomatik filtrelerle taranır.</li>
<li><strong>Manuel moderasyon:</strong> Eğitimli moderasyon ekibimiz tarafından canlı yayınlar, sohbet odaları ve kullanıcı etkileşimleri düzenli olarak denetlenir.</li>
<li><strong>Yapay zekâ destekli analiz:</strong> Şüpheli desen ve davranışların erken tespiti için makine öğrenimi tabanlı araçlar kullanılır.</li>
<li><strong>Proaktif tarama:</strong> Bilinen CSAM veritabanlarına (hash matching) karşı proaktif kontroller yapılır.</li>
</ul>

<h2>4. Uygulama İçi Bildirim ve Şikâyet Mekanizması</h2>
<ul>
<li><strong>"Şikâyet Et / Bildir" butonları:</strong> Her profil, canlı yayın, sohbet odası ve içerikte doğrudan raporlama seçeneği mevcuttur.</li>
<li><strong>Doğrudan e-posta:</strong> guvenlik@canlifal.com adresine her zaman ulaşabilirsiniz.</li>
<li><strong>Anonim bildirim:</strong> Anonim raporlar da kabul edilir.</li>
</ul>
<p>Tüm bildirimler gizli tutulur, 24 saat içinde değerlendirilir ve çocuk güvenliğine ilişkin bildirimlere en yüksek öncelik verilir.</p>

<h2>5. Yasal Uyum ve Kuruluş İş Birliği</h2>
<ul>
<li><strong>Türkiye:</strong> 5237 sayılı TCK, 5651 sayılı İnternet Kanunu, 6698 sayılı KVKK.</li>
<li><strong>Avrupa Birliği:</strong> GDPR çocuklara özel koruma hükümleri.</li>
<li><strong>ABD:</strong> COPPA ilkeleri.</li>
<li><strong>Google Play:</strong> Child Safety Standards politikası ve CSAE gereksinimleri.</li>
<li><strong>Apple App Store:</strong> App Review Guidelines çocuk güvenliği maddeleri.</li>
</ul>
<p>Onaylandığı CSAM vakaları ilgili makamlara derhal raporlanır.</p>

<h2>6. Sorumlu İletişim Noktası (Designated Point of Contact)</h2>
<ul>
<li><strong>E-posta:</strong> guvenlik@canlifal.com</li>
<li><strong>Yanıt süresi:</strong> Çocuk güvenliği bildirimleri en geç 24 saat içinde değerlendirilir.</li>
</ul>
<p>Bu kişi, Google Play'den gelen CSAE ile ilgili bildirimleri almaya ve gerekli aksiyonları almaya yetkilidir.</p>
<hr>
<p style="font-size:12px;color:#888;">Çocuk güvenliği hepimizin sorumluluğudur. Şüpheli bir durumla karşılaşırsanız lütfen derhal bildirin.</p>`,
      isPublished: true,
      showInFooter: true,
      showInHeader: false,
      sortOrder: 102,
    }
  })

  await prisma.sitePage.upsert({
    where: { slug: 'kvkk' },
    update: {},
    create: {
      title: 'KVKK',
      slug: 'kvkk',
      content: `<h2>KVKK Aydınlatma Metni</h2>
<p><strong>Son güncelleme:</strong> 3 Ağustos 2026</p>
<p>Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, CanliFal.com tarafından kişisel verilerinizin işlenmesine ilişkin olarak sizleri bilgilendirmek amacıyla hazırlanmıştır.</p>

<h3>1. Veri Sorumlusu</h3>
<p>KVKK uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla <strong>CanliFal.com</strong> tarafından aşağıda açıklanan kapsamda işlenmektedir.</p>

<h3>2. İşlenen Kişisel Veriler</h3>
<ul>
<li><strong>Kimlik Bilgileri:</strong> Ad, soyad, kullanıcı adı, doğum tarihi</li>
<li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası</li>
<li><strong>İşlem Bilgileri:</strong> Jeton satın alma ve kullanım kayıtları</li>
<li><strong>Kullanım Verileri:</strong> IP adresi, cihaz bilgileri, oturum kayıtları</li>
<li><strong>Profil Bilgileri:</strong> Profil fotoğrafı, biyografi, burç bilgisi</li>
</ul>

<h3>3. Kişisel Verilerin İşlenme Amaçları</h3>
<ul>
<li>Üyelik hesabının oluşturulması ve yönetimi</li>
<li>Fal, rüya yorumu, astroloji ve canlı seans hizmetlerinin sunulması</li>
<li>Ödeme ve jeton işlemlerinin gerçekleştirilmesi</li>
<li>Yasal yükümlülüklerin yerine getirilmesi</li>
<li>Güvenlik, dolandırıcılık önleme ve hizmet kalitesinin artırılması</li>
<li>İletişim ve bildirim faaliyetlerinin yürütülmesi</li>
</ul>

<h3>4. Kişisel Verilerin İşlenme Hukuki Sebepleri</h3>
<p>Kişisel verileriniz KVKK'nın 5. ve 6. maddelerinde belirtilen; sözleşmenin kurulması ve ifası, hukuki yükümlülüğün yerine getirilmesi, meşru menfaat ve açık rıza hukuki sebeplerine dayanılarak işlenmektedir.</p>

<h3>5. Kişisel Verilerin Aktarılması</h3>
<p>Kişisel verileriniz üçüncü taraflara <strong>satılmaz.</strong> Yalnızca; yasal zorunluluklar, hizmet sağlayıcılar (ödeme altyapısı, e-posta servisi) ve açık rızanız çerçevesinde, KVKK'ya uygun olarak aktarılabilir.</p>

<h3>6. Veri Saklama Süresi</h3>
<p>Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca ve yasal saklama süreleri kapsamında muhafaza edilir. Sürenin sonunda verileriniz silinir, yok edilir veya anonim hale getirilir.</p>

<h3>7. İlgili Kişi (Veri Sahibi) Hakları</h3>
<p>KVKK'nın 11. maddesi uyarınca sahip olduğunuz haklar:</p>
<ul>
<li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
<li>İşlenmişse buna ilişkin bilgi talep etme</li>
<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
<li>Yurt içinde/dışında aktarıldığı üçüncü kişileri bilme</li>
<li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
<li>Silinmesini veya yok edilmesini talep etme</li>
<li>İşlemlere itiraz etme ve zararın giderilmesini talep etme</li>
</ul>

<h3>8. Başvuru Yöntemi</h3>
<p>KVKK kapsamındaki taleplerinizi <strong>kvkk@canlifal.com</strong> adresine e-posta göndererek veya <strong>İletişim</strong> sayfamız aracılığıyla iletebilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılır.</p>`,
      isPublished: true,
      showInFooter: true,
      showInHeader: false,
      sortOrder: 103,
    }
  })

  await prisma.sitePage.upsert({
    where: { slug: 'topluluk-kurallari' },
    update: {},
    create: {
      title: 'Topluluk Kuralları',
      slug: 'topluluk-kurallari',
      content: `<h2>Topluluk Kuralları</h2>
<p><strong>Son güncelleme:</strong> 3 Ağustos 2026</p>
<p>CanliFal.com, herkesin kendini güvende ve saygı görmüş hissettiği bir topluluk olmayı hedefler. Platformu kullanan tüm üyeler aşağıdaki kurallara uymakla yükümlüdür.</p>

<h3>1. Saygı ve Nezaket</h3>
<ul>
<li>Diğer kullanıcılara ve falcılara her zaman saygılı davranın.</li>
<li>Hakaret, küfür, tehdit, aşağılama ve nefret söylemi kesinlikle yasaktır.</li>
<li>Din, dil, ırk, cinsiyet, milliyet veya cinsel yönelim temelli ayrımcılık yapılamaz.</li>
</ul>

<h3>2. Taciz ve Zorbalık Yasağı</h3>
<ul>
<li>Kullanıcıları rahatsız edici, ısrarlı veya tehditkâr mesajlar göndermek yasaktır.</li>
<li>Cinsel taciz, ısrarlı istenmeyen iletişim ve zorbalık anında yaptırıma tabidir.</li>
</ul>

<h3>3. Uygunsuz İçerik Yasağı</h3>
<ul>
<li>Müstehcen, pornografik, şiddet içeren veya yasa dışı içerik paylaşılamaz.</li>
<li>Çocukların istismarına yönelik her türlü içerik <strong>kesinlikle yasaktır</strong> ve derhal yetkililere bildirilir.</li>
<li>Yanıltıcı, dolandırıcılık amaçlı veya sahte içerik paylaşımı yasaktır.</li>
</ul>

<h3>4. Gizlilik ve Kişisel Bilgiler</h3>
<ul>
<li>Başkalarının kişisel bilgilerini (telefon, adres, fotoğraf vb.) izinsiz paylaşmayın.</li>
<li>Kendi hassas bilgilerinizi de güvenliğiniz için paylaşmaktan kaçının.</li>
</ul>

<h3>5. Spam ve Reklam Yasağı</h3>
<ul>
<li>İstenmeyen reklam, tanıtım veya spam mesajları göndermek yasaktır.</li>
<li>Platform dışına yönlendiren ticari bağlantılar paylaşılamaz.</li>
</ul>

<h3>6. Sahte Hesap ve Kimlik</h3>
<ul>
<li>Başkasının kimliğine bürünmek veya sahte profil oluşturmak yasaktır.</li>
<li>Her kullanıcının yalnızca bir hesabı olabilir.</li>
</ul>

<h3>7. Kural İhlallerinin Sonuçları</h3>
<p>Topluluk kurallarını ihlal eden kullanıcılar hakkında ihlalin ağırlığına göre şu yaptırımlar uygulanır:</p>
<ul>
<li>Uyarı,</li>
<li>İçeriğin kaldırılması,</li>
<li>Geçici hesap askıya alma,</li>
<li>Kalıcı hesap kapatma,</li>
<li>Gerekli durumlarda yasal makamlara bildirim.</li>
</ul>

<h3>8. Bildirim</h3>
<p>Kurallara aykırı bir davranış veya içerikle karşılaştığınızda uygulama içindeki <strong>"Bildir / Şikâyet Et"</strong> özelliğini kullanabilir veya <strong>İletişim</strong> sayfamızdan bize ulaşabilirsiniz. Tüm bildirimler gizli tutulur.</p>`,
      isPublished: true,
      showInFooter: true,
      showInHeader: false,
      sortOrder: 104,
    }
  })

  console.log('Site pages seeded!')

  // Seed Profile Frames
  const profileFrames = [
    { id: 'frame-butterfly-1', name: 'Kelebek Çerçeve 1', imageUrl: '/frames/frame-butterfly-1.png', tier: 'gold', sortOrder: 1 },
    { id: 'frame-butterfly-2', name: 'Kelebek Çerçeve 2', imageUrl: '/frames/frame-butterfly-2.png', tier: 'gold', sortOrder: 2 },
    { id: 'frame-butterfly-3', name: 'Kelebek Çerçeve 3', imageUrl: '/frames/frame-butterfly-3.png', tier: 'gold', sortOrder: 3 },
    { id: 'frame-butterfly-4', name: 'Kelebek Çerçeve 4', imageUrl: '/frames/frame-butterfly-4.png', tier: 'gold', sortOrder: 4 },
    { id: 'frame-lion-1', name: 'Aslan Çerçeve 1', imageUrl: '/frames/frame-lion-1.png', tier: 'gold', sortOrder: 5 },
    { id: 'frame-lion-2', name: 'Aslan Çerçeve 2', imageUrl: '/frames/frame-lion-2.png', tier: 'gold', sortOrder: 6 },
    { id: 'frame-lion-3', name: 'Aslan Çerçeve 3', imageUrl: '/frames/frame-lion-3.png', tier: 'gold', sortOrder: 7 },
    { id: 'frame-lion-4', name: 'Aslan Çerçeve 4', imageUrl: '/frames/frame-lion-4.png', tier: 'gold', sortOrder: 8 },
  ]

  for (const frame of profileFrames) {
    await prisma.profileFrame.upsert({
      where: { id: frame.id },
      update: {
        name: frame.name,
        imageUrl: frame.imageUrl,
        tier: frame.tier,
        sortOrder: frame.sortOrder,
        isActive: true,
      },
      create: {
        id: frame.id,
        name: frame.name,
        imageUrl: frame.imageUrl,
        tier: frame.tier,
        sortOrder: frame.sortOrder,
        isActive: true,
      },
    })
  }
  console.log('Profile frames seeded!')

  // Seed stream auto-close and announcement settings
  const streamSettings = [
    { key: 'stream_no_gift_timeout', value: '15', description: 'Hediye gelmezse yayını otomatik kapatma süresi (dakika)' },
    { key: 'stream_reopen_cooldown', value: '30', description: 'Otomatik kapanan yayın tekrar açma bekleme süresi (dakika)' },
    { key: 'entry_announcement_enabled', value: 'true', description: 'Giriş duyurularının gösterilip gösterilmeyeceği' },
    { key: 'entry_announcement_duration', value: '2', description: 'Giriş duyurusu gösterim süresi (saniye)' },
    { key: 'entry_announcement_style', value: 'fade', description: 'Giriş duyurusu gösterim stili (fade, slide, flash)' },
    { key: 'jeton_unit_price', value: '0.50', description: 'Jeton başına birim fiyat (TRY)' },
  ]
  for (const s of streamSettings) {
    await prisma.platformSettings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log('Stream & announcement settings seeded!')

  // ========== CELEBRITIES ==========
  const celebrities = [
    // ── OYUNCULAR ──
    { name: 'Kemal Sunal', slug: 'kemal-sunal', category: 'oyuncu', bio: 'Türk sinemasının efsane komedyeni. Hababam Sınıfı, Şaban serisi ve sayısız unutulmaz filmle Türk halkının gönlünde taht kurmuştur.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1944-11-11'), isVerified: true, followerCount: 15000, profileImage: '/celebrities/kemal_sunal.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Altın Portakal Ödülü', 'En İyi Erkek Oyuncu', '80+ Film']) },
    { name: 'Hande Erçel', slug: 'hande-ercel', category: 'oyuncu', bio: 'Sen Çal Kapımı dizisiyle uluslararası üne kavuşan Türk oyuncu. 76 milyondan fazla Instagram takipçisiyle Türkiye\'nin en çok takip edilen isimlerinden.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Bandırma', birthDate: new Date('1993-11-24'), isVerified: true, followerCount: 30000, profileImage: '/celebrities/hande_ercel.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/handemiyy' }), achievements: JSON.stringify(['En İyi Dizi Oyuncusu', '76M+ Instagram Takipçi']) },
    { name: 'Burak Özçivit', slug: 'burak-ozcivit', category: 'oyuncu', bio: 'Kuruluş Osman dizisinin başrol oyuncusu. Türk dizilerinin dünya çapında tanınmasında önemli rol oynayan başarılı bir oyuncudur.', zodiacSign: 'Aralık - Yay', birthPlace: 'İstanbul', birthDate: new Date('1984-12-24'), isVerified: true, followerCount: 22000, profileImage: '/celebrities/burak_ozcivit.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/baborzcivit' }), achievements: JSON.stringify(['Altın Kelebek', 'Uluslararası Tanınırlık', '40M+ Instagram']) },
    { name: 'Çağatay Ulusoy', slug: 'cagatay-ulusoy', category: 'oyuncu', bio: 'Hakan: Muhafız (The Protector) dizisiyle Netflix\'te uluslararası üne kavuşmuş Türk oyuncu ve model.', zodiacSign: 'Eylül - Başak', birthPlace: 'İstanbul', birthDate: new Date('1990-09-23'), isVerified: true, followerCount: 16000, profileImage: '/celebrities/cagatay_ulusoy.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/cagatayulusoy' }), achievements: JSON.stringify(['Netflix Orijinal Dizi', 'Best Model of Turkey', 'Altın Kelebek']) },
    { name: 'Kıvanç Tatlıtuğ', slug: 'kivanc-tatlitug', category: 'oyuncu', bio: 'Aşk-ı Memnu, Kuzey Güney gibi efsane dizilerin yıldızı. Türk drama tarihinin en ikonik erkek oyuncularından biri.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Adana', birthDate: new Date('1983-10-27'), isVerified: true, followerCount: 18000, profileImage: '/celebrities/kivanc_tatlitug.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/kiaborhani' }), achievements: JSON.stringify(['Altın Kelebek', 'En İyi Erkek Oyuncu', '20M+ Takipçi']) },
    { name: 'Bergüzar Korel', slug: 'berguzar-korel', category: 'oyuncu', bio: 'Binbir Gece ve Karadayı dizileriyle tanınan ödüllü Türk oyuncu. Güçlü performanslarıyla izleyicileri etkisi altına almıştır.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'Brüksel, Belçika', birthDate: new Date('1982-08-27'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/berguzar_korel.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/berguzarkorel' }), achievements: JSON.stringify(['Altın Kelebek', 'Pantene Altın Kelebek', 'Uluslararası Ödüller']) },
    { name: 'Barış Arduç', slug: 'baris-arduc', category: 'oyuncu', bio: 'Kiralık Aşk dizisinin unutulmaz Ömer\'i. Elçin Sangu ile muhteşem ekran uyumuyla gönülleri fethetmiştir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İsviçre', birthDate: new Date('1987-10-09'), isVerified: true, followerCount: 11000, profileImage: '/celebrities/baris_arduc.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/barisarduc' }), achievements: JSON.stringify(['Altın Kelebek', 'En İyi Çift Ödülü']) },
    { name: 'Elçin Sangu', slug: 'elcin-sangu', category: 'oyuncu', bio: 'Kiralık Aşk ve Çarpışma dizileriyle tanınan başarılı Türk oyuncu. Kızıl saçlarıyla ikonik bir görünüme sahiptir.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'İzmir', birthDate: new Date('1985-08-13'), isVerified: true, followerCount: 13000, profileImage: '/celebrities/elcin_sangu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/elaborhani' }), achievements: JSON.stringify(['Altın Kelebek', 'En İyi Kadın Oyuncu']) },
    { name: 'Can Yaman', slug: 'can-yaman', category: 'oyuncu', bio: 'Erkenci Kuş ve Bay Yanlış dizileriyle Türkiye ve dünyada büyük hayran kitlesine ulaşan oyuncu. İtalya\'da da büyük popülerlik kazanmıştır.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1989-11-08'), isVerified: true, followerCount: 28000, profileImage: '/celebrities/can_yaman.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/canyaman' }), achievements: JSON.stringify(['Uluslararası Yıldız', '11M+ Instagram', 'İtalya Popülerliği']) },
    { name: 'Demet Özdemir', slug: 'demet-ozdemir', category: 'oyuncu', bio: 'Erkenci Kuş dizisinde Sanem rolüyle dünyaca tanınan Türk oyuncu. Dans yetenekleriyle de dikkat çekmektedir.', zodiacSign: 'Şubat - Balık', birthPlace: 'İzmit', birthDate: new Date('1992-02-26'), isVerified: true, followerCount: 25000, profileImage: '/celebrities/demet_ozdemir.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/1demetozdemir' }), achievements: JSON.stringify(['Murex d\'Or Ödülü', '30M+ Instagram']) },
    { name: 'İbrahim Çelikkol', slug: 'ibrahim-celikkol', category: 'oyuncu', bio: 'Kara Sevda ve Siyah Beyaz Aşk dizilerinin başarılı oyuncusu. Best Model of the World ünvanının sahibidir.', zodiacSign: 'Şubat - Balık', birthPlace: 'İstanbul', birthDate: new Date('1982-02-14'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/ibrahim_celikkol.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ibrahimcelikkol' }), achievements: JSON.stringify(['Best Model of the World', 'Altın Kelebek']) },
    { name: 'Tuba Büyüküstün', slug: 'tuba-buyukustun', category: 'oyuncu', bio: 'Asi, Kara Para Aşk gibi hit dizilerin yıldızı. UNICEF Türkiye İyi Niyet Elçisi olarak da görev yapmaktadır.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1982-07-05'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/tuba_buyukustun.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/tubabustun' }), achievements: JSON.stringify(['UNICEF İyi Niyet Elçisi', 'Uluslararası Ödüller']) },
    // ── OYUNCULAR (Devam) ──
    { name: 'Türkan Şoray', slug: 'turkan-soray', category: 'oyuncu', bio: 'Yeşilçam\'ın Sultan\'ı. Türk sinemasının en büyük kadın yıldızı olarak kabul edilen efsane oyuncu. 200\'den fazla filmde rol almıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1945-06-28'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/turkan_soray.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Yeşilçam Sultanu', '200+ Film', 'Altın Portakal']) },
    { name: 'Şener Şen', slug: 'sener-sen', category: 'oyuncu', bio: 'Türk sinemasının usta oyuncusu. Züğürt Ağa, Eşkıya, G.O.R.A. gibi unutulmaz filmleriyle Türk sinema tarihine damga vurmuştur.', zodiacSign: 'Aralık - Yay', birthPlace: 'Ankara', birthDate: new Date('1941-12-26'), isVerified: true, followerCount: 14000, profileImage: '/celebrities/sener_sen.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Altın Portakal', 'Eşkıya Filmi', '60+ Film']) },
    { name: 'Nurgül Yeşilçay', slug: 'nurgul-yesilcay', category: 'oyuncu', bio: 'Türk sinema ve tiyatrosunun ödüllü oyuncusu. Bliss filmiyle uluslararası festivallerde büyük beğeni toplamıştır.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Afyon', birthDate: new Date('1976-11-26'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/nurgul_yesilcay.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/nurgul.yesilcay' }), achievements: JSON.stringify(['Altın Portakal', 'Uluslararası Film Ödülleri']) },
    { name: 'Haluk Bilginer', slug: 'haluk-bilginer', category: 'oyuncu', bio: 'Uluslararası Emmy Ödüllü Türk oyuncu. Şahsiyet dizisindeki performansıyla dünyaca tanınmıştır. Royal Shakespeare Company\'de de sahne almıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İzmir', birthDate: new Date('1954-06-05'), isVerified: true, followerCount: 11000, profileImage: '/celebrities/haluk_bilginer.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Uluslararası Emmy Ödülü', 'Altın Portakal', 'Royal Shakespeare Company']) },
    { name: 'Fahriye Evcen', slug: 'fahriye-evcen', category: 'oyuncu', bio: 'Yaprak Dökümü ve Çalıkuşu dizileriyle tanınan başarılı Türk oyuncu. Burak Özçivit ile evliliğiyle de gündemde kalmaktadır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'Solingen, Almanya', birthDate: new Date('1986-06-04'), isVerified: true, followerCount: 19000, profileImage: '/celebrities/fahriye_evcen.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/faaborzcivit' }), achievements: JSON.stringify(['Altın Kelebek', '15M+ Instagram']) },
    { name: 'Engin Akyürek', slug: 'engin-akyurek', category: 'oyuncu', bio: 'Kara Para Aşk ve Fatih Harbiye dizileriyle tanınan ödüllü Türk oyuncu. Seul Drama Awards\'ta En İyi Yabancı Oyuncu seçilmiştir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Ankara', birthDate: new Date('1981-10-12'), isVerified: true, followerCount: 15000, profileImage: '/celebrities/engin_akyurek.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/enginakyurek' }), achievements: JSON.stringify(['Seul Drama Awards', 'Altın Kelebek', 'Uluslararası Tanınırlık']) },
    { name: 'Beren Saat', slug: 'beren-saat', category: 'oyuncu', bio: 'Aşk-ı Memnu ve Fatmagül\'ün Suçu Ne? dizileriyle Türk drama tarihinin en önemli kadın oyuncularından. Netflix yapımlarında da yer almıştır.', zodiacSign: 'Şubat - Kova', birthPlace: 'Ankara', birthDate: new Date('1984-02-26'), isVerified: true, followerCount: 16000, profileImage: '/celebrities/beren_saat.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/berensaat' }), achievements: JSON.stringify(['Altın Kelebek', 'Seoul International Drama Award', '15M+ Instagram']) },
    { name: 'Hazal Kaya', slug: 'hazal-kaya', category: 'oyuncu', bio: 'Adını Feriha Koydum ve Bizim Hikaye dizileriyle büyük hayran kitlesine ulaşan Türk oyuncu. UNICEF İyi Niyet Elçisi.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Gaziantep', birthDate: new Date('1990-10-01'), isVerified: true, followerCount: 17000, profileImage: '/celebrities/hazal_kaya.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hazalkaya' }), achievements: JSON.stringify(['UNICEF İyi Niyet Elçisi', 'Altın Kelebek', '17M+ Instagram']) },
    { name: 'Neslihan Atagül', slug: 'neslihan-atagul', category: 'oyuncu', bio: 'Kara Sevda dizisinde Nihan rolüyle dünyaca üne kavuşan Türk oyuncu. 19 milyondan fazla Instagram takipçisi vardır.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1992-08-20'), isVerified: true, followerCount: 19000, profileImage: '/celebrities/neslihan_atagul.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/neslihanatagul' }), achievements: JSON.stringify(['Altın Kelebek', '19M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Özge Gürel', slug: 'ozge-gurel', category: 'oyuncu', bio: 'Kiraz Mevsimi ve Bay Yanlış dizileriyle tanınan Türk oyuncu. Uluslararası arenada da büyük popülerlik kazanmıştır.', zodiacSign: 'Şubat - Balık', birthPlace: 'İstanbul', birthDate: new Date('1987-02-05'), isVerified: true, followerCount: 11000, profileImage: '/celebrities/ozge_gurel.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ozgegurel' }), achievements: JSON.stringify(['Altın Kelebek', 'Uluslararası Popülerlik']) },
    { name: 'Kenan İmirzalıoğlu', slug: 'kenan-imirzalioglu', category: 'oyuncu', bio: 'Ezel dizisiyle efsaneleşen Türk oyuncu. Best Model of the World ünvanının sahibi. Acı Hayat, Kanıt gibi yapımlarda da başrol oynamıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'Ankara', birthDate: new Date('1974-06-18'), isVerified: true, followerCount: 13000, profileImage: '/celebrities/kenan_imirzalioglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/kenan.imirzalioglu' }), achievements: JSON.stringify(['Best Model of the World', 'Ezel Dizisi', 'Altın Kelebek']) },
    { name: 'Songül Öden', slug: 'songul-oden', category: 'oyuncu', bio: 'Binbir Gece dizisiyle tanınan başarılı Türk oyuncu. Haluk Bilginer ile birlikte unutulmaz performanslar sergilemiştir.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'Diyarbakır', birthDate: new Date('1979-07-22'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/songul_oden.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/songuloden' }), achievements: JSON.stringify(['Altın Kelebek', 'Binbir Gece']) },
    { name: 'Meryem Uzerli', slug: 'meryem-uzerli', category: 'oyuncu', bio: 'Muhteşem Yüzyıl dizisinde Hürrem Sultan rolüyle dünyaca ünlenen Türk-Alman oyuncu. 9 milyondan fazla Instagram takipçisi vardır.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'Kassel, Almanya', birthDate: new Date('1983-08-12'), isVerified: true, followerCount: 14000, profileImage: '/celebrities/meryem_uzerli.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/maborzemuzerli' }), achievements: JSON.stringify(['Muhteşem Yüzyıl', '9M+ Instagram', 'Altın Kelebek']) },
    { name: 'Serenay Sarıkaya', slug: 'serenay-sarikaya', category: 'oyuncu', bio: 'Medcezir ve Fi dizileriyle tanınan başarılı Türk oyuncu ve model. Lider filmindeki performansıyla da dikkat çekmiştir.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'Ankara', birthDate: new Date('1991-07-01'), isVerified: true, followerCount: 20000, profileImage: '/celebrities/serenay_sarikaya.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/serenayss' }), achievements: JSON.stringify(['Altın Kelebek', '17M+ Instagram', 'Best Model of Turkey']) },
    { name: 'Aras Bulut İynemli', slug: 'aras-bulut-iynemli', category: 'oyuncu', bio: 'İçerde ve Çukur dizileriyle Türkiye\'nin en popüler genç oyuncularından olan Aras Bulut, sinema filmlerinde de büyük başarı yakalamıştır.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1990-08-25'), isVerified: true, followerCount: 22000, profileImage: '/celebrities/aras_bulut_iynemli.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/arasbulutiynemli' }), achievements: JSON.stringify(['Altın Kelebek', 'Çukur Dizisi', '14M+ Instagram']) },
    { name: 'Afra Saraçoğlu', slug: 'afra-saracoglu', category: 'oyuncu', bio: 'Yargı dizisindeki Ceylin rolüyle büyük çıkış yapan genç Türk oyuncu. Altın Kelebek Ödülü sahibidir.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İzmir', birthDate: new Date('1997-01-01'), isVerified: true, followerCount: 18000, profileImage: '/celebrities/afra_saracoglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/afrasaracoglu' }), achievements: JSON.stringify(['Altın Kelebek', 'Yargı Dizisi', '10M+ Instagram']) },
    { name: 'Pınar Deniz', slug: 'pinar-deniz', category: 'oyuncu', bio: 'Yargı ve Bir Başkadır dizileriyle tanınan genç Türk oyuncu. Güçlü oyunculuk performanslarıyla ödüller almıştır.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1994-03-28'), isVerified: true, followerCount: 14000, profileImage: '/celebrities/pinar_deniz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/pinarrdeniz' }), achievements: JSON.stringify(['Altın Kelebek', 'Yargı Dizisi']) },
    { name: 'Sıla Türkoğlu', slug: 'sila-turkoglu', category: 'oyuncu', bio: 'Emanet ve Kızılcık Şerbeti dizileriyle tanınan genç Türk oyuncu. Hızla yükselen kariyeriyle dikkat çekmektedir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Ankara', birthDate: new Date('1999-10-06'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/sila_turkoglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/silatrkoglu' }), achievements: JSON.stringify(['Kızılcık Şerbeti', '8M+ Instagram']) },
    { name: 'Akın Akınözü', slug: 'akin-akinozu', category: 'oyuncu', bio: 'Hercai dizisinde Miran Aslanbey rolüyle büyük çıkış yapan Türk oyuncu. Uluslararası arenada geniş hayran kitlesine sahiptir.', zodiacSign: 'Eylül - Başak', birthPlace: 'İstanbul', birthDate: new Date('1990-09-22'), isVerified: true, followerCount: 13000, profileImage: '/celebrities/akin_akinozu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aabornozu' }), achievements: JSON.stringify(['Hercai Dizisi', 'Uluslararası Tanınırlık', '6M+ Instagram']) },
    { name: 'Halil İbrahim Ceyhan', slug: 'halil-ibrahim-ceyhan', category: 'oyuncu', bio: 'Emanet dizisinde Yaman rolüyle tanınan genç Türk oyuncu. Sıla Türkoğlu ile ekran uyumuyla büyük beğeni toplamıştır.', zodiacSign: 'Mart - Balık', birthPlace: 'Ankara', birthDate: new Date('1995-03-01'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/halil_ibrahim_ceyhan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/halilibrahimceyhan' }), achievements: JSON.stringify(['Emanet Dizisi', '5M+ Instagram']) },
    { name: 'Halit Ergenç', slug: 'halit-ergenc', category: 'oyuncu', bio: 'Muhteşem Yüzyıl dizisinde Kanuni Sultan Süleyman rolüyle dünyaca ünlenen Türk oyuncu. Türk dizi endüstrisinin uluslararası yüzü.', zodiacSign: 'Nisan - Koç', birthPlace: 'İstanbul', birthDate: new Date('1970-04-30'), isVerified: true, followerCount: 15000, profileImage: '/celebrities/halit_ergenc.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/halitergenc' }), achievements: JSON.stringify(['Muhteşem Yüzyıl', 'Altın Kelebek', 'Uluslararası Yıldız']) },
    { name: 'Ozan Güven', slug: 'ozan-guven', category: 'oyuncu', bio: 'Ezel, Arka Sokaklar gibi popüler dizilerde rol almış başarılı Türk oyuncu. Sinema filmlerinde de önemli roller üstlenmiştir.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1975-06-04'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/ozan_guven.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ozanguvenresmi' }), achievements: JSON.stringify(['Altın Kelebek', 'Ezel Dizisi']) },
    { name: 'Mehmet Günsür', slug: 'mehmet-gunsur', category: 'oyuncu', bio: 'Hamam filmiyle uluslararası tanınırlık kazanan Türk oyuncu. İtalyan ve Türk yapımlarında başarılı performanslar sergilemiştir.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1975-01-10'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/mehmet_gunsur.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/mehmetgunsur' }), achievements: JSON.stringify(['Uluslararası Filmler', 'Altın Portakal']) },
    { name: 'Birce Akalay', slug: 'birce-akalay', category: 'oyuncu', bio: 'Kara Sevda ve Ufak Tefek Cinayetler dizileriyle tanınan Türk oyuncu. Güçlü kadın karakterleriyle öne çıkmıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1984-06-19'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/birce_akalay.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/birceakalay' }), achievements: JSON.stringify(['Altın Kelebek', 'Kara Sevda']) },
    { name: 'Cansu Dere', slug: 'cansu-dere', category: 'oyuncu', bio: 'Ezel, Sila ve Anne dizileriyle tanınan ödüllü Türk oyuncu ve model. Best Model of Turkey ünvanının sahibidir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Ankara', birthDate: new Date('1980-10-14'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/cansu_dere.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/cansudere' }), achievements: JSON.stringify(['Best Model of Turkey', 'Altın Kelebek', 'Ezel Dizisi']) },
    { name: 'Dilan Çiçek Deniz', slug: 'dilan-cicek-deniz', category: 'oyuncu', bio: 'Aşk 101 ve Bir Deli Rüzgar dizileriyle tanınan genç Türk oyuncu. Miss Turkey 2014 güzeli olarak da bilinir.', zodiacSign: 'Nisan - Koç', birthPlace: 'Almanya', birthDate: new Date('1993-04-18'), isVerified: true, followerCount: 11000, profileImage: '/celebrities/dilan_cicek_deniz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/dilancicekdeniz' }), achievements: JSON.stringify(['Miss Turkey 2014', 'Aşk 101', '5M+ Instagram']) },
    { name: 'Ayça Ayşin Turan', slug: 'ayca-aysin-turan', category: 'oyuncu', bio: 'Kuzey Yıldızı İlk Aşk ve Destan dizileriyle tanınan Türk oyuncu. Güçlü performanslarıyla dikkat çekmektedir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1992-10-25'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/ayca_aysin_turan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aaborturan' }), achievements: JSON.stringify(['Altın Kelebek', 'Destan Dizisi']) },
    { name: 'Uraz Kaygılaroğlu', slug: 'uraz-kaygilaroglu', category: 'oyuncu', bio: 'Çukur dizisinde Selim Koçovalı rolüyle tanınan Türk oyuncu. Güçlü karakter oyunculuğuyla öne çıkmıştır.', zodiacSign: 'Temmuz - Yengeç', birthPlace: 'İstanbul', birthDate: new Date('1990-07-07'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/uraz_kaygilaroglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/urazkaygilaroglu' }), achievements: JSON.stringify(['Çukur Dizisi', 'Altın Kelebek Adayı']) },
    { name: 'Erkan Kolçak Köstendil', slug: 'erkan-kolcak-kostendil', category: 'oyuncu', bio: 'Çukur ve İçerde dizileriyle tanınan karizmatik Türk oyuncu. Kötü adam rolleriyle büyük beğeni toplamıştır.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1983-10-01'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/erkan_kolcak_kostendil.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/erkankolcakkostendil' }), achievements: JSON.stringify(['Çukur Dizisi', 'İçerde Dizisi']) },
    { name: 'İlker Kaleli', slug: 'ilker-kaleli', category: 'oyuncu', bio: 'Çarpışma ve Maraşlı dizileriyle tanınan Türk oyuncu. Etkileyici fiziksel görünümü ve güçlü oyunculuğuyla dikkat çeker.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1987-03-15'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/ilker_kaleli.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ilkerkaleli' }), achievements: JSON.stringify(['Çarpışma Dizisi', 'Maraşlı Dizisi']) },
    { name: 'Cüneyt Arkın', slug: 'cuneyt-arkin', category: 'oyuncu', bio: 'Türk sinemasının efsanesi, Yeşilçam\'ın aksiyon kahramanı. 300\'den fazla filmde rol almış, Türk sinema tarihinin en üretken oyuncularından.', zodiacSign: 'Eylül - Başak', birthPlace: 'Eskişehir', birthDate: new Date('1937-09-08'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/cuneyt_arkin.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Yeşilçam Efsanesi', '300+ Film', 'Altın Portakal']) },
    { name: 'Filiz Akın', slug: 'filiz-akin', category: 'oyuncu', bio: 'Yeşilçam döneminin en güzel ve en yetenekli oyuncularından. Sultan ve Selvi Boylum Al Yazmalım gibi klasik filmlerin yıldızı.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1943-03-16'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/filiz_akin.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Yeşilçam Yıldızı', 'Altın Portakal', 'Selvi Boylum Al Yazmalım']) },
    { name: 'Hülya Avşar', slug: 'hulya-avsar', category: 'oyuncu', bio: 'Türk sinema ve televizyon dünyasının çok yönlü yıldızı. Oyunculuk, şarkıcılık ve sunuculuk kariyerlerinde başarılı bir isim.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Edirne', birthDate: new Date('1963-10-10'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/hulya_avsar.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hulyaavsar' }), achievements: JSON.stringify(['Altın Kelebek', 'Çok Yönlü Sanatçı', '40+ Film']) },
    { name: 'Yıldız Çağrı Atiksoy', slug: 'yildiz-cagri-atiksoy', category: 'oyuncu', bio: 'Destan dizisindeki Akkız rolüyle büyük çıkış yapan genç Türk oyuncu. Güçlü kadın karakterleriyle tanınır.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1991-11-15'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/yildiz_cagri_atiksoy.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/yildizcagriatiksoy' }), achievements: JSON.stringify(['Destan Dizisi', 'Yükselen Yıldız']) },
    { name: 'Burcu Özberk', slug: 'burcu-ozberk', category: 'oyuncu', bio: 'Afili Aşk ve Ramo dizileriyle tanınan Türk oyuncu. Romantik komedi türünde başarılı performanslar sergilemiştir.', zodiacSign: 'Aralık - Yay', birthPlace: 'İstanbul', birthDate: new Date('1992-12-12'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/burcu_ozberk.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/burcuozberk' }), achievements: JSON.stringify(['Afili Aşk', 'Altın Kelebek Adayı']) },
    { name: 'Cemre Baysel', slug: 'cemre-baysel', category: 'oyuncu', bio: 'Baht Oyunu ve Aşk Mantık İntikam dizileriyle tanınan genç Türk oyuncu. Hızla yükselen kariyeriyle dikkat çeker.', zodiacSign: 'Şubat - Balık', birthPlace: 'İstanbul', birthDate: new Date('1999-02-13'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/cemre_baysel.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/cemrebaysel' }), achievements: JSON.stringify(['Baht Oyunu', 'Yükselen Yıldız']) },
    { name: 'Miray Daner', slug: 'miray-daner', category: 'oyuncu', bio: 'Sefirin Kızı ve Bizim Hikaye dizileriyle tanınan genç Türk oyuncu. Çocuk yaşta başladığı kariyerinde hızla yükselmiştir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1999-10-14'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/miray_daner.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/miraydaner' }), achievements: JSON.stringify(['Altın Kelebek', 'Sefirin Kızı', '6M+ Instagram']) },
    { name: 'Alina Boz', slug: 'alina-boz', category: 'oyuncu', bio: 'Maraşlı ve Elimi Bırakma dizileriyle tanınan Rus asıllı Türk oyuncu. Genç yaşına rağmen güçlü performanslarıyla öne çıkar.', zodiacSign: 'Nisan - Koç', birthPlace: 'Moskova, Rusya', birthDate: new Date('1998-04-07'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/alina_boz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/alinaboz' }), achievements: JSON.stringify(['Maraşlı Dizisi', 'Yükselen Yıldız']) },
    { name: 'Kubilay Aka', slug: 'kubilay-aka', category: 'oyuncu', bio: 'Çukur dizisinde Cumali Koçovalı rolüyle tanınan Türk oyuncu. Karanlık ve karizmatik karakterleriyle beğeni toplar.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1988-06-20'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/kubilay_aka.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/kubilayaka' }), achievements: JSON.stringify(['Çukur Dizisi', 'Altın Kelebek Adayı']) },
    { name: 'Murat Yıldırım', slug: 'murat-yildirim', category: 'oyuncu', bio: 'Aşk ve Ceza, Ramo dizileriyle tanınan ödüllü Türk oyuncu. Güçlü ve karizmatik erkek rolleriyle bilinir.', zodiacSign: 'Nisan - Koç', birthPlace: 'Konya', birthDate: new Date('1979-04-13'), isVerified: true, followerCount: 11000, profileImage: '/celebrities/murat_yildirim.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/mabortirim' }), achievements: JSON.stringify(['Altın Kelebek', 'Ramo Dizisi', '6M+ Instagram']) },
    { name: 'Furkan Andıç', slug: 'furkan-andic', category: 'oyuncu', bio: 'Kalp Atışı ve Sol Yanım dizileriyle tanınan genç Türk oyuncu. Romantik dizi türünde başarılı roller üstlenmiştir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1991-10-12'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/furkan_andic.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/furkanandic' }), achievements: JSON.stringify(['Kalp Atışı', '5M+ Instagram']) },
    { name: 'Onur Tuna', slug: 'onur-tuna', category: 'oyuncu', bio: 'Vuslat ve Mucize Doktor dizileriyle tanınan Türk oyuncu. İkinci Bahar dizisindeki performansıyla da beğeni toplamıştır.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Trabzon', birthDate: new Date('1985-10-09'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/onur_tuna.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/onurtuna' }), achievements: JSON.stringify(['Mucize Doktor', 'Altın Kelebek Adayı']) },
    { name: 'Burak Deniz', slug: 'burak-deniz', category: 'oyuncu', bio: 'Maraşlı ve Aşk Laftan Anlamaz dizileriyle tanınan genç Türk oyuncu. Yakışıklı görüntüsüyle uluslararası hayran kitlesi edinmiştir.', zodiacSign: 'Şubat - Balık', birthPlace: 'İstanbul', birthDate: new Date('1991-02-17'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/burak_deniz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/buaboreniz' }), achievements: JSON.stringify(['Aşk Laftan Anlamaz', '8M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Tolga Sarıtaş', slug: 'tolga-saritas', category: 'oyuncu', bio: 'Söz ve Arıza dizileriyle tanınan Türk oyuncu. Asker ve aksiyon rolleriyle büyük beğeni toplamıştır.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1991-11-27'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/tolga_saritas.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/tolgasaritas' }), achievements: JSON.stringify(['Söz Dizisi', 'Arıza Dizisi']) },
    { name: 'İrem Helvacıoğlu', slug: 'irem-helvacioglu', category: 'oyuncu', bio: 'Hercai ve Doğduğun Ev Kaderindir dizileriyle tanınan Türk oyuncu. Duygusal performanslarıyla izleyicileri etkiler.', zodiacSign: 'Mart - Balık', birthPlace: 'İzmir', birthDate: new Date('1995-03-29'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/irem_helvacioglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/iremhelvacioglu' }), achievements: JSON.stringify(['Hercai Dizisi', '5M+ Instagram']) },
    { name: 'Esra Bilgiç', slug: 'esra-bilgic', category: 'oyuncu', bio: 'Diriliş: Ertuğrul dizisinde Halime Sultan rolüyle dünyaca ünlenen Türk oyuncu. Pakistan\'da da büyük popülerlik kazanmıştır.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Ankara', birthDate: new Date('1992-10-14'), isVerified: true, followerCount: 16000, profileImage: '/celebrities/esra_bilgic.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/esaborlgic' }), achievements: JSON.stringify(['Diriliş: Ertuğrul', '11M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Hazar Ergüçlü', slug: 'hazar-erguclu', category: 'oyuncu', bio: 'Bir Başkadır, Benim Adım Melek dizileriyle tanınan Türk oyuncu. Netflix yapımlarında da yer almıştır.', zodiacSign: 'Ekim - Akrep', birthPlace: 'Ankara', birthDate: new Date('1992-10-25'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/hazar_erguclu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hazarerguclu' }), achievements: JSON.stringify(['Bir Başkadır', 'Netflix Yapımları']) },
    { name: 'Deniz Baysal', slug: 'deniz-baysal', category: 'oyuncu', bio: 'Adını Sen Koy ve Sultan dizileriyle tanınan Türk oyuncu. Güçlü kadın karakterleriyle izleyicilerin beğenisini kazanmıştır.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'Adana', birthDate: new Date('1991-07-24'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/deniz_baysal.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/denizbaysal' }), achievements: JSON.stringify(['Adını Sen Koy', 'Sultan Dizisi']) },
    { name: 'Melisa Aslı Pamuk', slug: 'melisa-asli-pamuk', category: 'oyuncu', bio: 'Tatlı Küçük Yalancılar ve Sol Yanım dizileriyle tanınan Türk oyuncu ve model. Miss Turkey 2011 güzeli.', zodiacSign: 'Mayıs - Boğa', birthPlace: 'Almanya', birthDate: new Date('1991-05-15'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/melisa_asli_pamuk.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/melisaaslipamuk' }), achievements: JSON.stringify(['Miss Turkey 2011', 'Tatlı Küçük Yalancılar']) },
    { name: 'Yağız Can Konyalı', slug: 'yagiz-can-konyali', category: 'oyuncu', bio: 'Aşk Mantık İntikam ve Menengiç Ağacı dizileriyle tanınan genç Türk oyuncu. Romantik rolleriyle öne çıkar.', zodiacSign: 'Eylül - Başak', birthPlace: 'Ankara', birthDate: new Date('1996-09-14'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/yagiz_can_konyali.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/yagizckonyali' }), achievements: JSON.stringify(['Aşk Mantık İntikam', 'Yükselen Yıldız']) },
    { name: 'Furkan Palalı', slug: 'furkan-palali', category: 'oyuncu', bio: 'Aşk ve Mavi, Gönül Dağı dizileriyle tanınan Türk oyuncu ve model. Best Model of the World ünvanının sahibidir.', zodiacSign: 'Aralık - Yay', birthPlace: 'Bolu', birthDate: new Date('1986-12-12'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/furkan_palali.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/furkanpalali' }), achievements: JSON.stringify(['Best Model of the World', 'Gönül Dağı']) },
    { name: 'Nejat İşler', slug: 'nejat-isler', category: 'oyuncu', bio: 'Ezel dizisinde Ramiz Dayı rolüyle efsaneleşen Türk oyuncu. Karakter oyunculuğuyla Türk drama tarihinin en önemli isimlerinden.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Trabzon', birthDate: new Date('1972-11-06'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/nejat_isler.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Ezel - Ramiz Dayı', 'Altın Kelebek', 'Karakter Oyuncu']) },
    { name: 'Erkan Petekkaya', slug: 'erkan-petekkaya', category: 'oyuncu', bio: 'Yaprak Dökümü, Paramparça dizileriyle tanınan deneyimli Türk oyuncu. 30 yılı aşkın kariyerinde sayısız ödül almıştır.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Erzurum', birthDate: new Date('1971-11-08'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/erkan_petekkaya.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/erkanpetekkaya' }), achievements: JSON.stringify(['Yaprak Dökümü', 'Altın Kelebek', '30+ Yıllık Kariyer']) },
    { name: 'Özcan Deniz', slug: 'ozcan-deniz', category: 'oyuncu', bio: 'Hem şarkıcı hem oyuncu olarak başarılı bir kariyer sürdüren Türk sanatçı. İstanbullu Gelin ve Seni Çok Bekledim dizileriyle tanınır.', zodiacSign: 'Mayıs - Boğa', birthPlace: 'İstanbul', birthDate: new Date('1972-05-12'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/ozcan_deniz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ozcandeniz' }), achievements: JSON.stringify(['İstanbullu Gelin', 'Altın Kelebek', 'Çok Yönlü Sanatçı']) },
    { name: 'Damla Sönmez', slug: 'damla-sonmez', category: 'oyuncu', bio: 'Bir Başkadır dizisindeki performansıyla dikkat çeken Türk oyuncu. Bağımsız sinema yapımlarında da yer almıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1989-06-10'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/damla_sonmez.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/damlasonmez' }), achievements: JSON.stringify(['Bir Başkadır', 'Bağımsız Sinema Ödülleri']) },
    { name: 'Aslıhan Gürbüz', slug: 'aslihan-gurbuz', category: 'oyuncu', bio: 'Arka Sokaklar dizisiyle uzun yıllar ekranlarda kalan Türk oyuncu. Komedi ve drama türlerinde başarılı performanslar sergilemiştir.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1983-07-18'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/aslihan_gurbuz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aslihangurbuz' }), achievements: JSON.stringify(['Arka Sokaklar', 'Uzun Soluklu Kariyer']) },
    { name: 'Devrim Özkan', slug: 'devrim-ozkan', category: 'oyuncu', bio: 'Şampiyon ve Kuruluş Osman dizileriyle tanınan genç Türk oyuncu. Etkileyici oyunculuğuyla hızla yükselmektedir.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1996-03-09'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/devrim_ozkan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/devrimozkan' }), achievements: JSON.stringify(['Kuruluş Osman', 'Yükselen Yıldız']) },
    { name: 'Hande Doğandemir', slug: 'hande-dogandemir', category: 'oyuncu', bio: 'Güneşi Beklerken dizisiyle tanınan Türk oyuncu. Sinema filmlerinde de başarılı roller üstlenmiştir.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Ankara', birthDate: new Date('1985-11-22'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/hande_dogandemir.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/handedogandemir' }), achievements: JSON.stringify(['Güneşi Beklerken', 'Altın Kelebek Adayı']) },
    { name: 'İlayda Alişan', slug: 'ilayda-alisan', category: 'oyuncu', bio: 'Yüksek Sosyete ve Aşkın Tarifi dizileriyle tanınan genç Türk oyuncu. Taze ve enerjik performanslarıyla öne çıkar.', zodiacSign: 'Eylül - Başak', birthPlace: 'İstanbul', birthDate: new Date('1997-09-03'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/ilayda_alisan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ilaydaalisan' }), achievements: JSON.stringify(['Yüksek Sosyete', 'Yükselen Yıldız']) },
    { name: 'Metin Akpınar', slug: 'metin-akpinar', category: 'oyuncu', bio: 'Türk tiyatro ve sinemasının usta oyuncusu. Devekuşu Kabare ile başlayan kariyerinde sayısız unutulmaz performans sergilemiştir.', zodiacSign: 'Nisan - Koç', birthPlace: 'İstanbul', birthDate: new Date('1941-04-09'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/metin_akpinar.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Devekuşu Kabare', 'Altın Portakal', 'Tiyatro Ustası']) },
    { name: 'Perihan Savaş', slug: 'perihan-savas', category: 'oyuncu', bio: 'Yeşilçam döneminin sevilen oyuncusu. Onlarca filmde başrol oynamış, Türk sinemasının önemli kadın isimlerinden biridir.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1952-03-12'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/perihan_savas.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Yeşilçam Yıldızı', '100+ Film']) },
    { name: 'Serkan Çayoğlu', slug: 'serkan-cayoglu', category: 'oyuncu', bio: 'Kiraz Mevsimi dizisiyle tanınan Alman doğumlu Türk oyuncu. Özge Gürel ile birlikte ekran uyumuyla gönülleri fethetmiştir.', zodiacSign: 'Mayıs - Boğa', birthPlace: 'Almanya', birthDate: new Date('1987-05-31'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/serkan_cayoglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/serkancayoglu' }), achievements: JSON.stringify(['Kiraz Mevsimi', '5M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Alperen Duymaz', slug: 'alperen-duymaz', category: 'oyuncu', bio: 'Yasak Elma ve Yalı Çapkını dizileriyle tanınan genç Türk oyuncu. Romantik rollerdeki başarısıyla hızla yükselmiştir.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1995-01-15'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/alperen_duymaz.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/alperenduymaz' }), achievements: JSON.stringify(['Yalı Çapkını', '6M+ Instagram', 'Yükselen Yıldız']) },
    { name: 'İlhan Şen', slug: 'ilhan-sen', category: 'oyuncu', bio: 'Kızılcık Şerbeti dizisiyle tanınan genç Türk oyuncu. Karizmatik görüntüsü ve etkileyici performansıyla dikkat çeker.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1987-07-05'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/ilhan_sen.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ilhansen' }), achievements: JSON.stringify(['Kızılcık Şerbeti', 'Yükselen Yıldız']) },
    { name: 'Salih Bademci', slug: 'salih-bademci', category: 'oyuncu', bio: 'Bir Başkadır ve Kardeşlerim dizileriyle tanınan Türk oyuncu. Güçlü karakter oyunculuğuyla öne çıkar.', zodiacSign: 'Aralık - Yay', birthPlace: 'Ankara', birthDate: new Date('1984-12-28'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/salih_bademci.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/salihbademci' }), achievements: JSON.stringify(['Bir Başkadır', 'Kardeşlerim']) },
    { name: 'Timuçin Esen', slug: 'timucin-esen', category: 'oyuncu', bio: 'Hekimoğlu (Dr. House uyarlaması) dizisinin başrol oyuncusu. Güçlü oyunculuğuyla Türk drama dünyasının saygın isimlerinden.', zodiacSign: 'Eylül - Başak', birthPlace: 'Ankara', birthDate: new Date('1973-09-11'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/timucin_esen.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/timucinesen' }), achievements: JSON.stringify(['Hekimoğlu', 'Altın Kelebek Adayı']) },
    { name: 'Mert Ramazan Demir', slug: 'mert-ramazan-demir', category: 'oyuncu', bio: 'Yalı Çapkını dizisinde Ferit rolüyle büyük çıkış yapan genç Türk oyuncu. Hızla yükselen kariyeriyle Z kuşağının gözdesi.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('2000-10-07'), isVerified: true, followerCount: 14000, profileImage: '/celebrities/mert_ramazan_demir.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/mertramazandemir' }), achievements: JSON.stringify(['Yalı Çapkını', '8M+ Instagram', 'Yükselen Yıldız']) },
    { name: 'İclal Aydın', slug: 'iclal-aydin', category: 'oyuncu', bio: 'Türk tiyatro ve sinema dünyasının deneyimli oyuncusu. Onlarca dizi ve filmde unutulmaz performanslar sergilemiştir.', zodiacSign: 'Mayıs - Boğa', birthPlace: 'İstanbul', birthDate: new Date('1960-05-14'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/iclal_aydin.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Tiyatro Ustası', 'Altın Portakal', 'Deneyimli Oyuncu']) },
    { name: 'Selma Ergeç', slug: 'selma-ergec', category: 'oyuncu', bio: 'Muhteşem Yüzyıl dizisinde Hatice Sultan rolüyle tanınan Alman-Türk oyuncu ve model. Miss Turkey 2001 güzeli.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Almanya', birthDate: new Date('1978-11-24'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/selma_ergec.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/selmaergec' }), achievements: JSON.stringify(['Muhteşem Yüzyıl', 'Miss Turkey 2001']) },
    { name: 'Ebru Şahin', slug: 'ebru-sahin', category: 'oyuncu', bio: 'Hercai dizisinde Reyyan rolüyle büyük çıkış yapan Türk oyuncu. Akın Akınözü ile ekran uyumuyla uluslararası üne kavuşmuştur.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1994-03-19'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/ebru_sahin.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/eaborhinofficial' }), achievements: JSON.stringify(['Hercai Dizisi', '7M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Gökçe Bahadır', slug: 'gokce-bahadir', category: 'oyuncu', bio: 'İstanbullu Gelin ve Kardeş Çocukları dizileriyle tanınan Türk oyuncu. Komedi ve drama türlerinde başarılı.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1983-11-09'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/gokce_bahadir.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/gokcebahadir' }), achievements: JSON.stringify(['İstanbullu Gelin', 'Altın Kelebek Adayı']) },
    { name: 'Nur Fettahoğlu', slug: 'nur-fettahoglu', category: 'oyuncu', bio: 'Muhteşem Yüzyıl dizisinde Mahidevran Sultan rolüyle tanınan Türk oyuncu. Güçlü kadın karakterleriyle bilinir.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1980-08-12'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/nur_fettahoglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/nurfettahoglu' }), achievements: JSON.stringify(['Muhteşem Yüzyıl', 'Altın Kelebek Adayı']) },
    { name: 'Leyla Lydia Tuğutlu', slug: 'leyla-lydia-tugutlu', category: 'oyuncu', bio: 'Aşk Yeniden ve Elimi Bırakma dizileriyle tanınan Alman-Türk oyuncu. Romantik komedi türünde başarılı.', zodiacSign: 'Kasım - Akrep', birthPlace: 'Almanya', birthDate: new Date('1989-11-29'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/leyla_lydia_tugutlu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/leyla.lydia' }), achievements: JSON.stringify(['Aşk Yeniden', 'Uluslararası Kariyer']) },
    { name: 'Burçin Terzioğlu', slug: 'burcin-terzioglu', category: 'oyuncu', bio: 'Siyah Beyaz Aşk ve Vatanım Sensin dizileriyle tanınan Türk oyuncu. Güçlü ve duygusal performanslarıyla ödüller almıştır.', zodiacSign: 'Eylül - Başak', birthPlace: 'Ankara', birthDate: new Date('1983-09-12'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/burcin_terzioglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/burcinaborzioglu' }), achievements: JSON.stringify(['Vatanım Sensin', 'Altın Kelebek']) },
    { name: 'Bensu Soral', slug: 'bensu-soral', category: 'oyuncu', bio: 'Aşk ve Günah ve Söz dizileriyle tanınan Türk oyuncu. Hem komedi hem drama türünde başarılı performanslar sergilemiştir.', zodiacSign: 'Şubat - Kova', birthPlace: 'Ankara', birthDate: new Date('1991-02-23'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/bensu_soral.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/bensusoral' }), achievements: JSON.stringify(['Söz Dizisi', '4M+ Instagram']) },
    { name: 'Engin Öztürk', slug: 'engin-ozturk', category: 'oyuncu', bio: 'Medcezir ve Dolunay dizileriyle tanınan Türk oyuncu. Romantik dizilerdeki performanslarıyla geniş hayran kitlesi edinmiştir.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1986-06-15'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/engin_ozturk.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/enginozturk' }), achievements: JSON.stringify(['Medcezir', 'Dolunay']) },
    { name: 'Merve Dizdar', slug: 'merve-dizdar', category: 'oyuncu', bio: 'Masumlar Apartmanı dizisindeki performansıyla büyük beğeni toplayan Türk oyuncu. Cannes Film Festivali\'nde En İyi Kadın Oyuncu ödülü kazanmıştır.', zodiacSign: 'Şubat - Balık', birthPlace: 'Ankara', birthDate: new Date('1986-02-20'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/merve_dizdar.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/merveedizdar' }), achievements: JSON.stringify(['Cannes En İyi Kadın Oyuncu', 'Masumlar Apartmanı', 'Uluslararası Ödül']) },
    { name: 'Taner Ölmez', slug: 'taner-olmez', category: 'oyuncu', bio: 'Mucize Doktor dizisinde Ali Vefa rolüyle Türkiye ve dünyada büyük beğeni toplayan Türk oyuncu.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1981-07-21'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/taner_olmez.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/tanerr.olmez' }), achievements: JSON.stringify(['Mucize Doktor', '4M+ Instagram', 'Uluslararası Tanınırlık']) },
    { name: 'Rıza Kocaoğlu', slug: 'riza-kocaoglu', category: 'oyuncu', bio: 'İçerde ve Çukur dizileriyle tanınan Türk oyuncu. Aksiyon ve gerilim türlerindeki güçlü performanslarıyla bilinir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1979-10-08'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/riza_kocaoglu.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/rizakocaoglu' }), achievements: JSON.stringify(['Çukur Dizisi', 'İçerde Dizisi']) },
    { name: 'Nesrin Cavadzade', slug: 'nesrin-cavadzade', category: 'oyuncu', bio: 'Yasak Elma dizisiyle tanınan Azerbaycan asıllı Türk oyuncu. Femme fatale rolleriyle dikkat çekmektedir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Bakü, Azerbaycan', birthDate: new Date('1982-10-18'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/nesrin_cavadzade.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/nesrincavadzade' }), achievements: JSON.stringify(['Yasak Elma', '5M+ Instagram']) },
    { name: 'Melis Sezen', slug: 'melis-sezen', category: 'oyuncu', bio: 'Sadakatsiz dizisinde Derin rolüyle büyük çıkış yapan Türk oyuncu. Genç yaşına rağmen güçlü performanslarıyla dikkat çeker.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1997-01-03'), isVerified: true, followerCount: 9000, profileImage: '/celebrities/melis_sezen.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/melissezen' }), achievements: JSON.stringify(['Sadakatsiz', 'Altın Kelebek', 'Yükselen Yıldız']) },
    { name: 'Hafsanur Sancaktutan', slug: 'hafsanur-sancaktutan', category: 'oyuncu', bio: 'Yalı Çapkını dizisinde Seyran rolüyle büyük popülerlik kazanan genç Türk oyuncu. Z kuşağının en parlak yıldızlarından.', zodiacSign: 'Mart - Balık', birthPlace: 'Trabzon', birthDate: new Date('1998-03-04'), isVerified: true, followerCount: 13000, profileImage: '/celebrities/hafsanur_sancaktutan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hafsanursancaktutan' }), achievements: JSON.stringify(['Yalı Çapkını', '8M+ Instagram', 'Yükselen Yıldız']) },
    { name: 'Aslı Enver', slug: 'asli-enver', category: 'oyuncu', bio: 'İstanbullu Gelin ve Bir Aile Hikayesi dizileriyle tanınan Türk oyuncu. Başarılı performanslarıyla uzun yıllardır ekranlarda.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'Hollanda', birthDate: new Date('1984-01-10'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/asli_enver.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aslienverr' }), achievements: JSON.stringify(['İstanbullu Gelin', 'Altın Kelebek']) },
    { name: 'Buğra Gülsoy', slug: 'bugra-gulsoy', category: 'oyuncu', bio: 'Çilek Kokusu ve Fatih Harbiye dizileriyle tanınan Türk oyuncu. Hem ekranda hem sahnede başarılı performanslar sergilemiştir.', zodiacSign: 'Aralık - Yay', birthPlace: 'İstanbul', birthDate: new Date('1982-12-13'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/bugra_gulsoy.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/bugragulsoy' }), achievements: JSON.stringify(['Fatih Harbiye', 'Altın Kelebek Adayı']) },
    { name: 'Ekin Koç', slug: 'ekin-koc', category: 'oyuncu', bio: 'Çarpışma ve Şahmaran dizileriyle tanınan genç Türk oyuncu. Yoğun ve duygusal performanslarıyla ödüller almıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1992-06-19'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/ekin_koc.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ekinkoc' }), achievements: JSON.stringify(['Çarpışma', 'Şahmaran', 'Altın Kelebek Adayı']) },
    { name: 'Sinem Kobal', slug: 'sinem-kobal', category: 'oyuncu', bio: 'Selena ve Aşk-ı Memnu dizileriyle tanınan Türk oyuncu. Uzun yıllardır Türk dizi sektörünün önemli isimlerinden.', zodiacSign: 'Ağustos - Aslan', birthPlace: 'Ankara', birthDate: new Date('1987-08-14'), isVerified: true, followerCount: 7000, profileImage: '/celebrities/sinem_kobal.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/sinemkobal' }), achievements: JSON.stringify(['Selena', 'Aşk-ı Memnu', 'Altın Kelebek Adayı']) },
    { name: 'Vahide Perçin', slug: 'vahide-percin', category: 'oyuncu', bio: 'Anne ve Camdaki Kız dizileriyle tanınan ödüllü Türk oyuncu. Güçlü anne ve kadın karakterleriyle izleyicileri derinden etkiler.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İstanbul', birthDate: new Date('1966-11-14'), isVerified: true, followerCount: 6000, profileImage: '/celebrities/vahide_percin.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/vahidepercin' }), achievements: JSON.stringify(['Anne Dizisi', 'Altın Kelebek', 'Ödüllü Oyuncu']) },
    { name: 'Emre Kınay', slug: 'emre-kinay', category: 'oyuncu', bio: 'Fatmagül\'ün Suçu Ne? ve Paramparça dizileriyle tanınan Türk oyuncu. Güçlü kötü adam rolleriyle bilinir.', zodiacSign: 'Nisan - Koç', birthPlace: 'İstanbul', birthDate: new Date('1967-04-22'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/emre_kinay.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/emrekinay' }), achievements: JSON.stringify(['Fatmagül', 'Karakter Oyuncu']) },
    { name: 'Yiğit Özşener', slug: 'yigit-ozsener', category: 'oyuncu', bio: 'Türk sinema ve tiyatro dünyasının deneyimli oyuncusu. Ödüllü performanslarıyla Türk sanat dünyasının saygın isimlerinden.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Ankara', birthDate: new Date('1972-10-14'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/yigit_ozsener.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Altın Portakal', 'Tiyatro Ödülleri']) },
    { name: 'Canan Ergüder', slug: 'canan-erguder', category: 'oyuncu', bio: 'Muhteşem Yüzyıl Kösem ve Kardeşlerim dizileriyle tanınan Türk oyuncu. Drama türünde güçlü performanslarıyla bilinir.', zodiacSign: 'Eylül - Başak', birthPlace: 'İstanbul', birthDate: new Date('1978-09-03'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/canan_erguder.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/cananerguder' }), achievements: JSON.stringify(['Muhteşem Yüzyıl Kösem', 'Kardeşlerim']) },
    { name: 'Cem Davran', slug: 'cem-davran', category: 'oyuncu', bio: 'Avrupa Yakası ve Beş Kardeş dizileriyle tanınan komedi ustası Türk oyuncu. Eşsiz komedi yeteneğiyle uzun yıllar ekranlarda.', zodiacSign: 'Aralık - Yay', birthPlace: 'İstanbul', birthDate: new Date('1966-12-02'), isVerified: true, followerCount: 5000, profileImage: '/celebrities/cem_davran.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Avrupa Yakası', 'Komedi Ustası']) },
    // ── ŞARKICILAR ──
    { name: 'Tarkan', slug: 'tarkan', category: 'sarkici', bio: 'Megastar Tarkan, Türk pop müziğinin en büyük ismi. Şımarık, Dudu, Kuzu Kuzu gibi hit şarkılarıyla dünya çapında tanınmaktadır.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Alzey, Almanya', birthDate: new Date('1972-10-17'), isVerified: true, followerCount: 25000, profileImage: '/celebrities/tarkan.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/taraborhani' }), achievements: JSON.stringify(['World Music Award', 'Altın Kelebek', 'Megastar Unvanı']) },
    { name: 'Ebru Gündeş', slug: 'ebru-gundes', category: 'sarkici', bio: 'Türk pop müziğinin divalarından biri. Onlarca hit şarkı ve albümle müzik kariyerine devam etmektedir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1974-10-12'), isVerified: true, followerCount: 10000, profileImage: '/celebrities/ebru_gundes.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ebrugundes' }), achievements: JSON.stringify(['Altın Kelebek', 'Platin Albüm', '30+ Yıllık Kariyer']) },
    { name: 'Hadise', slug: 'hadise', category: 'sarkici', bio: 'Belçika doğumlu Türk pop yıldızı. Eurovision 2009\'da Türkiye\'yi temsil etmiş, Düm Tek Tek şarkısıyla dünyaca tanınmıştır.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Mol, Belçika', birthDate: new Date('1985-10-22'), isVerified: true, followerCount: 22000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hadise' }), achievements: JSON.stringify(['Eurovision 4. lük', 'O Ses Türkiye Jürisi', '18M+ Instagram']) },
    { name: 'Sezen Aksu', slug: 'sezen-aksu', category: 'sarkici', bio: 'Türk pop müziğinin minik serçesi. 50 yılı aşan kariyeriyle yüzlerce şarkıya imza atmış, Türk müziğinin en etkili ismidir.', zodiacSign: 'Temmuz - Yengeç', birthPlace: 'Sakarya', birthDate: new Date('1954-07-13'), isVerified: true, followerCount: 20000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Minik Serçe', '600+ Şarkı', 'Türk Müziğinin Kraliçesi']) },
    { name: 'Murat Boz', slug: 'murat-boz', category: 'sarkici', bio: 'Türk pop müziğinin en başarılı erkek sanatçılarından. Uçurum, Janti, Adını Bilen Yazsın gibi hit şarkılarıyla tanınır.', zodiacSign: 'Mart - Balık', birthPlace: 'Zonguldak', birthDate: new Date('1980-03-07'), isVerified: true, followerCount: 12000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/muratboz' }), achievements: JSON.stringify(['Altın Kelebek', 'O Ses Türkiye', 'Platin Albümler']) },
    { name: 'Aleyna Tilki', slug: 'aleyna-tilki', category: 'sarkici', bio: 'Genç yaşta Sen Olsan Bari şarkısıyla fenomen olan Türk pop yıldızı. Uluslararası arenada da İngilizce şarkılarıyla iddialı.', zodiacSign: 'Mart - Balık', birthPlace: 'Konya', birthDate: new Date('2000-03-28'), isVerified: true, followerCount: 16000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aaborhani' }), achievements: JSON.stringify(['YouTube Fenomeni', 'Uluslararası Kariyere Geçiş']) },
    { name: 'Mabel Matiz', slug: 'mabel-matiz', category: 'sarkici', bio: 'Alternatif pop müziğin öncü ismi. Öyle Kolaysa, Gel gibi şarkılarıyla geniş kitlelere ulaşan özgün bir sanatçı.', zodiacSign: 'Kasım - Akrep', birthPlace: 'İzmir', birthDate: new Date('1987-11-13'), isVerified: true, followerCount: 9000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/maborhani' }), achievements: JSON.stringify(['Altın Kelebek', 'En İyi Alternatif Sanatçı']) },
    { name: 'Serdar Ortaç', slug: 'serdar-ortac', category: 'sarkici', bio: 'Türk pop müziğinin mega starı. Heyecan, Karabiberim, No Problem gibi unutulmaz hit şarkıların sahibidir.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1970-01-04'), isVerified: true, followerCount: 8000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/serdarortac' }), achievements: JSON.stringify(['Mega Star Unvanı', '100M+ Dinlenme']) },
    { name: 'Gülşen', slug: 'gulsen', category: 'sarkici', bio: 'Türk pop müziğinin cesur ve özgün sesi. Bangır Bangır, Yurtta Aşk Cihanda Aşk gibi hit şarkılarla tanınır.', zodiacSign: 'Mayıs - Boğa', birthPlace: 'İstanbul', birthDate: new Date('1976-05-29'), isVerified: true, followerCount: 11000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/gulsenofficial' }), achievements: JSON.stringify(['Altın Kelebek', 'Platin Albümler']) },
    // ── FUTBOLCULAR ──
    { name: 'Arda Güler', slug: 'arda-guler', category: 'futbolcu', bio: 'Real Madrid\'in genç yıldızı. Fenerbahçe altyapısından yetişen Arda Güler, La Liga\'da forma giyen en genç Türk futbolcu olarak tarihe geçmiştir.', zodiacSign: 'Şubat - Balık', birthPlace: 'Ankara', birthDate: new Date('2005-02-25'), isVerified: true, followerCount: 20000, profileImage: '/celebrities/arda_guler.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ardaguler' }), achievements: JSON.stringify(['Real Madrid Transferi', 'A Milli Takım', 'La Liga Gol Kralı Adayı']) },
    { name: 'Hakan Çalhanoğlu', slug: 'hakan-calhanoglu', category: 'futbolcu', bio: 'Inter Milan\'ın yıldız orta saha oyuncusu. Serbest vuruş uzmanı olarak dünyaca tanınan Türk milli futbolcu.', zodiacSign: 'Şubat - Balık', birthPlace: 'Mannheim, Almanya', birthDate: new Date('1994-02-08'), isVerified: true, followerCount: 14000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/hakancalhanoglu' }), achievements: JSON.stringify(['Serie A Şampiyonu', 'A Milli Takım Kaptanı']) },
    { name: 'Kerem Aktürkoğlu', slug: 'kerem-akturkoglu', category: 'futbolcu', bio: 'Borussia Dortmund\'un Türk yıldızı. Galatasaray\'dan Avrupa\'ya transfer olan yetenekli kanat oyuncusu.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1998-10-21'), isVerified: true, followerCount: 10000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/keremakturkoglu' }), achievements: JSON.stringify(['Süper Lig Şampiyonu', 'Şampiyonlar Ligi Golcüsü']) },
    { name: 'Ferdi Kadıoğlu', slug: 'ferdi-kadioglu', category: 'futbolcu', bio: 'Brighton & Hove Albion\'un çok yönlü oyuncusu. Fenerbahçe\'de parladıktan sonra Premier Lig\'e transfer olmuştur.', zodiacSign: 'Ekim - Terazi', birthPlace: 'Arnhem, Hollanda', birthDate: new Date('1999-10-07'), isVerified: true, followerCount: 7000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ferdikadioglu' }), achievements: JSON.stringify(['Premier Lig Oyuncusu', 'EURO 2024']) },
    { name: 'Hakan Şükür', slug: 'hakan-sukur', category: 'futbolcu', bio: 'Türk futbol tarihinin en büyük golcüsü. A Milli Takım\'ın gol kralı, 2002 Dünya Kupası\'nda tarih yazmıştır.', zodiacSign: 'Eylül - Başak', birthPlace: 'Adapazarı', birthDate: new Date('1971-09-01'), isVerified: true, followerCount: 15000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['2002 Dünya Kupası 3.lük', 'Süper Lig Gol Kralı', 'Milli Takım Rekortmeni']) },
    { name: 'İrfan Can Kahveci', slug: 'irfan-can-kahveci', category: 'futbolcu', bio: 'Fenerbahçe\'nin yıldız orta saha oyuncusu. Şampiyonlar Ligi\'nde hat-trick yapan nadir Türk futbolculardan.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'Trabzon', birthDate: new Date('1995-07-15'), isVerified: true, followerCount: 6000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/irfancankahveci' }), achievements: JSON.stringify(['Şampiyonlar Ligi Hat-trick', 'Süper Lig Yılın Oyuncusu']) },
    // ── FUTBOL KULÜPLERİ ──
    { name: 'Galatasaray', slug: 'galatasaray', category: 'futbol_kulubu', bio: 'Türkiye\'nin en başarılı futbol kulübü. UEFA Kupası ve Süper Kupa şampiyonu, 24 Süper Lig şampiyonluğu. Aslan lakaplı sarı-kırmızılı dev.', zodiacSign: '', birthPlace: 'İstanbul', isVerified: true, followerCount: 50000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/galatasaray' }), achievements: JSON.stringify(['UEFA Kupası', 'UEFA Süper Kupa', '24 Lig Şampiyonluğu']) },
    { name: 'Fenerbahçe', slug: 'fenerbahce', category: 'futbol_kulubu', bio: 'Türkiye\'nin en köklü spor kulüplerinden biri. Sarı Kanarya lakaplı, milyonlarca taraftarıyla Türk futbolunun devlerinden.', zodiacSign: '', birthPlace: 'İstanbul', isVerified: true, followerCount: 48000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/fenerbahce' }), achievements: JSON.stringify(['28 Lig Şampiyonluğu', 'Avrupa Başarıları']) },
    { name: 'Beşiktaş', slug: 'besiktas', category: 'futbol_kulubu', bio: 'Kara Kartal lakaplı İstanbul\'un köklü kulübü. 16 Süper Lig şampiyonluğuyla Türk futbolunun vazgeçilmez isimlerinden.', zodiacSign: '', birthPlace: 'İstanbul', isVerified: true, followerCount: 35000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/besiktas' }), achievements: JSON.stringify(['16 Lig Şampiyonluğu', 'Şampiyonlar Ligi Grup Liderliği']) },
    { name: 'Trabzonspor', slug: 'trabzonspor', category: 'futbol_kulubu', bio: 'Karadeniz\'in yıldızı Bordo-Mavililer. Anadolu\'nun en başarılı kulübü olarak Türk futbolunda önemli bir yere sahiptir.', zodiacSign: '', birthPlace: 'Trabzon', isVerified: true, followerCount: 20000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/trabzonspor' }), achievements: JSON.stringify(['7 Lig Şampiyonluğu', 'Avrupa Başarıları']) },
    // ── YOUTUBERLAR ──
    { name: 'Enes Batur', slug: 'enes-batur', category: 'youtuber', bio: 'Türkiye\'nin en çok abone olunan YouTuber\'ı. Eğlence, challenge ve vlog içerikleriyle milyonlarca takipçiye ulaşmıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'Karabük', birthDate: new Date('1998-06-29'), isVerified: true, followerCount: 18000, profileImage: '/celebrities/enes_batur.jpg', socialLinks: JSON.stringify({ youtube: 'https://youtube.com/enesbatur' }), achievements: JSON.stringify(['Türkiye #1 YouTuber', '30M+ Abone', 'Sinema Filmi']) },
    { name: 'Berkcan Güven', slug: 'berkcan-guven', category: 'youtuber', bio: 'Türkiye\'nin en popüler YouTuber\'larından biri. Eğlence, skeç ve deneysel içerikleriyle geniş kitlelere ulaşmıştır.', zodiacSign: 'Haziran - İkizler', birthPlace: 'İstanbul', birthDate: new Date('1996-06-28'), isVerified: true, followerCount: 12000, socialLinks: JSON.stringify({ youtube: 'https://youtube.com/berkcanguven' }), achievements: JSON.stringify(['10M+ Abone', 'YouTube Creator Award']) },
    { name: 'Orkun Işıtmak', slug: 'orkun-isitmak', category: 'youtuber', bio: 'Komedi ve eğlence içerikleriyle Türkiye\'nin en çok izlenen YouTuber\'larından biri. Kendine özgü tarzıyla milyonları güldürmektedir.', zodiacSign: 'Ekim - Terazi', birthPlace: 'İstanbul', birthDate: new Date('1992-10-02'), isVerified: true, followerCount: 10000, socialLinks: JSON.stringify({ youtube: 'https://youtube.com/orkunisitmak' }), achievements: JSON.stringify(['13M+ Abone', 'YouTube Creator Award']) },
    { name: 'Ruhi Çenet', slug: 'ruhi-cenet', category: 'youtuber', bio: 'Bilim, gizem ve belgesel tarzı içerikleriyle Türkiye\'nin en çok izlenen bilgi kanallarından birinin sahibi.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1995-01-06'), isVerified: true, followerCount: 13000, socialLinks: JSON.stringify({ youtube: 'https://youtube.com/ruhicenet' }), achievements: JSON.stringify(['12M+ Abone', 'Bilgi İçerik Kralı']) },
    { name: 'Duygu Özaslan', slug: 'duygu-ozaslan', category: 'youtuber', bio: 'Güzellik, makyaj ve yaşam tarzı içerikleriyle Türkiye\'nin en popüler kadın YouTuber\'larından biri.', zodiacSign: 'Eylül - Başak', birthPlace: 'İstanbul', birthDate: new Date('1993-09-18'), isVerified: true, followerCount: 7000, socialLinks: JSON.stringify({ youtube: 'https://youtube.com/duyguozaslan' }), achievements: JSON.stringify(['5M+ Abone', 'Güzellik İçerik Üreticisi']) },
    // ── INFLUENCERLAR ──
    { name: 'Danla Bilic', slug: 'danla-bilic', category: 'influencer', bio: 'Türkiye\'nin en tanınan influencer\'larından biri. Güzellik, makyaj ve yaşam tarzı içerikleriyle milyonlarca kişiye ilham vermektedir.', zodiacSign: 'Mart - Balık', birthPlace: 'İstanbul', birthDate: new Date('1994-03-01'), isVerified: true, followerCount: 12000, profileImage: '/celebrities/danla_bilic.jpg', socialLinks: JSON.stringify({ instagram: 'https://instagram.com/danlabilic' }), achievements: JSON.stringify(['Influencer of the Year', '10M+ Takipçi']) },
    { name: 'Amine Gülşe', slug: 'amine-gulse', category: 'influencer', bio: 'Model, güzellik kraliçesi ve sosyal medya fenomeni. Mesut Özil\'in eşi olarak da tanınmaktadır.', zodiacSign: 'Nisan - Koç', birthPlace: 'Göteborg, İsveç', birthDate: new Date('1993-04-30'), isVerified: true, followerCount: 9000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/aminegulse' }), achievements: JSON.stringify(['Miss Turkey', '6M+ Instagram Takipçi']) },
    { name: 'Şeyma Subaşı', slug: 'seyma-subasi', category: 'influencer', bio: 'Moda ve yaşam tarzı influencer\'ı. Sosyal medyada paylaştığı lüks yaşam tarzı ve moda içerikleriyle tanınır.', zodiacSign: 'Temmuz - Aslan', birthPlace: 'İstanbul', birthDate: new Date('1990-07-20'), isVerified: true, followerCount: 8000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/seymasubasi' }), achievements: JSON.stringify(['5M+ Instagram Takipçi', 'Moda İkonu']) },
    // ── MÜZİSYENLER ──
    { name: 'Fazıl Say', slug: 'fazil-say', category: 'muzisyen', bio: 'Dünyaca ünlü Türk piyanist ve besteci. Klasik müzik ile Türk müziğini harmanlayan özgün eserleriyle tanınır.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'Ankara', birthDate: new Date('1970-01-14'), isVerified: true, followerCount: 7000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Uluslararası Konserler', 'Grammy Adaylığı', 'Besteci']) },
    { name: 'Mercan Dede', slug: 'mercan-dede', category: 'muzisyen', bio: 'Sufi müzik ile elektronik müziği birleştiren dünyaca ünlü Türk müzisyen ve DJ. Ney, bendir gibi geleneksel enstrümanları modern müzikle harmanlıyor.', zodiacSign: 'Eylül - Başak', birthPlace: 'Bursa', birthDate: new Date('1966-09-27'), isVerified: true, followerCount: 5000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/mercandede' }), achievements: JSON.stringify(['Dünya Müzik Ödülleri', 'Uluslararası Festivaller']) },
    { name: 'Ceza', slug: 'ceza', category: 'muzisyen', bio: 'Türk rap müziğinin efsanesi. Holocaust, Suspus, Neyim Var Ki gibi albümleriyle Türkçe rap\'in dünyaya açılmasına öncülük etmiştir.', zodiacSign: 'Aralık - Yay', birthPlace: 'İstanbul', birthDate: new Date('1976-12-31'), isVerified: true, followerCount: 14000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/caborhani' }), achievements: JSON.stringify(['Türkçe Rap Efsanesi', 'Eminem ile Düet', '100M+ Dinlenme']) },
    { name: 'Sagopa Kajmer', slug: 'sagopa-kajmer', category: 'muzisyen', bio: 'Türk rap müziğinin usta ismi. Lirik yapısı ve derin sözleriyle rap müziğin entelektüel yüzü olarak kabul edilir.', zodiacSign: 'Nisan - Koç', birthPlace: 'İstanbul', birthDate: new Date('1978-04-16'), isVerified: true, followerCount: 10000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Türkçe Rap Ustası', 'Kolera ile Ortak Projeler']) },
    // ── YÖNETMENLER ──
    { name: 'Nuri Bilge Ceylan', slug: 'nuri-bilge-ceylan', category: 'yonetmen', bio: 'Cannes Film Festivali Altın Palmiye ödüllü Türk yönetmen. Kış Uykusu, Bir Zamanlar Anadolu\'da gibi başyapıtlarıyla dünya sinemasında Türkiye\'yi temsil etmektedir.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İstanbul', birthDate: new Date('1959-01-26'), isVerified: true, followerCount: 8000, profileImage: '/celebrities/nuri_bilge_ceylan.jpg', socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Cannes Altın Palmiye', 'Grand Prix', 'En İyi Yönetmen']) },
    { name: 'Ferzan Özpetek', slug: 'ferzan-ozpetek', category: 'yonetmen', bio: 'İtalya\'da yaşayan Türk yönetmen. Hamam, Harem Suare, Cahil Periler gibi filmleriyle uluslararası arenada büyük başarı kazanmıştır.', zodiacSign: 'Şubat - Balık', birthPlace: 'İstanbul', birthDate: new Date('1959-02-03'), isVerified: true, followerCount: 6000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['David di Donatello Ödülü', 'Uluslararası Festival Ödülleri']) },
    { name: 'Zeki Demirkubuz', slug: 'zeki-demirkubuz', category: 'yonetmen', bio: 'Bağımsız Türk sinemasının öncü ismi. Masumiyet, Yeraltı, Kader gibi filmleriyle derin insan hikayeleri anlatır.', zodiacSign: 'Eylül - Başak', birthPlace: 'Isparta', birthDate: new Date('1964-09-20'), isVerified: true, followerCount: 4000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Altın Portakal', 'Venedik Film Festivali']) },
    // ── DİZİLER ──
    { name: 'Kurtlar Vadisi', slug: 'kurtlar-vadisi', category: 'dizi', bio: 'Türk televizyon tarihinin en uzun soluklu ve en çok izlenen aksiyon-dram dizisi. Polat Alemdar karakteri kült bir figür haline gelmiştir.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 35000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['En Uzun Türk Dizisi', 'Kült Dizi', 'Sinema Filmleri']) },
    { name: 'Muhteşem Yüzyıl', slug: 'muhtesem-yuzyil', category: 'dizi', bio: 'Kanuni Sultan Süleyman dönemini anlatan tarihi dram. 50\'den fazla ülkede yayınlanarak Türk dizilerinin dünyaya açılmasını sağlamıştır.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 30000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['50+ Ülkede Yayın', 'En Çok İzlenen Türk Dizisi', 'Uluslararası Emmy Adayı']) },
    { name: 'Kara Sevda', slug: 'kara-sevda', category: 'dizi', bio: 'Uluslararası Emmy ödüllü Türk dizisi. Kemal ve Nihan\'ın aşk hikayesiyle dünya çapında milyonları ekrana kilitlemiştir.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 25000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Uluslararası Emmy Ödülü', 'Dünya Çapında Yayın']) },
    { name: 'Diriliş Ertuğrul', slug: 'dirilis-ertugrul', category: 'dizi', bio: 'Osmanlı Devleti\'nin kuruluş dönemini anlatan tarihi dizi. 100\'den fazla ülkede yayınlanarak büyük ilgi görmüştür.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 28000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['100+ Ülkede Yayın', 'Pakistan Fenomeni']) },
    { name: 'Çukur', slug: 'cukur-dizi', category: 'dizi', bio: 'İstanbul\'un Çukur mahallesinde geçen aksiyon ve dram dolu dizi. Koçovalı ailesi hikayesiyle büyük izlenme rekorları kırmıştır.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 18000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['İzlenme Rekorları', 'YouTube Hit']) },
    { name: 'Yargı', slug: 'yargi-dizi', category: 'dizi', bio: 'Pınar Deniz ve Kaan Urgancıoğlu\'nun başrollerinde olduğu gerilim-dram dizisi. Son yılların en çok izlenen Türk yapımı.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 20000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Reyting Rekortmeni', 'Altın Kelebek Ödülü']) },
    // ── FİLM YAPIMLAR ──
    { name: 'Recep İvedik', slug: 'recep-ivedik', category: 'film_yapim', bio: 'Şahan Gökbakar\'ın hayat verdiği Recep İvedik karakterinin maceralarını konu alan komedi film serisi. Gişe rekorları kırmıştır.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 22000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Gişe Rekortmeni', '7 Film', 'Türk Sinema Tarihinin En Çok İzlenen Filmi']) },
    { name: 'Ayla', slug: 'ayla-film', category: 'film_yapim', bio: 'Kore Savaşı\'nda Türk askeri Süleyman\'ın küçük Koreli kız Ayla\'yı sahiplenmesini anlatan gerçek hayat hikayesi.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 12000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Oscar Adayı', 'Uluslararası Ödüller', 'Gerçek Hikaye']) },
    { name: 'Müslüm', slug: 'muslum-film', category: 'film_yapim', bio: 'Arabesk müziğin efsanesi Müslüm Gürses\'in hayatını konu alan biyografi filmi. Gişede büyük başarı yakalamıştır.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 10000, socialLinks: JSON.stringify({}), achievements: JSON.stringify(['Gişe Rekoru', 'En Çok İzlenen Biyografi']) },
    // ── STREAMING PLATFORMLARI ──
    { name: 'BluTV', slug: 'blutv', category: 'streaming', bio: 'Türkiye\'nin ilk ve en büyük yerli dijital yayın platformu. Yeşilçam, Behzat Ç. Bir Ankara Polisiyesi gibi orijinal içeriklerle öne çıkıyor.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 15000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/blaborhani' }), achievements: JSON.stringify(['Türkiye\'nin İlk Dijital Platformu', 'Orijinal İçerikler']) },
    { name: 'Exxen', slug: 'exxen', category: 'streaming', bio: 'Acun Ilıcalı\'nın kurduğu dijital yayın platformu. Şampiyonlar Ligi yayın hakları ve orijinal içeriklerle hızla büyüyor.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 12000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/exxen' }), achievements: JSON.stringify(['Şampiyonlar Ligi Yayıncısı', 'Orijinal Yapımlar']) },
    { name: 'Gain', slug: 'gain', category: 'streaming', bio: 'Türk Telekom\'un dijital yayın platformu. Türk yapımı dizi ve filmlere ağırlık veren içerik stratejisiyle dikkat çekiyor.', zodiacSign: '', birthPlace: '', isVerified: true, followerCount: 8000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/gaborhani' }), achievements: JSON.stringify(['Yerli İçerik Odaklı', 'Orijinal Yapımlar']) },
    // ── KOMEDYENLER ──
    { name: 'Cem Yılmaz', slug: 'cem-yilmaz', category: 'komedyen', bio: 'Türkiye\'nin en ünlü komedyeni ve sinema yıldızı. G.O.R.A., A.R.O.G., Yahşi Batı gibi gişe rekorları kıran filmlerin yaratıcısı.', zodiacSign: 'Nisan - Koç', birthPlace: 'İstanbul', birthDate: new Date('1973-04-23'), isVerified: true, followerCount: 20000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/cmylmz' }), achievements: JSON.stringify(['Gişe Rekortmeni', 'Stand-up Efsanesi', 'GORA, AROG']) },
    { name: 'Şahan Gökbakar', slug: 'sahan-gokbakar', category: 'komedyen', bio: 'Recep İvedik karakteriyle Türk sinema tarihinin en çok izlenen filmlerinin yaratıcısı. Stand-up gösterileriyle de büyük ilgi görür.', zodiacSign: 'Temmuz - Yengeç', birthPlace: 'Ankara', birthDate: new Date('1980-07-01'), isVerified: true, followerCount: 15000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/sahangokbakar' }), achievements: JSON.stringify(['Gişe Rekoru Sahibi', 'Recep İvedik Serisi']) },
    { name: 'Ata Demirer', slug: 'ata-demirer', category: 'komedyen', bio: 'Türk komedisinin efsane ismi. Eyvah Eyvah film serisinin yaratıcısı. Stand-up gösterileri ve filmleriyle geniş kitlelere ulaşmaktadır.', zodiacSign: 'Ocak - Oğlak', birthPlace: 'İzmir', birthDate: new Date('1972-01-29'), isVerified: true, followerCount: 9000, socialLinks: JSON.stringify({ instagram: 'https://instagram.com/ataborhani' }), achievements: JSON.stringify(['Eyvah Eyvah Serisi', 'Stand-up Ustası']) },
  ]

  for (const celeb of celebrities) {
    const { slug, ...rest } = celeb
    await prisma.celebrity.upsert({
      where: { slug },
      update: rest,
      create: celeb,
    })
  }
  console.log('Celebrities seeded!')

  // Ünlüler homepage button removed

  // Add Trendler homepage button
  await prisma.homepageButton.upsert({
    where: { key: 'trendler' },
    update: {},
    create: {
      key: 'trendler',
      label: 'Trendler',
      icon: '🔥',
      href: '/trendler',
      isVisible: true,
      sortOrder: 13,
    },
  })
  console.log('Trendler homepage button seeded!')

  // Add Premium Üyelik homepage button
  await prisma.homepageButton.upsert({
    where: { key: 'premium' },
    update: {},
    create: {
      key: 'premium',
      label: 'Premium',
      icon: '👑',
      href: '/uyelik',
      isVisible: true,
      sortOrder: 14,
    },
  })
  console.log('Premium homepage button seeded!')

  // Add Futbol homepage button
  await prisma.homepageButton.upsert({
    where: { key: 'futbol' },
    update: {},
    create: {
      key: 'futbol',
      label: 'Futbol',
      icon: '\u26bd',
      href: '/futbol',
      sortOrder: 14,
    },
  })
  console.log('Futbol homepage button seeded!')

  // Add Dizi & Film homepage button
  await prisma.homepageButton.upsert({
    where: { key: 'dizi-film' },
    update: {},
    create: {
      key: 'dizi-film',
      label: 'Dizi & Film',
      icon: '\ud83c\udfac',
      href: '/dizi-film',
      sortOrder: 15,
    },
  })
  console.log('Dizi & Film homepage button seeded!')

  // Add Videolar homepage button
  await prisma.homepageButton.upsert({
    where: { key: 'videolar' },
    update: {},
    create: {
      key: 'videolar',
      label: 'Videolar',
      icon: '▶️',
      href: '/videolar',
      sortOrder: 16,
    },
  })
  console.log('Videolar homepage button seeded!')

  // Seed trending topics
  const trendingTopics = [
    {
      title: 'Mayıs Ayı Burç Yorumları',
      slug: 'mayis-ayi-burc-yorumlari',
      category: 'burc',
      icon: '⭐',
      description: 'Mayıs ayında burçları neler bekliyor? Aşk, kariyer ve sağlık yorumlarınız burada.',
      trendScore: 950,
      isPinned: true,
      relatedUrl: '/fallar/burc-yorumu',
      tags: JSON.stringify(['burç', 'astroloji', 'mayıs']),
    },
    {
      title: 'Tarot Kartları ile Geleceğinizi Keşfedin',
      slug: 'tarot-kartlari-gelecek',
      category: 'fal',
      icon: '🃏',
      description: 'AI destekli tarot falı ile geleceğinize dair ipuçları alın.',
      trendScore: 880,
      isPinned: true,
      relatedUrl: '/fallar/tarot-fali',
      tags: JSON.stringify(['tarot', 'fal', 'gelecek']),
    },

    {
      title: 'Kahve Falı Haftanın Trendi',
      slug: 'kahve-fali-haftanin-trendi',
      category: 'fal',
      icon: '☕',
      description: 'Bu hafta en çok bakılan fal türü: Türk kahvesi falı! Siz de deneyin.',
      trendScore: 750,
      relatedUrl: '/fallar/kahve-fali',
      tags: JSON.stringify(['kahve falı', 'türk kahvesi', 'fal']),
    },
    {
      title: 'Rüya Tabiri Rehberi',
      slug: 'ruya-tabiri-rehberi',
      category: 'genel',
      icon: '🌙',
      description: 'Rüyanızı anlatın, yapay zeka destekli rüya yorumu alın.',
      trendScore: 700,
      relatedUrl: '/fallar/ruya-yorumu',
      tags: JSON.stringify(['rüya', 'tabir', 'yorum']),
    },
    {
      title: 'Canlı Yayın Etkinlikleri',
      slug: 'canli-yayin-etkinlikleri',
      category: 'etkinlik',
      icon: '🎬',
      description: 'Haftalık canlı fal seansları ve özel etkinlikler.',
      trendScore: 650,
      tags: JSON.stringify(['canlı', 'etkinlik', 'yayın']),
    },
    {
      title: 'Numeroloji ile Şanslı Sayılarınız',
      slug: 'numeroloji-sansli-sayilar',
      category: 'fal',
      icon: '🔢',
      description: 'Doğum tarihinize göre şanslı sayılarınızı öğrenin.',
      trendScore: 600,
      relatedUrl: '/fallar/numeroloji',
      tags: JSON.stringify(['numeroloji', 'sayı', 'şans']),
    },
    {
      title: 'Oyun Turnuvaları Başlıyor',
      slug: 'oyun-turnuvalari-basliyor',
      category: 'oyun',
      icon: '🎮',
      description: 'Haftalık oyun turnuvalarında jeton ödülleri kazanın!',
      trendScore: 550,
      relatedUrl: '/oyunlar',
      tags: JSON.stringify(['oyun', 'turnuva', 'ödül']),
    },
  ]

  for (const topic of trendingTopics) {
    await prisma.trendingTopic.upsert({
      where: { slug: topic.slug },
      update: {},
      create: topic,
    })
  }
  console.log('Trending topics seeded!')

  // ═══ CELEBRITY POSTS (Social Media) ═══
  const celebrityPostsData = [
    { celebritySlug: 'tarkan', platform: 'instagram', postType: 'photo', content: 'Yeni albümün hazırlıkları devam ediyor 🎶 Yakında sizlerle buluşacağız!', mediaUrl: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', likeCount: 12500 },
    { celebritySlug: 'tarkan', platform: 'youtube', postType: 'video', content: 'Konser backstage görüntüleri 🎤', mediaUrl: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', likeCount: 8400 },
    { celebritySlug: 'tarkan', platform: 'x', postType: 'tweet', content: 'Müzik ruhumun sesi. Her notada sizleri hissediyorum ❤️', likeCount: 5200 },
    { celebritySlug: 'hande-ercel', platform: 'instagram', postType: 'photo', content: 'Yeni dizi çekimleri başladı! 🎬 Çok heyecanlıyım', mediaUrl: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', likeCount: 45000 },
    { celebritySlug: 'hande-ercel', platform: 'instagram', postType: 'reel', content: 'Makyaj rutini 💄 #makeuptutorial', mediaUrl: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', likeCount: 32000 },
    { celebritySlug: 'hande-ercel', platform: 'tiktok', postType: 'video', content: 'Dans challenge! 💃', mediaUrl: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', likeCount: 67000 },
    { celebritySlug: 'arda-guler', platform: 'instagram', postType: 'photo', content: 'Antrenman sonrası 💪⚽ #HalaMadrid', mediaUrl: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', likeCount: 89000 },
    { celebritySlug: 'arda-guler', platform: 'x', postType: 'tweet', content: 'Maça hazırız! 🔥 Bugün tribünlerde buluşalım!', likeCount: 15000 },
    { celebritySlug: 'kemal-sunal', platform: 'instagram', postType: 'photo', content: 'Hababam Sınıfı\'ndan unutulmaz kareler 📸 Efsane hiç eskimez!', mediaUrl: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', likeCount: 9800 },
    { celebritySlug: 'kemal-sunal', platform: 'youtube', postType: 'video', content: 'En komik Şaban sahneleri derleme 😂', mediaUrl: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', likeCount: 22000 },
  ]

  for (const postData of celebrityPostsData) {
    const celebrity = await prisma.celebrity.findUnique({ where: { slug: postData.celebritySlug } })
    if (celebrity) {
      // Use upsert-like behavior: check if post with same content exists
      const existing = await prisma.celebrityPost.findFirst({
        where: { celebrityId: celebrity.id, content: postData.content },
      })
      if (!existing) {
        await prisma.celebrityPost.create({
          data: {
            celebrityId: celebrity.id,
            platform: postData.platform,
            postType: postData.postType,
            content: postData.content,
            mediaUrl: postData.mediaUrl || null,
            likeCount: postData.likeCount || 0,
          },
        })
      }
    }
  }
  console.log('Celebrity posts seeded!')

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