import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user?.password) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Prevent bot users from logging in
        if (user.isBot) {
          throw new Error('Invalid credentials')
        }

        // Generate unique device token for single-device enforcement
        const deviceToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        await prisma.user.update({
          where: { id: user.id },
          data: { activeDeviceToken: deviceToken }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          credits: user.credits,
          preferredLanguage: user.preferredLanguage,
          deviceToken,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'user'
        token.credits = user.credits ?? 10
        token.preferredLanguage = user.preferredLanguage || 'tr'
        token.image = user.image
        token.deviceToken = (user as any).deviceToken
      }
      
      // Update token when session is updated
      if (trigger === 'update' && session) {
        token.credits = session?.credits
        token.preferredLanguage = session?.preferredLanguage
        if (session?.deviceToken) {
          token.deviceToken = session.deviceToken
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token?.id as string) || token?.sub || ''
        session.user.role = (token?.role as string) || 'user'
        session.user.credits = (token?.credits as number) ?? 10
        session.user.preferredLanguage = (token?.preferredLanguage as string) || 'tr'
        session.user.image = (token?.image as string) || null
        ;(session.user as any).deviceToken = token?.deviceToken
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-follow admin and yonetici users for new OAuth signups
      try {
        const staffUsers = await prisma.user.findMany({
          where: { role: { in: ['admin', 'yonetici'] } },
          select: { id: true },
        })
        if (staffUsers.length > 0 && user.id) {
          await prisma.follow.createMany({
            data: staffUsers
              .filter(s => s.id !== user.id)
              .map(s => ({ followerId: user.id, followingId: s.id })),
            skipDuplicates: true,
          })
        }
      } catch (e) {
        console.error('Auto-follow on OAuth signup error:', e)
      }
    },
  },
  pages: {
    signIn: '/giris',
  },
  session: {
    strategy: 'jwt',
  },
  cookies: {
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
