import type { Word } from '@/typings'
import { API_BASE_URL, useServerApi, customDictApi } from '@/utils/customDictApi'

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

// 内存缓存，用于同步访问
let customDictsCache: CustomDictionary[] | null = null

// 判断是否在 Tauri 环境中
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// 判断是否使用后端服务
function useServer(): boolean {
  return useServerApi()
}

/**
 * 初始化缓存 - 同步版本
 * 注意：使用 localStorage 作为初始值，实际服务器数据会在后台加载
 */
export function initCustomDictsCache(): void {
  customDictsCache = loadFromLocalStorage()
}

/**
 * 初始化缓存 - 异步版本
 * 在应用启动时调用此函数来从服务器加载最新数据
 */
export async function initCustomDictsCacheAsync(): Promise<void> {
  if (useServer()) {
    // 从服务器加载最新数据
    const serverDicts = await loadFromServer()
    if (serverDicts.length > 0) {
      customDictsCache = serverDicts
      // 同步到本地存储
      saveToLocalStorage(serverDicts)
    } else if (customDictsCache && customDictsCache.length > 0) {
      // 服务器为空但本地有数据，上传到服务器
      await saveToServer(customDictsCache)
    }
  }
}

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
 * 从 localStorage 加载自定义词典（Web 端备用）
 */
function loadFromLocalStorage(): CustomDictionary[] {
  try {
    const stored = localStorage.getItem(CUSTOM_DICT_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load custom dictionaries from localStorage:', error)
  }
  return []
}

/**
 * 保存自定义词典到 localStorage（Web 端备用）
 */
function saveToLocalStorage(dicts: CustomDictionary[]): void {
  try {
    localStorage.setItem(CUSTOM_DICT_STORAGE_KEY, JSON.stringify(dicts))
  } catch (error) {
    console.error('Failed to save custom dictionaries to localStorage:', error)
  }
}

/**
 * 从 Tauri 后端加载自定义词典
 */
async function loadFromTauri(): Promise<CustomDictionary[]> {
  try {
    const { invoke } = await import('@tauri-apps/api/tauri')
    const dicts = await invoke<CustomDictionary[]>('load_custom_dicts')
    return dicts
  } catch (error) {
    console.error('Failed to load custom dictionaries from Tauri:', error)
    return []
  }
}

/**
 * 保存自定义词典到 Tauri 后端
 */
async function saveToTauri(dicts: CustomDictionary[]): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/tauri')
    await invoke('save_custom_dicts', { dicts })
  } catch (error) {
    console.error('Failed to save custom dictionaries to Tauri:', error)
    throw error
  }
}

/**
 * 从服务器加载自定义词典
 */
async function loadFromServer(): Promise<CustomDictionary[]> {
  try {
    const dicts = await customDictApi.getDicts()
    return dicts || []
  } catch (error) {
    console.error('从服务器加载词典失败:', error)
    return []
  }
}

/**
 * 保存自定义词典到服务器
 */
async function saveToServer(dicts: CustomDictionary[]): Promise<void> {
  try {
    await customDictApi.saveDicts(dicts)
  } catch (error) {
    console.error('Failed to save custom dictionaries to server:', error)
    throw error
  }
}

/**
 * 从本地文件加载自定义词典（支持 Tauri、Web 和服务器）
 * 优先级：服务器 > Tauri > localStorage
 */
export async function loadCustomDicts(): Promise<CustomDictionary[]> {
  let dicts: CustomDictionary[]

  // 优先使用服务器
  if (useServer()) {
    dicts = await loadFromServer()
    if (dicts.length > 0) {
      customDictsCache = dicts
      // 同步到本地存储作为备份
      saveToLocalStorage(dicts)
      return dicts
    }
    // 服务器为空，尝试从本地加载
    dicts = loadFromLocalStorage()
    if (dicts.length > 0) {
      // 尝试上传到服务器，但不影响加载流程
      try {
        await saveToServer(dicts)
      } catch (error) {
        console.warn('上传到服务器失败，但继续使用本地数据:', error)
      }
      customDictsCache = dicts
      return dicts
    }
    customDictsCache = dicts
    return dicts
  }

  // Tauri 端
  if (isTauri()) {
    dicts = await loadFromTauri()
    if (dicts.length > 0) {
      customDictsCache = dicts
      return dicts
    }
    // 如果 Tauri 文件为空，尝试从 localStorage 迁移
    dicts = loadFromLocalStorage()
    if (dicts.length > 0) {
      await saveToTauri(dicts)
      customDictsCache = dicts
      return dicts
    }
    customDictsCache = dicts
    return dicts
  }

  // Web 端使用 localStorage
  dicts = loadFromLocalStorage()
  customDictsCache = dicts
  return dicts
}

/**
 * 保存自定义词典到本地（支持 Tauri 和 Web）
 * 同时更新缓存
 */
export async function saveCustomDicts(dicts: CustomDictionary[]): Promise<void> {
  customDictsCache = dicts

  // 优先使用服务器
  if (useServer()) {
    await saveToServer(dicts)
    // 同时保存到 localStorage 作为备份
    saveToLocalStorage(dicts)
    return
  }

  // Tauri 端
  if (isTauri()) {
    await saveToTauri(dicts)
    // 同时保存到 localStorage 作为备份
    saveToLocalStorage(dicts)
    return
  }

  // Web 端使用 localStorage
  saveToLocalStorage(dicts)
}

/**
 * 同步加载自定义词典（仅使用本地缓存，用于不兼容 async 的场景）
 * 优先使用缓存，如果没有则从 localStorage 加载
 */
export function loadCustomDictsSync(): CustomDictionary[] {
  if (customDictsCache === null) {
    customDictsCache = loadFromLocalStorage()
  }
  return customDictsCache
}

/**
 * 同步保存自定义词典（仅使用 localStorage，用于不兼容 async 的场景）
 * 同时更新缓存
 */
export function saveCustomDictsSync(dicts: CustomDictionary[]): void {
  saveToLocalStorage(dicts)
  customDictsCache = dicts
}

/**
 * 添加新的自定义词典
 */
export async function addCustomDict(dict: CustomDictionary): Promise<CustomDictionary[]> {
  const dicts = await loadCustomDicts()
  dicts.push(dict)
  await saveCustomDicts(dicts)
  return dicts
}

/**
 * 更新自定义词典
 */
export async function updateCustomDict(updatedDict: CustomDictionary): Promise<CustomDictionary[]> {
  const dicts = await loadCustomDicts()
  const index = dicts.findIndex((d) => d.id === updatedDict.id)
  if (index !== -1) {
    dicts[index] = { ...updatedDict, updatedAt: Date.now() }
    await saveCustomDicts(dicts)
  }
  return dicts
}

/**
 * 删除自定义词典
 */
export async function deleteCustomDict(dictId: string): Promise<CustomDictionary[]> {
  const dicts = await loadCustomDicts()
  const filtered = dicts.filter((d) => d.id !== dictId)
  await saveCustomDicts(filtered)
  return filtered
}

/**
 * 根据 ID 获取自定义词典
 */
export async function getCustomDictById(dictId: string): Promise<CustomDictionary | null> {
  const dicts = await loadCustomDicts()
  return dicts.find((d) => d.id === dictId) || null
}

/**
 * 根据 ID 获取自定义词典（同步版本，使用缓存）
 */
export function getCustomDictByIdSync(dictId: string): CustomDictionary | null {
  const dicts = loadCustomDictsSync()
  return dicts.find((d) => d.id === dictId) || null
}

/**
 * 导出自定义词典到 Excel 文件（Web 端使用）
 * 包含完整信息
 */
export function exportCustomDictsToFile(dicts: CustomDictionary[]): void {
  if (!dicts || dicts.length === 0) {
    console.error('没有可导出的词典')
    return
  }

  // 动态导入 xlsx 库
  import('xlsx').then((XLSX) => {
    // 先按名称合并词典数据
    const mergedDicts = new Map<string, { dict: CustomDictionary; index: number }>()

    dicts.forEach((dict, dictIndex) => {
      if (!dict || !dict.name) return
      const sheetName = dict.name.replace(/[\/\\*?:\[\]]/g, '_').slice(0, 31)
      // 保存最后一个索引
      mergedDicts.set(sheetName, { dict, index: dictIndex })
    })

    const workbook = XLSX.utils.book_new()

    mergedDicts.forEach(({ dict }, sheetName) => {
      if (!dict || !dict.name) {
        return
      }

      // 将所有章节的单词合并成一个数组
      const wordsData: Record<string, any>[] = []

      dict.chapters.forEach((chapter) => {
        chapter.words.forEach((word) => {
          const extWord = word as Record<string, any>
          wordsData.push({
            单词: word.name,
            释义: Array.isArray(word.trans) ? word.trans.join('; ') : word.trans || '',
            美式音标: word.usphone || '',
            英式音标: word.ukphone || '',
            音标: word.notation || '',
            释义详情: extWord.definition || '',
            例句: extWord.sentence || '',
            章节: chapter.name,
          })
        })
      })

      // 创建 Sheet
      const worksheet = XLSX.utils.json_to_sheet(wordsData)

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // 单词
        { wch: 40 }, // 释义
        { wch: 15 }, // 美式音标
        { wch: 15 }, // 英式音标
        { wch: 15 }, // 音标
        { wch: 40 }, // 释义详情
        { wch: 50 }, // 例句
        { wch: 20 }, // 章节
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    // 生成文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom_dictionaries_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

/**
 * 从 Excel 文件导入自定义词典（Web 端使用）
 * 完整信息导入
 */
export async function importCustomDictsFromFile(file: File): Promise<CustomDictionary[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer

        // 使用 xlsx 解析 Excel 文件
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(data, { type: 'array' })

        const importedDicts: CustomDictionary[] = []

        // 遍历每个 Sheet
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>[]>(worksheet)

          if (jsonData.length === 0) return

          // 按章节分组单词
          const chapterMap = new Map<string, Record<string, any>[]>()

          jsonData.forEach((row: Record<string, any>) => {
            const chapterName = row['章节'] || '默认章节'
            if (!chapterMap.has(chapterName)) {
              chapterMap.set(chapterName, [])
            }
            // 解析释义（可能是多个，用分号分隔）
            const transStr = row['释义'] || ''
            const trans = transStr ? transStr.split(';').map((t: string) => t.trim()) : []

            chapterMap.get(chapterName)!.push({
              name: row['单词'] || '',
              trans: trans,
              usphone: row['美式音标'] || '',
              ukphone: row['英式音标'] || '',
              notation: row['音标'] || '',
              definition: row['释义详情'] || '',
              sentence: row['例句'] || '',
            })
          })

          // 创建词典
          const chapters: CustomDictChapter[] = []
          let chapterIndex = 1
          chapterMap.forEach((words, chapterName) => {
            chapters.push({
              id: generateChapterId(),
              name: chapterName === '默认章节' ? `章节 ${chapterIndex++}` : chapterName,
              words: words
                .filter((w) => w.name)
                .map((w) => ({
                  name: w.name,
                  trans: w.trans,
                  usphone: w.usphone,
                  ukphone: w.ukphone,
                  notation: w.notation,
                  definition: w.definition,
                  sentence: w.sentence,
                })),
            })
          })

          if (chapters.length > 0 && chapters.some((c) => c.words.length > 0)) {
            importedDicts.push({
              id: generateCustomDictId(),
              name: sheetName,
              description: `从 Excel 导入 (${jsonData.length} 个单词)`,
              language: 'en',
              languageCategory: 'en',
              chapters,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
          }
        })

        // 合并词典（同名称覆盖，ID 保持不变）
        const existingDicts = await loadCustomDicts()

        // 创建现有词典的映射（按名称）
        const existingByName = new Map(existingDicts.map((d) => [d.name, d]))

        // 更新或添加导入的词典
        const mergedDicts = [...existingDicts]

        importedDicts.forEach((importedDict) => {
          const existingIndex = mergedDicts.findIndex((d) => d.name === importedDict.name)
          if (existingIndex !== -1) {
            // 同名词典：保留原有 ID，更新内容
            mergedDicts[existingIndex] = {
              ...importedDict,
              id: mergedDicts[existingIndex].id,
              createdAt: mergedDicts[existingIndex].createdAt,
            }
          } else {
            // 新词典：添加
            mergedDicts.push(importedDict)
          }
        })

        await saveCustomDicts(mergedDicts)
        resolve(mergedDicts)
      } catch (error) {
        console.error('Import error:', error)
        reject(new Error('导入失败：文件格式不正确，请确保是有效的 Excel 文件'))
      }
    }

    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
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
