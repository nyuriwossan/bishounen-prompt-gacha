import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { advise } from '../advisor/advisor';
import { DRAW_ORDER, fieldDef } from '../data/fields';
import { STYLE_PRESETS } from '../data/presets';
import { adopt, draw, drawWithin, fillModule, GROUPS, relatedTargets, repairAfterModuleOff, toggleLock, unlockAll, type DrawOutcome, type RecentMap } from '../engine/draw';
import { getDrawPrefs, setDrawPrefs, type DrawPrefs } from '../engine/prefs';
import { cloneState, emptyState } from '../engine/state';
import { titleOf } from '../prompts/build';
import { decodeShare, loadCurrent, loadPrefs, loadRecent, missingFields, pushHistory, savePrefs, saveCurrent, saveRecent } from '../storage/storage';
import type { FieldId, ForgeModules, ForgeState, StylePreset } from '../types';
import type { AppActions, ConflictView, Tab, Toast } from './types';
import { copyText } from './clipboard';
import { DictView } from './DictView';
import { ForgeView } from './ForgeView';
import { HelpView } from './HelpView';
import { IconBook, IconFlask, IconHelp, IconMoon, IconScroll, IconSun } from './icons';
import { ManualCopy } from './ManualCopy';
import { Picker } from './Picker';
import { PromptView } from './PromptView';
import { SavedView } from './SavedView';


const MODULE_OF: Record<keyof ForgeModules, Parameters<typeof fillModule>[1]> = {
  kemonoEnabled: 'kemono', backgroundEnabled: 'background', poseEnabled: 'pose', facialHairEnabled: 'facialHair', hairAccentEnabled: 'hairAccent', nameEnabled: 'name',
  glassesEnabled: 'glasses', marksEnabled: 'marks', propEnabled: 'prop', unlimitedEnabled: 'unlimited', cosplayEnabled: 'cosplay'
};

/** 共有URL・お気に入り・履歴の結果に、個人のOFF設定が掛かっているときの一言 */
export function prefsAppliedNote(): string {
  const off = getDrawPrefs().disabled;
  return off.length ? `個人の抽選・出力設定を適用中（${off.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}はOFFのため出力しません。保存元の内容は変えていません）。` : '';
}

function initialState(): { state: ForgeState; notes: string[] } {
  // 辞書・抽選設定は、最初の抽選より前に読み込んでエンジンへ渡す
  const prefs = loadPrefs();
  setDrawPrefs(prefs.prefs);
  const notes: string[] = [...prefs.notes];
  let state: ForgeState | null = null;
  const hash = typeof location !== 'undefined' ? location.hash : '';
  if (hash.startsWith('#s=')) {
    const r = decodeShare(hash.slice(3));
    if (r.state) { state = r.state; notes.push('共有URLの美青年を読み込みました。'); const n = prefsAppliedNote(); if (n) notes.push(n); }
    if (r.report.lostFields.length) notes.push(`共有URLの一部（${r.report.lostFields.map((x) => fieldDef(x.field as FieldId).ja).join('・')}）は辞書に無いため引き直しました。`);
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* noop */ }
  }
  if (!state) {
    const cur = loadCurrent();
    state = cur.state;
    if (cur.report.lostFields.length) notes.push(`保存データの一部（${cur.report.lostFields.map((x) => fieldDef(x.field as FieldId).ja).join('・')}）は辞書から削除された候補のため、引き直しました。`);
  }
  if (!state) {
    const r = draw(emptyState());
    // 辞書・抽選設定のせいで最初の錬成が成立しないときは、除外した候補を使わずに、理由を伝える
    if (!r.ok) notes.push(...r.notices);
    return { state: r.state, notes };
  }
  const missing = missingFields(state).filter((f) => fieldDef(f).randomizable !== false);
  if (missing.length) {
    const r = draw(state, { targets: missing });
    if (r.ok) state = r.state;
  }
  return { state, notes };
}

export function App() {
  const boot = useMemo(initialState, []);
  const [forge, setForge] = useState<ForgeState>(boot.state);
  const [tab, setTab] = useState<Tab>('forge');
  const [toast, setToast] = useState<Toast | null>(boot.notes.length ? { text: boot.notes.join(' ') } : null);
  const [picker, setPicker] = useState<FieldId | null>(null);
  const [conflict, setConflict] = useState<ConflictView | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [changed, setChanged] = useState<FieldId[]>([]);
  const [sweep, setSweep] = useState(0);
  const [pendingPreset, setPendingPreset] = useState<StylePreset | null>(null);
  // 辞書・抽選設定（ForgeState の外。戻す／進むでは変わらない）
  const [prefs, setPrefsState] = useState<DrawPrefs>(() => getDrawPrefs());
  const [prefsSave, setPrefsSave] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [dictField, setDictField] = useState<FieldId | null>(null);
  const [dictBack, setDictBack] = useState<Tab>('forge');
  // 禁断の調合をOFFにしたら、禁断のスタイルの選択も外す（OFFのまま禁断の条件で引かない）
  const unlimitedOn = forge.optionalModules.unlimitedEnabled;
  useEffect(() => { if (!unlimitedOn && pendingPreset?.group === 'forbidden') setPendingPreset(null); }, [unlimitedOn, pendingPreset]);
  const [theme, setTheme] = useState<'dark' | 'light' | null>(() => { try { return (localStorage.getItem('bpg:theme') as 'dark' | 'light' | null) ?? null; } catch { return null; } });
  const undo = useRef<ForgeState[]>([]);
  const redo = useRef<ForgeState[]>([]);
  const recent = useRef<RecentMap>(loadRecent() as RecentMap);
  const [, force] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => { saveCurrent(forge); }, [forge]);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    try { if (theme) localStorage.setItem('bpg:theme', theme); else localStorage.removeItem('bpg:theme'); } catch { /* noop */ }
  }, [theme]);

  const showToast = useCallback((t: Toast | string, ms = 3600) => {
    const v = typeof t === 'string' ? { text: t } : t;
    setToast(v);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), v.action ? ms + 3000 : ms);
  }, []);

  /** 状態の確定（Undo 対象） */
  const commit = useCallback((next: ForgeState, opts: { changed?: FieldId[]; history?: boolean } = {}) => {
    undo.current = [...undo.current, forge].slice(-60);
    redo.current = [];
    setForge(next);
    if (opts.changed) { setChanged(opts.changed); }
    if (opts.history) { pushHistory(next, titleOf(next)); setSweep((x) => x + 1); }
    force((x) => x + 1);
  }, [forge]);

  const handleOutcome = useCallback((r: DrawOutcome, success?: string) => {
    if (!r.ok) {
      setConflict({ notices: r.notices, conflicts: r.conflicts, stuck: r.stuck, prefsFields: r.prefsFields, prefsKind: r.prefsKind });
      return false;
    }
    recent.current = r.recent;
    saveRecent(r.recent as Record<string, string[]>);
    commit(r.state, { changed: r.changed, history: r.changed.length > 0 });
    if (r.stuck.length) setConflict({ notices: r.notices, conflicts: [], stuck: r.stuck });
    else if (r.notices.length) showToast(r.notices.join(' '));
    else if (success) showToast(success, 2200);
    return true;
  }, [commit, showToast]);

  const actions: AppActions = {
    forgeAll: () => handleOutcome(draw(forge, { recent: recent.current, preset: pendingPreset ?? undefined }), pendingPreset ? `「${pendingPreset.ja}」の方向で錬成しました。` : undefined),
    drawGroup: (g: keyof typeof GROUPS) => handleOutcome(draw(forge, { targets: GROUPS[g], recent: recent.current })),
    reroll: (f: FieldId) => {
      if (forge.fields[f].locked) {
        showToast({ text: `「${fieldDef(f).ja}」は固定中です。`, action: { label: '固定を外して引く', run: () => handleOutcome(draw(toggleLock(forge, f), { targets: [f], recent: recent.current })) } });
        return;
      }
      handleOutcome(draw(forge, { targets: [f], recent: recent.current }));
    },
    toggleLock: (f: FieldId) => commit(toggleLock(forge, f)),
    unlockAll: () => { commit(unlockAll(forge)); showToast('すべての固定を外しました。選んだ内容はそのまま残っています。'); },
    undo: () => {
      const prev = undo.current.pop();
      if (!prev) return;
      redo.current = [...redo.current, forge];
      setForge(prev); setChanged([]); force((x) => x + 1);
      showToast('ひとつ前に戻しました。', 1600);
    },
    redo: () => {
      const next = redo.current.pop();
      if (!next) return;
      undo.current = [...undo.current, forge];
      setForge(next); setChanged([]); force((x) => x + 1);
      showToast('やり直しました。', 1600);
    },
    adopt: (f: FieldId, id: string, lock: boolean) => {
      const r = adopt(forge, f, id, lock, { recent: recent.current });
      if (handleOutcome(r)) { setPicker(null); if (!r.notices.length) showToast(`「${fieldDef(f).ja}」を採用しました${lock ? '（固定）' : ''}。`, 2000); }
    },
    drawWithin: (f: FieldId, ids: string[], lock: boolean) => {
      const r = drawWithin(forge, f, ids, lock, recent.current);
      if (handleOutcome(r)) setPicker(null);
    },
    setSettings: (patch: Partial<ForgeState['settings']>) => { const s = cloneState(forge); Object.assign(s.settings, patch); setForge(s); },
    setModule: (key: keyof ForgeModules, on: boolean) => {
      const s = cloneState(forge);
      s.optionalModules[key] = on;
      if (on) {
        const r = fillModule(s, MODULE_OF[key], recent.current);
        if (r && r.ok) { commit(r.state, { changed: r.changed }); return; }
        // ONにした項目を、辞書・抽選設定のせいで埋められなかったとき：ONにはするが値は変えず、理由を伝える
        if (r && !r.ok && r.prefsFields?.length) {
          commit(s);
          showToast({ text: r.notices.join(' '), action: { label: '設定を開く', run: () => actions.openDict(r.prefsFields![0]) } }, 6000);
          return;
        }
      } else {
        const r = repairAfterModuleOff(s, recent.current);
        if (r) { commit(r.state, { changed: r.changed }); return; }
      }
      commit(s);
    },
    redrawRelated: (fields: FieldId[]) => { setConflict(null); handleOutcome(draw(forge, { targets: relatedTargets(forge, fields), recent: recent.current })); },
    openDict: (f?: FieldId) => {
      setConflict(null); setPicker(null);
      if (tab !== 'dict') setDictBack(tab);
      setDictField(f ?? null); setTab('dict'); window.scrollTo({ top: 0 });
    },
    unlockAndRetry: (fields: FieldId[]) => {
      let s = forge;
      for (const f of fields) if (s.fields[f].locked) s = toggleLock(s, f);
      setConflict(null);
      handleOutcome(draw(s, { recent: recent.current }));
    },
    load: (s: ForgeState, message: string) => {
      commit(cloneState(s), { changed: DRAW_ORDER }); setTab('forge');
      // 呼び出した結果は除外を理由に書き換えない。OFFの項目は出力されないことだけ伝える
      const note = prefsAppliedNote();
      showToast(note ? `${message} ${note}` : message, note ? 5200 : 2400);
    },
    copy: async (text: string, label = 'コピーしました。') => {
      const how = await copyText(text);
      if (how === 'manual') setManualCopy(text); else showToast(label, 1800);
    },
    choosePreset: (p: StylePreset | null) => setPendingPreset(p),
    openPicker: (f: FieldId) => setPicker(f),
    toast: showToast
  };

  // キーボード：Ctrl/Cmd+Z / Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? actions.redo : actions.undo)(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** 設定の変更：エンジンへ即時に渡し、自動保存する。保存できなければ成功表示を出さない */
  const changePrefs = useCallback((next: DrawPrefs) => {
    setDrawPrefs(next);
    const saved = getDrawPrefs();
    setPrefsState(saved);
    setPrefsSave(savePrefs(saved) ? 'saved' : 'failed');
  }, []);

  const issues = useMemo(() => advise(forge), [forge, prefs]);
  const title = titleOf(forge);
  const effectiveTheme = theme ?? 'dark';

  return (
    <div class="app">
      <header class="masthead">
        <div>
          <h1>美青年錬成ガチャ</h1>
          <p class="sub">〜イケメンとの出会いは一期一会〜</p>
        </div>
        <button class="icon-btn" type="button" aria-label={effectiveTheme === 'dark' ? '明るい表示にする' : '暗い表示にする'} onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}>
          {effectiveTheme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main>
        {tab === 'forge' && (
          <ForgeView forge={forge} title={title} issues={issues} changed={changed} sweep={sweep} actions={actions} prefs={prefs}
            canUndo={undo.current.length > 0} canRedo={redo.current.length > 0} presets={STYLE_PRESETS} pendingPreset={pendingPreset} />
        )}
        {tab === 'prompt' && <PromptView forge={forge} actions={actions} prefs={prefs} />}
        {tab === 'saved' && <SavedView forge={forge} actions={actions} prefs={prefs} onPrefs={changePrefs} />}
        {tab === 'help' && <HelpView onOpenDict={() => actions.openDict()} />}
        {tab === 'dict' && (
          <DictView forge={forge} prefs={prefs} saveState={prefsSave} field={dictField} onField={(f) => { setDictField(f); window.scrollTo({ top: 0 }); }}
            onChange={changePrefs} onModule={actions.setModule} onBack={() => { setTab(dictBack); setDictField(null); window.scrollTo({ top: 0 }); }} />
        )}
      </main>

      {tab === 'forge' && (
        <div class="dock">
          <div class="dock-inner">
            <button class="forge-btn" type="button" onClick={actions.forgeAll}>{pendingPreset ? 'この方向で錬成' : '美青年を錬成する'}</button>
            <button class="ghost-btn" type="button" onClick={() => setTab('prompt')}>プロンプト</button>
          </div>
        </div>
      )}

      <nav class="tabbar" aria-label="画面の切り替え">
        <ul>
          {([['forge', '錬成', IconFlask], ['prompt', 'プロンプト', IconScroll], ['saved', '保存', IconBook], ['help', 'ヘルプ', IconHelp]] as const).map(([id, label, Icon]) => (
            <li key={id}>
              <button type="button" aria-current={tab === id || (tab === 'dict' && dictBack === id) ? 'page' : undefined} onClick={() => { setTab(id); setDictField(null); window.scrollTo({ top: 0 }); }}>
                <Icon />{label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {picker && <Picker field={picker} forge={forge} onClose={() => setPicker(null)} onAdopt={actions.adopt} onDrawWithin={actions.drawWithin} />}
      {conflict && <ConflictSheet view={conflict} forge={forge} onClose={() => setConflict(null)} actions={actions} />}
      {manualCopy !== null && <ManualCopy text={manualCopy} onClose={() => setManualCopy(null)} />}

      <div aria-live="polite" class="sr-only">{toast?.text}</div>
      {toast && (
        <div class="toast" role="status">
          <span>{toast.text}</span>
          {toast.action && <button class="btn small primary" type="button" onClick={() => { toast.action!.run(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
    </div>
  );
}

function ConflictSheet({ view, forge, onClose, actions }: { view: ConflictView; forge: ForgeState; onClose: () => void; actions: AppActions }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal?.(); }, []);
  const unlockable = [...new Set(view.conflicts.flatMap((c) => c.unlockCandidates))];
  return (
    <dialog class="sheet" ref={ref} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }} aria-labelledby="conflict-title">
      <div class="sheet-head"><h2 id="conflict-title">{view.conflicts.length || view.prefsFields?.length ? '錬成できませんでした' : '一部の項目を引き直せませんでした'}</h2>
        <button class="btn small" type="button" onClick={onClose}>閉じる</button></div>
      <div class="sheet-body">
        {view.notices.map((n) => <p key={n}>{n}</p>)}
        {view.conflicts.length > 0 && (
          <ul class="notes">
            {view.conflicts.map((c, i) => (
              <li class="note hard" key={i}>
                <b>{c.fields.map((f) => fieldDef(f).ja).join(' × ')}</b>
                {c.reasonJa}
                {c.unlockCandidates.length > 0 && <div class="acts">{c.unlockCandidates.map((f) => <span key={f} class="count-note">固定中：{fieldDef(f).ja}（{forge.fields[f].id ? '現在の値は保持されます' : ''}）</span>)}</div>}
              </li>
            ))}
          </ul>
        )}
        <div class="btns">
          {unlockable.length > 0 && <button class="btn primary" type="button" onClick={() => actions.unlockAndRetry(unlockable)}>{unlockable.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}の固定を外して錬成</button>}
          {view.stuck.length > 0 && <button class="btn primary" type="button" onClick={() => actions.redrawRelated(view.stuck)}>関連する項目もまとめて引き直す</button>}
          {view.prefsKind === 'stuck' && view.prefsFields?.length && <button class="btn primary" type="button" onClick={() => actions.redrawRelated(view.prefsFields!)}>関連する項目もまとめて引き直す</button>}
          {view.prefsFields?.length ? <button class="btn" type="button" onClick={() => actions.openDict(view.prefsFields![0])}>辞書・抽選設定を開く（{view.prefsFields.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}）</button> : null}
          <button class="btn" type="button" onClick={onClose}>このままにする</button>
        </div>
      </div>
    </dialog>
  );
}
