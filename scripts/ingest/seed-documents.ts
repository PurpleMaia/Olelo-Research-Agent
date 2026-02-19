/**
 * Document ingestion script for the Hawaiian Research Assistant.
 *
 * Seeds the database with sample Hawaiian documents for development and testing.
 * In production, replace SAMPLE_DOCUMENTS with documents from:
 *   - Papa Kilo Database (papa-kilo)
 *   - Hawaiian language newspaper archives (newspaper)
 *   - Web sources (web)
 *
 * Usage:
 *   npx tsx scripts/ingest/seed-documents.ts
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env
 *   - VOYAGE_API_KEY set in .env (for real embeddings)
 *   - PostgreSQL running with pgvector extension enabled
 *   - Migrations applied (npm run migrate:up)
 */

import 'dotenv/config';
import { ingestBatch } from '@/services/research/ingest';
import { db } from '@/db/kysely/client';
import type { IngestDocumentInput } from '@/services/research/ingest';

const SAMPLE_DOCUMENTS: IngestDocumentInput[] = [
  {
    title: "ʻAwa (Piper methysticum) Cultivation Practices in Ancient Hawaiʻi",
    docType: "papa-kilo",
    publication: "Papa Kilo Database",
    date: "2018-01-01",
    url: "https://papakilo.example.com/documents/awa-cultivation",
    content: `ʻAwa, known in English as kava, held a central place in Hawaiian ceremonial and social life. The plant (Piper methysticum) was cultivated throughout the Hawaiian Islands, with notable varieties developed across different moku (districts).

Traditional cultivation of ʻawa required specific environmental conditions. The plant thrived in well-drained soils at elevations between 300 and 900 meters, preferring partial shade from larger canopy trees such as kukui (Aleurites moluccana). Farmers, known as mahiʻai, propagated ʻawa exclusively through stem cuttings, as the cultivated varieties had lost the ability to produce viable seeds.

In Puna district on Hawaiʻi Island, the rich volcanic soil and consistent rainfall created ideal conditions for ʻawa cultivation. The ʻawa panaʻewa variety, named after the famous forest of Puna, was prized for its mild flavor and was frequently used in offerings to Lono, the deity associated with agriculture and fertility.

Harvesting occurred when the plant reached maturity, typically after two to four years of growth. The lateral roots, called ʻākala, were considered most potent, while the stump and main roots were harvested for daily ceremonial use. After harvest, roots were cleaned, pounded, and mixed with water by young men or children, whose saliva was believed to aid in the fermentation process.`,
    metadata: { tags: ["cultivation", "ceremony", "Puna", "agriculture"], language: "en" },
  },
  {
    title: "He Moolelo no ka Awa: Ka Mea Nui o na Luakini",
    docType: "newspaper",
    publication: "Ka Nupepa Kuokoa",
    date: "1868-03-14",
    url: "https://chroniclingamerica.loc.gov/lccn/sn83025882/",
    content: `Ma ka wa kahiko, ua hanaia ka awa ma na luakini a pau o Hawaii nei. O ka awa, he mea nui ia i ka wa o ka hana ana i na pule ana i na akua. Ua kanu ia ka awa ma na wahi o ko lakou noho ana, a ua malama ia me ka nui o ka noio.

No ka ʻawa o Kona, ua ʻōlelo ʻia he ʻawa maikaʻi loa ia no ko kona ʻono. Ua kūkulu ʻia nā māla ʻawa ma nā ʻāina maloʻo o Kona, a ua hoʻomōaʻa ʻia ma lalo o nā lāʻau nui. ʻO nā kumu ʻawa i ulu maikaʻi i Kona, ua ʻōlelo ʻia he uku ʻono ko lākou a hoʻohiwahiwa ʻia e ka poʻe kahiko.

I ka wā o Kamehameha Nui, ua hoʻohana ʻia ka ʻawa i nā wā nui a pau — i ka hoʻokuʻu ʻana i nā aliʻi i make, i ka hana ana i nā ʻaha pule, a i ka wā o ka lapaʻau ʻana paha. Ua ʻōlelo ʻia e nā kāhuna, ʻo ka ʻawa wai ʻoia, he ala ia e hiki ai ke kamaʻilio aku i nā akua.`,
    metadata: { tags: ["ceremony", "luakini", "Kona", "Kamehameha"], language: "haw" },
  },
  {
    title: "Kalo (Taro) Farming in the Ahupuaʻa System",
    docType: "papa-kilo",
    publication: "Papa Kilo Database",
    date: "2020-06-15",
    url: "https://papakilo.example.com/documents/kalo-ahupuaa",
    content: `Kalo (Colocasia esculenta), or taro, formed the cornerstone of the traditional Hawaiian agricultural system. Within the ahupuaʻa land division system, kalo cultivation was organized from the upland forests (wao nahele) down to the coastal fishponds (loko iʻa), with wet taro paddies (loʻi kalo) concentrated in valley floors near streams.

The loʻi kalo represented one of the most sophisticated irrigation systems in Polynesia. Hawaiians engineered extensive networks of auwai (irrigation channels) to direct fresh water from mountain streams through a series of terraced paddies. Each loʻi was carefully leveled and maintained with earthen berms (kuaiwi) to control water flow and depth.

Kalo cultivation required deep knowledge of the lunar calendar (Hawaiian Moon Calendar). Planting was timed to specific moon phases — the best planting days fell during the waxing moon, particularly on the days of Hua, Akua, and Hoku. Certain varieties were planted during full moon to encourage large, well-formed corms.

Over 300 varieties of kalo were cultivated in pre-contact Hawaiʻi. Each had distinct characteristics suited to particular growing conditions:
- Lehua maoli: Deep red corm, grown in wet loʻi, prized for its sticky texture in poi
- Mana ʻulu: White corm, drought-tolerant, grown in dry land (māla kalo)
- ʻEleʻele: Dark purple, ceremonial variety used in hula and religious offerings
- Poni: Purple-stemmed, medium corm, common variety for daily consumption

The harvesting of kalo was a communal activity governed by kapu (sacred restrictions). Only certain individuals could harvest kalo intended for aliʻi (chiefly) consumption, and specific prayers (oli) were recited during harvest to honor Hāloanakalaukapalili, the kalo deity and ancestor of the Hawaiian people.`,
    metadata: { tags: ["agriculture", "loʻi", "ahupuaʻa", "irrigation", "varieties"], language: "en" },
  },
  {
    title: "Na Ia o Hawaii: He Wehewehe no na Lawaiʻa Kahiko",
    docType: "newspaper",
    publication: "Ke Alakai o Hawaii",
    date: "1932-08-22",
    url: "https://chroniclingamerica.loc.gov/lccn/sn82015391/",
    content: `He nui na ano lawaia a ka poe Hawaii kahiko i hana ai. Ua ike lakou i na ano ia o ke kai, o ka muliwai, a me na loko. Ua pono ko lakou ike no na wa o ka makani, o ke au, a me ka la.

ʻO ka hukilau, he ʻano lawaiʻa ia e hana pū ai nā kānaka he nui. Ua hana ʻia kēia lawaiʻa ma nā kahakai ākea o Hawaiʻi. Ua kāohi ʻia ka upena nui ma waena o ke kai, a laila ua huki ʻia i uka me ka leo nui a me ka ʻōlelo pū. ʻO nā kamalīʻī, ua kōkua lākou i ka huki ʻana a me ka hana ʻana i mea ʻai mai nā iʻa i loaʻa ai.

No nā loko iʻa, ua kūkulu ʻia ia ma nā wahi e hui ana ke kai a me ka ʻāina. Ua hana ʻia nā pākū pohaku e hoʻokaʻa ana i nā iʻa i loko. Ua ʻike ʻia nā loko iʻa nui ma Molokaʻi, ma Oʻahu, a ma Maui. ʻO Menehune Fish Pond ma Kauaʻi, ua ʻōlelo ʻia he hana a ka poʻe Menehune ia, a he mea nui ia i ka wā o nā aliʻi.`,
    metadata: { tags: ["fishing", "hukilau", "loko iʻa", "ocean", "traditional practices"], language: "haw" },
  },
  {
    title: "Kukui (Candlenut) Tree: Uses in Traditional Hawaiian Culture",
    docType: "papa-kilo",
    publication: "Papa Kilo Database",
    date: "2019-11-03",
    url: "https://papakilo.example.com/documents/kukui-uses",
    content: `The kukui tree (Aleurites moluccana), also known as the candlenut tree, served as one of the most versatile resources in traditional Hawaiian material culture. Designated as the official state tree of Hawaiʻi in 1959, kukui held profound cultural significance long before Western contact.

The nuts of the kukui provided the primary source of artificial light in pre-contact Hawaiʻi. Hawaiians strung the oil-rich kernels on the midrib of a coconut palm frond, then lit them sequentially — each nut burning for approximately fifteen minutes before the flame reached the next. These kukui nut torches (lama kukui) were used during nighttime fishing, ceremonies, and to illuminate homes of the aliʻi.

Medicinally, every part of the kukui tree found application in the Hawaiian healing tradition (lāʻau lapaʻau). The soot from burned nuts, mixed with kukui oil, created a black dye (pāʻele) used by kāhuna (healers and priests) to mark the skin. The roasted nut kernels, called inamona when mixed with salt and chili pepper, served as a condiment that remains popular in Hawaiian cuisine today.

Kukui oil extracted from the nuts was used to preserve wooden implements, waterproof kapa (bark cloth), and condition fishnets. The bark and young leaves were used as purgatives and topical treatments for skin conditions. Necklaces of polished kukui nuts (lei kukui) indicated high social status and were worn by aliʻi during important ceremonies.

The tree itself served as a wayfinding landmark — kukui trees grow preferentially in valley bottoms near freshwater sources, and their distinctive silvery-green canopy was visible from great distances, guiding travelers and fishermen toward water and settlement.`,
    metadata: { tags: ["kukui", "material culture", "medicine", "lāʻau lapaʻau", "lighting"], language: "en" },
  },
  {
    title: "He Moolelo Poko no Kamehameha I a me kona Aupuni",
    docType: "newspaper",
    publication: "Ka Hoku o Hawaii",
    date: "1907-04-10",
    url: "https://chroniclingamerica.loc.gov/lccn/sn84024843/",
    content: `ʻO Kamehameha ka Nui, nāna i hoʻohui i nā mokupuni o Hawaiʻi nei i lalo o kona malu. I ka makahiki 1810, ua hoʻokō ʻia kēia hana nui ma ka hoʻowaiwai ʻana o Kaumualiʻi, ke aliʻi o Kauaʻi a me Niʻihau.

I ke au o Kamehameha, ua hoʻolako maikaʻi ʻia nā kānaka o Hawaiʻi. Ua hoʻomalu ʻo ia i ka ʻāina a me ke kai, a ua kūkulu ʻo ia i nā lula e pale ai i ka hakakā o nā aliʻi. ʻO ke kānāwai mamalahoe, kona kānāwai kaulana: "E hele ana ke kanaka me ka iʻa o ke kai ma kona lima, a ʻaʻohe mea nāna e pepehi."

Ua hoʻohana ʻo Kamehameha i nā mea kaua hou a me nā ʻenehana o nā haole i loaʻa mai ai iā ia i ke kūikahi ana me nā moku haole. Ua kūkulu ʻo ia i kāna pūʻali koa me nā pū kuni pohaku a me nā kanaka haole e hana ana ma lalo ona. ʻO John Young lāua ʻo Isaac Davis, ʻo lāua nā haole kaulana i noho ma lalo o ke aliʻi.`,
    metadata: { tags: ["Kamehameha", "unification", "history", "politics", "kānāwai mamalahoe"], language: "haw" },
  },
];

async function clearExistingDocuments() {
  console.log('Clearing existing sample documents...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).deleteFrom('document_chunks').execute();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).deleteFrom('documents').execute();
  console.log('Cleared.');
}

async function main() {
  console.log('=== Hawaiian Research Assistant — Document Ingestion ===\n');

  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  if (shouldClear) {
    await clearExistingDocuments();
  }

  console.log(`Ingesting ${SAMPLE_DOCUMENTS.length} documents...\n`);

  const { ingested, errors } = await ingestBatch(SAMPLE_DOCUMENTS);

  console.log('\n=== Ingestion Complete ===');
  console.log(`✅ Ingested: ${ingested}`);
  if (errors > 0) console.log(`❌ Errors:   ${errors}`);
  console.log('\nNote: If VOYAGE_API_KEY is not set, chunks are stored without embeddings.');
  console.log('Vector search will not return results until real embeddings are generated.');
}

main()
  .catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
