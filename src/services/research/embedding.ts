import { researchConfig } from '@/lib/config/research';

/**
 * Generates a vector embedding for a single text input.
 *
 * TODO: Replace stub with actual embedding API call (Voyage AI, OpenAI, etc.)
 */
export async function embed(text: string): Promise<number[]> {
  // STUB: In the real implementation, this calls an embedding API:
  //
  //   const response = await fetch('https://api.voyageai.com/v1/embeddings', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       model: researchConfig.embeddingModel,
  //       input: text,
  //     }),
  //   });

  console.log(`[embedding] embed stub called for text of length ${text.length}`);

  return new Array(researchConfig.embeddingDimension).fill(0);
}

/**
 * Generates vector embeddings for multiple text inputs in a single batch.
 *
 * TODO: Replace stub with actual batch embedding API call.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  // STUB: In production, use batch API for efficiency

  console.log(`[embedding] embedBatch stub called for ${texts.length} texts`);

  return texts.map(() => new Array(researchConfig.embeddingDimension).fill(0));
}
