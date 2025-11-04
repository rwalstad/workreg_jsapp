'use client';

import { useSearchParams } from 'next/navigation';

// Wrapper for useSearchParams to make it easier to use with Suspense
export function useSearchParamsWrapper() {
  const searchParams = useSearchParams();
  return { searchParams };
}