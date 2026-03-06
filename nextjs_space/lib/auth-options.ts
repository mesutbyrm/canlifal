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
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          credits: user.credits,
          preferredLanguage: user.preferredLanguage,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'user'
        token.credits = user.credits ?? 10
        token.preferredLanguage = user.preferredLanguage || 'tr'
        token.image = user.image
      }
      
      // For Google OAuth, fetch additional user data from database
      if (account?.provider === 'google' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, credits: true, preferredLanguage: true, image: true }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.credits = dbUser.credits
          token.preferredLanguage = dbUser.preferredLanguage
          token.image = dbUser.image
        }
      }
      
      // Update token when session is updated
      if (trigger === 'update' && session) {
        token.credits = session?.credits
        token.preferredLanguage = session?.preferredLanguage
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
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/tr/login',
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
