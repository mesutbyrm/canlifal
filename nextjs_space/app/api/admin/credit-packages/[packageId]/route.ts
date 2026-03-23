import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update a credit package
export async function PATCH(
  request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
    if (body.credits !== undefined) updateData.credits = parseInt(body.credits);
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.bonusCredits !== undefined) updateData.bonusCredits = parseInt(body.bonusCredits);
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = parseInt(body.sortOrder);

    const updated = await prisma.creditPackage.update({
      where: { id: params.packageId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update package error:', error);
    return NextResponse.json({ error: 'Paket güncellenemedi' }, { status: 500 });
  }
}

// Delete a credit package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    await prisma.creditPackage.delete({
      where: { id: params.packageId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    return NextResponse.json({ error: 'Paket silinemedi' }, { status: 500 });
  }
}
