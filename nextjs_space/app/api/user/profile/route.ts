import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        image: true,
        bio: true,
        birthDate: true,
        birthTime: true,
        zodiacSign: true,
        risingSign: true,
        favoriteTeam: true,
        city: true,
        credits: true,
        jetonBalance: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        messagePrivacy: true,
        hideProfileViews: true,
        profileFrameId: true,
        adminAssignedFrameId: true,
        profileFrame: { select: { id: true, name: true, imageUrl: true } },
        adminAssignedFrame: { select: { id: true, name: true, imageUrl: true } },
        nameEffect: true,
        entranceEffectId: true,
        chatBubbleId: true,
        micFrameId: true,
        avatarAccessoryIds: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            fortunes: true,
            socialPosts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Get total likes on user's posts
    const likesCount = await prisma.socialLike.count({
      where: {
        post: {
          userId: auth.id
        }
      }
    });

    return NextResponse.json({
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      fortunesCount: user._count.fortunes,
      postsCount: user._count.socialPosts,
      likesCount
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

// Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { name, username, email, phone, image, bio, birthDate, birthTime, zodiacSign, risingSign, favoriteTeam, city, messagePrivacy, hideProfileViews } = body;

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;
    if (bio !== undefined) updateData.bio = bio || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (birthTime !== undefined) updateData.birthTime = birthTime;
    if (zodiacSign !== undefined) updateData.zodiacSign = zodiacSign;
    if (risingSign !== undefined) updateData.risingSign = risingSign;
    if (favoriteTeam !== undefined) updateData.favoriteTeam = favoriteTeam;
    // Profil tamamlama: şehir (mobil istemci gönderiyor)
    if (city !== undefined) updateData.city = typeof city === 'string' ? (city.trim().slice(0, 60) || null) : null;
    if (messagePrivacy !== undefined && ['everyone', 'followers', 'nobody'].includes(messagePrivacy)) {
      updateData.messagePrivacy = messagePrivacy;
    }
    if (hideProfileViews !== undefined) {
      updateData.hideProfileViews = !!hideProfileViews;
    }

    // Check username uniqueness
    if (username !== undefined) {
      if (username) {
        // Auto-lowercase username
        const normalizedUsername = username.toLowerCase().trim();
        // Validate username format (alphanumeric, underscore, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(normalizedUsername)) {
          return NextResponse.json({ 
            error: 'username_invalid',
            message: 'Kullanıcı adı 3-20 karakter, sadece harf, rakam ve alt çizgi içerebilir'
          }, { status: 400 });
        }
        
        const existingUsername = await prisma.user.findFirst({
          where: { username: normalizedUsername, NOT: { id: auth.id } }
        });
        if (existingUsername) {
          return NextResponse.json({ 
            error: 'username_taken',
            message: 'Bu kullanıcı adı zaten kullanılıyor'
          }, { status: 400 });
        }
        updateData.username = normalizedUsername;
      } else {
        updateData.username = null;
      }
    }

    // Check email uniqueness
    if (email !== undefined && email !== auth.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ 
          error: 'email_invalid',
          message: 'Geçerli bir email adresi girin'
        }, { status: 400 });
      }
      
      const existingEmail = await prisma.user.findFirst({
        where: { email, NOT: { id: auth.id } }
      });
      if (existingEmail) {
        return NextResponse.json({ 
          error: 'email_taken',
          message: 'Bu email adresi zaten kullanılıyor'
        }, { status: 400 });
      }
      updateData.email = email;
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        image: true,
        bio: true,
        birthDate: true,
        birthTime: true,
        zodiacSign: true,
        risingSign: true,
        favoriteTeam: true,
        city: true,
        messagePrivacy: true,
        hideProfileViews: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
