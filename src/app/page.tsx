'use client';

import { useAuth } from "@/hooks/contexts/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-lg text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }
}

function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex min-h-screen w-full max-w-3xl gap-20 justify-center flex-col items-center sm:items-start">
          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-left sm:self-start">
            Welcome to the PMF App Template
          </h1>
          <Carousel className="w-full max-w-md">
            <CarouselContent className="h-full">
              {/* Slide 1: About This Template */}
              <CarouselItem className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>About This Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-relaxed">
                    <p>
                      This is a production-ready multi-tenant application template with comprehensive authentication and role-based access control. The system supports multiple organizations, each with their own isolated data and user management, making it ideal for B2B SaaS applications.
                    </p>

                    <p>
                      The multi-tenancy structure operates on two levels: system-level and organization-level. At the system level, developers and platform maintainers have sysadmin privileges with full access across all organizations. At the organization level, each organization has its own admins who manage their team members and resources. Regular users belong to one or more organizations with either admin or member roles, determining their permissions within that organization&apos;s scope.
                    </p>

                    <p>
                      To access the platform, system administrators should use the Internal Login button, while organization admins and members use the standard Login button. Guest users can also access the platform with limited permissions as granted by organization or system administrators.
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Slide 2: Getting Started */}
              <CarouselItem className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 overflow-y-auto">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Run Local Environment</h3>
                      <code className="block bg-zinc-100 p-2 rounded text-sm">
                        pnpm dev
                      </code>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Initialize Codebase</h3>
                      <code className="block bg-zinc-100 p-2 rounded text-sm mb-2">
                        pnpm run init
                      </code>
                      <p className="text-sm text-muted-foreground mb-2">
                        This sets up SSH, creates Dokku apps, databases, runs migrations, creates admin user, and seeds test data.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Init Options</h3>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <code className="bg-zinc-100 px-2 py-1 rounded text-xs">
                            pnpm run init:ssh
                          </code>
                          <span className="ml-2 text-muted-foreground">- Setup SSH keys</span>
                        </li>
                        <li>
                          <code className="bg-zinc-100 px-2 py-1 rounded text-xs">
                            pnpm run init:seed
                          </code>
                          <span className="ml-2 text-muted-foreground">- Seed test data</span>
                        </li>
                        <li>
                          <code className="bg-zinc-100 px-2 py-1 rounded text-xs">
                            pnpm run init:sysadmin
                          </code>
                          <span className="ml-2 text-muted-foreground">- Create sysadmin</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>              

              {/* Slide 3: Documentation */}
              <CarouselItem className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Documentation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Detailed documentation for each layer of the application:
                    </p>

                    <div className="space-y-3 text-sm">
                      <div>
                        <h3 className="font-semibold mb-1">Main Documentation</h3>
                        <code className="block bg-zinc-100 p-2 rounded text-xs break-all">
                          README.md
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Project overview, quick start, and technology stack
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-semibold mb-1">Database Layer</h3>
                        <code className="block bg-zinc-100 p-2 rounded text-xs break-all">
                          src/lib/db/README.md
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Kysely setup, connection pooling, migrations, and type generation
                        </p>
                      </div>

                      <Separator />

                      <div className="text-xs text-muted-foreground italic">
                        Additional documentation referenced in main README:
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li>scripts/init/README.md (initialization)</li>
                          <li>scripts/migrate/README.md (migrations)</li>
                          <li>scripts/destroy/README.md (cleanup)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Button asChild size="lg" className="md:w-45">
            <Link href="/login?type=sysadmin">
              Internal Login
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="md:w-45">
            <Link href="/login?type=user">
              Login
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}