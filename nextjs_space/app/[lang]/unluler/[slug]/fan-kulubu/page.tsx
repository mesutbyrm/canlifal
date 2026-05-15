'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Heart, Users, Send, Loader2,
  MessageCircle, Crown, Shield, Star, Trash2, Pin,
  UserPlus, UserMinus, ChevronDown, Sparkles, Clock,
  BarChart3, Plus, Trophy, Zap, Share2
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface FanClubData {
  id: string
  description: string | null
  rules: string[]
  coverImage: string | null
  memberCount: number
  isActive: boolean
  isMember: boolean
  memberRole: string | null
  celebrity: {
    id: string
    name: string
    slug: string
    profileImage: string | null
  }
}

interface PostUser {
  id: string
  name: string
  image: string | null
  username: string | null
  membership: string | null
}

interface Post {
  id: string
  content: string
  image: string | null
  likeCount: number
  isPinned: boolean
  createdAt: string
  isLiked: boolean
  user: PostUser
}

interface Member {
  id: string
  role: string
  createdAt: string
  user: PostUser
}

interface Poll {
  id: string
  question: string
  options: string[]
  isActive: boolean
  endsAt: string | null
  createdAt: string
  totalVotes: number
  userVote: number | null
  results: { option: string; votes: number; percentage: number }[]
  user: { name: string; image: string | null }
}

interface FanLevel {
  level: string
  levelLabel: string
  levelEmoji: string
  xp: number
  nextLevel: string | null
  nextLevelLabel: string | null
  nextLevelXp: number | null
  progress: number
}

const LEVEL_COLORS: Record<string, string> = {
  yeni_fan: 'from-gray-500 to-gray-600',
  aktif_fan: 'from-blue-500 to-blue-600',
  super_fan: 'from-orange-500 to-red-500',
  vip_fan: 'from-purple-500 to-fuchsia-500',
  efsane_fan: 'from-yellow-400 to-amber-500',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export default function FanClubPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const slug = params?.slug as string

  const [fanClub, setFanClub] = useState<FanClubData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [fanLevel, setFanLevel] = useState<FanLevel | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'wall' | 'members' | 'polls' | 'rules'>('wall')
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [joining, setJoining] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingPolls, setLoadingPolls] = useState(false)
  const [postsPage, setPostsPage] = useState(1)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [showPollForm, setShowPollForm] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [votingPollId, setVotingPollId] = useState<string | null>(null)
  // Celebrity posts + comments
  const [celebPosts, setCelebPosts] = useState<any[]>([])
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [postComments, setPostComments] = useState<Record<string, any[]>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({})

  const fetchFanClub = useCallback(async () => {
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club`)
      const data = await res.json()
      if (data.fanClub) setFanClub(data.fanClub)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [slug])

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    setLoadingPosts(true)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/posts?page=${page}&limit=20`)
      const data = await res.json()
      if (append) {
        setPosts(prev => [...prev, ...(data.posts || [])])
      } else {
        setPosts(data.posts || [])
      }
      setHasMorePosts(page < (data.totalPages || 0))
      setPostsPage(page)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPosts(false)
    }
  }, [slug])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/members`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      console.error(err)
    }
  }, [slug])

  const fetchPolls = useCallback(async () => {
    setLoadingPolls(true)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/polls`)
      const data = await res.json()
      setPolls(data.polls || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPolls(false)
    }
  }, [slug])

  const fetchLevel = useCallback(async () => {
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/level`)
      const data = await res.json()
      if (data.level) setFanLevel(data)
    } catch (err) {
      console.error(err)
    }
  }, [slug])

  const fetchCelebPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/celebrities/${slug}/posts?limit=20`)
      const data = await res.json()
      setCelebPosts((data.posts || []).map((p: any) => ({ ...p, _isCeleb: true })))
    } catch { setCelebPosts([]) }
  }, [slug])

  const toggleComments = async (postId: string, isCeleb: boolean) => {
    const isOpen = openComments[postId]
    setOpenComments(prev => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !postComments[postId]) {
      setCommentLoading(prev => ({ ...prev, [postId]: true }))
      try {
        const url = isCeleb
          ? `/api/celebrities/${slug}/posts/comments?postId=${postId}`
          : `/api/celebrities/${slug}/fan-club/posts?postId=${postId}` // fan posts don't have separate comments endpoint yet
        if (isCeleb) {
          const res = await fetch(url)
          const data = await res.json()
          setPostComments(prev => ({ ...prev, [postId]: data.comments || [] }))
        } else {
          setPostComments(prev => ({ ...prev, [postId]: [] }))
        }
      } catch {}
      setCommentLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleSendCelebComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim()
    if (!text || !session?.user) return
    setSendingComment(prev => ({ ...prev, [postId]: true }))
    try {
      const res = await fetch(`/api/celebrities/${slug}/posts/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: text }),
      })
      const data = await res.json()
      if (data.comment) {
        setPostComments(prev => ({ ...prev, [postId]: [data.comment, ...(prev[postId] || [])] }))
        setCommentTexts(prev => ({ ...prev, [postId]: '' }))
        setCelebPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
      }
    } catch {}
    setSendingComment(prev => ({ ...prev, [postId]: false }))
  }

  const handleLikeCelebPost = async (postId: string) => {
    if (!session?.user) { router.push('/giris'); return }
    try {
      const res = await fetch(`/api/celebrities/${slug}/posts/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      setCelebPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: data.liked, likeCount: data.liked ? p.likeCount + 1 : p.likeCount - 1 } : p))
    } catch {}
  }

  const handleShareWallPost = async (content: string) => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/unluler/${slug}/fan-kulubu`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: fanClub?.celebrity?.name || '', text: content?.slice(0, 100) || '', url: shareUrl }) } catch {}
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  useEffect(() => { fetchFanClub() }, [fetchFanClub])
  useEffect(() => { if (tab === 'wall') { fetchPosts(); fetchCelebPosts() } }, [tab, fetchPosts, fetchCelebPosts])
  useEffect(() => { if (tab === 'members') fetchMembers() }, [tab, fetchMembers])
  useEffect(() => { if (tab === 'polls') fetchPolls() }, [tab, fetchPolls])
  useEffect(() => { if (session?.user) fetchLevel() }, [session, fetchLevel])

  const handleJoin = async () => {
    if (!session?.user) { router.push('/giris'); return }
    setJoining(true)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/join`, { method: 'POST' })
      const data = await res.json()
      setFanClub(prev => prev ? {
        ...prev,
        isMember: data.joined,
        memberRole: data.joined ? 'member' : null,
        memberCount: data.memberCount,
      } : null)
    } catch (err) {
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  const handlePost = async () => {
    if (!newPost.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      })
      const data = await res.json()
      if (data.post) {
        setPosts(prev => [data.post, ...prev])
        setNewPost('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!session?.user) { router.push('/giris'); return }
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/posts/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, isLiked: data.liked, likeCount: data.likeCount } : p
      ))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bu gönderiyi silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/celebrities/${slug}/fan-club/posts?postId=${postId}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.trim())
    if (!pollQuestion.trim() || validOptions.length < 2) return
    setCreatingPoll(true)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', question: pollQuestion, options: validOptions }),
      })
      const data = await res.json()
      if (data.poll) {
        setPolls(prev => [data.poll, ...prev])
        setPollQuestion('')
        setPollOptions(['', ''])
        setShowPollForm(false)
        fetchLevel()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingPoll(false)
    }
  }

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!session?.user) { router.push('/giris'); return }
    setVotingPollId(pollId)
    try {
      const res = await fetch(`/api/celebrities/${slug}/fan-club/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', pollId, optionIndex }),
      })
      const data = await res.json()
      if (data.poll) {
        setPolls(prev => prev.map(p => p.id === pollId ? data.poll : p))
        fetchLevel()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setVotingPollId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (!fanClub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
          <p className="text-purple-300/50 text-lg">Fan kulübü bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Header */}
      <div className="relative">
        <div className="h-32 sm:h-44 bg-gradient-to-r from-fuchsia-900/60 via-purple-900/40 to-pink-900/30">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0014] to-transparent" />
        </div>

        <div className="absolute top-16 left-4 z-10">
          <button
            onClick={() => router.push(`/unluler/${slug}`)}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-4"
          >
            {/* Celebrity avatar */}
            <Link href={`/unluler/${slug}`}>
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#0a0014] shadow-xl shadow-fuchsia-500/20 flex-shrink-0">
                {fanClub.celebrity.profileImage ? (
                  <Image
                    src={fanClub.celebrity.profileImage}
                    alt={fanClub.celebrity.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{fanClub.celebrity.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{fanClub.celebrity.name}</h1>
                <BadgeCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-fuchsia-400 text-sm">
                <Crown className="w-4 h-4" />
                <span className="font-medium">Fan Kulübü</span>
                <span className="text-purple-400/50 ml-2">• {fanClub.memberCount} üye</span>
              </div>
            </div>
            {/* Join/Leave button */}
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 flex-shrink-0 ${
                fanClub.isMember
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/30'
                  : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-600/30'
              }`}
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : fanClub.isMember ? (
                <><UserMinus className="w-4 h-4" /> Ayrıl</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Katıl</>
              )}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Fan Level Badge */}
      {fanClub.isMember && fanLevel && (
        <div className="max-w-3xl mx-auto px-4 mt-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{fanLevel.levelEmoji}</span>
                <span className={`text-sm font-bold bg-gradient-to-r ${LEVEL_COLORS[fanLevel.level] || 'from-gray-500 to-gray-600'} bg-clip-text text-transparent`}>
                  {fanLevel.levelLabel}
                </span>
                <span className="text-xs text-purple-400/50 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {fanLevel.xp} XP
                </span>
              </div>
              {fanLevel.nextLevelLabel && (
                <span className="text-xs text-purple-400/40">
                  Sonraki: {fanLevel.nextLevelLabel} ({fanLevel.nextLevelXp} XP)
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-purple-900/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fanLevel.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${LEVEL_COLORS[fanLevel.level] || 'from-gray-500 to-gray-600'}`}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Description */}
      {fanClub.description && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <p className="text-purple-300/60 text-sm">{fanClub.description}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="flex border-b border-purple-500/10">
          {[
            { key: 'wall' as const, label: 'Duvar', icon: MessageCircle },
            { key: 'polls' as const, label: 'Anketler', icon: BarChart3 },
            { key: 'members' as const, label: 'Üyeler', icon: Users },
            { key: 'rules' as const, label: 'Kurallar', icon: Shield },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                tab === t.key
                  ? 'border-fuchsia-500 text-fuchsia-400'
                  : 'border-transparent text-purple-400/50 hover:text-purple-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4">
        {/* Wall Tab */}
        {tab === 'wall' && (
          <div>
            {/* New post */}
            {fanClub.isMember && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-purple-700">
                    {session?.user?.image ? (
                      <Image src={session.user.image} alt="" width={36} height={36} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={e => setNewPost(e.target.value)}
                      placeholder="Fan duvarına bir şey yaz..."
                      rows={2}
                      className="w-full bg-transparent text-white placeholder-purple-400/40 text-sm resize-none focus:outline-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handlePost}
                        disabled={!newPost.trim() || posting}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-fuchsia-600 text-white text-sm font-medium hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Paylaş
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!fanClub.isMember && (
              <div className="mb-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm text-center">
                <Sparkles className="w-5 h-5 inline mr-2" />
                Gönderi paylaşmak için fan kulübüne katılın
              </div>
            )}

            {/* Celebrity Posts Section */}
            {celebPosts.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-fuchsia-500 to-pink-500" />
                  <h3 className="text-sm font-semibold text-fuchsia-300">Ünlü Paylaşımları</h3>
                </div>
                <div className="space-y-3">
                  {celebPosts.slice(0, 5).map((cp: any, i: number) => (
                    <motion.div
                      key={cp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-pink-500/10 border border-fuchsia-500/20 backdrop-blur-sm overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 p-3">
                        <Link href={`/unluler/${slug}`}>
                          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-fuchsia-500/40 flex-shrink-0">
                            {fanClub.celebrity.profileImage ? (
                              <Image src={fanClub.celebrity.profileImage} alt={fanClub.celebrity.name} width={36} height={36} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold">{fanClub.celebrity.name.charAt(0)}</div>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">{fanClub.celebrity.name}</span>
                            <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          </div>
                          <span className="text-[10px] text-purple-400/50 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(cp.createdAt)}</span>
                        </div>
                        {cp.platform && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20">{cp.platform}</span>
                        )}
                      </div>

                      {/* Media */}
                      {cp.mediaUrl && (
                        <div className="relative aspect-video bg-purple-900/20">
                          <Image src={cp.mediaUrl} alt="" fill className="object-cover" sizes="600px" />
                        </div>
                      )}

                      {/* Content */}
                      {cp.content && (
                        <div className="px-3 pt-2">
                          <p className="text-sm text-purple-200/80 whitespace-pre-line break-words leading-relaxed">
                            <span className="font-semibold text-white mr-1">{fanClub.celebrity.name}</span>
                            {cp.content}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="px-3 pt-2 pb-1">
                        <div className="flex items-center gap-4">
                          <button onClick={() => handleLikeCelebPost(cp.id)} className={`flex items-center gap-1.5 text-xs transition-colors ${cp.isLiked ? 'text-pink-400' : 'text-purple-400/50 hover:text-pink-400'}`}>
                            <Heart className={`w-4 h-4 ${cp.isLiked ? 'fill-current' : ''}`} />
                            {cp.likeCount > 0 && cp.likeCount}
                          </button>
                          <button onClick={() => toggleComments(cp.id, true)} className="flex items-center gap-1.5 text-xs text-purple-400/50 hover:text-purple-300 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            {cp.commentCount > 0 && cp.commentCount}
                          </button>
                          <button onClick={() => handleShareWallPost(cp.content || '')} className="flex items-center gap-1.5 text-xs text-purple-400/50 hover:text-purple-300 transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {openComments[cp.id] && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-3 pb-2 space-y-2 max-h-40 overflow-y-auto border-t border-fuchsia-500/10 pt-2">
                              {commentLoading[cp.id] ? (
                                <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" /></div>
                              ) : (postComments[cp.id] || []).length === 0 ? (
                                <p className="text-xs text-purple-400/40 py-1">Henüz yorum yok</p>
                              ) : (
                                (postComments[cp.id] || []).map((c: any) => (
                                  <div key={c.id} className="flex gap-2">
                                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-purple-700">
                                      {c.user.image ? <Image src={c.user.image} alt="" width={20} height={20} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">{c.user.name.charAt(0)}</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-purple-200/80"><span className="font-semibold text-white mr-1">{c.user.name}</span>{c.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            {session?.user && (
                              <div className="px-3 pb-2 flex items-center gap-2 border-t border-fuchsia-500/10 pt-2">
                                <input type="text" value={commentTexts[cp.id] || ''} onChange={e => setCommentTexts(prev => ({ ...prev, [cp.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendCelebComment(cp.id) } }} placeholder="Yorum yaz..." className="flex-1 bg-transparent text-xs text-white placeholder-purple-400/40 focus:outline-none" />
                                <button onClick={() => handleSendCelebComment(cp.id)} disabled={!commentTexts[cp.id]?.trim() || sendingComment[cp.id]} className="text-fuchsia-400 disabled:opacity-30">
                                  {sendingComment[cp.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Fan Duvarı Separator */}
            {celebPosts.length > 0 && posts.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-blue-500" />
                <h3 className="text-sm font-semibold text-purple-300">Fan Duvarı</h3>
              </div>
            )}

            {/* Fan Posts */}
            {loadingPosts && posts.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
              </div>
            ) : posts.length === 0 && celebPosts.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="w-12 h-12 text-purple-500/20 mx-auto mb-3" />
                <p className="text-purple-300/40 text-sm">Henüz gönderi yok</p>
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-2xl border backdrop-blur-sm ${
                      post.isPinned
                        ? 'bg-fuchsia-500/10 border-fuchsia-500/20'
                        : 'bg-white/5 border-purple-500/10'
                    }`}
                  >
                    {post.isPinned && (
                      <div className="flex items-center gap-1 text-fuchsia-400 text-xs mb-2">
                        <Pin className="w-3 h-3" /> Sabitlenmiş
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Link href={`/profil/${post.user.id}`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-purple-700">
                          {post.user.image ? (
                            <Image src={post.user.image} alt={post.user.name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                              {post.user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/profil/${post.user.id}`} className="text-sm font-semibold text-white hover:text-fuchsia-300 transition-colors">
                            {post.user.name}
                          </Link>
                          {post.user.membership === 'premium' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-300">VIP</span>
                          )}
                          <span className="text-purple-400/40 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(post.createdAt)}
                          </span>
                        </div>
                        <p className="text-purple-200/80 text-sm mt-1.5 whitespace-pre-line break-words">{post.content}</p>
                        {post.image && (
                          <div className="relative mt-2 rounded-xl overflow-hidden aspect-video bg-purple-900/20">
                            <Image src={post.image} alt="" fill className="object-cover" sizes="600px" />
                          </div>
                        )}
                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${
                              post.isLiked ? 'text-pink-400' : 'text-purple-400/50 hover:text-pink-400'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                            {post.likeCount > 0 && post.likeCount}
                          </button>
                          <button onClick={() => handleShareWallPost(post.content)} className="flex items-center gap-1.5 text-xs text-purple-400/50 hover:text-purple-300 transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                          {(post.user.id === session?.user?.id || ['admin', 'yonetici', 'moderator'].includes(session?.user?.role || '')) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="flex items-center gap-1 text-xs text-purple-400/30 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {hasMorePosts && (
                  <button
                    onClick={() => fetchPosts(postsPage + 1, true)}
                    disabled={loadingPosts}
                    className="w-full py-3 text-sm text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingPosts ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    Daha fazla göster
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Polls Tab */}
        {tab === 'polls' && (
          <div>
            {/* Create Poll Button */}
            {fanClub.isMember && !showPollForm && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowPollForm(true)}
                className="w-full mb-4 p-3 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/20 text-fuchsia-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-fuchsia-600/20 transition-colors"
              >
                <Plus className="w-4 h-4" /> Yeni Anket Oluştur
              </motion.button>
            )}

            {/* Poll Creation Form */}
            <AnimatePresence>
              {showPollForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm space-y-3">
                    <input
                      value={pollQuestion}
                      onChange={e => setPollQuestion(e.target.value)}
                      placeholder="Anket sorunuzu yazın..."
                      className="w-full bg-transparent text-white placeholder-purple-400/40 text-sm focus:outline-none border-b border-purple-500/10 pb-2"
                    />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-purple-400/40 text-xs w-5">{i + 1}.</span>
                        <input
                          value={opt}
                          onChange={e => {
                            const newOpts = [...pollOptions]
                            newOpts[i] = e.target.value
                            setPollOptions(newOpts)
                          }}
                          placeholder={`Seçenek ${i + 1}`}
                          className="flex-1 bg-transparent text-white placeholder-purple-400/30 text-sm focus:outline-none border-b border-purple-500/10 pb-1"
                        />
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <button
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="text-xs text-fuchsia-400/60 hover:text-fuchsia-400 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Seçenek ekle
                      </button>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleCreatePoll}
                        disabled={creatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        className="flex-1 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-medium hover:bg-fuchsia-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                      >
                        {creatingPoll ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                        Anket Oluştur
                      </button>
                      <button
                        onClick={() => { setShowPollForm(false); setPollQuestion(''); setPollOptions(['', '']) }}
                        className="px-4 py-2 rounded-xl bg-white/5 text-purple-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Not a member notice */}
            {!fanClub.isMember && (
              <div className="mb-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm text-center">
                <Sparkles className="w-5 h-5 inline mr-2" />
                Anket oluşturmak ve oy kullanmak için fan kulübüne katılın
              </div>
            )}

            {/* Poll List */}
            {loadingPolls && polls.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 className="w-12 h-12 text-purple-500/20 mx-auto mb-3" />
                <p className="text-purple-300/40 text-sm">Henüz anket yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll, i) => {
                  const hasVoted = poll.userVote !== null && poll.userVote !== undefined
                  const isVoting = votingPollId === poll.id
                  return (
                    <motion.div
                      key={poll.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white text-sm font-medium">{poll.question}</p>
                          <p className="text-purple-400/40 text-xs mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(poll.createdAt)}
                            <span className="mx-1">•</span>
                            {poll.totalVotes} oy
                            {!poll.isActive && <span className="ml-2 text-red-400/60">Sona erdi</span>}
                          </p>
                        </div>
                        {hasVoted && (
                          <span className="text-xs text-green-400/60 flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" /> Oy verildi
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {poll.results.map((result, idx) => (
                          <div key={idx}>
                            {hasVoted || !poll.isActive || !fanClub.isMember ? (
                              /* Show results */
                              <div className="relative">
                                <div className="w-full h-9 bg-purple-900/20 rounded-lg overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.percentage}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className={`h-full rounded-lg ${
                                      poll.userVote === idx
                                        ? 'bg-fuchsia-600/40'
                                        : 'bg-purple-600/20'
                                    }`}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-between px-3">
                                  <span className={`text-xs font-medium ${poll.userVote === idx ? 'text-fuchsia-300' : 'text-purple-200/70'}`}>
                                    {poll.userVote === idx && '✓ '}{result.option}
                                  </span>
                                  <span className="text-xs text-purple-400/50">{result.percentage}%</span>
                                </div>
                              </div>
                            ) : (
                              /* Show vote buttons */
                              <button
                                onClick={() => handleVote(poll.id, idx)}
                                disabled={isVoting}
                                className="w-full h-9 rounded-lg bg-purple-900/20 border border-purple-500/10 text-purple-200/70 text-xs font-medium hover:bg-fuchsia-600/20 hover:border-fuchsia-500/20 hover:text-fuchsia-300 transition-all flex items-center justify-center gap-2"
                              >
                                {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                {result.option}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div>
            {members.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-purple-500/20 mx-auto mb-3" />
                <p className="text-purple-300/40 text-sm">Henüz üye yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {members.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={`/profil/${member.user.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-purple-500/10 hover:border-fuchsia-500/20 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-purple-700">
                        {member.user.image ? (
                          <Image src={member.user.image} alt={member.user.name} width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                            {member.user.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{member.user.name}</div>
                        <div className="text-xs text-purple-400/50">
                          {member.role === 'moderator' ? (
                            <span className="text-fuchsia-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Moderator</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(member.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {tab === 'rules' && (
          <div>
            {fanClub.rules.length === 0 ? (
              <div className="text-center py-10">
                <Shield className="w-12 h-12 text-purple-500/20 mx-auto mb-3" />
                <p className="text-purple-300/40 text-sm">Henüz kural belirlenmemiş</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fanClub.rules.map((rule: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-purple-500/10"
                  >
                    <span className="w-7 h-7 rounded-full bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-purple-200/70 text-sm pt-1">{rule}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
