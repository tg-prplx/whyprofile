#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node src/sync-stars.js examples/profile-scene.html',
    '',
    'Updates value="N★" on <bf-pill> and <bf-chip> elements that have repo="owner/name".'
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.length !== 1 || argv[0].startsWith('--')) {
    throw new Error(usage());
  }

  return path.resolve(argv[0]);
}

function parseAttrs(input) {
  const attrs = {};
  const attrPattern = /([:@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;
  let match;

  while ((match = attrPattern.exec(input))) {
    const [, name, doubleValue, singleValue, bareValue] = match;
    attrs[name.toLowerCase()] = doubleValue ?? singleValue ?? bareValue ?? 'true';
  }

  return attrs;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setAttr(tag, name, value) {
  const escaped = escapeAttr(value);
  const attrPattern = new RegExp(`(\\s${name}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s"'>/]+)`, 'i');

  if (attrPattern.test(tag)) {
    return tag.replace(attrPattern, `$1"${escaped}"`);
  }

  return tag.replace(/\s*\/?>$/, (end) => ` ${name}="${escaped}"${end}`);
}

async function fetchGitHubJson(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'whyprofile-star-sync'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${url}`);
  }

  return response.json();
}

function formatStars(count) {
  return `${Number(count).toLocaleString('en-US')}★`;
}

async function fetchStars(repo, cache) {
  const cleanRepo = String(repo).trim();

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cleanRepo)) {
    throw new Error(`Invalid repo name: ${cleanRepo}`);
  }

  if (!cache.has(cleanRepo)) {
    const data = await fetchGitHubJson(`https://api.github.com/repos/${cleanRepo}`);
    cache.set(cleanRepo, formatStars(data.stargazers_count));
  }

  return cache.get(cleanRepo);
}

async function syncStars(filePath) {
  const source = await readFile(filePath, 'utf8');
  const cache = new Map();
  const tagPattern = /<bf-(?:pill|chip)\b[^>]*>/gi;
  const replacements = [];

  for (const match of source.matchAll(tagPattern)) {
    const tag = match[0];
    const attrs = parseAttrs(tag);

    if (!attrs.repo) {
      continue;
    }

    try {
      const value = await fetchStars(attrs.repo, cache);
      replacements.push({
        end: match.index + tag.length,
        index: match.index,
        updatedTag: setAttr(tag, 'value', value)
      });
      console.log(`${attrs.repo}: ${value}`);
    } catch (error) {
      console.warn(`Keeping current value for ${attrs.repo}: ${error.message}`);
    }
  }

  if (replacements.length === 0) {
    console.log('No repo-backed elements found.');
    return;
  }

  let output = source;

  for (const { end, index, updatedTag } of replacements.sort((left, right) => right.index - left.index)) {
    output = `${output.slice(0, index)}${updatedTag}${output.slice(end)}`;
  }

  if (output !== source) {
    await writeFile(filePath, output, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log('Stars already up to date.');
  }
}

const filePath = parseArgs(process.argv.slice(2));

syncStars(filePath).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
