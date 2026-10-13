import { draw } from '../src/engine/draw';
import { emptyState } from '../src/engine/state';
import { buildPrompt } from '../src/prompts/build';
import { FIELDS } from '../src/data/fields';
for (const f of FIELDS) console.log(f.id.padEnd(16), f.options.length);
let s = emptyState();
for (let i = 0; i < 3; i++) {
  const r = draw(s, { seed: 'smoke' + i });
  console.log('ok', r.ok, r.notices, r.conflicts);
  s = r.state;
  for (const t of ['pixai', 'naturalEnglish', 'japanese'] as const) { const p = buildPrompt(s, t); console.log('---', t, p.title); console.log(p.positive); }
}
