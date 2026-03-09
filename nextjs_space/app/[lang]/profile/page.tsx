'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Settings, Share2, Grid3X3, Bookmark, Heart, Eye,
  Camera, ChevronRight, Sparkles, Edit3, Plus
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  credits: number
  followersCount: number
  followingCount: number
  likesCount: number
  postsCount: number
  fortunesCount: number
}

interface Post {
  id: string
  imageUrl: string | null
  content: string
  viewCount: number
  _count: { likes: number }
}

export default function ProfilePage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'fortunes' | 'saved'>('posts')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
      return
    }
    
    if (session?.user?.id) {
      fetchProfile()
      fetchPosts()
    }
  }, [session, status, language])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/social/posts?myPosts=true&limit=12')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (e) {
      console.error('Posts fetch error:', e)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-[#0a0118] pb-32 pt-6">
      {/* Profile Info */}
      <div className="px-4">
        {/* Avatar - Centered */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Rainbow border */}
            <div 
              className="w-28 h-28 rounded-full p-1"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 25%, #8b5cf6 50%, #3b82f6 75%, #f59e0b 100%)',
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                  {profile?.image || session.user.image ? (
                    <Image
                      src={profile?.image || session.user.image || ''}
                      alt="Profile"
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {(profile?.name || session.user.name)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Camera button */}
            <Link 
              href={`/${language}/settings`}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-[#0a0118]"
            >
              <Camera className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>

        {/* Name */}
        <h1 className="text-white text-2xl font-bold text-center mt-4">
          {profile?.name || session.user.name}
        </h1>

        {/* Username */}
        <p className="text-purple-400 text-center mt-1">
          @{(profile?.name || session.user.name)?.toLowerCase().replace(/\s+/g, '')}
        </p>

        {/* Bio or Add Bio */}
        <div className="text-center mt-2">
          {profile?.bio ? (
            <p className="text-gray-300 text-sm px-8">{profile.bio}</p>
          ) : (
            <Link href={`/${language}/settings`} className="text-purple-400 text-sm italic">
              + {language === 'tr' ? 'Bio ekle' : 'Add bio'}
            </Link>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 mt-5">
          <div className="text-center">
            <p className="text-white text-xl font-bold">{profile?.followingCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takipte' : 'Following'}</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{profile?.followersCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takipçi' : 'Followers'}</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{profile?.likesCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Beğeniler' : 'Likes'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 px-2">
          <Link 
            href={`/${language}/fortunes`}
            className="flex-1 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold py-3 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span className="leading-tight">{language === 'tr' ? 'Fal\nStüdyom' : 'Fortune\nStudio'}</span>
          </Link>
          <Link 
            href={`/${language}/messages`}
            className="flex-1 border border-purple-500/50 hover:border-purple-400 text-white font-semibold py-3 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-amber-400" />
            <span>{language === 'tr' ? 'Mesajlar' : 'Messages'}</span>
          </Link>
          <Link
            href={`/${language}/chat/video/setup`}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">◉</span>
            <span>{language === 'tr' ? 'CANLI' : 'LIVE'}</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'posts' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('fortunes')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'fortunes' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'saved' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Content Grid */}
      <div className="px-0.5 pt-0.5">
        {activeTab === 'posts' && (
          <>
            {posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${language}/fal/${post.id}`}
                    className="relative aspect-[3/4] bg-[#1a1a1a] overflow-hidden group"
                  >
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt="Post"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white text-sm">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white text-sm">
                        <Heart className="w-4 h-4" />
                        <span>{post._count?.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-white text-xl font-semibold">
                  {language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {language === 'tr' ? 'Fal paylaşımlarınız burada görünecek' : 'Your fortune posts will appear here'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'fortunes' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-white text-xl font-semibold">
              {language === 'tr' ? 'Fallarınız' : 'Your Fortunes'}
            </p>
            <p className="text-gray-500 text-sm mt-1 text-center px-8">
              {language === 'tr' ? 'Baktırdığınız fallar burada görünecek' : 'Your fortune readings will appear here'}
            </p>
            <Link
              href={`/${language}/dashboard`}
              className="mt-4 px-6 py-2 bg-[#fe2c55] text-white font-semibold rounded-md"
            >
              {language === 'tr' ? 'Fallara Git' : 'View Fortunes'}
            </Link>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
              <Bookmark className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-white text-xl font-semibold">
              {language === 'tr' ? 'Kaydedilenler' : 'Saved'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {language === 'tr' ? 'Kaydettiğiniz içerikler burada görünecek' : 'Your saved content will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
