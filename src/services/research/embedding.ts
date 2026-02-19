import { researchConfig } from '@/lib/config/research';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

interface VoyageResponse {
  data: { index: number; embedding: number[] }[];
  model: string;
  usage: { total_tokens: number };
}

async function callVoyageAPI(input: string | string[]): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${researchConfig.voyageApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: researchConfig.embeddingModel,
      input,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI API error ${response.status}: ${error}`);
  }

  const data: VoyageResponse = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Generates a vector embedding for a single text input using Voyage AI.
 */
export async function embed(text: string): Promise<number[]> {
  const results = await callVoyageAPI(text);
  return results[0];
}

/**
 * Generates vector embeddings for multiple text inputs in a single batch.
 * More efficient than calling embed() in a loop.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Voyage AI supports up to 128 inputs per batch
  const BATCH_SIZE = 128;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await callVoyageAPI(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
