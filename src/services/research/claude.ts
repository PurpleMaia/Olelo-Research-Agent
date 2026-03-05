import Anthropic from '@anthropic-ai/sdk';
import type {
  ClarifyingQuestion,
  QuestionAnswer,
  ResearchResult,
  Source,
} from '@/types/research';
import { researchConfig } from '@/lib/config/research';

const anthropicClient = researchConfig.anthropicApiKey
  ? new Anthropic({ apiKey: researchConfig.anthropicApiKey })
  : null;

/** Call either Anthropic or DeepSeek (OpenAI-compatible) depending on what's configured. */
async function callLLM(opts: {
  system: string;
  userMessage: string;
  maxTokens: number;
}): Promise<string> {
  if (anthropicClient) {
    const response = await anthropicClient.messages.create({
      model: researchConfig.claudeModel,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.userMessage }],
    });
    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
    return content.text;
  }

  if (researchConfig.deepseekApiUrl && researchConfig.deepseekApiKey) {
    const baseUrl = researchConfig.deepseekApiUrl.replace(/\/$/, '');
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researchConfig.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: researchConfig.deepseekModel,
        max_tokens: opts.maxTokens,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('DeepSeek returned no content');
    return text;
  }

  throw new Error(
    'No AI provider configured. Set ANTHROPIC_API_KEY or both DEEPSEEK_API_URL and DEEPSEEK_API_KEY in your .env file.'
  );
}

export interface QueryAnalysis {
  needsClarification: boolean;
  questions?: ClarifyingQuestion[];
  searchTerms: string[];
}

export interface DocumentContext {
  content: string;
  title: string;
  docType: string;
  publication?: string;
  date?: string;
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
  "searchTerms": ["term1", "term2"]
}

Rules:
- "questions" is only included when needsClarification is true
- "options" is only included for "choice" or "multi-choice" types
- "placeholder" is only included for "text" or "date" types
- Always include 3-7 searchTerms, including Hawaiian language terms when relevant

A query needs clarification when it is genuinely ambiguous about:
- Time period (ancient, pre-contact, 1800s, early 1900s, specific decade)
- Geographic scope (all islands, specific island, specific ahupuaʻa or district)
- Aspect of interest (cultivation practices, ceremonial use, linguistic history, social context)
- Type of sources desired (oral tradition vs. written records vs. archaeological)

Do NOT ask for clarification when the query is reasonably specific. Focus clarifying questions on dimensions that would significantly change the search strategy.

When generating searchTerms, include:
- Core Hawaiian concepts in both English and ʻŌlelo Hawaiʻi (e.g., "awa", "kava", "ʻawa")
- Relevant place names, people, time periods
- Related cultural concepts that would appear in historical documents`;

const SYNTHESIS_PROMPT = `You are a Hawaiian research assistant synthesizing findings from Hawaiian language newspaper archives and the Papa Kilo database. Present findings in a structured, scholarly format that respects Hawaiian culture and language.

Respond with JSON in exactly this format:
{
  "summary": "string (2-3 paragraphs synthesizing key findings)",
  "findings": [
    {
      "id": "f1",
      "title": "string",
      "content": "string (detailed explanation with inline citations like [src_0])",
      "sources": ["src_0", "src_1"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "relatedTopics": ["string"]
}

Guidelines:
- Tier findings by confidence: high = multiple corroborating sources, medium = single strong source, low = partial or inferred
- Preserve Hawaiian language terms with translations in parentheses on first use, e.g., ʻawa (kava)
- Include specific details: physical descriptions, cultivation methods, place names (ahupuaʻa, moku), dates, authors
- Every finding must reference at least one source using its src_N id
- The summary should be accessible to a general audience while maintaining scholarly accuracy
- relatedTopics should suggest 3-5 areas for further research
- If no documents were found, clearly state this and provide context from general knowledge, marking confidence as "low"
- Do not fabricate sources or citations
- Sources with docType "papakilo-live" are live-scraped OCR text from historical Hawaiian newspapers — they may contain OCR noise and garbled characters; apply "medium" or "low" confidence unless content is clearly readable, and always include the source URL in your attribution when available
- Never attempt to "clean up" or infer garbled OCR text — only report what is clearly legible`;

/**
 * Analyzes a user query using Claude to determine if clarification is needed
 * and to extract search terms for the vector database.
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const text = await callLLM({
    system: QUERY_ANALYSIS_PROMPT,
    userMessage: query,
    maxTokens: 1024,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for query analysis');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    needsClarification: Boolean(parsed.needsClarification),
    questions: parsed.questions ?? undefined,
    searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
  };
}

/**
 * Synthesizes research results from retrieved document context using Claude.
 * Takes the original query, relevant document chunks, and any user-provided
 * answers to clarifying questions.
 */
export async function synthesize(
  query: string,
  context: DocumentContext[],
  answers?: QuestionAnswer[]
): Promise<ResearchResult> {
  const contextText = context
    .map(
      (doc, i) =>
        `[Source src_${i}] ${doc.title}${doc.publication ? ` | ${doc.publication}` : ''}${doc.date ? ` | ${doc.date}` : ''}:\n${doc.content}`
    )
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

  const userMessage = `Research Query: ${query}${answersText}\n\nRetrieved Documents (${context.length} found):\n${contextText || 'No documents found in corpus.'}`;

  const text = await callLLM({
    system: SYNTHESIS_PROMPT,
    userMessage,
    maxTokens: 4096,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for synthesis');

  const parsed = JSON.parse(jsonMatch[0]);

  const sources: Source[] = context.map((doc, i) => ({
    id: `src_${i}`,
    title: doc.title,
    publication: doc.publication,
    date: doc.date,
    type: doc.docType as 'papa-kilo' | 'newspaper' | 'web' | 'other',
    excerpt: doc.content.slice(0, 200),
  }));

  return {
    summary: parsed.summary ?? '',
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    sources,
    relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
  };
}
