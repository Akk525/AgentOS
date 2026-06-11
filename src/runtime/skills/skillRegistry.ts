import { loadSkillsFromDisk } from './loadSkills'
import type { LoadedSkill } from './skillTypes'

type RegistryListener = (skills: LoadedSkill[]) => void

class SkillRegistry {
  private skills: LoadedSkill[] = []
  private lastRepoPath: string | undefined
  private listeners = new Set<RegistryListener>()
  private loading: Promise<void> | null = null

  getSkills(): LoadedSkill[] {
    return this.skills
  }

  getSkill(id: string): LoadedSkill | undefined {
    return this.skills.find(s => s.id === id)
  }

  listSkills(): LoadedSkill[] {
    return [...this.skills]
  }

  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const snapshot = this.listSkills()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  async refreshSkills(repoPath?: string): Promise<LoadedSkill[]> {
    if (this.loading) {
      await this.loading
      return this.skills
    }

    this.loading = (async () => {
      this.lastRepoPath = repoPath
      this.skills = await loadSkillsFromDisk(repoPath)
      this.notify()
    })()

    try {
      await this.loading
    } finally {
      this.loading = null
    }

    return this.skills
  }

  getLastRepoPath(): string | undefined {
    return this.lastRepoPath
  }
}

export const skillRegistry = new SkillRegistry()
