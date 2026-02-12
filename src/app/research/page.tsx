'use client';

import { useAuth } from "@/hooks/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ResearchPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-lg text-zinc-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 mb-2">Research</h1>
          <p className="text-zinc-600">
            Explore research features and tools
          </p>
        </div>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-zinc-600">
                Please log in to access research features.
              </p>
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Research Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600">
                  Research features coming soon...
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Research</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600">
                  No research history available yet.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
