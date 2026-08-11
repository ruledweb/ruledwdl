#!/usr/bin/env node

/**
 * RuledWDL Agent Validation Script
 * Programmatically validates candidate WDL JSON files against @ruledwdl/core rules.
 * 
 * Usage:
 *   node validate-wdl.js <path-to-json-file>
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import parser from core package relative to skill root
let parseLayers, composePage, createMemoryStore;
try {
  const corePath = resolve(__dirname, '../../../../src/index.js');
  const core = await import(corePath);
  parseLayers = core.parseLayers;
  composePage = core.composePage;
  createMemoryStore = core.createMemoryStore;
} catch (err) {
  console.error(`⚠️ Could not load @ruledwdl/core runtime from src/index.js: ${err.message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please provide a target WDL JSON file path to validate.');
  console.error('Usage: node validate-wdl.js <path-to-json-file>');
  process.exit(1);
}

const filePath = resolve(process.cwd(), args[0]);
let content;
try {
  content = readFileSync(filePath, 'utf-8');
} catch (err) {
  console.error(`❌ Failed to read target file "${filePath}": ${err.message}`);
  process.exit(1);
}

let wdl;
try {
  wdl = JSON.parse(content);
} catch (err) {
  console.error(`❌ JSON Syntax Error in "${filePath}": ${err.message}`);
  process.exit(1);
}

const errors = [];

// 1. Structure Check
if (typeof wdl !== 'object' || wdl === null || Array.isArray(wdl)) {
  errors.push('Root WDL document must be a non-null JSON object.');
} else {
  if (wdl.COMPONENTS && !Array.isArray(wdl.COMPONENTS)) {
    errors.push('COMPONENTS must be an array of component definitions.');
  }
  if (wdl.REGISTRY && (typeof wdl.REGISTRY !== 'object' || Array.isArray(wdl.REGISTRY))) {
    errors.push('REGISTRY must be an object of class-name style tokens.');
  }
  if (wdl.DATA && (typeof wdl.DATA !== 'object' || Array.isArray(wdl.DATA))) {
    errors.push('DATA must be a state object.');
  }
}

if (errors.length > 0) {
  console.error(`❌ Validation Failed (${errors.length} errors):\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

// 2. Check REGISTRY Keys
if (wdl.REGISTRY) {
  for (const key of Object.keys(wdl.REGISTRY)) {
    if (key !== '$version' && key.includes('.')) {
      errors.push(`REGISTRY key "${key}" contains a dot. Keys must be bare class names (e.g. "hero-card", NOT "div.hero-card").`);
    }
  }
}

// 3. Check COMPONENTS & Layers Grammar
if (wdl.COMPONENTS) {
  wdl.COMPONENTS.forEach((comp, idx) => {
    if (comp.layers) {
      // Test layer parsing
      try {
        parseLayers(comp.layers);
      } catch (err) {
        errors.push(`COMPONENTS[${idx}] layers syntax error in "${comp.layers}": ${err.message}`);
      }
    }
    
    // Check attr keys
    if (comp.attr) {
      for (const attrKey of Object.keys(comp.attr)) {
        if (attrKey.includes('.') && attrKey.split('.').length > 1 && !attrKey.startsWith('.')) {
          errors.push(`COMPONENTS[${idx}] attr selector "${attrKey}" uses combined tag.class syntax. Use bare class selector ".${attrKey.split('.')[1]}" instead.`);
        }
      }
    }
  });
}

// 4. Check DATA Loops
if (wdl.DATA) {
  for (const [dataKey, val] of Object.entries(wdl.DATA)) {
    if (Array.isArray(val) && dataKey !== '__head') {
      val.forEach((item, itemIdx) => {
        if (typeof item !== 'object' || item === null) {
          errors.push(`DATA.${dataKey}[${itemIdx}] is a primitive value ("${item}"). Data loops MUST be arrays of objects (e.g. [{"name": "${item}"}]).`);
        }
      });
    }
  }
}

// 5. Test Full Engine Composition
if (errors.length === 0) {
  try {
    const store = createMemoryStore({});
    const { html } = await composePage(store, 'validation-run', wdl);
    if (!html || html.length === 0) {
      errors.push('Engine produced empty HTML output.');
    }
  } catch (err) {
    errors.push(`Engine render error: ${err.message}`);
  }
}

// Output Report
if (errors.length > 0) {
  console.error(`❌ WDL Validation Failed (${errors.length} errors found):\n`);
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log(`✅ WDL JSON Validation Passed cleanly for "${args[0]}"!`);
  process.exit(0);
}
