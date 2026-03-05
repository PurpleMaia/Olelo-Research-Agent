'use client';

import { useState } from 'react';
import { useResearch } from '@/hooks/contexts/ResearchContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquarePlus, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

export function FollowUpInput() {
  const { state, submitRefinement, confirmNewTopic } = useResearch();
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitRefinement(query.trim());
      // Only clear if no drift was detected (drift keeps the input so user can see it)
      if (!state.topicDrift.detected) {
        setQuery('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmNewTopic = () => {
    confirmNewTopic();
    // After reset, pre-fill the query form with the pending query
    // (ResearchQueryForm reads from its own local state, so we just reset here)
  };

  // Topic drift warning — show instead of the input when detected
  if (state.topicDrift.detected) {
    return (
      <div className="space-y-4 pt-2">
        <Alert variant="default" className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            This looks like a new research topic
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {state.topicDrift.reason ??
              'Your follow-up question appears to be about a different subject than your current research.'}
            {' '}Would you like to start a fresh search?
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-3">
          <Button onClick={handleConfirmNewTopic} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start New Research
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Dismiss drift warning and let them revise their follow-up
              // We keep the query in local state so they can edit it
            }}
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your pending query: <span className="italic">&ldquo;{state.topicDrift.pendingQuery}&rdquo;</span>
        </p>
      </div>
    );
  }

  // Conversation history breadcrumb
  const historyCount = state.conversationHistory.length;

  return (
    <Card className="w-full border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Ask a follow-up question
          {historyCount > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {historyCount} prior {historyCount === 1 ? 'turn' : 'turns'} in context
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Refine your research... e.g. &ldquo;Can you find more about the Papa variety of kalo?&rdquo;"
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="rounded border px-1 py-0.5 text-xs font-mono">⌘ Enter</kbd> to submit
            </p>
            <Button
              type="submit"
              disabled={!query.trim() || isSubmitting}
              size="sm"
              className="gap-2"
            >
              {isSubmitting ? (
                <>Analyzing...</>
              ) : (
                <>
                  Refine Research
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
