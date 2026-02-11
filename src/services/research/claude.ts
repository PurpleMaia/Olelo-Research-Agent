import type {
  ClarifyingQuestion,
  QuestionAnswer,
  ResearchResult,
} from '@/types/research';
import { researchConfig } from '@/lib/config/research';

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

/**
 * Analyzes a user query using Claude to determine if clarification is needed
 * and to extract search terms for the vector database.
 *
 * TODO: Replace stub with actual Anthropic API call.
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  // STUB: In the real implementation, this sends the query to Claude with a
  // system prompt that instructs it to:
  // 1. Determine if the query is specific enough to research
  // 2. Generate clarifying questions if needed
  // 3. Extract key search terms for vector similarity search
  //
  // Example prompt shape:
  //   const client = new Anthropic({ apiKey: researchConfig.anthropicApiKey });
  //   const response = await client.messages.create({
  //     model: researchConfig.claudeModel,
  //     system: HAWAIIAN_RESEARCH_SYSTEM_PROMPT,
  //     messages: [{ role: 'user', content: query }],
  //   });

  console.log(`[claude] analyzeQuery stub called for: "${query.slice(0, 50)}..."`);

  // Stub: always returns search terms, never asks for clarification
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return {
    needsClarification: false,
    searchTerms: words.slice(0, 5),
  };
}

/**
 * Synthesizes research results from retrieved document context using Claude.
 * Takes the original query, relevant document chunks, and any user-provided
 * answers to clarifying questions.
 *
 * TODO: Replace stub with actual Anthropic API call.
 */
export async function synthesize(
  query: string,
  context: DocumentContext[],
  answers?: QuestionAnswer[]
): Promise<ResearchResult> {
  // STUB: In the real implementation, this sends the query + context to Claude
  // with a system prompt that instructs it to:
  // 1. Synthesize the retrieved documents into a coherent summary
  // 2. Identify key findings with confidence levels
  // 3. Cite specific sources
  // 4. Suggest related topics
  //
  // Example prompt shape:
  //   const contextText = context.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
  //   const client = new Anthropic({ apiKey: researchConfig.anthropicApiKey });
  //   const response = await client.messages.create({
  //     model: researchConfig.claudeModel,
  //     system: SYNTHESIS_SYSTEM_PROMPT,
  //     messages: [{ role: 'user', content: `Query: ${query}\n\nContext:\n${contextText}` }],
  //   });

  console.log(`[claude] synthesize stub called with ${context.length} documents`);

  return {
    summary:
      'This is a stub result. Replace the Claude service implementation to get real AI-synthesized research results from your Hawaiian document corpus.',
    sources: context.map((doc, i) => ({
      id: `src_${i}`,
      title: doc.title,
      publication: doc.publication,
      date: doc.date,
      type: doc.docType as 'papa-kilo' | 'newspaper' | 'web' | 'other',
      excerpt: doc.content.slice(0, 200),
    })),
    findings: [
      {
        id: 'stub_finding_1',
        title: 'Stub Finding',
        content:
          'This finding will be replaced when the Claude API integration is implemented. The synthesize function will use retrieved document context to generate real findings.',
        sources: context.length > 0 ? ['src_0'] : [],
        confidence: 'low',
      },
    ],
    relatedTopics: ['Hawaiian History', 'ʻŌlelo Hawaiʻi'],
  };
}
