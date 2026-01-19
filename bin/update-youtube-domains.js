#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL =
  'https://raw.githubusercontent.com/v2fly/domain-list-community/refs/heads/master/data/youtube';

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const sourcePath = path.join(dataDir, 'youtube-domains-source.txt');
const listPath = path.join(dataDir, 'youtube-domains.txt');
const domainsTsPath = path.join(root, 'extension', 'src', 'domains.ts');
const manifestPath = path.join(root, 'extension', 'manifest.json');

const args = new Set(process.argv.slice(2));
const shouldFetch = args.has('--fetch');
const shouldCheck = args.has('--check');
const outputJson = args.has('--json');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = (targetUrl, depth = 0) => {
      if (depth > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      https
        .get(
          targetUrl,
          {
            headers: {
              'User-Agent': 'TooMuchYouTube domain sync'
            }
          },
          (res) => {
            const { statusCode, headers } = res;
            if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
              res.resume();
              request(headers.location, depth + 1);
              return;
            }
            if (statusCode && statusCode >= 400) {
              reject(new Error(`HTTP ${statusCode}`));
              return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => resolve(data));
          }
        )
        .on('error', reject);
    };
    request(url);
  });
}

function normalizeLine(line) {
  let cleaned = line.trim();
  if (!cleaned || cleaned.startsWith('#')) return null;
  const commentIndex = cleaned.indexOf(' #');
  if (commentIndex !== -1) {
    cleaned = cleaned.slice(0, commentIndex).trim();
  }
  if (cleaned.startsWith('include:')) return null;
  if (cleaned.startsWith('regexp:')) return null;
  if (cleaned.startsWith('keyword:')) return null;

  if (cleaned.includes(' ')) {
    cleaned = cleaned.split(' ')[0].trim();
  }

  if (cleaned.startsWith('full:')) cleaned = cleaned.slice(5).trim();
  if (cleaned.startsWith('domain:')) cleaned = cleaned.slice(7).trim();
  if (cleaned.startsWith('suffix:')) cleaned = cleaned.slice(7).trim();

  cleaned = cleaned.toLowerCase().replace(/^\./, '').replace(/\.$/, '');
  if (!cleaned) return null;
  if (cleaned.includes('/')) return null;
  if (cleaned.includes('*')) return null;
  return cleaned;
}

function isAllowedDomain(domain) {
  if (domain === 'youtu.be' || domain === 'yt.be') return true;
  if (!domain.startsWith('youtube')) return false;

  const blockedSuffixes = [
    '.google.com',
    '.googleapis.com',
    '.googleusercontent.com'
  ];
  if (blockedSuffixes.some((suffix) => domain.endsWith(suffix))) {
    return false;
  }

  const blockedExact = new Set([
    'ggpht.com',
    'ggpht.cn',
    'googlevideo.com',
    'ytimg.com',
    'yt3.googleusercontent.com',
    'wide-youtube.l.google.com',
    'youtube-ui.l.google.com',
    'youtubeembeddedplayer.googleapis.com',
    'youtubei.googleapis.com'
  ]);

  if (blockedExact.has(domain)) return false;
  if (!domain.includes('.')) return false;
  return true;
}

function loadDomains(rawText) {
  const domains = new Set();
  rawText.split('\n').forEach((line) => {
    const normalized = normalizeLine(line);
    if (!normalized) return;
    if (!isAllowedDomain(normalized)) return;
    domains.add(normalized);
  });
  return Array.from(domains).sort();
}

function writeDomainsFile(domains) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(listPath, domains.join('\n') + '\n');
}

function writeDomainsTs(domains) {
  const lines = [
    'export const YOUTUBE_DOMAINS = [',
    ...domains.map((domain) => `  '${domain}',`),
    '] as const;',
    '',
    'const DOMAIN_SET = new Set<string>(YOUTUBE_DOMAINS);',
    '',
    'export function isYouTubeHost(hostname: string) {',
    '  const host = hostname.toLowerCase();',
    '  if (DOMAIN_SET.has(host)) return true;',
    '  for (const domain of YOUTUBE_DOMAINS) {',
    '    if (host.endsWith(`.${domain}`)) return true;',
    '  }',
    '  return false;',
    '}',
    ''
  ];
  fs.writeFileSync(domainsTsPath, lines.join('\n'));
}

function buildMatchPatterns(domains) {
  const patterns = new Set();
  domains.forEach((domain) => {
    patterns.add(`https://${domain}/*`);
    patterns.add(`https://*.${domain}/*`);
  });
  return Array.from(patterns).sort();
}

function updateManifest(patterns) {
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing extension/manifest.json');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.content_scripts)) {
    console.error('manifest.json missing content_scripts');
    process.exit(1);
  }
  manifest.content_scripts = manifest.content_scripts.map((script) => ({
    ...script,
    matches: patterns
  }));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function readExistingDomains() {
  if (!fs.existsSync(listPath)) return [];
  return fs
    .readFileSync(listPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function diffDomains(current, next) {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  const added = next.filter((domain) => !currentSet.has(domain));
  const removed = current.filter((domain) => !nextSet.has(domain));
  return { added, removed, hasChanges: added.length > 0 || removed.length > 0 };
}

function emitStatus(payload) {
  if (outputJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (payload.hasChanges) {
    console.log(`Domains changed: +${payload.added.length} -${payload.removed.length}`);
  } else {
    console.log('Domains unchanged.');
  }
}

async function main() {
  let rawText = '';
  if (shouldCheck) {
    rawText = await fetchText(SOURCE_URL);
  } else if (shouldFetch) {
    rawText = await fetchText(SOURCE_URL);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(sourcePath, rawText);
  } else if (fs.existsSync(sourcePath)) {
    rawText = fs.readFileSync(sourcePath, 'utf8');
  } else if (fs.existsSync(listPath)) {
    rawText = fs.readFileSync(listPath, 'utf8');
  } else {
    console.error('Missing domain list. Run with --fetch first.');
    process.exit(1);
  }

  const domains = loadDomains(rawText);
  if (domains.length === 0) {
    console.error('No domains parsed from source.');
    process.exit(1);
  }

  if (shouldCheck) {
    const current = readExistingDomains();
    const diff = diffDomains(current, domains);
    emitStatus({
      hasChanges: diff.hasChanges,
      added: diff.added,
      removed: diff.removed,
      currentCount: current.length,
      nextCount: domains.length
    });
    return;
  }

  writeDomainsFile(domains);
  writeDomainsTs(domains);
  updateManifest(buildMatchPatterns(domains));

  console.log(`Domains updated: ${domains.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
