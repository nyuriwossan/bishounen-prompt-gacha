/* 辞書・抽選設定：項目（カテゴリ）ごとに、自動の抽選で選ばれてよい候補と、項目を使うかどうかを決める。
 * ヘルプにあった「辞書の件数」の一覧をここへ移し、設定できる一覧にした（二重の一覧は作らない）。
 */
import { useMemo, useState } from 'preact/hooks';
import { DATA_VERSION, fieldDef, FIELDS, optionOf } from '../data/fields';
import { DISABLED_WITH, excludedCount, isRandomField, OFFABLE_FIELDS, REQUIRED_FIELDS, type DrawPrefs } from '../engine/prefs';
import { isActive, moduleKey } from '../engine/state';
import type { FieldGroup, FieldId, ForgeModules, ForgeState, ModuleId, Option } from '../types';

const SECTIONS: Array<{ id: FieldGroup; ja: string }> = [
  { id: 'basic', ja: '基本の処方' }, { id: 'face', ja: '顔・肌・装身具' }, { id: 'role', ja: '職業・雰囲気・色彩' }, { id: 'pose', ja: 'ポーズ・構図' },
  { id: 'scene', ja: '背景・光' }, { id: 'kemono', ja: '獣人モード（任意）' }, { id: 'forbidden', ja: '禁断の調合（アンリミテッド）' }, { id: 'style', ja: '画風・呼び名' }
];
/** 既存の任意スイッチ（詳細な調合）の名前。同じスイッチを共有する */
const MODULE_LABEL: Record<ModuleId, string> = {
  pose: 'ポーズ・アングルを出力する', background: '背景と光を出力する', kemono: '獣人モードを使う', facialHair: 'ひげを抽選に含める', hairAccent: '髪の配色拡張',
  name: '呼び名を付ける', glasses: '眼鏡を抽選に含める', marks: '特徴を抽選に含める', prop: '持ち物を抽選に含める', unlimited: 'アンリミテッドモードを使う', cosplay: 'コスプレ衣装から引く'
};
const PAGE = 120;
const norm = (s: string) => s.toLowerCase().normalize('NFKC');
const name = (f: FieldId) => fieldDef(f).short ?? fieldDef(f).ja;

interface Props {
  forge: ForgeState;
  prefs: DrawPrefs;
  saveState: 'idle' | 'saved' | 'failed';
  field: FieldId | null;
  onField: (f: FieldId | null) => void;
  onChange: (p: DrawPrefs) => void;
  onModule: (key: keyof ForgeModules, on: boolean) => void;
  onBack: () => void;
}

export function DictView(props: Props) {
  const { field, saveState } = props;
  return (
    <section class="screen dict" aria-labelledby="dict-title">
      <div class="dict-top">
        <button class="btn small" type="button" onClick={field ? () => props.onField(null) : props.onBack}>{field ? '← 一覧へ' : '← 戻る'}</button>
        <p class={`save-state ${saveState}`} role="status" aria-live="polite">
          {saveState === 'saved' ? '保存済み' : saveState === 'failed' ? '保存できませんでした。この設定は次に開いたときには残りません（ブラウザの保存領域を確認してください）。' : ''}
        </p>
      </div>
      {field ? <FieldDetail {...props} field={field} /> : <FieldList {...props} />}
    </section>
  );
}

/** 項目の状態（有効・無効と、その理由） */
function statusOf(forge: ForgeState, f: FieldId): { on: boolean; text: string } {
  if (!isRandomField(f)) return { on: true, text: '手で選ぶ項目' };
  const on = isActive(forge, f);
  return { on, text: on ? '使う' : 'OFF' };
}

function FieldList({ forge, prefs, onField, onChange }: Props) {
  const reset = () => {
    if (!confirm('辞書・抽選設定（候補の除外と、項目のOFF）をすべて初期設定に戻しますか？\nお気に入り・履歴・今の結果と、詳細な調合のスイッチ（眼鏡・背景など）は変わりません。')) return;
    onChange({ version: prefs.version, excluded: {}, disabled: [] });
  };
  const changed = prefs.disabled.length > 0 || FIELDS.some((d) => excludedCount(d.id, prefs) > 0);
  return (
    <>
      <h2 class="screen-title" id="dict-title">辞書・抽選設定</h2>
      <p class="lead">
        項目ごとに、<b>自動の抽選で選ばれてよい候補</b>（抽選対象）を選べます。除外した候補も、行を押して手で選ぶことはできます。
        固定（鍵）とは別の設定で、「ロック全解除」では戻りません。変更はすぐ自動保存され、次の抽選から反映します。
      </p>
      <p class="count-note">「抽選許可」は好み設定で許可した候補の数です。今の世界観や組み合わせの条件まで含めた、実際に出られる数ではありません。辞書の版：{DATA_VERSION}</p>
      {SECTIONS.map((sec) => {
        const fields = FIELDS.filter((d) => d.group === sec.id);
        if (!fields.length) return null;
        return (
          <section key={sec.id} class="dict-sec" aria-labelledby={`dict-sec-${sec.id}`}>
            <h3 id={`dict-sec-${sec.id}`}>{sec.ja}</h3>
            <ul class="dict-list">
              {fields.map((d) => {
                const total = d.options.length;
                const random = isRandomField(d.id);
                const allowed = total - excludedCount(d.id, prefs);
                const st = statusOf(forge, d.id);
                return (
                  <li key={d.id}>
                    <button type="button" class={`drow${st.on ? '' : ' off'}${allowed < total ? ' narrowed' : ''}`} onClick={() => onField(d.id)}
                      aria-label={`${d.ja}。登録${total}件${random ? `、抽選許可${allowed}件` : ''}、${st.text}。候補の設定を開く`}>
                      <span class="dname">{d.ja}</span>
                      <span class="dcount">登録 {total}件{random && <>・抽選許可 <b>{allowed}</b>件</>}</span>
                      <span class={`dstate${st.on ? '' : ' off'}`}>{st.text}</span>
                      {random && allowed === 0 && <span class="dwarn">候補が0件です</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div class="panel">
        <button class="btn danger" type="button" onClick={reset} disabled={!changed}>すべて初期設定に戻す…</button>
        <p class="count-note">候補の除外と項目のOFFだけを戻します。お気に入り・履歴は消えません。</p>
      </div>
      <p class="count-note">容姿・衣装の配色・ポーズ・背景・獣人・名前の語彙の一部は、作者の既存ツール（キャラクター外見設計工房、衣装プロンプト工房、ポーズ構図工房、背景プロンプト工房、獣人プロンプト工房、創作OCメーカー、LoRA学習プロンプト工房、創作アイデアガチャ）から移植・再構成しています。</p>
    </>
  );
}

function FieldDetail({ forge, prefs, field, onChange, onModule }: Props & { field: FieldId }) {
  const def = fieldDef(field);
  const random = isRandomField(field);
  const excluded = useMemo(() => new Set(prefs.excluded[field] ?? []), [prefs, field]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'on' | 'off'>('all');
  const [limit, setLimit] = useState(PAGE);
  const catLabel = useMemo(() => new Map((def.categories || []).map((c) => [c.id, c.ja])), [def]);
  const total = def.options.length;
  const allowedCount = total - def.options.filter((o) => excluded.has(o.id)).length;

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return def.options.filter((o) => {
      if (view === 'on' && excluded.has(o.id)) return false;
      if (view === 'off' && !excluded.has(o.id)) return false;
      if (!q) return true;
      return [o.ja, o.desc ?? '', o.en.join(' '), o.upper ?? '', o.lower ?? '', catLabel.get(o.cat ?? '') ?? '', o.nat ?? ''].some((t) => norm(t).includes(q));
    });
  }, [def, query, view, excluded, catLabel]);

  const setIds = (ids: string[]) => {
    const next = { ...prefs.excluded };
    if (ids.length) next[field] = ids; else delete next[field];
    onChange({ ...prefs, excluded: next });
  };
  const toggle = (id: string) => setIds(excluded.has(id) ? [...excluded].filter((x) => x !== id) : [...excluded, id]);
  const resetField = () => onChange({ ...prefs, excluded: Object.fromEntries(Object.entries(prefs.excluded).filter(([f]) => f !== field)), disabled: prefs.disabled.filter((f) => f !== field) });
  const setDisabled = (off: boolean) => onChange({ ...prefs, disabled: off ? [...new Set([...prefs.disabled, field])] : prefs.disabled.filter((f) => f !== field) });

  const sel = forge.fields[field];
  const cur = optionOf(field, sel.id);
  const on = isActive(forge, field);
  const offable = OFFABLE_FIELDS.includes(field);
  const linkedTo = DISABLED_WITH[field];
  const changedHere = excluded.size > 0 || prefs.disabled.includes(field);

  return (
    <>
      <h2 class="screen-title" id="dict-title">{def.ja}</h2>
      {def.hint && <p class="lead">{def.hint}</p>}

      <div class="panel">
        {offable && (
          <>
            <label class="toggle">
              <span>この項目を使う<small>OFFにすると、抽選せず、現在のプロンプトにも出力されません。値と固定状態は保持し、ONに戻すと元の値で出力します（再抽選はしません）。{field === 'outfit' ? '衣装をOFFにすると、衣装の色・文化の意匠・着崩し・衣装の状態も出力しません。' : ''}</small></span>
              <input type="checkbox" checked={!prefs.disabled.includes(field)} onChange={(e) => setDisabled(!(e.target as HTMLInputElement).checked)} />
            </label>
          </>
        )}
        {!offable && def.module && <ModuleToggle forge={forge} module={def.module} onModule={onModule} />}
        {linkedTo && prefs.disabled.includes(linkedTo) && <p class="count-note">「{fieldDef(linkedTo).ja}」がOFFのため、この項目も抽選・出力しません。</p>}
        {REQUIRED_FIELDS[field] && <p class="count-note" style={{ marginTop: 0 }}>{REQUIRED_FIELDS[field]}</p>}
        {!random && <p class="count-note" style={{ marginTop: 0 }}>この項目は通常の抽選では変わりません（手で選んだ値を保ちます）。そのため抽選対象の設定はありません。</p>}
        {random && <p class="dict-sum" aria-live="polite">抽選対象 <b>{allowedCount}</b> / 登録 {total}件{!on ? '（いまはOFFのため抽選しません）' : ''}</p>}
        {random && allowedCount === 0 && (
          <p class="dwarn" role="alert">候補が0件です。{offable || def.module ? '選択するか、この項目をOFFにしてください。' : '1件以上選んでください。'}このままでは、この項目を含む抽選は成立しません。</p>
        )}
        {random && cur && excluded.has(cur.id) && (
          <p class="count-note">現在の値「{cur.ja}」は抽選対象外です。次回の抽選から反映します。{sel.locked ? '固定中のため、この値は固定を外すまで保ちます。' : ''}</p>
        )}
      </div>

      {random && (
        <>
          <label class="field">
            <span class="sr-only">候補を検索</span>
            <input class="input" type="search" placeholder="名前・説明・英語タグで検索" value={query} onInput={(e) => { setQuery((e.target as HTMLInputElement).value); setLimit(PAGE); }} />
          </label>
          <div class="seg" role="group" aria-label="表示する候補">
            {([['all', 'すべて'], ['on', '抽選対象'], ['off', '除外中']] as const).map(([id, ja]) => (
              <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setLimit(PAGE); }}>{ja}</button>
            ))}
          </div>
          <div class="btns dict-bulk">
            <button class="btn small" type="button" onClick={() => setIds([])} disabled={allowedCount === total}>全選択</button>
            <button class="btn small" type="button" onClick={() => setIds(def.options.map((o) => o.id))} disabled={allowedCount === 0}>全解除</button>
            <button class="btn small" type="button" onClick={resetField} disabled={!changedHere}>この項目を初期設定に戻す</button>
          </div>
          <p class="count-note">全選択・全解除は、検索や表示の絞り込みに関係なく、この項目の全{total}件に作用します。</p>
          <p class="count-note" aria-live="polite">{filtered.length}件を表示</p>
          {filtered.length === 0 ? <p class="empty">条件に合う候補がありません。</p> : (
            <ul class="dopts">
              {filtered.slice(0, limit).map((o) => <CandRow key={o.id} o={o} on={!excluded.has(o.id)} current={o.id === sel.id} cat={catLabel.get(o.cat ?? '')} onToggle={() => toggle(o.id)} />)}
            </ul>
          )}
          {filtered.length > limit && <div class="btns" style={{ marginTop: '10px' }}><button class="btn" type="button" onClick={() => setLimit(limit + PAGE)}>さらに表示（残り{filtered.length - limit}件）</button></div>}
        </>
      )}
    </>
  );
}

/** 既存の任意スイッチ（詳細な調合）と共有するスイッチ */
function ModuleToggle({ forge, module, onModule }: { forge: ForgeState; module: ModuleId; onModule: Props['onModule'] }) {
  const key = moduleKey(module);
  const shared = FIELDS.filter((d) => d.module === module).map((d) => d.ja);
  return (
    <>
      <label class="toggle">
        <span>この項目を使う<small>詳細な調合の「{MODULE_LABEL[module]}」と同じスイッチです{shared.length > 1 ? `（${shared.join('・')}をまとめて切り替えます）` : ''}。OFFの間は抽選も出力もしません。切り替えたときの動き（ONで値を補う・OFFでその項目を前提にしていた固定していない値を引き直す）は、詳細な調合のスイッチと同じです。</small></span>
        <input type="checkbox" checked={forge.optionalModules[key]} onChange={(e) => onModule(key, (e.target as HTMLInputElement).checked)} />
      </label>
      {module === 'prop' && !forge.optionalModules.poseEnabled && <p class="count-note">「ポーズ・アングルを出力する」がOFFのため、持ち物も出力しません。</p>}
    </>
  );
}

function CandRow({ o, on, current, cat, onToggle }: { o: Option; on: boolean; current: boolean; cat?: string; onToggle: () => void }) {
  const en = o.en.length ? o.en.slice(0, 3).join(', ') : o.upper ? o.upper.replace(/\{c1\}/g, '◆').replace(/\{c2\}/g, '◇') : '';
  const desc = [cat, o.desc, en].filter(Boolean).join('｜');
  return (
    <li class={`dopt${on ? '' : ' excluded'}`}>
      <label>
        <input type="checkbox" checked={on} onChange={onToggle} />
        <span class="dbody">
          <span class="oname">{o.hex && <span class="swatch" style={{ background: o.hex }} />}{o.ja}
            <span class={`dbadge${on ? '' : ' off'}`}>{on ? '抽選対象' : '除外中'}</span>
            {current && <span class="dbadge cur">現在</span>}
          </span>
          {desc && <span class="odesc">{desc}</span>}
        </span>
      </label>
    </li>
  );
}

/** 錬成画面の小さな表示：個人設定を変えたときだけ。除外の多い順に2項目まで出し、残りは件数でまとめる */
export function prefsSummary(forge: ForgeState, prefs: DrawPrefs): string {
  const ex = FIELDS.map((d) => [d.id, excludedCount(d.id, prefs)] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const exText = ex.length ? `${ex.slice(0, 2).map(([f, n]) => `${name(f)}${n}件`).join('・')}${ex.length > 2 ? `ほか${ex.length - 2}項目（計${ex.reduce((a, [, n]) => a + n, 0)}件）` : ''}を除外` : '';
  // 既定ではONの任意スイッチ（背景・ポーズ・呼び名）をOFFにしているときも、好み設定として伝える（既定OFFのものは出さない）
  const moduleOff = ([['backgroundEnabled', '背景'], ['poseEnabled', 'ポーズ'], ['nameEnabled', '呼び名']] as const).filter(([k]) => !forge.optionalModules[k]).map(([, ja]) => ja);
  const off = [...prefs.disabled.map(name), ...moduleOff];
  const offText = off.length ? `${off.slice(0, 3).join('・')}${off.length > 3 ? `ほか${off.length - 3}項目` : ''}OFF` : '';
  return [exText, offText].filter(Boolean).join('／');
}
