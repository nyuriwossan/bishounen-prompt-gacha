#!/usr/bin/env node
/* ブラウザ検証（Chromium / Playwright）
 *   npm run build && npm run test:browser
 * - GitHub Pages と同じサブパス（/bishounen-prompt-gacha/）で dist/ を配信して確認する
 * - 320 / 375 / 390 / 768 / 1280px で横スクロール・実行時エラーを確認
 * - 錬成・固定・戻す・候補選択・コピー（権限なし→手動コピー欄）・保存と再読込・共有URL・reduced motion・容量不足
 * PLAYWRIGHT_CHROMIUM に実行ファイルを指定可能。WebKit（Safari）は環境にあれば BROWSER=webkit で実行。
 */
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
      shown.length === 5 && shown[0].includes('完全ランダム') && shown.some((x) => x.includes('ダウナー・気だるい')) && !shown.some((x) => x.includes('銀髪特集')), shown.join('/'));
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
    await page.click('details.group summary:has-text("禁断の調合")');

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
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'browser-report.json'), JSON.stringify({ engine: process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium', at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2) + '\n');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
