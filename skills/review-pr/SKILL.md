---
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
