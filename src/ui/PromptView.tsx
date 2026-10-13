import { Fragment } from 'preact';
import { useMemo } from 'preact/hooks';
import { buildPrompt } from '../prompts/build';
import type { ForgeState, OutputTarget } from '../types';
import type { AppActions } from './types';

const TARGETS: Array<[OutputTarget, string, string]> = [
  ['pixai', 'PixAI', 'SDXL系モデル向けのタグ形式。品質タグは任意です。'],
  ['novelai', 'NovelAI', 'タグ中心。強調は {波括弧} で付きます。'],
  ['genericTags', '汎用タグ', 'モデル依存の重み付けをしないタグ列。'],
  ['naturalEnglish', '自然な英文', '文章で指示する画像生成AI向け。'],
  ['japanese', '日本語設定', '画像用タグではなく、人物の設定として読める文。']
];

export function PromptView({ forge, actions }: { forge: ForgeState; actions: AppActions }) {
  const S = forge.settings;
  const out = useMemo(() => buildPrompt(forge, S.outputTarget), [forge, S.outputTarget]);
  const main = S.compact ? out.compact : out.positive;
  const tagMode = S.outputTarget !== 'naturalEnglish' && S.outputTarget !== 'japanese';
  const count = tagMode ? `${main.split(',').filter((x) => x.trim()).length}タグ・${main.length}文字` : `${main.length}文字`;

  return (
    <section class="screen" aria-labelledby="prompt-title">
      <h2 class="screen-title" id="prompt-title">完成プロンプト</h2>
      <p class="lead">「{out.title}」の処方です。コピーして、使っている画像生成サービスに貼り付けてください。</p>

      <div class="target-row" role="group" aria-label="出力先">
        {TARGETS.map(([id, label]) => (
          <button key={id} type="button" class="chip" aria-pressed={S.outputTarget === id} onClick={() => actions.setSettings({ outputTarget: id })}>{label}</button>
        ))}
      </div>
      <p class="mode-note" style={{ marginTop: '6px' }}>{TARGETS.find((t) => t[0] === S.outputTarget)?.[2]}</p>

      <div class="panel">
        <div class="seg" role="group" aria-label="長さ" style={{ marginBottom: '10px' }}>
          <button type="button" aria-pressed={!S.compact} onClick={() => actions.setSettings({ compact: false })}>完成版</button>
          <button type="button" aria-pressed={S.compact} onClick={() => actions.setSettings({ compact: true })}>コンパクト版</button>
        </div>
        <label class="sr-only" for="prompt-main">プロンプト本文</label>
        <textarea id="prompt-main" class="input prompt-box" readOnly value={main} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
        <p class="count-note">{count}</p>
        <div class="btns" style={{ marginTop: '10px' }}>
          <button class="btn primary" type="button" onClick={() => actions.copy(main, 'プロンプトをコピーしました。')}>プロンプトをコピー</button>
          <button class="btn" type="button" onClick={() => actions.copy(S.compact ? out.positive : out.compact, `${S.compact ? '完成版' : 'コンパクト版'}をコピーしました。`)}>{S.compact ? '完成版' : 'コンパクト版'}をコピー</button>
        </div>
      </div>

      <div class="panel">
        <label class="toggle"><span>ネガティブプロンプトを別欄に出す<small>Positiveには否定の指示を混ぜません。</small></span>
          <input type="checkbox" checked={S.negative} onChange={(e) => actions.setSettings({ negative: (e.target as HTMLInputElement).checked })} /></label>
        {S.negative && out.negative && (
          <>
            <textarea class="input prompt-box" style={{ minHeight: '90px' }} readOnly value={out.negative} aria-label="ネガティブプロンプト" />
            <div class="btns" style={{ marginTop: '8px' }}><button class="btn" type="button" onClick={() => actions.copy(out.negative, 'ネガティブをコピーしました。')}>ネガティブをコピー</button></div>
          </>
        )}
        {tagMode && S.outputTarget !== 'genericTags' && (
          <>
            <label class="toggle"><span>品質タグを先頭に付ける<small>{S.outputTarget === 'pixai' ? 'masterpiece, best quality' : 'best quality, very aesthetic, absurdres'}（よく使われる例。公式の最適化ではありません）</small></span>
              <input type="checkbox" checked={S.quality} onChange={(e) => actions.setSettings({ quality: (e.target as HTMLInputElement).checked })} /></label>
            <label class="toggle"><span>美形アンカーを強調する<small>{S.outputTarget === 'pixai' ? '(handsome:1.15) の形' : '{handsome} の形'}</small></span>
              <input type="checkbox" checked={S.emphasis} onChange={(e) => actions.setSettings({ emphasis: (e.target as HTMLInputElement).checked })} /></label>
          </>
        )}
        {tagMode && (
          <label class="toggle"><span>人数タグ「1boy」を付ける<small>LoRAで人物を指定する場合などは外せます。「solo, male focus」は残ります。</small></span>
            <input type="checkbox" checked={S.boyTag === '1boy'} onChange={(e) => actions.setSettings({ boyTag: (e.target as HTMLInputElement).checked ? '1boy' : 'none' })} /></label>
        )}
      </div>

      <div class="panel">
        <label class="field"><span>LoRA・トリガーワード（先頭に入ります）</span>
          <input class="input" value={S.loraText} maxLength={1000} placeholder="例：mychara, <lora:mychara:0.8>" onChange={(e) => actions.setSettings({ loraText: (e.target as HTMLInputElement).value })} />
        </label>
        <p class="count-note">書き方は使うサービスやモデルによって異なります。このアプリでは対応を検証していません。</p>
        <label class="field"><span>追記したいタグ（カンマ・改行区切り）</span>
          <textarea class="input" rows={3} value={S.freeTags} maxLength={4000} placeholder="例：night sky, cinematic" onChange={(e) => actions.setSettings({ freeTags: (e.target as HTMLTextAreaElement).value })} />
        </label>
        {out.warnings.length > 0 && <ul class="notes">{out.warnings.map((w) => <li key={w} class="note soft"><b>確認</b>{w}</li>)}</ul>}
      </div>

      <h2 class="section-title">タグの内訳</h2>
      {out.sections.filter((s) => s.tags.length).map((s) => (
        <div class="panel" key={s.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <b style={{ fontFamily: 'var(--mincho)' }}>{s.ja}</b>
            <button class="btn small" type="button" onClick={() => actions.copy(s.tags.join(', '), `${s.ja}のタグをコピーしました。`)}>この部分をコピー</button>
          </div>
          <ul class="tagline">{s.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ))}

      <h2 class="section-title">日本語の設定</h2>
      <div class="panel">
        <p style={{ marginTop: 0, fontFamily: 'var(--mincho)' }}>{out.japanese}</p>
        <dl class="kv">{out.japaneseLines.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      </div>
    </section>
  );
}
