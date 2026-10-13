import { useEffect, useRef } from 'preact/hooks';

/** クリップボードが使えない環境（iOS Safari の権限など）向けの手動コピー欄 */
export function ManualCopy({ text, onClose }: { text: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.showModal?.();
    setTimeout(() => { ta.current?.focus(); ta.current?.select(); }, 50);
  }, []);
  return (
    <dialog class="sheet" ref={ref} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }} aria-labelledby="manual-title">
      <div class="sheet-head"><h2 id="manual-title">手動でコピーしてください</h2><button class="btn small" type="button" onClick={() => ref.current?.close()}>閉じる</button></div>
      <div class="sheet-body">
        <p class="lead">この環境では自動コピーが使えませんでした。下の全文が選択されています。長押しして「コピー」を選んでください。</p>
        <textarea ref={ta} class="input prompt-box" readOnly value={text} aria-label="コピーする全文" onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
      </div>
    </dialog>
  );
}
