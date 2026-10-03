import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pending-counts
 * Returns badge counts for the admin profile menu shortcuts.
 */
export async function GET() {
  try {
    const session = await getStaffSession()
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'moderation.user.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [
      jetonRequests,
      withdrawalRequests,
      tellerApplications,
      agencyApplications,
      newMembers,
      pendingVerifications,
    ] = await Promise.all([
      prisma.paymentNotification.count({ where: { status: 'pending' } }),
      prisma.withdrawalRequest.count({ where: { status: 'pending' } }),
      prisma.liveFortuneTeller.count({ where: { applicationStatus: 'pending' } }),
      prisma.agency.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.liveFortuneTeller.count({ where: { verificationStatus: 'pending' } }),
    ])

    // Complaints: count of users with active warnings (proxy for moderation queue)
    const complaints = await prisma.tellerWarning.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }).catch(() => 0)

    return NextResponse.json({
      jetonRequests,
      withdrawalRequests,
      tellerApplications,
      agencyApplications,
      newMembers,
      pendingVerifications,
      complaints,
    })
  } catch (err) {
    console.error('pending-counts error:', err)
    return NextResponse.json({
      jetonRequests: 0,
      withdrawalRequests: 0,
      tellerApplications: 0,
      agencyApplications: 0,
      newMembers: 0,
      pendingVerifications: 0,
      complaints: 0,
    })
  }
}
