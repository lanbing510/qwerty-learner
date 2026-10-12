#!/usr/bin/env node
/**
 * qwerty-learner 自定义词典"添加新章节"CLI
 * 等价于前端 EditDict 的 handleAddChapter：按优先级在内置词典中查音标/释义。
 * 改进：查不到时可用调用方提供的释义（如从图片提取的中文）兜底。
 *
 * 用法: echo '{"words":[{"name":"apple","trans":"苹果"},...]}' | node add-chapter.js [--dry-run]
 * 输入 JSON: { words: [{name, trans?}], dictId?, chapterName?, }
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..');
const DICTS_DIR = path.join(APP_DIR, 'public', 'dicts');
const DATA_FILE = path.join(__dirname, 'data', 'custom_dictionaries.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');
const API = process.env.QWERTY_API || 'http://localhost:3001/api/custom-dicts';
const DEFAULT_DICT_ID = 'custom_1773337093182_5ifybj3';

const dryRun = process.argv.includes('--dry-run');

// 从前端源码解析词典优先级顺序（与 GUI 行为保持一致）
function getPriorityOrder() {
  const src = fs.readFileSync(path.join(APP_DIR, 'src/resources/customDictionary.ts'), 'utf-8');
  const m = src.match(/getDictPriorityOrder\(\)[^{]*\{\s*return\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('无法解析 getDictPriorityOrder');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// 从前端源码解析 id -> 词典文件 url
function getDictUrlMap() {
  const src = fs.readFileSync(path.join(APP_DIR, 'src/resources/dictionary.ts'), 'utf-8');
  const map = new Map();
  for (const m of src.matchAll(/id:\s*'([^']+)'[\s\S]*?url:\s*'([^']+)'/g)) {
    if (!map.has(m[1])) map.set(m[1], m[2]);
  }
  return map;
}

const dictCache = new Map();
function loadDict(url) {
  if (dictCache.has(url)) return dictCache.get(url);
  const file = path.join(DICTS_DIR, path.basename(url));
  let words = [];
  try {
    words = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    /* 词典文件缺失则跳过 */
  }
  const index = new Map();
  for (const w of words) {
    const key = String(w.name).toLowerCase();
    if (!index.has(key)) index.set(key, w);
  }
  dictCache.set(url, index);
  return index;
}

function findWordInfo(name, priorityOrder, urlMap) {
  const key = name.toLowerCase().trim();
  for (const dictId of priorityOrder) {
    const url = urlMap.get(dictId);
    if (!url) continue;
    const index = loadDict(url);
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}

async function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  const dictId = input.dictId || DEFAULT_DICT_ID;
  if (!Array.isArray(input.words) || input.words.length === 0) throw new Error('words 为空');

  const priorityOrder = getPriorityOrder();
  const urlMap = getDictUrlMap();

  const notFound = [];
  const chapterWords = input.words.map((w) => {
    const name = String(w.name).trim();
    const info = findWordInfo(name, priorityOrder, urlMap);
    if (info) {
      return { name, trans: info.trans, usphone: info.usphone || '', ukphone: info.ukphone || '' };
    }
    notFound.push(name);
    const fallback = w.trans ? (Array.isArray(w.trans) ? w.trans : [w.trans]) : ['未找到释义'];
    return { name, trans: fallback, usphone: '', ukphone: '' };
  });

  const res = await fetch(API);
  const dicts = await res.json();
  const dict = dicts.find((d) => d.id === dictId);
  if (!dict) throw new Error(`找不到词典 ${dictId}`);

  const chapter = {
    id: `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: input.chapterName || `章节 ${dict.chapters.length + 1}`,
    words: chapterWords,
  };

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, dict: dict.name, chapter, notFound }, null, 2));
    return;
  }

  // 备份数据文件，保留最近 20 份
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `custom_dictionaries.${stamp}.json`));
  const backups = fs.readdirSync(BACKUP_DIR).sort();
  for (const old of backups.slice(0, -20)) fs.unlinkSync(path.join(BACKUP_DIR, old));

  const updated = { ...dict, chapters: [...dict.chapters, chapter] };
  const putRes = await fetch(`${API}/${dictId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });
  if (!putRes.ok) throw new Error(`保存失败: HTTP ${putRes.status}`);

  console.log(
    JSON.stringify(
      {
        success: true,
        dict: dict.name,
        chapterName: chapter.name,
        wordCount: chapterWords.length,
        foundInDicts: chapterWords.length - notFound.length,
        notFound,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
