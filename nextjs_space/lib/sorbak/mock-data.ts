import { SBUser, SBCategory, SBTag, SBQuestion, SBAnswer, SBBadge } from './types'

const badges: SBBadge[] = [
  { id: '1', name: 'İlk Soru', icon: '🌟', color: '#FFD700' },
  { id: '2', name: 'Yardımsever', icon: '🤝', color: '#8B5CF6' },
  { id: '3', name: 'Trend Setter', icon: '🔥', color: '#EF4444' },
  { id: '4', name: 'Uzman', icon: '🎓', color: '#10B981' },
  { id: '5', name: 'VIP', icon: '💎', color: '#F59E0B' },
]

export const mockUsers: SBUser[] = [
  { id: 'u1', username: 'elif_yildiz', displayName: 'Elif Yıldız', avatar: null, level: 12, xp: 3400, xpToNext: 4000, role: 'user', isPremium: true, badges: [badges[0], badges[4]], questionCount: 45, answerCount: 120, followerCount: 890, followingCount: 234, joinedAt: '2025-06-01', bio: 'Hayatı sorgulayan biri 💜' },
  { id: 'u2', username: 'ahmet_kaya', displayName: 'Ahmet K.', avatar: null, level: 8, xp: 1800, xpToNext: 2500, role: 'user', isPremium: false, badges: [badges[1]], questionCount: 22, answerCount: 89, followerCount: 456, followingCount: 123, joinedAt: '2025-08-15', bio: 'Meraklı bir genç' },
  { id: 'u3', username: 'dr_ayse', displayName: 'Dr. Ayşe Demir', avatar: null, level: 25, xp: 9200, xpToNext: 10000, role: 'expert', isPremium: true, badges: [badges[3], badges[4], badges[1]], questionCount: 5, answerCount: 450, followerCount: 3200, followingCount: 45, joinedAt: '2025-03-10', bio: 'Psikolog | İlişki Uzmanı' },
  { id: 'u4', username: 'zeynep_m', displayName: 'Zeynep', avatar: null, level: 6, xp: 1100, xpToNext: 1500, role: 'user', isPremium: false, badges: [badges[0]], questionCount: 18, answerCount: 34, followerCount: 123, followingCount: 89, joinedAt: '2025-11-20', bio: '✨ Sormadan edemem' },
  { id: 'u5', username: 'moderator_can', displayName: 'Can (Mod)', avatar: null, level: 20, xp: 7500, xpToNext: 8000, role: 'moderator', isPremium: true, badges: [badges[1], badges[2]], questionCount: 30, answerCount: 200, followerCount: 1500, followingCount: 100, joinedAt: '2025-01-05', bio: 'Topluluk moderatörü 🛡️' },
]

export const mockCategories: SBCategory[] = [
  { id: 'c1', name: 'İlişkiler', slug: 'iliskiler', icon: '💕', color: '#EC4899', questionCount: 2340, description: 'Aşk, ilişki ve duygusal konular' },
  { id: 'c2', name: 'Kariyer', slug: 'kariyer', icon: '💼', color: '#8B5CF6', questionCount: 1200, description: 'İş hayatı ve kariyer tavsiyeleri' },
  { id: 'c3', name: 'Sağlık', slug: 'saglik', icon: '🏥', color: '#10B981', questionCount: 980, description: 'Sağlık ve yaşam kalitesi' },
  { id: 'c4', name: 'Teknoloji', slug: 'teknoloji', icon: '💻', color: '#3B82F6', questionCount: 1567, description: 'Teknoloji ve dijital dünya' },
  { id: 'c5', name: 'Eğitim', slug: 'egitim', icon: '📚', color: '#F59E0B', questionCount: 890, description: 'Eğitim ve öğrenim' },
  { id: 'c6', name: 'Gündem', slug: 'gundem', icon: '📰', color: '#EF4444', questionCount: 3400, description: 'Güncel konular ve tartışmalar' },
  { id: 'c7', name: 'Eğlence', slug: 'eglence', icon: '🎮', color: '#06B6D4', questionCount: 760, description: 'Film, dizi, oyun ve eğlence' },
  { id: 'c8', name: 'Moda & Güzellik', slug: 'moda-guzellik', icon: '👗', color: '#D946EF', questionCount: 1100, description: 'Moda, stil ve güzellik ipuçları' },
  { id: 'c9', name: 'Astroloji', slug: 'astroloji', icon: '🔮', color: '#7C3AED', questionCount: 2100, description: 'Burçlar, fal ve astroloji' },
  { id: 'c10', name: 'Yemek', slug: 'yemek', icon: '🍳', color: '#F97316', questionCount: 540, description: 'Tarifler ve yemek kültürü' },
]

export const mockTags: SBTag[] = [
  { id: 't1', name: 'aşk', count: 4500 },
  { id: 't2', name: 'ilişki', count: 3800 },
  { id: 't3', name: 'tavsiye', count: 3200 },
  { id: 't4', name: 'kariyer', count: 2100 },
  { id: 't5', name: 'üniversite', count: 1900 },
  { id: 't6', name: 'ayrılık', count: 1700 },
  { id: 't7', name: 'arkadaşlık', count: 1500 },
  { id: 't8', name: 'psikoloji', count: 1400 },
  { id: 't9', name: 'kıskançlık', count: 1200 },
  { id: 't10', name: 'evlilik', count: 1100 },
  { id: 't11', name: 'iş-hayatı', count: 980 },
  { id: 't12', name: 'güzellik', count: 870 },
]

export const mockQuestions: SBQuestion[] = [
  {
    id: 'q1', title: 'Sevgilim mesajlarıma geç cevap veriyor, bu normal mi?', body: '3 aydır birlikteyiz. Başta hemen cevap verirken artık saatlerce cevap vermiyor. Sorduğumda "meşgulüm" diyor ama sosyal medyada aktif. Ne yapmalıyım?', slug: 'sevgilim-mesajlarima-gec-cevap-veriyor', author: mockUsers[0], isAnonymous: false, category: mockCategories[0], tags: [mockTags[0], mockTags[1], mockTags[8]], answerCount: 47, viewCount: 3200, voteCount: 128, commentCount: 23, createdAt: '2026-04-10T08:30:00Z', isTrending: true, isPinned: false, isPremium: false, isEditorPick: true, targetAudience: 'all', poll: null, bestAnswerId: 'a1', userVote: null,
  },
  {
    id: 'q2', title: 'Yazılım mühendisliği mi yoksa tıp mı okumalıyım?', body: 'YKS ye hazırlanıyorum. İkisi arasında kaldım. Yazılım seviyorum ama ailem doktor olmamı istiyor. Hangisi daha iyi gelecek vadediyor?', slug: 'yazilim-muhendisligi-mi-tip-mi', author: mockUsers[1], isAnonymous: false, category: mockCategories[4], tags: [mockTags[4], mockTags[3]], answerCount: 89, viewCount: 8900, voteCount: 256, commentCount: 45, createdAt: '2026-04-09T14:20:00Z', isTrending: true, isPinned: false, isPremium: false, isEditorPick: false, targetAudience: 'all', poll: [{ id: 'p1', text: 'Yazılım Mühendisliği', votes: 1245, percentage: 62 }, { id: 'p2', text: 'Tıp', votes: 764, percentage: 38 }], bestAnswerId: null, userVote: null,
  },
  {
    id: 'q3', title: 'Aldatıldığımı öğrendim ama hala seviyorum', body: 'En yakın arkadaşım söyledi. Mesajları gördüm ama yüzleşemedim. 5 yıllık ilişkim var ve hala çok seviyorum. Ne yapmalıyım bilen var mı?', slug: 'aldatildigimi-ogrendim-ama-hala-seviyorum', author: mockUsers[3], isAnonymous: true, category: mockCategories[0], tags: [mockTags[0], mockTags[5], mockTags[7]], answerCount: 156, viewCount: 12500, voteCount: 342, commentCount: 78, createdAt: '2026-04-10T06:15:00Z', isTrending: true, isPinned: false, isPremium: false, isEditorPick: true, targetAudience: 'female', poll: null, bestAnswerId: 'a3', userVote: null,
  },
  {
    id: 'q4', title: 'Iphone 16 mı Samsung S26 mı?', body: 'Telefon değiştirmek istiyorum. Hangisini almalıyım? Bütçe sorun değil, performans ve kamera kalitesi önemli.', slug: 'iphone-16-mi-samsung-s26-mi', author: mockUsers[1], isAnonymous: false, category: mockCategories[3], tags: [mockTags[3]], answerCount: 67, viewCount: 5600, voteCount: 89, commentCount: 34, createdAt: '2026-04-09T18:45:00Z', isTrending: false, isPinned: false, isPremium: false, isEditorPick: false, targetAudience: 'all', poll: [{ id: 'p3', text: 'iPhone 16', votes: 890, percentage: 55 }, { id: 'p4', text: 'Samsung S26', votes: 723, percentage: 45 }], bestAnswerId: null, userVote: null,
  },
  {
    id: 'q5', title: 'Ev arkadaşım sürekli eşyalarımı kullanıyor', body: 'Üniversitede ev arkadaşımla kalıyorum. Şampuanımı, yemeklerimi, hatta kıyafetlerimi bile kullanıyor. Söylesem kırılacak, söylemesem patlayacağım.', slug: 'ev-arkadasim-esyalarimi-kullaniyor', author: mockUsers[3], isAnonymous: true, category: mockCategories[0], tags: [mockTags[6], mockTags[4]], answerCount: 34, viewCount: 2100, voteCount: 67, commentCount: 12, createdAt: '2026-04-10T10:00:00Z', isTrending: false, isPinned: false, isPremium: false, isEditorPick: false, targetAudience: 'all', poll: null, bestAnswerId: null, userVote: null,
  },
  {
    id: 'q6', title: 'Burnumu yaptırmak istiyorum, öneriniz var mı?', body: 'İstanbul\'da güvenilir estetik cerrah arıyorum. Deneyimlerinizi paylaşır mısınız? Fiyat aralığı ne kadar?', slug: 'burnumu-yaptirmak-istiyorum', author: mockUsers[0], isAnonymous: false, category: mockCategories[7], tags: [mockTags[11]], answerCount: 23, viewCount: 1800, voteCount: 45, commentCount: 8, createdAt: '2026-04-09T22:10:00Z', isTrending: false, isPinned: false, isPremium: true, isEditorPick: false, targetAudience: 'female', poll: null, bestAnswerId: null, userVote: null,
  },
  {
    id: 'q7', title: 'Bu hafta hangi burçlar şanslı?', body: 'Astroloji meraklısıyım. Bu hafta özellikle aşk konusunda şanslı burçlar hangileri? Venüs geçişi nasıl etkileyecek?', slug: 'bu-hafta-hangi-burclar-sansli', author: mockUsers[0], isAnonymous: false, category: mockCategories[8], tags: [mockTags[0]], answerCount: 12, viewCount: 4200, voteCount: 78, commentCount: 5, createdAt: '2026-04-10T07:00:00Z', isTrending: false, isPinned: false, isPremium: false, isEditorPick: false, targetAudience: 'all', poll: null, bestAnswerId: null, userVote: null,
  },
  {
    id: 'q8', title: 'İlk mülakatta ne sormalıyım?', body: 'Yarın ilk iş mülakatıma gireceğim. Yazılım stajyerliği için. Bana soru sorduklarında "Sorunuz var mı?" dediklerinde ne sormalıyım?', slug: 'ilk-mulakatta-ne-sormaliyim', author: mockUsers[1], isAnonymous: false, category: mockCategories[1], tags: [mockTags[3], mockTags[10]], answerCount: 56, viewCount: 3400, voteCount: 134, commentCount: 19, createdAt: '2026-04-10T11:30:00Z', isTrending: true, isPinned: false, isPremium: false, isEditorPick: true, targetAudience: 'all', poll: null, bestAnswerId: 'a8', userVote: null,
  },
]

export const mockAnswers: SBAnswer[] = [
  {
    id: 'a1', body: 'Bu durum çok yaygın aslında. İlişkinin başında herkes yoğun ilgi gösterir, zamanla normalleşir. Ama sosyal medyada aktif olup sana cevap vermemesi düşündürücü. Ona sakin bir şekilde hislerini anlatmanı öneririm. "Mesajlarıma geç cevap verdiğinde kendimi önemsiz hissediyorum" gibi ben dili kullan.', author: mockUsers[2], isAnonymous: false, voteCount: 89, commentCount: 5, createdAt: '2026-04-10T09:15:00Z', isBestAnswer: true, isExpertAnswer: true, userVote: null, comments: [
      { id: 'cm1', body: 'Çok haklısınız hocam, teşekkürler 🙏', author: mockUsers[0], createdAt: '2026-04-10T09:30:00Z', voteCount: 12 },
      { id: 'cm2', body: 'Ben dili gerçekten çok işe yarıyor', author: mockUsers[3], createdAt: '2026-04-10T10:00:00Z', voteCount: 5 },
    ]
  },
  {
    id: 'a2', body: 'Direkt konuş. Oyun oynama, mesaj bekleme. Yüz yüze gel ve sor. Eğer seni önemsiyorsa değişir, önemsemiyorsa zaten bitmesi gereken bir ilişki.', author: mockUsers[4], isAnonymous: false, voteCount: 56, commentCount: 3, createdAt: '2026-04-10T10:30:00Z', isBestAnswer: false, isExpertAnswer: false, userVote: null, comments: []
  },
  {
    id: 'a3', body: 'Bu çok zor bir durum. 5 yıl az bir süre değil. Ama biliyorsun, aldatma bir seçim. Seni seven biri bunu yapmaz. Şu an duygusal olarak çok yoğunsun, acele karar verme ama kendine de değer ver. Profesyonel destek almanı şiddetle öneriyorum.', author: mockUsers[2], isAnonymous: false, voteCount: 234, commentCount: 15, createdAt: '2026-04-10T07:00:00Z', isBestAnswer: true, isExpertAnswer: true, userVote: null, comments: []
  },
]

export const weeklyActiveUsers = [
  { ...mockUsers[2], weeklyAnswers: 48 },
  { ...mockUsers[4], weeklyAnswers: 35 },
  { ...mockUsers[0], weeklyAnswers: 22 },
  { ...mockUsers[1], weeklyAnswers: 18 },
]

export const topAnswerers = [
  { ...mockUsers[2], totalAnswers: 450, helpfulVotes: 3200 },
  { ...mockUsers[4], totalAnswers: 200, helpfulVotes: 1500 },
  { ...mockUsers[0], totalAnswers: 120, helpfulVotes: 890 },
]
