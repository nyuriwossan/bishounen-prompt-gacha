/* 辞書の全候補IDを版ごとに記録する（増築で既存IDを削除・改名していないことのテスト用）。
 *   npx vite-node scripts/expansion/dictionary-ids.ts
 * 増築前（2026.10.12）に生成した tests/fixtures/dictionary-ids-2026.10.12.json を、tests/expansion.test.ts が使う。 */
import fs from 'node:fs';
import { DATA_VERSION, FIELDS } from '../../src/data/fields';
const out = { dataVersion: DATA_VERSION, ids: Object.fromEntries(FIELDS.map((f) => [f.id, f.options.map((o) => o.id)])) };
fs.writeFileSync(`tests/fixtures/dictionary-ids-${DATA_VERSION}.json`, JSON.stringify(out) + '\n');
console.log(Object.values(out.ids).reduce((a, b) => a + b.length, 0));
