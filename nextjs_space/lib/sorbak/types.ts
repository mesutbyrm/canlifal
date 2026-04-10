// SorBak Q&A Platform Types

export const PLATFORM_NAME = 'CanlıSor'
export const PLATFORM_SLUG = 'sorbak'

export interface SBUser {
  id: string
  username: string
  displayName: string
  avatar: string | null
  level: number
  xp: number
  xpToNext: number
  role: 'user' | 'expert' | 'moderator' | 'admin'
  isPremium: boolean
  badges: SBBadge[]
  questionCount: number
  answerCount: number
  followerCount: number
  followingCount: number
  joinedAt: string
  bio: string
}

export interface SBBadge {
  id: string
  name: string
  icon: string
  color: string
}

export interface SBCategory {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  questionCount: number
  description: string
}

export interface SBTag {
  id: string
  name: string
  count: number
}

export interface SBPollOption {
  id: string
  text: string
  votes: number
  percentage: number
}

export interface SBQuestion {
  id: string
  title: string
  body: string
  slug: string
  author: SBUser
  isAnonymous: boolean
  category: SBCategory
  tags: SBTag[]
  answerCount: number
  viewCount: number
  voteCount: number
  commentCount: number
  createdAt: string
  isTrending: boolean
  isPinned: boolean
  isPremium: boolean
  isEditorPick: boolean
  targetAudience: 'all' | 'male' | 'female'
  poll: SBPollOption[] | null
  bestAnswerId: string | null
  userVote: 'up' | 'down' | null
}

export interface SBAnswer {
  id: string
  body: string
  author: SBUser
  isAnonymous: boolean
  voteCount: number
  commentCount: number
  createdAt: string
  isBestAnswer: boolean
  isExpertAnswer: boolean
  userVote: 'up' | 'down' | null
  comments: SBComment[]
}

export interface SBComment {
  id: string
  body: string
  author: SBUser
  createdAt: string
  voteCount: number
}

export type FeedTab = 'foryou' | 'trending' | 'new' | 'top' | 'polls' | 'expert' | 'editor'
