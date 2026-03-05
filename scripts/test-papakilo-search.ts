/**
 * Manual test script for Papakilo search integration.
 * Usage: npx tsx scripts/test-papakilo-search.ts [search-term]
 *
 * Example:
 *   npx tsx scripts/test-papakilo-search.ts "kanu kalo"
 */

import { searchPapakilo, fetchArticleContent, researchWithPapakilo } from '../src/services/research/papakilo';

const searchTerm = process.argv[2] ?? 'kanu kalo';

async function main() {
  console.log(`\n=== Papakilo Search Test ===`);
  console.log(`Search term: "${searchTerm}"\n`);

  // Test 1: Search
  console.log('--- Test 1: searchPapakilo() ---');
  console.log(`Searching for "${searchTerm}"...`);
  const searchResult = await searchPapakilo(searchTerm);
  console.log(`Total results: ${searchResult.totalResults}`);
  console.log(`Articles on page 1: ${searchResult.articles.length}`);
  if (searchResult.articles.length > 0) {
    console.log('\nFirst 3 articles:');
    searchResult.articles.slice(0, 3).forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.title}`);
      console.log(`     ${a.url}`);
    });
  }

  // Test 2: Fetch article content (if any results)
  if (searchResult.articles.length > 0) {
    console.log('\n--- Test 2: fetchArticleContent() ---');
    const firstArticle = searchResult.articles[0];
    console.log(`Fetching content from: ${firstArticle.url}`);
    const content = await fetchArticleContent(firstArticle.url);
    console.log(`Article ID: ${content.articleId}`);
    console.log(`Title: ${content.title}`);
    console.log(`Text preview (first 300 chars):\n${content.rawText.slice(0, 300)}`);
  }

  // Test 3: Full researchWithPapakilo
  console.log('\n--- Test 3: researchWithPapakilo() ---');
  const terms = [searchTerm, 'kalo', 'mahiai'];
  console.log(`Running research with terms: ${terms.join(', ')}`);
  const researchResult = await researchWithPapakilo(terms, {
    maxTerms: 2,
    maxArticlesPerTerm: 2,
  });
  console.log(`Articles collected: ${researchResult.articles.length}`);
  console.log(`Total results found across all searches: ${researchResult.totalFound}`);
  console.log(`Sources generated: ${researchResult.sources.length}`);
  console.log('\nSources:');
  researchResult.sources.forEach((s) => {
    console.log(`  - [${s.type}] ${s.title} | ${s.url}`);
  });

  console.log('\n✅ All tests passed');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
