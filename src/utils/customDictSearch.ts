import { dictionaryResources } from '@/resources/dictionary'
import type { Word } from '@/typings'
import { getDictPriorityOrder } from '@/resources/customDictionary'

// 缓存已加载的词典数据
const dictCache: Map<string, Word[]> = new Map()
const loadingPromises: Map<string, Promise<Word[]>> = new Map()

/**
 * 加载词典数据
 */
async function loadDictData(dictUrl: string): Promise<Word[]> {
  // 如果已经有缓存，直接返回
  if (dictCache.has(dictUrl)) {
    return dictCache.get(dictUrl)!
  }

  // 如果正在加载，等待加载完成
  if (loadingPromises.has(dictUrl)) {
    return loadingPromises.get(dictUrl)!
  }

  // 开始加载
  const loadPromise = fetch(dictUrl)
    .then((res) => res.json())
    .then((data: Word[]) => {
      dictCache.set(dictUrl, data)
      loadingPromises.delete(dictUrl)
      return data
    })
    .catch((error) => {
      console.error(`Failed to load dict from ${dictUrl}:`, error)
      loadingPromises.delete(dictUrl)
      return []
    })

  loadingPromises.set(dictUrl, loadPromise)
  return loadPromise
}

/**
 * 在指定词典中查找单词
 */
async function findWordInDict(dictId: string, wordName: string): Promise<Word | null> {
  const dict = dictionaryResources.find((d) => d.id === dictId)
  if (!dict) return null

  const words = await loadDictData(dict.url)
  const normalizedWordName = wordName.toLowerCase().trim()
  
  return words.find((w) => w.name.toLowerCase() === normalizedWordName) || null
}

/**
 * 根据优先级顺序查找单词信息
 * @param wordName 单词名称
 * @returns 找到的单词信息或null
 */
export async function findWordInfo(wordName: string): Promise<Word | null> {
  const priorityOrder = getDictPriorityOrder()

  for (const dictId of priorityOrder) {
    const result = await findWordInDict(dictId, wordName)
    if (result) {
      return result
    }
  }

  return null
}

/**
 * 批量查找多个单词的信息
 * @param words 单词列表（用换行或逗号分隔的字符串）
 * @param onProgress 进度回调
 * @returns 找到的单词信息列表
 */
export async function batchFindWordInfo(
  wordsText: string,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, Word | null>> {
  // 解析单词列表
  const words = wordsText
    .split(/[\n,，\s]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && /^[a-zA-Z]+$/.test(w))

  const results = new Map<string, Word | null>()
  const total = words.length

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const result = await findWordInfo(word)
    results.set(word, result)
    
    if (onProgress) {
      onProgress(i + 1, total)
    }
  }

  return results
}

/**
 * 清除词典缓存
 */
export function clearDictCache(): void {
  dictCache.clear()
  loadingPromises.clear()
}
