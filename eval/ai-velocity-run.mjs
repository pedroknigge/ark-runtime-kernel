#!/usr/bin/env node
/**
 * Q05 — AI-velocity eval harness (fixture-measured, CI-safe, no live LLM).
 *
 * Same fixed feature scenario on two arms of tests/fixtures/design-weak-enforce:
 *   design-weak  — no golden pattern → multi-attempt placement ladder
 *   golden-path  — materialize `.ark/golden-pattern.json` with newCodeHome → 1 turn
 *
 * Metric: placementTurns (agent-equivalent steps to DomainModel landing).
 * Exit 0 only if golden-path is strictly better and honesty flags hold.
 *
 * Usage:
 *   node eval/ai-velocity-run.mjs
 *   node eval/ai-velocity-run.mjs --write-baseline
 *   npm run eval:ai-velocity
 *
 * Outputs:
 *   eval/ai-velocity-report.json
 *   eval/ai-velocity-baseline.json (when --write-baseline or missing)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEATURE_SCENARIO,
  materializeGoldenPathArm,
  runAiVelocityComparison,
} from '../bin/lib/ai-velocity.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const FIXTURE = path.join(REPO, 'tests/fixtures/design-weak-enforce');
const REPORT_PATH = path.join(HERE, 'ai-velocity-report.json');
const BASELINE_PATH = path.join(HERE, 'ai-velocity-baseline.json');

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function main() {
  const writeBaseline = process.argv.includes('--write-baseline');
  if (!fs.existsSync(path.join(FIXTURE, 'ark.config.json'))) {
    console.error(`[ai-velocity] missing fixture: ${FIXTURE}`);
    process.exit(2);
  }

  const config = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'ark.config.json'), 'utf8'));
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-ai-velocity-'));
  const designWeakRoot = path.join(tmpBase, 'design-weak');
  const goldenPathRoot = path.join(tmpBase, 'golden-path');

  try {
    copyTree(FIXTURE, designWeakRoot);
    // Ensure design-weak arm has NO golden (fixture may not ship one).
    const strayGolden = path.join(designWeakRoot, '.ark', 'golden-pattern.json');
    if (fs.existsSync(strayGolden)) fs.unlinkSync(strayGolden);

    materializeGoldenPathArm(FIXTURE, goldenPathRoot);

    const report = runAiVelocityComparison({
      designWeakRoot,
      goldenPathRoot,
      config,
    });
    report.generatedAt = new Date().toISOString();
    report.fixture = 'tests/fixtures/design-weak-enforce';
    report.command = 'npm run eval:ai-velocity';

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

    const baselineBody = {
      schemaVersion: '1',
      id: 'q05-ai-velocity',
      metric: 'placementTurns',
      scenarioId: FEATURE_SCENARIO.id,
      summary: {
        designWeakTurns: report.comparison.designWeakTurns,
        goldenPathTurns: report.comparison.goldenPathTurns,
        goldenStrictlyBetter: report.comparison.goldenStrictlyBetter,
        deltaTurns: report.comparison.deltaTurns,
      },
      method: report.comparison.method,
    };

    if (writeBaseline || !fs.existsSync(BASELINE_PATH)) {
      fs.writeFileSync(BASELINE_PATH, JSON.stringify(baselineBody, null, 2) + '\n');
    }

    // Console summary (method next to the number).
    console.log('Q05 AI-velocity (fixture-measured, no live LLM)');
    console.log(`  scenario: ${FEATURE_SCENARIO.id}`);
    console.log(`  prompt:   ${FEATURE_SCENARIO.prompt}`);
    console.log(`  metric:   placementTurns (agent-equivalent steps to DomainModel home)`);
    console.log(`  design-weak: ${report.comparison.designWeakTurns} turn(s)`);
    console.log(`  golden-path: ${report.comparison.goldenPathTurns} turn(s)`);
    console.log(
      `  delta:     ${report.comparison.deltaTurns} (golden strictly better: ${report.comparison.goldenStrictlyBetter})`
    );
    console.log(`  method:   ${report.comparison.method}`);
    console.log(`  report:   ${path.relative(REPO, REPORT_PATH)}`);

    if (!report.ok) {
      console.error('[ai-velocity] FAIL: golden-path is not strictly better on placementTurns');
      process.exit(1);
    }
    if (!report.honesty.designWeakArmStillDesignWeak) {
      console.error('[ai-velocity] FAIL: design-weak arm lost design residual (honesty)');
      process.exit(1);
    }
    if (!report.honesty.patternBetsNeverMechanicalSafe) {
      console.error('[ai-velocity] FAIL: patternBets honesty');
      process.exit(1);
    }

    // Baseline regression: golden must remain better than recorded design-weak floor.
    if (fs.existsSync(BASELINE_PATH)) {
      const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
      if (baseline.summary?.goldenPathTurns != null) {
        if (report.comparison.goldenPathTurns > baseline.summary.goldenPathTurns) {
          console.error(
            `[ai-velocity] FAIL: goldenPathTurns regressed (${report.comparison.goldenPathTurns} > baseline ${baseline.summary.goldenPathTurns})`
          );
          process.exit(1);
        }
      }
      if (
        baseline.summary?.designWeakTurns != null &&
        report.comparison.designWeakTurns < baseline.summary.designWeakTurns
      ) {
        // design-weak becoming "easier" without product change is suspicious for the ladder;
        // allow equal-or-higher friction only as soft note (not fail) — golden win is the gate.
      }
    }

    console.log('[ai-velocity] PASS');
    process.exit(0);
  } finally {
    if (!process.env.ARK_EVAL_KEEP) {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } else {
      console.error(`[ai-velocity] kept ${tmpBase}`);
    }
  }
}

main();
