export const researchConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  voyageApiKey: process.env.VOYAGE_API_KEY ?? '',
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'voyage-3',
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION ?? '1024'),
  vectorSearchLimit: 10,
  vectorSearchThreshold: 0.7,
  maxChunkTokens: 500,
  chunkOverlapTokens: 50,
  claudeModel: 'claude-sonnet-4-6' as const,
};
