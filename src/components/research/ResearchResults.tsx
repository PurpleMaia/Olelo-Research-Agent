'use client';

import { useResearch } from '@/hooks/contexts/ResearchContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function ResearchResults() {
  const { state } = useResearch();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!state.results) {
    return null;
  }

  const { summary, sources, findings, relatedTopics } = state.results;

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getSourceBadgeColor = (type: string) => {
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
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Research Results</CardTitle>
        </div>
        <CardDescription>
          Here&apos;s what we found based on your research question
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Summary</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(summary, 'summary')}
            >
              {copiedId === 'summary' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        </div>

        <Separator />

        {/* Key Findings */}
        {findings && findings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Key Findings</h3>
            <Accordion type="single" collapsible className="w-full">
              {findings.map((finding, index) => (
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
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : finding.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }
                        >
                          {finding.confidence} confidence
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {finding.content}
                      </p>
                      {finding.sources.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Sources: </span>
                          {finding.sources.map((sourceId, idx) => {
                            const source = sources.find((s) => s.id === sourceId);
                            return source ? (
                              <span key={sourceId}>
                                {idx > 0 && ', '}
                                {source.title}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(finding.content, finding.id)}
                      >
                        {copiedId === finding.id ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        <Separator />

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Sources ({sources.length})
            </h3>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{source.title}</h4>
                        {source.author && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {source.author}
                          </p>
                        )}
                        {(source.publication || source.date) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {source.publication}
                            {source.date && ` • ${source.date}`}
                          </p>
                        )}
                      </div>
                      <Badge className={getSourceBadgeColor(source.type)}>
                        {source.type.replace('-', ' ')}
                      </Badge>
                    </div>

                    {source.excerpt && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        &quot;{source.excerpt}&quot;
                      </p>
                    )}

                    {source.url && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        asChild
                      >
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          View Source
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Related Topics */}
        {relatedTopics && relatedTopics.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Related Topics</h3>
              <div className="flex flex-wrap gap-2">
                {relatedTopics.map((topic, index) => (
                  <Badge key={index} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
