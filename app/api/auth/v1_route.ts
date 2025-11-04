/*/
app/api/auth/route.ts
This file defines the NextAuth.js API route handler.  It is *essential* for
 handling authentication-related requests, even when using the `app` directory
and `next/navigation` for client-side routing.

Next.js requires API routes (serverless functions) to be placed within the
`pages/api` directory.  This file, `[...nextauth].js`, uses a catch-all dynamic
route syntax (`[...]`) to handle *all* NextAuth.js requests (signin, signout,
callbacks, session management, etc.) under the `/api/auth` path.

Client-side code (using `next/navigation` or any other method) interacts
with this API route to initiate authentication flows.  However, the actual
authentication logic (e.g., OAuth, database interactions) happens *on the
server* within this file.

This separation of concerns (client-side routing vs. server-side API handling)
is fundamental to how Next.js works.  Even if your application primarily uses
the `app` directory, the `pages/api` directory (and this file within it)
is still *required* for NextAuth.js to function correctly.
Move your API logic from pages/api/auth/[...nextauth] to use the new Route Handlers under the app directory, e.g. app/api/auth/route.ts.
This involves rewriting your authentication API routes to use the new web-standard Request/Response handlers.
*/

// pages/api/auth/[...nextauth].ts
// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Extend JWT token and Session to include the user ID
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'text' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					throw new Error('Email and password required');
				}

				const user = await prisma.tblUser.findUnique({
					where: { email: credentials.email }
				});

				if (!user || !user.password) {
					throw new Error('User not found');
				}

				const passwordMatch = await bcrypt.compare(credentials.password, user.password);

				if (!passwordMatch) {
					throw new Error('Invalid password');
				}

				// Just return essential user information
				return {
					id: user.id.toString(),
					email: user.email,
					name: `${user.fname || ''} ${user.lname || ''}`.trim()
				};
			}
		})
	],
	callbacks: {
		async jwt({ token, user }) {
			// Only pass the user ID from user to token
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			// Only pass the user ID from token to session
			if (session?.user) {
				session.user.id = token.id;
			}
			return session;
		}
	},
	pages: {
		signIn:  '/login',
		signOut: '/login',
		newUser: '/register'
	},
	session: {
		strategy: 'jwt'
	},
	secret: process.env.NEXTAUTH_SECRET
};

export default NextAuth(authOptions);