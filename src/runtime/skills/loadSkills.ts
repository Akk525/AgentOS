import { getDesktopBridge } from '../desktop/desktopBridge'
import { loadBundledSkills } from './bundledSkills'
import { parseSkillFile } from './parseSkillFile'
import type { LoadedSkill } from './skillTypes'

export async function loadSkillsFromDisk(repoPath?: string): Promise<LoadedSkill[]> {
  const bridge = await getDesktopBridge()
  const byId = new Map<string, LoadedSkill>()

  for (const skill of loadBundledSkills()) {
    byId.set(skill.id, skill)
  }

  if (bridge.environment === 'tauri') {
    const discovered = await bridge.discoverSkills(repoPath)
    for (const file of discovered) {
      try {
        const skill = parseSkillFile({
          content: file.content,
          id: file.id,
          sourcePath: file.sourcePath,
          scope: file.scope,
        })
        // Project/personal skills override bundled by id
        byId.set(skill.id, skill)
      } catch {
        // Skip malformed skill files
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
