#!/usr/bin/env node

/**
 * Script to synchronize core layer parsing and element rendering logic
 * from @ruledwdl/core (src/) to @ruledwdl/csr (wdl-csr/src/).
 * 
 * Usage:
 *   npm run sync:csr
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSrcDir = resolve(__dirname, '../src');
const csrDir = resolve(__dirname, '../../wdl/extensions/wdl-csr');
const csrSrcDir = resolve(csrDir, 'src');

if (!existsSync(csrSrcDir)) {
  console.error(`❌ wdl-csr target directory not found at: ${csrSrcDir}`);
  process.exit(1);
}

console.log('🔄 Syncing core engine modules to @ruledwdl/csr...');

// 1. Copy layers-parser.js directly (100% identical)
const layersParserContent = readFileSync(resolve(coreSrcDir, 'layers-parser.js'), 'utf-8');
writeFileSync(
  resolve(csrSrcDir, 'layers-parser.js'),
  `// src/layers-parser.js — Synced from @ruledwdl/core\n${layersParserContent}`
);
console.log('  ✓ Synced layers-parser.js');

// 2. Copy data-resolver.js directly (100% identical)
const dataResolverContent = readFileSync(resolve(coreSrcDir, 'data-resolver.js'), 'utf-8');
writeFileSync(
  resolve(csrSrcDir, 'data-resolver.js'),
  `// src/data-resolver.js — Synced from @ruledwdl/core\n${dataResolverContent}`
);
console.log('  ✓ Synced data-resolver.js');

// 3. Adapt element-builder.js for CSR (strip markdown import, use raw string passthrough)
let elBuilderContent = readFileSync(resolve(coreSrcDir, 'element-builder.js'), 'utf-8');
elBuilderContent = elBuilderContent
  .replace("import { renderInlineMarkdown } from './markdown.js';\n", '')
  .replace(
    "const txt = res.text\n    ? (RAW_TEXT.has(node.tag) ? String(res.text) : renderInlineMarkdown(res.text))\n    : '';",
    "// Raw text passthrough for CSR (no markdown dependency)\n  const txt = res.text ? String(res.text) : '';"
  );

writeFileSync(
  resolve(csrSrcDir, 'element-builder.js'),
  `// src/element-builder.js — Synced from @ruledwdl/core\n${elBuilderContent}`
);
console.log('  ✓ Synced element-builder.js (CSR adapted)');

// 4. Rebuild wdl-csr bundle
try {
  console.log('📦 Rebuilding @ruledwdl/csr bundle...');
  execSync('npm run build', { cwd: csrDir, stdio: 'inherit' });
  console.log('✅ @ruledwdl/csr successfully synchronized and built!');
} catch (err) {
  console.error('❌ Failed to build @ruledwdl/csr bundle:', err.message);
  process.exit(1);
}
