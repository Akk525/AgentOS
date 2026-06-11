import {
  FIX_FAILING_TESTS_SKILL,
  REFACTOR_SAFELY_SKILL,
  REVIEW_PR_SKILL,
} from './bundledSkillContent'
import { parseSkillFile } from './parseSkillFile'
import type { LoadedSkill } from './skillTypes'

const BUNDLED_RAW: { id: string; content: string; path: string }[] = [
  { id: 'skill-fix-tests', content: FIX_FAILING_TESTS_SKILL, path: 'skills/fix-failing-tests/SKILL.md' },
  { id: 'skill-review-pr', content: REVIEW_PR_SKILL, path: 'skills/review-pr/SKILL.md' },
  { id: 'skill-refactor', content: REFACTOR_SAFELY_SKILL, path: 'skills/refactor-safely/SKILL.md' },
]

export function loadBundledSkills(): LoadedSkill[] {
  return BUNDLED_RAW.map(({ id, content, path }) =>
    parseSkillFile({ content, id, sourcePath: path, scope: 'bundled' }),
  )
}
