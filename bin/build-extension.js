#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'extension', 'src');
const outDir = path.join(root, 'extension', 'dist');
const modeArg = process.argv[2] || '';
const buildMode = process.env.BUILD_MODE || modeArg || 'debug';
const isProd = buildMode === 'prod';

if (!['debug', 'prod'].includes(buildMode)) {
  console.error('Build mode must be "debug" or "prod".');
  process.exit(1);
}

if (!fs.existsSync(srcDir)) {
  console.error(`Missing source directory: ${srcDir}`);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const git = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
});
const gitHash = git.status === 0 ? git.stdout.trim() : 'nogit';
const now = new Date();
const buildTime = [
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0')
].join('');
const buildDate = [
  ((String(now.getFullYear()).match(/[\s\S]{1,2}/g)))[1],
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0')
].join('');

console.info(" BUILD MOMENT: ",buildDate,buildTime);
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
    minify: isProd,
    sourcemap: false,
    target: ['es2020'],
    format: 'iife',
    define: {
      __BUILD_MODE__: JSON.stringify(buildMode),
      __BUILD_GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __BUILD_TIME__: JSON.stringify(buildTime)
    }
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
