import { User as PrismaUser } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    image?: string | null
    role: string
    credits: number
    preferredLanguage: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: string
      credits: number
      preferredLanguage: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    credits?: number
    preferredLanguage?: string
    image?: string | null
  }
}

export interface Fortune {
  id: string
  userId: string
  fortuneType: string
  inputData: string
  aiResponse: string
  language: string
  createdAt: Date
  user?: PrismaUser
}

export interface Translation {
  id: string
  languageCode: string
  translationKey: string
  translationValue: string
}

export type FortuneType = 'coffee' | 'tarot' | 'dream'
