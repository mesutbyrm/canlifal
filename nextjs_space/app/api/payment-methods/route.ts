import { NextResponse } from 'next/server'
import { getCachedPaymentMethods } from '@/lib/cache'

export async function GET() {
  try {
    const methods = await getCachedPaymentMethods()
    return NextResponse.json(methods)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json([], { status: 500 })
  }
}
