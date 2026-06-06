#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pictureSnippet, renderScene } from './index.js';

function usage() {
  return [
    'Usage:',
    '  node src/cli.js examples/profile-scene.config.mjs --out assets --snippet dist/picture-snippet.html',
    '',
    'Options:',
    '  --out       Directory for scene-dark.svg and scene-light.svg',
    '  --snippet   Optional file for the GitHub README <picture> snippet'
  ].join('\n');
}

function parseArgs(argv) {
  const args = { out: 'assets' };
  const [configPath, ...rest] = argv;

  if (!configPath || configPath.startsWith('--')) {
    throw new Error(`Missing config file.\n\n${usage()}`);
  }

  args.config = configPath;

  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    const value = rest[index + 1];

    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }

    args[key.slice(2)] = value;
    index += 1;
  }

  return args;
}

async function loadScene(configPath) {
  const absolute = path.resolve(configPath);

  if (path.extname(absolute).toLowerCase() === '.html') {
    const { htmlScene } = await import('./html.js');
    return htmlScene(absolute);
  }

  const module = await import(`${pathToFileURL(absolute).href}?t=${Date.now()}`);
  const scene = module.default ?? module.scene;

  if (!scene || typeof scene.render !== 'function') {
    throw new Error('Config must export a scene with a render(ctx) function.');
  }

  return scene;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scene = await loadScene(args.config);
  const outDir = path.resolve(args.out);
  await mkdir(outDir, { recursive: true });

  for (const variant of ['dark', 'light']) {
    const output = await renderScene(scene, variant);
    const target = path.join(outDir, `scene-${variant}.svg`);
    await writeFile(target, output, 'utf8');
    console.log(`Generated ${target}`);
  }

  if (args.snippet) {
    const snippetPath = path.resolve(args.snippet);
    await mkdir(path.dirname(snippetPath), { recursive: true });
    await writeFile(snippetPath, pictureSnippet({
      alt: scene.alt ?? scene.title ?? 'profile scene'
    }), 'utf8');
    console.log(`Generated ${snippetPath}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
