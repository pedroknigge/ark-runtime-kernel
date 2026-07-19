/**
 * Stable, pure vocabulary for ArkGate's importable analysis engine.
 *
 * Parsing and filesystem discovery belong to adapters. This module intentionally
 * contains only the versioned data contract and deterministic hash primitives.
 */
import type { ArkConfig } from './configTypes';

export const ANALYSIS_IR_SCHEMA_VERSION = '1.0' as const;
export const RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION = '1.0' as const;

export type ResolvedFactsCompleteness = 'complete' | 'partial' | 'unavailable';
export type ResolvedDependencyKind = 'import' | 'export' | 'dynamic-import' | 'require';
export type ResolvedDependencyState =
  | 'resolved-project'
  | 'resolved-external'
  | 'unresolved'
  | 'dynamic';
export type ResolvedCapability =
  | 'network'
  | 'filesystem'
  | 'clock'
  | 'randomness'
  | 'environment'
  | 'process'
  | 'persistence';

const RESOLVED_CAPABILITY_IDS = [
  'network',
  'filesystem',
  'clock',
  'randomness',
  'environment',
  'process',
  'persistence',
] as const;

export type ResolvedFactsReason = {
  code: string;
  message: string;
  file?: string;
};

export type ResolvedFileFact = {
  path: string;
  contentHash: string;
  parseStatus: 'parsed' | 'invalid';
  parseDiagnosticCount: number;
  exportsOnlyTypes: boolean;
  typeOnlyExportNames: string[];
  hasTopLevelSideEffects: boolean;
};

export type ResolvedDependencyFact = {
  from: string;
  specifier?: string;
  kind: ResolvedDependencyKind;
  typeOnly: boolean;
  line: number;
  resolution: ResolvedDependencyState;
  target?: string;
  namedBindings?: string[];
  targetTypeOnlyExports?: boolean;
  sourcePureTypeModule?: boolean;
  namedBindingsTypeOnly?: boolean;
  portProofEligible?: boolean;
};

export type ResolvedCapabilityFact = {
  file: string;
  line: number;
  symbol: string;
  capability: ResolvedCapability;
  source: 'ambient-global' | 'import-based';
};

export type ResolvedAmbientFact = {
  file: string;
  line: number;
  symbol: string;
};

export type ResolvedPublishFact = {
  file: string;
  line: number;
  rawIntentName?: string;
  objectHasIntent: boolean;
  arkPublishCandidate: boolean;
  hasSource: boolean;
  sourceIntent?: string;
};

export type ResolvedIntentReferenceFact = {
  file: string;
  line: number;
  intent: string;
};

export type ResolvedSafetyKind =
  | 'ts-suppression'
  | 'any-cast'
  | 'dynamic-import'
  | 'dynamic-require'
  | 'in-memory-store';

/** Neutral syntax evidence for policy-controlled safety diagnostics. */
export type ResolvedSafetyFact = {
  file: string;
  line: number;
  kind: ResolvedSafetyKind;
  symbol?: string;
};

export type ResolvedCandidateFactsInput = {
  schemaVersion: typeof RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION;
  completeness: ResolvedFactsCompleteness;
  completenessReasons: readonly ResolvedFactsReason[];
  resolverIdentity: string;
  compilerIdentity: string;
  compilerOptionsHash: string;
  tsconfigHash: string;
  evidenceRequirementsHash: string;
  projectPackageName?: string;
  files: readonly ResolvedFileFact[];
  dependencies: readonly ResolvedDependencyFact[];
  capabilityUses: readonly ResolvedCapabilityFact[];
  ambientUses: readonly ResolvedAmbientFact[];
  publishCalls: readonly ResolvedPublishFact[];
  intentReferences: readonly ResolvedIntentReferenceFact[];
  safetyUses: readonly ResolvedSafetyFact[];
};

export type ResolvedCandidateFacts = Omit<ResolvedCandidateFactsInput, 'candidateTreeHash'> & {
  completenessReasons: ResolvedFactsReason[];
  candidateTreeHash: string;
  files: ResolvedFileFact[];
  dependencies: ResolvedDependencyFact[];
  capabilityUses: ResolvedCapabilityFact[];
  ambientUses: ResolvedAmbientFact[];
  publishCalls: ResolvedPublishFact[];
  intentReferences: ResolvedIntentReferenceFact[];
  safetyUses: ResolvedSafetyFact[];
  factsHash: string;
};

export type AnalysisFileInput = {
  path: string;
  content: string;
};

export type AnalysisFileChange =
  | { path: string; content: string }
  | { path: string; delete: true };

export type AnalysisCompilerOptions = Readonly<Record<string, unknown>>;

export type AnalysisFile = AnalysisFileInput & {
  contentHash: string;
  layer: string | null;
};

export type AnalysisImportEdge = {
  from: string;
  specifier: string;
  to: string | null;
  resolution: 'resolved' | 'unresolved';
  fromLayer: string | null;
  toLayer: string | null;
  evidence: AnalysisEvidence;
};

/** A capability use is reserved for C04's symbol-aware implementation. */
export type AnalysisCapabilityUse = {
  file: string;
  symbol: string;
  capability: string;
  evidence: AnalysisEvidence;
};

export type AnalysisEvidence = {
  kind: 'import' | 'policy';
  file: string;
  line: number;
  excerpt: string;
};

export type AnalysisViolation = {
  ruleId: string;
  message: string;
  edge?: AnalysisImportEdge;
  /** U04 (additive): present on CAPABILITY_VIOLATION — the denied capability id. */
  capability?: string;
  /** U04 (additive): the matched module specifier or ambient path. */
  symbol?: string;
  evidence: AnalysisEvidence;
};

export type AnalysisIr = {
  schemaVersion: typeof ANALYSIS_IR_SCHEMA_VERSION;
  policyHash: string;
  compilerOptionsHash: string;
  files: AnalysisFile[];
  layers: string[];
  edges: AnalysisImportEdge[];
  capabilityUses: AnalysisCapabilityUse[];
  violations: AnalysisViolation[];
};

/**
 * Stable FNV-1a hash. It is an identity/fingerprint, not a security primitive.
 * The output is deliberately portable across the CLI, MCP, hooks, and browserless
 * consumers without Node's crypto runtime.
 */
export function deterministicHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/** Serialize JSON-like values with sorted object keys for reproducible hashes. */
export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
    .join(',')}}`;
}

function compareCanonical(left: unknown, right: unknown): number {
  const leftKey = stableSerialize(left);
  const rightKey = stableSerialize(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Identity of the policy-controlled evidence a resolver must attempt to collect. */
export function resolvedFactsEvidenceRequirementsHash(config: ArkConfig): string {
  const requirements = {
    schemaVersion: RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION,
    include: sortedUnique(config.include ?? []),
    exclude: sortedUnique(config.exclude ?? []),
    excludeGenerated: config.excludeGenerated !== false,
    dynamicImportAllowlist: sortedUnique(config.dynamicImportAllowlist ?? []),
    layers: config.layers
      .map((layer) => ({
        name: layer.name,
        patterns: sortedUnique(layer.patterns ?? []),
        exclude: sortedUnique(layer.exclude ?? []),
        forbiddenGlobals: sortedUnique(layer.forbiddenGlobals ?? []),
        intentPrefixes: sortedUnique(layer.intentPrefixes ?? []),
        capabilityDeny: sortedUnique(layer.capabilities?.deny ?? []),
        pure: layer.pure === true,
      }))
      .sort(compareCanonical),
    safety: {
      maxTsSuppressions: config.safety?.maxTsSuppressions ?? 0,
      maxAnyCasts: config.safety?.maxAnyCasts ?? 0,
      allowInMemory: config.safety?.allowInMemory === true,
      allowDisabledPeerIsolation: config.safety?.allowDisabledPeerIsolation === true,
    },
  };
  return deterministicHash(stableSerialize(requirements));
}

function canonicalResolvedFactsInput(
  input: ResolvedCandidateFactsInput
): Omit<ResolvedCandidateFacts, 'factsHash'> {
  const completenessReasons = input.completenessReasons
    .map((reason) => ({
      code: reason.code,
      message: reason.message,
      ...(reason.file ? { file: reason.file } : {}),
    }))
    .sort(compareCanonical);
  const files = input.files
    .map((file) => ({
      ...file,
      typeOnlyExportNames: sortedUnique(file.typeOnlyExportNames),
    }))
    .sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0
    );
  const dependencies = input.dependencies
    .map((dependency) => ({
      ...dependency,
      ...(dependency.namedBindings
        ? { namedBindings: sortedUnique(dependency.namedBindings) }
        : {}),
    }))
    .sort(compareCanonical);
  const capabilityUses = input.capabilityUses
    .map((fact) => ({ ...fact }))
    .sort(compareCanonical);
  const ambientUses = input.ambientUses
    .map((fact) => ({ ...fact }))
    .sort(compareCanonical);
  const publishCalls = input.publishCalls
    .map((fact) => ({ ...fact }))
    .sort(compareCanonical);
  const intentReferences = input.intentReferences
    .map((fact) => ({ ...fact }))
    .sort(compareCanonical);
  const safetyUses = input.safetyUses
    .map((fact) => ({ ...fact }))
    .sort(compareCanonical);
  const candidateTree = input.files
    .map(({ path, contentHash }) => ({ path, contentHash }))
    .sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0
    );
  const candidateTreeHash = deterministicHash(
    stableSerialize(candidateTree)
  );
  return {
    schemaVersion: RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION,
    completeness: input.completeness,
    completenessReasons,
    resolverIdentity: input.resolverIdentity,
    compilerIdentity: input.compilerIdentity,
    compilerOptionsHash: input.compilerOptionsHash,
    tsconfigHash: input.tsconfigHash,
    candidateTreeHash,
    evidenceRequirementsHash: input.evidenceRequirementsHash,
    ...(input.projectPackageName ? { projectPackageName: input.projectPackageName } : {}),
    files,
    dependencies,
    capabilityUses,
    ambientUses,
    publishCalls,
    intentReferences,
    safetyUses,
  };
}

function createCanonicalResolvedCandidateFacts(
  input: ResolvedCandidateFactsInput
): ResolvedCandidateFacts {
  const canonical = canonicalResolvedFactsInput(input);
  return {
    ...canonical,
    factsHash: deterministicHash(stableSerialize(canonical)),
  };
}

export function createResolvedCandidateFacts(
  input: ResolvedCandidateFactsInput
): ResolvedCandidateFacts {
  return createCanonicalResolvedCandidateFacts(parseResolvedFactsInput(asRecord(input, '$'), false));
}

function asRecord(value: unknown, at: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${at} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], at: string): void {
  const known = new Set(allowed);
  const unexpected = Object.keys(record).find((key) => !known.has(key));
  if (unexpected) throw new Error(`${at}.${unexpected} is not part of schema 1.0.`);
}

function requiredText(record: Record<string, unknown>, key: string, at: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${at}.${key} must be a non-empty string.`);
  }
  return value;
}

function optionalText(record: Record<string, unknown>, key: string, at: string): string | undefined {
  if (record[key] === undefined) return undefined;
  return requiredText(record, key, at);
}

function requiredProjectPath(record: Record<string, unknown>, key: string, at: string): string {
  const value = requiredText(record, key, at);
  const portable = value.replace(/\\/g, '/');
  if (
    !portable ||
    portable.startsWith('/') ||
    /^[A-Za-z]:\//.test(portable) ||
    /[\u0000-\u001f\u007f]/.test(portable)
  ) {
    throw new Error(`${at}.${key} must be a canonical project-relative path.`);
  }
  const segments: string[] = [];
  for (const segment of portable.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) {
        throw new Error(`${at}.${key} must be a canonical project-relative path.`);
      }
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  const normalized = segments.join('/');
  if (!normalized || normalized !== value) {
    throw new Error(`${at}.${key} must be a canonical project-relative path.`);
  }
  return normalized;
}

function requiredBoolean(record: Record<string, unknown>, key: string, at: string): boolean {
  if (typeof record[key] !== 'boolean') throw new Error(`${at}.${key} must be a boolean.`);
  return record[key] as boolean;
}

function requiredInteger(record: Record<string, unknown>, key: string, at: string): number {
  const value = record[key];
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${at}.${key} must be a non-negative integer.`);
  }
  return Number(value);
}

function requiredPositiveInteger(record: Record<string, unknown>, key: string, at: string): number {
  const value = requiredInteger(record, key, at);
  if (value === 0) throw new Error(`${at}.${key} must be a positive integer.`);
  return value;
}

function requiredArray(record: Record<string, unknown>, key: string, at: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`${at}.${key} must be an array.`);
  return value;
}

function enumValue<T extends string>(
  record: Record<string, unknown>,
  key: string,
  values: readonly T[],
  at: string
): T {
  const value = record[key];
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new Error(`${at}.${key} must be one of ${values.join(', ')}.`);
  }
  return value as T;
}

function parseStringArray(value: unknown, at: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry)) {
    throw new Error(`${at} must be an array of non-empty strings.`);
  }
  return [...value] as string[];
}

function assertUnique<T>(values: readonly T[], identity: (value: T) => string, at: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = identity(value);
    if (seen.has(key)) throw new Error(`${at} must not contain duplicate facts (${key}).`);
    seen.add(key);
  }
}

function parseResolvedFactsInput(
  record: Record<string, unknown>,
  withDerivedIdentities: boolean
): ResolvedCandidateFactsInput {
  assertOnlyKeys(
    record,
    [
      'schemaVersion',
      'completeness',
      'completenessReasons',
      'resolverIdentity',
      'compilerIdentity',
      'compilerOptionsHash',
      'tsconfigHash',
      'evidenceRequirementsHash',
      'projectPackageName',
      'files',
      'dependencies',
      'capabilityUses',
      'ambientUses',
      'publishCalls',
      'intentReferences',
      'safetyUses',
      ...(withDerivedIdentities ? ['candidateTreeHash', 'factsHash'] : []),
    ],
    '$'
  );
  const schemaVersion = enumValue(
    record,
    'schemaVersion',
    [RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION],
    '$'
  );
  const completeness = enumValue(
    record,
    'completeness',
    ['complete', 'partial', 'unavailable'] as const,
    '$'
  );
  const completenessReasons = requiredArray(record, 'completenessReasons', '$').map(
    (value, index): ResolvedFactsReason => {
      const at = `$.completenessReasons[${index}]`;
      const reason = asRecord(value, at);
      assertOnlyKeys(reason, ['code', 'message', 'file'], at);
      const file =
        reason.file === undefined ? undefined : requiredProjectPath(reason, 'file', at);
      return {
        code: requiredText(reason, 'code', at),
        message: requiredText(reason, 'message', at),
        ...(file ? { file } : {}),
      };
    }
  );
  if (completeness === 'complete' && completenessReasons.length > 0) {
    throw new Error('$.completenessReasons must be empty when completeness is complete.');
  }
  if (completeness !== 'complete' && completenessReasons.length === 0) {
    throw new Error('$.completenessReasons must explain partial or unavailable facts.');
  }
  const files = requiredArray(record, 'files', '$').map((value, index): ResolvedFileFact => {
    const at = `$.files[${index}]`;
    const file = asRecord(value, at);
    assertOnlyKeys(
      file,
      [
        'path',
        'contentHash',
        'parseStatus',
        'parseDiagnosticCount',
        'exportsOnlyTypes',
        'typeOnlyExportNames',
        'hasTopLevelSideEffects',
      ],
      at
    );
    return {
      path: requiredProjectPath(file, 'path', at),
      contentHash: requiredText(file, 'contentHash', at),
      parseStatus: enumValue(file, 'parseStatus', ['parsed', 'invalid'] as const, at),
      parseDiagnosticCount: requiredInteger(file, 'parseDiagnosticCount', at),
      exportsOnlyTypes: requiredBoolean(file, 'exportsOnlyTypes', at),
      typeOnlyExportNames: parseStringArray(file.typeOnlyExportNames, `${at}.typeOnlyExportNames`),
      hasTopLevelSideEffects: requiredBoolean(file, 'hasTopLevelSideEffects', at),
    };
  });
  const dependencies = requiredArray(record, 'dependencies', '$').map(
    (value, index): ResolvedDependencyFact => {
      const at = `$.dependencies[${index}]`;
      const dependency = asRecord(value, at);
      assertOnlyKeys(
        dependency,
        [
          'from',
          'specifier',
          'kind',
          'typeOnly',
          'line',
          'resolution',
          'target',
          'namedBindings',
          'targetTypeOnlyExports',
          'sourcePureTypeModule',
          'namedBindingsTypeOnly',
          'portProofEligible',
        ],
        at
      );
      const specifier = optionalText(dependency, 'specifier', at);
      const target = optionalText(dependency, 'target', at);
      const resolution = enumValue(
        dependency,
        'resolution',
        ['resolved-project', 'resolved-external', 'unresolved', 'dynamic'] as const,
        at
      );
      if (resolution === 'resolved-project' && !target) {
        throw new Error(`${at}.target is required for resolved-project dependencies.`);
      }
      if (resolution !== 'resolved-project' && target) {
        throw new Error(`${at}.target is only allowed for resolved-project dependencies.`);
      }
      if (resolution !== 'dynamic' && !specifier) {
        throw new Error(`${at}.specifier is required unless resolution is dynamic.`);
      }
      return {
        from: requiredProjectPath(dependency, 'from', at),
        ...(specifier ? { specifier } : {}),
        kind: enumValue(
          dependency,
          'kind',
          ['import', 'export', 'dynamic-import', 'require'] as const,
          at
        ),
        typeOnly: requiredBoolean(dependency, 'typeOnly', at),
        line: requiredPositiveInteger(dependency, 'line', at),
        resolution,
        ...(target ? { target: requiredProjectPath(dependency, 'target', at) } : {}),
        ...(dependency.namedBindings !== undefined
          ? { namedBindings: parseStringArray(dependency.namedBindings, `${at}.namedBindings`) }
          : {}),
        ...(dependency.targetTypeOnlyExports !== undefined
          ? {
              targetTypeOnlyExports: requiredBoolean(
                dependency,
                'targetTypeOnlyExports',
                at
              ),
            }
          : {}),
        ...(dependency.sourcePureTypeModule !== undefined
          ? {
              sourcePureTypeModule: requiredBoolean(
                dependency,
                'sourcePureTypeModule',
                at
              ),
            }
          : {}),
        ...(dependency.namedBindingsTypeOnly !== undefined
          ? {
              namedBindingsTypeOnly: requiredBoolean(
                dependency,
                'namedBindingsTypeOnly',
                at
              ),
            }
          : {}),
        ...(dependency.portProofEligible !== undefined
          ? {
              portProofEligible: requiredBoolean(dependency, 'portProofEligible', at),
            }
          : {}),
      };
    }
  );
  const capabilityUses = requiredArray(record, 'capabilityUses', '$').map(
    (value, index): ResolvedCapabilityFact => {
      const at = `$.capabilityUses[${index}]`;
      const fact = asRecord(value, at);
      assertOnlyKeys(fact, ['file', 'line', 'symbol', 'capability', 'source'], at);
      return {
        file: requiredProjectPath(fact, 'file', at),
        line: requiredPositiveInteger(fact, 'line', at),
        symbol: requiredText(fact, 'symbol', at),
        capability: enumValue(fact, 'capability', RESOLVED_CAPABILITY_IDS, at),
        source: enumValue(fact, 'source', ['ambient-global', 'import-based'] as const, at),
      };
    }
  );
  const ambientUses = requiredArray(record, 'ambientUses', '$').map(
    (value, index): ResolvedAmbientFact => {
      const at = `$.ambientUses[${index}]`;
      const fact = asRecord(value, at);
      assertOnlyKeys(fact, ['file', 'line', 'symbol'], at);
      return {
        file: requiredProjectPath(fact, 'file', at),
        line: requiredPositiveInteger(fact, 'line', at),
        symbol: requiredText(fact, 'symbol', at),
      };
    }
  );
  const publishCalls = requiredArray(record, 'publishCalls', '$').map(
    (value, index): ResolvedPublishFact => {
      const at = `$.publishCalls[${index}]`;
      const fact = asRecord(value, at);
      assertOnlyKeys(
        fact,
        [
          'file',
          'line',
          'rawIntentName',
          'objectHasIntent',
          'arkPublishCandidate',
          'hasSource',
          'sourceIntent',
        ],
        at
      );
      const rawIntentName = optionalText(fact, 'rawIntentName', at);
      const sourceIntent = optionalText(fact, 'sourceIntent', at);
      return {
        file: requiredProjectPath(fact, 'file', at),
        line: requiredPositiveInteger(fact, 'line', at),
        ...(rawIntentName ? { rawIntentName } : {}),
        objectHasIntent: requiredBoolean(fact, 'objectHasIntent', at),
        arkPublishCandidate: requiredBoolean(fact, 'arkPublishCandidate', at),
        hasSource: requiredBoolean(fact, 'hasSource', at),
        ...(sourceIntent ? { sourceIntent } : {}),
      };
    }
  );
  const intentReferences = requiredArray(record, 'intentReferences', '$').map(
    (value, index): ResolvedIntentReferenceFact => {
      const at = `$.intentReferences[${index}]`;
      const fact = asRecord(value, at);
      assertOnlyKeys(fact, ['file', 'line', 'intent'], at);
      return {
        file: requiredProjectPath(fact, 'file', at),
        line: requiredPositiveInteger(fact, 'line', at),
        intent: requiredText(fact, 'intent', at),
      };
    }
  );
  const safetyUses = requiredArray(record, 'safetyUses', '$').map(
    (value, index): ResolvedSafetyFact => {
      const at = `$.safetyUses[${index}]`;
      const fact = asRecord(value, at);
      assertOnlyKeys(fact, ['file', 'line', 'kind', 'symbol'], at);
      const symbol = optionalText(fact, 'symbol', at);
      const kind = enumValue(
        fact,
        'kind',
        [
          'ts-suppression',
          'any-cast',
          'dynamic-import',
          'dynamic-require',
          'in-memory-store',
        ] as const,
        at
      );
      if (kind === 'in-memory-store' && !symbol) {
        throw new Error(`${at}.symbol is required for in-memory-store facts.`);
      }
      if (kind !== 'in-memory-store' && symbol) {
        throw new Error(`${at}.symbol is only allowed for in-memory-store facts.`);
      }
      return {
        file: requiredProjectPath(fact, 'file', at),
        line: requiredPositiveInteger(fact, 'line', at),
        kind,
        ...(symbol ? { symbol } : {}),
      };
    }
  );
  assertUnique(files, (file) => file.path, '$.files');

  const filePaths = new Set(files.map((file) => file.path));
  for (const file of files) {
    if (file.parseStatus === 'parsed' && file.parseDiagnosticCount !== 0) {
      throw new Error(
        `$.files[${file.path}].parseDiagnosticCount must be 0 when parseStatus is parsed.`
      );
    }
    if (file.parseStatus === 'invalid' && file.parseDiagnosticCount === 0) {
      throw new Error(
        `$.files[${file.path}].parseDiagnosticCount must be positive when parseStatus is invalid.`
      );
    }
  }
  if (completeness === 'complete' && files.some((file) => file.parseStatus === 'invalid')) {
    throw new Error('$.completeness cannot be complete when a candidate file failed to parse.');
  }
  for (const dependency of dependencies) {
    if (!filePaths.has(dependency.from)) {
      throw new Error(`$.dependencies references missing source file ${dependency.from}.`);
    }
  }
  for (const [at, facts] of [
    ['$.capabilityUses', capabilityUses],
    ['$.ambientUses', ambientUses],
    ['$.publishCalls', publishCalls],
    ['$.intentReferences', intentReferences],
    ['$.safetyUses', safetyUses],
  ] as const) {
    for (const fact of facts) {
      if (!filePaths.has(fact.file)) {
        throw new Error(`${at} references missing file ${fact.file}.`);
      }
    }
  }
  const projectPackageName = optionalText(record, 'projectPackageName', '$');
  return {
    schemaVersion,
    completeness,
    completenessReasons,
    resolverIdentity: requiredText(record, 'resolverIdentity', '$'),
    compilerIdentity: requiredText(record, 'compilerIdentity', '$'),
    compilerOptionsHash: requiredText(record, 'compilerOptionsHash', '$'),
    tsconfigHash: requiredText(record, 'tsconfigHash', '$'),
    evidenceRequirementsHash: requiredText(record, 'evidenceRequirementsHash', '$'),
    ...(projectPackageName ? { projectPackageName } : {}),
    files,
    dependencies,
    capabilityUses,
    ambientUses,
    publishCalls,
    intentReferences,
    safetyUses,
  };
}

export function loadResolvedCandidateFacts(input: unknown): ResolvedCandidateFacts {
  const record = asRecord(input, '$');
  const factsHash = requiredText(record, 'factsHash', '$');
  const candidateTreeHash = requiredText(record, 'candidateTreeHash', '$');
  const canonical = createCanonicalResolvedCandidateFacts(
    parseResolvedFactsInput(record, true)
  );
  if (canonical.factsHash !== factsHash) {
    throw new Error(`$.factsHash does not match the canonical payload (${canonical.factsHash}).`);
  }
  if (candidateTreeHash !== canonical.candidateTreeHash) {
    throw new Error(
      `$.candidateTreeHash does not match the canonical file tree (${canonical.candidateTreeHash}).`
    );
  }
  return canonical;
}

const textSchema = { type: 'string', minLength: 1 } as const;
const lineSchema = { type: 'integer', minimum: 1 } as const;
const projectPathSchema = {
  type: 'string',
  minLength: 1,
  pattern:
    '^(?!/)(?![A-Za-z]:/)(?!.*\\\\)(?!.*//)(?!.*(?:^|/)\\.{1,2}(?:/|$))(?!.*[\\u0000-\\u001f\\u007f])(?!.*\\/$).+$',
} as const;

export const RESOLVED_CANDIDATE_FACTS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://unpkg.com/arkgate@3/schemas/ark.resolved-candidate-facts.schema.json',
  title: 'ArkGate resolved candidate facts',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'completeness',
    'completenessReasons',
    'resolverIdentity',
    'compilerIdentity',
    'compilerOptionsHash',
    'tsconfigHash',
    'candidateTreeHash',
    'evidenceRequirementsHash',
    'files',
    'dependencies',
    'capabilityUses',
    'ambientUses',
    'publishCalls',
    'intentReferences',
    'safetyUses',
    'factsHash',
  ],
  properties: {
    schemaVersion: { const: RESOLVED_CANDIDATE_FACTS_SCHEMA_VERSION },
    completeness: { enum: ['complete', 'partial', 'unavailable'] },
    completenessReasons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'message'],
        properties: { code: textSchema, message: textSchema, file: projectPathSchema },
      },
    },
    resolverIdentity: textSchema,
    compilerIdentity: textSchema,
    compilerOptionsHash: textSchema,
    tsconfigHash: textSchema,
    candidateTreeHash: textSchema,
    evidenceRequirementsHash: textSchema,
    projectPackageName: textSchema,
    files: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'path',
          'contentHash',
          'parseStatus',
          'parseDiagnosticCount',
          'exportsOnlyTypes',
          'typeOnlyExportNames',
          'hasTopLevelSideEffects',
        ],
        properties: {
          path: projectPathSchema,
          contentHash: textSchema,
          parseStatus: { enum: ['parsed', 'invalid'] },
          parseDiagnosticCount: { type: 'integer', minimum: 0 },
          exportsOnlyTypes: { type: 'boolean' },
          typeOnlyExportNames: { type: 'array', items: textSchema },
          hasTopLevelSideEffects: { type: 'boolean' },
        },
        allOf: [
          {
            if: { properties: { parseStatus: { const: 'parsed' } } },
            then: { properties: { parseDiagnosticCount: { const: 0 } } },
          },
          {
            if: { properties: { parseStatus: { const: 'invalid' } } },
            then: { properties: { parseDiagnosticCount: { minimum: 1 } } },
          },
        ],
      },
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'kind', 'typeOnly', 'line', 'resolution'],
        properties: {
          from: projectPathSchema,
          specifier: textSchema,
          kind: { enum: ['import', 'export', 'dynamic-import', 'require'] },
          typeOnly: { type: 'boolean' },
          line: lineSchema,
          resolution: {
            enum: ['resolved-project', 'resolved-external', 'unresolved', 'dynamic'],
          },
          target: projectPathSchema,
          namedBindings: { type: 'array', items: textSchema },
          targetTypeOnlyExports: { type: 'boolean' },
          sourcePureTypeModule: { type: 'boolean' },
          namedBindingsTypeOnly: { type: 'boolean' },
          portProofEligible: { type: 'boolean' },
        },
        allOf: [
          {
            if: { properties: { resolution: { const: 'resolved-project' } } },
            then: { required: ['target'] },
            else: { not: { required: ['target'] } },
          },
          {
            if: { properties: { resolution: { const: 'dynamic' } } },
            else: { required: ['specifier'] },
          },
        ],
      },
    },
    capabilityUses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'line', 'symbol', 'capability', 'source'],
        properties: {
          file: projectPathSchema,
          line: lineSchema,
          symbol: textSchema,
          capability: { enum: RESOLVED_CAPABILITY_IDS },
          source: { enum: ['ambient-global', 'import-based'] },
        },
      },
    },
    ambientUses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'line', 'symbol'],
        properties: { file: projectPathSchema, line: lineSchema, symbol: textSchema },
      },
    },
    publishCalls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'file',
          'line',
          'objectHasIntent',
          'arkPublishCandidate',
          'hasSource',
        ],
        properties: {
          file: projectPathSchema,
          line: lineSchema,
          rawIntentName: textSchema,
          objectHasIntent: { type: 'boolean' },
          arkPublishCandidate: { type: 'boolean' },
          hasSource: { type: 'boolean' },
          sourceIntent: textSchema,
        },
      },
    },
    intentReferences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'line', 'intent'],
        properties: { file: projectPathSchema, line: lineSchema, intent: textSchema },
      },
    },
    safetyUses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'line', 'kind'],
        properties: {
          file: projectPathSchema,
          line: lineSchema,
          kind: {
            enum: [
              'ts-suppression',
              'any-cast',
              'dynamic-import',
              'dynamic-require',
              'in-memory-store',
            ],
          },
          symbol: textSchema,
        },
        allOf: [
          {
            if: { properties: { kind: { const: 'in-memory-store' } } },
            then: { required: ['symbol'] },
            else: { not: { required: ['symbol'] } },
          },
        ],
      },
    },
    factsHash: textSchema,
  },
  allOf: [
    {
      if: { properties: { completeness: { const: 'complete' } } },
      then: {
        properties: {
          completenessReasons: { maxItems: 0 },
          files: {
            items: { properties: { parseStatus: { const: 'parsed' } } },
          },
        },
      },
    },
    {
      if: { properties: { completeness: { enum: ['partial', 'unavailable'] } } },
      then: { properties: { completenessReasons: { minItems: 1 } } },
    },
  ],
} as const;
