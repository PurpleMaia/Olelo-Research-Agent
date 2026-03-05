'use client';

import { useState } from 'react';
import { useResearch } from '@/hooks/contexts/ResearchContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Star, CheckCircle2, X } from 'lucide-react';

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'skipped';

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                n <= (hovered ?? value ?? 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResearchFeedback() {
  const { state } = useResearch();
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  if (submitState === 'submitted') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-1">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  if (submitState === 'skipped') {
    return null;
  }

  const handleThumbsClick = (value: 1 | -1) => {
    setRating(value);
    setShowDetail(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !state.sessionId) return;

    setError(null);
    setSubmitState('submitting');

    try {
      const res = await fetch('/api/research/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: state.sessionId,
          rating,
          accuracy: accuracy ?? undefined,
          completeness: completeness ?? undefined,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit feedback');
      }

      setSubmitState('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitState('idle');
    }
  };

  return (
    <Card className="w-full border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Was this research helpful?
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-muted-foreground"
            onClick={() => setSubmitState('skipped')}
            aria-label="Skip feedback"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Thumbs row */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={rating === 1 ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => handleThumbsClick(1)}
            >
              <ThumbsUp className="h-4 w-4" />
              Yes
            </Button>
            <Button
              type="button"
              variant={rating === -1 ? 'destructive' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => handleThumbsClick(-1)}
            >
              <ThumbsDown className="h-4 w-4" />
              No
            </Button>
          </div>

          {/* Detail section — shown after thumbs selection */}
          {showDetail && (
            <div className="space-y-4 pt-1 border-t">
              <div className="flex gap-6 flex-wrap">
                <StarRating
                  label="Accuracy"
                  value={accuracy}
                  onChange={setAccuracy}
                />
                <StarRating
                  label="Completeness"
                  value={completeness}
                  onChange={setCompleteness}
                />
              </div>

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any comments? (optional)"
                className="min-h-[60px] resize-none text-sm"
              />

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!rating || submitState === 'submitting'}
                >
                  {submitState === 'submitting' ? 'Submitting…' : 'Submit Feedback'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setSubmitState('skipped')}
                >
                  Skip
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
