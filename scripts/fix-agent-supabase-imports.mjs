/**
 * Script to replace all async createClient() calls in ai-agents routes
 * with synchronous createServiceClient() - safe for server-side agent operations
 */
import { readFileSync, writeFileSync } from "fs"
import { glob } from "glob"

const files = await glob("app/api/ai-agents/**/*.ts", { cwd: process.cwd() })

let fixed = 0

for (const file of files) {
  let content = readFileSync(file, "utf-8")
  const original = content

  // Replace import
  content = content.replace(
    /import\s*\{\s*createClient\s*\}\s*from\s*["']@\/lib\/supabase\/server["']/g,
    `import { createServiceClient } from "@/lib/supabase/server"`
  )

  // Replace usages - both await and non-await forms
  content = content.replace(/const supabase = await createClient\(\)/g, "const supabase = createServiceClient()")
  content = content.replace(/const supabase = createClient\(\)/g, "const supabase = createServiceClient()")

  if (content !== original) {
    writeFileSync(file, content, "utf-8")
    console.log(`Fixed: ${file}`)
    fixed++
  }
}

console.log(`\nDone. Fixed ${fixed} files.`)
