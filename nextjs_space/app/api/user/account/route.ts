export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { revokeAllUserTokens } from '@/lib/token-revocation'
import { recordAudit } from '@/lib/audit-log'

/**
 * Hesap silme — KVKK ve Google Play "hesap silme" zorunluluğu için.
 *
 * DELETE /api/user/account          (gövde: { password?, reason?, confirm: true })
 * POST   /api/user/account/delete   (aynı işlem; DELETE gövdesi gönderemeyen
 *                                    istemciler için alias — ayrı dosyada)
 *
 * YAKLAŞIM: HARD DELETE DEĞİL, ANONİMLEŞTİRME.
 * Kullanıcının kişisel verileri silinir/anonimleştirilir; ancak yasal olarak
 * saklanması gereken finansal kayıtlar (ödeme, ledger, çekim, jeton hareketi)
 * ve denetim (audit) kayıtları bozulmadan korunur. Böylece mevcut web
 * sitesindeki muhasebe ve raporlama akışları bozulmaz.
 *
 * Silinen/temizlenen: e-posta, ad, kullanıcı adı, telefon, avatar, biyografi,
 * doğum bilgileri, şehir, şifre, referans kodu, push cihaz kayıtları,
 * oturum/hesap bağlantıları (OAuth), okunmamış bildirimler.
 * Korunan: Payment, Ledger, Withdrawal, CreditTransaction, AuditLog, hediye
 * geçmişi gibi finansal/denetim kayıtları (anonim kullanıcıya bağlı kalır).
 */

const ANON_DOMAIN = 'deleted.canlifal.local'

export async function handleAccountDeletion(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    let body: any = {}
    try { body = await req.json() } catch { /* gövde opsiyonel olabilir */ }

    if (body?.confirm !== true) {
      return NextResponse.json(
        {
          error: 'Hesap silme işlemi onay gerektirir.',
          code: 'CONFIRMATION_REQUIRED',
          requiresConfirmation: true,
          confirmationMessage:
            'Hesabınız kalıcı olarak silinecek. Jeton, CFC ve Gold üyelik bakiyeleriniz iade edilmez. Devam etmek istiyor musunuz?',
        },
        { status: 409 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, username: true, password: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Zaten silinmiş mi?
    const existing = await prisma.accountDeletion.findUnique({ where: { userId: user.id } })
    if (existing) {
      return NextResponse.json(
        { error: 'Bu hesap zaten silinmiş.', code: 'ALREADY_DELETED' },
        { status: 409 }
      )
    }

    // Şifre ile hesabı olan kullanıcılar için yeniden kimlik doğrulama zorunlu.
    if (user.password) {
      if (typeof body?.password !== 'string' || body.password.length < 1) {
        return NextResponse.json(
          { error: 'Hesabınızı silmek için şifrenizi girmelisiniz.', code: 'PASSWORD_REQUIRED' },
          { status: 422 }
        )
      }
      const ok = await bcrypt.compare(body.password, user.password)
      if (!ok) {
        return NextResponse.json({ error: 'Şifre hatalı', code: 'INVALID_CREDENTIALS' }, { status: 401 })
      }
    }

    // Yayın/oda sahipliği gibi aktif durumları güvenli hale getir.
    try {
      await prisma.videoStream.updateMany({
        where: { userId: user.id, status: 'live' },
        data: { status: 'ended', endedAt: new Date() },
      })
    } catch { /* alan yoksa yoksay */ }

    const shortId = user.id.slice(-10)
    const anonEmail = `deleted_${shortId}@${ANON_DOMAIN}`
    const anonUsername = `deleted_${shortId}`

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: anonEmail,
        emailVerified: null,
        password: null,
        name: 'Silinmiş Kullanıcı',
        username: anonUsername,
        phone: null,
        image: null,
        bio: null,
        birthDate: null,
        birthTime: null,
        zodiacSign: null,
        risingSign: null,
        city: null,
        referralCode: null,
        activeDeviceToken: null,
        messagePrivacy: 'nobody',
        hideProfileViews: true,
        role: 'user',
        specialBadges: null,
        profileEffect: null,
      },
    })

    // Push cihazları (tek tek sil — toplu silme platformda engelli)
    let devicesRemoved = 0
    try {
      const devices = await prisma.userDevice.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      for (const d of devices) {
        try { await prisma.userDevice.delete({ where: { id: d.id } }); devicesRemoved++ } catch { /* yoksay */ }
      }
    } catch { /* yoksay */ }

    // OAuth bağlantıları ve web oturumları
    let sessionsRemoved = 0
    try {
      const sessions = await prisma.session.findMany({ where: { userId: user.id }, select: { id: true } })
      for (const s of sessions) {
        try { await prisma.session.delete({ where: { id: s.id } }); sessionsRemoved++ } catch { /* yoksay */ }
      }
    } catch { /* yoksay */ }
    try {
      const accounts = await prisma.account.findMany({ where: { userId: user.id }, select: { id: true } })
      for (const a of accounts) {
        try { await prisma.account.delete({ where: { id: a.id } }) } catch { /* yoksay */ }
      }
    } catch { /* yoksay */ }

    // Mobil token'ların tamamını iptal et
    await revokeAllUserTokens(user.id, 'account_deleted')

    const record = await prisma.accountDeletion.create({
      data: {
        userId: user.id,
        originalEmail: user.email,
        originalUsername: user.username,
        reason: typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null,
        source: req.headers.get('authorization')?.startsWith('Bearer ') ? 'mobile' : 'web',
        status: 'completed',
        completedAt: new Date(),
      },
    })

    await recordAudit({
      actorId: user.id,
      action: 'user.account_deleted',
      targetType: 'user',
      targetId: user.id,
      description: 'Kullanıcı kendi hesabını sildi (anonimleştirme)',
      metadata: { devicesRemoved, sessionsRemoved, deletionId: record.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Hesabınız silindi. Kişisel verileriniz anonimleştirildi.',
      data: { deletionId: record.id, devicesRemoved, sessionsRemoved },
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Hesap silinemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  return handleAccountDeletion(req)
}

/** DELETE gövdesi gönderemeyen istemciler için aynı uçta POST desteği. */
export async function POST(req: NextRequest) {
  return handleAccountDeletion(req)
}
