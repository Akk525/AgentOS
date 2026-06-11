---
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
