import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { sendNotificationEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

// Apply to become a fortune teller
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already has an application
    const existing = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an application' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { displayName, bio, specialties, applicationNote } = body

    if (!displayName || !specialties || specialties.length === 0) {
      return NextResponse.json(
        { error: 'Display name and at least one specialty required' },
        { status: 400 }
      )
    }

    // Create the application
    const teller = await prisma.liveFortuneTeller.create({
      data: {
        userId: session.user.id,
        displayName,
        bio: bio || null,
        specialties,
        applicationNote: applicationNote || null,
        applicationStatus: 'pending',
        isActive: false,
        isVerified: false,
        // Default permissions
        canGoOnline: true,
        canChat: true,
        canStartSession: true,
        canSetPrice: false,
        canEditProfile: true,
        canViewEarnings: true,
        canWithdraw: false,
        maxSessionsPerDay: 10,
        commissionRate: 20
      }
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'teller_application',
          title: 'Yeni Falcı Başvurusu',
          message: `${displayName} falcı olmak için başvurdu.`,
          data: JSON.stringify({ tellerId: teller.id })
        }
      })
    }

    // Send email notification to admin
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">🔮 Yeni Falcı Başvurusu</h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Falcı Adı:</strong> ${displayName}</p>
          <p style="margin: 10px 0;"><strong>Uzmanlık Alanları:</strong> ${specialties.join(', ')}</p>
          ${bio ? `<p style="margin: 10px 0;"><strong>Bio:</strong> ${bio}</p>` : ''}
          ${applicationNote ? `<p style="margin: 10px 0;"><strong>Başvuru Notu:</strong> ${applicationNote}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Başvuru Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Lütfen başvuruyu inceleyin ve onaylayın/reddedin.</p>
      </div>
    `;

    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_FALC_BAVURUSU || '',
      recipientEmail: 'mesutbyrm1@gmail.com',
      subject: `🔮 Yeni Falcı Başvurusu: ${displayName}`,
      htmlBody: emailHtml,
    }).catch(err => console.error('Teller application email error:', err))

    return NextResponse.json({ success: true, teller })
  } catch (error) {
    console.error('Apply teller error:', error)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
