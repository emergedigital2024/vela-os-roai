import * as M from './bundle.mjs';
const PRODUCTS = M.PRODUCTS || M.default || Object.values(M).find(v => Array.isArray(v));
const slug = process.argv[2];
const input = JSON.parse(process.argv[3] || '{}');
const entry = PRODUCTS.find(p => p.slug === slug);
if (!entry) { console.error('no such slug:', slug, '\navailable:', PRODUCTS.map(p=>p.slug).join(', ')); process.exit(1); }
const out = await entry.fulfill({ input, env: {}, ctx: {} });
console.log(JSON.stringify(out, null, 2));
