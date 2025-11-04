'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard'); // Redirect to dashboard on success
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-alt">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-heading font-bold text-center mb-6 text-accent">Login to your dashboard</h2>

        {error && (
          <div className="alert alert-warning mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn-primary w-full ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/register" className="nav-link text-sm">
            Don&apos;t have an account? Sign up
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// Authentication Flow:

// When a user clicks "Login" on your app/login/page.tsx, it triggers a request to the pages/api/auth/[...nextauth].js endpoint.
// The pages/api/auth/[...nextauth].js endpoint then handles the authentication (e.g., redirects to Google, validates credentials).
// If authentication is successful, NextAuth.js creates a session (stores it in a cookie or database, depending on your configuration).
// Session Management:

// The session data is stored on the server side.
// The client (your browser) receives a session cookie that identifies the session.
// On subsequent requests, the client sends the session cookie to the server.
// NextAuth.js uses the session cookie to retrieve the session data.
// getServerSession is the function that gets the session from the server.
// app/login/page.tsx Role:

// It's responsible for rendering the login UI.
// It might use the signIn function from next-auth/react to initiate the authentication flow.
// It doesn't directly store or manage the session data.

// In summary:
// The session is created and managed by the NextAuth.js API route (pages/api/auth/[...nextauth].js).
// Your login page (app/login/page.tsx) interacts with the NextAuth.js API route to initiate the authentication process.
// The middleware file needs to import the authOptions configuration from the api route in order to validate the session.
// Therefore, you must export authOptions from the api route.