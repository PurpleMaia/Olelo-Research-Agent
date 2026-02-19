'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Clock, FileText, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ResearchSession } from '@/types/research';

export default function ResearchHistoryPage() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/research/history', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch research history');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this research session?')) {
      return;
    }

    try {
      const response = await fetch(`/api/research/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Remove from local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('Failed to delete session');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'researching':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Research History</h1>
          <p className="text-muted-foreground">
            View and manage your past research sessions
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/research">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Research
          </Link>
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Your Research Sessions</CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchHistory} variant="outline">
                Try Again
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No research history yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first research session to see it here
              </p>
              <Button asChild>
                <Link href="/research">Start Research</Link>
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(session.createdAt)}
                          </span>
                        </div>

                        <p className="font-medium">{session.query}</p>

                        {session.results?.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.results.summary}
                          </p>
                        )}

                        {session.results && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {session.results.findings && (
                              <span>{session.results.findings.length} findings</span>
                            )}
                            {session.results.sources && (
                              <span>{session.results.sources.length} sources</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/research/${session.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(session.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
