import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Turkish Names ──
const FEMALE_NAMES = [
  'Elif', 'Zeynep', 'Ayşe', 'Fatma', 'Merve', 'Büşra', 'Seda', 'Esra', 'Derya', 'Hülya',
  'Gamze', 'Gizem', 'İrem', 'Pınar', 'Cansu', 'Tuğba', 'Ebru', 'Sibel', 'Nihan', 'Melis',
  'Deniz', 'Ece', 'Burcu', 'Sevgi', 'Yasemin', 'Hatice', 'Emine', 'Şeyma', 'Cemre', 'Buse',
  'Aslı', 'Damla', 'Gül', 'Dilek', 'Selin', 'Özlem', 'Neslihan', 'Betül', 'Canan', 'Işıl',
  'Dilara', 'Seher', 'Beyza', 'Melisa', 'Simge', 'Ezgi', 'Aleyna', 'Sude', 'Ilgın', 'Ceyda'
]

const MALE_NAMES = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Emre', 'Burak', 'Hakan', 'Oğuz', 'Serkan', 'Cem',
  'Berk', 'Kaan', 'Ufuk', 'Murat', 'Deniz', 'Onur', 'Volkan', 'Tolga', 'Barış', 'Can',
  'Selim', 'Eren', 'Yusuf', 'İbrahim', 'Furkan', 'Kerem', 'Arda', 'Doruk', 'Alp', 'Emir',
  'Tarik', 'Umut', 'Fatih', 'Okan', 'Cenk', 'Koray', 'Sinan', 'Levent', 'Tuna', 'Baran',
  'Yiğit', 'Batuhan', 'Adem', 'Ogün', 'Rüzgar', 'Çağlar', 'Tugay', 'Kubilay', 'Berke', 'Ege'
]

const SURNAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Doğan', 'Arslan', 'Aydın', 'Özdemir', 'Koç',
  'Yıldız', 'Öztürk', 'Erdoğan', 'Kılıç', 'Aslan', 'Yıldırım', 'Polat', 'Kurt', 'Özkan', 'Güneş',
  'Aktaş', 'Taş', 'Acar', 'Korkmaz', 'Çetin', 'Ünal', 'Kaplan', 'Bulut', 'Aksoy', 'Tunç',
  'Güler', 'Toprak', 'Bozkurt', 'Sarı', 'Keskin', 'Bayrak', 'Ateş', 'Gül', 'Kara', 'Tekin',
  'Uçar', 'Balcı', 'Kartal', 'Durmaz', 'Sönmez', 'Erdem', 'Başaran', 'Uzun', 'Tan', 'Sezer'
]

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Mersin', 'Kayseri', 'Eskişehir', 'Trabzon', 'Samsun', 'Denizli', 'Muğla',
  'Diyarbakır', 'Sakarya', 'Manisa', 'Balıkesir', 'Tekirdağ'
]

const PERSONALITIES = ['shy', 'aggressive', 'funny', 'flirty', 'serious'] as const
type Personality = typeof PERSONALITIES[number]

const ZODIAC_SIGNS = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
]

const INTERESTS_POOL = [
  'Astroloji', 'Tarot', 'Meditasyon', 'Yoga', 'Müzik', 'Sinema', 'Kitap', 'Yemek',
  'Seyahat', 'Fotoğrafçılık', 'Dans', 'Doğa', 'Spor', 'Teknoloji', 'Moda', 'Sanat',
  'Kahve Falı', 'Rüya Tabiri', 'Numeroloji', 'Şiir', 'Tiyatro', 'Bahçe', 'El Sanatları',
  'Hayvanlar', 'Psikoloji', 'Felsefe', 'Tarih', 'Oyun', 'Dizi', 'Burçlar'
]

// ── Bio templates per personality ──
const BIO_TEMPLATES: Record<Personality, string[]> = {
  shy: [
    'Sessiz bir ruh, kitaplarla dost 📚',
    'Gözlemci biriyim, az konuşurum ama çok dinlerim 🌙',
    'Doğa ve huzur arayan birisi 🌿',
    'Kitap kurduyum, sohbet seviyorum ama utanıyorum 😊',
    'Sessizce takılıyorum, merhaba demekten çekinmeyin',
    'Astroloji meraklısıyım ama sormaya utanıyorum 🔮',
    'İçe dönük ama sıcak biriyim 🤗',
    'Kahve ve kitap, başka bir şey istemem ☕',
    'Yalnızlığı seven ama dostluğa açık birisi',
    'Az söyle öz söyle modundayım 🌸',
    'Müzik dinlemek ruhumu besler 🎵',
    'Genelde dinliyorum, bazen yazıyorum',
    'Burçlarla ilgileniyorum, anlatın dinleyeyim 🌟',
    'Bir köşede sessizce oturuyorum ama burdayım',
    'Kendi halinde birisi, merak etmeyin ısırıcı değilim 😅',
    'Rüyalarımı çok merak ediyorum, biri yorumlasın 💭',
    'Çekingen ama samimi biriyim, tanıyınca görürsünüz',
    'Huzurlu bir ortam arıyorum 🕊️',
    'Düşüncelerimle baş başayım genelde',
    'Fal baktırmak istiyorum ama cesaret edemiyorum 🙈'
  ],
  aggressive: [
    'Dobra biriyim, yalan yok! 💪',
    'Direkt konuşurum, alıngan olanlar uzak dursun 🔥',
    'Net biriyim, boş muhabbete gelemem',
    'Hayatta her şeyi denerim, korkak değilim ⚡',
    'Enerjim yüksek, sıkıcı insanlardan hoşlanmam',
    'Laf kalabalığına tahammülüm yok',
    'Burcum Koç, savaşçı ruhum var 🐏',
    'Adalet arayışındayım her zaman ⚖️',
    'Gerçekleri söylerim, hoşuna gitmese de',
    'Güçlü kadın/adam seviyorum, zayıf durma!',
    'Kendini bilmeyen uzak dursun!',
    'Enerjimi boşuna harcamam, direkt konuya girerim',
    'Tartışmacı değilim ama haklıyken susmam',
    'Sahte insanları 3 saniyede anlarım 👁️',
    'Karakter en önemli şey bence',
    'Boş yapanları engelliyorum, kusura bakmayın',
    'Hayatta bir kere yaşıyoruz, tam gaz!',
    'Düşmanıma bile dürüstüm 🗡️',
    'Lafını esirgemem, alışın buna',
    'Cesur ol ya da evde kal 🏠'
  ],
  funny: [
    'Hayatın tuzu biberiyim 😂',
    'Güldürmek benim işim, ağlamak başkalarının 🤣',
    'Espri yapmadan duramıyorum, affola 😜',
    'Komik miyim yoksa komik mi görünüyorum? 🤔',
    'Hayatta ciddi olmayı beceremiyorum lol',
    'Fıkra gibi hayatım var, anlatayım mı? 😆',
    'Gülmek bedava, somurtmak pahalı 😎',
    'Burçumu sormayın, güldüren her burcu severim',
    'Ortamın neşesi benim, pişman olmayın 🎉',
    'Beni tanıyan güler, tanımayan da güler sonunda',
    'Mizah dozum yüksek, hazırlıklı gelin 🃏',
    'Ciddiye almayın beni, ben bile almıyorum',
    'Esprilerim soğuk olabilir, üşütmeyin kendinizi 🥶',
    'Kahkaha garantili sohbet sunuyorum 🎪',
    'Gülerken ölen olursa sorumluluk kabul etmem 💀',
    'Neşeliyim, enerjik, bazen fazla 😅',
    'Hayatı şaka gibi yaşıyorum, ciddi şeyler bilmem',
    'Muhabbet kuşuyum, dur durduramıyorum kendimi 🦜',
    'Fal baktırıyorum ama gülmekten anlayamıyorum 😂',
    'Eğlencenin adresi benim, buyrun gelin'
  ],
  flirty: [
    'Gözlerin güzelmiş, okuyorum şu an 😏',
    'Romantik biriyim, aşka inanırım 💕',
    'Flört etmeyi seviyorum, kızmayın 😘',
    'Kalbim kocaman, yeriniz var 💖',
    'Aşk mı? Her zaman hazırım ❤️‍🔥',
    'Tatlı dilli biriyim, laf atarım ama nazikçe 🌹',
    'Gülümsemen yeter bana, gerisi kolay 😊',
    'Burç uyumu merak ediyorum, burcun ne? 💫',
    'İlgi dağıtan biriyim, kusura bakmayın 🦋',
    'Romantik şarkılar ve güzel sohbetler isterim 🎶',
    'Kalbimi kırmayın, hassasım 🥺',
    'Aşkı arıyorum, bilen varsa haber versin 💘',
    'Gözlerinin rengini merak ettim 👀',
    'İltifat etmek benim doğam, alışın 💐',
    'Sevgi dolu biriyim, sevilmeyi de hak ediyorum',
    'Falda aşk çıksa keşke... 🔮❤️',
    'Rüyamda birini gördüm, sen misin acaba? 💭',
    'Mutlu etmek istiyorum, sadece şans verin 🌺',
    'Tatlım, bugün güzel bir gün olacak 🌞',
    'Burcumuz uyuyor mu bakalım? ♥️'
  ],
  serious: [
    'Hayatta ciddiyet önemlidir 📖',
    'İlim, irfan ve kültür peşindeyim',
    'Astroloji bilimsel olarak ilgimi çekiyor 🔬',
    'Felsefe ve psikoloji meraklısıyım',
    'Boş muhabbetten hoşlanmam, konu konuşalım',
    'Kitap okurum, araştırırım, bilgi paylaşırım 📚',
    'Numeroloji ve astroloji üzerine çalışıyorum',
    'Hayatın anlamını arıyorum, ciddiyetle',
    'Kültürlü sohbet istiyorum, gel konuşalım',
    'Tarih ve felsefe tutkusu var içimde',
    'Mantıklı düşünceler beni cezbeder 🧠',
    'Derin konuşmalar severim, yüzeysel değil',
    'Kendimi geliştirmek en büyük hobim',
    'Meditasyon ve iç huzur önemli 🧘',
    'Saygı çerçevesinde her şeyi konuşabiliriz',
    'Bilgi paylaştıkça çoğalır',
    'Rüya yorumlarının psikolojik boyutu ilgimi çeker',
    'Entelektüel sohbet arıyorum 🎓',
    'Karakter ve tutarlılık, en değer verdiğim şeyler',
    'Eleştirel düşünce becerimi geliştiriyorum'
  ]
}

// ── Helpers ──
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a }

function generateUsername(name: string, index: number): string {
  const clean = name.toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/İ/g, 'i')
    .replace(/[^a-z0-9]/g, '')
  const suffix = randInt(1, 999)
  return `${clean}${suffix}`
}

function generateBirthDate(age: number): Date {
  const now = new Date()
  const year = now.getFullYear() - age
  const month = randInt(0, 11)
  const day = randInt(1, 28)
  return new Date(year, month, day)
}

function getZodiacFromDate(d: Date): string {
  const m = d.getMonth() + 1, day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Koç'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Boğa'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'İkizler'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Yengeç'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Aslan'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Başak'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Terazi'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Akrep'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Yay'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Oğlak'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Kova'
  return 'Balık'
}

function pickInterests(): string[] {
  const count = randInt(2, 5)
  return shuffle(INTERESTS_POOL).slice(0, count)
}

// Avatar URL using DiceBear (deterministic, no API key needed)
function avatarUrl(seed: string, gender: 'female' | 'male'): string {
  const style = gender === 'female' ? 'avataaars' : 'avataaars'
  return `https://i.ytimg.com/vi/hQdjFpHmTu0/maxresdefault.jpg`
}

async function main() {
  console.log('🤖 Bot kullanıcıları oluşturuluyor...')

  const existingBotCount = await prisma.user.count({ where: { isBot: true } })
  if (existingBotCount >= 100) {
    console.log(`✅ Zaten ${existingBotCount} bot var, atlanıyor.`)
    return
  }

  const usedUsernames = new Set<string>()
  const usedEmails = new Set<string>()
  const hashedPassword = await bcrypt.hash('bot_user_no_login_2024!', 10)

  const bots: Array<{
    name: string
    username: string
    email: string
    gender: 'female' | 'male'
    personality: Personality
    age: number
    city: string
    bio: string
    interests: string[]
    birthDate: Date
    zodiacSign: string
  }> = []

  // Generate 55 female + 45 male bots
  for (let i = 0; i < 100; i++) {
    const isFemale = i < 55
    const firstName = isFemale ? FEMALE_NAMES[i % FEMALE_NAMES.length] : MALE_NAMES[(i - 55) % MALE_NAMES.length]
    const surname = SURNAMES[i % SURNAMES.length]
    const fullName = `${firstName} ${surname}`

    let username = generateUsername(firstName, i)
    while (usedUsernames.has(username)) {
      username = generateUsername(firstName + randInt(1, 99), i)
    }
    usedUsernames.add(username)

    let email = `bot_${username}@canlifal.local`
    while (usedEmails.has(email)) {
      email = `bot_${username}${randInt(1, 99)}@canlifal.local`
    }
    usedEmails.add(email)

    const personality = PERSONALITIES[i % PERSONALITIES.length]
    const age = randInt(18, 55)
    const city = rand(CITIES)
    const bio = rand(BIO_TEMPLATES[personality])
    const interests = pickInterests()
    const birthDate = generateBirthDate(age)
    const zodiacSign = getZodiacFromDate(birthDate)

    bots.push({
      name: fullName,
      username,
      email,
      gender: isFemale ? 'female' : 'male',
      personality,
      age,
      city,
      bio,
      interests,
      birthDate,
      zodiacSign
    })
  }

  let created = 0
  for (const bot of bots) {
    try {
      // Check if email or username already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: bot.email },
            { username: bot.username }
          ]
        }
      })
      if (existing) {
        console.log(`⏭️ ${bot.name} zaten var, atlanıyor`)
        continue
      }

      const avatarSeed = `${bot.username}_${bot.gender}`
      const actLevel = bot.personality === 'aggressive' ? 'high'
        : bot.personality === 'shy' ? 'low'
        : bot.personality === 'funny' ? 'high'
        : 'medium'

      await prisma.user.create({
        data: {
          email: bot.email,
          password: hashedPassword,
          name: bot.name,
          username: bot.username,
          image: avatarUrl(avatarSeed, bot.gender),
          bio: bot.bio,
          birthDate: bot.birthDate,
          zodiacSign: bot.zodiacSign,
          preferredLanguage: 'tr',
          isBot: true,
          role: 'user',
          credits: randInt(10, 200),
          jetonBalance: randInt(0, 50),
          xp: randInt(0, 500),
          level: randInt(1, 10),
          botProfile: {
            create: {
              personality: bot.personality,
              age: bot.age,
              city: bot.city,
              interests: JSON.stringify(bot.interests),
              activityLevel: actLevel,
              activeHoursStart: bot.personality === 'serious' ? 8 : randInt(7, 12),
              activeHoursEnd: bot.personality === 'aggressive' ? 2 : randInt(22, 24),
              isActive: true
            }
          }
        }
      })
      created++
      if (created % 10 === 0) console.log(`  ✅ ${created}/100 bot oluşturuldu...`)
    } catch (err: any) {
      console.error(`  ❌ ${bot.name} oluşturulamadı:`, err.message)
    }
  }

  console.log(`\n🎉 Toplam ${created} bot başarıyla oluşturuldu!`)

  // Print summary
  const stats = await prisma.botProfile.groupBy({
    by: ['personality'],
    _count: true
  })
  console.log('\n📊 Kişilik dağılımı:')
  for (const s of stats) {
    const label = { shy: 'Utangaç', aggressive: 'Agresif', funny: 'Komik', flirty: 'Flörtöz', serious: 'Ciddi' }[s.personality] || s.personality
    console.log(`  ${label}: ${s._count}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
