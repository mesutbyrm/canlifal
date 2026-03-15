'use client'

import { useParams, useRouter } from 'next/navigation'
import { BLOG_POSTS, SITE_NAME, SITE_URL } from '@/lib/seo-config'
import { ArrowLeft, BookOpen, Calendar, Tag, Share2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import Head from 'next/head'

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const isTr = lang === 'tr'

  const post = useMemo(() => BLOG_POSTS.find(p => p.slug === slug), [slug])

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{isTr ? 'Yazı bulunamadı' : 'Post not found'}</p>
          <button onClick={() => router.push(`/${lang}/blog`)} className="text-purple-400 hover:text-purple-300">
            {isTr ? 'Blog\'a Dön' : 'Back to Blog'}
          </button>
        </div>
      </div>
    )
  }

  const title = isTr ? post.titleTr : post.titleEn
  const desc = isTr ? post.descTr : post.descEn
  const content = isTr ? post.contentTr : post.contentEn

  // JSON-LD structured data for blog post
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    url: `${SITE_URL}/${lang}/blog/${post.slug}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${lang}/blog/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/${lang}/blog`)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm text-gray-400">
            <BookOpen className="w-4 h-4 inline mr-1" />
            Blog
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{title}</h1>
        <p className="text-gray-400 mb-4">{desc}</p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-8 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 2025</span>
          <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {post.keywords.slice(0, 3).join(', ')}</span>
        </div>

        {/* Content */}
        <article
          className="prose prose-invert prose-purple max-w-none
            prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Tags */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-sm text-gray-500 mb-3">{isTr ? 'Etiketler' : 'Tags'}</p>
          <div className="flex flex-wrap gap-2">
            {post.keywords.map(kw => (
              <span key={kw} className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Related posts */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-white mb-4">{isTr ? 'Diğer Yazılar' : 'Other Posts'}</h3>
          <div className="space-y-3">
            {BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 3).map(p => (
              <button
                key={p.slug}
                onClick={() => router.push(`/${lang}/blog/${p.slug}`)}
                className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <h4 className="text-sm font-medium text-white">{isTr ? p.titleTr : p.titleEn}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{isTr ? p.descTr : p.descEn}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
