#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

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
const releaseInclude = Array.isArray(config.releaseInclude)
  ? config.releaseInclude
  : ['manifest.json', 'popup.html', 'popup.css', 'dist', 'icons'];

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

const build = spawnSync('npm', ['run', 'build:extension:prod'], {
  cwd: root,
  stdio: 'inherit'
});

if (build.status !== 0) {
  process.exit(build.status || 1);
}

const absReleaseDir = path.join(root, releaseDir);
fs.mkdirSync(absReleaseDir, { recursive: true });

const outputFile = `${namespace}-${version}.zip`;
const outputPath = path.join(absReleaseDir, outputFile);

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

function addPath(archive, absRoot, entry) {
  const targetPath = path.join(absRoot, entry);
  if (!fs.existsSync(targetPath)) {
    console.error(`Missing include: ${targetPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    archive.directory(targetPath, entry);
  } else {
    archive.file(targetPath, { name: entry });
  }
}

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Release created: ${outputPath}`);
});

archive.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

archive.pipe(output);
releaseInclude.forEach((entry) => addPath(archive, absSourceDir, entry));
archive.finalize();
