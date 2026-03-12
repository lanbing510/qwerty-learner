import Layout from '@/components/Layout'
import {
  generateChapterId,
  generateCustomDictId,
  addCustomDict,
  type CustomDictionary,
  type CustomDictChapter,
} from '@/resources/customDictionary'
import { batchFindWordInfo } from '@/utils/customDictSearch'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IconArrowLeft from '~icons/tabler/arrow-left'
import IconCheck from '~icons/tabler/check'
import IconPlus from '~icons/tabler/plus'
import IconTrash from '~icons/tabler/trash'

export default function CustomDictPage() {
  const navigate = useNavigate()

  const [dictName, setDictName] = useState('')
  const [dictDescription, setDictDescription] = useState('')
  const [wordsInput, setWordsInput] = useState('')
  const [chapters, setChapters] = useState<CustomDictChapter[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')

  // 解析输入的单词并创建章节
  const handleParseWords = useCallback(async () => {
    if (!wordsInput.trim()) {
      setError('请输入单词列表')
      return
    }

    if (!dictName.trim()) {
      setError('请输入词典名称')
      return
    }

    setError('')
    setIsCreating(true)
    setProgress({ current: 0, total: 0 })

    try {
      // 解析单词列表
      const words = wordsInput
        .split(/[\n,，\s]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0 && /^[a-zA-Z]+$/.test(w))

      if (words.length === 0) {
        setError('未找到有效的单词，请确保输入的是英文单词')
        setIsCreating(false)
        return
      }

      // 批量查找单词信息
      const wordInfoMap = await batchFindWordInfo(wordsInput, (current, total) => {
        setProgress({ current, total })
      })

      // 创建章节 - 所有单词作为一个章节
      const newChapters: CustomDictChapter[] = []

      const chapter: CustomDictChapter = {
        id: generateChapterId(),
        name: '章节 1',
        words: words.map((wordName) => {
          const wordInfo = wordInfoMap.get(wordName)
          if (wordInfo) {
            return { ...wordInfo }
          }
          // 如果找不到词典信息，创建基本结构
          return {
            name: wordName,
            trans: ['未找到释义'],
            usphone: '',
            ukphone: '',
          }
        }),
      }
      newChapters.push(chapter)

      setChapters(newChapters)
    } catch (err) {
      console.error('Failed to create custom dict:', err)
      setError('创建词典失败，请重试')
    } finally {
      setIsCreating(false)
    }
  }, [wordsInput, dictName])

  // 保存词典
  const handleSaveDict = useCallback(async () => {
    if (chapters.length === 0) {
      setError('请先解析单词')
      return
    }

    const newDict: CustomDictionary = {
      id: generateCustomDictId(),
      name: dictName || '我的自定义词典',
      description: dictDescription || '自定义词典',
      language: 'en',
      languageCategory: 'en',
      chapters,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await addCustomDict(newDict)
    navigate('/')
  }, [dictName, dictDescription, chapters, navigate])

  // 重置
  const handleReset = useCallback(() => {
    setDictName('')
    setDictDescription('')
    setWordsInput('')
    setChapters([])
    setError('')
  }, [])

  // 返回
  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  // 删除章节
  const handleDeleteChapter = useCallback((chapterId: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== chapterId))
  }, [])

  // 统计
  const totalWords = chapters.reduce((sum, c) => sum + c.words.length, 0)
  const foundWords = chapters.reduce((sum, c) => sum + c.words.filter((w) => w.usphone || w.ukphone).length, 0)

  return (
    <Layout>
      <div className="relative flex h-full w-full flex-col overflow-y-auto pl-20 pr-20">
        {/* 返回按钮 */}
        <button onClick={handleBack} className="absolute left-20 top-10 flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <IconArrowLeft className="h-5 w-5" />
          <span>返回</span>
        </button>

        <div className="mt-20 flex flex-col items-center">
          <h1 className="mb-8 text-2xl font-bold">创建自定义词典</h1>

          {/* 输入区域 */}
          <div className="mb-6 w-full max-w-2xl">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">词典名称 *</label>
              <input
                type="text"
                value={dictName}
                onChange={(e) => setDictName(e.target.value)}
                placeholder="例如：我的三年级单词本"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">词典描述</label>
              <input
                type="text"
                value={dictDescription}
                onChange={(e) => setDictDescription(e.target.value)}
                placeholder="可选描述"
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">单词列表 *</label>
              <textarea
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                placeholder="请输入单词，每行一个或用逗号分隔&#10;例如：&#10;apple, banana, orange&#10;cat, dog, bird"
                className="h-40 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">系统将自动从现有词典中查找每个单词的释义和发音</p>
            </div>

            {/* 错误提示 */}
            {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {/* 进度条 */}
            {isCreating && (
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm text-gray-600">
                  <span>正在查找单词信息...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleParseWords}
                disabled={isCreating || !wordsInput.trim()}
                className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <IconPlus className="h-4 w-4" />
                解析单词
              </button>

              <button onClick={handleReset} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
                重置
              </button>
            </div>
          </div>

          {/* 预览区域 */}
          {chapters.length > 0 && (
            <div className="w-full max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  预览 ({chapters.length} 章, {totalWords} 单词, 已找到 {foundWords} 个)
                </h2>
                <button
                  onClick={handleSaveDict}
                  className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  <IconCheck className="h-4 w-4" />
                  保存词典
                </button>
              </div>

              <div className="space-y-4">
                {chapters.map((chapter, index) => (
                  <div key={chapter.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium">{chapter.name}</h3>
                      <button onClick={() => handleDeleteChapter(chapter.id)} className="text-red-500 hover:text-red-700">
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {chapter.words.map((word, wordIndex) => (
                        <div key={wordIndex} className="flex items-center gap-2 rounded bg-gray-50 p-2">
                          <span className="font-medium">{word.name}</span>
                          <span className="text-gray-500">{word.trans[0] || '未找到'}</span>
                          {word.usphone && <span className="text-xs text-gray-400">[{word.usphone}]</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
