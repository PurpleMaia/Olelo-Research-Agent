'use client';

import { useResearch } from '@/hooks/contexts/ResearchContext';
import type { Finding, Source } from '@/types/research';
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
import { FileText, ExternalLink, Copy, CheckCircle2, MapPin, BookOpen, Quote } from 'lucide-react';
import { useState, Fragment } from 'react';

/**
 * Parses a content string containing [src_N] or [src_N](url) inline citations
 * and returns an array of text segments and clickable citation links.
 */
function renderContentWithLinks(content: string, sources: Source[]): React.ReactNode {
  // Match [src_N] or [src_N](https://...)
  const pattern = /\[src_(\d+)\](?:\(([^)]+)\))?/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const srcId = `src_${match[1]}`;
    const inlineUrl = match[2]; // URL from [src_N](url) syntax, if present
    const source = sources.find((s) => s.id === srcId);
    const href = inlineUrl ?? source?.url;

    if (href) {
      parts.push(
        <a
          key={`${srcId}-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary font-mono text-xs font-semibold hover:underline"
          title={source ? `${source.title}${source.date ? ` · ${source.date}` : ''}` : srcId}
        >
          [{srcId}]
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      );
    } else {
      // No URL — render as a non-linked badge
      parts.push(
        <span key={`${srcId}-${match.index}`} className="font-mono text-xs text-primary font-semibold">
          [{srcId}]
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}

const TIER_CONFIG = {
  1: { label: 'Tier 1 — HIGH VALUE', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', border: 'border-l-emerald-500' },
  2: { label: 'Tier 2 — MEDIUM VALUE', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', border: 'border-l-yellow-500' },
  3: { label: 'Tier 3 — SUPPLEMENTARY', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', border: 'border-l-gray-400' },
} as const;

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const SOURCE_TYPE_COLOR: Record<string, string> = {
  'papa-kilo': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'papakilo-live': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  newspaper: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  web: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function ResearchResults() {
  const { state } = useResearch();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!state.results) return null;

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

  const getSourceById = (id: string): Source | undefined => sources.find((s) => s.id === id);

  const tier1 = findings.filter((f) => f.tier === 1);
  const tier2 = findings.filter((f) => f.tier === 2);
  const tier3 = findings.filter((f) => f.tier === 3);
  const tiers: [1 | 2 | 3, Finding[]][] = [
    [1, tier1],
    [2, tier2],
    [3, tier3],
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Research Results</CardTitle>
        </div>
        <CardDescription>
          {findings.length} findings across {sources.length} sources
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Summary</h3>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(summary, 'summary')}>
              {copiedId === 'summary' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>

        <Separator />

        {/* Tiered Findings */}
        {findings.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Findings by Relevance Tier</h3>
            {tiers.map(([tier, tierFindings]) => {
              if (tierFindings.length === 0) return null;
              const cfg = TIER_CONFIG[tier];
              return (
                <div key={tier}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground">{tierFindings.length} finding{tierFindings.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Accordion type="multiple" className="w-full space-y-1">
                    {tierFindings.map((finding, index) => (
                      <AccordionItem
                        key={finding.id}
                        value={finding.id}
                        className={`border-l-4 pl-3 rounded-sm ${cfg.border}`}
                      >
                        <AccordionTrigger className="text-left py-3 hover:no-underline">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {index + 1}. {finding.title}
                              </span>
                              {finding.confidence && (
                                <Badge variant="secondary" className={CONFIDENCE_COLOR[finding.confidence]}>
                                  {finding.confidence}
                                </Badge>
                              )}
                            </div>
                            {finding.hawaiianTitle && (
                              <span className="text-xs text-muted-foreground italic">
                                {finding.hawaiianTitle}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2 pb-3">
                            {/* Main content with inline citation links */}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {renderContentWithLinks(finding.content, sources)}
                            </p>

                            {/* Key Excerpts */}
                            {finding.keyExcerpts && finding.keyExcerpts.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <Quote className="h-3 w-3" />
                                  Key Excerpts
                                </div>
                                {finding.keyExcerpts.map((excerpt, i) => (
                                  <blockquote
                                    key={i}
                                    className="border-l-2 border-muted pl-3 text-xs italic text-muted-foreground"
                                  >
                                    {excerpt}
                                  </blockquote>
                                ))}
                              </div>
                            )}

                            {/* Place Names */}
                            {finding.placeNames && finding.placeNames.length > 0 && (
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-wrap gap-1">
                                  {finding.placeNames.map((place, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {place}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Methods / Practices */}
                            {finding.methods && finding.methods.length > 0 && (
                              <div className="flex items-start gap-1">
                                <BookOpen className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-wrap gap-1">
                                  {finding.methods.map((method, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {method}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inline source citations */}
                            {finding.sources.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Citations</p>
                                {finding.sources.map((sourceId) => {
                                  const src = getSourceById(sourceId);
                                  if (!src) return null;
                                  return (
                                    <div key={sourceId} className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                                      <span className="font-mono text-primary mr-1">[{sourceId}]</span>
                                      <span className="font-medium">{src.title}</span>
                                      {src.hawaiianTitle && (
                                        <span className="italic ml-1">({src.hawaiianTitle})</span>
                                      )}
                                      {src.author && <span> · by {src.author}</span>}
                                      {src.publication && <span> · {src.publication}</span>}
                                      {src.date && <span> · {src.date}</span>}
                                      {src.url && (
                                        <a
                                          href={src.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
                                        >
                                          Papa Kilo
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(finding.content, finding.id)}
                            >
                              {copiedId === finding.id ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" />Copy</>
                              )}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Full Sources List */}
        {sources.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Sources ({sources.length})</h3>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs text-primary">[{source.id}]</span>
                          <h4 className="text-sm font-medium">{source.title}</h4>
                        </div>
                        {source.hawaiianTitle && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">
                            {source.hawaiianTitle}
                          </p>
                        )}
                        {source.englishTitle && source.englishTitle !== source.title && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {source.englishTitle}
                          </p>
                        )}
                        {source.author && (
                          <p className="text-xs text-muted-foreground mt-0.5">by {source.author}</p>
                        )}
                        {(source.publication || source.date) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {source.publication}
                            {source.date && ` · ${source.date}`}
                          </p>
                        )}
                      </div>
                      <Badge className={SOURCE_TYPE_COLOR[source.type] ?? SOURCE_TYPE_COLOR.other}>
                        {source.type.replace('-', ' ')}
                      </Badge>
                    </div>

                    {source.excerpt && (
                      <p className="text-xs text-muted-foreground italic mt-2 line-clamp-3">
                        &quot;{source.excerpt}&quot;
                      </p>
                    )}

                    {source.url && (
                      <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs" asChild>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          View on Papa Kilo Database
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
