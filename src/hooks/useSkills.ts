import { useCallback, useEffect, useState } from 'react'
import { getRepoPath } from '../runtime/execution/executionConfig'
import { skillRegistry } from '../runtime/skills/skillRegistry'
import type { LoadedSkill } from '../runtime/skills/skillTypes'

export function useSkills() {
  const [skills, setSkills] = useState<LoadedSkill[]>(skillRegistry.listSkills())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const repoPath = getRepoPath()
      const list = await skillRegistry.refreshSkills(repoPath ?? undefined)
      setSkills(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return skillRegistry.subscribe(setSkills)
  }, [refresh])

  return { skills, loading, error, refresh }
}
