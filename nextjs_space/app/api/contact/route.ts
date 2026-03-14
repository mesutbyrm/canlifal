import { NextResponse } from 'next/server'
import { sendNotificationEmail, getContactFormEmailHtml } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Send notification to admin
    const adminEmail = 'mesutbyrm1@gmail.com'
    const htmlBody = getContactFormEmailHtml(name, email, message)

    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_LETIIM_FORMU || '',
      recipientEmail: adminEmail,
      subject: `Yeni İletişim Mesajı: ${name}`,
      htmlBody,
    })

    return NextResponse.json({ success: true, message: 'Message sent successfully' })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
