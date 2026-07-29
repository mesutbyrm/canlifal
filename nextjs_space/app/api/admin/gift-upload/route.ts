import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl } from '@/lib/s3';
import { resolveMediaUrl } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

// Allowed MIME types for gift assets
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/png', 'image/svg+xml', 'image/gif', 'image/webp', 'image/apng', 'image/jpeg'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'],
  lottie: ['application/json'],
};

const ALL_ALLOWED = Object.values(ALLOWED_TYPES).flat();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, contentType, purpose = 'asset' } = body;
    // purpose: asset | thumbnail | icon | sound | music

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName ve contentType zorunlu' }, { status: 400 });
    }

    if (!ALL_ALLOWED.includes(contentType)) {
      return NextResponse.json(
        { error: `Desteklenmeyen dosya türü: ${contentType}. Desteklenen: PNG, SVG, GIF, WebP, APNG, MP4, WebM, MP3, WAV, Lottie JSON` },
        { status: 400 }
      );
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `gift-${purpose}-${fileName}`,
      contentType,
      true, // public
      'gift/gifts'
    );

    // Gift assets are always public; return the full CDN URL so the admin UI
    // can persist a working absolute URL instead of a relative storage key.
    const publicUrl = resolveMediaUrl(cloud_storage_path);

    return NextResponse.json({ uploadUrl, cloud_storage_path, publicUrl });
  } catch (error) {
    console.error('Gift upload presigned URL error:', error);
    return NextResponse.json({ error: 'Yükleme bağlantısı oluşturulamadı' }, { status: 500 });
  }
}
