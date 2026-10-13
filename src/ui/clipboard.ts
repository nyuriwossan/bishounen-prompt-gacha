/* コピー：Clipboard API → execCommand → 手動コピー欄（iOS Safari で権限が無い場合の退避）。
 * creative-idea-gacha の copy() と同じ3段構え。
 */
export type CopyResult = 'clipboard' | 'execCommand' | 'manual';

export async function copyText(text: string, env: { navigator?: Navigator; document?: Document } = globalThis as never): Promise<CopyResult> {
  try {
    if (env.navigator?.clipboard?.writeText) {
      await env.navigator.clipboard.writeText(text);
      return 'clipboard';
    }
  } catch { /* 次の手段へ */ }
  const doc = env.document;
  if (doc?.body) {
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    doc.body.appendChild(ta);
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch { /* noop */ }
    let ok = false;
    try { ok = doc.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    if (ok) return 'execCommand';
  }
  return 'manual';
}

export function download(text: string, filename: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 80);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
