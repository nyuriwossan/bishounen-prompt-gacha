import { useRef, useState } from 'preact/hooks';
import { optionOf } from '../data/fields';
import { draw, GROUPS } from '../engine/draw';
import type { DrawPrefs } from '../engine/prefs';
import { cloneState } from '../engine/state';
import { buildPrompt, titleOf, toMarkdown } from '../prompts/build';
import {
  backupContents, clearAll, clearHistory, clearLegacyHistory, deleteFavorite, deleteLegacyHistory, derivativesOf, duplicateFavorite, encodeShare, exportBackup, exportLegacyHistory,
  exportSingle, importBackup, listFavorites, listHistory, listLegacyHistory, MAX_FAVORITES, MAX_HISTORY, sameResult, saveFavorite, saveFavoritePair, unlinkFavorite, updateFavorite,
  type HistoryEntry, type SavedForge, type WardrobeSession
} from '../storage/storage';
import type { ForgeState } from '../types';
import { download } from './clipboard';
import type { AppActions } from './types';

/** 端末のローカル時刻で表示 */
const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } };
/** 履歴カードの短い概要（髪・瞳・衣装） */
function summaryOf(s: ForgeState): string {
  const j = (f: Parameters<typeof optionOf>[0]) => optionOf(f, s.fields[f].id)?.ja;
  return [[j('hairColor'), j('hairStyle')].filter(Boolean).join('・'), j('eyeColor'), j('outfit')].filter(Boolean).join('／');
}
const splitTags = (t: string) => t.split(/[,、\s]+/).filter(Boolean);

export function SavedView({ forge, actions, prefs, onPrefs }: { forge: ForgeState; actions: AppActions; prefs: DrawPrefs; onPrefs: (p: DrawPrefs) => void }) {
  const session = actions.session;
  const [, refresh] = useState(0);
  const favorites = listFavorites();
  const byId = new Map(favorites.map((f) => [f.id, f]));
  const baseFav = session?.baseId ? byId.get(session.baseId) : undefined;
  const baseName = baseFav?.name ?? session?.baseName ?? (session ? titleOf(session.base) : '');
  // 着せ替え中で、元の人物から結果が変わっているときだけ「派生として保存」を出す
  const deriving = !!session && !sameResult(forge, session.base);
  const outfitJa = optionOf('outfit', forge.fields.outfit.id)?.ja ?? '';
  const [nameRaw, setName] = useState(() => (deriving ? '' : titleOf(forge)));
  const [nameTouched, setNameTouched] = useState(!deriving);
  const [baseNameInput, setBaseNameInput] = useState(baseName);
  // 派生の名前は、手で書き換えるまで「元の人物の名前／衣装」に追従する
  const name = nameTouched ? nameRaw : `${(baseFav?.name ?? baseNameInput).trim() || baseName}／${outfitJa}`.slice(0, 80);
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'favorites' | 'history'>('favorites');
  const [confirmAll, setConfirmAll] = useState(false);
  // 辞書・抽選設定や履歴を含むJSONを読み込むときだけ、「〜も復元する」（どちらも初期OFF）を確認する
  const [pendingImport, setPendingImport] = useState<{ text: string; hasPrefs: boolean; history: number; restorePrefs: boolean; restoreHistory: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const history = listHistory();
  const legacy = listLegacyHistory();
  const q = query.trim().toLowerCase();
  const rootName = (f: SavedForge) => (f.rootId ? byId.get(f.rootId)?.name ?? '' : '');
  const shown = favorites.filter((f) => !q || [f.name, f.memo, f.tags.join(' '), titleOf(f.state), rootName(f)].join(' ').toLowerCase().includes(q));
  const done = (msg: string) => { actions.toast(msg); setMemo(''); setTags(''); refresh((x) => x + 1); };
  const fail = (reason?: string) => actions.toast(reason ?? '保存できませんでした。今の結果は画面に残っています。JSONで書き出すこともできます。', 5200);

  /** 独立した保存（別キャラとして保存も同じ） */
  const save = () => {
    const r = saveFavorite(forge, name, memo, splitTags(tags));
    if (r.ok) done(`「${r.item!.name}」を保存しました。`); else fail(r.reason);
  };
  /** 登録済みの元キャラの派生として保存（元の保存内容は変えない） */
  const saveDerived = () => {
    if (!baseFav) return;
    const r = saveFavorite(forge, name, memo, splitTags(tags), { rootId: baseFav.id });
    if (r.ok) done(`「${r.item!.name}」を「${byId.get(r.item!.rootId ?? '')?.name ?? baseFav.name}」の派生として保存しました。`); else fail(r.reason);
  };
  /** 元の人物（着せ替えを始めた時点の結果）も登録して、派生を保存する。どちらか一方だけの保存にはしない */
  const savePair = () => {
    if (!session) return;
    const r = saveFavoritePair({ state: session.base, name: baseNameInput.trim() || titleOf(session.base) }, { state: forge, name, memo, tags: splitTags(tags) });
    if (!r.ok) { fail(r.reason); return; }
    // 以降の派生は、登録した元キャラに紐づける
    actions.setSession({ ...session, baseId: r.base!.id, baseName: r.base!.name });
    done(`元の人物「${r.base!.name}」と派生「${r.derived!.name}」を保存しました。`);
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
    const n = derivativesOf(f.id, favorites).length;
    const msg = n ? `「${f.name}」を削除しますか？\n派生${n}件は削除されず、独立した保存結果として残ります（元キャラとの紐づけだけが外れます）。` : `「${f.name}」を削除しますか？`;
    if (!confirm(msg)) return;
    deleteFavorite(f.id);
    if (session?.baseId === f.id) actions.setSession({ ...session, baseId: undefined, baseName: f.name });
    refresh((x) => x + 1); actions.toast(n ? `削除しました。派生${n}件は独立した保存として残っています。` : '削除しました。');
  };
  const unlink = (f: SavedForge) => {
    if (!confirm(`「${f.name}」の元キャラとの紐づけを外し、別キャラとして扱いますか？（設定の内容は変わりません）`)) return;
    if (unlinkFavorite(f.id)) { refresh((x) => x + 1); actions.toast('紐づけを外しました。'); } else fail();
  };
  /** 別衣装版：衣装だけを引き直した結果を、この保存の派生として保存する */
  const outfitVariant = (f: SavedForge) => {
    const r = draw(cloneState(f.state), { targets: GROUPS.outfit });
    if (!r.ok || !r.changed.length) { actions.toast(r.prefsFields?.length ? r.notices.join(' ') : '別衣装の候補が見つかりませんでした。', 5000); return; }
    const outfit = optionOf('outfit', r.state.fields.outfit.id)?.ja ?? '別衣装';
    const s = saveFavorite(r.state, `${byId.get(f.rootId ?? '')?.name ?? f.name}／${outfit}`.slice(0, 80), f.memo, f.tags, { rootId: f.id });
    if (s.ok) { actions.toast('別衣装版を派生として保存しました。'); refresh((x) => x + 1); } else fail(s.reason);
  };
  /** お気に入りの呼び出し：その保存を着せ替えの元にする（衣装を変えたら派生として保存できる） */
  const sessionFor = (f: SavedForge): WardrobeSession => ({ baseId: f.id, baseName: f.name, base: cloneState(f.state) });
  /** 履歴の呼び出し：着せ替え中だった元キャラが残っていれば、それを元にする */
  const historySession = (h: HistoryEntry): WardrobeSession | null => {
    const b = h.baseId ? byId.get(h.baseId) : undefined;
    return b ? sessionFor(b) : null;
  };
  const saveHistory = (h: HistoryEntry) => {
    // 今表示している結果ではなく、その履歴の結果を保存する
    const r = saveFavorite(h.state, h.title);
    if (r.ok) { actions.toast('お気に入りに保存しました（履歴にも残っています）。'); refresh((x) => x + 1); } else fail(r.reason);
  };

  const doImport = () => {
    if (!pendingImport) return;
    const { text, restorePrefs, restoreHistory } = pendingImport;
    setPendingImport(null);
    runImport(text, restorePrefs, restoreHistory);
  };
  const runImport = (text: string, restorePrefs: boolean, restoreHistory: boolean) => {
    const r = importBackup(text, { restoreHistory });
    if (!r.ok) { actions.toast(r.error ?? '読み込めませんでした。'); return; }
    const lost = r.report.lostFields.length ? ` 辞書に無い候補 ${r.report.lostFields.length} 件は除外しました。` : '';
    // 抽選設定は、選んだときだけ置き換える。ファイルに無い（または壊れている）ときは今の設定を保つ
    let prefsNote = '';
    if (restorePrefs && r.drawPrefs) { onPrefs(r.drawPrefs); prefsNote = ' 辞書・抽選設定も復元しました。'; }
    else if (restorePrefs) prefsNote = ' 辞書・抽選設定は復元できなかったため、今の設定のままです。';
    const histNote = restoreHistory ? ` 履歴 ${r.historyAdded} 件を統合しました${r.historyToLegacy ? `（直近${MAX_HISTORY}件に入らない${r.historyToLegacy}件は「以前の履歴」へ）` : ''}。` : '';
    actions.toast(`お気に入り ${r.favoritesAdded} 件を読み込みました。${histNote}${lost}${r.report.notes.join(' ')}${prefsNote}`, 6000);
    refresh((x) => x + 1);
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const c = backupContents(text);
    if (c.prefs || c.history) { setPendingImport({ text, hasPrefs: c.prefs, history: c.history, restorePrefs: false, restoreHistory: false }); return; }
    runImport(text, false, false);
  };
  const share = () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(forge)}`;
    actions.copy(url, '共有URLをコピーしました（この1件の結果だけ。自由タグ・メモ・派生・個人設定は含みません）。');
  };

  return (
    <section class="screen" aria-labelledby="saved-title">
      <h2 class="screen-title" id="saved-title">保存した美青年</h2>
      <p class="lead">保存先はこの端末のブラウザ内です。サイトデータを消すと失われるため、大切な美青年はJSONで書き出しておいてください。</p>

      <div class="panel">
        <label class="field"><span>{deriving ? '名前（派生）' : '名前'}</span><input class="input" value={name} maxLength={80} onInput={(e) => { setNameTouched(true); setName((e.target as HTMLInputElement).value); }} /></label>
        <label class="field"><span>メモ（任意）</span><input class="input" value={memo} maxLength={2000} onInput={(e) => setMemo((e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span>タグ（任意・空白区切り）</span><input class="input" value={tags} onInput={(e) => setTags((e.target as HTMLInputElement).value)} placeholder="例：本命 和風" /></label>
        {deriving ? (
          <div class="derive-panel" role="group" aria-label="着せ替えの保存">
            <p>着せ替え元：<b>{baseName}</b>{baseFav ? '（お気に入りに登録済み）' : '（まだ登録していません）'}。今の結果は元の人物から衣装などを変えたものです。</p>
            {baseFav ? (
              <div class="btns">
                <button class="btn primary" type="button" onClick={saveDerived}>派生として保存</button>
                <button class="btn" type="button" onClick={save}>別キャラとして保存</button>
              </div>
            ) : (
              <>
                <label class="field"><span>元の人物の名前</span><input class="input" value={baseNameInput} maxLength={80} onInput={(e) => setBaseNameInput((e.target as HTMLInputElement).value)} /></label>
                <div class="btns">
                  <button class="btn primary" type="button" onClick={savePair}>元の人物も登録して派生を保存</button>
                  <button class="btn" type="button" onClick={save}>別キャラとして保存</button>
                </div>
                <p class="count-note">元の人物は、着せ替えを始めた時点の結果（衣装を変える前）で登録します。2件分の空きが必要です。</p>
              </>
            )}
          </div>
        ) : (
          <div class="btns">
            <button class="btn primary" type="button" onClick={save}>この美青年を保存</button>
            <button class="btn" type="button" onClick={() => { setNameTouched(true); setName(titleOf(forge)); }}>名前を今の結果に戻す</button>
          </div>
        )}
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
              {shown.map((f) => {
                const derivs = derivativesOf(f.id, favorites);
                return (
                  <li class="item" key={f.id} data-fav-id={f.id}>
                    <h3>{f.name}{f.rootId ? <span class="lineage">派生</span> : derivs.length ? <span class="lineage">元キャラ</span> : null}</h3>
                    <p class="meta">{f.rootId ? `元：${rootName(f)}｜` : ''}{titleOf(f.state)}｜{fmt(f.updatedAt)}{f.tags.length ? `｜#${f.tags.join(' #')}` : ''}</p>
                    {f.memo && <p class="count-note" style={{ marginTop: 0 }}>{f.memo}</p>}
                    {derivs.length > 0 && (
                      <details class="derivs">
                        <summary>派生（{derivs.length}件）</summary>
                        <ul>
                          {derivs.map((d) => (
                            <li key={d.id}><span>{d.name}<span class="count-note">｜{optionOf('outfit', d.state.fields.outfit.id)?.ja ?? ''}</span></span>
                              <button class="btn small" type="button" onClick={() => actions.load(d.state, `「${d.name}」を呼び出しました。`, { session: sessionFor(d) })}>呼び出す</button></li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <div class="btns">
                      <button class="btn small primary" type="button" onClick={() => actions.load(f.state, `「${f.name}」を呼び出しました。`, { session: sessionFor(f) })}>呼び出す</button>
                      <button class="btn small" type="button" onClick={() => actions.load(f.state, `「${f.name}」で着せ替えます。採用するまで結果は変わりません。`, { session: sessionFor(f), wardrobe: true })}>この人物で着せ替え</button>
                      <button class="btn small" type="button" onClick={() => actions.copy(buildPrompt(f.state).positive, 'プロンプトをコピーしました。')}>コピー</button>
                      <button class="btn small" type="button" onClick={() => rename(f)}>改名</button>
                      <button class="btn small" type="button" onClick={() => editMemo(f)}>メモ</button>
                      <button class="btn small" type="button" onClick={() => { if (duplicateFavorite(f.id)) refresh((x) => x + 1); else fail(); }}>複製</button>
                      <button class="btn small" type="button" onClick={() => outfitVariant(f)}>別衣装版</button>
                      <button class="btn small" type="button" onClick={() => download(exportSingle(f.state, f.name), `${f.name}.json`, 'application/json')}>JSON</button>
                      {f.rootId && <button class="btn small" type="button" onClick={() => unlink(f)}>紐づけを外す</button>}
                      <button class="btn small danger" type="button" onClick={() => remove(f)}>削除</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {view === 'history' && (
        <>
          <p class="count-note">直近{MAX_HISTORY}件をこのブラウザに自動保存します。残したい結果はお気に入りへ。サイトデータを消すと失われます。</p>
          {history.length === 0 ? <p class="empty">まだ履歴はありません。錬成すると、直近{MAX_HISTORY}件まで残ります。</p> : (
            <ul class="list">
              {history.map((h) => (
                <li class="item" key={h.id}>
                  <h3>{h.title}</h3>
                  <p class="hsum">{summaryOf(h.state)}</p>
                  <p class="meta"><time dateTime={h.at}>{fmt(h.at)}</time>{h.baseId && byId.get(h.baseId) ? `｜着せ替え元：${byId.get(h.baseId)!.name}` : ''}</p>
                  <div class="btns">
                    <button class="btn small primary" type="button" onClick={() => actions.load(h.state, '履歴の結果に戻しました（戻すで取り消せます）。', { session: historySession(h) })}>この結果に戻す</button>
                    <button class="btn small" type="button" onClick={() => saveHistory(h)}>お気に入りに保存</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && <div class="btns" style={{ marginTop: '10px' }}><button class="btn small" type="button" onClick={() => { if (confirm('履歴をすべて消しますか？（お気に入りは残ります）')) { clearHistory(); refresh((x) => x + 1); } }}>履歴を消す</button></div>}

          {legacy.length > 0 && (
            <section class="legacy" aria-labelledby="legacy-title">
              <h3 class="section-title" id="legacy-title">以前の履歴（{legacy.length}件）</h3>
              <p class="count-note">通常の履歴（直近{MAX_HISTORY}件）に入りきらなかった結果です。自動では消しません。必要なものはお気に入りへ保存するか、JSONで書き出してください。</p>
              <div class="btns" style={{ margin: '6px 0 10px' }}>
                <button class="btn small" type="button" onClick={() => download(exportLegacyHistory(), `bishounen-history-old-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>以前の履歴をJSONで書き出す</button>
                <button class="btn small danger" type="button" onClick={() => { if (confirm(`以前の履歴${legacy.length}件をすべて削除しますか？（お気に入りは残ります）`)) { clearLegacyHistory(); refresh((x) => x + 1); } }}>以前の履歴をすべて削除…</button>
              </div>
              <ul class="list">
                {legacy.map((h) => (
                  <li class="item" key={h.id}>
                    <h3>{h.title}</h3>
                    <p class="hsum">{summaryOf(h.state)}</p>
                    <p class="meta"><time dateTime={h.at}>{fmt(h.at)}</time></p>
                    <div class="btns">
                      <button class="btn small" type="button" onClick={() => actions.load(h.state, '以前の履歴の結果に戻しました（戻すで取り消せます）。')}>この結果に戻す</button>
                      <button class="btn small" type="button" onClick={() => saveHistory(h)}>お気に入りに保存</button>
                      <button class="btn small danger" type="button" onClick={() => { if (confirm('この履歴を削除しますか？')) { deleteLegacyHistory(h.id); refresh((x) => x + 1); } }}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <h2 class="section-title">書き出し・読み込み</h2>
      <div class="panel">
        <div class="btns">
          <button class="btn" type="button" onClick={() => download(exportBackup(forge, prefs), `bishounen-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>全データをJSONで書き出す</button>
          <button class="btn" type="button" onClick={() => fileRef.current?.click()}>JSONを読み込む</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const input = e.target as HTMLInputElement; onImport(input.files?.[0]); input.value = ''; }} />
          <button class="btn" type="button" onClick={() => download(toMarkdown(forge), `${titleOf(forge)}.md`, 'text/markdown')}>今の美青年をMarkdownで保存</button>
          <button class="btn" type="button" onClick={share}>共有URLをコピー</button>
        </div>
        <p class="count-note">JSONには固定状態・手動選択・設定・辞書の版、元キャラと派生の関係、履歴、辞書・抽選設定を含みます。読み込みはお気に入りへ追加され、今あるデータは消えません。共有URLはこの1件の結果だけで、派生や辞書・抽選設定は含めません。</p>
        {pendingImport && (
          <div class="import-confirm" role="group" aria-label="読み込みの確認">
            <p style={{ margin: '10px 0 0' }}>お気に入りはいつもどおり追加します。次の内容も含まれています。必要なものだけ選んでください。</p>
            {pendingImport.history > 0 && (
              <label class="check"><input type="checkbox" checked={pendingImport.restoreHistory} onChange={(e) => setPendingImport({ ...pendingImport, restoreHistory: (e.target as HTMLInputElement).checked })} />履歴も復元する（{pendingImport.history}件。日時順に統合し、直近{MAX_HISTORY}件より前は「以前の履歴」へ）</label>
            )}
            {pendingImport.hasPrefs && (
              <label class="check"><input type="checkbox" checked={pendingImport.restorePrefs} onChange={(e) => setPendingImport({ ...pendingImport, restorePrefs: (e.target as HTMLInputElement).checked })} />抽選設定も復元する（今の設定を置き換えます）</label>
            )}
            <div class="btns">
              <button class="btn primary" type="button" onClick={doImport}>読み込む</button>
              <button class="btn" type="button" onClick={() => setPendingImport(null)}>やめる</button>
            </div>
          </div>
        )}
      </div>

      <div class="panel">
        {!confirmAll ? (
          <button class="btn danger" type="button" onClick={() => setConfirmAll(true)}>保存データをすべて削除…</button>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>お気に入り・履歴（以前の履歴を含む）・現在の状態をこの端末から削除します。元に戻せません。必要ならJSONを書き出してから実行してください。辞書・抽選設定は残ります。</p>
            <div class="btns">
              <button class="btn danger" type="button" onClick={() => { clearAll(); actions.setSession(null); setConfirmAll(false); refresh((x) => x + 1); actions.toast('保存データを削除しました。'); }}>すべて削除する</button>
              <button class="btn" type="button" onClick={() => setConfirmAll(false)}>やめる</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
