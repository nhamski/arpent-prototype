// Pull a USDA MARS report to a local JSON file. Reads the key from the
// AMS_API_KEY environment variable — the key is NEVER written to disk or
// committed. Output path should be gitignored (it's large, tens of MB).
//
// Usage: AMS_API_KEY=xxxx node tools/pull-mars.mjs <slug> <outfile>
//   e.g. AMS_API_KEY=xxxx node tools/pull-mars.mjs 1895 .cache/mars-1895.json
//
// Get a free key: https://mymarketnews.ams.usda.gov  (My Profile → API Key).

const [slug, out] = process.argv.slice(2);
const KEY = process.env.AMS_API_KEY;
if (!slug || !out) { console.error('usage: AMS_API_KEY=... node tools/pull-mars.mjs <slug> <outfile>'); process.exit(1); }
if (!KEY) { console.error('AMS_API_KEY not set — get a free key at mymarketnews.ams.usda.gov'); process.exit(1); }

const auth = `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`;
const res = await fetch(`https://marsapi.ams.usda.gov/services/v1.2/reports/${slug}`, { headers: { Authorization: auth } });
if (!res.ok) { console.error(`MARS ${slug} -> HTTP ${res.status}`); process.exit(1); }

const { writeFile, mkdir } = await import('node:fs/promises');
const path = await import('node:path');
await mkdir(path.dirname(out), { recursive: true });
const text = await res.text();
await writeFile(out, text, 'utf8');
console.log(`pulled report ${slug} -> ${out} (${(text.length / 1e6).toFixed(1)} MB)`);
