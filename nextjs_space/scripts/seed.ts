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