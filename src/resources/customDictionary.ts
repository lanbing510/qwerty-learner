import type { Word } from '..'

/**
 * 自定义词典的章节
 */
export type CustomDictChapter = {
  id: string
  name: string
  words: Word[]
}

/**
 * 自定义词典
 */
export type CustomDictionary = {
  id: string
  name: string
  description: string
  language: 'en'
  languageCategory: 'en'
  // 章节列表
  chapters: CustomDictChapter[]
  // 创建时间
  createdAt: number
  // 更新时间
  updatedAt: number
}

/**
 * 自定义词典的存储键
 */
export const CUSTOM_DICT_STORAGE_KEY = 'customDicts'

/**
 * 生成唯一的 ID
 */
export function generateCustomDictId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 生成章节 ID
 */
export function generateChapterId(): string {
  return `chapter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 从 localStorage 加载自定义词典
 */
export function loadCustomDicts(): CustomDictionary[] {
  try {
    const stored = localStorage.getItem(CUSTOM_DICT_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load custom dictionaries:', error)
  }
  return []
}

/**
 * 保存自定义词典到 localStorage
 */
export function saveCustomDicts(dicts: CustomDictionary[]): void {
  try {
    localStorage.setItem(CUSTOM_DICT_STORAGE_KEY, JSON.stringify(dicts))
  } catch (error) {
    console.error('Failed to save custom dictionaries:', error)
  }
}

/**
 * 添加新的自定义词典
 */
export function addCustomDict(dict: CustomDictionary): CustomDictionary[] {
  const dicts = loadCustomDicts()
  dicts.push(dict)
  saveCustomDicts(dicts)
  return dicts
}

/**
 * 更新自定义词典
 */
export function updateCustomDict(updatedDict: CustomDictionary): CustomDictionary[] {
  const dicts = loadCustomDicts()
  const index = dicts.findIndex((d) => d.id === updatedDict.id)
  if (index !== -1) {
    dicts[index] = { ...updatedDict, updatedAt: Date.now() }
    saveCustomDicts(dicts)
  }
  return dicts
}

/**
 * 删除自定义词典
 */
export function deleteCustomDict(dictId: string): CustomDictionary[] {
  const dicts = loadCustomDicts()
  const filtered = dicts.filter((d) => d.id !== dictId)
  saveCustomDicts(filtered)
  return filtered
}

/**
 * 根据 ID 获取自定义词典
 */
export function getCustomDictById(dictId: string): CustomDictionary | null {
  const dicts = loadCustomDicts()
  return dicts.find((d) => d.id === dictId) || null
}

/**
 * 获取词典优先级排序（用于查找单词信息）
 * 针对3年级儿童，优先从小学词汇中查找
 */
export function getDictPriorityOrder(): string[] {
  return [
    // 三年级上册 - 人教版
    'san1',
    // 三年级下册 - 人教版
    'san2',
    // 新起点三年级
    'pep-sl-san1',
    'pep-sl-san2',
    // 外研新起点三年级
    'waiyan3-1',
    'waiyan3-2',
    // 冀教三年级
    'jijiao1',
    'jijiao2',
    // 四年级
    'si1',
    'si2',
    'pep-sl-si1',
    'pep-sl-si2',
    'waiyan4-1',
    'waiyan4-2',
    'jijiao3',
    'jijiao4',
    // 五年级
    'wu1',
    'wu2',
    'pep-sl-wu1',
    'pep-sl-wu2',
    'waiyan5-1',
    'waiyan5-2',
    'jijiao5',
    'jijiao6',
    // 六年级
    'liu1',
    'liu2',
    'pep-sl-liu1',
    'pep-sl-liu2',
    'waiyan6-1',
    'waiyan6-2',
    'jijiao7',
    'jijiao8',
    // 外研小学
    'waiyan13',
    'waiyan14',
    'waiyan15',
    'waiyan16',
    'waiyan17',
    'waiyan18',
    'waiyan19',
    'waiyan20',
    // 上海小学
    'SHjuniormiddleOxford',
    // 译林版高中
    'Yilin1',
    'Yilin2',
    'Yilin3',
    // 初中英语
    'zhongkaohexin',
    // 高中英语
    'gaokao3500',
    // 新概念
    'nce1',
    'nce2',
    'nce-new-1',
    'nce-new-2',
    // 青少年英语其他
    'gaokao3500',
    'gaokaozhentihexin',
    // 基础词库
    'cet4',
    'top_2000_English_Words',
    'top_1500_nouns_Words',
    'top_1000_verb_Words',
    'top_500_Adj_Words',
    // 其他常用词库
    'longman_communication_3000_words',
    '4000_Essential_English_Words1',
    'Oxford3000',
    'Oxford5000',
  ]
}
