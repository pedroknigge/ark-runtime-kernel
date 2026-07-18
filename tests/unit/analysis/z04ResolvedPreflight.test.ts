import { describe, expect, it } from 'vitest';
import {
  RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION,
  createResolvedCandidateFacts,
  deterministicHash,
  loadContract,
  preflightResolvedChange,
  resolvedFactsEvidenceRequirementsHash,
  type ResolvedCandidateFactsInput,
  type ResolvedDependencyFact,
} from '../../../src/gate';

const contract = loadContract({
  include: ['src'],
  layers: [
    { name: 'DomainModel', patterns: ['src/domain/**'] },
    { name: 'Kernel', patterns: ['src/kernel/**'] },
  ],
  rules: [{ from: 'DomainModel', to: 'Kernel', allowed: false }],
});

function file(path: string, content: string) {
  return {
    path,
    contentHash: deterministicHash(content),
    parseStatus: 'parsed' as const,
    parseDiagnosticCount: 0,
    exportsOnlyTypes: false,
    typeOnlyExportNames: [],
    hasTopLevelSideEffects: false,
  };
}

function facts(
  files: ResolvedCandidateFactsInput['files'],
  dependencies: readonly ResolvedDependencyFact[] = [],
  identities: { compilerOptionsHash?: string; tsconfigHash?: string } = {}
) {
  return createResolvedCandidateFacts({
    schemaVersion: RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION,
    completeness: 'complete',
    completenessReasons: [],
    resolverIdentity: 'z04-overlay-resolver@1',
    compilerIdentity: 'typescript@test',
    compilerOptionsHash: identities.compilerOptionsHash ?? 'fnv1a-options',
    tsconfigHash: identities.tsconfigHash ?? 'fnv1a-tsconfig',
    evidenceRequirementsHash: resolvedFactsEvidenceRequirementsHash(contract.config),
    files,
    dependencies,
    capabilityUses: [],
    ambientUses: [],
    publishCalls: [],
    intentReferences: [],
    safetyUses: [],
  });
}

function dependency(
  from: string,
  specifier: string,
  target?: string
): ResolvedDependencyFact {
  return {
    from,
    specifier,
    kind: 'import',
    typeOnly: false,
    line: 1,
    resolution: target ? 'resolved-project' : 'unresolved',
    ...(target ? { target } : {}),
  };
}

describe('Z04 resolved atomic preflight', () => {
  it('binds an update to candidate content and returns the candidate verdict', () => {
    const before = 'export const order = 1;\n';
    const after = "import { service } from '../kernel/service';\nexport const order = service;\n";
    const kernel = 'export const service = 1;\n';
    const baseFacts = facts([
      file('src/domain/order.ts', before),
      file('src/kernel/service.ts', kernel),
    ]);
    const candidateFacts = facts(
      [file('src/domain/order.ts', after), file('src/kernel/service.ts', kernel)],
      [dependency('src/domain/order.ts', '../kernel/service', 'src/kernel/service.ts')]
    );

    const result = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts,
      changes: [{ path: 'src/domain/order.ts', content: after }],
    });

    expect(result).toMatchObject({
      mode: 'resolved-candidate-facts',
      readOnly: true,
      valid: false,
      baseFactsHash: baseFacts.factsHash,
      candidateFactsHash: candidateFacts.factsHash,
      changes: [
        {
          path: 'src/domain/order.ts',
          operation: 'update',
          beforeContentHash: deterministicHash(before),
          candidateContentHash: deterministicHash(after),
        },
      ],
    });
    expect(result.violations).toEqual([
      expect.objectContaining({ ruleId: 'LAYER_IMPORT_VIOLATION' }),
    ]);
  });

  it('resolves a created target from the candidate overlay', () => {
    const importer = "import { service } from '../kernel/new';\nexport const order = service;\n";
    const target = 'export const service = 1;\n';
    const baseFacts = facts(
      [file('src/domain/order.ts', importer)],
      [dependency('src/domain/order.ts', '../kernel/new')]
    );
    const candidateFacts = facts(
      [file('src/domain/order.ts', importer), file('src/kernel/new.ts', target)],
      [dependency('src/domain/order.ts', '../kernel/new', 'src/kernel/new.ts')]
    );

    const result = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts,
      changes: [{ path: 'src/kernel/new.ts', content: target }],
    });

    expect(result.changes).toEqual([
      expect.objectContaining({ path: 'src/kernel/new.ts', operation: 'create' }),
    ]);
    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleId: 'LAYER_IMPORT_VIOLATION',
        target: 'src/kernel/new.ts',
      }),
    ]);
  });

  it('accepts deleting either the violating importer or its target as one complete overlay', () => {
    const importer = "import { service } from '../kernel/service';\nexport const order = service;\n";
    const target = 'export const service = 1;\n';
    const baseFacts = facts(
      [file('src/domain/order.ts', importer), file('src/kernel/service.ts', target)],
      [dependency('src/domain/order.ts', '../kernel/service', 'src/kernel/service.ts')]
    );

    const deleteImporter = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts: facts([file('src/kernel/service.ts', target)]),
      changes: [{ path: 'src/domain/order.ts', delete: true }],
    });
    expect(deleteImporter).toMatchObject({
      valid: true,
      changes: [{ path: 'src/domain/order.ts', operation: 'delete' }],
    });

    const deleteTarget = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts: facts(
        [file('src/domain/order.ts', importer)],
        [dependency('src/domain/order.ts', '../kernel/service')]
      ),
      changes: [{ path: 'src/kernel/service.ts', delete: true }],
    });
    expect(deleteTarget).toMatchObject({
      valid: true,
      changes: [{ path: 'src/kernel/service.ts', operation: 'delete' }],
    });
  });

  it('fails closed for mismatched content and undeclared candidate changes', () => {
    const before = 'export const order = 1;\n';
    const declared = 'export const order = 2;\n';
    const other = 'export const order = 3;\n';
    const kernel = 'export const service = 1;\n';
    const baseFacts = facts([
      file('src/domain/order.ts', before),
      file('src/kernel/service.ts', kernel),
    ]);
    const candidateFacts = facts([
      file('src/domain/order.ts', other),
      file('src/kernel/service.ts', `${kernel}// undeclared\n`),
    ]);

    const result = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts,
      changes: [{ path: 'src/domain/order.ts', content: declared }],
    });

    expect(result.valid).toBe(false);
    expect(result.violations.map((violation) => violation.ruleId)).toEqual(
      expect.arrayContaining([
        'CANDIDATE_CONTENT_HASH_MISMATCH',
        'UNDECLARED_CANDIDATE_CHANGE',
      ])
    );
  });

  it('reports candidate-dependent compiler identities without treating them as environment drift', () => {
    const content = 'export const created = 1;\n';
    const baseFacts = facts([], [], {
      compilerOptionsHash: 'fnv1a-no-options',
      tsconfigHash: 'fnv1a-no-config',
    });
    const candidateFacts = facts([file('src/domain/created.ts', content)], [], {
      compilerOptionsHash: 'fnv1a-used-options',
      tsconfigHash: 'fnv1a-used-config',
    });

    const result = preflightResolvedChange({
      contract,
      baseFacts,
      candidateFacts,
      changes: [{ path: 'src/domain/created.ts', content }],
    });

    expect(result).toMatchObject({
      valid: true,
      baseCompilerOptionsHash: 'fnv1a-no-options',
      candidateCompilerOptionsHash: 'fnv1a-used-options',
      baseTsconfigHash: 'fnv1a-no-config',
      candidateTsconfigHash: 'fnv1a-used-config',
    });
    expect(result.violations).toEqual([]);
  });
});
