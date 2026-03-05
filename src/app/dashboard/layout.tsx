import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { validateSessionFromCookies } from "@/lib/auth/session";
import DashboardHeader from "../../components/shared/DashboardHeader";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  try {
    const cookieStore = await cookies();
    const user = await validateSessionFromCookies(cookieStore);
    const headerUser = {
      username: user.username,
      email: user.email,
      systemRole: user.system_role,
      role: user.role,
      orgName: user.org?.name ?? null,
    };

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="container flex h-14 items-center px-4 justify-between">
            <div className="flex items-center gap-6 ml-6">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <span className="font-bold text-xl">PMF Template</span>
              </Link>
              <nav className="flex items-center gap-1">
                <Link
                  href="/research"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  Research
                </Link>
              </nav>
            </div>

            <DashboardHeader user={headerUser} />
          </div>
        </header>

        <main className="container mx-auto py-6 px-4">
          {children}

          <p className="text-sm text-muted-foreground font-bold mt-8"> Areas marked with * are not yet implemented</p>
        </main>
      </div>
    );
  } catch {
    redirect("/login?type=user");
  }
}
