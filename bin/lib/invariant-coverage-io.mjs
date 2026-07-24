/**
 * Tooling I/O for ArkRules invariant coverage (AR10).
 * Pure evaluation lives in Domain (`evaluateInvariantCoverage`); this module
 * discovers test files and loads contents from disk (bounded).
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TEST_NAME_RE =
  /\.(test|spec)\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$|\/__tests__\/|\/tests?\//i;

/** Max files to load for coverage evidence (budget). */
const MAX_COVERAGE_FILES = 400;
/** Max bytes per file when reading for title/symbol mining. */
const MAX_FILE_BYTES = 256 * 1024;

/**
 * @param {string} root
 * @param {{ files?: Array<{ path: string }> }} facts
 * @param {{ testGlobs?: string[] }} [opts]
 * @returns {{ fileContents: Record<string, string>, testFiles: string[], testGlobsMissing: boolean }}
 */
export function loadInvariantCoverageInputs(root, facts, opts = {}) {
  const fileContents = {};
  const testFiles = [];
  const seen = new Set();

  const pushFile = (relPath) => {
    const rel = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!rel || seen.has(rel) || seen.size >= MAX_COVERAGE_FILES) return;
    const absolute = path.resolve(root, rel);
    if (!absolute.startsWith(path.resolve(root))) return;
    try {
      const stat = fs.statSync(absolute);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return;
      const content = fs.readFileSync(absolute, 'utf8');
      seen.add(rel);
      fileContents[rel] = content;
      if (DEFAULT_TEST_NAME_RE.test(rel)) testFiles.push(rel);
    } catch {
      // skip unreadable
    }
  };

  for (const file of facts?.files ?? []) {
    if (file?.path) pushFile(file.path);
  }

  // Walk common test roots when facts only cover production include globs.
  for (const dir of ['tests', 'test', 'src', '__tests__']) {
    const absDir = path.join(root, dir);
    if (!fs.existsSync(absDir)) continue;
    walkTestFiles(absDir, root, (rel) => {
      if (DEFAULT_TEST_NAME_RE.test(rel)) pushFile(rel);
    });
  }

  const testGlobsMissing = testFiles.length === 0;
  return { fileContents, testFiles, testGlobsMissing };
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {(rel: string) => void} onFile
 * @param {number} [depth]
 */
function walkTestFiles(dir, root, onFile, depth = 0) {
  if (depth > 8) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTestFiles(absolute, root, onFile, depth + 1);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = path.relative(root, absolute).replace(/\\/g, '/');
    onFile(rel);
  }
}
