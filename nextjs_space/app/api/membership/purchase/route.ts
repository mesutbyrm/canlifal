export const dynamic = 'force-dynamic'

/**
 * POST /api/membership/purchase
 * Tekil (singular) alias — çoğul `/api/memberships/purchase` ile birebir aynı
 * mantığı kullanır. Flutter'ın eski yolu ana backend'de de çalışsın diye eklendi.
 */
export { POST } from '../../memberships/purchase/route'
