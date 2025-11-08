// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import DashboardClient from "./dashboardClient";
import { getSession } from "../../lib/getSession";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.user) {
    redirect("/login");
  }

  return (
    <DashboardClient user={session.user}>
      {/* Optional main dashboard widgets or stats */}
      <div>Welcome back, {session.user.fname || "User"}!</div>
    </DashboardClient>
  );
}