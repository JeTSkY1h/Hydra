#!/usr/bin/env node
/**
 * Adds .js extensions to relative imports in compiled Prisma generated files.
 *
 * Root cause: tsc with moduleResolution:"bundler" does not add .js extensions
 * to relative imports in the compiled output. Node.js native ESM requires
 * explicit extensions. Prisma's generated TypeScript uses extensionless imports,
 * which works fine for bundlers (Vite, esbuild) but breaks Node.js ESM directly.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const targetDir = join(__dirname, '..', 'dist', 'generated', 'prisma')

const ALREADY_HAS_EXT = /\.(js|mjs|cjs|json)$/

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const fixed = content.replace(
    /from (['"])(\.\.?\/[^'"]+)\1/g,
    (match, quote, importPath) => {
      if (ALREADY_HAS_EXT.test(importPath)) return match
      return `from ${quote}${importPath}.js${quote}`
    }
  )
  if (fixed !== content) {
    writeFileSync(filePath, fixed)
    console.log(`  fixed: ${filePath}`)
  }
}

function processDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      processDir(fullPath)
    } else if (extname(entry) === '.js') {
      processFile(fullPath)
    }
  }
}

console.log('Fixing ESM extensions in generated Prisma dist files...')
processDir(targetDir)
console.log('Done.')
