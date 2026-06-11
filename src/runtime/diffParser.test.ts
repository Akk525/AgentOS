/**
 * Run via: npx tsx src/runtime/diffParser.test.ts
 */
import { parseRawDiff } from './diffParser'

const SAMPLE = `diff --git a/src/foo.ts b/src/foo.ts
index abc..def 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,2 +1,3 @@
 line1
+added
 line2
`

function run() {
  const files = parseRawDiff(SAMPLE)
  console.assert(files.length === 1, 'one file')
  console.assert(files[0].path === 'src/foo.ts', 'path parsed')
  console.assert(files[0].additions === 1, 'one addition')
  console.assert(files[0].chunks[0].lines.some(l => l.type === 'add'), 'add line typed')

  console.log('diffParser.test.ts: all assertions passed')
}

run()
