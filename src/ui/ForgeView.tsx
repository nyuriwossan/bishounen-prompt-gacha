import { useEffect, useRef, useState } from 'preact/hooks';
import { BASIC_FIELDS, fieldDef, FIELDS, optionOf } from '../data/fields';
import { PRESET_GROUPS } from '../data/presets';
import { lockCount, presetPrefsConflicts } from '../engine/draw';
import { PERSON_EXTRA_FIELDS, PERSON_FIELDS, personLockStatus } from '../engine/person';
import { hasPrefs, isExcluded, isPrefOff, type DrawPrefs } from '../engine/prefs';
import { isActive, isEffective } from '../engine/state';
import { outfitColorUse, shotLevelOf, titleParts } from '../prompts/build';
import type { FieldGroup, FieldId, ForgeModules, ForgeState, Issue, Mode, PresetGroup, StylePreset } from '../types';
import { IconDice, IconLock } from './icons';
import { prefsSummary } from './DictView';
import type { AppActions } from './types';

const MODE_NOTE: Record<Mode, string> = {
  coherent: '世界観・衣装・髪・配色の相性を強く優先します。',
  balanced: '意外な組み合わせも混ぜつつ、致命的な矛盾は防ぎます。',
  wild: '美形の軸と物理的な矛盾だけ守り、時代も文化も混ぜて遊びます。'
};

const GROUPS: Array<{ id: FieldGroup; ja: string; hint: string; module?: keyof ForgeModules; moduleLabel?: string; moduleHint?: string }> = [
  { id: 'face', ja: '顔・肌・装身具', hint: '顔立ち・肌・特徴・眼鏡・ひげ' },
  { id: 'role', ja: '職業・雰囲気・色彩', hint: '立場・空気感・衣装の色' },
  { id: 'pose', ja: 'ポーズ・構図', hint: '画角・アングル・ポーズ・持ち物', module: 'poseEnabled', moduleLabel: 'ポーズ・アングルを出力する', moduleHint: 'OFFでも構図（画角）は出力します。' },
  { id: 'scene', ja: '背景・光', hint: '場所・時間帯・光', module: 'backgroundEnabled', moduleLabel: '背景と光を出力する', moduleHint: 'OFFにすると人物だけのプロンプトになります。' },
  { id: 'kemono', ja: '獣人モード（任意）', hint: '耳・尾・角などを加える', module: 'kemonoEnabled', moduleLabel: '獣人モードを使う', moduleHint: '顔は人のまま。獣化はケモミミ〜標準獣人まで。' },
  { id: 'cosplay', ja: 'コスプレ衣装（任意）', hint: 'メイド服・ビキニ・ミニスカ・バニーなど', module: 'cosplayEnabled', moduleLabel: 'コスプレ衣装から引く', moduleHint: '初期はOFF。ONの間、衣装は必ずコスプレ枠（15種）から引きます。おまかせスタイルの衣装の条件より優先します。通常の衣装も手で選べます。獣人ONでは耳付きの衣装を、禁断ONではセーラー服を自動では引きません。' },
  { id: 'forbidden', ja: '禁断の調合（アンリミテッド）', hint: '拘束・目隠し・着崩し・衣装の傷み', module: 'unlimitedEnabled', moduleLabel: 'アンリミテッドモードを使う', moduleHint: '初期はOFF。ONの間だけ、禁断演出を抽選・出力します。人物は成人男性1名のままです。プロンプト画面でネガティブもONにすると、人物の分裂や拘束具の混ざりを抑えやすくなります。' },
  { id: 'style', ja: '画風・呼び名', hint: '画風は抽選で変わりません' }
];
const EXTRA_MODULES: Array<{ key: keyof ForgeModules; ja: string; hint: string; group: FieldGroup }> = [
  { key: 'glassesEnabled', ja: '眼鏡を抽選に含める', hint: '既定はOFF。ONにすると眼鏡あり・なしの両方が出ます。', group: 'face' },
  { key: 'marksEnabled', ja: '特徴を抽選に含める', hint: '泣きぼくろ・傷・耳飾りなど。既定はOFF。', group: 'face' },
  { key: 'facialHairEnabled', ja: 'ひげを抽選に含める', hint: '既定はOFF。年齢が高いほど出やすくなります。', group: 'face' },
  { key: 'hairAccentEnabled', ja: '髪の配色拡張（グラデ・メッシュ）', hint: '差し色の髪色を加えます。', group: 'face' },
  { key: 'propEnabled', ja: '持ち物を抽選に含める', hint: '剣・本・グラスなど。既定はOFF。ポーズを出力するときだけ使います。', group: 'pose' },
  { key: 'nameEnabled', ja: '呼び名を付ける', hint: '画像プロンプトには含めません。', group: 'style' }
];

interface Props {
  forge: ForgeState; title: string; issues: Issue[]; changed: FieldId[]; sweep: number; actions: AppActions;
  canUndo: boolean; canRedo: boolean; presets: StylePreset[]; pendingPreset: StylePreset | null; prefs: DrawPrefs;
}

export function ForgeView({ forge, title, issues, changed, sweep, actions, canUndo, canRedo, presets, pendingPreset, prefs }: Props) {
  const labelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = labelRef.current;
    if (!el || !sweep) return;
    el.classList.remove('sweep');
    void el.offsetWidth;
    el.classList.add('sweep');
  }, [sweep]);
  const locks = lockCount(forge);
  // 辞書・抽選設定でOFFにした項目は、ラベルにも出さない
  const o = (f: FieldId) => (isPrefOff(f) ? undefined : optionOf(f, forge.fields[f].id));
  const summary = prefsSummary(forge, prefs);
  const presetWarn = pendingPreset ? presetPrefsConflicts(forge, pendingPreset) : [];
  const presetOff = pendingPreset ? (Object.keys(pendingPreset.filters) as FieldId[]).filter((f) => isPrefOff(f)) : [];
  const traits = [o('age')?.ja.split('｜')[0], o('world')?.ja, o('build')?.ja, o('presentation')?.ja].filter(Boolean) as string[];
  const name = forge.optionalModules.nameEnabled ? o('name') : undefined;
  const mode = forge.settings.coherence;
  const [presetGroupRaw, setPresetGroup] = useState<PresetGroup | 'all'>('all');
  // 禁断のスタイルは、禁断の調合がONのときだけ見せる
  const unlimited = forge.optionalModules.unlimitedEnabled;
  const presetGroup = !unlimited && presetGroupRaw === 'forbidden' ? 'all' : presetGroupRaw;
  const groups = PRESET_GROUPS.filter((g) => unlimited || g.id !== 'forbidden');
  // 完全ランダム（分類なし）は常に先頭。分類を切り替えても、選択中のスタイルは解除しない
  const shownPresets = presets.filter((p) => (unlimited || p.group !== 'forbidden') && (!p.group || presetGroup === 'all' || p.group === presetGroup));

  return (
    <section class="screen" aria-label="錬成">
      <article class="label" ref={labelRef} aria-live="polite">
        <div class="label-head"><span>錬成 第{forge.drawCount}号</span><span>seed {forge.lastSeed || '—'}</span></div>
        <h2 class="label-title" aria-label={title}>{titleParts(forge).map((t, i) => <span key={i} class="phrase">{t}</span>)}</h2>
        {name && <p class="label-name"><span class="label-name-key">呼び名</span>{name.ja}</p>}
        <ul class="label-traits">
          {traits.map((t) => <li key={t}>{t}</li>)}
          {o('hairColor') && <li><span class="swatch" style={{ background: o('hairColor')!.hex }} />{o('hairColor')!.ja}</li>}
          {o('eyeColor') && <li><span class="swatch" style={{ background: o('eyeColor')!.hex }} />{o('eyeColor')!.ja}</li>}
        </ul>
      </article>

      <PersonBar forge={forge} actions={actions} />

      <div class="controls">
        <div>
          <div class="seg" role="group" aria-label="抽選モード">
            {(['coherent', 'balanced', 'wild'] as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => actions.setSettings({ coherence: m })}>
                {m === 'coherent' ? 'まとまり重視' : m === 'balanced' ? 'バランス' : 'カオス'}
              </button>
            ))}
          </div>
          <p class="mode-note">{MODE_NOTE[mode]}</p>
        </div>

        <div>
          <div class="cats preset-groups" role="group" aria-label="おまかせスタイルの分類">
            {groups.map((g) => (
              <button key={g.id} type="button" class="chip" aria-pressed={presetGroup === g.id} onClick={() => setPresetGroup(g.id)}>{g.ja}</button>
            ))}
          </div>
          <div class="presets" role="group" aria-label="おまかせスタイル">
            {shownPresets.map((p) => (
              <button key={p.id} type="button" class="chip" aria-pressed={pendingPreset?.id === p.id} onClick={() => actions.choosePreset(pendingPreset?.id === p.id ? null : p)}>
                <span aria-hidden="true">{p.icon} </span>{p.ja}
              </button>
            ))}
          </div>
          {pendingPreset && (
            <div class="preset-pending">
              <span><b>{pendingPreset.ja}</b>：{pendingPreset.desc}<br /><small>選んだだけでは変わりません。固定中の項目はそのまま残ります。</small>
                {presetWarn.map((w) => <small key={w.field} class="warn-line" role="alert">{w.message}</small>)}
                {presetOff.length > 0 && <small class="warn-line">{presetOff.map((f) => `「${fieldDef(f).short ?? fieldDef(f).ja}」`).join('')}は辞書・抽選設定でOFFのため、このスタイルの条件のうちその項目は反映されません。</small>}
              </span>
              <span class="btns">
                <button class="btn small primary" type="button" onClick={actions.forgeAll}>この方向で錬成</button>
                <button class="btn small" type="button" onClick={() => actions.choosePreset(null)}>やめる</button>
              </span>
            </div>
          )}
        </div>

        <div class="lockbar">
          <span class="count">{locks ? <>固定中 <b>{locks}</b> 件</> : '固定はありません'}</span>
          <span class="btns">
            <button class="chip quiet" type="button" onClick={actions.unlockAll} disabled={!locks} title="値は消さずに、固定だけを外します">ロック全解除</button>
            <button class="chip quiet" type="button" onClick={actions.undo} disabled={!canUndo} aria-label="元に戻す">戻す</button>
            <button class="chip quiet" type="button" onClick={actions.redo} disabled={!canRedo} aria-label="やり直す">進む</button>
          </span>
        </div>

        {hasPrefs(prefs) || summary ? (
          <div class="prefs-bar">
            <span><b>好み設定あり</b>：{summary || '設定あり'}</span>
            <button class="btn small" type="button" onClick={() => actions.openDict()}>設定を開く</button>
          </div>
        ) : (
          <div class="prefs-bar quiet">
            <span>抽選に出す候補を、項目ごとに選べます。</span>
            <button class="chip quiet" type="button" onClick={() => actions.openDict()}>辞書・抽選設定</button>
          </div>
        )}

        <div class="row-actions" role="group" aria-label="部分的に引き直す">
          <button class="chip" type="button" onClick={() => actions.drawGroup('direction')} title="年齢・美形タイプ・容姿傾向・世界観・意匠を保って、他を引き直します">同じ方向性で引く</button>
          <button class="chip" type="button" onClick={() => actions.drawGroup('outfit')}>服だけ着せ替え</button>
          <button class="chip" type="button" onClick={() => actions.drawGroup('hair')}>髪だけ変える</button>
          <button class="chip" type="button" onClick={() => actions.drawGroup('expression')}>表情・構図だけ</button>
          {forge.optionalModules.unlimitedEnabled && <button class="chip" type="button" onClick={() => actions.drawGroup('forbidden')}>禁断演出だけ引き直す</button>}
        </div>
      </div>

      <section class="formula" aria-labelledby="basic-title">
        <h2 id="basic-title">基本の処方</h2>
        <ul class="rows">
          {BASIC_FIELDS.map((f) => <FieldRow key={f} field={f} forge={forge} actions={actions} changed={changed.includes(f)} />)}
        </ul>

        <h2>詳細な調合</h2>
        {GROUPS.map((g) => {
          const fields = FIELDS.filter((x) => x.group === g.id).map((x) => x.id);
          const extras = EXTRA_MODULES.filter((m) => m.group === g.id);
          return (
            <details class="group" key={g.id}>
              <summary><span>{g.ja}</span><span class="hint">{g.hint}</span></summary>
              <div class="group-body">
                {g.module && (
                  <label class="toggle">
                    <span>{g.moduleLabel}<small>{g.moduleHint}</small></span>
                    <input type="checkbox" checked={forge.optionalModules[g.module]} onChange={(e) => actions.setModule(g.module!, (e.target as HTMLInputElement).checked)} />
                  </label>
                )}
                {extras.map((m) => (
                  <label class="toggle" key={m.key}>
                    <span>{m.ja}<small>{m.hint}</small></span>
                    <input type="checkbox" checked={forge.optionalModules[m.key]} onChange={(e) => actions.setModule(m.key, (e.target as HTMLInputElement).checked)} />
                  </label>
                ))}
                {/* 禁断の調合はONのときだけ項目を見せる */}
                {(g.id !== 'forbidden' || forge.optionalModules.unlimitedEnabled) && (
                  <ul class="rows">
                    {fields.map((f) => <FieldRow key={f} field={f} forge={forge} actions={actions} changed={changed.includes(f)} />)}
                  </ul>
                )}
              </div>
            </details>
          );
        })}

        <details class="group">
          <summary><span>抽選の設定</span><span class="hint">シード・重複回避</span></summary>
          <div class="group-body">
            <label class="field">
              <span>固定シード（空欄なら毎回ランダム）</span>
              <input class="input" value={forge.settings.seed} maxLength={64} placeholder={`例：${forge.lastSeed || 'abc12345'}`}
                onChange={(e) => actions.setSettings({ seed: (e.target as HTMLInputElement).value.trim() })} />
            </label>
            <p class="count-note">同じシード・同じ辞書の版・同じ固定と設定（辞書・抽選設定の抽選対象を含む）なら、同じ美青年が出ます。画像生成サービス側のseedとは別物です。固定シード中は「直近と同じ候補を避ける」働きを止めます。</p>
            <div class="btns">
              <button class="btn small" type="button" onClick={() => actions.setSettings({ seed: forge.lastSeed })} disabled={!forge.lastSeed}>直前のシードを固定</button>
              <button class="btn small" type="button" onClick={() => actions.setSettings({ seed: '' })} disabled={!forge.settings.seed}>固定をやめる</button>
            </div>
            <label class="field">
              <span>直近と同じ候補を避ける回数：{forge.settings.keepRecentCount}</span>
              <input type="range" min={0} max={20} value={forge.settings.keepRecentCount} onInput={(e) => actions.setSettings({ keepRecentCount: Number((e.target as HTMLInputElement).value) })} />
            </label>
          </div>
        </details>
      </section>

      {issues.length > 0 && (
        <section aria-labelledby="advice-title">
          <h2 class="section-title" id="advice-title">調合メモ</h2>
          <ul class="notes">
            {issues.map((i) => (
              <li key={i.id} class={`note ${i.level}`}>
                <b>{i.level === 'hard' ? '矛盾' : i.level === 'soft' ? '相性' : '補足'}：{i.titleJa}</b>{i.messageJa}
                {i.level === 'hard' && (
                  <div class="acts"><button class="btn small" type="button" onClick={() => actions.redrawRelated(i.fields.filter((f) => !forge.fields[f].locked))}>未固定の側を引き直す</button></div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function FieldRow({ field, forge, actions, changed }: { field: FieldId; forge: ForgeState; actions: AppActions; changed: boolean }) {
  const def = fieldDef(field);
  const sel = forge.fields[field];
  const opt = optionOf(field, sel.id);
  const active = isActive(forge, field);
  const accentIdle = active && !isEffective(forge, field);
  const randomizable = def.randomizable !== false;
  const swatches: string[] = opt?.hex ? [opt.hex] : [];
  // 衣装の行：この服・この画角で実際にプロンプトへ出る色だけを、名前付きの◯として出す。タップでその色の候補を開く
  const outfitColors: Array<{ f: FieldId; key: string }> = [];
  if (field === 'outfit' && active) {
    const use = outfitColorUse(opt, shotLevelOf(forge));
    if (use.main) outfitColors.push({ f: 'mainColor', key: 'メイン' });
    if (use.accent) outfitColors.push({ f: 'accentColor', key: '差し色' });
  }
  // 辞書・抽選設定でOFF：抽選・手動の変更はせず、値と固定は保つ。押すと理由と設定への導線を出す
  const prefOff = isPrefOff(field);
  const excludedNow = active && randomizable && !!opt && isExcluded(field, opt.id);
  const status = prefOff ? 'OFF（辞書・抽選設定）' : !active ? '出力しない' : accentIdle ? (field === 'hairAccentColor' ? '単色のため未使用' : '未使用') : sel.source === 'manual' ? '手動' : sel.source === 'preset' ? 'おまかせ' : '';
  const openMain = prefOff
    ? () => actions.toast({ text: `「${def.ja}」は辞書・抽選設定でOFFにしています。抽選・出力をせず、値と固定はそのまま保っています。`, action: { label: '設定を開く', run: () => actions.openDict(field) } }, 5000)
    : () => actions.openPicker(field);
  return (
    <li class={`frow${sel.locked ? ' locked' : ''}${!active || accentIdle ? ' inactive' : ''}${changed ? ' changed' : ''}`}>
      <button type="button" class="fmain" onClick={openMain} aria-label={`${def.ja}：${opt?.ja ?? '未設定'}。${prefOff ? '辞書・抽選設定でOFF。設定を開く案内を表示' : '候補から選ぶ'}${excludedNow ? '。現在の値は抽選対象外' : ''}`}>
        <span class="flabel">{def.ja}{status && <span class="src">{status}</span>}</span>
        <span class={`fval${opt ? '' : ' empty'}`}>
          {swatches.map((h) => <span key={h} class="swatch" style={{ background: h }} />)}
          {opt?.ja ?? '未設定'}
        </span>
        {excludedNow && <span class="fnote">{sel.locked ? '抽選対象外の値ですが、固定中のため保持しています' : '現在の値は抽選対象外です。次回の抽選から反映'}</span>}
      </button>
      <button type="button" class={`fbtn${sel.locked ? ' on' : ''}`} aria-pressed={sel.locked} aria-label={`${def.ja}を${sel.locked ? '固定解除' : '固定'}`} onClick={() => actions.toggleLock(field)}>
        <IconLock on={sel.locked} />
      </button>
      <button type="button" class="fbtn" aria-label={prefOff ? `${def.ja}はOFFのため抽選しません` : randomizable ? `${def.ja}だけ再抽選` : `${def.ja}は抽選しません`} disabled={!randomizable || !active}
        onClick={() => actions.reroll(field)} style={!randomizable || !active ? { opacity: 0.3 } : undefined}>
        <IconDice />
      </button>
      {outfitColors.length > 0 && (
        <div class="fcolors" role="group" aria-label="衣装の色">
          {outfitColors.map(({ f, key }) => {
            const c = optionOf(f, forge.fields[f].id);
            const locked = forge.fields[f].locked;
            return (
              <button key={f} type="button" class={`cchip${locked ? ' on' : ''}`} data-color-field={f} onClick={() => actions.openPicker(f)}
                aria-label={`${key}：${c?.ja ?? '未設定'}${locked ? '（固定中）' : ''}。色の候補から選ぶ`}>
                {c?.hex && <span class="swatch" style={{ background: c.hex }} />}
                <span class="ckey">{key}</span>
                <span class="cname">{c?.ja ?? '未設定'}</span>
                {locked && <IconLock on />}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}

/** 人物の一括固定と衣装3案の入口。固定範囲の調整は、各項目の既存の鍵をそのまま切り替える（別の固定情報は持たない） */
function PersonBar({ forge, actions }: { forge: ForgeState; actions: AppActions }) {
  const st = personLockStatus(forge);
  const all = st.targets.length > 0 && st.locked.length === st.targets.length;
  const extras = PERSON_EXTRA_FIELDS.filter((f) => isActive(forge, f) && !!forge.fields[f].id);
  const rows = [...PERSON_FIELDS.filter((f) => st.targets.includes(f)), ...extras];
  const outfitOff = isPrefOff('outfit');
  return (
    <>
      <div class="person-bar" role="group" aria-label="この人物で">
        <button class="chip" type="button" onClick={actions.lockPerson} disabled={all} aria-describedby="person-lock-note">
          {all ? '人物を固定中' : 'この人物を固定'}
        </button>
        <button class="chip" type="button" onClick={actions.openWardrobe} title={outfitOff ? '衣装は辞書・抽選設定でOFFです' : '顔・髪などはそのまま、衣装だけ3案を比べます'}>衣装を3案見る</button>
      </div>
      {st.locked.length > 0 && (
        <details class="person-status">
          <summary>
            <span id="person-lock-note">人物の固定：<b>{st.locked.length}</b> / {st.targets.length}項目（値は変えていません）</span>
            <span class="adj">固定する項目を調整</span>
          </summary>
          <p class="count-note">チェックは各項目の鍵と同じです。外した項目は次の錬成で変わります。世界観・職業・呼び名も必要なら固定できます（衣装3案では、固定しなくても変えません）。</p>
          <ul class="plocks">
            {rows.map((f) => (
              <li key={f}>
                <label>
                  <input type="checkbox" checked={forge.fields[f].locked} onChange={() => actions.toggleLock(f)} />
                  <span>{fieldDef(f).short ?? fieldDef(f).ja}<br /><span class="val">{optionOf(f, forge.fields[f].id)?.ja ?? '—'}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
