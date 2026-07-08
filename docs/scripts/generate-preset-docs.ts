/**
 * Generates one docs page per bundled preset from presets/*.yaml.
 *
 * Each preset carries a `meta:` block (title, description) that becomes the
 * page frontmatter, so the docs are read directly from the preset source and
 * can never drift. Output goes to docs/docs/presets/ (gitignored); this runs
 * before `docusaurus start` / `docusaurus build` via the package.json scripts.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const presetsDir = resolve(scriptDir, '../../presets');
const outDir = resolve(scriptDir, '../docs/presets');

interface PresetMeta {
  title?: unknown;
  description?: unknown;
}

/**
 * Remove the top-level `meta:` block from preset source before rendering.
 * The block exists to feed this generator's frontmatter; showing it in the
 * "Full preset" listing would just be noise for someone copying the config.
 */
function stripMetaBlock(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let inMeta = false;
  for (const line of lines) {
    if (inMeta) {
      if (/^\s/.test(line) || line.trim() === '') continue;
      inMeta = false;
    }
    if (/^meta:/.test(line)) {
      inMeta = true;
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

const yamlFiles = readdirSync(presetsDir)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

if (yamlFiles.length === 0) {
  throw new Error(`No preset YAML files found in ${presetsDir}`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of yamlFiles) {
  const name = basename(file, '.yaml');
  const source = readFileSync(join(presetsDir, file), 'utf8');
  const parsed = load(source) as { meta?: PresetMeta } | null;

  const meta = parsed?.meta;
  const title = typeof meta?.title === 'string' ? meta.title.trim() : '';
  const description = typeof meta?.description === 'string' ? meta.description.trim() : '';
  if (!title || !description) {
    throw new Error(
      `presets/${file} is missing meta.title and/or meta.description — every bundled preset needs a meta block for the docs catalog.`,
    );
  }

  const page = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

${description}

\`\`\`yaml title=".claude/fencepost.yaml"
import:
  - ${name}
\`\`\`

## Full preset

\`\`\`yaml title="presets/${file}"
${stripMetaBlock(source)}
\`\`\`
`;

  writeFileSync(join(outDir, `${name}.md`), page);
}

console.log(`Generated ${yamlFiles.length} preset pages in ${outDir}`);
