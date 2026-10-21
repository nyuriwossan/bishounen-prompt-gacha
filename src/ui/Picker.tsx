import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fieldDef } from '../data/fields';
import { checkAdopt } from '../engine/draw';
import { isExcluded, isPrefOff } from '../engine/prefs';
import type { FieldId, ForgeState, Option } from '../types';
import { IconClose } from './icons';

interface Props {
  field: FieldId;
  forge: ForgeState;
  onClose: () => void;
  onAdopt: (f: FieldId, id: string, lock: boolean) => void;
  onDrawWithin: (f: FieldId, ids: string[], lock: boolean) => void;
}

const PAGE = 120;
const norm = (s: string) => s.toLowerCase().normalize('NFKC');

export function Picker({ field, forge, onClose, onAdopt, onDrawWithin }: Props) {
  const def = fieldDef(field);
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [showBlocked, setShowBlocked] = useState(false);
  const [lockAfter, setLockAfter] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { ref.current?.showModal?.(); }, []);

  const catLabel = useMemo(() => new Map((def.categories || []).map((c) => [c.id, c.ja])), [def]);
  const checks = useMemo(() => new Map(def.options.map((o) => [o.id, checkAdopt(forge, field, o.id)])), [forge, field, def]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return def.options.filter((o) => {
      if (cat !== 'all' && o.cat !== cat) return false;
      const c = checks.get(o.id)!;
      if (!showBlocked && (c.blockingLocked.length || c.blockingOff.length || c.blockingCosplay)) return false;
      if (!q) return true;
      return [o.ja, o.desc ?? '', o.en.join(' '), catLabel.get(o.cat ?? '') ?? '', o.nat ?? ''].some((t) => norm(t).includes(q));
    });
  }, [def, cat, query, showBlocked, checks, catLabel]);
  const drawable = filtered.filter((o) => checks.get(o.id)!.ok);
  // 「この中から引く」は自動の抽選なので、抽選から除外した候補は使わない（手で選ぶことはできる）
  const drawPool = drawable.filter((o) => !isExcluded(field, o.id));
  const excludedShown = drawable.length - drawPool.length;
  const currentId = forge.fields[field].id;
  // コスプレOFFの間は「コスプレ」の分類チップを出さない（両立しない候補も表示するときは出す）
  const cats = def.categories?.filter((c) => def.options.some((o) => o.cat === c.id)
    && (field !== 'outfit' || c.id !== 'cosplay' || forge.optionalModules.cosplayEnabled || showBlocked)) ?? [];

  return (
    <dialog class="sheet" ref={ref} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }} aria-labelledby="picker-title">
      <div class="sheet-head">
        <h2 id="picker-title">{def.ja}を選ぶ</h2>
        <button class="icon-btn" type="button" onClick={() => ref.current?.close()} aria-label="閉じる"><IconClose /></button>
      </div>
      <div class="sheet-body">
        {def.hint && <p class="lead">{def.hint}</p>}
        <label class="field">
          <span class="sr-only">候補を検索</span>
          <input class="input" type="search" placeholder="名前・英語タグで検索" value={query} onInput={(e) => { setQuery((e.target as HTMLInputElement).value); setLimit(PAGE); }} />
        </label>
        {cats.length > 0 && (
          <div class="cats" role="group" aria-label="大分類">
            <button type="button" class="chip" aria-pressed={cat === 'all'} onClick={() => { setCat('all'); setLimit(PAGE); }}>すべて</button>
            {cats.map((c) => <button key={c.id} type="button" class="chip" aria-pressed={cat === c.id} onClick={() => { setCat(c.id); setLimit(PAGE); }}>{c.ja}</button>)}
          </div>
        )}
        <label class="check"><input type="checkbox" checked={showBlocked} onChange={(e) => setShowBlocked((e.target as HTMLInputElement).checked)} />固定中・OFFの項目と両立しない候補も表示する</label>
        <p class="count-note" aria-live="polite">{filtered.length}件{filtered.length !== drawable.length ? `（うち今すぐ両立するのは${drawable.length}件）` : ''}{excludedShown ? `。抽選対象外が${excludedShown}件あります（手では選べます）` : ''}</p>
        {filtered.length === 0 ? (
          <p class="empty">条件に合う候補がありません。検索語や分類を変えてみてください。</p>
        ) : (
          <ul class="opts">
            {filtered.slice(0, limit).map((o) => <OptionRow key={o.id} o={o} current={o.id === currentId} excluded={isExcluded(field, o.id)} check={checks.get(o.id)!} catLabel={catLabel.get(o.cat ?? '')} onPick={() => onAdopt(field, o.id, lockAfter)} />)}
          </ul>
        )}
        {filtered.length > limit && <div class="btns" style={{ marginTop: '10px' }}><button class="btn" type="button" onClick={() => setLimit(limit + PAGE)}>さらに表示（残り{filtered.length - limit}件）</button></div>}
      </div>
      <div class="sheet-foot">
        <label class="check"><input type="checkbox" checked={lockAfter} onChange={(e) => setLockAfter((e.target as HTMLInputElement).checked)} />採用後に固定する</label>
        <button class="btn primary" type="button" disabled={!drawPool.length} onClick={() => onDrawWithin(field, drawPool.map((o) => o.id), lockAfter)}>
          この中から引く（{drawPool.length}件）
        </button>
      </div>
    </dialog>
  );
}

function OptionRow({ o, current, excluded, check, catLabel, onPick }: { o: Option; current: boolean; excluded: boolean; check: ReturnType<typeof checkAdopt>; catLabel?: string; onPick: () => void }) {
  const name = (f: FieldId) => fieldDef(f).short ?? fieldDef(f).ja;
  const blocked = check.blockingLocked.length > 0 || check.blockingOff.length > 0 || !!check.blockingCosplay;
  const why = check.blockingCosplay ? 'コスプレ衣装がOFFです。詳細な調合の「コスプレ衣装」でONにすると選べます'
    : check.blockingOff.length ? `${check.blockingOff.map(name).join('・')}がOFFです。${check.blockingOff.some((f) => isPrefOff(f)) ? '辞書・抽選設定' : '詳細な調合'}でONにすると選べます`
    : blocked ? `固定中の${check.blockingLocked.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}と両立しません：${check.violations[0]?.reasonJa ?? ''}`
    : check.conflictingUnlocked.length ? `採用すると「${check.conflictingUnlocked.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}」を合わせて引き直します` : '';
  const en = o.en.length ? o.en.slice(0, 3).join(', ') : o.upper ? o.upper.replace(/\{c1\}/g, '◆').replace(/\{c2\}/g, '◇') : '';
  const desc = [catLabel, o.desc, en].filter(Boolean).join('｜');
  return (
    <li class={`opt${current ? ' current' : ''}${blocked ? ' blocked' : ''}`}>
      <button class="pick" type="button" onClick={onPick} disabled={blocked} aria-label={`${o.ja}を採用${excluded ? '。抽選対象外（手では選べます）' : ''}${why ? `。${why}` : ''}`}>
        <span class="oname">{o.hex && <span class="swatch" style={{ background: o.hex }} />}{o.ja}</span>
        {desc && <span class="odesc">{desc}</span>}
        {excluded && <span class="excl">抽選対象外（辞書・抽選設定で除外中。手で選んでも除外の設定は変わりません）</span>}
        {why && <span class="why">{why}</span>}
      </button>
    </li>
  );
}
