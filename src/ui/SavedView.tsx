import { useRef, useState } from 'preact/hooks';
import { draw, GROUPS } from '../engine/draw';
import { cloneState } from '../engine/state';
import { buildPrompt, titleOf, toMarkdown } from '../prompts/build';
import {
  clearAll, clearHistory, deleteFavorite, duplicateFavorite, encodeShare, exportBackup, exportSingle, importBackup, listFavorites, listHistory,
  MAX_FAVORITES, saveFavorite, updateFavorite, type SavedForge
} from '../storage/storage';
import type { ForgeState } from '../types';
import { download } from './clipboard';
import type { AppActions } from './types';

const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } };

export function SavedView({ forge, actions }: { forge: ForgeState; actions: AppActions }) {
  const [, refresh] = useState(0);
  const [name, setName] = useState(titleOf(forge));
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'favorites' | 'history'>('favorites');
  const [confirmAll, setConfirmAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const favorites = listFavorites();
  const history = listHistory();
  const q = query.trim().toLowerCase();
  const shown = favorites.filter((f) => !q || [f.name, f.memo, f.tags.join(' '), titleOf(f.state)].join(' ').toLowerCase().includes(q));

  const save = () => {
    const r = saveFavorite(forge, name, memo, tags.split(/[,、\s]+/).filter(Boolean));
    if (r.ok) { actions.toast(`「${r.item!.name}」を保存しました。`); setMemo(''); setTags(''); refresh((x) => x + 1); }
    else actions.toast(r.reason ?? '保存できませんでした。');
  };
  const rename = (f: SavedForge) => {
    const next = prompt('新しい名前', f.name);
    if (next === null) return;
    updateFavorite(f.id, { name: next }); refresh((x) => x + 1);
  };
  const editMemo = (f: SavedForge) => {
    const next = prompt('メモ', f.memo);
    if (next === null) return;
    updateFavorite(f.id, { memo: next }); refresh((x) => x + 1);
  };
  const remove = (f: SavedForge) => {
    if (!confirm(`「${f.name}」を削除しますか？`)) return;
    deleteFavorite(f.id); refresh((x) => x + 1); actions.toast('削除しました。');
  };
  const outfitVariant = (f: SavedForge) => {
    const base = cloneState(f.state);
    const r = draw(base, { targets: GROUPS.outfit });
    if (!r.ok) { actions.toast('別衣装の候補が見つかりませんでした。'); return; }
    const s = saveFavorite(r.state, `${f.name}（別衣装）`.slice(0, 80), f.memo, f.tags);
    if (s.ok) { actions.toast('別衣装バージョンを保存しました。'); refresh((x) => x + 1); } else actions.toast(s.reason ?? '保存できませんでした。');
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const r = importBackup(text);
    if (!r.ok) { actions.toast(r.error ?? '読み込めませんでした。'); return; }
    const lost = r.report.lostFields.length ? ` 辞書に無い候補 ${r.report.lostFields.length} 件は除外しました。` : '';
    actions.toast(`お気に入り ${r.favoritesAdded} 件・履歴 ${r.historyAdded} 件を読み込みました。${lost}${r.report.notes.join(' ')}`, 6000);
    refresh((x) => x + 1);
  };
  const share = () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(forge)}`;
    actions.copy(url, '共有URLをコピーしました（自由タグ・メモは含みません）。');
  };

  return (
    <section class="screen" aria-labelledby="saved-title">
      <h2 class="screen-title" id="saved-title">保存した美青年</h2>
      <p class="lead">保存先はこの端末のブラウザ内です。サイトデータを消すと失われるため、大切な美青年はJSONで書き出しておいてください。</p>

      <div class="panel">
        <label class="field"><span>名前</span><input class="input" value={name} maxLength={80} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span>メモ（任意）</span><input class="input" value={memo} maxLength={2000} onInput={(e) => setMemo((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span>タグ（任意・空白区切り）</span><input class="input" value={tags} onInput={(e) => setTags((e.target as HTMLInputElement).value)} placeholder="例：本命 和風" /></label>
        <div class="btns">
          <button class="btn primary" type="button" onClick={save}>この美青年を保存</button>
          <button class="btn" type="button" onClick={() => setName(titleOf(forge))}>名前を今の結果に戻す</button>
        </div>
        <p class="count-note">お気に入り {favorites.length} / {MAX_FAVORITES} 件</p>
      </div>

      <div class="seg" role="group" aria-label="一覧の切り替え">
        <button type="button" aria-pressed={view === 'favorites'} onClick={() => setView('favorites')}>お気に入り（{favorites.length}）</button>
        <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>履歴（{history.length}）</button>
      </div>

      {view === 'favorites' && (
        <>
          <label class="field"><span class="sr-only">お気に入りを検索</span><input class="input" type="search" placeholder="名前・メモ・タグで検索" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} /></label>
          {shown.length === 0 ? <p class="empty">{favorites.length ? '検索に合う美青年がいません。' : 'まだ保存した美青年はいません。気に入った結果を上のボタンで保存できます。'}</p> : (
            <ul class="list">
              {shown.map((f) => (
                <li class="item" key={f.id}>
                  <h3>{f.name}</h3>
                  <p class="meta">{titleOf(f.state)}｜{fmt(f.updatedAt)}{f.tags.length ? `｜#${f.tags.join(' #')}` : ''}</p>
                  {f.memo && <p class="count-note" style={{ marginTop: 0 }}>{f.memo}</p>}
                  <div class="btns">
                    <button class="btn small primary" type="button" onClick={() => actions.load(f.state, `「${f.name}」を呼び出しました。`)}>呼び出す</button>
                    <button class="btn small" type="button" onClick={() => actions.copy(buildPrompt(f.state).positive, 'プロンプトをコピーしました。')}>コピー</button>
                    <button class="btn small" type="button" onClick={() => rename(f)}>改名</button>
                    <button class="btn small" type="button" onClick={() => editMemo(f)}>メモ</button>
                    <button class="btn small" type="button" onClick={() => { duplicateFavorite(f.id); refresh((x) => x + 1); }}>複製</button>
                    <button class="btn small" type="button" onClick={() => outfitVariant(f)}>別衣装版</button>
                    <button class="btn small" type="button" onClick={() => download(exportSingle(f.state, f.name), `${f.name}.json`, 'application/json')}>JSON</button>
                    <button class="btn small danger" type="button" onClick={() => remove(f)}>削除</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {view === 'history' && (
        <>
          {history.length === 0 ? <p class="empty">まだ履歴はありません。錬成するたびに直近{50}件まで残ります。</p> : (
            <ul class="list">
              {history.map((h) => (
                <li class="item" key={h.id}>
                  <h3>{h.title}</h3>
                  <p class="meta">{fmt(h.at)}｜seed {h.state.lastSeed}</p>
                  <div class="btns">
                    <button class="btn small primary" type="button" onClick={() => actions.load(h.state, '履歴から呼び出しました。')}>呼び出す</button>
                    <button class="btn small" type="button" onClick={() => { const r = saveFavorite(h.state, h.title); actions.toast(r.ok ? 'お気に入りに保存しました。' : r.reason ?? '保存できませんでした。'); refresh((x) => x + 1); }}>お気に入りへ</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && <div class="btns" style={{ marginTop: '10px' }}><button class="btn small" type="button" onClick={() => { if (confirm('履歴をすべて消しますか？（お気に入りは残ります）')) { clearHistory(); refresh((x) => x + 1); } }}>履歴を消す</button></div>}
        </>
      )}

      <h2 class="section-title">書き出し・読み込み</h2>
      <div class="panel">
        <div class="btns">
          <button class="btn" type="button" onClick={() => download(exportBackup(forge), `bishounen-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>全データをJSONで書き出す</button>
          <button class="btn" type="button" onClick={() => fileRef.current?.click()}>JSONを読み込む</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const input = e.target as HTMLInputElement; onImport(input.files?.[0]); input.value = ''; }} />
          <button class="btn" type="button" onClick={() => download(toMarkdown(forge), `${titleOf(forge)}.md`, 'text/markdown')}>今の美青年をMarkdownで保存</button>
          <button class="btn" type="button" onClick={share}>共有URLをコピー</button>
        </div>
        <p class="count-note">JSONには固定状態・手動選択・設定・辞書の版を含みます。読み込みはお気に入りへ追加され、今あるデータは消えません。</p>
      </div>

      <div class="panel">
        {!confirmAll ? (
          <button class="btn danger" type="button" onClick={() => setConfirmAll(true)}>保存データをすべて削除…</button>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>お気に入り・履歴・現在の状態をこの端末から削除します。元に戻せません。必要ならJSONを書き出してから実行してください。</p>
            <div class="btns">
              <button class="btn danger" type="button" onClick={() => { clearAll(); setConfirmAll(false); refresh((x) => x + 1); actions.toast('保存データを削除しました。'); }}>すべて削除する</button>
              <button class="btn" type="button" onClick={() => setConfirmAll(false)}>やめる</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
