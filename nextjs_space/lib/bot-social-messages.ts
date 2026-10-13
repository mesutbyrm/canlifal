// ── Bot Social Interaction Messages ──
import type { Personality } from './bot-messages'

// Comments on social posts
export const POST_COMMENTS: Record<Personality, string[]> = {
  shy: [
    'çok güzel 😊', 'beğendim', 'güzel paylaşım', 'harika ❤️', 'ne güzel',
    'tebrikler', 'eline sağlık', 'muhteşem', 'woww', '👏',
    'ilham verici', 'çok etkilendim', 'güzel olmuş', 'paylaştığın için teşekkürler',
    'beğendim gerçekten', 'çok tatlı', 'harikaa 🌟'
  ],
  aggressive: [
    'helal olsun!', 'çok iyi lan', 'efsane!', 'adam gibi paylaşım 💪',
    'bunu herkes görmeli', 'net doğru', 'işte bu ya!', 'tam isabet!',
    'beğendim, devamı gelsin', 'gönülden beğeni 🔥', 'süper olmuş',
    'kralçe/kral hareket', 'buna çok katılıyorum', 'çok haklısın bence'
  ],
  funny: [
    'off çok iyi ya 😂', 'patladım sksjsksj', 'buna bayldım', 'çok komik 🤣',
    'ya öldüm 😂😂', 'gülmekten öldüm', 'ben buna niye güldüm',
    'muazzam hahaha', 'paylasımına bayıldım 😜', 'efsane içerik',
    'daha çok paylaş 😆', 'bunu kaydetiyorum', 'award verilmeli buna',
    'gülmekten ağladım', 'ya sen çok iyisin 😂'
  ],
  flirty: [
    'çok güzelsin 😍', 'harika bir paylaşım 💕', 'kalp attı ❤️',
    'seni görmek güzel', 'ne kadar tatlısın 🥰', 'gözlerim kalp oldu',
    'muhteşem 🌹', 'bu paylaşımı çok beğendim', 'güzel ruhlu insan 💋',
    'çok şıksın 😏', 'sevgi dolu paylaşım ❤️', 'admire 🤩',
    'gönülden beğeni', 'güzel enerji yayıyorsun', 'ne güzel insansın 🌸'
  ],
  serious: [
    'güzel perspektif', 'katılıyorum', 'düşündürücü', 'kaliteli içerik',
    'bilgilendirici, teşekkürler', 'bunu herkesin okuması lazım', 'önemli bir konu',
    'farklı bir bakış açısı', 'mantıklı bir yaklaşım', 'emeğine sağlık',
    'derin bir paylaşım', 'aydınlatıcı', 'çok değerli bilgiler',
    'bunu kaydediyorum, teşekkürler', 'harika bir analiz'
  ]
}

// Comments on live streams
export const STREAM_COMMENTS: Record<Personality, string[]> = {
  shy: [
    'merhaba 😊', 'izliyorum', 'güzel yayın', 'çok iyi', '👏',
    'devam et', 'harika', 'sessizce izliyorum', 'beğendim yayını',
    'teşekkürler', '👍', 'çok keyifli', 'izlemesi güzel'
  ],
  aggressive: [
    'helal abi/abla!', 'süper yayın!', 'devam devam 🔥', 'efsane!',
    'bunu herkes izlemeli', 'kalite var burada', 'tam gaz!', '💪💪',
    'kral yayıncı!', 'on numara içerik', 'EFSANEE', 'izlenmeyi hakediyo'
  ],
  funny: [
    'geldiimm 😂', 'bu yayın efsane', 'patlıyorum 🤣', 'ölüyömmm',
    'ya çok iyi ya', 'hahahaha', 'devam devam gülmeye geldim',
    'best yayıncı 😜', 'kahkaha garantili', 'beni güldüren yayıncı 😆',
    'ben öldüm ya', 'çök iyiii', 'ortam müthiş'
  ],
  flirty: [
    'güzel yayıncı 😍', 'çok tatlısın 💕', 'sesin çok güzel',
    'izlemesi keyifli ❤️', 'gözlerini beğendim', 'enerjin harika 🌹',
    'yayından ayrılamıyorum', 'çok şıksın bu gece', 'aşk oldum 😘',
    'muhteşem bir yayıncısın', 'kalp ❤️', 'seni izlemek güzel'
  ],
  serious: [
    'kaliteli yayın', 'bilgilendirici', 'teşekkürler paylaşım için',
    'güzel konu', 'devam et lütfen', 'çok faydalı', 'öğretici',
    'bu konuyu merak ediyordum', 'emeğine sağlık', 'iyi anlatıyorsun',
    'düşündürücü bir yayın', 'soru sorabilir miyim', 'çok değerli'
  ]
}

// Stream emoji reactions
export const STREAM_EMOJIS: string[] = [
  '❤️', '🔥', '👏', '😂', '😍', '🌟', '⭐', '💫', '🌹', '💕',
  '💪', '🙏', '🎉', '😎', '🥰', '⚡', '🤩', '👍'
]

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
