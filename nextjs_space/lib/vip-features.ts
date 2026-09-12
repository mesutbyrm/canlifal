/**
 * BÖLÜM 20 — VIP / Üyelik yetenek kataloğu (varsayılan tohum verisi)
 *
 * Bu dosya SADECE ilk kurulum varsayılanlarını tanımlar.
 * Çalışma zamanında gerçek kaynak DB'dir (membership_tier_defs / membership_features /
 * membership_tier_features). Admin panelinden yapılan her değişiklik burayı ezer.
 *
 * ÖNEMLİ: Jeton ödülü / jeton indirimi bu sistemin KAPSAMI DIŞINDADIR.
 */

export type FeatureValueType = 'boolean' | 'number' | 'string' | 'asset' | 'enum'

export interface TierSeed {
  key: string
  name: string
  nameEn: string
  rank: number
  color: string
  gradient?: string
  icon: string
  discoveryWeight: number
  sortOrder: number
  description: string
}

/** 5 kademe — yeni kademe eklemek için sadece bu diziye satır eklemek yeterli. */
export const DEFAULT_TIERS: TierSeed[] = [
  {
    key: 'basic', name: 'Basic', nameEn: 'Basic', rank: 0,
    color: '#9ca3af', icon: '👤', discoveryWeight: 1.0, sortOrder: 0,
    description: 'Standart kullanıcı. Profil, mesajlaşma, sesli oda, canlı yayın, takip, arkadaşlık, hediye, sıralama ve etkinliklere tam erişim.',
  },
  {
    key: 'gold', name: 'Gold', nameEn: 'Gold', rank: 10,
    color: '#facc15', gradient: 'linear-gradient(90deg,#fde047,#f59e0b)', icon: '👑',
    discoveryWeight: 1.1, sortOrder: 1,
    description: 'Altın profil çerçevesi, VIP rozet, isim rengi, mesaj balonu, giriş efekti ve reklamsız deneyim.',
  },
  {
    key: 'premium', name: 'Premium', nameEn: 'Premium', rank: 20,
    color: '#a855f7', gradient: 'linear-gradient(90deg,#c084fc,#7c3aed)', icon: '✨',
    discoveryWeight: 1.2, sortOrder: 2,
    description: 'Gold ayrıcalıkları + animasyonlu çerçeve, gizlilik modu, profil ziyaretçileri ve keşfet önceliği.',
  },
  {
    key: 'diamond', name: 'Diamond', nameEn: 'Diamond', rank: 30,
    color: '#22d3ee', gradient: 'linear-gradient(90deg,#67e8f9,#0891b2)', icon: '💎',
    discoveryWeight: 1.3, sortOrder: 3,
    description: 'Premium ayrıcalıkları + VIP oda erişimi, giriş sesi, özel kullanıcı ID, öncelikli destek.',
  },
  {
    key: 'svip', name: 'SVIP', nameEn: 'SVIP', rank: 40,
    color: '#f43f5e', gradient: 'linear-gradient(90deg,#fb7185,#be123c,#f59e0b)', icon: '🔱',
    discoveryWeight: 1.4, sortOrder: 4,
    description: 'Tüm ayrıcalıklar + SVIP Lounge, SVIP odalar, maksimum görünürlük, erken erişim ve özel destek kanalı.',
  },
]

export interface FeatureSeed {
  key: string
  name: string
  nameEn: string
  category: string
  valueType: FeatureValueType
  description: string
  unit?: string
  sortOrder: number
  /** Bu kademe ve üstünde varsayılan olarak açık */
  minTier: string
  /** Kademeye özel sayısal/görsel varsayılanlar */
  perTier?: Record<string, { limitValue?: number | null; dailyLimit?: number | null; priority?: number; defaultValue?: any }>
}

export const FEATURE_CATALOG: FeatureSeed[] = [
  // ── Profil & Kozmetik ──
  { key: 'vip.profile_frame', name: 'Profil çerçevesi', nameEn: 'Profile frame', category: 'profile', valueType: 'asset', description: 'Kademeye özel profil çerçevesi.', sortOrder: 10, minTier: 'gold' },
  { key: 'vip.animated_frame', name: 'Animasyonlu çerçeve', nameEn: 'Animated frame', category: 'profile', valueType: 'asset', description: 'Hareketli profil çerçevesi.', sortOrder: 11, minTier: 'premium' },
  { key: 'vip.badge', name: 'VIP rozet', nameEn: 'VIP badge', category: 'profile', valueType: 'asset', description: 'Profil ve oda listesinde görünen üyelik rozeti.', sortOrder: 12, minTier: 'gold' },
  { key: 'vip.name_color', name: 'İsim rengi', nameEn: 'Name color', category: 'profile', valueType: 'string', description: 'Kullanıcı adının rengi.', sortOrder: 13, minTier: 'gold' },
  { key: 'vip.name_effect', name: 'İsim efekti', nameEn: 'Name effect', category: 'profile', valueType: 'string', description: 'İsim üzerinde parlama/gradyan efekti.', sortOrder: 14, minTier: 'gold' },
  { key: 'vip.name_animation', name: 'Animasyonlu isim', nameEn: 'Animated name', category: 'profile', valueType: 'string', description: 'Hareketli isim animasyonu.', sortOrder: 15, minTier: 'diamond' },
  { key: 'vip.profile_theme', name: 'Profil teması', nameEn: 'Profile theme', category: 'profile', valueType: 'asset', description: 'Profil sayfası teması.', sortOrder: 16, minTier: 'gold' },
  { key: 'vip.profile_background', name: 'Profil arka planı', nameEn: 'Profile background', category: 'profile', valueType: 'asset', description: 'Profil arka plan görseli/animasyonu.', sortOrder: 17, minTier: 'premium' },
  { key: 'vip.profile_decoration', name: 'Profil süslemeleri', nameEn: 'Profile decorations', category: 'profile', valueType: 'asset', description: 'Profil dekorasyon öğeleri.', sortOrder: 18, minTier: 'gold' },
  { key: 'vip.avatar_effect', name: 'Avatar efekti', nameEn: 'Avatar effect', category: 'profile', valueType: 'asset', description: 'Avatar üzerinde efekt.', sortOrder: 19, minTier: 'premium' },
  { key: 'vip.profile_showcase', name: 'Profil vitrini', nameEn: 'Profile showcase', category: 'profile', valueType: 'boolean', description: 'Profilde özel vitrin alanı.', sortOrder: 20, minTier: 'diamond' },
  { key: 'vip.title', name: 'Ünvan sistemi', nameEn: 'Title system', category: 'profile', valueType: 'string', description: 'Profilde görünen ünvan.', sortOrder: 21, minTier: 'diamond' },
  { key: 'vip.custom_id', name: 'Özel kullanıcı ID', nameEn: 'Custom user ID', category: 'profile', valueType: 'boolean', description: 'Kendi kullanıcı ID/numarasını seçebilme.', sortOrder: 22, minTier: 'diamond' },
  { key: 'vip.verification_badge', name: 'Doğrulama rozeti', nameEn: 'Verification badge', category: 'profile', valueType: 'boolean', description: 'Onaylı hesap rozeti hakkı.', sortOrder: 23, minTier: 'svip' },
  { key: 'vip.ad_free', name: 'Reklamsız deneyim', nameEn: 'Ad-free', category: 'profile', valueType: 'boolean', description: 'Reklam gösterilmez.', sortOrder: 24, minTier: 'gold' },

  // ── Giriş / Çıkış efektleri ──
  { key: 'vip.entrance_effect', name: 'Giriş efekti', nameEn: 'Entrance effect', category: 'entrance', valueType: 'asset', description: 'Sesli oda ve yayına girişte görsel efekt.', sortOrder: 30, minTier: 'gold' },
  { key: 'vip.entrance_animation', name: 'Giriş animasyonu', nameEn: 'Entrance animation', category: 'entrance', valueType: 'asset', description: 'Gelişmiş giriş animasyonu.', sortOrder: 31, minTier: 'premium' },
  { key: 'vip.entrance_sound', name: 'Giriş sesi', nameEn: 'Entrance sound', category: 'entrance', valueType: 'asset', description: 'Girişte çalan ses efekti.', sortOrder: 32, minTier: 'diamond' },
  { key: 'vip.exit_effect', name: 'Çıkış efekti', nameEn: 'Exit effect', category: 'entrance', valueType: 'asset', description: 'Odadan çıkışta efekt.', sortOrder: 33, minTier: 'diamond' },
  { key: 'vip.room_entry_announcement', name: 'Odaya giriş duyurusu', nameEn: 'Room entry announcement', category: 'entrance', valueType: 'boolean', description: 'Odaya girişte sistem duyurusu.', sortOrder: 34, minTier: 'premium' },
  { key: 'vip.seat_effect', name: 'Koltuk efekti', nameEn: 'Seat effect', category: 'entrance', valueType: 'asset', description: 'Sesli oda koltuğunda özel görsel.', sortOrder: 35, minTier: 'gold' },

  // ── Mesaj sistemi ──
  { key: 'vip.message_bubble', name: 'Mesaj balonu', nameEn: 'Message bubble', category: 'message', valueType: 'asset', description: 'Kademeye özel sohbet balonu.', sortOrder: 40, minTier: 'gold' },
  { key: 'vip.message_text_effect', name: 'Mesaj yazı efekti', nameEn: 'Message text effect', category: 'message', valueType: 'string', description: 'Mesaj metnine efekt.', sortOrder: 41, minTier: 'premium' },
  { key: 'vip.emoji_pack', name: 'Özel emoji paketi', nameEn: 'Emoji pack', category: 'message', valueType: 'asset', description: 'Kademeye özel emoji paketleri.', sortOrder: 42, minTier: 'gold' },
  { key: 'vip.sticker_pack', name: 'Özel sticker paketi', nameEn: 'Sticker pack', category: 'message', valueType: 'asset', description: 'Kademeye özel sticker paketleri.', sortOrder: 43, minTier: 'gold' },
  { key: 'vip.reaction_effect', name: 'Tepki efektleri', nameEn: 'Reaction effects', category: 'message', valueType: 'asset', description: 'Özel reaksiyon animasyonları.', sortOrder: 44, minTier: 'gold' },
  {
    key: 'vip.message_pin', name: 'Mesaj sabitleme', nameEn: 'Message pinning', category: 'message', valueType: 'number',
    description: 'Odada mesajı geçici olarak sabitleme hakkı (günlük limitli, spam koruması aktif).', unit: 'adet/gün', sortOrder: 45, minTier: 'premium',
    perTier: { premium: { dailyLimit: 3, limitValue: 1 }, diamond: { dailyLimit: 6, limitValue: 2 }, svip: { dailyLimit: 12, limitValue: 3 } },
  },

  // ── Gizlilik ──
  { key: 'vip.hidden_online', name: 'Gizli çevrimiçi', nameEn: 'Hidden online', category: 'privacy', valueType: 'boolean', description: 'Çevrimiçi durumunu gizleme.', sortOrder: 50, minTier: 'premium' },
  { key: 'vip.hide_last_seen', name: 'Son görülmeyi gizle', nameEn: 'Hide last seen', category: 'privacy', valueType: 'boolean', description: 'Son görülme bilgisini gizleme.', sortOrder: 51, minTier: 'premium' },
  { key: 'vip.profile_visitors', name: 'Profil ziyaretçilerini gör', nameEn: 'See profile visitors', category: 'privacy', valueType: 'boolean', description: 'Profilini kimlerin ziyaret ettiğini görme.', sortOrder: 52, minTier: 'premium' },
  { key: 'vip.hide_profile_visit', name: 'Gizli profil gezme', nameEn: 'Hide profile visit', category: 'privacy', valueType: 'boolean', description: 'Ziyaretlerin karşı tarafa görünmez.', sortOrder: 53, minTier: 'premium' },
  { key: 'vip.hidden_room_entry', name: 'Gizli oda girişi', nameEn: 'Hidden room entry', category: 'privacy', valueType: 'boolean', description: 'Odaya duyurusuz/gizli giriş.', sortOrder: 54, minTier: 'premium' },
  { key: 'vip.hide_vip_status', name: 'VIP durumunu gizle', nameEn: 'Hide VIP status', category: 'privacy', valueType: 'boolean', description: 'Üyelik seviyesini başkalarından gizleme.', sortOrder: 55, minTier: 'premium' },

  // ── Görünürlük / Keşfet ──
  {
    key: 'vip.discovery_priority', name: 'Keşfet önceliği', nameEn: 'Discovery priority', category: 'discovery', valueType: 'number',
    description: 'Keşfet/öneri listelerinde görünürlük ağırlığı (çarpan ×100).', unit: '×100', sortOrder: 60, minTier: 'gold',
    perTier: { gold: { limitValue: 110, priority: 1 }, premium: { limitValue: 120, priority: 2 }, diamond: { limitValue: 130, priority: 3 }, svip: { limitValue: 140, priority: 4 } },
  },
  {
    key: 'vip.room_list_priority', name: 'Oda listesi önceliği', nameEn: 'Room list priority', category: 'discovery', valueType: 'number',
    description: 'Oda kullanıcı listesinde üst sıralarda görünme önceliği.', sortOrder: 61, minTier: 'gold',
    perTier: { gold: { priority: 1 }, premium: { priority: 2 }, diamond: { priority: 3 }, svip: { priority: 4 } },
  },
  { key: 'vip.priority_matching', name: 'Öncelikli eşleşme', nameEn: 'Priority matching', category: 'discovery', valueType: 'boolean', description: 'Eşleşme/öneri motorunda öncelik.', sortOrder: 62, minTier: 'svip' },

  // ── Oda erişimi ──
  { key: 'vip.vip_rooms', name: 'VIP odalara giriş', nameEn: 'VIP room access', category: 'room', valueType: 'boolean', description: 'VIP işaretli odalara erişim.', sortOrder: 70, minTier: 'diamond' },
  { key: 'vip.diamond_rooms', name: 'Diamond odaları', nameEn: 'Diamond rooms', category: 'room', valueType: 'boolean', description: 'Yalnızca Diamond ve üstüne açık odalar.', sortOrder: 71, minTier: 'diamond' },
  { key: 'vip.svip_rooms', name: 'SVIP odaları', nameEn: 'SVIP rooms', category: 'room', valueType: 'boolean', description: 'Yalnızca SVIP odaları.', sortOrder: 72, minTier: 'svip' },
  { key: 'vip.vip_lounge', name: 'SVIP Lounge', nameEn: 'SVIP Lounge', category: 'room', valueType: 'boolean', description: 'SVIP üyelere özel lounge alanı.', sortOrder: 73, minTier: 'svip' },
  { key: 'vip.create_vip_room', name: 'VIP oda oluşturma', nameEn: 'Create VIP room', category: 'room', valueType: 'boolean', description: 'Üyelik şartı olan oda açabilme.', sortOrder: 74, minTier: 'diamond' },
  { key: 'vip.room_theme', name: 'VIP oda teması', nameEn: 'VIP room theme', category: 'room', valueType: 'asset', description: 'Odaya özel VIP tema ve arka plan.', sortOrder: 75, minTier: 'diamond' },

  // ── Etkinlik ──
  { key: 'vip.events', name: 'VIP etkinlikleri', nameEn: 'VIP events', category: 'event', valueType: 'boolean', description: 'Üyelik seviyesine özel etkinliklere katılım.', sortOrder: 80, minTier: 'gold' },
  { key: 'vip.priority_event', name: 'Öncelikli etkinlik katılımı', nameEn: 'Priority event access', category: 'event', valueType: 'boolean', description: 'Etkinliklere öncelikli katılım hakkı.', sortOrder: 81, minTier: 'diamond' },
  { key: 'vip.contest_access', name: 'Yarışma erişimi', nameEn: 'Contest access', category: 'event', valueType: 'boolean', description: 'Özel yarışmalara katılım.', sortOrder: 82, minTier: 'diamond' },
  { key: 'vip.early_access', name: 'Yeni özelliklere erken erişim', nameEn: 'Early access', category: 'event', valueType: 'boolean', description: 'Yeni özellikleri herkesten önce kullanma.', sortOrder: 83, minTier: 'svip' },
  { key: 'vip.vip_announcements', name: 'VIP duyuruları', nameEn: 'VIP announcements', category: 'event', valueType: 'boolean', description: 'Yalnızca VIP üyelere özel duyurular.', sortOrder: 84, minTier: 'svip' },
  { key: 'vip.event_invitations', name: 'Etkinlik davetiyeleri', nameEn: 'Event invitations', category: 'event', valueType: 'boolean', description: 'Özel etkinlik davetleri.', sortOrder: 85, minTier: 'svip' },

  // ── Destek ──
  { key: 'vip.priority_support', name: 'Öncelikli destek', nameEn: 'Priority support', category: 'support', valueType: 'boolean', description: 'Destek taleplerinde öncelik.', sortOrder: 90, minTier: 'diamond' },
  { key: 'vip.support_channel', name: 'Özel destek kanalı', nameEn: 'Dedicated support channel', category: 'support', valueType: 'boolean', description: 'SVIP üyelere özel destek kanalı.', sortOrder: 91, minTier: 'svip' },

  // ── Başarım / sezon (altyapı) ──
  { key: 'vip.achievements', name: 'VIP başarımları', nameEn: 'VIP achievements', category: 'progression', valueType: 'boolean', description: 'VIP başarım ve görev sistemi.', sortOrder: 100, minTier: 'gold' },
  {
    key: 'vip.xp_multiplier', name: 'VIP XP çarpanı', nameEn: 'VIP XP multiplier', category: 'progression', valueType: 'number',
    description: 'VIP sezon puanı kazanç çarpanı (×100). Jeton ekonomisinden bağımsızdır.', unit: '×100', sortOrder: 101, minTier: 'basic',
    perTier: { basic: { limitValue: 100 }, gold: { limitValue: 120 }, premium: { limitValue: 140 }, diamond: { limitValue: 170 }, svip: { limitValue: 200 } },
  },
  { key: 'vip.user_ranking', name: 'VIP sıralaması', nameEn: 'VIP ranking', category: 'progression', valueType: 'boolean', description: 'VIP kullanıcı sıralamasında yer alma.', sortOrder: 102, minTier: 'gold' },
]

export const FEATURE_KEYS = FEATURE_CATALOG.map((f) => f.key)
