import type {
  ClarifyingQuestion,
  QuestionAnswer,
  ResearchResult,
  Source,
  Finding,
} from '@/types/research';
import { researchConfig } from '@/lib/config/research';

/**
 * Extracts the first well-formed JSON object from a string.
 * Handles reasoning models that add explanatory text before/after JSON.
 */
function extractJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

/** Calls the configured OpenAI-compatible LLM API. */
async function callLLM(opts: {
  system: string;
  userMessage: string;
  maxTokens: number;
}): Promise<string> {
  if (!researchConfig.llmApiUrl || !researchConfig.llmApiKey) {
    throw new Error(
      'No LLM provider configured. Set LLM_API_URL and LLM_API_KEY in your .env file.'
    );
  }

  const baseUrl = researchConfig.llmApiUrl.replace(/\/$/, '');
  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${researchConfig.llmApiKey}`,
    },
    body: JSON.stringify({
      model: researchConfig.llmModel,
      max_tokens: opts.maxTokens,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  // Reasoning models (e.g. Qwen) put the final answer in `content` and
  // thinking in `reasoning_content`. Fall back to reasoning_content if
  // content is empty (happens when max_tokens is exhausted mid-think).
  const text: string = msg?.content || msg?.reasoning_content || msg?.provider_specific_fields?.reasoning_content;
  if (!text) throw new Error('LLM returned no content');
  return text;
}

export interface QueryAnalysis {
  needsClarification: boolean;
  questions?: ClarifyingQuestion[];
  searchTerms: string[];
  isOffTopic?: boolean;
  offTopicReason?: string;
}

export interface DocumentContext {
  content: string;
  title: string;
  docType: string;
  publication?: string;
  date?: string;
  url?: string;
  author?: string;
}

export interface ConversationContext {
  originalQuery: string;
  summary: string;
}

const QUERY_ANALYSIS_PROMPT = `You are a Hawaiian research assistant specializing in Hawaiian history, culture, and traditional practices. Your task is to analyze research queries before searching Hawaiian language databases (Papa Kilo) and historical newspaper archives (Ke Alakai o Hawaii, Ka Nupepa Kuokoa, etc.).

Analyze the user's query and respond with JSON in exactly this format:
{
  "needsClarification": boolean,
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "text" | "choice" | "multi-choice" | "date",
      "options": [{"value": "string", "label": "string"}],
      "required": true,
      "placeholder": "string"
    }
  ],
  "searchTerms": ["term1", "term2"],
  "isOffTopic": boolean,
  "offTopicReason": "string"
}

Rules:
- "questions" is only included when needsClarification is true
- "options" is only included for "choice" or "multi-choice" types
- "placeholder" is only included for "text" or "date" types
- "isOffTopic" and "offTopicReason" are only included when a prior conversation context is provided
- Always include 3-7 searchTerms, including Hawaiian language terms when relevant

A query needs clarification when it is genuinely ambiguous about:
- Time period (ancient, pre-contact, 1800s, early 1900s, specific decade)
- Geographic scope (all islands, specific island, specific ahupuaʻa or district)
- Aspect of interest (cultivation practices, ceremonial use, linguistic history, social context)
- Type of sources desired (oral tradition vs. written records vs. archaeological)

Do NOT ask for clarification when the query is reasonably specific. Focus clarifying questions on dimensions that would significantly change the search strategy.

When a prior conversation context is provided:
- Set isOffTopic = true if the new query is about a fundamentally different Hawaiian topic with no meaningful overlap
- Set isOffTopic = false if the new query refines, extends, or relates to the prior topic
- Refinements include: asking about a specific variety/place/person mentioned, requesting more detail, asking about a related practice
- New topics include: switching from kalo cultivation to navigational chants, or from fishing to genealogy with no connection

When generating searchTerms:
- Include core Hawaiian concepts in both English and ʻŌlelo Hawaiʻi (e.g., "awa", "kava", "ʻawa")
- Include relevant place names, people, time periods
- If answers to clarifying questions are provided, incorporate them to narrow the search terms
- Include related cultural concepts that would appear in historical documents`;

const SYNTHESIS_PROMPT = `You are a Hawaiian research assistant synthesizing findings from Hawaiian language newspaper archives and the Papa Kilo database. Present findings in a structured, scholarly format that respects Hawaiian culture and language.

Respond with JSON in exactly this format:
{
  "summary": "string (2-3 paragraphs synthesizing key findings, preserving Hawaiian terms with English translations in parentheses)",
  "findings": [
    {
      "id": "f1",
      "tier": 1,
      "title": "string (English title or description)",
      "hawaiianTitle": "string (Hawaiian language title if present in source, otherwise omit)",
      "content": "string (detailed explanation; every claim must include an inline citation like [src_0]; preserve Hawaiian text with English translation in parentheses)",
      "sources": ["src_0", "src_1"],
      "confidence": "high" | "medium" | "low",
      "keyExcerpts": ["string (verbatim Hawaiian or English excerpt from source, clearly legible only)"],
      "placeNames": ["string (ahupuaʻa, moku, island, district names mentioned)"],
      "methods": ["string (cultivation methods, practices, techniques described)"]
    }
  ],
  "relatedTopics": ["string"]
}

Tiering rules — assign EVERY finding a tier:
- tier 1 (HIGH VALUE): Multiple corroborating sources, high confidence, rich detail
- tier 2 (MEDIUM VALUE): Single strong source, moderate detail or clarity
- tier 3 (SUPPLEMENTARY): Partial, inferred, or OCR-degraded content, low confidence

Citation rules — strictly enforced:
- Every factual claim in "content" must have an inline [src_N] citation
- Include the source URL in citations whenever available, e.g. "According to [src_0](url)"
- Preserve Hawaiian language text exactly as it appears in the source, followed by English translation in parentheses
- Do NOT fabricate sources or citations

Additional guidelines:
- Include physical descriptions, measurements, colors, textures when present in sources
- Extract place names (ahupuaʻa, moku, island) into the placeNames array
- Extract cultivation methods, preparation techniques, ceremonial practices into methods array
- keyExcerpts: only include clearly legible text — never attempt to reconstruct garbled OCR
- Sources with docType "papakilo-live" are live-scraped OCR — apply tier 2 or 3 unless content is clearly readable
- The summary should synthesize across tiers and be accessible to a general audience
- relatedTopics: suggest 3-5 areas for further research
- If no documents were found, state this clearly and use tier 3 with confidence "low" for any general knowledge provided
- If prior research context is provided, build upon it rather than repeating already-covered material`;

const TRIAGE_SYSTEM_PROMPT = `You are a research triage agent for the Papakilo Hawaiian Newspaper Database. Article OCR text is provided directly to you. Assess each article's relevance against the provided research brief and extract structured findings.

## Process

For each article:

### Step 1: Assess relevance tier using the brief's criteria
- **Tier 1** — Article directly addresses the research topic with substantial detail
- **Tier 2** — Article contains relevant information but not as primary focus, or limited content
- **Tier 3** — Article only mentions the topic in passing. No substantive content.

Write a 1-2 sentence reason referencing specific content from the article.

### Step 2: Extract findings (Tier 1 and 2 ONLY)
- Quote DIRECTLY from the OCR text — no paraphrasing, no cleanup, no inference
- Tag with taxonomy tags from the brief
- Assess OCR clarity: high / medium / low
- Write a brief note explaining what the quote contains (interpretation goes here, not in the quote)
- If OCR prevents accurate extraction, write: "OCR too garbled for accurate extraction — researcher should view original scan"

### Step 3: Identify follow-ups
- Author names worth searching separately
- Series continuations ("Aole i pau" = article continues)
- New search terms discovered in the text
- Region or time period gaps this article reveals

## Strict Rules (non-negotiable)

1. NO INFERENCE — only report what is explicitly present
   - author: only if byline is explicitly present in text
   - region_mentions: only regions named in the article text
   - quote: direct OCR text verbatim, never cleaned up
2. NO HALLUCINATION — mark garbled OCR as [OCR unclear], never guess
3. Tier 3 articles get NO findings extracted
4. Every quote must be traceable to the provided article text

## Output Format

Return ONLY a JSON object, no other text:

{
  "triage_summary": {
    "articles_processed": 5,
    "tier_1": 1,
    "tier_2": 2,
    "tier_3": 2,
    "errors": 0
  },
  "articles": [
    {
      "id": "src_0",
      "title": "article title from text or metadata",
      "date": "YYYY-MM-DD or null",
      "source": "newspaper name or null",
      "author": null,
      "region_mentions": [],
      "tier": 1,
      "reason": "1-2 sentence explanation referencing specific content",
      "ocr_quality": "high|medium|low",
      "series": null
    }
  ],
  "findings": [
    {
      "article_id": "src_0",
      "priority": "primary-tag-from-brief-taxonomy",
      "tags": ["tag1", "tag2"],
      "quote": "verbatim OCR text from the article",
      "ocr_clarity": "high|medium|low",
      "note": "what this quote means or contains — interpretation goes here"
    }
  ],
  "followups": [
    {
      "type": "term|author|series|newspaper|region-gap|time-gap|source-gap",
      "value": "the specific thing to follow up on",
      "source_article_id": "src_0",
      "priority": "high|medium|low",
      "notes": "why this is worth pursuing"
    }
  ]
}`;

/**
 * Analyzes a user query using Claude to determine if clarification is needed
 * and to extract search terms for the vector database.
 *
 * When conversationContext is provided (refinement flow), Claude also checks
 * whether the new query is on-topic relative to the prior research.
 */
export async function analyzeQuery(
  query: string,
  options?: {
    answers?: QuestionAnswer[];
    conversationContext?: ConversationContext;
  }
): Promise<QueryAnalysis> {
  const { answers, conversationContext } = options ?? {};

  let userMessage = query;

  if (answers && answers.length > 0) {
    const answersText = answers
      .map((a) => `- ${a.questionId}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`)
      .join('\n');
    userMessage += `\n\nUser clarifications:\n${answersText}`;
  }

  if (conversationContext) {
    userMessage =
      `Prior research context:\n` +
      `Original query: "${conversationContext.originalQuery}"\n` +
      `Summary: ${conversationContext.summary}\n\n` +
      `New follow-up query: ${query}`;
  }

  const text = await callLLM({
    system: QUERY_ANALYSIS_PROMPT,
    userMessage,
    maxTokens: 8192,
  });

  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Claude did not return valid JSON for query analysis');

  const parsed = JSON.parse(jsonStr);

  return {
    needsClarification: Boolean(parsed.needsClarification),
    questions: parsed.questions ?? undefined,
    searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
    isOffTopic: conversationContext ? Boolean(parsed.isOffTopic) : undefined,
    offTopicReason: parsed.offTopicReason ?? undefined,
  };
}

// Internal triage types matching the triage agent output schema
interface TriageArticle {
  id: string;
  title: string;
  date: string | null;
  source: string | null;
  author: string | null;
  region_mentions: string[];
  tier: 1 | 2 | 3;
  reason: string;
  ocr_quality: 'high' | 'medium' | 'low';
  series: string | null;
}

interface TriageFinding {
  article_id: string;
  priority: string;
  tags: string[];
  quote: string;
  ocr_clarity: 'high' | 'medium' | 'low';
  note: string;
}

interface TriageFollowup {
  type: string;
  value: string;
  source_article_id: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
}

interface TriageOutput {
  triage_summary: {
    articles_processed: number;
    tier_1: number;
    tier_2: number;
    tier_3: number;
    errors: number;
  };
  articles: TriageArticle[];
  findings: TriageFinding[];
  followups: TriageFollowup[];
}

/**
 * Triages retrieved articles against a research brief using the triage agent approach
 * from the Research_agentic_tool system. Returns structured ResearchResult with
 * direct OCR quotes, tier assignments, and follow-up leads.
 */
export async function triage(
  query: string,
  context: DocumentContext[],
  briefText: string,
  answers?: QuestionAnswer[],
  conversationContext?: ConversationContext
): Promise<ResearchResult> {
  if (context.length === 0) {
    return synthesize(query, [], answers, conversationContext);
  }

  const articlesText = context
    .map((doc, i) => {
      const meta = [
        doc.publication,
        doc.author ? `by ${doc.author}` : null,
        doc.date,
        doc.url ? `URL: ${doc.url}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      return `--- Article [src_${i}] ---\nTitle: ${doc.title}${meta ? `\nMeta: ${meta}` : ''}\n\nOCR Text:\n${doc.content}`;
    })
    .join('\n\n');

  const answersText =
    answers && answers.length > 0
      ? `\n\nResearcher clarifications:\n${answers
          .map((a) => `- ${a.questionId}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`)
          .join('\n')}`
      : '';

  const priorContextText = conversationContext
    ? `\n\nPrior research (do not repeat findings already covered):\nOriginal query: "${conversationContext.originalQuery}"\nPrevious summary: ${conversationContext.summary}`
    : '';

  const userMessage =
    `Research Query: ${query}${answersText}${priorContextText}\n\n` +
    `Research Brief:\n${briefText}\n\n` +
    `Articles to triage (${context.length} total):\n\n${articlesText}`;

  const text = await callLLM({
    system: TRIAGE_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 16000,
  });

  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Triage agent did not return valid JSON');

  const parsed: TriageOutput = JSON.parse(jsonStr);

  // Build sources from triage articles (all tiers — let UI filter by tier)
  const sources: Source[] = parsed.articles.map((a, i) => {
    const originalDoc = context[parseInt(a.id.replace('src_', ''), 10)] ?? context[i];
    const firstFinding = parsed.findings.find((f) => f.article_id === a.id);
    return {
      id: a.id,
      title: a.title || originalDoc?.title || a.id,
      author: a.author ?? undefined,
      publication: a.source ?? originalDoc?.publication,
      date: a.date ?? originalDoc?.date,
      url: originalDoc?.url,
      type: (originalDoc?.docType as Source['type']) ?? 'papakilo-live',
      excerpt: firstFinding?.quote?.slice(0, 200) ?? originalDoc?.content?.slice(0, 200),
    };
  });

  // Build findings from triage findings — inherit tier from parent article
  const findings: Finding[] = parsed.findings.map((f, i) => {
    const parentArticle = parsed.articles.find((a) => a.id === f.article_id);
    const tier = (parentArticle?.tier as 1 | 2 | 3) ?? 3;
    const ocrToConfidence = (clarity: string): 'high' | 'medium' | 'low' =>
      clarity === 'high' ? 'high' : clarity === 'medium' ? 'medium' : 'low';

    return {
      id: `f${String(i + 1).padStart(3, '0')}`,
      tier,
      title: f.priority,
      hawaiianTitle: undefined,
      content: `${f.note} [${f.article_id}]`,
      sources: [f.article_id],
      confidence: ocrToConfidence(f.ocr_clarity),
      keyExcerpts: f.quote ? [f.quote] : undefined,
      placeNames:
        parentArticle?.region_mentions?.length ? parentArticle.region_mentions : undefined,
      methods: f.tags?.length ? f.tags : undefined,
    };
  });

  // Summary from triage stats
  const s = parsed.triage_summary;
  const summary =
    `Triaged ${s.articles_processed} articles from the Papakilo Database: ` +
    `${s.tier_1} high value, ${s.tier_2} medium value, ${s.tier_3} excluded as peripheral. ` +
    (s.errors > 0 ? `${s.errors} articles could not be loaded. ` : '') +
    `${parsed.findings.length} findings extracted with direct OCR quotes.`;

  // Related topics from high-priority followups
  const relatedTopics = parsed.followups
    .filter((f) => f.priority === 'high' || f.priority === 'medium')
    .map((f) => f.value)
    .slice(0, 6);

  return { summary, findings, sources, relatedTopics };
}

/**
 * Synthesizes research results from retrieved document context using Claude.
 * Used as a fallback when no documents are retrieved by the triage pipeline,
 * allowing Claude to respond with general knowledge rather than a hard error.
 */
async function synthesize(
  query: string,
  context: DocumentContext[],
  answers?: QuestionAnswer[],
  conversationContext?: ConversationContext
): Promise<ResearchResult> {
  const contextText = context
    .map((doc, i) => {
      const meta = [
        doc.publication,
        doc.author ? `by ${doc.author}` : null,
        doc.date,
        doc.url ? `URL: ${doc.url}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      return `[Source src_${i}] ${doc.title}${meta ? ` | ${meta}` : ''}:\n${doc.content}`;
    })
    .join('\n\n---\n\n');

  const answersText =
    answers && answers.length > 0
      ? `\n\nUser provided additional context:\n${answers
          .map(
            (a) =>
              `- ${a.questionId}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`
          )
          .join('\n')}`
      : '';

  const priorContextText = conversationContext
    ? `\n\nPrior research context (do not repeat, build upon):\n` +
      `Original query: "${conversationContext.originalQuery}"\n` +
      `Previous summary: ${conversationContext.summary}`
    : '';

  const userMessage =
    `Research Query: ${query}${answersText}${priorContextText}\n\n` +
    `Retrieved Documents (${context.length} found):\n${contextText || 'No documents found in corpus.'}`;

  const text = await callLLM({
    system: SYNTHESIS_PROMPT,
    userMessage,
    maxTokens: 4096,
  });

  const jsonStr = extractJSON(text);
  if (!jsonStr) throw new Error('Claude did not return valid JSON for synthesis');

  const parsed = JSON.parse(jsonStr);

  const sources: Source[] = context.map((doc, i) => ({
    id: `src_${i}`,
    title: doc.title,
    author: doc.author,
    publication: doc.publication,
    date: doc.date,
    url: doc.url,
    type: doc.docType as 'papa-kilo' | 'newspaper' | 'web' | 'other',
    excerpt: doc.content.slice(0, 200),
  }));

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map((f: Record<string, unknown>, i: number) => ({
        id: (f.id as string) ?? `f${i}`,
        tier: (f.tier as 1 | 2 | 3) ?? 3,
        title: (f.title as string) ?? '',
        hawaiianTitle: (f.hawaiianTitle as string) ?? undefined,
        content: (f.content as string) ?? '',
        sources: Array.isArray(f.sources) ? (f.sources as string[]) : [],
        confidence: (f.confidence as 'high' | 'medium' | 'low') ?? 'low',
        keyExcerpts: Array.isArray(f.keyExcerpts) ? (f.keyExcerpts as string[]) : undefined,
        placeNames: Array.isArray(f.placeNames) ? (f.placeNames as string[]) : undefined,
        methods: Array.isArray(f.methods) ? (f.methods as string[]) : undefined,
      }))
    : [];

  return {
    summary: parsed.summary ?? '',
    findings,
    sources,
    relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
  };
}
