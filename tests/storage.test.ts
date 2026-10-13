import { beforeEach, describe, expect, it } from 'vitest';
import { DATA_VERSION } from '../src/data/fields';
import { draw } from '../src/engine/draw';
import { emptyState } from '../src/engine/state';
import {
  clearAll, decodeShare, deleteFavorite, duplicateFavorite, encodeShare, exportBackup, importBackup, KEYS, listFavorites, listHistory,
  loadCurrent, MAX_FAVORITES, MAX_HISTORY, missingFields, normalizeState, pushHistory, saveCurrent, saveFavorite, setStorage, updateFavorite, type KV
} from '../src/storage/storage';
import { copyText } from '../src/ui/clipboard';

class MemoryKV implements KV {
  data = new Map<string, string>();
  quota = Infinity;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) {
    const size = [...this.data.entries()].filter(([x]) => x !== k).reduce((n, [, x]) => n + x.length, 0) + v.length;
    if (size > this.quota) throw new Error('QuotaExceededError');
    this.data.set(k, v);
  }
  removeItem(k: string) { this.data.delete(k); }
}
let kv: MemoryKV;
beforeEach(() => { kv = new MemoryKV(); setStorage(kv); });
const sample = (seed = 's') => draw(emptyState(), { seed }).state;

describe('正規化・移行', () => {
  it('壊れたJSON・不正な型でも落ちずに初期状態を返す', () => {
    kv.setItem(KEYS.current, '{not json');
    expect(loadCurrent().state).toBeNull();
    const r = { lostFields: [], notes: [] as string[] };
    const s = normalizeState(42, r);
    expect(s.schemaVersion).toBe(1);
    expect(r.notes.length).toBe(1);
  });
  it('削除された候補IDは捨てて報告し、抽選で埋める対象にする', () => {
    const raw = JSON.parse(JSON.stringify(sample()));
    raw.fields.hairColor.id = 'rainbow_unicorn';
    raw.fields.archetype.locked = 'yes';
    raw.dataVersion = '2020.1';
    const r = { lostFields: [] as Array<{ field: string; id: string }>, notes: [] as string[] };
    const s = normalizeState(raw, r);
    expect(r.lostFields).toEqual([{ field: 'hairColor', id: 'rainbow_unicorn' }]);
    expect(s.fields.hairColor.id).toBeNull();
    expect(s.fields.archetype.locked).toBe(false);
    expect(missingFields(s)).toContain('hairColor');
    expect(r.notes.join()).toContain('辞書の版');
    expect(s.dataVersion).toBe(DATA_VERSION);
  });
  it('旧形式（schemaVersion 0・設定欠落）からも移行できる', () => {
    const s = normalizeState({ fields: { age: { id: 'a25_34', locked: true } } });
    expect(s.fields.age).toEqual({ id: 'a25_34', source: 'random', locked: true });
    expect(s.settings.coherence).toBe('coherent');
  });
  it('現在の状態の自動保存と復元', () => {
    const s = sample('cur');
    expect(saveCurrent(s)).toBe(true);
    expect(JSON.stringify(loadCurrent().state!.fields)).toBe(JSON.stringify(s.fields));
  });
});

describe('お気に入り・履歴', () => {
  it('保存・改名・メモ・複製・削除', () => {
    const r = saveFavorite(sample(), '銀髪の君', 'メモ', ['本命']);
    expect(r.ok).toBe(true);
    expect(updateFavorite(r.item!.id, { name: '改名した君' })).toBe(true);
    expect(listFavorites()[0].name).toBe('改名した君');
    const d = duplicateFavorite(r.item!.id)!;
    expect(d.name).toContain('複製');
    expect(listFavorites()).toHaveLength(2);
    deleteFavorite(r.item!.id);
    expect(listFavorites()).toHaveLength(1);
  });
  it(`最低100件（上限${MAX_FAVORITES}件）を保存でき、上限を超えると理由を返す`, () => {
    const s = sample();
    for (let i = 0; i < MAX_FAVORITES; i++) expect(saveFavorite(s, `n${i}`).ok).toBe(true);
    const r = saveFavorite(s, 'over');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(String(MAX_FAVORITES));
  });
  it(`履歴は直近${MAX_HISTORY}件まで`, () => {
    const s = sample();
    for (let i = 0; i < MAX_HISTORY + 10; i++) pushHistory(s, `t${i}`);
    expect(listHistory()).toHaveLength(MAX_HISTORY);
    expect(listHistory()[0].title).toBe(`t${MAX_HISTORY + 9}`);
  });
  it('容量不足でも例外にせず、保存失敗を返す', () => {
    kv.quota = 2000;
    const r = saveFavorite(sample(), 'big');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('保存領域');
    expect(() => pushHistory(sample(), 'x')).not.toThrow();
  });
  it('すべて削除', () => {
    saveFavorite(sample(), 'a'); pushHistory(sample(), 'b'); saveCurrent(sample());
    clearAll();
    expect(listFavorites()).toEqual([]);
    expect(listHistory()).toEqual([]);
    expect(loadCurrent().state).toBeNull();
  });
});

describe('JSONバックアップ・共有URL', () => {
  it('書き出し→全削除→読み込みで、固定・手動状態ごと復元できる', () => {
    const s = sample('bk');
    s.fields.hairColor = { id: 'silver', source: 'manual', locked: true };
    saveFavorite(s, '保存した君');
    pushHistory(s, '履歴');
    const json = exportBackup(s);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.dataVersion).toBe(DATA_VERSION);
    expect(parsed.sources).toContain('SOURCE-AUDIT');
    clearAll();
    const r = importBackup(json);
    expect(r.ok).toBe(true);
    expect(r.favoritesAdded).toBe(1);
    expect(listFavorites()[0].state.fields.hairColor).toEqual({ id: 'silver', source: 'manual', locked: true });
    expect(r.current!.fields.hairColor.locked).toBe(true);
    // 同じものを再度読み込んでも重複しない
    expect(importBackup(json).favoritesAdded).toBe(0);
  });
  it('不正なファイルを拒否する', () => {
    expect(importBackup('').ok).toBe(false);
    expect(importBackup('{').error).toContain('JSON');
    expect(importBackup('{"app":"other"}').error).toContain('美青年錬成ガチャ');
    expect(importBackup('x'.repeat(6 * 1024 * 1024)).error).toContain('大きすぎ');
    expect(importBackup(JSON.stringify({ app: 'bishounen-prompt-gacha', type: 'evil' })).ok).toBe(false);
  });
  it('共有URLは選択IDと固定だけを含み、自由入力を含めない', () => {
    const s = sample('share');
    s.settings.freeTags = 'secret memo';
    s.settings.loraText = 'private_lora';
    s.fields.outfit.locked = true;
    const code = encodeShare(s);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(1200);
    const back = decodeShare(code);
    expect(back.state!.fields.outfit).toEqual({ id: s.fields.outfit.id, source: 'manual', locked: true });
    expect(back.state!.settings.freeTags).toBe('');
    expect(back.state!.lastSeed).toBe('share');
    expect(decodeShare('!!!').state).toBeNull();
  });
});

describe('コピーのフォールバック（iOS Safari など）', () => {
  const fakeDoc = (execOk: boolean) => {
    const body = { appendChild: () => undefined };
    return {
      body,
      createElement: () => ({ value: '', style: {}, setAttribute: () => undefined, select: () => undefined, setSelectionRange: () => undefined, remove: () => undefined }),
      execCommand: () => execOk
    } as unknown as Document;
  };
  it('Clipboard API が使えればそれを使う', async () => {
    let got = '';
    const nav = { clipboard: { writeText: async (t: string) => { got = t; } } } as unknown as Navigator;
    expect(await copyText('abc', { navigator: nav, document: fakeDoc(false) })).toBe('clipboard');
    expect(got).toBe('abc');
  });
  it('権限エラーなら execCommand へ', async () => {
    const nav = { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } } as unknown as Navigator;
    expect(await copyText('abc', { navigator: nav, document: fakeDoc(true) })).toBe('execCommand');
  });
  it('どちらも使えなければ手動コピー欄', async () => {
    expect(await copyText('abc', { navigator: {} as Navigator, document: fakeDoc(false) })).toBe('manual');
  });
});
