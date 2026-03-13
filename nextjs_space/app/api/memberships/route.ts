import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: List active membership plans for users
export async function GET() {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching membership plans:', error)
    return NextResponse.json([], { status: 500 })
  }
}
