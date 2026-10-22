#!/usr/bin/env node
/* ブラウザ検証（Chromium / Playwright）
 *   npm run build && npm run test:browser
 * - GitHub Pages と同じサブパス（/bishounen-prompt-gacha/）で dist/ を配信して確認する
 * - 320 / 375 / 390 / 768 / 1280px で横スクロール・実行時エラーを確認
 * - 錬成・固定・戻す・候補選択・コピー（権限なし→手動コピー欄）・保存と再読込・共有URL・reduced motion・容量不足
 * PLAYWRIGHT_CHROMIUM に実行ファイルを指定可能。WebKit（Safari）は環境にあれば BROWSER=webkit で実行。
 */
import { Buffer } from 'node:buffer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright-core';

const ROOT = path.resolve('dist');
const BASE = '/bishounen-prompt-gacha/';
const OUT = path.resolve('docs/test-artifacts');
const SHOTS = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error('dist/ がありません。先に npm run build を実行してください。'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); res.end('not found'); return; }
  let rel = decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}${BASE}`;

const engine = process.env.BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  // 外部フォントは検証環境で取得できない場合があるため遮断（システムの明朝で表示される）
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|fonts\.g/.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}
const title = (p) => p.locator('.label-title').getAttribute('aria-label');
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

try {
  // ---- 1. 画面幅ごとの表示 ----
  for (const [w, h] of [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800]]) {
    const { ctx, page, errors } = await newPage({ width: w, height: h });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check(`${w}px：初回から完成した美青年が表示される`, (await title(page))?.length > 2);
    check(`${w}px：横スクロールが起きない`, (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);
    if ([320, 390, 1280].includes(w)) await page.screenshot({ path: path.join(SHOTS, `forge-${w}.jpg`), type: 'jpeg', quality: 72 });
    // すべての詳細を開いても崩れない
    await page.$$eval('details.group', (ds) => ds.forEach((d) => (d.open = true)));
    check(`${w}px：詳細をすべて開いても横スクロールなし`, (await overflow(page)) <= 0);
    // 全項目を固定しても崩れない
    for (const b of await page.$$('.frow .fbtn[aria-pressed="false"]')) await b.click();
    check(`${w}px：全項目を固定しても横スクロールなし`, (await overflow(page)) <= 0);
    const tapOk = await page.$$eval('.frow .fbtn, .forge-btn, .tabbar button', (els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.width >= 40 && r.height >= 40; }));
    check(`${w}px：主要なタップ領域が40px以上`, tapOk);
    check(`${w}px：実行時エラーなし`, errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 2. 主要操作（390px） ----
  {
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    const t1 = await title(page);
    await page.click('.forge-btn');
    await page.waitForTimeout(150);
    const t2 = await title(page);
    check('錬成ボタンで結果が変わる', (await page.textContent('.label-head')).includes('第2号'));
    await page.click('button[aria-label="元に戻す"]');
    check('戻すで直前の結果に戻る', (await title(page)) === t1, `${t1} / ${t2}`);
    await page.click('button[aria-label="やり直す"]');
    check('進むでやり直せる', (await title(page)) === t2);

    // 固定：年齢と美形タイプを固定して5回錬成
    await page.click('.frow >> nth=0 >> .fbtn >> nth=0');
    await page.click('.frow >> nth=1 >> .fbtn >> nth=0');
    const ageText = await page.textContent('.frow >> nth=0 >> .fval');
    const archText = await page.textContent('.frow >> nth=1 >> .fval');
    for (let i = 0; i < 5; i++) { await page.click('.forge-btn'); await page.waitForTimeout(60); }
    check('固定した項目は錬成しても変わらない', (await page.textContent('.frow >> nth=0 >> .fval')) === ageText && (await page.textContent('.frow >> nth=1 >> .fval')) === archText);
    check('固定件数が表示される', (await page.textContent('.lockbar .count')).includes('2'));
    // 固定中のサイコロは解除を促す
    await page.click('.frow >> nth=0 >> .fbtn >> nth=1');
    check('固定中の項目のサイコロで解除を促す', await page.isVisible('.toast >> text=固定を外して引く'));
    await page.click('text=ロック全解除');
    check('ロック全解除で値を残して固定だけ外れる', (await page.textContent('.lockbar .count')).includes('固定はありません') && (await page.textContent('.frow >> nth=0 >> .fval')) === ageText);

    // 1項目再抽選：瞳の色だけ
    const before = await page.$$eval('.rows >> nth=0 >> .fval', () => 0).catch(() => 0);
    void before;
    const vals = async () => page.$$eval('.formula > .rows > .frow .fval', (els) => els.map((e) => e.textContent));
    const v1 = await vals();
    await page.click('button[aria-label="瞳の色だけ再抽選"]');
    await page.waitForTimeout(100);
    const v2 = await vals();
    const diffIdx = v1.map((x, i) => (x !== v2[i] ? i : -1)).filter((i) => i >= 0);
    check('1項目再抽選は他の基本項目を変えない', diffIdx.every((i) => i === 10), `changed=${diffIdx}`);

    // 候補選択：髪色を検索して採用（採用後に固定）
    await page.click('.frow:has-text("髪の色") .fmain');
    await page.waitForSelector('dialog.sheet[open]');
    await page.fill('dialog.sheet input[type=search]', '銀');
    await page.click('dialog.sheet .opt button.pick:has-text("銀髪")');
    await page.waitForTimeout(150);
    const hairRow = page.locator('.frow:has-text("髪の色")').first();
    check('候補選択で採用でき、採用後に固定される', (await hairRow.textContent()).includes('銀髪') && (await hairRow.locator('.fbtn').first().getAttribute('aria-pressed')) === 'true');
    // 検索0件
    await page.click('.frow:has-text("衣装") .fmain >> nth=0');
    await page.fill('dialog.sheet input[type=search]', 'zzzzzz');
    check('検索結果0件の案内が出る', await page.isVisible('dialog.sheet .empty'));
    await page.click('dialog.sheet button[aria-label="閉じる"]');
    await page.waitForSelector('dialog.sheet', { state: 'detached' });
    check('候補選択を閉じても結果は変わらない', (await hairRow.textContent()).includes('銀髪'));

    const outfitBefore = await page.textContent('.frow:has-text("衣装") .fval >> nth=0');
    let outfitChanged = false;
    for (let i = 0; i < 3 && !outfitChanged; i++) {
      await page.click('text=服だけ着せ替え');
      await page.waitForTimeout(250);
      outfitChanged = (await page.textContent('.frow:has-text("衣装") .fval >> nth=0')) !== outfitBefore;
    }
    check('服だけ着せ替えで衣装が変わり、固定した髪色は残る', outfitChanged && (await hairRow.textContent()).includes('銀髪'));

    // 衣装の色◯：名前付きで、実際に出力される色だけを出し、タップでその色の候補が開く
    const adopt = async (opener, query, ja) => {
      await page.click(opener);
      await page.waitForSelector('dialog.sheet[open]');
      await page.fill('dialog.sheet input[type=search]', query);
      await page.click(`dialog.sheet button.pick[aria-label^="${ja}を採用"]`);
      await page.waitForSelector('dialog.sheet', { state: 'detached' });
    };
    const colorKeys = async () => (await page.$$eval('.frow .fcolors .ckey', (els) => els.map((e) => e.textContent))).join(',');
    await adopt('.formula > .rows > .frow:has-text("衣装") .fmain', 'スリーピース', 'スリーピーススーツ');
    check('衣装を手で選ぶと、自動で出た色を服に合わせて引き直す', await page.isVisible('.toast >> text=服に合わせて引き直しました'));
    await page.click('details.group summary:has-text("ポーズ・構図")');
    await adopt('.frow:has-text("構図（画角）") .fmain', '全身', '全身');
    check('衣装の◯に「メイン・差し色」の名前が付く', (await colorKeys()) === 'メイン,差し色', await colorKeys());
    await page.click('.fcolors button[data-color-field="accentColor"]');
    await page.waitForSelector('dialog.sheet[open]');
    const sheetTitle = await page.textContent('#picker-title');
    await page.fill('dialog.sheet input[type=search]', '深紅');
    await page.click('dialog.sheet button.pick[aria-label^="深紅を採用"]');
    await page.waitForSelector('dialog.sheet', { state: 'detached' });
    const accentChip = page.locator('.fcolors button[data-color-field="accentColor"]');
    check('差し色の◯をタップすると差し色の候補が開き、選んだ色が◯に反映される',
      sheetTitle === '差し色を選ぶ' && (await accentChip.textContent()).includes('深紅') && (await accentChip.getAttribute('class')).includes('on'), sheetTitle);
    await page.evaluate(() => document.querySelector('.frow .fcolors').scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(SHOTS, 'outfit-colors-390.jpg'), type: 'jpeg', quality: 70 });
    await adopt('.frow:has-text("構図（画角）") .fmain', '顔アップ', '顔アップ');
    check('顔アップでは出力されない差し色の◯を出さない', (await colorKeys()) === 'メイン', await colorKeys());
    await adopt('.formula > .rows > .frow:has-text("衣装") .fmain', '白シャツ', '白シャツとスラックス');
    check('顔アップの白シャツでは色の◯を出さない', (await colorKeys()) === '', await colorKeys());
    await page.click('text=ロック全解除');

    // おまかせスタイル：選ぶだけでは変わらない
    const tBefore = await title(page);
    await page.click('.presets .chip:has-text("銀髪特集")');
    check('おまかせスタイルは選んだだけでは結果を変えない', (await title(page)) === tBefore && (await page.isVisible('.preset-pending')));
    await page.click('.preset-pending >> text=この方向で錬成');
    await page.waitForTimeout(100);

    // おまかせスタイルの分類：切り替えだけでは錬成せず、選択中のスタイルは表示し続ける
    const tGroup = await title(page);
    await page.click('.preset-groups .chip:has-text("現代・日常")');
    const shown = await page.$$eval('.presets .chip', (els) => els.map((e) => e.textContent.trim()));
    check('分類「現代・日常」で、完全ランダムと現代系のスタイルだけに絞られる',
      shown.length === 6 && shown.some((x) => x.includes("働く大人・職人")) && shown[0].includes('完全ランダム') && shown.some((x) => x.includes('ダウナー・気だるい')) && !shown.some((x) => x.includes('銀髪特集')), shown.join('/'));
    check('分類を切り替えても錬成せず、別分類の選択中スタイルを表示し続ける', (await title(page)) === tGroup && (await page.textContent('.preset-pending')).includes('銀髪特集'));
    await page.click('.preset-pending >> text=やめる');
    await page.click('.presets .chip:has-text("現代・日常のイケメン")');
    await page.click('.preset-pending >> text=この方向で錬成');
    await page.waitForTimeout(150);
    await page.click('.preset-pending >> text=やめる');
    await page.click('.preset-groups .chip:has-text("すべて")');

    // 禁断の調合：既定OFFで項目も出さない。ONで項目と「禁断演出だけ引き直す」が出る
    await page.click('details.group summary:has-text("禁断の調合")');
    check('禁断の調合は既定OFFで、項目を表示しない', (await page.locator('details.group:has-text("禁断の調合") .frow').count()) === 0 && !(await page.isVisible('text=禁断演出だけ引き直す')));
    await page.click('label.toggle:has-text("アンリミテッドモードを使う") input');
    await page.waitForTimeout(200);
    const fbRows = page.locator('details.group:has-text("禁断の調合") .frow');
    const fbVals = async () => fbRows.evaluateAll((els) => els.map((e) => e.querySelector('.fval').textContent));
    check('ONにすると、禁断演出の9項目と引き直しボタンが出る', (await fbRows.count()) === 9 && (await page.isVisible('text=禁断演出だけ引き直す')));
    check('ONのときだけ、おまかせスタイルに「禁断」の分類が出る', await page.isVisible('.preset-groups .chip:has-text("禁断")'));
    await page.click('.preset-groups .chip:has-text("禁断")');
    const fbPresets = await page.$$eval('.presets .chip', (els) => els.map((e) => e.textContent.trim()));
    check('「禁断」の分類で、禁断のスタイル5種が選べる', fbPresets.length === 6 && fbPresets.some((x) => x.includes('囚われの王子')), fbPresets.join('/'));
    await page.click('.presets .chip:has-text("鎖と地下牢")');
    const hairBefore = await page.textContent('.frow:has-text("髪の色") .fval');
    const fb1 = await fbVals();
    let fbChanged = false;
    for (let i = 0; i < 4 && !fbChanged; i++) { await page.click('text=禁断演出だけ引き直す'); await page.waitForTimeout(200); fbChanged = (await fbVals()).join('|') !== fb1.join('|'); }
    check('「禁断演出だけ引き直す」は禁断演出を変え、髪の色は変えない', fbChanged && (await page.textContent('.frow:has-text("髪の色") .fval')) === hairBefore);
    await page.evaluate(() => document.querySelector('details.group[open]:last-of-type')?.scrollIntoView({ block: 'start' }));
    await page.locator('details.group:has-text("禁断の調合")').screenshot({ path: path.join(SHOTS, 'forbidden-390.jpg'), type: 'jpeg', quality: 70 });
    await page.click('label.toggle:has-text("アンリミテッドモードを使う") input');
    await page.waitForTimeout(150);
    check('OFFに戻すと、項目と引き直しボタンが消える', (await fbRows.count()) === 0 && !(await page.isVisible('text=禁断演出だけ引き直す')));
    check('OFFに戻すと、禁断の分類が消え、選んでいた禁断のスタイルも外れる', !(await page.isVisible('.preset-groups .chip:has-text("禁断")')) && !(await page.isVisible('.preset-pending')));
    await page.click('details.group summary:has-text("禁断の調合")');

    // コスプレ衣装：既定OFF。ONの間は衣装をコスプレ枠だけから引く
    const COSPLAY = ['メイド服（ロング）', 'ミニスカメイド', 'ビキニ', '紐ビキニ', '水着と開襟シャツ', 'ミニスカナース', 'ミニスカセーラー服', 'バニーボーイ', '逆バニー', 'ミニスカチャイナ', 'ミニスカポリス', 'ミニスカサンタ', 'チアリーダー', 'ハーネスと開襟シャツ', 'サーカス団長'];
    const outfitVal = async () => (await page.textContent('.frow >> nth=11 >> .fval')).trim();
    const isCos = (v) => COSPLAY.some((n) => v.startsWith(n));
    check('コスプレ衣装は既定OFFで、衣装はコスプレ以外', !isCos(await outfitVal()), await outfitVal());
    await page.click('.frow >> nth=11 >> .fval');
    await page.waitForSelector('dialog.sheet');
    check('OFFの間は、衣装の候補に「コスプレ」の分類を出さない', !(await page.isVisible('dialog.sheet .cats .chip:has-text("コスプレ")')));
    await page.click('dialog.sheet .sheet-head .icon-btn');
    await page.waitForTimeout(150);
    await page.click('details.group summary:has-text("コスプレ衣装")');
    await page.click('label.toggle:has-text("コスプレ衣装から引く") input');
    await page.waitForTimeout(200);
    let cosAll = isCos(await outfitVal());
    const cosSeen = [await outfitVal()];
    for (let i = 0; i < 4; i++) { await page.click('.forge-btn'); await page.waitForTimeout(150); cosSeen.push(await outfitVal()); cosAll = cosAll && isCos(cosSeen.at(-1)); }
    check('ONにすると衣装がコスプレになり、錬成してもコスプレ枠から引く', cosAll, cosSeen.join(' / '));
    await page.locator('.frow >> nth=11').screenshot({ path: path.join(SHOTS, 'cosplay-outfit-390.jpg'), type: 'jpeg', quality: 70 });
    await page.click('label.toggle:has-text("コスプレ衣装から引く") input');
    await page.waitForTimeout(200);
    check('OFFに戻すと、コスプレ衣装を通常の衣装に引き直す', !isCos(await outfitVal()), await outfitVal());
    await page.click('details.group summary:has-text("コスプレ衣装")');

    // 眼鏡・特徴・持ち物：既定OFF。ONにするとその場で値が入る
    await page.click('details.group summary:has-text("顔・肌・装身具")');
    const glassesRow = page.locator('.frow:has-text("眼鏡")').first();
    check('眼鏡・特徴・持ち物は既定でOFF（出力しない）',
      (await glassesRow.textContent()).includes('出力しない') && (await page.locator('.frow:has-text("特徴（ほくろ")').first().textContent()).includes('出力しない'));
    await page.click('label.toggle:has-text("眼鏡を抽選に含める") input');
    await page.waitForTimeout(150);
    check('眼鏡をONにすると、行が有効になり「なし」以外の眼鏡が入る', !(await glassesRow.textContent()).includes('出力しない') && !(await glassesRow.locator('.fval').textContent()).includes('なし'), await glassesRow.locator('.fval').textContent());
    await page.click('label.toggle:has-text("眼鏡を抽選に含める") input');
    await page.click('details.group summary:has-text("顔・肌・装身具")');

    // プロンプト画面
    await page.click('.tabbar button >> nth=1');
    const prompt = await page.inputValue('#prompt-main');
    check('プロンプトに男性1名・美形アンカーが含まれる', /1boy/.test(prompt) && /male focus/.test(prompt) && /handsome/.test(prompt));
    for (const label of ['NovelAI', '汎用タグ', '自然な英文', '日本語設定']) {
      await page.click(`.target-row button:has-text("${label}")`);
      check(`出力形式「${label}」に切り替えられる`, (await page.inputValue('#prompt-main')).length > 20);
    }
    await page.screenshot({ path: path.join(SHOTS, 'prompt-390.jpg'), type: 'jpeg', quality: 70 });

    // 保存と再読込
    await page.click('.tabbar button >> nth=2');
    await page.fill('.panel input.input >> nth=0', 'テストの君');
    await page.click('text=この美青年を保存');
    check('お気に入りに保存できる', await page.isVisible('.item h3:has-text("テストの君")'));
    await page.click('.tabbar button >> nth=0');
    const tSaved = await title(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('再読込しても現在の美青年が残る（自動保存）', (await title(page)) === tSaved);
    await page.click('.tabbar button >> nth=2');
    check('再読込してもお気に入りが残る', await page.isVisible('.item h3:has-text("テストの君")'));
    await page.screenshot({ path: path.join(SHOTS, 'saved-390.jpg'), type: 'jpeg', quality: 70 });
    // キーボード操作：Tab で錬成ボタンに到達できる
    await page.click('.tabbar button >> nth=0');
    const head = await page.textContent('.label-head');
    await page.focus('.forge-btn');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    check('キーボードで錬成できる', (await page.textContent('.label-head')) !== head);
    check('主要操作で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 2c. 2026-10 増築の任意項目（年齢の表れ・髪質・前髪・視線・頭の向き・衣装の細部・素材）----
  for (const w of [320, 390]) {
    const { ctx, page, errors } = await newPage({ width: w, height: 760 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    const NEW = [['年齢の表れを抽選に含める', '年齢の表れ'], ['髪質を抽選に含める', '髪質'], ['前髪・分け目を抽選に含める', '前髪・分け目'], ['視線を個別に引く', '視線'], ['頭の向きを個別に引く', '頭の向き'], ['衣装の細部を抽選に含める', '衣装の細部'], ['素材を抽選に含める', '素材']];
    await page.$$eval('details.group', (ds) => ds.forEach((d) => (d.open = true)));
    const rowOf = (ja) => page.locator('.frow').filter({ has: page.locator(`.fmain[aria-label^="${ja}："]`) }).first();
    const offAll = [];
    for (const [, ja] of NEW) offAll.push(((await rowOf(ja).count()) === 0) || (await rowOf(ja).textContent()).includes('出力しない'));
    check(`${w}px：増築の7項目は既定でOFF（出力しない）`, offAll.every(Boolean), offAll.join(','));
    for (const [label] of NEW) { await page.click(`label.toggle:has-text("${label}") input`); await page.waitForTimeout(60); }
    await page.$$eval('details.group', (ds) => ds.forEach((d) => (d.open = true)));
    const vals = [];
    for (const [, ja] of NEW) vals.push((await rowOf(ja).count()) ? (await rowOf(ja).locator('.fval').textContent()).trim() : '(行なし)');
    check(`${w}px：ONにすると7項目の行が有効になる`, vals.every((v) => v && v !== '(行なし)'), vals.join(' / '));
    check(`${w}px：7項目をONにして詳細をすべて開いても横スクロールなし`, (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);
    const tapOk = await page.$$eval('.frow .fbtn', (els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.width >= 40 && r.height >= 40; }));
    check(`${w}px：増築の行を含めてタップ領域が40px以上`, tapOk);
    if (w === 390) {
      await page.screenshot({ path: path.join(SHOTS, 'expansion-forge-390.jpg'), type: 'jpeg', quality: 70, fullPage: true });
      // 視線：固定・個別の引き直し・手で選ぶ
      const gaze = rowOf('視線');
      await gaze.locator('.fbtn').first().click();
      check('視線を固定できる', (await gaze.locator('.fbtn').first().getAttribute('aria-pressed')) === 'true');
      const gv = (await gaze.locator('.fval').textContent()).trim();
      await page.click('.forge-btn'); await page.waitForTimeout(120);
      check('固定した視線は錬成しても変わらない', (await gaze.locator('.fval').textContent()).trim() === gv);
      await gaze.locator('.fbtn').first().click();
      await gaze.locator('.fmain').click();
      await page.waitForSelector('dialog.sheet[open]');
      await page.click('dialog.sheet[open] .opt:has-text("伏し目")');
      await page.waitForTimeout(150);
      if (await page.isVisible('dialog.sheet[open]')) await page.click('dialog.sheet[open] button:has-text("採用")').catch(() => undefined);
      await page.waitForTimeout(150);
      check('視線を手で選べる（伏し目）', (await gaze.locator('.fval').textContent()).includes('伏し目'), (await gaze.locator('.fval').textContent()));
      // 出力：視線のタグは1つだけ
      await page.click('.tabbar button >> nth=1');
      await page.click('.target-row button:has-text("PixAI")');
      const p = await page.inputValue('#prompt-main');
      check('視線を指定すると looking at viewer を出さず、looking down を出す', !/looking at viewer/.test(p) && /looking down/.test(p));
      // PixAI の系統・NovelAI の版
      await page.click('.profile-seg button:has-text("Tsubaki")');
      const dit = await page.inputValue('#prompt-main');
      check('PixAI の Tsubaki等（自然文）で、自然な英文になる', /\. /.test(dit) && !/1boy, solo/.test(dit), dit.slice(0, 80));
      await page.click('.profile-seg button:has-text("SDXL")');
      await page.click('.target-row button:has-text("NovelAI")');
      await page.click('.profile-seg button:has-text("V4.5")');
      const nai = await page.inputValue('#prompt-main');
      check('NovelAI V4.5・V5 で品質タグを末尾に付ける', /very aesthetic, masterpiece, no text$/.test(nai.trim()), nai.slice(-60));
      check(`${w}px：プロンプト画面の切り替えで横スクロールなし`, (await overflow(page)) <= 0);
      await page.screenshot({ path: path.join(SHOTS, 'expansion-prompt-390.jpg'), type: 'jpeg', quality: 70 });
      await page.click('.profile-seg button:has-text("V4（従来）")');
      await page.click('.target-row button:has-text("PixAI")');
      await page.click('.tabbar button >> nth=0');
    }
    check(`${w}px：増築の操作で実行時エラーなし`, errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 2d. 辞書の更新のお知らせ（除外の設定がある人だけ。設定は書き換えない）----
  {
    const prefs = JSON.stringify({ version: 1, excluded: { outfit: ['school_uniform'] }, disabled: [] });
    const { ctx, page, errors } = await newPage({ width: 375, height: 812 }, { init: `if (!sessionStorage.getItem('seeded')) { localStorage.setItem('bpg:v1:drawPrefs', ${JSON.stringify(prefs)}); sessionStorage.setItem('seeded', '1'); }` });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('除外の設定がある項目に候補が増えたら、錬成画面でお知らせする', await page.isVisible('.dict-update'));
    check('お知らせで除外の設定は書き換えない', (await page.evaluate(() => window.localStorage.getItem('bpg:v1:drawPrefs'))) === prefs);
    check('お知らせを出しても横スクロールなし', (await overflow(page)) <= 0);
    await page.screenshot({ path: path.join(SHOTS, 'expansion-dict-notice-375.jpg'), type: 'jpeg', quality: 70 });
    await page.click('.dict-update button:has-text("確認する")');
    await page.waitForSelector('.dict-new');
    check('辞書・抽選設定に「この版で追加した候補」の欄が出る', (await page.textContent('.dict-new')).includes('この版で追加した候補'));
    await page.click('.dict-new button:has-text("今回の追加分をすべて除外")');
    await page.waitForTimeout(100);
    const saved = JSON.parse(await page.evaluate(() => window.localStorage.getItem('bpg:v1:drawPrefs')));
    check('追加分をまとめて除外しても、元の除外は残る', saved.excluded.outfit.includes('school_uniform') && saved.excluded.outfit.length > 5 && Array.isArray(saved.excluded.scene));
    await page.click('.dict-new button:has-text("すべて抽選対象に戻す")');
    await page.waitForTimeout(100);
    const back = JSON.parse(await page.evaluate(() => window.localStorage.getItem('bpg:v1:drawPrefs')));
    check('追加分を戻すと、元の除外の設定に戻る', JSON.stringify(back.excluded) === JSON.stringify({ outfit: ['school_uniform'] }), JSON.stringify(back.excluded));
    await page.click('.dict-list button:has-text("衣装") >> nth=0');
    check('項目の一覧に「新」の印と「新規」の表示切り替えが出る', await page.isVisible('.seg button:has-text("新規")'));
    await page.click('.seg button:has-text("新規")');
    const newCount = await page.locator('.dopt .dbadge.new').count();
    const allCount = await page.locator('.dopt').count();
    check('「新規」で、この版で追加した候補だけを表示する', newCount > 5 && newCount === allCount, `${newCount}/${allCount}`);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('確認したあとは、再読込してもお知らせを出さない', !(await page.isVisible('.dict-update')));
    check('辞書の更新の操作で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
  {
    // 除外の設定がない人には何も出さない
    const { ctx, page } = await newPage({ width: 375, height: 812 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('除外の設定がなければ、辞書の更新のお知らせは出さない', !(await page.isVisible('.dict-update')) && !(await page.isVisible('.toast')));
    await ctx.close();
  }

  // ---- 2b. 候補選択シート（iPhone の表示領域を想定：アドレスバー分だけ低い画面） ----
  for (const [w, h] of [[390, 664], [320, 520]]) {
    const { ctx, page, errors } = await newPage({ width: w, height: h });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.click('.frow:has-text("衣装") .fmain >> nth=0');
    await page.waitForSelector('dialog.sheet[open]');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const inView = async () => page.evaluate(() => {
      const d = document.querySelector('dialog.sheet[open]');
      const x = d.querySelector('button[aria-label="閉じる"]').getBoundingClientRect();
      const f = d.querySelector('.sheet-foot').getBoundingClientRect();
      const r = d.getBoundingClientRect();
      return { closeTop: x.top, closeBottom: x.bottom, footBottom: f.bottom, dialogTop: r.top, dialogBottom: r.bottom, vh: window.innerHeight };
    });
    const v0 = await inView();
    check(`${w}×${h}：シートが画面内に収まる`, v0.dialogTop >= 0 && v0.dialogBottom <= v0.vh + 1, JSON.stringify(v0));
    // 一覧を最後までスクロール（指で下に引っ張る・上に送る操作の代わり）
    await page.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 15; i++) await page.mouse.wheel(0, 900);
    await page.evaluate(() => { const b = document.querySelector('dialog.sheet[open] .sheet-body'); b.scrollTop = b.scrollHeight; });
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -300);
    const v1 = await inView();
    check(`${w}×${h}：一覧をスクロールしても×が画面内に残る`, v1.closeTop >= 0 && v1.closeBottom <= v1.vh, JSON.stringify(v1));
    check(`${w}×${h}：一覧をスクロールしてもフッターが画面内に残る`, v1.footBottom <= v1.vh + 1);
    check(`${w}×${h}：シートを開いている間、後ろの画面はスクロールしない`, (await page.evaluate(() => window.scrollY)) === scrollBefore);
    // 分類を切り替えると、表示件数と「この中から引く」の件数が揃う
    await page.click('dialog.sheet .cats .chip:has-text("カジュアル")');
    const counts = await page.evaluate(() => {
      const d = document.querySelector('dialog.sheet[open]');
      const listed = d.querySelectorAll('.opts .opt:not(.blocked)').length;
      const btn = Number((d.querySelector('.sheet-foot .btn.primary').textContent.match(/(\d+)件/) || [])[1]);
      return { listed, btn };
    });
    check(`${w}×${h}：分類を切り替えると「この中から引く」の件数も揃う`, counts.btn <= counts.listed, JSON.stringify(counts));
    await page.click('dialog.sheet button[aria-label="閉じる"]');
    check(`${w}×${h}：×で閉じられる`, !(await page.isVisible('dialog.sheet[open]')));
    // 外側（暗い部分）のタップでも閉じる
    await page.click('.frow:has-text("髪の色") .fmain');
    await page.waitForSelector('dialog.sheet[open]');
    await page.mouse.click(w / 2, 4);
    await page.waitForTimeout(100);
    check(`${w}×${h}：シートの外側をタップしても閉じられる`, !(await page.isVisible('dialog.sheet[open]')));
    check(`${w}×${h}：候補選択で実行時エラーなし`, errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 2c. 辞書・抽選設定 ----
  {
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 });
    page.on('dialog', (d) => d.accept());
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('辞書・抽選設定：未設定では「好み設定あり」を出さず、設定への入口だけを出す', await page.isVisible('.prefs-bar.quiet') && !(await page.isVisible('.prefs-bar:not(.quiet)')));
    await page.click('.prefs-bar button:has-text("辞書・抽選設定")');
    await page.waitForSelector('#dict-title');
    const rows = page.locator('.dict-list .drow');
    check('辞書・抽選設定：全51項目の一覧を出す（ヘルプとの二重の一覧なし）', (await rows.count()) === 51, String(await rows.count()));
    const hairRowText = await page.locator('.drow:has(.dname:text-is("髪型"))').textContent();
    const m = hairRowText.match(/登録 (\d+)件・抽選許可 (\d+)件/);
    check('辞書・抽選設定：登録数と抽選許可数を表示（未設定では同数）', !!m && m[1] === m[2], hairRowText);
    const hairTotal = Number(m?.[1] ?? 0);
    await page.click('.drow:has(.dname:text-is("髪型"))');
    await page.waitForSelector('.dopts');
    // 全解除 → 0件の警告、全選択で戻す
    await page.fill('.dict input[type=search]', 'ウルフ');
    const searchCount = await page.locator('.dopt').count();
    await page.click('.dict-bulk button:has-text("全解除")');
    check('全解除は検索中でも項目全体に作用し、0件の警告を出す', (await page.textContent('.dict-sum')).includes('抽選対象 0') && await page.isVisible('p.dwarn'), `search=${searchCount}`);
    check('変更は自動保存され「保存済み」と出る', (await page.textContent('.save-state')).includes('保存済み'));
    await page.click('.dict-bulk button:has-text("全選択")');
    check('全選択で全件が抽選対象に戻る', (await page.textContent('.dict-sum')).includes(`抽選対象 ${hairTotal} / 登録 ${hairTotal}`));
    await page.fill('.dict input[type=search]', '');
    // 現在の値を除外
    const curRow = page.locator('.dopt:has(.dbadge.cur)');
    const curName = (await curRow.locator('.oname').evaluate((el) => el.childNodes[el.querySelector('.swatch') ? 1 : 0].textContent)).trim();
    await curRow.locator('input[type=checkbox]').click();
    check('現在の値を除外すると「抽選対象外・次回から反映」を示す', (await page.textContent('.dict .panel')).includes(`現在の値「${curName}」は抽選対象外です`));
    check('チェック状態を色だけでなく文字（除外中）でも示す', (await curRow.locator('.dbadge').first().textContent()) === '除外中');
    await page.click('.seg button:has-text("除外中")');
    check('「除外中」の絞り込みで除外した候補だけを出す', (await page.locator('.dopt').count()) === 1);
    await page.click('.seg button:has-text("すべて")');
    // キーボードで操作できる（Space で切り替え）
    const firstBox = page.locator('.dopt input[type=checkbox]').first();
    const was = await firstBox.isChecked();
    await firstBox.focus(); await page.keyboard.press('Space');
    const now = await firstBox.isChecked();
    await page.keyboard.press('Space');
    check('候補のチェックはキーボード（Space）で切り替えられる', was !== now && (await firstBox.isChecked()) === was);
    const label = await firstBox.evaluate((el) => el.closest('label')?.textContent ?? '');
    check('チェックはラベルと結び付き、読み上げで候補名がわかる', label.length > 0);
    // 錬成画面：要約と、現在の値の注記
    await page.click('.dict-top button:has-text("一覧へ")');
    await page.click('.dict-top button:has-text("戻る")');
    await page.waitForSelector('.label-title');
    check('錬成画面に「好み設定あり：髪型1件を除外」を出す', (await page.textContent('.prefs-bar')).includes('髪型1件を除外'));
    await page.locator('.prefs-bar').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'forge-prefs-390.jpg'), type: 'jpeg', quality: 72 });
    check('現在の値が除外中なら行に注記を出す', (await page.textContent('.frow:has(.flabel:text-is("髪型")) .fnote').catch(() => '')).includes('抽選対象外'));
    const headBefore = await page.textContent('.label-head');
    let hit = 0;
    for (let i = 0; i < 25; i++) { await page.click('.forge-btn'); if ((await page.textContent('.frow:has(.flabel:text-is("髪型")) .fval')).trim() === curName) hit++; }
    check('除外した髪型は25回錬成しても出ない', hit === 0 && (await page.textContent('.label-head')) !== headBefore, `hit=${hit}`);
    // 戻す／進むで除外設定は巻き戻らない
    await page.click('button[aria-label="元に戻す"]');
    check('戻すでは除外設定を巻き戻さない', (await page.textContent('.prefs-bar')).includes('髪型1件を除外'));
    // 手で選ぶことはでき、除外設定は変わらない
    await page.click('.frow:has(.flabel:text-is("髪型")) .fmain');
    await page.waitForSelector('dialog.sheet[open]');
    await page.check('dialog.sheet label.check:has-text("両立しない候補も表示する") input');
    const exclOpt = page.locator(`dialog.sheet .opt:has(.oname:text-is("${curName}"))`);
    check('候補選択で除外中の候補に「抽選対象外」と出る', (await exclOpt.textContent()).includes('抽選対象外'));
    const canPick = await exclOpt.locator('button.pick').isEnabled();
    if (canPick) await exclOpt.locator('button.pick').click();
    await page.waitForTimeout(150);
    check('除外中の候補を手で選べ、除外設定は変わらない', canPick && (await page.textContent('.frow:has(.flabel:text-is("髪型")) .fval')).trim() === curName && (await page.textContent('.prefs-bar')).includes('髪型1件を除外'));
    if (await page.isVisible('dialog.sheet[open]')) await page.keyboard.press('Escape');
    // 再読み込み後も設定が残る
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('再読み込み後も設定が残る', (await page.textContent('.prefs-bar')).includes('髪型1件を除外'));

    // 項目のOFF（衣装）：出力から消え、値は保持、ONで戻る
    const outfitVal = (await page.textContent('.frow:has(.flabel:text-is("衣装")) .fval')).trim();
    await page.click('.prefs-bar button:has-text("設定を開く")');
    await page.click('.drow:has(.dname:text-is("衣装"))');
    const offNote = await page.textContent('.dict .panel .toggle');
    check('OFFの説明に「プロンプトにも出力されません。値と固定状態は保持」を示す', offNote.includes('現在のプロンプトにも出力されません') && offNote.includes('値と固定状態は保持'));
    await page.click('.dict .panel .toggle input');
    await page.click('.dict-top button:has-text("一覧へ")');
    check('一覧で衣装がOFFと表示される', (await page.textContent('.drow:has(.dname:text-is("衣装")) .dstate')) === 'OFF');
    await page.click('.dict-top button:has-text("戻る")');
    const outfitRow = page.locator('.frow:has(.flabel:has-text("衣装"))').first();
    check('OFFの項目は行に「OFF（辞書・抽選設定）」と出て、サイコロを押せない', (await outfitRow.textContent()).includes('OFF（辞書・抽選設定）') && !(await outfitRow.locator('.fbtn').nth(1).isEnabled()));
    await outfitRow.locator('.fmain').click();
    check('OFFの項目を押すと、理由と設定への導線を出す（候補選択は開かない）', await page.isVisible('.toast >> text=設定を開く') && !(await page.isVisible('dialog.sheet[open]')));
    await page.click('.forge-btn');
    check('OFFの間に錬成しても衣装の値は変わらない', (await outfitRow.locator('.fval').textContent()).trim() === outfitVal);
    await page.click('.tabbar button >> nth=1');
    const sectionsOff = await page.$$eval('.panel b', (els) => els.map((e) => e.textContent));
    check('プロンプト：OFF中は衣装のタグ欄が消え、「個人の抽選・出力設定を適用中」と出る', !sectionsOff.includes('衣装') && (await page.isVisible('text=個人の抽選・出力設定を適用中')));
    await page.click('.target-row .chip:has-text("日本語設定")');
    check('日本語設定にも衣装の行を出さない', !(await page.$$eval('dl.kv dt', (els) => els.map((e) => e.textContent))).includes('衣装'));
    await page.click('.target-row .chip:has-text("PixAI")');
    await page.click('.tabbar button >> nth=0');
    await page.click('.prefs-bar button:has-text("設定を開く")');
    await page.click('.drow:has(.dname:text-is("衣装"))');
    await page.click('.dict .panel .toggle input');
    await page.click('.dict-top button:has-text("一覧へ")');
    await page.click('.dict-top button:has-text("戻る")');
    await page.click('.tabbar button >> nth=1');
    const sectionsOn = await page.$$eval('.panel b', (els) => els.map((e) => e.textContent));
    await page.click('.tabbar button >> nth=0');
    check('ONに戻すと元の衣装で再び出力される（再抽選しない）', sectionsOn.includes('衣装') && (await page.textContent('.frow:has(.flabel:text-is("衣装")) .fval')).trim() === outfitVal);

    // 既存の任意スイッチと同じ状態を共有（眼鏡）
    await page.click('.prefs-bar button:has-text("設定を開く")');
    await page.click('.drow:has(.dname:text-is("眼鏡"))');
    check('眼鏡は詳細な調合と同じスイッチ（説明つき）で、初期はOFF', (await page.textContent('.dict .panel .toggle')).includes('眼鏡を抽選に含める') && !(await page.isChecked('.dict .panel .toggle input')));
    await page.click('.dict .panel .toggle input');
    await page.click('.dict-top button:has-text("一覧へ")');
    await page.click('.dict-top button:has-text("戻る")');
    await page.$$eval('details.group', (ds) => ds.forEach((d) => (d.open = true)));
    check('辞書・抽選設定で眼鏡をONにすると、詳細な調合のスイッチもONになる', await page.isChecked('label.toggle:has-text("眼鏡を抽選に含める") input'));
    await page.click('label.toggle:has-text("眼鏡を抽選に含める") input');

    // 候補0件 → 錬成しない・理由と設定への導線
    await page.click('.prefs-bar button:has-text("設定を開く")');
    await page.click('.drow:has(.dname:text-is("髪型"))');
    await page.click('.dict-bulk button:has-text("全解除")');
    check('0件の項目は一覧にも「候補が0件です」と出る', await (async () => { await page.click('.dict-top button:has-text("一覧へ")'); return (await page.textContent('.drow:has(.dname:text-is("髪型"))')).includes('候補が0件です'); })());
    await page.click('.dict-top button:has-text("戻る")');
    // 手で選んだ髪型は「採用後に固定する」で固定されている（固定中の項目は抽選しないので0件でも錬成できる）。固定を外してから確かめる
    if (await page.isEnabled('text=ロック全解除')) await page.click('text=ロック全解除');
    const head0 = await page.textContent('.label-head');
    const title0 = await title(page);
    const hist0 = await page.evaluate(() => window.localStorage.getItem('bpg:v1:history'));
    await page.click('.forge-btn');
    await page.waitForSelector('#conflict-title', { timeout: 3000 }).catch(() => undefined);
    check('抽選対象0件では錬成せず、理由と「辞書・抽選設定を開く」を出す', await page.isVisible('#conflict-title:has-text("錬成できませんでした")') && await page.isVisible('dialog.sheet button:has-text("辞書・抽選設定を開く（髪型）")'));
    check('成立しない抽選では、結果と錬成番号を変えない', (await page.textContent('.label-head')) === head0 && (await title(page)) === title0);
    check('成立しない抽選では、履歴に何も記録しない（元の結果の退避もしない）', (await page.evaluate(() => window.localStorage.getItem('bpg:v1:history'))) === hist0);
    await page.click('dialog.sheet button:has-text("辞書・抽選設定を開く")');
    check('理由のシートから、原因の項目の設定を直接開ける', (await page.textContent('#dict-title')) === '髪型');
    await page.click('.dict-bulk button:has-text("この項目を初期設定に戻す")');
    await page.click('.dict-top button:has-text("一覧へ")');
    // 長い候補名・大きい辞書でもスマートフォン幅で崩れない
    await page.click('.drow:has(.dname:text-is("呼び名"))');
    check('390px：大きい辞書（呼び名）の候補一覧で横スクロールなし', (await overflow(page)) <= 0);
    const boxOk = await page.$$eval('.dopt input[type=checkbox]', (els) => els.slice(0, 40).every((e) => { const r = e.getBoundingClientRect(); const l = e.closest('label').getBoundingClientRect(); return r.width >= 20 && l.height >= 44 && l.right <= window.innerWidth; }));
    check('390px：チェックは押せる大きさで、行全体がタップ領域', boxOk);
    await page.click('.dict-top button:has-text("一覧へ")');
    await page.waitForSelector('.toast', { state: 'detached', timeout: 9000 }).catch(() => undefined);
    await page.screenshot({ path: path.join(SHOTS, 'dict-390.jpg'), type: 'jpeg', quality: 72 });
    await page.click('.drow:has(.dname:text-is("衣装"))');
    await page.click('.dopt input[type=checkbox] >> nth=1');
    await page.screenshot({ path: path.join(SHOTS, 'dict-outfit-390.jpg'), type: 'jpeg', quality: 72 });
    await page.click('.dict-top button:has-text("一覧へ")');
    // すべて初期設定に戻す（確認あり）
    await page.click('button:has-text("すべて初期設定に戻す")');
    await page.click('.dict-top button:has-text("戻る")');
    check('「すべて初期設定に戻す」で好み設定の表示が消える', await page.isVisible('.prefs-bar.quiet'));
    check('辞書・抽選設定で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
  // ---- 2d. 辞書・抽選設定：狭い画面・ヘルプからの入口・保存失敗・JSON の選択的な復元 ----
  {
    const { ctx, page, errors } = await newPage({ width: 320, height: 640 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.click('.tabbar button >> nth=3');
    check('ヘルプから辞書・抽選設定を開ける（件数表は設定画面へ移動）', !(await page.isVisible('table.counts')) && await page.isVisible('.help button:has-text("辞書・抽選設定を開く")'));
    await page.click('.help button:has-text("辞書・抽選設定を開く")');
    check('320px：辞書・抽選設定の一覧で横スクロールなし', (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);
    await page.click('.drow:has(.dname:text-is("衣装"))');
    check('320px：候補一覧（長い衣装名）で横スクロールなし', (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);
    await page.fill('.dict input[type=search]', 'suit');
    check('英語タグでも検索できる', (await page.locator('.dopt').count()) > 0);
    await page.click('.dict-top button:has-text("一覧へ")');
    await page.click('.dict-top button:has-text("戻る")');
    check('辞書・抽選設定から戻ると、開く前の画面（ヘルプ）に戻る', await page.isVisible('#help-title'));
    // JSON：設定入りのバックアップ。既定（復元しない）では設定は変わらず、選んだときだけ置き換える
    const backup = (restoreTag) => JSON.stringify({ app: 'bishounen-prompt-gacha', type: 'bishounen-backup', schemaVersion: 1, dataVersion: 'x', exportedAt: restoreTag, current: null, favorites: [], history: [], drawPrefs: { version: 1, excluded: { hairColor: ['black'] }, disabled: [] } });
    await page.click('.tabbar button >> nth=2');
    await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup('a')) });
    await page.waitForSelector('.import-confirm');
    check('設定入りのJSONを読むと「抽選設定も復元する」を初期OFFで出す', !(await page.isChecked('.import-confirm input[type=checkbox]')));
    await page.click('.import-confirm button:has-text("読み込む")');
    await page.click('.tabbar button >> nth=0');
    check('「抽選設定も復元する」を選ばなければ、今の設定は変わらない', await page.isVisible('.prefs-bar.quiet'));
    await page.click('.tabbar button >> nth=2');
    await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup('b')) });
    await page.waitForSelector('.import-confirm');
    await page.check('.import-confirm input[type=checkbox]');
    await page.click('.import-confirm button:has-text("読み込む")');
    await page.click('.tabbar button >> nth=0');
    check('選んだときだけ、JSONの抽選設定に置き換える', (await page.textContent('.prefs-bar')).includes('髪の色1件を除外'));
    check('320px：好み設定の表示で横スクロールなし', (await overflow(page)) <= 0);
    check('320px・JSON読込で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
  {
    // 保存に失敗する環境：成功表示を出さず、次回に残らないことを伝える
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 }, {
      init: () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'bpg:v1:drawPrefs') throw new DOMException('quota', 'QuotaExceededError'); return orig.call(this, k, v); }; }
    });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.click('.prefs-bar button:has-text("辞書・抽選設定")');
    await page.click('.drow:has(.dname:text-is("髪型"))');
    await page.click('.dopt input[type=checkbox] >> nth=0');
    const st = await page.textContent('.save-state');
    check('保存に失敗したら「保存済み」を出さず、次回に残らないことを伝える', !st.includes('保存済み') && st.includes('保存できませんでした'), st);
    check('保存失敗でも実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 2e. 履歴（直近50件）・人物の固定・衣装3案・元キャラと派生 ----
  {
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 });
    page.on('dialog', (d) => d.accept());
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    const histCount = () => page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:history') || '[]').length);
    const head = () => page.textContent('.label-head');
    const val = (label) => page.textContent(`.frow:has(.flabel:text-is("${label}")) .fval`).then((x) => x.trim());
    check('履歴：最初の結果だけでは履歴に記録しない', (await histCount()) === 0);
    await page.click('.forge-btn');
    check('履歴：最初の錬成で、元の結果を退避してから新しい結果を記録する（2件）', (await histCount()) === 2);
    await page.click('.forge-btn'); await page.click('.forge-btn');
    check('履歴：錬成ごとに1件増える', (await histCount()) === 4);
    await page.click('button[aria-label="元に戻す"]');
    await page.click('button[aria-label="やり直す"]');
    await page.click('.tabbar button >> nth=1'); await page.click('text=プロンプトをコピー').catch(() => undefined); await page.click('.tabbar button >> nth=0');
    check('履歴：戻す／進む・コピーでは増えない', (await histCount()) === 4);
    await page.click('.row-actions .chip:has-text("服だけ着せ替え")');
    check('履歴：部分の引き直しでも記録する', (await histCount()) === 5);
    await page.click('button[aria-label="瞳の色だけ再抽選"]');
    check('履歴：1項目の再抽選でも記録する', (await histCount()) === 6);
    // 手で選ぶ → 記録しない。次の錬成の前に退避する
    await page.click('.frow:has(.flabel:text-is("髪の色")) .fmain');
    await page.waitForSelector('dialog.sheet[open]');
    const cur = await page.textContent('dialog.sheet .opt.current .oname').catch(() => '');
    await page.click(`dialog.sheet .opt:not(.current):not(.blocked) button.pick >> nth=3`);
    await page.waitForTimeout(100);
    check('履歴：手で選んだだけでは記録しない', (await histCount()) === 6, cur);
    const edited = await val('髪の色');
    await page.click('button[aria-label="髪の色を固定解除"]').catch(() => undefined);
    await page.click('.forge-btn');
    const stash = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:history'))[1].state.fields.hairColor.id);
    check('履歴：手で編集した結果は、次の錬成の直前に退避する（1操作で2件）', (await histCount()) === 8 && !!stash, `${edited}/${stash}`);
    for (let i = 0; i < 4; i++) await page.click('.forge-btn');
    check('履歴：上限（50件）までは錬成ごとに増え、10件で止まらない', (await histCount()) === 12);
    // 履歴画面
    await page.click('.tabbar button >> nth=2');
    await page.click('.seg button:has-text("履歴")');
    check('履歴画面：12件・概要・ローカル時刻・2つのボタン', (await page.locator('.list .item').count()) === 12 && await page.isVisible('.item .hsum') && await page.isVisible('.item time') && await page.isVisible('.item button:has-text("この結果に戻す")') && await page.isVisible('.item button:has-text("お気に入りに保存")'));
    check('履歴画面：「直近50件をこのブラウザに自動保存」の説明', await page.isVisible('text=直近50件をこのブラウザに自動保存します'));
    const thirdTitle = (await page.textContent('.list .item >> nth=2 >> h3')).trim();
    const orderBefore = await page.$$eval('.list .item time', (els) => els.map((e) => e.getAttribute('datetime')));
    await page.click('.list .item >> nth=2 >> button:has-text("お気に入りに保存")');
    await page.click('.seg button:has-text("お気に入り")');
    check('履歴から保存すると、今の結果ではなくその履歴の結果を保存する', (await page.textContent('.list .item >> nth=0 >> h3')).trim() === thirdTitle);
    await page.click('.seg button:has-text("履歴")');
    await page.click('.list .item >> nth=2 >> button:has-text("この結果に戻す")');
    await page.waitForSelector('.label-title');
    check('「この結果に戻す」で保存した値に戻り、履歴は増えない', (await title(page)) === thirdTitle && (await histCount()) === 12);
    await page.click('.tabbar button >> nth=2'); await page.click('.seg button:has-text("履歴")');
    check('戻しても履歴の並び順・記録日時は変わらない', JSON.stringify(await page.$$eval('.list .item time', (els) => els.map((e) => e.getAttribute('datetime')))) === JSON.stringify(orderBefore));
    await page.click('.tabbar button >> nth=0');
    await page.click('button[aria-label="元に戻す"]');
    check('履歴の呼び出しは戻すで取り消せる', (await title(page)) !== thirdTitle);
    await page.click('button[aria-label="やり直す"]');

    // 人物の一括固定
    if (await page.isEnabled('text=ロック全解除')) await page.click('text=ロック全解除');
    const valsBefore = await page.$$eval('.frow .fval', (els) => els.map((e) => e.textContent));
    await page.click('.person-bar button:has-text("この人物を固定")');
    const valsAfter = await page.$$eval('.frow .fval', (els) => els.map((e) => e.textContent));
    const lockCount = await page.textContent('.lockbar .count');
    check('この人物を固定：値は変えずに、人物の項目へまとめて鍵を掛ける', JSON.stringify(valsBefore) === JSON.stringify(valsAfter) && /固定中/.test(lockCount), lockCount);
    check('この人物を固定：表情・衣装には掛けない', (await page.getAttribute('button[aria-label^="衣装を"]', 'aria-pressed')) === 'false' && (await page.getAttribute('button[aria-label^="表情を"]', 'aria-pressed')) === 'false');
    check('この人物を固定：OFFの眼鏡には掛けず、スイッチもONにしない', (await page.getAttribute('button[aria-label^="眼鏡を"]', 'aria-pressed')) === 'false' && (await page.textContent('.frow:has(.flabel:has-text("眼鏡"))')).includes('出力しない'));
    check('この人物を固定：固定の要約と「固定する項目を調整」を出す', await page.isVisible('.person-status summary:has-text("固定する項目を調整")'));
    await page.click('.person-status summary');
    await page.uncheck('.plocks label:has-text("髪型") input');
    check('固定する項目の調整は、その項目の鍵と同じ', (await page.getAttribute('button[aria-label^="髪型を"]', 'aria-pressed')) === 'false');
    await page.click('button[aria-label="元に戻す"]');
    await page.click('button[aria-label="元に戻す"]');
    check('一括固定は戻す1回分でまとめて取り消せる', (await page.textContent('.lockbar .count')).includes('固定はありません'));
    await page.click('button[aria-label="やり直す"]');
    const histBeforeWd = await histCount();
    const headBeforeWd = await head();
    const outfitBefore = await val('衣装');

    // 衣装3案
    await page.click('.person-bar button:has-text("衣装を3案見る")');
    await page.waitForSelector('dialog.wardrobe[open]');
    const cards = page.locator('dialog.wardrobe .wcard');
    const n = await cards.count();
    const names = await cards.locator('h3').allTextContents();
    check('衣装3案：最大3案を、重複なく、今の衣装と違う案で出す', n >= 1 && n <= 3 && new Set(names).size === n && names.every((x) => !x.includes(outfitBefore) || x.includes('色違い')), names.join(' / '));
    check('衣装3案：各案に色（文字と色見本）・変わる項目・採用ボタン', await cards.first().locator('.wcolor .ckey').count() > 0 ? (await cards.first().locator('.wchanges li').count()) > 0 : true);
    check('衣装3案：390px で横スクロールなし', (await overflow(page)) <= 0);
    await page.screenshot({ path: path.join(SHOTS, 'wardrobe-390.jpg'), type: 'jpeg', quality: 72 });
    await page.click('dialog.wardrobe button:has-text("別の3案を見る")');
    await page.click('dialog.wardrobe .sheet-foot button:has-text("閉じる")');
    check('衣装3案：開く・作り直す・閉じるでは結果・錬成番号・履歴を変えない', (await val('衣装')) === outfitBefore && (await head()) === headBeforeWd && (await histCount()) === histBeforeWd);
    await page.click('.person-bar button:has-text("衣装を3案見る")');
    await page.waitForSelector('dialog.wardrobe[open]');
    const pick = (await page.locator('dialog.wardrobe .wcard >> nth=0 >> h3').textContent()).replace(/^案\d/, '').replace('色違い', '').trim();
    const hairBefore = await val('髪の色');
    const histIdsBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:history')).map((h) => h.id));
    const outfitIdBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:current')).fields.outfit.id);
    await page.click('dialog.wardrobe .wcard >> nth=0 >> button:has-text("この案を採用")');
    await page.waitForTimeout(150);
    check('採用すると衣装が変わり、髪などは変わらない', (await val('衣装')) === pick && (await val('髪の色')) === hairBefore, `${pick} / ${await val('衣装')}`);
    // 直前に履歴から戻した結果（最新の履歴とは違う）を表示していたので、採用の前にその結果を1件退避し、採用した結果を1件記録する
    const added = await page.evaluate((before) => JSON.parse(window.localStorage.getItem('bpg:v1:history')).filter((h) => !before.includes(h.id)).map((h) => h.state.fields.outfit.id), histIdsBefore);
    const outfitIdAfter = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:current')).fields.outfit.id);
    check('採用は採用した結果を1件だけ記録し（未記録の元の結果は1件退避）、錬成番号を進める',
      added.length === 2 && added[0] === outfitIdAfter && added[1] === outfitIdBefore && (await histCount()) === histBeforeWd + 2 && (await head()) !== headBeforeWd, JSON.stringify(added));
    check('採用後は完了を短く知らせる', await page.isVisible('.toast:has-text("衣装を「")'));
    await page.click('button[aria-label="元に戻す"]');
    check('採用は戻す1回で元の衣装に戻せる', (await val('衣装')) === outfitBefore);
    await page.click('button[aria-label="やり直す"]');

    // 元の人物も登録して派生を保存
    await page.click('.tabbar button >> nth=2');
    check('着せ替え中は「元の人物も登録して派生を保存」を出す', await page.isVisible('.derive-panel button:has-text("元の人物も登録して派生を保存")'));
    const favBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:favorites') || '[]').length);
    await page.fill('.derive-panel input', 'カジミール');
    await page.click('.derive-panel button:has-text("元の人物も登録して派生を保存")');
    const favs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:favorites')));
    const base = favs.find((f) => f.name === 'カジミール');
    const deriv = favs.find((f) => f.rootId === base?.id);
    check('元の人物と派生を、まとめて2件保存する', favs.length === favBefore + 2 && !!base && !!deriv);
    check('元の人物は着せ替え前の衣装で保存する（衣装を変えた結果を元として保存しない）', !!base && !!deriv && base.state.fields.outfit.id !== deriv.state.fields.outfit.id);
    await page.click('.seg button:has-text("お気に入り")');
    check('お気に入りに「派生」「元キャラ」の表示と、元キャラの詳細に派生一覧', await page.isVisible('.item:has(h3:has-text("カジミール／")) .lineage:text-is("派生")') && await page.isVisible('.item[data-fav-id] .derivs summary:has-text("派生（1件）")'));
    await page.fill('input[type=search]', 'カジミール');
    check('元キャラの名前で検索すると派生も見つかる', (await page.locator('.list .item').count()) === 2);
    await page.fill('input[type=search]', '');
    // この人物で着せ替え
    await page.click(`.item[data-fav-id="${base.id}"] button:has-text("この人物で着せ替え")`);
    await page.waitForSelector('dialog.wardrobe[open]');
    check('「この人物で着せ替え」で錬成画面に戻り、衣装3案を開く', await page.isVisible('dialog.wardrobe[open]') && (await title(page)).length > 0);
    await page.click('dialog.wardrobe .wcard >> nth=0 >> button:has-text("この案を採用")');
    await page.click('.tabbar button >> nth=2');
    check('登録済みの元キャラなら「派生として保存」を出す', await page.isVisible('.derive-panel button:has-text("派生として保存")'));
    await page.click('.derive-panel button:has-text("派生として保存")');
    const favs2 = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:favorites')));
    const baseAfter = favs2.find((f) => f.id === base.id);
    check('派生として保存しても、元キャラの保存内容は変わらない', favs2.filter((f) => f.rootId === base.id).length === 2 && JSON.stringify(baseAfter.state.fields) === JSON.stringify(base.state.fields));
    // 元キャラを削除しても派生は残る
    await page.click('.seg button:has-text("お気に入り")');
    await page.click(`.item[data-fav-id="${base.id}"] button:has-text("削除")`);
    const favs3 = await page.evaluate(() => JSON.parse(window.localStorage.getItem('bpg:v1:favorites')));
    check('元キャラを削除しても派生は消えず、独立した保存として残る', favs3.length === favs2.length - 1 && favs3.every((f) => f.rootId !== base.id));
    // 再読み込み後も残る
    const histBeforeReload = await histCount();
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('再読み込み後も履歴と固定状態が残る', (await histCount()) === histBeforeReload && histBeforeReload > 12 && (await page.textContent('.lockbar .count')).includes('固定中'));
    check('履歴・人物・衣装3案・派生で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
  {
    // 10件版を開いた利用者：「以前の履歴」へ移った11件目以降を、起動時に通常の履歴（50件）へ戻す
    const { ctx, page, errors } = await newPage({ width: 320, height: 640 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.evaluate(() => {
      const st = JSON.parse(window.localStorage.getItem('bpg:v1:current'));
      const h = Array.from({ length: 23 }, (_, i) => ({ id: `old-${i}`, at: new Date(Date.UTC(2026, 9, 1, 0, 30 - i)).toISOString(), title: `旧履歴${i}`, state: st }));
      window.localStorage.setItem('bpg:v1:history', JSON.stringify(h.slice(0, 10)));
      window.localStorage.setItem('bpg:v1:historyLegacy', JSON.stringify(h.slice(10)));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    check('10件版の利用者：起動時に「50件に戻しました」と知らせる', await page.isVisible('.toast:has-text("50件に戻しました")'));
    await page.click('.tabbar button >> nth=2');
    await page.click('.seg button:has-text("履歴")');
    check('10件版の利用者：以前の履歴へ移っていた13件が通常の履歴に戻り、23件すべて見られる', (await page.locator('.list').first().locator('.item').count()) === 23 && !(await page.isVisible('#legacy-title')));
    // 50件を超える分だけが「以前の履歴」に入る
    await page.evaluate(() => {
      const st = JSON.parse(window.localStorage.getItem('bpg:v1:current'));
      const h = Array.from({ length: 63 }, (_, i) => ({ id: `big-${i}`, at: new Date(Date.UTC(2026, 9, 1, 2, 0, 100 - i)).toISOString(), title: `多い履歴${i}`, state: st }));
      window.localStorage.setItem('bpg:v1:history', JSON.stringify(h));
      window.localStorage.removeItem('bpg:v1:historyLegacy');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.click('.tabbar button >> nth=2');
    await page.click('.seg button:has-text("履歴")');
    check('50件を超える履歴：通常は50件、残り13件は「以前の履歴」に表示', (await page.locator('.list').first().locator('.item').count()) === 50 && await page.isVisible('#legacy-title:has-text("以前の履歴（13件）")'));
    check('以前の履歴：書き出し・お気に入り保存・削除ができる', await page.isVisible('button:has-text("以前の履歴をJSONで書き出す")') && await page.isVisible('.legacy .item button:has-text("お気に入りに保存")') && await page.isVisible('.legacy .item button:has-text("削除")'));
    check('320px：履歴画面で横スクロールなし', (await overflow(page)) <= 0);
    await page.click('.tabbar button >> nth=0');
    await page.click('.person-bar button:has-text("衣装を3案見る")');
    await page.waitForSelector('dialog.wardrobe[open]');
    check('320px：衣装3案のシートで横スクロールなし', (await overflow(page)) <= 0);
    const btnOk = await page.$$eval('dialog.wardrobe .wcard button', (els) => els.every((e) => e.getBoundingClientRect().height >= 40 && e.getBoundingClientRect().right <= window.innerWidth));
    check('320px：採用ボタンは押せる大きさで画面内', btnOk);
    await page.screenshot({ path: path.join(SHOTS, 'wardrobe-320.jpg'), type: 'jpeg', quality: 72 });
    check('旧データの移行・320px で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 3. コピー：クリップボード権限なし → 手動コピー欄 ----
  {
    const init = () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('NotAllowedError')) }, configurable: true });
      document.execCommand = () => false;
    };
    const { ctx, page, errors } = await newPage({ width: 375, height: 812 }, { init });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.click('.tabbar button >> nth=1');
    await page.click('text=プロンプトをコピー');
    await page.waitForSelector('dialog.sheet[open] textarea');
    await page.waitForTimeout(200);
    const manual = await page.inputValue('dialog.sheet[open] textarea');
    const selected = await page.evaluate(() => { const t = document.querySelector('dialog.sheet[open] textarea'); return t.selectionEnd - t.selectionStart; });
    check('コピー不可の環境では、全文を選択した手動コピー欄を出す（iOS向け退避）', manual.includes('1boy') && selected === manual.length);
    check('コピー退避で実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // ---- 4. 共有URL・直リンク ----
  {
    const { ctx, page } = await newPage({ width: 390, height: 844 });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    const t = await title(page);
    await page.click('.tabbar button >> nth=2');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const share = await page.evaluate(async () => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === '共有URLをコピー');
      btn.click();
      await new Promise((r) => setTimeout(r, 200));
      return navigator.clipboard.readText().catch(() => '');
    });
    check('共有URLを作れる', share.includes('#s='), share.slice(0, 80));
    const { ctx: c2, page: p2, errors } = await newPage({ width: 390, height: 844 });
    await p2.goto(share, { waitUntil: 'load' });
    await p2.waitForSelector('.label-title');
    check('共有URLを直接開くと同じ美青年が出る（サブパス）', (await title(p2)) === t);
    check('共有URLの読み込み後、URLから状態が外れる', !(await p2.evaluate(() => location.hash)));
    check('共有URLで実行時エラーなし', errors.length === 0, errors.join(' / '));
    await c2.close();
    await ctx.close();
  }

  // ---- 5. reduced motion・容量不足・ライトテーマ ----
  {
    const { ctx, page } = await newPage({ width: 390, height: 844 }, { reducedMotion: 'reduce' });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.click('.forge-btn');
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.label'), '::after').animationName);
    check('prefers-reduced-motion では錬成の演出を止める', anim === 'none', anim);
    await page.click('.masthead .icon-btn');
    await page.waitForTimeout(200);
    check('明るい表示に切り替えられる', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
    await page.screenshot({ path: path.join(SHOTS, 'forge-390-light.jpg'), type: 'jpeg', quality: 70 });
    await ctx.close();
  }
  {
    const init = () => { Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); }; };
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 }, { init });
    await page.goto(URL_, { waitUntil: 'load' });
    await page.click('.forge-btn');
    await page.click('.tabbar button >> nth=2');
    await page.click('text=この美青年を保存');
    check('保存領域が使えなくてもアプリは落ちず、保存失敗を伝える', await page.isVisible('.toast'), await page.textContent('.toast').catch(() => ''));
    check('容量不足でも実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
  // ---- サービスワーカー：同じオリジンの他アプリのキャッシュを消さない／オフラインで起動できる ----
  {
    const { ctx, page, errors } = await newPage({ width: 390, height: 844 });
    const ORIGIN = new URL(URL_).origin;
    const FOREIGN = ['workbox-precache-v2-https://example/', 'other-app-v1'];
    // 同じオリジンの別パス（他アプリ相当）で、他アプリのキャッシュと旧版 bpg-v1 を先に作っておく
    await page.goto(`${ORIGIN}/other-app/`);
    await page.evaluate(async (names) => {
      for (const n of names) await (await window.caches.open(n)).put(`/other-app/${encodeURIComponent(n)}`, new window.Response(n));
      await (await window.caches.open('bpg-v1')).put('/bishounen-prompt-gacha/index.html', new window.Response('old'));
    }, FOREIGN);
    errors.length = 0; // 他アプリ相当のパスは配信していない（404）ので、エラーはアプリを開いてから数える
    await page.goto(URL_, { waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    const controlled = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
      return !!navigator.serviceWorker.controller;
    });
    check('サービスワーカーが有効になり、ページを制御する', controlled);
    const after = await page.evaluate(async (names) => {
      const keys = await window.caches.keys();
      const sizes = {};
      for (const n of names) sizes[n] = keys.includes(n) ? (await (await window.caches.open(n)).keys()).length : -1;
      return { keys, sizes };
    }, FOREIGN);
    check('activate で他アプリのキャッシュ（Workbox 等）を消さない', FOREIGN.every((n) => after.sizes[n] === 1), JSON.stringify(after.keys));
    check('activate で旧版 bpg-v1 を消し、bpg-v2 を残す', !after.keys.includes('bpg-v1') && after.keys.includes('bpg-v2'), JSON.stringify(after.keys));
    // 制御下で一度読み込み、JS・CSS をキャッシュしてからオフラインにする
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.label-title');
    await page.waitForTimeout(300);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    const offlineReload = await page.waitForSelector('.label-title', { timeout: 10000 }).then(() => true, () => false);
    check('オフラインで再読み込みしても起動する', offlineReload);
    await page.goto(`${URL_}?offline-fallback=1`, { waitUntil: 'load' }).catch(() => undefined);
    const fallback = await page.waitForSelector('.label-title', { timeout: 10000 }).then(() => true, () => false);
    check('オフラインで未保存の URL を開くと index.html にフォールバックして起動する', fallback);
    await ctx.setOffline(false);
    check('サービスワーカーの検証中に実行時エラーなし', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'browser-report.json'), JSON.stringify({ engine: process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium', at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2) + '\n');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
