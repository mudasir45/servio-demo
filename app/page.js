'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../lib/store';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const s = getSession();
    if (!s) router.replace('/login');
    else router.replace(s.role === 'admin' ? '/admin' : s.role === 'provider' ? '/provider' : '/seeker');
  }, [router]);
  return <main className="page"><p className="muted">Loading Servio…</p></main>;
}
