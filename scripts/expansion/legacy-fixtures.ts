/* 保存互換性の基準（ゴールデン）を作る。
 *   npx vite-node scripts/expansion/legacy-fixtures.ts
 * 増築「前」のコード（辞書 2026.10.12）で、さまざまな状態（任意モジュール・禁断・コスプレ・獣人・固定・手動採用・
 * 辞書・抽選設定のOFF・出力設定）を作り、各状態の 5形式の出力（正・ネガティブ・短縮）・日本語の設定行・タイトルと、
 * 共有URLのコード、全データJSON（お気に入り・履歴・派生つき）を tests/fixtures/ に保存する。
 * 増築後のテスト（tests/legacy-compat.test.ts）は、この旧データを読み込んで出力が1文字も変わらないことを確かめる。
 * 出力は容量を抑えるため SHA-256 で持ち、先頭の一部だけ全文も残す（失敗時の差分確認用）。ファイルは gzip で圧縮する。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { DATA_VERSION, DRAW_ORDER, fieldDef, FIELDS } from '../../src/data/fields';
import { adopt, draw } from '../../src/engine/draw';
import { setDrawPrefs, type DrawPrefs } from '../../src/engine/prefs';
import { seededRandom } from '../../src/engine/rng';
import { emptyState, isActive } from '../../src/engine/state';
import { buildPrompt } from '../../src/prompts/build';
import { encodeShare, exportBackup, recordHistory, saveFavorite, saveFavoritePair, setStorage, type KV } from '../../src/storage/storage';
import { titleOf } from '../../src/prompts/build';
import type { FieldId, ForgeState, Mode, OutputTarget } from '../../src/types';

class MemoryKV implements KV {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const TARGETS: OutputTarget[] = ['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'];
const PATTERNS = ['default', 'modulesOn', 'modulesOff', 'unlimited', 'cosplay', 'kemono', 'locks', 'manual', 'prefsOff'] as const;
const MODES: Mode[] = ['coherent', 'balanced', 'wild'];
const N = 180;
const FULL = 24;
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);

export interface LegacyCase {
  i: number; pattern: string; prefs: DrawPrefs | null; state: ForgeState; share: string;
  out: Record<string, { positive: string; negative: string; compact: string; japaneseLines: string; title: string }>;
}

function build(i: number, rng: () => number): { state: ForgeState; prefs: DrawPrefs | null; pattern: string } {
  const pattern = PATTERNS[i % PATTERNS.length];
  const mode = MODES[Math.floor(i / PATTERNS.length) % MODES.length];
  let prefs: DrawPrefs | null = null;
  if (pattern === 'prefsOff') {
    const offable: FieldId[] = ['hairColor', 'hairStyle', 'expression', 'outfit', 'build', 'eyeShape', 'eyeColor', 'world', 'aura', 'face'];
    const pickOff = offable.filter(() => rng() < 0.3);
    prefs = { version: 1, excluded: { hairColor: ['black', 'silver'] }, disabled: pickOff.length ? pickOff : ['hairStyle'] };
  }
  setDrawPrefs(prefs);
  let s = emptyState();
  s.settings.coherence = mode;
  const m = s.optionalModules;
  if (pattern === 'modulesOn') Object.assign(m, { kemonoEnabled: rng() < 0.4, facialHairEnabled: true, hairAccentEnabled: true, glassesEnabled: true, marksEnabled: true, propEnabled: true });
  if (pattern === 'modulesOff') Object.assign(m, { backgroundEnabled: rng() < 0.5, poseEnabled: false, nameEnabled: false });
  if (pattern === 'unlimited') Object.assign(m, { unlimitedEnabled: true, glassesEnabled: rng() < 0.5, propEnabled: rng() < 0.5, marksEnabled: rng() < 0.5 });
  if (pattern === 'cosplay') Object.assign(m, { cosplayEnabled: true, unlimitedEnabled: rng() < 0.4, kemonoEnabled: rng() < 0.3 });
  if (pattern === 'kemono') Object.assign(m, { kemonoEnabled: true, hairAccentEnabled: rng() < 0.5 });
  // 出力設定もばらす（旧データの設定がそのまま効くことを確かめる）
  s.settings.negative = rng() < 0.5;
  s.settings.quality = rng() < 0.7;
  s.settings.emphasis = rng() < 0.3;
  s.settings.compact = rng() < 0.2;
  s.settings.boyTag = rng() < 0.85 ? '1boy' : 'none';
  if (rng() < 0.25) s.settings.freeTags = ['looking at viewer', 'cinematic, depth of field', 'closed eyes', 'long hair', 'smile'][Math.floor(rng() * 5)];
  if (rng() < 0.15) s.settings.loraText = '<lora:test:0.7>';
  const r = draw(s, { seed: `legacy-${i}` });
  s = r.state;
  if (pattern === 'locks' || pattern === 'manual') {
    const cand = DRAW_ORDER.filter((f) => isActive(s, f) && fieldDef(f).randomizable !== false);
    for (let k = 0; k < 6; k++) {
      const f = cand[Math.floor(rng() * cand.length)];
      if (pattern === 'locks') s.fields[f].locked = true;
      else {
        const opts = fieldDef(f).options;
        const a = adopt(s, f, opts[Math.floor(rng() * opts.length)].id, rng() < 0.5, { seed: `legacy-adopt-${i}-${k}` });
        if (a.ok) s = a.state;
      }
    }
    const again = draw(s, { seed: `legacy-re-${i}` });
    if (again.ok) s = again.state;
  }
  return { state: s, prefs, pattern };
}

const rng = seededRandom('legacy-fixtures');
const cases: LegacyCase[] = [];
for (let i = 0; i < N; i++) {
  const { state, prefs, pattern } = build(i, rng);
  const out: LegacyCase['out'] = {};
  for (const t of TARGETS) {
    const p = buildPrompt(state, t);
    const rec = { positive: p.positive, negative: p.negative, compact: p.compact, japaneseLines: p.japaneseLines.map(([k, v]) => `${k}=${v}`).join('\n'), title: p.title };
    out[t] = i < FULL ? rec : { positive: sha(rec.positive), negative: sha(rec.negative), compact: sha(rec.compact), japaneseLines: sha(rec.japaneseLines), title: sha(rec.title) };
  }
  cases.push({ i, pattern, prefs, state, share: encodeShare(state), out });
}
setDrawPrefs(null);

// 全データJSON：お気に入り（元キャラ・派生）と履歴を含む
const kv = new MemoryKV();
setStorage(kv);
for (const c of cases.slice(0, 30)) if (!c.prefs) saveFavorite(c.state, `fav-${c.i}`, 'メモ', ['tag']);
saveFavoritePair({ state: cases[1].state, name: '元の人物' }, { state: cases[2].state, name: '派生', memo: '別衣装' });
for (let k = 30; k < 60; k++) recordHistory(cases[k - 1].state, cases[k].state, titleOf);
const backup = exportBackup(cases[0].state, { version: 1, excluded: { hairStyle: ['buzz_cut', 'afro'], outfit: ['bathrobe'] }, disabled: [] });
setStorage(null);

fs.mkdirSync('tests/fixtures', { recursive: true });
const file = `tests/fixtures/legacy-${DATA_VERSION}.json.gz`;
fs.writeFileSync(file, zlib.gzipSync(JSON.stringify({
  note: '増築前（辞書 ' + DATA_VERSION + '）に作った保存互換性の基準。scripts/expansion/legacy-fixtures.ts で生成。出力は先頭' + FULL + '件だけ全文、残りは SHA-256 の先頭32桁。',
  dataVersion: DATA_VERSION, fieldIds: FIELDS.map((f) => f.id), full: FULL, cases, backup
}), { level: 9 }));
console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${cases.length} cases)`);
