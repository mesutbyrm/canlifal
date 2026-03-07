import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(methods)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json([], { status: 500 })
  }
}
