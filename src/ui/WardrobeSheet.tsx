/* 衣装3案のシート。作るだけでは何も変えない。採用したときだけ、衣装と色をまとめて反映する */
import { useEffect, useRef, useState } from 'preact/hooks';
import { fieldDef, optionOf } from '../data/fields';
import type { WardrobeCard, WardrobePreview } from '../engine/wardrobe';
import { outfitColorUse, shotLevelOf } from '../prompts/build';
import type { FieldId, ForgeState } from '../types';

interface Props {
  preview: WardrobePreview;
  forge: ForgeState;
  onClose: () => void;
  onRegenerate: () => void;
  onOpenDict: (f?: FieldId) => void;
  /** 採用。採用できなかったときは理由を返す */
  onAdopt: (card: WardrobeCard) => string | null;
}

export function WardrobeSheet({ preview, forge, onClose, onRegenerate, onOpenDict, onAdopt }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { ref.current?.showModal?.(); }, []);
  // 作り直したら、前の案のエラー表示は消す
  useEffect(() => { setError(null); }, [preview]);
  const cur = optionOf('outfit', forge.fields.outfit.id);
  const n = preview.cards.length;
  return (
    <dialog class="sheet wardrobe" ref={ref} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }} aria-labelledby="wardrobe-title">
      <div class="sheet-head">
        <h2 id="wardrobe-title">衣装を3案見る</h2>
        <button class="btn small" type="button" onClick={() => ref.current?.close()}>閉じる</button>
      </div>
      <div class="sheet-body">
        <p class="lead">今の衣装：{cur?.ja ?? '—'}。衣装と衣装の色だけを変えた案です。顔・髪・表情・ポーズ・背景などは変わりません。採用するまで、今の結果は変わりません。</p>
        {preview.reason && <p class={n ? 'count-note' : 'note soft'} role="status">{preview.reason}</p>}
        {preview.prefsFields.length > 0 && (
          <div class="btns" style={{ margin: '6px 0 10px' }}>
            <button class="btn small" type="button" onClick={() => onOpenDict(preview.prefsFields[0])}>辞書・抽選設定を開く（{preview.prefsFields.map((f) => fieldDef(f).short ?? fieldDef(f).ja).join('・')}）</button>
          </div>
        )}
        {error && <p class="note hard" role="alert">{error}</p>}
        {n > 0 && (
          <ol class="wcards" aria-label={`衣装の案 ${n}件`}>
            {preview.cards.map((c, i) => <Card key={c.seed} card={c} index={i} onAdopt={() => setError(onAdopt(c))} />)}
          </ol>
        )}
      </div>
      <div class="sheet-foot">
        <button class="btn" type="button" onClick={() => ref.current?.close()}>閉じる（今のまま）</button>
        {!preview.off && <button class="btn primary" type="button" onClick={onRegenerate}>別の3案を見る</button>}
      </div>
    </dialog>
  );
}

function Card({ card, index, onAdopt }: { card: WardrobeCard; index: number; onAdopt: () => void }) {
  const s = card.state;
  const outfit = optionOf('outfit', s.fields.outfit.id);
  const use = outfitColorUse(outfit, shotLevelOf(s));
  const colors: Array<{ f: FieldId; key: string }> = [];
  if (use.main) colors.push({ f: 'mainColor', key: 'メイン' });
  if (use.accent) colors.push({ f: 'accentColor', key: '差し色' });
  const titleId = `wcard-${index}`;
  return (
    <li class="wcard" aria-labelledby={titleId}>
      <h3 id={titleId}>
        <span class="wnum">案{index + 1}</span>{outfit?.ja ?? '—'}
        {card.colorOnly && <span class="dbadge">色違い</span>}
      </h3>
      {colors.length > 0 ? (
        <p class="wcolors">
          {colors.map(({ f, key }) => {
            const c = optionOf(f, s.fields[f].id);
            return <span key={f} class="wcolor">{c?.hex && <span class="swatch" style={{ background: c.hex }} aria-hidden="true" />}<span class="ckey">{key}</span>{c?.ja ?? '—'}</span>;
          })}
        </p>
      ) : <p class="count-note">この服・この画角では、衣装の色は出力されません。</p>}
      {card.changes.length > 0 && <ul class="wchanges">{card.changes.map((x) => <li key={x}>{x}</li>)}</ul>}
      <button class="btn primary" type="button" onClick={onAdopt}>この案を採用</button>
    </li>
  );
}
