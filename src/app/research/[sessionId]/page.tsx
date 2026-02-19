'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ExternalLink, FileText, Trash2 } from 'lucide-react';
import type { ResearchSession } from '@/types/research';

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSourceBadgeClass(type: string) {
  switch (type) {
    case 'papa-kilo':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'newspaper':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'web':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/research/${sessionId}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load session');
        const data = await res.json();
        setSession(data.session);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const handleDelete = async () => {
    if (!confirm('Delete this research session?')) return;

    const res = await fetch(`/api/research/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      router.push('/research');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive mb-4">{error ?? 'Session not found'}</p>
          <Button variant="outline" onClick={() => router.push('/research')}>
            Back to Research
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { results } = session;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight">{session.query}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(session.createdAt)}</span>
            <Badge
              className={
                session.status === 'complete'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : session.status === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-800'
              }
            >
              {session.status}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Error state */}
      {session.status === 'error' && session.error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{session.error}</p>
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {!results && session.status !== 'error' && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No results available for this session.</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Research Summary</CardTitle>
              </div>
              <CardDescription>
                Based on your query: &ldquo;{session.query}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{results.summary}</p>
            </CardContent>
          </Card>

          {/* Key Findings */}
          {results.findings && results.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {results.findings.map((finding, index) => (
                    <AccordionItem key={finding.id} value={finding.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium">
                            {index + 1}. {finding.title}
                          </span>
                          {finding.confidence && (
                            <Badge
                              variant="secondary"
                              className={
                                finding.confidence === 'high'
                                  ? 'bg-green-100 text-green-800'
                                  : finding.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {finding.confidence}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {finding.content}
                          </p>
                          {finding.sources.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Sources: </span>
                              {finding.sources.map((srcId, i) => {
                                const src = results.sources?.find((s) => s.id === srcId);
                                return src ? (
                                  <span key={srcId}>
                                    {i > 0 && ', '}
                                    {src.title}
                                  </span>
                                ) : null;
                              })}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Sources */}
          {results.sources && results.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sources ({results.sources.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72 pr-4">
                  <div className="space-y-3">
                    {results.sources.map((source) => (
                      <div
                        key={source.id}
                        className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium flex-1">{source.title}</h4>
                          <Badge className={getSourceBadgeClass(source.type)}>
                            {source.type.replace('-', ' ')}
                          </Badge>
                        </div>
                        {source.publication && (
                          <p className="text-xs text-muted-foreground">
                            {source.publication}
                            {source.date && ` • ${source.date}`}
                          </p>
                        )}
                        {source.excerpt && (
                          <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                            &ldquo;{source.excerpt}&rdquo;
                          </p>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            View Source
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Related Topics */}
          {results.relatedTopics && results.relatedTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <Separator className="mb-4" />
                <div className="flex flex-wrap gap-2">
                  {results.relatedTopics.map((topic, i) => (
                    <Badge key={i} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
