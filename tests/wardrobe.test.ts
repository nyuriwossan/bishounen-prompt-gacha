/* 人物の一括固定・衣装3案・元キャラ／派生の保存・直近10件の履歴 の回帰テスト（2026-10-22） */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { allViolations } from '../src/advisor/hard';
import { fieldDef, optionOf } from '../src/data/fields';
import { draw, valuesOf } from '../src/engine/draw';
import { lockPerson, PERSON_FIELDS, personLockStatus } from '../src/engine/person';
import { emptyPrefs, setDrawPrefs } from '../src/engine/prefs';
import { cloneState, emptyState, isActive } from '../src/engine/state';
import { applyCard, canAdoptCard, WARDROBE_FIELDS, wardrobePreview } from '../src/engine/wardrobe';
import { matchAny } from '../src/engine/match';
import { outfitColorUse, shotLevelOf, titleOf } from '../src/prompts/build';
import {
  backupContents, decodeShare, deleteFavorite, derivativesOf, encodeShare, exportBackup, importBackup, KEYS, listFavorites, listHistory, listLegacyHistory, MAX_FAVORITES,
  MAX_HISTORY, migrateHistory, recordHistory, sameResult, saveFavorite, saveFavoritePair, setStorage, unlinkFavorite, updateFavorite, type KV
} from '../src/storage/storage';
import type { FieldId, ForgeState, Mode } from '../src/types';

class MemoryKV implements KV {
  data = new Map<string, string>();
  fail = false;
  writes = 0;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.writes++; if (this.fail) throw new Error('QuotaExceededError'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
let kv: MemoryKV;
beforeEach(() => { kv = new MemoryKV(); setStorage(kv); setDrawPrefs(null); });
afterEach(() => { setDrawPrefs(null); setStorage(null); });

const MODES: Mode[] = ['coherent', 'balanced', 'wild'];
const fresh = (seed: string, mode: Mode = 'coherent', mods: Partial<ForgeState['optionalModules']> = {}) => {
  const s = emptyState(); s.settings.coherence = mode; Object.assign(s.optionalModules, mods);
  const r = draw(s, { seed });
  expect(r.ok).toBe(true);
  return r.state;
};
const NON_WARDROBE = (Object.keys(emptyState().fields) as FieldId[]).filter((f) => !WARDROBE_FIELDS.includes(f));
const visible = (s: ForgeState) => {
  const use = outfitColorUse(optionOf('outfit', s.fields.outfit.id), shotLevelOf(s));
  return [s.fields.outfit.id, use.main ? s.fields.mainColor.id : '-', use.accent ? s.fields.accentColor.id : '-'].join('|');
};

describe('人物の一括固定', () => {
  it('値を変えず、有効な人物の項目に鍵を掛ける。事前の鍵は保ち、表情・衣装・ポーズ・背景などには掛けない', () => {
    let s = fresh('person');
    s = cloneState(s); s.fields.scene.locked = true; s.fields.hairStyle.locked = true;
    const before = JSON.stringify(Object.fromEntries(Object.entries(s.fields).map(([f, x]) => [f, x.id])));
    const r = lockPerson(s);
    expect(JSON.stringify(Object.fromEntries(Object.entries(r.state.fields).map(([f, x]) => [f, x.id])))).toBe(before);
    expect(r.added).not.toContain('hairStyle');
    for (const f of PERSON_FIELDS) if (isActive(s, f)) expect(r.state.fields[f].locked, f).toBe(true);
    for (const f of ['expression', 'outfit', 'mainColor', 'accentColor', 'pose', 'shot', 'light', 'world', 'occupation'] as FieldId[]) expect(r.state.fields[f].locked, f).toBe(false);
    expect(r.state.fields.scene.locked).toBe(true);
    expect(r.state.optionalModules).toEqual(s.optionalModules);
  });
  it('OFFの眼鏡・獣人・辞書・抽選設定でOFFの項目には鍵を掛けず、スイッチもONにしない', () => {
    setDrawPrefs({ ...emptyPrefs(), disabled: ['skin'] });
    const s = fresh('off-person');
    const r = lockPerson(s);
    for (const f of ['glasses', 'marks', 'facialHair', 'kemonoSpecies', 'kemonoLevel', 'skin'] as FieldId[]) expect(r.state.fields[f].locked, f).toBe(false);
    expect(r.state.optionalModules.glassesEnabled).toBe(false);
    expect(r.state.optionalModules.kemonoEnabled).toBe(false);
  });
  it('すべて固定済みなら何もしない（状態はそのまま）。状況は各項目の鍵から求める', () => {
    const s = lockPerson(fresh('twice')).state;
    const again = lockPerson(s);
    expect(again.added).toEqual([]);
    expect(again.state).toBe(s);
    const st = personLockStatus(s);
    expect(st.locked.length).toBe(st.targets.length);
    // 1項目の鍵を外すと、状況にもそのまま反映される（別の固定情報を持たない）
    const t = cloneState(s); t.fields.hairStyle.locked = false;
    expect(personLockStatus(t).locked).not.toContain('hairStyle');
  });
  it('固定した人物は、全体の錬成でも変わらない', () => {
    const s = lockPerson(fresh('keep-person')).state;
    for (let i = 0; i < 10; i++) {
      const r = draw(s, { seed: `kp-${i}` });
      for (const f of personLockStatus(s).targets) expect(r.state.fields[f].id, f).toBe(s.fields[f].id);
    }
  });
});

describe('衣装3案', () => {
  it('作るだけでは今の結果・錬成番号・保存を変えず、次の通常の抽選（固定シード）も変わらない', () => {
    const s = fresh('pv');
    s.settings.seed = 'fixed-next';
    const json = JSON.stringify(s);
    const nextWithout = draw(s, {}).state.fields;
    kv.writes = 0;
    for (let i = 0; i < 3; i++) wardrobePreview(s, { seed: `p${i}`, recent: { outfit: ['x'] } });
    expect(JSON.stringify(s)).toBe(json);
    expect(kv.writes).toBe(0);
    expect(draw(s, {}).state.fields).toEqual(nextWithout);
  });
  it('3モードで、衣装と色以外は変えず、hard 制約を守り、今の結果と同じ案・重複した案を出さない', () => {
    for (const mode of MODES) for (let i = 0; i < 12; i++) {
      const mods = [{}, { unlimitedEnabled: true }, { cosplayEnabled: true }, { propEnabled: true, glassesEnabled: true }][i % 4];
      const s = fresh(`pm-${mode}-${i}`, mode, mods);
      const p = wardrobePreview(s, { seed: `pv-${i}` });
      const keys = new Set([visible(s)]);
      for (const c of p.cards) {
        for (const f of NON_WARDROBE) expect(c.state.fields[f], `${mode}/${i}/${f}`).toEqual(s.fields[f]);
        expect(c.state.optionalModules).toEqual(s.optionalModules);
        expect(allViolations(valuesOf(c.state))).toEqual([]);
        const k = visible(c.state);
        expect(keys.has(k), `${mode}/${i} dup ${k}`).toBe(false);
        keys.add(k);
        if (s.optionalModules.cosplayEnabled && !c.colorOnly) expect(optionOf('outfit', c.state.fields.outfit.id)?.cat).toBe('cosplay');
      }
      // 衣装が異なる案を優先する（色違いは衣装違いの後ろ）
      const firstColor = p.cards.findIndex((c) => c.colorOnly);
      if (firstColor >= 0) expect(p.cards.slice(firstColor).every((c) => c.colorOnly)).toBe(true);
      expect(p.cards.length === 3 || p.reason.length > 0).toBe(true);
    }
  });
  it('衣装を前提にするポーズ（ネクタイを緩める）を保ったまま、ネクタイのある衣装だけを出す', () => {
    let s = fresh('tie');
    const tie = fieldDef('outfit').options.find((o) => matchAny(o, ['#tie']) && o.cat !== 'cosplay')!;
    s = cloneState(s);
    s.fields.outfit = { id: tie.id, source: 'manual', locked: false };
    s.fields.pose = { id: 'loosen_tie', source: 'manual', locked: true };
    s.fields.shot = { id: 'upper_body', source: 'manual', locked: true };
    expect(allViolations(valuesOf(s))).toEqual([]);
    const p = wardrobePreview(s, { seed: 'tie' });
    expect(p.cards.length).toBeGreaterThan(0);
    for (const c of p.cards) {
      expect(c.state.fields.pose.id).toBe('loosen_tie');
      expect(matchAny(optionOf('outfit', c.state.fields.outfit.id), ['#tie'])).toBe(true);
    }
  });
  it('辞書・抽選設定で除外した衣装・色は出ない', () => {
    const s = fresh('excl');
    const outfits = fieldDef('outfit').options.filter((o) => o.cat !== 'cosplay').map((o) => o.id);
    const keep = new Set(outfits.slice(0, 40));
    setDrawPrefs({ ...emptyPrefs(), excluded: { outfit: outfits.filter((x) => !keep.has(x)), mainColor: fieldDef('mainColor').options.slice(0, 60).map((o) => o.id) } });
    for (let i = 0; i < 10; i++) for (const c of wardrobePreview(s, { seed: `ex-${i}` }).cards) {
      if (!c.colorOnly) expect(keep.has(c.state.fields.outfit.id!)).toBe(true);
      if (c.state.fields.mainColor.id !== s.fields.mainColor.id) expect(fieldDef('mainColor').options.slice(0, 60).map((o) => o.id)).not.toContain(c.state.fields.mainColor.id);
    }
  });
  it('固定中の衣装・色は保ち、衣装を固定していれば色違い（明記）だけを出す', () => {
    const s = cloneState(fresh('locked'));
    s.fields.outfit.locked = true;
    const p = wardrobePreview(s, { seed: 'l' });
    for (const c of p.cards) { expect(c.colorOnly).toBe(true); expect(c.state.fields.outfit).toEqual(s.fields.outfit); }
    s.fields.mainColor.locked = true; s.fields.accentColor.locked = true;
    const none = wardrobePreview(s, { seed: 'l2' });
    expect(none.cards).toEqual([]);
    expect(none.reason).toContain('今の結果はそのまま');
  });
  it('候補が少なければその数だけ出し、同じ案で水増ししない（理由を添える）', () => {
    let s = fresh('few');
    s = cloneState(s); s.fields.mainColor.locked = true; s.fields.accentColor.locked = true;
    const outfits = fieldDef('outfit').options.filter((o) => o.cat !== 'cosplay').map((o) => o.id);
    const other = outfits.find((x) => x !== s.fields.outfit.id && !optionOf('outfit', x)!.culture)!;
    setDrawPrefs({ ...emptyPrefs(), excluded: { outfit: outfits.filter((x) => x !== other && x !== s.fields.outfit.id) } });
    const p = wardrobePreview(s, { seed: 'f' });
    expect(p.cards.length).toBe(1);
    expect(p.cards[0].state.fields.outfit.id).toBe(other);
    expect(p.reason).toMatch(/案でした|見つかりませんでした/);
    expect(p.prefsFields).toContain('outfit');
  });
  it('衣装を辞書・抽選設定でOFFにしていれば案を作らず、その旨と導線を返す（ONにはしない）', () => {
    const s = fresh('off');
    setDrawPrefs({ ...emptyPrefs(), disabled: ['outfit'] });
    const p = wardrobePreview(s, { seed: 'o' });
    expect(p.off).toBe(true);
    expect(p.cards).toEqual([]);
    expect(p.prefsFields).toEqual(['outfit']);
  });
  it('採用は衣装と色だけを反映し、錬成番号を1つ進める。作成後に結果や設定が変わった古い案は採用できない', () => {
    const s = fresh('adopt');
    const p = wardrobePreview(s, { seed: 'a' });
    const card = p.cards[0];
    expect(canAdoptCard(s, p, card).ok).toBe(true);
    const r = applyCard(s, card);
    for (const f of NON_WARDROBE) expect(r.state.fields[f]).toEqual(s.fields[f]);
    expect(r.state.fields.outfit.id).toBe(card.state.fields.outfit.id);
    expect(r.state.drawCount).toBe(s.drawCount + 1);
    expect(r.changed).toContain('outfit');
    // 結果が変わった後
    const moved = draw(s, { targets: ['hairColor'], seed: 'mv' }).state;
    expect(canAdoptCard(moved, p, card).ok).toBe(false);
    // 鍵だけ変わった後・辞書・抽選設定が変わった後も古い案として扱う
    const locked = cloneState(s); locked.fields.age.locked = !locked.fields.age.locked;
    expect(canAdoptCard(locked, p, card).ok).toBe(false);
    setDrawPrefs({ ...emptyPrefs(), excluded: { outfit: [card.state.fields.outfit.id!] } });
    expect(canAdoptCard(s, p, card).ok).toBe(false);
  });
});

describe('直近10件の履歴', () => {
  const t = (s: ForgeState) => titleOf(s);
  it('11件以上の異なる結果で最新10件が残り、お気に入りは減らない', () => {
    saveFavorite(fresh('fav'), 'お気に入り');
    let prev: ForgeState | null = null;
    const results: ForgeState[] = [];
    for (let i = 0; i < 14; i++) { const s = fresh(`h-${i}`); recordHistory(prev, s, t); results.push(s); prev = s; }
    const h = listHistory();
    expect(h).toHaveLength(MAX_HISTORY);
    expect(sameResult(h[0].state, results[13])).toBe(true);
    expect(sameResult(h[9].state, results[4])).toBe(true);
    expect(listFavorites()).toHaveLength(1);
  });
  it('置き換える前の結果が最新の履歴と違えば退避してから記録する（1操作で最大2件）。同じ結果は増やさない', () => {
    const a = fresh('a'), b = fresh('b'), c = fresh('c');
    recordHistory(null, a, t);
    expect(listHistory()).toHaveLength(1);
    // 手で編集した結果（未記録）を、次の抽選で失わない
    const edited = cloneState(a); edited.fields.hairColor.id = a.fields.hairColor.id === 'black' ? 'silver' : 'black';
    recordHistory(edited, b, t);
    const h = listHistory();
    expect(h).toHaveLength(3);
    expect(sameResult(h[0].state, b)).toBe(true);
    expect(sameResult(h[1].state, edited)).toBe(true);
    // 直前と同じ結果は追加しない
    recordHistory(b, b, t);
    expect(listHistory()).toHaveLength(3);
    // 過去と同じ結果でも、直前と違えば記録できる
    recordHistory(b, c, t); recordHistory(c, a, t);
    expect(listHistory()).toHaveLength(5);
    expect(sameResult(listHistory()[0].state, a)).toBe(true);
    // 鍵だけ違う結果は同じ結果として扱う（鍵の変更だけでは増えない）
    const lockedA = cloneState(a); lockedA.fields.age.locked = true;
    recordHistory(lockedA, lockedA, t);
    expect(listHistory()).toHaveLength(5);
  });
  it('記録した結果は複製で持つ（後の編集で過去の履歴が変わらない）。保存失敗は false', () => {
    const a = fresh('copy');
    recordHistory(null, a, t);
    a.fields.hairColor.id = 'zzz';
    expect(listHistory()[0].state.fields.hairColor.id).not.toBe('zzz');
    kv.fail = true;
    expect(recordHistory(null, fresh('x'), t)).toBe(false);
  });
  it('10件を超える旧データは黙って捨てず「以前の履歴」へ移す（何度実行しても同じ）。10件以下なら何もしない', () => {
    const old = Array.from({ length: 25 }, (_, i) => ({ id: `h${i}`, at: new Date(Date.UTC(2026, 9, 1, 0, 25 - i)).toISOString(), title: `t${i}`, state: fresh(`old-${i % 3}`) }));
    kv.setItem(KEYS.history, JSON.stringify(old));
    expect(migrateHistory()).toBe(15);
    expect(listHistory().map((h) => h.id)).toEqual(old.slice(0, 10).map((h) => h.id));
    expect(listLegacyHistory().map((h) => h.id)).toEqual(old.slice(10).map((h) => h.id));
    expect(migrateHistory()).toBe(0);
    expect(listLegacyHistory()).toHaveLength(15);
    kv.data.clear();
    kv.setItem(KEYS.history, JSON.stringify(old.slice(0, 7)));
    expect(migrateHistory()).toBe(0);
    expect(kv.getItem(KEYS.historyLegacy)).toBeNull();
  });
  it('以前の履歴への書き込みに失敗したら、通常の履歴を縮めない（どちらも失わない）', () => {
    const old = Array.from({ length: 12 }, (_, i) => ({ id: `h${i}`, at: new Date(Date.UTC(2026, 9, 1, 0, 20 - i)).toISOString(), title: `t${i}`, state: fresh('o') }));
    kv.setItem(KEYS.history, JSON.stringify(old));
    kv.fail = true;
    expect(migrateHistory()).toBe(0);
    kv.fail = false;
    expect(JSON.parse(kv.getItem(KEYS.history)!)).toHaveLength(12);
  });
});

describe('元キャラと派生', () => {
  it('派生は元キャラ（ルート）に紐づき、派生からの派生もルートへ。単独で復元できる設定を持ち、元の編集は反映されない', () => {
    const root = saveFavorite(fresh('root'), 'カジミール').item!;
    const d1 = saveFavorite(fresh('d1'), 'カジミール／休日の服', '', [], { rootId: root.id }).item!;
    const d2 = saveFavorite(fresh('d2'), 'カジミール／正装', '', [], { rootId: d1.id }).item!;
    expect(d1.rootId).toBe(root.id);
    expect(d2.rootId).toBe(root.id);
    expect(derivativesOf(root.id).map((x) => x.id).sort()).toEqual([d1.id, d2.id].sort());
    updateFavorite(root.id, { state: fresh('changed-root') });
    const after = listFavorites().find((x) => x.id === d1.id)!;
    expect(after.state.fields).toEqual(d1.state.fields);
  });
  it('元キャラを消しても派生は消えず、独立した保存として残る。紐づけは外せる', () => {
    const root = saveFavorite(fresh('r'), '元').item!;
    const d = saveFavorite(fresh('d'), '派生', '', [], { rootId: root.id }).item!;
    const d2 = saveFavorite(fresh('d2'), '派生2', '', [], { rootId: root.id }).item!;
    expect(unlinkFavorite(d2.id)).toBe(true);
    expect(listFavorites().find((x) => x.id === d2.id)!.rootId).toBeUndefined();
    deleteFavorite(root.id);
    const left = listFavorites();
    expect(left.map((x) => x.id).sort()).toEqual([d.id, d2.id].sort());
    expect(left.every((x) => !x.rootId)).toBe(true);
  });
  it('元と派生の同時保存は、空きが2件ないときも保存に失敗したときも、どちらも保存しない', () => {
    const items = Array.from({ length: MAX_FAVORITES - 1 }, (_, i) => ({ id: `f${i}`, name: `n${i}`, memo: '', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01', state: emptyState() }));
    kv.setItem(KEYS.favorites, JSON.stringify(items));
    const r = saveFavoritePair({ state: fresh('b'), name: '元' }, { state: fresh('d'), name: '派生' });
    expect(r.ok).toBe(false);
    expect(listFavorites()).toHaveLength(MAX_FAVORITES - 1);
    kv.data.clear();
    kv.fail = true;
    expect(saveFavoritePair({ state: fresh('b'), name: '元' }, { state: fresh('d'), name: '派生' }).ok).toBe(false);
    kv.fail = false;
    expect(listFavorites()).toHaveLength(0);
    const ok = saveFavoritePair({ state: fresh('b'), name: '元' }, { state: fresh('d'), name: '派生' });
    expect(ok.ok).toBe(true);
    expect(ok.derived!.rootId).toBe(ok.base!.id);
    expect(sameResult(listFavorites().find((x) => x.id === ok.base!.id)!.state, fresh('b'))).toBe(true);
  });
  it('元キャラが見つからない派生（未知のID）は、独立した保存として扱う', () => {
    kv.setItem(KEYS.favorites, JSON.stringify([{ id: 'x', name: '迷子の派生', state: fresh('m'), rootId: 'nope', updatedAt: '2026-10-01' }]));
    expect(listFavorites()[0].rootId).toBeUndefined();
  });
  it('共有URLは1件の結果だけ（派生の関係は含めない）', () => {
    const root = saveFavorite(fresh('sr'), '元').item!;
    const d = saveFavorite(fresh('sd'), '派生', '', [], { rootId: root.id }).item!;
    const code = encodeShare(d.state);
    expect(atob(code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4))).not.toContain(root.id);
    expect(sameResult(decodeShare(code).state!, d.state)).toBe(true);
  });
});

describe('JSON', () => {
  it('全データJSONに元キャラ／派生の関係と履歴を含め、読み戻すと関係が保たれる', () => {
    const root = saveFavorite(fresh('jr'), '元').item!;
    saveFavorite(fresh('jd'), '派生', '', [], { rootId: root.id });
    recordHistory(null, fresh('jh'), titleOf);
    const text = exportBackup(null);
    const parsed = JSON.parse(text);
    expect(parsed.favorites.find((f: { name: string }) => f.name === '派生').rootId).toBe(root.id);
    expect(parsed.history).toHaveLength(1);
    expect(backupContents(text).history).toBe(1);
    kv.data.clear();
    const r = importBackup(text);
    expect(r.favoritesAdded).toBe(2);
    const fav = listFavorites();
    expect(fav.find((f) => f.name === '派生')!.rootId).toBe(fav.find((f) => f.name === '元')!.id);
    // 履歴は選んだときだけ
    expect(listHistory()).toHaveLength(0);
  });
  it('ID衝突（内容が違う）なら新しいIDを振り、同じファイル内の派生の参照も付け替える。同じ内容なら重複させない', () => {
    const root = saveFavorite(fresh('cr'), '元').item!;
    saveFavorite(fresh('cd'), '派生', '', [], { rootId: root.id });
    const text = exportBackup(null);
    // 同じ内容を読み込んでも増えない
    expect(importBackup(text).favoritesAdded).toBe(0);
    // 別の端末で同じIDが別の人物に使われている場合
    kv.data.clear();
    const other = { id: root.id, name: '別人', memo: '', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01', state: fresh('other') };
    kv.setItem(KEYS.favorites, JSON.stringify([other]));
    const r = importBackup(text);
    expect(r.favoritesAdded).toBe(2);
    const fav = listFavorites();
    const newRoot = fav.find((f) => f.name === '元')!;
    expect(newRoot.id).not.toBe(root.id);
    expect(fav.find((f) => f.name === '派生')!.rootId).toBe(newRoot.id);
    expect(fav.find((f) => f.name === '別人')!.rootId).toBeUndefined();
  });
  it('親のない派生のファイル・古いJSON（関係・履歴なし）も読み込める', () => {
    const orphan = JSON.stringify({ app: 'bishounen-prompt-gacha', type: 'bishounen-backup', schemaVersion: 1, dataVersion: 'x', exportedAt: '', current: null,
      favorites: [{ id: 'k', name: '派生だけ', state: fresh('o'), rootId: 'missing-parent' }], history: [] });
    expect(importBackup(orphan).favoritesAdded).toBe(1);
    expect(listFavorites()[0].rootId).toBeUndefined();
    const old = JSON.parse(exportBackup(null));
    delete old.historyLegacy; delete old.drawPrefs;
    expect(importBackup(JSON.stringify(old)).ok).toBe(true);
  });
  it('「履歴も復元する」：日時順に統合し、同じIDは1件、通常は最新10件、はみ出しは以前の履歴へ。読込で新しい記録を作らない', () => {
    const mk = (i: number) => ({ id: `in${i}`, at: new Date(Date.UTC(2026, 9, 2, 0, i)).toISOString(), title: `in${i}`, state: fresh(`in${i % 4}`) });
    const incoming = Array.from({ length: 8 }, (_, i) => mk(i));
    recordHistory(null, fresh('mine-1'), titleOf); recordHistory(fresh('mine-1'), fresh('mine-2'), titleOf);
    const mine = listHistory();
    const file = JSON.stringify({ app: 'bishounen-prompt-gacha', type: 'bishounen-backup', schemaVersion: 1, dataVersion: 'x', exportedAt: '', current: null, favorites: [],
      history: [...incoming, mine[0]] });
    const r = importBackup(file, { restoreHistory: true });
    expect(r.historyAdded).toBe(8);
    const h = listHistory();
    expect(h).toHaveLength(MAX_HISTORY);
    expect(new Set(h.map((x) => x.id)).size).toBe(h.length);
    // 新しい順（自分の2件は今日の日時なので先頭）
    expect(h.slice(0, 2).map((x) => x.id)).toEqual(mine.map((x) => x.id));
    expect(h.slice(2).map((x) => x.id)).toEqual(incoming.slice().reverse().map((x) => x.id));
    for (const x of h.slice(2)) expect(x.at).toBe(incoming.find((y) => y.id === x.id)!.at);
    // もう一度読んでも重複しない
    importBackup(file, { restoreHistory: true });
    expect(listHistory().map((x) => x.id)).toEqual(h.map((x) => x.id));
    // はみ出しは以前の履歴へ
    const more = JSON.stringify({ app: 'bishounen-prompt-gacha', type: 'bishounen-backup', schemaVersion: 1, dataVersion: 'x', exportedAt: '', current: null, favorites: [],
      history: Array.from({ length: 5 }, (_, i) => ({ ...mk(100 + i), at: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString() })) });
    const r2 = importBackup(more, { restoreHistory: true });
    expect(r2.historyToLegacy).toBe(5);
    expect(listLegacyHistory()).toHaveLength(5);
    expect(listHistory()).toHaveLength(MAX_HISTORY);
  });
});
