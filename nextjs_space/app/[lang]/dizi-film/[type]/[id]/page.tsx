'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Star, Calendar, Clock, Film, Tv,
  Play, Users, Globe, Loader2, ExternalLink
} from 'lucide-react'

const TMDB_IMG = 'https://play-lh.googleusercontent.com/8oYvHLFp2-swlnr1RCOlaXH_H_In9PHdQz9KszyOHPq7o-Hya_qlqcZO6vG8Bm4xzjk=w240-h480-rw'

interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface Video {
  key: string
  name: string
  site: string
  type: string
}

export default function MediaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const type = params?.type as string // 'movie' or 'tv'
  const id = params?.id as string

  const [detail, setDetail] = useState<any>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const action = type === 'tv' ? 'tv-detail' : 'movie-detail'
        const res = await fetch(`/api/tmdb?action=${action}&id=${id}`)
        const data = await res.json()
        setDetail(data.detail)
        setCast(data.credits?.cast?.slice(0, 20) || [])
        setVideos(data.videos || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchDetail()
  }, [id, type])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <div className="text-center">
          <Film className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
          <p className="text-purple-300/50 text-lg">\u0130\u00e7erik bulunamad\u0131</p>
        </div>
      </div>
    )
  }

  const title = detail.title || detail.name || ''
  const date = detail.release_date || detail.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''
  const runtime = detail.runtime || (detail.episode_run_time?.[0]) || 0
  const trailer = videos.find((v: Video) => v.type === 'Trailer' && v.site === 'YouTube') || videos.find((v: Video) => v.site === 'YouTube')
  const genres = detail.genres || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Backdrop */}
      <div className="relative">
        {detail.backdrop_path && (
          <div className="relative h-[250px] sm:h-[350px] overflow-hidden">
            <Image
              src={`${TMDB_IMG}/w1280${detail.backdrop_path}`}
              alt={title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0014] via-[#0a0014]/60 to-transparent" />
          </div>
        )}

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
          {/* Poster */}
          <div className="flex-shrink-0 w-28 sm:w-36">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-fuchsia-500/10 border border-purple-500/20">
              {detail.poster_path ? (
                <Image
                  src={`${TMDB_IMG}/w342${detail.poster_path}`}
                  alt={title}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                  <Film className="w-10 h-10 text-purple-500/20" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                type === 'movie' ? 'bg-blue-500/80 text-white' : 'bg-fuchsia-500/80 text-white'
              }`}>
                {type === 'movie' ? 'Film' : 'Dizi'}
              </span>
              {year && <span className="text-xs text-purple-400/40">{year}</span>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-3">
              {detail.vote_average > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-yellow-300">{detail.vote_average.toFixed(1)}</span>
                  <span className="text-xs text-purple-400/40">({detail.vote_count})</span>
                </div>
              )}
              {runtime > 0 && (
                <div className="flex items-center gap-1 text-purple-400/50 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{runtime} dk</span>
                </div>
              )}
              {type === 'tv' && detail.number_of_seasons > 0 && (
                <span className="text-xs text-purple-400/50">{detail.number_of_seasons} Sezon</span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {genres.map((g: any) => (
                <span key={g.id} className="px-2 py-0.5 rounded-full bg-white/5 border border-purple-500/10 text-xs text-purple-300/70">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Trailer button */}
            {trailer && (
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                Fragman\u0131 \u0130zle
              </a>
            )}
          </div>
        </motion.div>

        {/* Overview */}
        {detail.overview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-4 rounded-2xl bg-white/5 border border-purple-500/10"
          >
            <h3 className="text-sm font-bold text-white mb-2">\u00d6zet</h3>
            <p className="text-sm text-purple-200/70 leading-relaxed">{detail.overview}</p>
          </motion.div>
        )}

        {/* Additional Info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {detail.status && (
            <div className="p-3 rounded-xl bg-white/5 border border-purple-500/10">
              <div className="text-[10px] text-purple-400/40 mb-1">Durum</div>
              <div className="text-sm text-white font-medium">{detail.status === 'Released' ? 'Yay\u0131nland\u0131' : detail.status === 'Returning Series' ? 'Devam Ediyor' : detail.status}</div>
            </div>
          )}
          {detail.original_language && (
            <div className="p-3 rounded-xl bg-white/5 border border-purple-500/10">
              <div className="text-[10px] text-purple-400/40 mb-1">Dil</div>
              <div className="text-sm text-white font-medium flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {detail.original_language.toUpperCase()}
              </div>
            </div>
          )}
          {detail.budget > 0 && (
            <div className="p-3 rounded-xl bg-white/5 border border-purple-500/10">
              <div className="text-[10px] text-purple-400/40 mb-1">B\u00fct\u00e7e</div>
              <div className="text-sm text-white font-medium">${(detail.budget / 1_000_000).toFixed(0)}M</div>
            </div>
          )}
          {detail.revenue > 0 && (
            <div className="p-3 rounded-xl bg-white/5 border border-purple-500/10">
              <div className="text-[10px] text-purple-400/40 mb-1">Has\u0131lat</div>
              <div className="text-sm text-emerald-400 font-medium">${(detail.revenue / 1_000_000).toFixed(0)}M</div>
            </div>
          )}
        </div>

        {/* TV Seasons */}
        {type === 'tv' && detail.seasons && detail.seasons.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Sezonlar</h3>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {detail.seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
                <div key={season.id} className="flex-shrink-0 w-24">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-purple-900/20">
                    {season.poster_path ? (
                      <Image src={`${TMDB_IMG}/w185${season.poster_path}`} alt={season.name} fill sizes="100px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Tv className="w-6 h-6 text-purple-500/20" /></div>
                    )}
                  </div>
                  <p className="text-xs text-white font-medium mt-1 truncate">{season.name}</p>
                  <p className="text-[10px] text-purple-400/40">{season.episode_count} b\u00f6l\u00fcm</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Oyuncu Kadrosu</h3>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {cast.map((actor) => (
                <div key={actor.id} className="flex-shrink-0 w-20 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-purple-900/20">
                    {actor.profile_path ? (
                      <Image
                        src={`${TMDB_IMG}/w185${actor.profile_path}`}
                        alt={actor.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-500/20" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-white font-medium mt-1.5 truncate">{actor.name}</p>
                  <p className="text-[9px] text-purple-400/40 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.filter((v: Video) => v.site === 'YouTube').length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Videolar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videos.filter((v: Video) => v.site === 'YouTube').slice(0, 4).map((video: Video) => (
                <a
                  key={video.key}
                  href={`https://www.youtube.com/watch?v=${video.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-purple-500/10 hover:bg-white/10 transition-colors"
                >
                  <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-purple-900/20 flex-shrink-0">
                    <Image
                      src={'https://i.ytimg.com/vi/5eHEycn84Ro/sddefault.jpg?sqp=-oaymwEmCIAFEOAD8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGDAgVyhyMA8=&rs=AOn4CLDm5uu6gcwM1pJcDWYS3MlZhef7Cw' + video.key + '/mqdefault.jpg'}
                      alt={video.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white/80 fill-white/80" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate group-hover:text-fuchsia-400 transition-colors">{video.name}</p>
                    <p className="text-[10px] text-purple-400/40 mt-0.5">{video.type}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400/30 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}