---
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
