'use client'

import { useParams, useRouter } from 'next/navigation'
import { BLOG_POSTS, SITE_NAME, SITE_URL } from '@/lib/seo-config'
import { ArrowLeft, BookOpen, Calendar, Tag } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import LoadingSpinner from '@/components/loading-spinner'

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  contentTr: string
  contentEn: string
  category: string
  keywords: string[]
  createdAt: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const isTr = lang === 'tr'
  const [post, setPost] = useState<BlogPost | null>(null)
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  // Fallback to static
  const staticPost = useMemo(() => BLOG_POSTS.find(p => p.slug === slug), [slug])

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const [singleRes, listRes] = await Promise.all([
          fetch(`/api/blog?slug=${encodeURIComponent(slug)}`),
          fetch('/api/blog'),
        ])
        if (singleRes.ok) {
          const data = await singleRes.json()
          if (data.post) setPost(data.post)
        }
        if (listRes.ok) {
          const data = await listRes.json()
          setAllPosts(data.posts || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Use DB post or fall back to static
  const displayPost = post || (staticPost ? {
    id: 'static',
    slug: staticPost.slug,
    titleTr: staticPost.titleTr,
    titleEn: staticPost.titleEn,
    descTr: staticPost.descTr,
    descEn: staticPost.descEn,
    contentTr: staticPost.contentTr,
    contentEn: staticPost.contentEn,
    category: staticPost.category,
    keywords: staticPost.keywords,
    createdAt: '2025-01-01',
  } : null)

  if (!displayPost) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{isTr ? 'Yazı bulunamadı' : 'Post not found'}</p>
          <button onClick={() => router.push(`/${lang}/blog`)} className="text-purple-400 hover:text-purple-300">
            {isTr ? "Blog'a Dön" : 'Back to Blog'}
          </button>
        </div>
      </div>
    )
  }

  const title = isTr ? displayPost.titleTr : displayPost.titleEn
  const desc = isTr ? displayPost.descTr : displayPost.descEn
  const content = isTr ? displayPost.contentTr : displayPost.contentEn

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    url: `${SITE_URL}/${lang}/blog/${displayPost.slug}`,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/${lang}/blog/${displayPost.slug}` },
    keywords: displayPost.keywords.join(', '),
  }

  // Related posts from DB or static
  const relatedPosts = allPosts.length > 0
    ? allPosts.filter(p => p.slug !== displayPost.slug).slice(0, 3)
    : BLOG_POSTS.filter(p => p.slug !== displayPost.slug).slice(0, 3).map((p, i) => ({
        id: `static-${i}`, slug: p.slug, titleTr: p.titleTr, titleEn: p.titleEn,
        descTr: p.descTr, descEn: p.descEn, contentTr: '', contentEn: '',
        category: p.category, keywords: p.keywords, createdAt: '2025-01-01',
      }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/${lang}/blog`)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm text-gray-400"><BookOpen className="w-4 h-4 inline mr-1" />Blog</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{title}</h1>
        <p className="text-gray-400 mb-4">{desc}</p>

        <div className="flex flex-wrap items-center gap-3 mb-8 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {displayPost.createdAt ? new Date(displayPost.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '2025'}</span>
          <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {displayPost.keywords.slice(0, 3).join(', ')}</span>
        </div>

        <article
          className="prose prose-invert prose-purple max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-sm text-gray-500 mb-3">{isTr ? 'Etiketler' : 'Tags'}</p>
          <div className="flex flex-wrap gap-2">
            {displayPost.keywords.map(kw => (
              <span key={kw} className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">{kw}</span>
            ))}
          </div>
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-white mb-4">{isTr ? 'Diğer Yazılar' : 'Other Posts'}</h3>
            <div className="space-y-3">
              {relatedPosts.map(p => (
                <button key={p.slug} onClick={() => router.push(`/${lang}/blog/${p.slug}`)} className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <h4 className="text-sm font-medium text-white">{isTr ? p.titleTr : p.titleEn}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{isTr ? p.descTr : p.descEn}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
