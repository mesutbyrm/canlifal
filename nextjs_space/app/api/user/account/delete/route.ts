export const dynamic = 'force-dynamic'

/**
 * POST /api/user/account/delete
 * `/api/user/account` (DELETE) ile birebir aynı işlemi yapar.
 * DELETE gövdesi gönderemeyen istemciler (bazı Flutter/HTTP katmanları) için.
 */
export { POST } from '../route'
