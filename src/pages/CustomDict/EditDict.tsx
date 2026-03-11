import Layout from '@/components/Layout'
import {
  generateChapterId,
  getCustomDictById,
  updateCustomDict,
  deleteCustomDict,
  type CustomDictionary,
  type CustomDictChapter,
  type Word,
} from '@/resources/customDictionary'
import { batchFindWordInfo } from '@/utils/customDictSearch'
import { useCallback, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import IconArrowLeft from '~icons/tabler/arrow-left'
import IconCheck from '~icons/tabler/check'
import IconSave from '~icons/tabler/device-floppy'
import IconEdit from '~icons/tabler/edit'
import IconPlus from '~icons/tabler/plus'
import IconTrash from '~icons/tabler/trash'
import IconX from '~icons/tabler/x'

export default function EditDictPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [dict, setDict] = useState<CustomDictionary | null>(null)
  const [dictName, setDictName] = useState('')
  const [dictDescription, setDictDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinding, setIsFinding] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 编辑单词的状态
  const [editingWord, setEditingWord] = useState<{ chapterId: string; wordIndex: number } | null>(null)
  const [editingWordName, setEditingWordName] = useState('')
  const [editingWordTrans, setEditingWordTrans] = useState('')
  const [editingWordUsphone, setEditingWordUsphone] = useState('')

  // 添加新章节
  const [newChapterWords, setNewChapterWords] = useState('')
  const [isAddingChapter, setIsAddingChapter] = useState(false)

  // 在章节中添加单词
  const [addingWordsToChapter, setAddingWordsToChapter] = useState<string | null>(null)
  const [newWordsInput, setNewWordsInput] = useState('')

  // 加载词典数据
  useEffect(() => {
    if (id) {
      const loadedDict = getCustomDictById(id)
      if (loadedDict) {
        setDict(loadedDict)
        setDictName(loadedDict.name)
        setDictDescription(loadedDict.description)
      } else {
        setError('词典不存在')
      }
    }
    setIsLoading(false)
  }, [id])

  // 返回
  const handleBack = useCallback(() => {
    navigate('/gallery')
  }, [navigate])

  // 保存修改
  const handleSave = useCallback(() => {
    if (!dict) return

    setIsSaving(true)
    setError('')

    const updatedDict: CustomDictionary = {
      ...dict,
      name: dictName || dict.name,
      description: dictDescription || dict.description,
    }

    updateCustomDict(updatedDict)
    setDict(updatedDict)
    setSuccess('保存成功！')
    setIsSaving(false)

    setTimeout(() => setSuccess(''), 2000)
  }, [dict, dictName, dictDescription])

  // 删除词典
  const handleDelete = useCallback(() => {
    if (!dict) return

    if (confirm('确定要删除这个词典吗？此操作不可恢复。')) {
      deleteCustomDict(dict.id)
      navigate('/gallery')
    }
  }, [dict, navigate])

  // 删除章节
  const handleDeleteChapter = useCallback(
    (chapterId: string) => {
      if (!dict) return
      if (!confirm('确定要删除这个章节吗？')) return

      const updatedChapters = dict.chapters.filter((c) => c.id !== chapterId)
      setDict({ ...dict, chapters: updatedChapters })
    },
    [dict],
  )

  // 开始编辑单词
  const handleStartEditWord = useCallback((chapterId: string, wordIndex: number, word: Word) => {
    setEditingWord({ chapterId, wordIndex })
    setEditingWordName(word.name)
    setEditingWordTrans(word.trans.join(', '))
    setEditingWordUsphone(word.usphone)
  }, [])

  // 保存编辑的单词
  const handleSaveEditWord = useCallback(() => {
    if (!dict || !editingWord) return

    const { chapterId, wordIndex } = editingWord
    const chapters = dict.chapters.map((ch) => {
      if (ch.id === chapterId) {
        const words = [...ch.words]
        words[wordIndex] = {
          name: editingWordName.toLowerCase().trim(),
          trans: editingWordTrans
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
          usphone: editingWordUsphone,
          ukphone: '',
        }
        return { ...ch, words }
      }
      return ch
    })

    setDict({ ...dict, chapters })
    setEditingWord(null)
    setEditingWordName('')
    setEditingWordTrans('')
    setEditingWordUsphone('')
  }, [dict, editingWord, editingWordName, editingWordTrans, editingWordUsphone])

  // 取消编辑单词
  const handleCancelEditWord = useCallback(() => {
    setEditingWord(null)
    setEditingWordName('')
    setEditingWordTrans('')
    setEditingWordUsphone('')
  }, [])

  // 删除单词
  const handleDeleteWord = useCallback(
    (chapterId: string, wordIndex: number) => {
      if (!dict) return
      if (!confirm('确定要删除这个单词吗？')) return

      const chapters = dict.chapters.map((ch) => {
        if (ch.id === chapterId) {
          const words = ch.words.filter((_, i) => i !== wordIndex)
          return { ...ch, words }
        }
        return ch
      })

      setDict({ ...dict, chapters })
    },
    [dict],
  )

  // 添加新章节
  const handleAddChapter = useCallback(async () => {
    if (!dict || !newChapterWords.trim()) return

    setIsAddingChapter(true)
    setError('')

    try {
      const words = newChapterWords
        .split(/[\n,，\s]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0 && /^[a-zA-Z]+$/.test(w))

      if (words.length === 0) {
        setError('未找到有效的单词')
        setIsAddingChapter(false)
        return
      }

      // 查找单词信息
      const wordInfoMap = await batchFindWordInfo(newChapterWords, (current, total) => {
        setProgress({ current, total })
      })

      const chapter: CustomDictChapter = {
        id: generateChapterId(),
        name: `章节 ${dict.chapters.length + 1}`,
        words: words.map((wordName) => {
          const wordInfo = wordInfoMap.get(wordName)
          if (wordInfo) {
            return { ...wordInfo }
          }
          return {
            name: wordName,
            trans: ['未找到释义'],
            usphone: '',
            ukphone: '',
          }
        }),
      }

      setDict({
        ...dict,
        chapters: [...dict.chapters, chapter],
      })

      setNewChapterWords('')
      setIsAddingChapter(false)
    } catch (err) {
      setError('添加章节失败，请重试')
      setIsAddingChapter(false)
    }
  }, [dict, newChapterWords])

  // 在现有章节中添加单词
  const handleAddWordsToChapter = useCallback(
    async (chapterId: string) => {
      if (!dict || !newWordsInput.trim()) return

      setIsAddingChapter(true)
      setError('')

      try {
        const words = newWordsInput
          .split(/[\n,，\s]+/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0 && /^[a-zA-Z]+$/.test(w))

        if (words.length === 0) {
          setError('未找到有效的单词')
          setIsAddingChapter(false)
          return
        }

        // 查找单词信息
        const wordInfoMap = await batchFindWordInfo(newWordsInput, (current, total) => {
          setProgress({ current, total })
        })

        const chapters = dict.chapters.map((ch) => {
          if (ch.id === chapterId) {
            const newWords = words.map((wordName) => {
              const wordInfo = wordInfoMap.get(wordName)
              if (wordInfo) {
                return { ...wordInfo }
              }
              return {
                name: wordName,
                trans: ['未找到释义'],
                usphone: '',
                ukphone: '',
              }
            })
            return { ...ch, words: [...ch.words, ...newWords] }
          }
          return ch
        })

        setDict({ ...dict, chapters })
        setNewWordsInput('')
        setAddingWordsToChapter(null)
        setIsAddingChapter(false)
      } catch (err) {
        setError('添加单词失败，请重试')
        setIsAddingChapter(false)
      }
    },
    [dict, newWordsInput],
  )

  // 重新查找所有单词信息
  const handleRefreshWords = useCallback(async () => {
    if (!dict) return

    setIsFinding(true)
    setError('')
    setProgress({ current: 0, total: 0 })

    try {
      // 收集所有单词
      const allWords = dict.chapters.flatMap((ch) => ch.words.map((w) => w.name)).join(', ')

      const wordInfoMap = await batchFindWordInfo(allWords, (current, total) => {
        setProgress({ current, total })
      })

      const chapters = dict.chapters.map((ch) => ({
        ...ch,
        words: ch.words.map((word) => {
          const info = wordInfoMap.get(word.name.toLowerCase())
          return info || word
        }),
      }))

      setDict({ ...dict, chapters })
      setSuccess('单词信息已更新！')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('更新失败，请重试')
    } finally {
      setIsFinding(false)
    }
  }, [dict])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </Layout>
    )
  }

  if (!dict) {
    return (
      <Layout>
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-4 text-red-500">{error || '词典不存在'}</p>
          <button onClick={handleBack} className="rounded-md bg-blue-500 px-4 py-2 text-white">
            返回
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="relative flex h-full w-full flex-col overflow-y-auto pl-20 pr-20">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white pb-4">
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
            <IconArrowLeft className="h-5 w-5" />
            <span>返回</span>
          </button>

          <div className="flex items-center gap-3">
            {success && <span className="text-green-600">{success}</span>}
            {error && <span className="text-red-600">{error}</span>}
            <button
              onClick={handleRefreshWords}
              disabled={isFinding}
              className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isFinding ? '更新中...' : '更新单词信息'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed"
            >
              <IconSave className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存全部'}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-md bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
            >
              <IconTrash className="h-4 w-4" />
              删除词典
            </button>
          </div>
        </div>

        {/* 进度条 */}
        {(isFinding || isAddingChapter) && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>处理中...</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-6">
          {/* 词典基本信息 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-semibold">词典信息</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">词典名称</label>
                <input
                  type="text"
                  value={dictName}
                  onChange={(e) => setDictName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">描述</label>
                <input
                  type="text"
                  value={dictDescription}
                  onChange={(e) => setDictDescription(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 章节列表 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                章节列表 ({dict.chapters.length} 章, {dict.chapters.reduce((s, c) => s + c.words.length, 0)} 单词)
              </h2>
            </div>

            <div className="space-y-4">
              {dict.chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="rounded-lg border border-gray-300 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">
                      {chapter.name} ({chapter.words.length} 单词)
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAddingWordsToChapter(chapter.id)}
                        className="flex items-center gap-1 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                      >
                        <IconPlus className="h-3 w-3" />
                        添加单词
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                      >
                        <IconTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* 在章节中添加单词的输入框 */}
                  {addingWordsToChapter === chapter.id && (
                    <div className="mb-3 flex gap-2">
                      <input
                        type="text"
                        value={newWordsInput}
                        onChange={(e) => setNewWordsInput(e.target.value)}
                        placeholder="输入单词，用逗号或换行分隔"
                        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleAddWordsToChapter(chapter.id)}
                        disabled={isAddingChapter || !newWordsInput.trim()}
                        className="rounded bg-green-500 px-3 py-2 text-sm text-white hover:bg-green-600 disabled:cursor-not-allowed"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setAddingWordsToChapter(null)
                          setNewWordsInput('')
                        }}
                        className="rounded bg-gray-300 px-3 py-2 text-sm text-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  )}

                  {/* 单词列表 */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {chapter.words.map((word, wordIndex) => (
                      <div
                        key={wordIndex}
                        className={`group flex items-center justify-between rounded bg-white p-2 text-sm ${
                          editingWord?.chapterId === chapter.id && editingWord?.wordIndex === wordIndex ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        {editingWord?.chapterId === chapter.id && editingWord?.wordIndex === wordIndex ? (
                          // 编辑模式
                          <div className="flex flex-1 flex-col gap-1">
                            <input
                              type="text"
                              value={editingWordName}
                              onChange={(e) => setEditingWordName(e.target.value)}
                              className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                              placeholder="单词"
                            />
                            <input
                              type="text"
                              value={editingWordTrans}
                              onChange={(e) => setEditingWordTrans(e.target.value)}
                              className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                              placeholder="释义"
                            />
                            <input
                              type="text"
                              value={editingWordUsphone}
                              onChange={(e) => setEditingWordUsphone(e.target.value)}
                              className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                              placeholder="音标"
                            />
                            <div className="flex gap-1">
                              <button onClick={handleSaveEditWord} className="rounded bg-green-500 px-1 py-0.5 text-xs text-white">
                                <IconCheck className="h-3 w-3" />
                              </button>
                              <button onClick={handleCancelEditWord} className="rounded bg-gray-500 px-1 py-0.5 text-xs text-white">
                                <IconX className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 显示模式
                          <>
                            <div className="flex-1 overflow-hidden">
                              <div className="truncate font-medium">{word.name}</div>
                              <div className="truncate text-xs text-gray-500">{word.trans[0] || '未找到'}</div>
                            </div>
                            <div className="hidden flex-col gap-1 group-hover:flex">
                              <button
                                onClick={() => handleStartEditWord(chapter.id, wordIndex, word)}
                                className="rounded bg-blue-500 p-1 text-white"
                              >
                                <IconEdit className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDeleteWord(chapter.id, wordIndex)} className="rounded bg-red-500 p-1 text-white">
                                <IconTrash className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加新章节 */}
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4">
              <h3 className="mb-2 font-medium">添加新章节</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChapterWords}
                  onChange={(e) => setNewChapterWords(e.target.value)}
                  placeholder="输入单词，用逗号或换行分隔"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                />
                <button
                  onClick={handleAddChapter}
                  disabled={isAddingChapter || !newChapterWords.trim()}
                  className="flex items-center gap-1 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed"
                >
                  <IconPlus className="h-4 w-4" />
                  添加章节
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
