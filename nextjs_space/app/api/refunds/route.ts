import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { apiLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Kullanıcı tarafı iade talebi oluşturur. Gerçek para iadesi manueldir (çekim talepleriyle aynı mantık).
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const { success: ok } = apiLimiter.check(`refund-create:${authUser.id}`);
    if (!ok) return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const paymentId = body?.paymentId ? String(body.paymentId) : null;
    const storePurchaseId = body?.storePurchaseId ? String(body.storePurchaseId) : null;
    const reason = (body?.reason || '').toString().trim();
    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: 'İade nedeni en az 5 karakter olmalı' }, { status: 400 });
    }
    if (!paymentId && !storePurchaseId) {
      return NextResponse.json({ error: 'İade için ödeme veya satın alma bilgisi gerekli' }, { status: 400 });
    }

    // Sahiplik doğrulaması + tutar tespiti
    let amount = 0;
    let currency = 'TRY';
    if (paymentId) {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.userId !== authUser.id) {
        return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 });
      }
      if (payment.status === 'refunded') {
        return NextResponse.json({ error: 'Bu ödeme zaten iade edilmiş' }, { status: 409 });
      }
      amount = payment.amount;
      currency = payment.currency;
    } else if (storePurchaseId) {
      const sp = await prisma.storePurchase.findUnique({ where: { id: storePurchaseId } });
      if (!sp || sp.userId !== authUser.id) {
        return NextResponse.json({ error: 'Satın alma bulunamadı' }, { status: 404 });
      }
    }

    // Aynı öğe için bekleyen talep varsa tekrar oluşturma
    const existing = await prisma.refundRequest.findFirst({
      where: {
        userId: authUser.id,
        status: 'pending',
        ...(paymentId ? { paymentId } : {}),
        ...(storePurchaseId ? { storePurchaseId } : {}),
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Bu öğe için zaten bekleyen bir iade talebiniz var', refundId: existing.id }, { status: 409 });
    }

    const refund = await prisma.refundRequest.create({
      data: { userId: authUser.id, paymentId, storePurchaseId, amount, currency, reason },
    });

    return NextResponse.json({ success: true, refund });
  } catch (error) {
    console.error('refund create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Kullanıcının kendi iade taleplerini listeler.
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const refunds = await prisma.refundRequest.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ success: true, refunds });
  } catch (error) {
    console.error('refund list error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
