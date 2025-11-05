// app/page.tsx
import Link from 'next/link';
//import { signIn } from '@auth/react';
import { signIn } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';

export default function Home() {
  return (
    <main style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
      <header style={{ background: '#215d36', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Best Entreprenør AS</h1>
        <nav>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: '1.5rem' }}>
            <li>
              <Link href="/about">About</Link>
              </li>
            <li>
              <Link href="/kontakt">Kontakt</Link>
              </li>
            <li>
              <Link href="/project-login">Project Login</Link>
              </li>
          </ul>
        </nav>
      </header>

      <section style={{ padding: '2rem', background: '#eef3ee' }}>
        <h2>Your Partner for All Excavation & Groundwork</h2>
        <p>
          From lush landscapes to robust plumbing solutions, our fleet and team handle every aspect of groundwork, excavation, and transportation.
        </p>
        <ul>
          <li>Landscaping design and garden build</li>
          <li>Plumbing and drainage installation</li>
          <li>Full-service excavation: all sizes and complexity</li>
          <li>Heavy transport and logistics</li>
          <li>Groundwork for residential, commercial, and public projects</li>
        </ul>
      </section>

      <section style={{ padding: '2rem' }}>
        <h3>Why Choose Us?</h3>
        <ul>
          <li>Experienced, certified professionals</li>
          <li>Modern equipment for all jobs</li>
          <li>Flexible solutions tailored to client needs</li>
          <li>Transparent quoting and reliable service</li>
        </ul>
        <button style={{ padding: '1rem 2rem', background: '#215d36', color: '#fff', border: 'none', fontSize: '1rem' }}>
          Request a Quote
        </button>
      </section>

      <footer style={{ background: '#215d36', color: '#fff', padding: '1rem', textAlign: 'center' }}>
        <p>Contact us at post@bestentreprenor.no | +47 123 45 678</p>
        <p>© 2025 Best Entreprenør AS</p>
      </footer>
    </main>
  );
}
