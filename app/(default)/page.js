"use client";
// This page represents the index in the web application, ie. "/"
//app/(default)/page.js

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard"); // Redirect to dashboard
  }, [router]); // Ensure it only runs when router is available

  return <p>Redirecting to dashboard...</p>;
}
