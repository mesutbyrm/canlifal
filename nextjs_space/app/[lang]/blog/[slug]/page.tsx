'use client'

import { useParams, useRouter } from 'next/navigation'
import { SITE_NAME, SITE_URL } from '@/lib/seo-config'
import { ArrowLeft, BookOpen, Calendar, Tag, Clock, Eye, ChevronRight, Share2, Heart, ThumbsUp, User } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
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
  metaDescription: string
  coverImage: string
  readTime: number
  views: number
  likes: number
  authorName: string
  publishedAt: string | null
  createdAt: string
}

interface RelatedPost {
  id: string
  slug: string
  titleTr: string
  descTr: string
  category: string
  coverImage: string
  readTime: number
  views: number
  publishedAt: string | null
  createdAt: string
}

interface BlogCategory {
  id: string
  slug: string
  nameTr: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const [postRes, relatedRes, catsRes] = await Promise.all([
          fetch(`/api/blog?slug=${encodeURIComponent(slug)}`),
          fetch(`/api/blog/related?slug=${encodeURIComponent(slug)}&limit=4`),
          fetch('/api/blog/categories'),
        ])
        if (postRes.ok) {
          const data = await postRes.json()
          if (data.post) setPost(data.post)
        }
        if (relatedRes.ok) {
          const data = await relatedRes.json()
          setRelatedPosts(data.posts || [])
        }
        if (catsRes.ok) {
          const data = await catsRes.json()
          setCategories(data.categories || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [slug])

  const formatDate = (date: string | null) => {
    if (!date) return ''
    try { return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
  }

  const formatViews = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const getCategoryName = (catSlug: string) => categories.find(c => c.slug === catSlug)?.nameTr || catSlug

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: post?.titleTr, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  if (!mounted) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Yaz\u0131 bulunamad\u0131</p>
          <Link href={`/${lang}/blog`} className="text-purple-400 hover:text-purple-300">Blog&apos;a D\u00f6n</Link>
        </div>
      </div>
    )
  }

  const title = post.titleTr
  const desc = post.metaDescription || post.descTr
  const content = post.contentTr
  const publishDate = post.publishedAt || post.createdAt

  // JSON-LD Schema
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    image: post.coverImage || undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: publishDate,
    dateModified: post.createdAt,
    author: { '@type': 'Person', name: post.authorName },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    keywords: post.keywords.join(', '),
    wordCount: content.replace(/<[^>]*>/g, '').split(/\s+/).length,
    articleSection: getCategoryName(post.category),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: getCategoryName(post.category), item: `${SITE_URL}/blog/kategori/${post.category}` },
      { '@type': 'ListItem', position: 4, name: title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* OG Meta via head */}
      <head>
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/blog/${post.slug}`} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="description" content={desc} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        <link rel="canonical" href={`${SITE_URL}/blog/${post.slug}`} />
      </head>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
          <Link href={`/${lang}/blog`} className="hover:text-purple-400 transition">Blog</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link href={`/${lang}/blog/kategori/${post.category}`} className="hover:text-purple-400 transition">
            {getCategoryName(post.category)}
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-gray-500 line-clamp-1">{title}</span>
        </nav>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-800">
            <Image src={post.coverImage} alt={title} fill className="object-cover" priority />
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Link
              href={`/${lang}/blog/kategori/${post.category}`}
              className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 hover:bg-purple-500/30 transition"
            >
              {getCategoryName(post.category)}
            </Link>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4">{title}</h1>
          <p className="text-gray-400 text-lg">{post.descTr}</p>

          <div className="flex items-center justify-between flex-wrap gap-4 mt-5 pt-5 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{post.authorName}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(publishDate)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{post.readTime} dk okuma</span>
              <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{formatViews(post.views)} g\u00f6r\u00fcnt\u00fclenme</span>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-400 transition">
              <Share2 className="w-4 h-4" /> Payla\u015f
            </button>
          </div>
        </header>

        {/* Article Content */}
        <article
          className="prose prose-invert prose-purple max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h1:text-2xl prose-h1:mt-10 prose-h1:mb-4
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-strong:text-white
            prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300
            prose-li:text-gray-300
            prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:rounded-lg prose-blockquote:p-4
            prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Tags */}
        {post.keywords.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Etiketler</p>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map(kw => (
                <span key={kw} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-default">
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share bar */}
        <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <span className="text-sm text-gray-400">Bu yaz\u0131y\u0131 be\u011fendiniz mi?</span>
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition">
              <Share2 className="w-4 h-4" /> Payla\u015f
            </button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" /> Benzer Yaz\u0131lar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPosts.map((rp, i) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/${lang}/blog/${rp.slug}`} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all group">
                    {rp.coverImage ? (
                      <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                        <Image src={rp.coverImage} alt={rp.titleTr} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-20 rounded-lg flex-shrink-0 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-purple-500/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white group-hover:text-purple-300 transition line-clamp-2">{rp.titleTr}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rp.descTr}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rp.readTime} dk</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(rp.views)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
