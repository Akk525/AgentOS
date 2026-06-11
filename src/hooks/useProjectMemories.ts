import { useCallback, useEffect, useState } from 'react'
import type { AgentMemory, AgentMemoryType } from '../types/graph'
import { getLocalStore } from '../runtime/store'

export function useProjectMemories(projectId: string | null | undefined) {
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<AgentMemoryType | 'all'>('all')

  const refresh = useCallback(async () => {
    if (!projectId) {
      setMemories([])
      return
    }
    setLoading(true)
    try {
      const store = getLocalStore()
      const list = searchQuery.trim()
        ? await store.searchMemories({ projectId, query: searchQuery.trim(), limit: 100 })
        : await store.listMemories({
            projectId,
            memoryType: typeFilter === 'all' ? undefined : typeFilter,
            limit: 200,
          })
      setMemories(list)
    } finally {
      setLoading(false)
    }
  }, [projectId, searchQuery, typeFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    memories,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh,
  }
}
