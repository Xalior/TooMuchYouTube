#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'extension', 'src');
const outDir = path.join(root, 'extension', 'dist');

if (!fs.existsSync(srcDir)) {
  console.error(`Missing source directory: ${srcDir}`);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const entries = {
  'content': path.join(srcDir, 'content.ts'),
  'page-bridge': path.join(srcDir, 'page-bridge.ts'),
  'popup': path.join(srcDir, 'popup.ts')
};

const builds = Object.entries(entries).map(([name, entryPoint]) => {
  if (!fs.existsSync(entryPoint)) {
    console.error(`Missing entry: ${entryPoint}`);
    process.exit(1);
  }

  return esbuild.build({
    entryPoints: [entryPoint],
    outfile: path.join(outDir, `${name}.js`),
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    format: 'iife'
  });
});

Promise.all(builds)
  .then(() => {
    console.log(`Extension build complete: ${outDir}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
