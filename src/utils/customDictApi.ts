// 后端 API 服务配置

// 后端服务器地址，设为空字符串则不使用后端（使用本地存储）
// ⚠️ 请修改为你的 NAS 服务器地址，例如：'http://192.168.1.100:3001'
export const API_BASE_URL = 'http://192.168.3.49:3001'

// 判断是否使用后端服务
export function useServerApi(): boolean {
  return !!API_BASE_URL
}

// API 请求封装
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('后端服务器未配置')
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`无法连接到服务器: ${API_BASE_URL}。请检查服务器是否运行。`)
    }
    throw error
  }
}

// API 方法
export const customDictApi = {
  // 获取所有词典
  getDicts: () => apiRequest<any[]>('/api/custom-dicts'),

  // 保存所有词典
  saveDicts: (dicts: any[]) =>
    apiRequest<{ success: boolean }>('/api/custom-dicts', {
      method: 'POST',
      body: JSON.stringify({ dicts }),
    }),

  // 更新单个词典
  updateDict: (id: string, dict: any) =>
    apiRequest<{ success: boolean }>(`/api/custom-dicts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dict),
    }),

  // 删除词典
  deleteDict: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/custom-dicts/${id}`, {
      method: 'DELETE',
    }),
}
