'use client';

import { useAuth } from "@/hooks/contexts/AuthContext";
import { useResearch, ResearchProvider } from "@/hooks/contexts/ResearchContext";
import { ResearchQueryForm } from "@/components/research/ResearchQueryForm";
import { ClarifyingQuestions } from "@/components/research/ClarifyingQuestions";
import { ResearchStream } from "@/components/research/ResearchStream";
import { ResearchResults } from "@/components/research/ResearchResults";
import { FollowUpInput } from "@/components/research/FollowUpInput";
import { ResearchFeedback } from "@/components/research/ResearchFeedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import Link from "next/link";

function ResearchPageContent() {
  const { state, reset } = useResearch();

  return (
    <div className="space-y-6">
      {/* Query form: visible when idle or after an error */}
      {(state.status === 'idle' || state.status === 'error') && (
        <ResearchQueryForm />
      )}

      {/* Clarifying questions: visible when agent needs more context */}
      {state.status === 'clarifying' && <ClarifyingQuestions />}

      {/* Activity stream: visible while researching or once complete */}
      {(state.status === 'researching' || state.status === 'complete' || state.activityStream.length > 0) && (
        <ResearchStream />
      )}

      {/* Results: visible once research is complete */}
      {state.results && <ResearchResults />}

      {/* Feedback: optional post-research rating, shown once complete */}
      {state.status === 'complete' && <ResearchFeedback />}

      {/* Follow-up input (and topic drift warning): visible after results */}
      {(state.status === 'complete' || state.topicDrift.detected) && (
        <FollowUpInput />
      )}

      {/* Reset: lets user start a completely new research thread */}
      {(state.status === 'complete' || state.status === 'error') && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            New Research
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Please log in to access research features.
          </p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ResearchProvider>
      <ResearchPageContent />
    </ResearchProvider>
  );
}
