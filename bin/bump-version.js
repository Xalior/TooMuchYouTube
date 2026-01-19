#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'extension', 'manifest.json');
const pkgPath = path.join(root, 'package.json');
const readmePath = path.join(root, 'README.md');
const changelogPath = path.join(root, 'docs', 'changelog.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function updateReadme(version) {
  if (!fs.existsSync(readmePath)) {
    return;
  }

  const contents = fs.readFileSync(readmePath, 'utf8').split('\n');
  const versionLine = `Version: ${version} · Changelog: [docs/changelog.md](docs/changelog.md)`;

  let replaced = false;
  for (let i = 0; i < contents.length; i += 1) {
    if (contents[i].startsWith('Version: ')) {
      contents[i] = versionLine;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    for (let i = 0; i < contents.length; i += 1) {
      if (contents[i].trim() === '' && i > 0 && contents[i - 1].includes('Make YouTube play')) {
        contents.splice(i, 0, versionLine);
        replaced = true;
        break;
      }
    }
  }

  if (!replaced) {
    contents.splice(2, 0, versionLine);
  }

  fs.writeFileSync(readmePath, contents.join('\n'));
}

function updateChangelog(version, phrase) {
  if (!fs.existsSync(changelogPath)) {
    return;
  }

  const lines = fs.readFileSync(changelogPath, 'utf8').split('\n');
  const heading = phrase ? `## ${version} - ${phrase}` : `## ${version}`;

  const insertIndex = lines.findIndex((line) => line.startsWith('## '));
  const entryLines = [heading, '', '- TBD', ''];

  if (insertIndex === -1) {
    lines.push('', ...entryLines);
  } else {
    lines.splice(insertIndex, 0, ...entryLines);
  }

  fs.writeFileSync(changelogPath, lines.join('\n'));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('New version (x.y.z): ', (version) => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Invalid version. Use x.y.z');
    rl.close();
    process.exit(1);
  }

  rl.question('Fun release phrase (optional): ', (phrase) => {
    const trimmed = phrase.trim();

    if (fs.existsSync(manifestPath)) {
      const manifest = readJson(manifestPath);
      manifest.version = version;
      writeJson(manifestPath, manifest);
    }

    if (fs.existsSync(pkgPath)) {
      const pkg = readJson(pkgPath);
      pkg.version = version;
      writeJson(pkgPath, pkg);
    }

    updateReadme(version);
    updateChangelog(version, trimmed.length ? trimmed : null);

    console.log(`Version bumped to ${version}`);
    if (trimmed.length) {
      console.log(`Release phrase set: ${trimmed}`);
    }

    rl.close();
  });
});
