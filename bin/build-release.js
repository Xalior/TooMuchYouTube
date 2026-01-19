#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const manifestPath = path.join(root, 'extension', 'manifest.json');

if (!fs.existsSync(pkgPath)) {
  console.error('Missing package.json at repo root.');
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error('Missing extension/manifest.json.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const config = pkg.config || {};

const namespace = config.releaseNamespace;
const sourceDir = config.sourceDir || 'extension';
const releaseDir = config.releaseDir || 'releases';

if (!namespace) {
  console.error('Missing config.releaseNamespace in package.json.');
  process.exit(1);
}

const version = manifest.version;
if (!version) {
  console.error('Missing version in extension/manifest.json.');
  process.exit(1);
}

const absSourceDir = path.join(root, sourceDir);
if (!fs.existsSync(absSourceDir)) {
  console.error(`Source directory not found: ${absSourceDir}`);
  process.exit(1);
}

const absReleaseDir = path.join(root, releaseDir);
fs.mkdirSync(absReleaseDir, { recursive: true });

const outputFile = `${namespace}-${version}.zip`;
const outputPath = path.join(absReleaseDir, outputFile);

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

const python = spawnSync(
  'python3',
  ['-c',
    [
      'import os, zipfile',
      'root = os.environ["ROOT"]',
      'src = os.environ["SRC"]',
      'out = os.environ["OUT"]',
      'if os.path.exists(out): os.remove(out)',
      'with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:',
      '  for base, dirs, files in os.walk(src):',
      '    dirs[:] = [d for d in dirs if not d.startswith(".")]',
      '    for f in files:',
      '      if f.startswith(".") or f == ".DS_Store":',
      '        continue',
      '      full = os.path.join(base, f)',
      '      rel = os.path.relpath(full, src)',
      '      z.write(full, rel)',
      'print(out)'
    ].join('\n')
  ],
  {
    env: {
      ...process.env,
      ROOT: root,
      SRC: absSourceDir,
      OUT: outputPath
    },
    stdio: 'inherit'
  }
);

if (python.status !== 0) {
  process.exit(python.status || 1);
}

console.log(`Release created: ${outputPath}`);
