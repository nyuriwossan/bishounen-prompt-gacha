#!/usr/bin/env node
/*
 * 既存ツール群から、再利用する辞書だけを JSON へ抽出する。
 *
 *   node scripts/import-sources.mjs <各リポジトリを clone した親ディレクトリ>
 *
 * 出力: src/data/imported/*.json （アプリは実行時に他サイトへアクセスしない）
 * 抽出対象・除外理由は docs/SOURCE-AUDIT.md に記録している。
 * このスクリプトはビルドには不要。辞書を再取り込みしたい時だけ使う。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';

const root = process.argv[2];
if (!root) { console.error('usage: node scripts/import-sources.mjs <dir>'); process.exit(1); }
const out = path.resolve('src/data/imported');
fs.mkdirSync(out, { recursive: true });
const commit = (repo) => { try { return execSync(`git -C ${path.join(root, repo)} rev-parse HEAD`).toString().trim(); } catch { return 'unknown'; } };
const write = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 1) + '\n');
const sandbox = () => { const ctx = { console }; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx); return ctx; };

// ---- character-appearance-prompt-workshop（容姿辞書：最優先） ----
{
  const repo = 'character-appearance-prompt-workshop';
  const ctx = sandbox();
  for (const f of ['core', 'basic-face', 'eyes', 'features', 'hair', 'skin-body', 'marks', 'appearance-details']) {
    vm.runInContext(fs.readFileSync(path.join(root, repo, 'data', f + '.js'), 'utf8'), ctx);
  }
  const keep = ['hairColor', 'irisColor', 'skinTone', 'baseCut', 'bangs', 'faceShape', 'jawline', 'cheekbones', 'eyeShape',
    'eyeWidth', 'outerCorner', 'eyelidFold', 'browShape', 'browThickness', 'noseBridge', 'lipFullness', 'glassesShape',
    'frameColor', 'molePosition', 'scarPosition', 'silhouette', 'muscle', 'shoulders', 'height', 'impression'];
  const fields = {};
  for (const f of ctx.CAW.data.fields) {
    if (!keep.includes(f.id)) continue;
    fields[f.id] = f.options.map((o) => ({ id: o.id, ja: o.labelJa, en: o.promptEn, ...(o.colorValue ? { hex: o.colorValue } : {}) }));
  }
  write('caw.json', { source: repo, commit: commit(repo), total: ctx.CAW.data.fields.reduce((n, f) => n + f.options.length, 0), fields });
}

// ---- outfit-prompt-workshop（配色・世界観・役割） ----
{
  const repo = 'outfit-prompt-workshop';
  const ctx = sandbox();
  for (const f of ['concept', 'colors', 'garments']) {
    const file = path.join(root, repo, 'data', f + '.js');
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  }
  const D = ctx.CPW.data;
  write('cpw.json', {
    source: repo, commit: commit(repo),
    colors: D.colors.map((c) => ({ id: c.id, ja: c.labelJa, en: c.promptEn, hex: c.hex, family: c.family, tone: c.tone, temperature: c.temperature, moods: c.moods })),
    worldviews: (D.worldviews || []).map((w) => ({ id: w.id, ja: w.labelJa, en: w.shortPrompt })),
    roles: (D.roles || []).map((r) => ({ id: r.id, ja: r.labelJa, en: r.shortPrompt })),
    garmentCount: (D.garments || []).length
  });
}

// ---- pose-composition-workshop（画角・視線・腕・表情の語彙） ----
{
  const repo = 'pose-composition-workshop';
  const ctx = sandbox();
  for (const f of ['camera', 'composition', 'postures', 'limbs', 'head-gaze', 'body']) {
    vm.runInContext(fs.readFileSync(path.join(root, repo, 'data', f + '.js'), 'utf8'), ctx);
  }
  const D = ctx.PCW.data;
  const pick = (list) => list.map((o) => ({ id: o.id, ja: o.labelJa, en: o.compact }));
  write('pcw.json', {
    source: repo, commit: commit(repo),
    shotSizes: pick(D.shotSizes), elevations: pick(D.elevations), headYaws: pick(D.headYaws),
    gazeTargets: pick(D.gazeTargets), gazeDirections: pick(D.gazeDirections), expressions: pick(D.expressions),
    armActions: pick(D.armActions), combinedArms: pick(D.combinedArms), postures: pick(D.postures)
  });
}

// ---- background-prompt-workshop（舞台・時間・光） ----
{
  const repo = 'background-prompt-workshop';
  const src = fs.readFileSync(path.join(root, repo, 'app/lib/background-data.ts'), 'utf8');
  const tmp = path.join(out, '..', '.bg-tmp.mjs');
  // 型注釈を落とし、sceneData / simpleData だけを評価する（簡易変換）
  const body = src.slice(src.indexOf('const o ='), src.indexOf('export const createDefaultState'))
    .replace(/: Option =>/g, ' =>').replace(/\(id: string, label: string, en: string, group\?: string\)/, '(id, label, en, group)')
    .replace(/export const/g, 'const');
  fs.writeFileSync(tmp, body + '\nexport { sceneData, simpleData };\n');
  const mod = await import(tmp + '?t=' + Date.now());
  fs.rmSync(tmp);
  write('bg.json', { source: repo, commit: commit(repo), scene: mod.sceneData, simple: mod.simpleData });
}

// ---- kemono-prompt-workshop（任意の獣人モード） ----
{
  const repo = 'kemono-prompt-workshop';
  const html = fs.readFileSync(path.join(root, repo, 'index.html'), 'utf8');
  const code = html.slice(html.indexOf('const GROUPS = {'), html.indexOf('const LEVELS = ['));
  const ctx = sandbox();
  vm.runInContext(code + '\nglobalThis.__K={GROUPS,SPECIES};', ctx);
  write('kemono.json', { source: repo, commit: commit(repo), groups: ctx.__K.GROUPS, species: ctx.__K.SPECIES });
}

// ---- creative-oc-maker（名前素材：男性名・中性名のみ） ----
{
  const repo = 'creative-oc-maker';
  const html = fs.readFileSync(path.join(root, repo, 'index.html'), 'utf8');
  const code = html.slice(html.indexOf('const nameData = {'), html.indexOf('const occupationPools = {'));
  const ctx = sandbox();
  vm.runInContext(code + '\nglobalThis.__N=nameData;', ctx);
  const N = ctx.__N, systems = {};
  for (const [key, v] of Object.entries(N)) {
    const g = v.givenNames || [];
    const given = Array.isArray(g)
      ? g.filter((x) => x.g === 'm' || x.g === 'n').map((x) => ({ ja: x.kana, roman: x.roman, tags: x.tags || [] }))
      : [...(g.male || []), ...(g.neutral || [])].map((x) => ({ ja: x.kanji, reading: x.reading, roman: x.roman, tags: x.tags || [] }));
    const surnames = (v.surnames || []).map((x) => ({ ja: x.kanji || x.kana, reading: x.reading, roman: x.roman }));
    systems[key] = { given, surnames };
  }
  write('names.json', { source: repo, commit: commit(repo), systems });
}

console.log('imported to', out);
