// ── Bot Fortune & Dream Interaction Templates ──
import type { Personality } from './bot-messages'

// Comments on dream interpretations
export const DREAM_COMMENTS: Record<Personality, Array<{ content: string; experienceType: 'yorum' | 'deneyim'; didComeTrue?: boolean }>> = {
  shy: [
    { content: 'Ben de benzer bir rüya görmüştüm, çok ilginç 😊', experienceType: 'deneyim' },
    { content: 'Bu tabir çok doğru geldi bana', experienceType: 'yorum' },
    { content: 'Geçen hafta aynısını gördüm, gerçekleşti!', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Paylaştığınız için teşekkürler', experienceType: 'yorum' },
    { content: 'Çok aydınlatıcı bir yorum olmuş', experienceType: 'yorum' },
    { content: 'Bende de aynı sembol vardı rüyamda', experienceType: 'deneyim' },
    { content: 'Bu rüyayı gören tek ben değilmişim 😅', experienceType: 'deneyim' },
    { content: 'Tabiri okuyunca içim rahatlaı', experienceType: 'yorum' },
  ],
  aggressive: [
    { content: 'Aynen ben de gördüm bunu, birebir tuttu!', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Kardeşim bu tabir efsane doğru', experienceType: 'yorum' },
    { content: 'Herkes bu tabiri okusun, çok önemli', experienceType: 'yorum' },
    { content: 'Ben 3 kere gördüm bu rüyayı, hep gerçekleşti 💪', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Rüya tabirleri burası çok iyi ya', experienceType: 'yorum' },
    { content: 'Net doğru bu yorum, yaşadım bizzat', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Bu siteye bayılıyorum, herşey çok detaylı', experienceType: 'yorum' },
  ],
  funny: [
    { content: 'Ya ben de gördüm bu rüyayı ama uçuyordum bir de 😂', experienceType: 'deneyim' },
    { content: 'Bu tabiri okuyunca kahkaha attım çünkü birebir ben', experienceType: 'yorum' },
    { content: 'Arkadaşlar dikkat bu rüya gerçekleşiyor, bana oldu 😱', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Rüyalarımı buraya yazayım artık 😜', experienceType: 'yorum' },
    { content: 'Daha önce inanmazdım ama şimdi hayranlıkla okuyorum', experienceType: 'yorum' },
    { content: 'Ben bunu görünce uyandım terler içinde, sonra tuttu 😂', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Bu rüya tabirleri çok eğlenceli ya, saatlerce okurum', experienceType: 'yorum' },
  ],
  flirty: [
    { content: 'Çok güzel bir yorum olmuş ❤️', experienceType: 'yorum' },
    { content: 'Bu rüyayı görenler çok şanslı diyorlar 🌟', experienceType: 'yorum' },
    { content: 'Aşk rüyası görmüştüm, gerçekleşti 😍', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Ruyaların dili çok güzel, teşekkürler 🌹', experienceType: 'yorum' },
    { content: 'Ben de benzer birşey yaşadım, çok duygusal 💕', experienceType: 'deneyim' },
    { content: 'Bu tabir kalbe dokunan cinsten 🥰', experienceType: 'yorum' },
    { content: 'Rüyalarımız ne kadar ortak, muhteşem 🌸', experienceType: 'yorum' },
  ],
  serious: [
    { content: 'Psikolojik açıdan da değerlendirilmeli bu rüya', experienceType: 'yorum' },
    { content: 'Benzer bir rüya gördüm, yaklaşık 2 ay sonra gerçekleşti', experienceType: 'deneyim', didComeTrue: true },
    { content: 'Detaylı ve bilgilendirici bir tabir olmuş', experienceType: 'yorum' },
    { content: 'İslamı kaynaklardaki yorumla örtüşüyor', experienceType: 'yorum' },
    { content: 'Sembolizm açısından çok doğru bir analiz', experienceType: 'yorum' },
    { content: 'Bu konu hakkında Freud ve Jung da benzer şeyler söylemiş', experienceType: 'yorum' },
    { content: 'Tarihi kaynaklarla uyumlu bir yorum, tebrikler', experienceType: 'yorum' },
    { content: 'Bu tarz rüyalar genellikle geçiş dönemlerinde görülür', experienceType: 'yorum' },
  ]
}

// Social post content for fortune sharing
export const FORTUNE_POST_TEMPLATES: Record<Personality, string[]> = {
  shy: [
    'Bugünkü burc yorumum çok doğru çıktı 😊',
    'Tarot falım çok etkileyiciydi, paylaşmak istedim',
    'Rüyamda gördüklerim gerçekleşmeye başladı ✨',
    'Kahve falım çok güzel çıktı ☕',
    'Numeroloji sonuçlarım ilginç 🔢',
    'Melek kartım harika bir mesaj verdi 👼',
    'Aura analizim çok farklı sonuçlar gösterdi',
  ],
  aggressive: [
    'EFSANE fal çıktı bana! Herkes denesin 🔥',
    'Bu tarot okuması tam beni anlattı, inanılmaz!',
    'Kahve falında gördüklerim şok edici 💪',
    'Buraya yazan falcılar gerçekten çok iyi!',
    'Rüya tabirim birebir tuttu, helal olsun! 💥',
    'Numerolojide hayat yolum tam doğru çıktı!',
    'Melek kartları müthiş sonuç verdi, denemeyen kalsın!',
  ],
  funny: [
    'Falıma baktırdım, zengin olacağım diyor, hadi inşallah 😂',
    'Tarot falım: yakında sürpriz var diyor, umarım pizza gelir 😜',
    'Kahve falım: yolculuk görünüyor, mutfağa kadar olmasın 😂',
    'Rüyamda uçuyordum, kesin zengin olacağım 😂✈️',
    'Burc yorumum diyor ki: sabırlı ol. Ben: 5dk oldu yeter mi? 😅',
    'Melek kartım: herşey güzel olacak diyor. Ben: banka hesabım? 😂',
    'Aura rengim mor çıktı, kraliçe olmuşum habersiz 👑😜',
  ],
  flirty: [
    'Aşk falım çok güzel çıktı, biri geliyor galiba 😍',
    'Tarot kartlarım aşk enerjisi dolu ❤️',
    'Rüyamda güzel biri vardı, acaba burada mı? 😏',
    'Kahve falımda kalp şekli var, neler oluyor böyle 💕',
    'Burcum diyor ki: bu hafta aşk kapıda 🌹',
    'Melek kartım: ruh eşin yakında diyor 🥰',
    'Numerolojim diyor ki: 2024 aşk yılım olacak 💋',
  ],
  serious: [
    'Bugünkü astrolojik geçişler çok anlamlı',
    'Tarot okumasındaki sembolizm çok derin',
    'Rüya tabirimdeki psikolojik alt metin ilginç',
    'Numeroloji hesaplarım çok tutarlı çıkıyor',
    'Doğum haritası analizim farklı bir perspektif sundu',
    'Aura analizi ile enerji dengesini görmek değerli',
    'Melek kartlarındaki mesajlar her zaman düşündürücü',
  ]
}

// Fortune types for bot posts
export const FORTUNE_TYPES = [
  'coffee', 'tarot', 'horoscope', 'dream', 'love',
  'numerology', 'angel', 'aura', 'birthchart'
] as const

export type FortuneType = typeof FORTUNE_TYPES[number]

export const FORTUNE_TYPE_LABELS: Record<string, string> = {
  coffee: 'Kahve Falı',
  tarot: 'Tarot Falı',
  horoscope: 'Burç Yorumu',
  dream: 'Rüya Tabiri',
  love: 'Aşk Falı',
  numerology: 'Numeroloji',
  angel: 'Melek Kartı',
  aura: 'Aura Analizi',
  birthchart: 'Doğum Haritası'
}
