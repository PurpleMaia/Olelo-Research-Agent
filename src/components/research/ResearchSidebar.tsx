'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Clock } from 'lucide-react';
import type { ResearchSession } from '@/types/research';

function truncateQuery(query: string, maxLength = 55): string {
  if (query.length <= maxLength) return query;
  return query.slice(0, maxLength).trimEnd() + '…';
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (days > 7) return new Date(date).toLocaleDateString();
  if (days > 1) return `${days} days ago`;
  if (days === 1) return 'Yesterday';
  if (hours > 1) return `${hours} hours ago`;
  if (minutes > 1) return `${minutes} min ago`;
  return 'Just now';
}

export function ResearchSidebar() {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/research/history', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { sessions: [] }))
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this research session?')) return;

    const res = await fetch(`/api/research/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  const filtered = sessions.filter((s) =>
    s.query.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* New Research */}
      <div className="p-3 border-b">
        <Button asChild className="w-full" size="sm">
          <Link href="/research">
            <Plus className="mr-2 h-4 w-4" />
            New Research
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {search ? 'No results found' : 'No research history yet'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((session) => {
                const isActive = pathname === `/research/${session.id}`;
                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-start gap-1 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent ${
                      isActive ? 'bg-accent' : ''
                    }`}
                  >
                    <Link
                      href={`/research/${session.id}`}
                      className="flex-1 min-w-0 pr-5"
                    >
                      <p className="text-sm leading-snug line-clamp-2 font-medium">
                        {truncateQuery(session.query)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(session.createdAt)}
                        </span>
                        {session.status === 'complete' && (
                          <Badge className="text-xs py-0 h-4 px-1.5 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 font-normal">
                            done
                          </Badge>
                        )}
                        {session.status === 'error' && (
                          <Badge className="text-xs py-0 h-4 px-1.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 font-normal">
                            error
                          </Badge>
                        )}
                      </div>
                    </Link>

                    {/* Delete button — appears on hover */}
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="absolute right-1.5 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
