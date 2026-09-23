export const dynamic = 'force-dynamic'

/**
 * /api/social/stories — mobil istemcinin kullandığı takma ad.
 * Kanonik rota: /api/stories (hikâye listesi + oluşturma).
 * İkinci bir uygulama yazılmaz, kanonik handler yeniden dışa aktarılır.
 */
export { GET, POST, DELETE } from '@/app/api/stories/route'
