/**
 * lib/admin-auth.ts — Admin uçları için çift kimlik çözümü (web çerezi VEYA mobil Bearer JWT)
 *
 * Amaç: `app/api/admin/**` altındaki rotaların çoğu yalnızca `getServerSession(authOptions)`
 * kullanıyordu; mobil uygulama `Authorization: Bearer <JWT>` gönderdiği için 401 alıyordu.
 *
 * Bu yardımcı, NextAuth oturumu varsa onu AYNEN döndürür (mevcut web davranışı değişmez).
 * Oturum yoksa Authorization başlığındaki Bearer JWT'yi `authenticateRequest` ile doğrular ve
 * aynı şekle (`{ user: { id, email, name, image, role } }`) sahip bir nesne üretir; böylece
 * çağıran rotalardaki `session.user.role` / `session.user.id` kullanımları değişmeden çalışır.
 *
 * YETKİ KONTROLÜ BU DOSYADA YAPILMAZ. Rotalar kendi rol/izin kontrollerini korur.
 */
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'

export interface StaffSessionUser {
  id: string
  email: string
  name: string
  image?: string | null
  role: string
}

export interface StaffSession {
  user: StaffSessionUser
  expires?: string
}

/**
 * NextAuth oturumu VEYA Bearer JWT'den oturum benzeri nesne üretir.
 * Hiçbiri yoksa `null` döner (çağıran 401 vermeli).
 *
 * `req` isteğe bağlıdır: verilmezse Authorization başlığı `next/headers` üzerinden okunur,
 * böylece parametresiz handler'lar ve yardımcı fonksiyonlar da imza değiştirmeden kullanabilir.
 */
export async function getStaffSession(req?: { headers: Headers } | any): Promise<StaffSession | null> {
  const session = await getServerSession(authOptions)
  if (session?.user) return session as unknown as StaffSession

  let authHeader: string | null = null
  try {
    authHeader = req?.headers?.get?.('authorization') ?? headers().get('authorization')
  } catch {
    authHeader = null
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const carrier = { headers: new Headers({ authorization: authHeader }) } as any
  const mobile = await authenticateRequest(carrier)
  if (!mobile) return null

  return {
    user: {
      id: mobile.id,
      email: mobile.email,
      name: mobile.name,
      image: mobile.image ?? null,
      role: mobile.role,
    },
  }
}

/**
 * Kısa yol: yalnızca `{ id, role }` gerektiğinde.
 */
export async function resolveStaff(req?: { headers: Headers } | any): Promise<{ id: string; role: string } | null> {
  const s = await getStaffSession(req)
  if (!s?.user) return null
  return { id: s.user.id, role: s.user.role }
}
