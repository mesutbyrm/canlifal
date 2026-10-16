/**
 * Bildirim metni için gönderi türü: «videonu», «fal paylaşımını», «fotoğrafını»,
 * «gönderini». Ör. «Ali videonu beğendi», «Ayşe fal paylaşımına yorum yaptı».
 */
type PostLike = { postType?: string | null; imageUrl?: string | null; fortuneType?: string | null }

function kind(post: PostLike): 'video' | 'fortune' | 'photo' | 'post' {
  const url = (post.imageUrl || '').toLowerCase()
  if (post.postType === 'video' || /\.(mp4|mov|webm|m3u8)(\?|$)/.test(url) || url.includes('/videos/')) return 'video'
  if (post.postType === 'fortune' || !!post.fortuneType) return 'fortune'
  if (url) return 'photo'
  return 'post'
}

/** Belirtme hâli: «videonu», «fal paylaşımını», «fotoğrafını», «gönderini». */
export function socialPostNoun(post: PostLike): string {
  return { video: 'videonu', fortune: 'fal paylaşımını', photo: 'fotoğrafını', post: 'gönderini' }[kind(post)]
}

/** Yönelme hâli: «videona», «fal paylaşımına», «fotoğrafına», «gönderine». */
export function socialPostNounDative(post: PostLike): string {
  return { video: 'videona', fortune: 'fal paylaşımına', photo: 'fotoğrafına', post: 'gönderine' }[kind(post)]
}
