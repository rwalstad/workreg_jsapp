"use client"

import { useSession } from "next-auth/react"

export default function StagesPage() {
    // The useSession hook returns a data object with user session info and a status string
    const { data: session, status } = useSession();

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-heading font-bold text-accent">Stages / Pipeline builder</h2>
        <p>TODO: stages to be edited here. Consider rename to &quot;Pipeline builder&quot; view</p>
      </div>
    );
  }