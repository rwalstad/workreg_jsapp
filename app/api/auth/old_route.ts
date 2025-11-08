// app/api/auth/route.ts


import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Authorize function called');
        console.log('Received credentials:', credentials);
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing email or password:', credentials);
          throw new Error('Email and password required');
        }

        // Sanitize input
        const email = credentials.email.trim();
        const password = credentials.password;
        console.log('Authorize called with credentials:', { email, password });
        const user = await prisma.tblUser.findUnique({
          where: { email },
        });

        if (!user) {
        console.log('User not found:', email);
        throw new Error('User not found');
      }
      const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          // throw new Error('Invalid password');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.fname || ''} ${user.lname || ''}`.trim(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      console.log('JWT callback called with token:', token);
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
      }
      console.log('Session callback called with session:', session);
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
