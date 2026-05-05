// ── Bot Message Templates by Personality ──
// Each personality has categories of messages for natural conversation

export type Personality = 'shy' | 'aggressive' | 'funny' | 'flirty' | 'serious'

export const GREETINGS: Record<Personality, string[]> = {
  shy: [
    'merhaba 😊', 'selam..', 'herkese merhaba', 'sa', 'selamlar',
    'merhba', 'hey 👋', 'selam herkese', 'mrb', 'sa 🌙'
  ],
  aggressive: [
    'naber lan', 'selam millet!', 'geldik geldik 🔥', 'SELAMM', 'sa beyler bayanlar',
    'hop geldim!', 'yoo naber', 'esenlikler', 'nbr', 'as 💪'
  ],
  funny: [
    'selamun aleyküm cemaaat 😂', 'geldi geldi esas kişi geldi', 'sa diyorum duyan var mı',
    'merhaba dünya 🌍', 'nbr kankalar', 'parti başlasın 🎉', 'selamm selamm',
    'geldik show başlasın', 'ya ben geldim ha', 'hop yine burdayyyy'
  ],
  flirty: [
    'selamm herkese 💕', 'merhaba güzeller 😘', 'selam tatlılar', 'mrb 🌹',
    'herkese mutlu akşamlar', 'selam canlar', 'günaydın güzel insanlar 🌞',
    'merhaba sevgili dostlar', 'saa ❤️', 'selam tışolar'
  ],
  serious: [
    'iyi akşamlar', 'merhaba arkadaşlar', 'selamlar herkese', 'hayırlı akşamlar',
    'merhaba', 'iyi günler', 'selamünaleyum', 'herkese iyi akşamlar',
    'hayırlı günler', 'merhabalar'
  ]
}

export const CHAT_MESSAGES: Record<Personality, string[]> = {
  shy: [
    'gerçekten mi', 'wow', 'ilginçmiş', 'öyle mi ya', 'ben de merak ediyorum',
    'haklısın bence', 'ayıp etme 😊', 'doğru söylüyorsun', 'güzel sözlemiş',
    '👍', 'katlıyorum', 'bence de öyle', 'çok doğru', 'aynı fikirdeyim',
    'vallaa bilmiyorum ama', 'aman neyse', 'sus pus oldum yine 😅',
    'konuşmak istiyorum ama çekiniyorum', 'haha güzelmiş', 'hmm anladım',
    'ben sessizce dinliyorum', 'ayıp oluyo sormak ama merak ettim',
    'ya çok güzel ortam', 'bir şey sorabilir miyim', 'dinliyorum sizi',
    'ne güzel sohbet var', 'bu odaya bayıldım', 'çok iyi muhabbetiniz var',
    'sessiz sedasız takip ediyorum', 'biraz utangacım kusura bakmayın'
  ],
  aggressive: [
    'hayır bence yanlış', 'dobra söyleyeyim', 'itiraz ediyorum', 'gerçekleri görün',
    'katılmıyorum buna', 'sakin olun biraz', 'ama şöyle düşünün',
    'bence haksızsınız', 'net söylüyorum', 'olur mu öyle şey',
    'yoo öyle değil', 'bir dakika dur', 'ok sen haklısın ama',
    'bu konuda uzlaşamıyoruz', 'bence tam tersi', 'lafı gevelemeyelim',
    'direkt söylüyorum', 'anlaşmak zor sizinle', 'kızma ama yanlış',
    'niye böyle düşünüyorsun ki', 'açıkça söyleyeyim',
    'hadi be ya ciddi misin', 'yok artık 🙄', 'bak şimdi açıklayayim',
    'ben olsam öyle yapmazdım', 'çok yanlış bence', 'hmm tartışılır'
  ],
  funny: [
    '😂😂😂', 'off çok iyiii', 'patladım ya', 'kim yazdı bunu hahaha',
    'yaa çok komik', 'espri patlatıyorum ama kimse gülmüyo', 'lol',
    'gülerken ölcem', 'bu ne ya hahaha', 'kesin ya 🤣',
    'biri beni durdursun gülmekten', 'sen çok komiksin ya',
    'muhabbet çok iyi bu gece', 'off gülmekten çenem ağrıdı',
    'comedy club burası galiba', 'bana güldüren adamı severim',
    'valla çok eğleniyorum', 'bu odaya bayılıyorum ya',
    'espri yapayım mı bi tane', 'şaka şaka 😜', 'ya dur gülme sırası bende',
    'gece gece gülmekten uyuyamcam', 'fıkra anlatın moralim bozuk',
    'muhabbet adamıyım ben', 'gülmek bedava arkadaşlar', 'ortam müq',
    'AHDSKFHKSDF', 'lann çok iyi', 'bi daha söyle 😂'
  ],
  flirty: [
    'çok tatlısın ya 😊', 'güzellik bu odada', 'kimin burcu ne acaba',
    'bu ortamda aşık olmamak elde değil', 'gözlerinizi merak ettim 👀',
    'tatlı bir sohbet oldu', 'çok naziksiniz ya', 'burcunuz ne acaba',
    'iyi ki bu odaya girdim 💕', 'sizinle konuşmak çok güzel',
    'bu akşam çok güzel', 'romantik bir müzik açsak', 'falda aşk çıksa keşke',
    'kalbim çarptı sanki 😏', 'aşk olsun bu gece', 'tatlı rüyalar dilerim 🌙',
    'kimin kalbi boş acaba 💘', 'bu sesle büyülendim', 'ne güzel insanlar var',
    'seni görsem tanır mıyım acaba', 'gözüm üzerde kaldı 😊',
    'kalp kalbe karşı derler', 'bu sohbetin tadı başka',
    'ya çok tatlı bi ortam', 'sevgiler gönderiyorum herkese ❤️',
    'güzel ruhlu insanlar burası 🥰'
  ],
  serious: [
    'bence bu konu önemli', 'biraz düşünmek lazım', 'mantıklı bir bakış açısı',
    'astrolojik olarak ilginç', 'bu konuda bir makale okumuştum',
    'doğru söylüyorsun ama bir de şöyle düşün', 'farklı bir perspektif sunayım',
    'kaynaklı bilgi vermek lazım', 'bence daha derinlemesine bakmalıyız',
    'bu konu üzerinde çalışıyorum', 'dikkatli olmak gerek',
    'bilgi paylaştıkça artar', 'eleştirel düşünmek önemli',
    'konuşma kalitesi çok iyi', 'böyle sohbetler ender',
    'entelektüel bir ortam olmuş', 'kıymetli bilgiler paylaşılıyor',
    'bu perspektifi daha önce düşünmemiştim', 'mantiklı bir yaklaşım',
    'bence konuyu genişletelim', 'güzel bir tartışma ortamı',
    'kendi deneyimlerimden konuşayım', 'burası kaliteli bir ortam',
    'bilgi edinmek için geldim', 'derin konuşmalar çok değerli'
  ]
}

export const FAREWELLS: Record<Personality, string[]> = {
  shy: [
    'ben çıkayım artık', 'iyi geceler..', 'hoşçakalın 😊', 'bye', 'görüşürz',
    'bende gideyim', 'iyi geceler herkese', 'bb 👋'
  ],
  aggressive: [
    'tamam ben gidiyorum', 'eyvallah herkese', 'hadi bb!', 'gidiyorum ben',
    'sonra görüşürz', 'kapanıyorum ben', 'yarın görüşürz!', 'eyv bb'
  ],
  funny: [
    'ben kaçtım 🏃', 'elveda zalim dünya', 'gidiyorum ama özleyin beni 😂',
    'yarrrn görüşürz', 'bay bay bakalım', 'hadi eyv millet', 'tuşçu oldumm bb',
    'güle güle herkese 😜'
  ],
  flirty: [
    'iyi geceler tatlılar 🌙', 'hoşçakalın güzeller', 'tatlı rüyalar 💕',
    'görüşmek üzere 😘', 'sevgilerle bb', 'hepinizi öptüm bb ❤️',
    'rüyalarımda görürz 😏', 'iyi geceler canim'
  ],
  serious: [
    'iyi akşamlar diliyorum', 'görüşmek üzere', 'hoşçakalın',
    'iyi geceler arkadaşlar', 'yarın görüşürz', 'kaliteli sohbet için teşekkürler',
    'sağlıcakla', 'herkese iyi geceler'
  ]
}

export const REACTIONS: Record<Personality, string[]> = {
  shy: ['👍', '😊', '❤️', '🌟', '🌙'],
  aggressive: ['💪', '🔥', '⚡', '😤', '💥'],
  funny: ['😂', '🤣', '😜', '🙈', '🤡'],
  flirty: ['💕', '😘', '🌹', '🥰', '💋'],
  serious: ['📚', '🧠', '✅', '💯', '🧐']
}

// Astrology/Fortune themed messages bots can use
export const FORTUNE_MESSAGES: string[] = [
  'bugün burç yorumumu okudum, çok isabet etti',
  'tarot açtırdım geçen hafta, baya tuttu',
  'kahve falı baktıran var mı',
  'rüyamda bir şey gördüm çok ilginç ',
  'astrolojiye inanıyor musunuz',
  'burcum boğa, sabırlı biriyim 🐂',
  'merkur retrosu bitti mi ya',
  'dolunay etkisi hisseden var mı',
  'burç uyumuna bakan var mı bilen',
  'yükselen burç önemli mi gerçekten',
  'rüya tabiri yaptıran oldu mu burdan',
  'fal baktırmak istiyorum nasıl yapılıyor',
  'canlı fal çok ilginç bir konsept',
  'numeroloji deneyen var mı',
  'doğum haritamı çıkardım baya ilginçti',
  'bu ayın burç yorumu ne acaba',
  'melek kartlarını denedim güzeldi',
  'istihare rüyası gören var mı',
  'kurşun döktüren oldu mu hiç'
]

// Random general chat messages
export const GENERAL_MESSAGES: string[] = [
  'hava nasıl sizin oralarda',
  'bu şarkı çok güzel',
  'akşam yemeğinde ne yediniz',
  'hafta sonu planlarınız ne',
  'güzel bir film önerisi olan var mı',
  'dizi izliyor musunuz bi tane güzel dizi var',
  'çay mı kahve mi',
  'yaz gelse de denize gitsek',
  'bugün çok yoruldum ya',
  'uyku bastrdı ama kalicam biraz',
  'bu platform çok güzelmiş',
  'ilk defa giriyorum burası güzel',
  'hangi şehirdensiniz',
  'müzik çok iyi ya 🎵',
  'kasım ayında ne yaptınız',
  'kitap okuyan var mı',
  'spor yapan var mı bilen',
  'yeni bi oyun çıkmış oynayan var mı',
  'doğa yürüyüşü seviyorum',
  'bu uygulama çok iyi ya',
  'kahve molasmı vereyim',
  'sessiz bi gece ama güzel',
  'sohbet çok akıcı bu gece'
]

// Helper: pick random from array
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Helper: sometimes add typos (10% chance)
export function maybeAddTypo(msg: string): string {
  if (Math.random() > 0.1) return msg
  const typos: [RegExp, string][] = [
    [/ş/g, 's'], [/ğ/g, 'g'], [/ı/g, 'i'], [/ö/g, 'o'], [/ü/g, 'u'], [/ç/g, 'c']
  ]
  const [pattern, replacement] = typos[Math.floor(Math.random() * typos.length)]
  return msg.replace(pattern, replacement)
}

// Generate a message for a bot based on personality and context
export function generateBotMessage(personality: Personality, type: 'greeting' | 'chat' | 'farewell' | 'reaction' | 'fortune' | 'general'): string {
  let msg: string
  switch (type) {
    case 'greeting': msg = pickRandom(GREETINGS[personality]); break
    case 'chat': msg = pickRandom(CHAT_MESSAGES[personality]); break
    case 'farewell': msg = pickRandom(FAREWELLS[personality]); break
    case 'reaction': msg = pickRandom(REACTIONS[personality]); break
    case 'fortune': msg = pickRandom(FORTUNE_MESSAGES); break
    case 'general': msg = pickRandom(GENERAL_MESSAGES); break
    default: msg = pickRandom(CHAT_MESSAGES[personality])
  }
  return maybeAddTypo(msg)
}
