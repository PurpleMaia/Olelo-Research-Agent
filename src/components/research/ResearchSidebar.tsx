'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, Trash2, Clock, MessageSquare, Settings, Sun, Moon, Monitor, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/contexts/AuthContext';
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

interface ResearchSidebarProps {
  onNavigate?: () => void;
}

export function ResearchSidebar({ onNavigate }: ResearchSidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [feedbackIds, setFeedbackIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = () => {
    fetch('/api/research/history', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { sessions: [], feedbackSessionIds: [] }))
      .then((data) => {
        setSessions(data.sessions ?? []);
        setFeedbackIds(new Set(data.feedbackSessionIds ?? []));
      })
      .finally(() => setIsLoading(false));
  };

  // Refetch whenever the user navigates to a new page
  useEffect(() => {
    fetchSessions();
  }, [pathname]);

  // Refetch immediately when a new research request is submitted
  useEffect(() => {
    window.addEventListener('research-started', fetchSessions);
    return () => window.removeEventListener('research-started', fetchSessions);
  }, []);

  // Poll every 3s while any session is actively processing
  useEffect(() => {
    const hasActive = sessions.some(
      (s) => s.status === 'researching' || s.status === 'clarifying'
    );
    if (!hasActive) return;
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [sessions]);

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
      setFeedbackIds((prev) => { const next = new Set(prev); next.delete(sessionId); return next; });
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
          <Link href="/research" onClick={onNavigate}>
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
                const hasFeedback = feedbackIds.has(session.id);
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
                      onClick={onNavigate}
                    >
                      <p className="text-sm leading-snug line-clamp-2 font-medium">
                        {truncateQuery(session.query)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                        {hasFeedback && (
                          <MessageSquare
                            className="h-3 w-3 text-blue-500 flex-shrink-0"
                            aria-label="Feedback submitted"
                          />
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

      {/* Footer — user info + settings */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {user?.username ?? user?.email ?? 'Account'}
            </span>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-52 p-2">
              {/* Theme */}
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Theme</p>
              <div className="flex gap-1 px-2 pb-2">
                <Button
                  variant={theme === 'light' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-3 w-3 mr-1" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-3 w-3 mr-1" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-3 w-3 mr-1" />
                  Auto
                </Button>
              </div>

              <Separator className="my-1" />

              {/* Account */}
              <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors">
                <User className="h-3.5 w-3.5" />
                Account
              </Link>

              <Separator className="my-1" />

              {/* Logout */}
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
