/* 保存互換性：増築前（辞書 2026.10.12）に作った状態・共有URL・全データJSONを、今のコードで読み込む。
 * - 旧データの出力（5形式の正・ネガティブ・短縮・日本語の設定行・タイトル）が1文字も変わらない
 * - 増築で足した項目は、旧データでは「なし」・任意スイッチはOFFのまま（開くだけで顔・髪・衣装が変わらない）
 * - 共有URLは値と固定を保って復元できる。全データJSONはお気に入り・派生・履歴を保って読み込める
 * 基準は scripts/expansion/legacy-fixtures.ts で増築前のコードから生成した tests/fixtures/legacy-2026.10.12.json.gz。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { fieldDef, FIELDS } from '../src/data/fields';
import { setDrawPrefs, type DrawPrefs } from '../src/engine/prefs';
import { DEFAULT_MODULES, isActive } from '../src/engine/state';
import { buildPrompt } from '../src/prompts/build';
import { decodeShare, importBackup, listFavorites, listHistory, normalizeState, setStorage, type KV } from '../src/storage/storage';
import type { FieldId, ForgeModules, ForgeState, OutputTarget } from '../src/types';

interface Rec { positive: string; negative: string; compact: string; japaneseLines: string; title: string }
interface Case { i: number; pattern: string; prefs: DrawPrefs | null; state: ForgeState; share: string; out: Record<string, Rec> }
const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync('tests/fixtures/legacy-2026.10.12.json.gz')).toString('utf8')) as {
  dataVersion: string; fieldIds: FieldId[]; full: number; cases: Case[]; backup: string;
};
const OLD_MODULES = ['kemonoEnabled', 'backgroundEnabled', 'poseEnabled', 'facialHairEnabled', 'hairAccentEnabled', 'nameEnabled', 'glassesEnabled', 'marksEnabled', 'propEnabled', 'unlimitedEnabled', 'cosplayEnabled'];
const NEW_FIELDS = FIELDS.map((f) => f.id).filter((f) => !fixture.fieldIds.includes(f));
const NEW_MODULES = (Object.keys(DEFAULT_MODULES) as Array<keyof ForgeModules>).filter((k) => !OLD_MODULES.includes(k));
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
const TARGETS: OutputTarget[] = ['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'];

class MemoryKV implements KV {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
afterEach(() => { setDrawPrefs(null); setStorage(null); });

describe('旧データ（増築前 2026.10.12）の互換性', () => {
  it(`${fixture.cases.length}件の旧状態で、5形式の出力が増築前と1文字も変わらない`, () => {
    const diffs: string[] = [];
    for (const c of fixture.cases) {
      setDrawPrefs(c.prefs);
      const st = normalizeState(JSON.parse(JSON.stringify(c.state)));
      for (const t of TARGETS) {
        const p = buildPrompt(st, t);
        const now: Rec = { positive: p.positive, negative: p.negative, compact: p.compact, japaneseLines: p.japaneseLines.map(([k, v]) => `${k}=${v}`).join('\n'), title: p.title };
        for (const k of Object.keys(now) as Array<keyof Rec>) {
          const want = c.out[t][k];
          const got = c.i < fixture.full ? now[k] : sha(now[k]);
          if (want !== got) diffs.push(`#${c.i}(${c.pattern}) ${t}.${k}${c.i < fixture.full ? `\n  旧: ${want}\n  新: ${got}` : ''}`);
        }
      }
    }
    expect(diffs.slice(0, 10)).toEqual([]);
  });

  it('増築で足した項目は旧データでは「なし」・スイッチOFFで、出力に関わらない', () => {
    for (const c of fixture.cases) {
      const st = normalizeState(JSON.parse(JSON.stringify(c.state)));
      for (const k of NEW_MODULES) expect(st.optionalModules[k], `${c.i}:${k}`).toBe(false);
      for (const f of NEW_FIELDS) {
        expect(isActive(st, f), `${c.i}:${f}`).toBe(false);
        const id = st.fields[f].id;
        expect(id === null || id === 'none', `${c.i}:${f}=${id}`).toBe(true);
        expect(st.fields[f].locked).toBe(false);
      }
    }
  });

  it('旧い共有URLは値・固定・スイッチを保って復元できる（新しいスイッチはOFF）', () => {
    for (const c of fixture.cases) {
      const r = decodeShare(c.share);
      expect(r.state, `#${c.i}`).not.toBeNull();
      expect(r.report.lostFields).toEqual([]);
      for (const f of fixture.fieldIds) {
        const want = c.state.fields[f];
        if (!want.id) continue;
        expect(r.state!.fields[f].id, `#${c.i} ${f}`).toBe(want.id);
        expect(r.state!.fields[f].locked, `#${c.i} ${f}`).toBe(want.locked);
      }
      for (const k of OLD_MODULES as Array<keyof ForgeModules>) expect(r.state!.optionalModules[k], `#${c.i} ${k}`).toBe(c.state.optionalModules[k]);
      for (const k of NEW_MODULES) expect(r.state!.optionalModules[k]).toBe(false);
    }
  });

  it('旧い全データJSON（お気に入り・派生・履歴・抽選設定）を読み込める', () => {
    setStorage(new MemoryKV());
    const r = importBackup(fixture.backup, { restoreHistory: true });
    expect(r.ok).toBe(true);
    expect(r.report.lostFields).toEqual([]);
    const favs = listFavorites();
    expect(favs.length).toBe(r.favoritesAdded);
    expect(favs.some((x) => x.rootId && favs.some((y) => y.id === x.rootId))).toBe(true);
    expect(listHistory().length).toBeGreaterThan(10);
    expect(r.drawPrefs?.excluded.hairStyle).toEqual(['buzz_cut', 'afro']);
    for (const x of [...favs.map((f) => f.state), ...listHistory().map((h) => h.state)]) {
      for (const k of NEW_MODULES) expect(x.optionalModules[k]).toBe(false);
      // 旧データの値がすべて今の辞書にある（候補IDを削除・改名していない）
      for (const f of fixture.fieldIds) if (x.fields[f].id) expect(fieldDef(f).options.some((o) => o.id === x.fields[f].id), `${f}:${x.fields[f].id}`).toBe(true);
    }
  });
});
