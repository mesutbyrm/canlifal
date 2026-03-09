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
    <div className="min-h-screen bg-[#0a0118] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0118]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="w-10" />
          <h1 className="text-white font-semibold text-lg">
            {profile?.name || session.user.name}
          </h1>
          <Link href={`/${language}/settings`}>
            <Settings className="w-6 h-6 text-white" />
          </Link>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-6">
        {/* Avatar & Stats Row */}
        <div className="flex items-center justify-center gap-8">
          {/* Followers */}
          <div className="text-center">
            <p className="text-white text-xl font-bold">{profile?.followingCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takip' : 'Following'}</p>
          </div>
          
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 bg-gradient-to-br from-purple-600 to-pink-600">
              {profile?.image || session.user.image ? (
                <Image
                  src={profile?.image || session.user.image || ''}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {(profile?.name || session.user.name)?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <Link 
              href={`/${language}/settings`}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#fe2c55] rounded-full flex items-center justify-center border-2 border-[#0a0118]"
            >
              <Plus className="w-4 h-4 text-white" />
            </Link>
          </div>
          
          {/* Followers */}
          <div className="text-center">
            <p className="text-white text-xl font-bold">{profile?.followersCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takipçi' : 'Followers'}</p>
          </div>
        </div>

        {/* Username */}
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">@{(profile?.name || session.user.name)?.toLowerCase().replace(/\s+/g, '')}</p>
        </div>

        {/* Likes Count */}
        <div className="flex items-center justify-center gap-1 mt-2">
          <Heart className="w-4 h-4 text-gray-400" fill="currentColor" />
          <span className="text-gray-400 text-sm">{profile?.likesCount || 0}</span>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="text-white text-center mt-3 text-sm px-8">
            {profile.bio}
          </p>
        )}

        {/* Credits Badge */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full px-4 py-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-semibold">{profile?.credits || session.user.credits || 0}</span>
            <span className="text-amber-400/70 text-sm">{language === 'tr' ? 'Kredi' : 'Credits'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 px-4">
          <Link 
            href={`/${language}/settings`}
            className="flex-1 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white font-semibold py-2.5 rounded-md text-center text-sm transition-colors"
          >
            {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
          </Link>
          <button className="flex-1 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white font-semibold py-2.5 rounded-md text-sm transition-colors">
            {language === 'tr' ? 'Profili Paylaş' : 'Share Profile'}
          </button>
          <Link
            href={`/${language}/credits`}
            className="w-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black flex items-center justify-center rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
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
