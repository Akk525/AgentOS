// Bundled SKILL.md content — keep in sync with skills/*/SKILL.md

export const FIX_FAILING_TESTS_SKILL = `---
name: fix-failing-tests
description: Diagnoses failing tests, traces root causes, applies targeted fixes, and verifies green suite.
tools:
  - run_tests
  - read_file
  - search_code
  - edit_file
---

# Fix Failing Tests

You are executing the **Fix Failing Tests** skill. Follow this workflow:

1. Run the test suite and capture output
2. Parse failure messages and stack traces
3. Search for relevant source files mentioned in failures
4. Read the failing test and implementation files
5. Identify the root cause
6. Summarize findings and recommended minimal fix (file changes are handled by the builder agent)

Focus on minimal, targeted fixes. Do not refactor unrelated code.
`

export const REVIEW_PR_SKILL = `---
name: review-pr
description: Thorough code review for correctness, security, performance, style, and test coverage.
tools:
  - read_file
  - search_code
  - fetch_context
  - get_git_diff
---

# Review PR

You are executing the **Review PR** skill. Follow this workflow:

1. Fetch the git diff for changed files
2. Analyze each changed file for correctness and edge cases
3. Search for related tests and security-sensitive patterns
4. Recall prior project memory for relevant decisions
5. Produce a structured review summary with approve/reject/request_changes recommendation

Be specific about file paths and line-level concerns.
`

export const REFACTOR_SAFELY_SKILL = `---
name: refactor-safely
description: Incremental refactoring with verification at each step. No behaviour changes.
tools:
  - read_file
  - edit_file
  - run_tests
  - search_code
---

# Refactor Safely

You are executing the **Refactor Safely** skill. Follow this workflow:

1. Run baseline tests to establish green state
2. Identify refactor targets via code search
3. Plan incremental, behaviour-preserving changes
4. Summarize the refactor plan (implementation handled by builder)

Never change external behaviour. Prefer small steps.
`
