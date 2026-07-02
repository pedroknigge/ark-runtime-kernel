/**
 * Basic AI Code Gate implementation.
 *
 * Uses simple string heuristics + registered intent names to detect obvious
 * architectural violations in generated code (e.g. direct infra imports from domain).
 * Not a full static analyzer — documented limitation.
 */

import type {
  AICodeGate,
  AICodeGateContext,
  AICodeGateResult,
  AICodeGateViolation,
  AIGateExtension,
} from './types';
import type { Policy } from '../policy';
import type { IntentCreator } from '../intent';
import type { IntentName } from '../../domain/types';
import type { ArchitectureProfile } from '../layers';

export interface AICodeGatePolicyContext<Context = AICodeGateContext> {
  source: string;
  context?: Context;
}

export interface AICodeGateOptions<Context = AICodeGateContext> {
  policies?: Policy<AICodeGatePolicyContext<Context>>[];
  intents?: Array<string | Pick<IntentCreator<IntentName, unknown>, 'name'>>;
  /**
   * Additional forbidden patterns (regex or strings).
   */
  forbiddenPatterns?: Array<string | RegExp>;
  /**
   * External analyzer extensions (type-only contract; plug in AST tools later).
   */
  extensions?: AIGateExtension<Context>[];
  /**
   * Optional architecture profile for layer-aware generated-code checks.
   * When context.layer is provided, intent references are checked against it.
   */
  architectureProfile?: ArchitectureProfile;
  /**
   * When true, flag string literals that look like intent names but are not registered.
   */
  enforceIntentAllowlist?: boolean;
}

function violation(
  ruleId: string,
  message: string,
  extra?: Partial<AICodeGateViolation>
): AICodeGateViolation {
  return { ruleId, code: ruleId, message, ...extra };
}

interface StringMatch {
  value: string;
  index: number;
}

interface ModuleSpecifierMatch {
  value: string;
  index: number;
  kind: 'import' | 'export' | 'dynamic-import' | 'require';
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Extract quoted string literals from source (naive scan). */
function extractQuotedStrings(source: string): StringMatch[] {
  const matches: StringMatch[] = [];
  const re = /['"`]([A-Za-z][A-Za-z0-9_.]*)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    matches.push({ value: m[1], index: m.index });
  }
  return matches;
}

function extractModuleSpecifiers(source: string): ModuleSpecifierMatch[] {
  const matches: ModuleSpecifierMatch[] = [];
  const patterns: Array<{ kind: ModuleSpecifierMatch['kind']; re: RegExp }> = [
    {
      kind: 'import',
      re: /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    },
    {
      kind: 'export',
      re: /\bexport\s+(?:type\s+)?[^'"]*?\s+from\s*['"]([^'"]+)['"]/g,
    },
    {
      kind: 'dynamic-import',
      re: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    },
    {
      kind: 'require',
      re: /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.re.exec(source)) !== null) {
      const index = match.index + match[0].indexOf(match[1]);
      matches.push({ value: match[1], index, kind: pattern.kind });
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

function looksLikeIntentName(s: string): boolean {
  return /^(Domain|Application|Adapter|Workflow|Job|Presentation|Reporting|Metadata|Security|Audit|Observability|Kernel)\.[A-Za-z0-9_.]+$/.test(s);
}

function hasInfrastructureToken(specifier: string): boolean {
  const tokens = specifier
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return [
    'adapter',
    'adapters',
    'infra',
    'infrastructure',
    'persistence',
    'repository',
    'repositories',
    'integration',
    'database',
    'db',
  ].some((token) => tokens.includes(token));
}

function isKnownInfrastructurePackage(specifier: string): boolean {
  const normalized = specifier.toLowerCase();
  return ['sequelize', 'prisma', 'typeorm', 'mongoose', 'knex'].some(
    (name) => normalized === name || normalized.startsWith(`${name}/`)
  );
}

export function createAICodeGate<Context = AICodeGateContext>(
  options: AICodeGateOptions<Context> = {}
): AICodeGate<Context> {
  const intentNames = new Set(
    (options.intents || []).map((i) => (typeof i === 'string' ? i : i.name))
  );

  const forbidden = [
    ...(options.forbiddenPatterns || []),
    /from ['"].*\/(infra|adapters|persistence|db)/i,
    /import .* from ['"].*(sequelize|prisma|typeorm|mongoose|knex)/i,
  ];

  const enforceAllowlist = options.enforceIntentAllowlist ?? intentNames.size > 0;

  return {
    validate(source: string, context?: Context): AICodeGateResult {
      const violations: AICodeGateViolation[] = [];
      const gateContext = context as AICodeGateContext | undefined;
      const filePath = gateContext?.filePath;
      const contextLayer = gateContext?.layer;

      for (const pat of forbidden) {
        if (pat instanceof RegExp) {
          const match = source.match(pat);
          if (match) {
            violations.push(
              violation('FORBIDDEN_PATTERN', `Forbidden pattern matched: ${pat}`, {
                line: match.index === undefined ? undefined : lineOf(source, match.index),
                filePath,
                suggestion: 'Remove infrastructure imports from domain/application layers.',
              })
            );
          }
        } else if (source.includes(pat)) {
          violations.push(
            violation('FORBIDDEN_SUBSTRING', `Forbidden substring: ${pat}`, {
              line: lineOf(source, source.indexOf(pat)),
              filePath,
            })
          );
        }
      }

      for (const specifier of extractModuleSpecifiers(source)) {
        if (!hasInfrastructureToken(specifier.value) && !isKnownInfrastructurePackage(specifier.value)) {
          continue;
        }

        violations.push(
          violation(
            'FORBIDDEN_IMPORT',
            `Forbidden ${specifier.kind} target: "${specifier.value}".`,
            {
              line: lineOf(source, specifier.index),
              source: specifier.value,
              target: specifier.value,
              filePath,
              suggestion: 'Route infrastructure access through an allowed adapter or port boundary.',
              details: { importKind: specifier.kind },
            }
          )
        );
      }

      if (options.policies) {
        for (const policy of options.policies) {
          const res = policy.check({ source, context });
          if (res !== true) {
            if (Array.isArray(res)) {
              for (const v of res) {
                violations.push(
                  violation('POLICY_VIOLATION', v.message, {
                    filePath,
                    suggestion: `Fix violation of policy "${policy.name}".`,
                  })
                );
              }
            } else if (res === false) {
              violations.push(
                violation('POLICY_VIOLATION', `Policy ${policy.name} failed on generated code`)
              );
            } else {
              violations.push(
                violation('POLICY_VIOLATION', res.message)
              );
            }
          }
        }
      }

      if (enforceAllowlist && intentNames.size > 0) {
        for (const literal of extractQuotedStrings(source)) {
          if (looksLikeIntentName(literal.value) && !intentNames.has(literal.value)) {
            violations.push(
              violation(
                'UNKNOWN_INTENT',
                `Unknown intent reference: "${literal.value}"`,
                {
                  line: lineOf(source, literal.index),
                  filePath,
                  target: literal.value,
                  suggestion: `Register intent "${literal.value}" via defineIntent() or remove the reference.`,
                }
              )
            );
          }
        }
      }

      if (options.architectureProfile && contextLayer) {
        for (const literal of extractQuotedStrings(source)) {
          if (!looksLikeIntentName(literal.value)) continue;

          const targetLayer = options.architectureProfile.resolveLayer(literal.value);
          if (!targetLayer) continue;

          const blocked = options.architectureProfile.rules.find(
            (rule) =>
              !rule.allowed &&
              rule.from === contextLayer &&
              rule.to === targetLayer
          );

          if (blocked) {
            violations.push(
              violation(
                'LAYER_REFERENCE_VIOLATION',
                blocked.message ??
                  `Layer "${contextLayer}" must not reference "${targetLayer}" through "${literal.value}".`,
                {
                  line: lineOf(source, literal.index),
                  filePath,
                  target: literal.value,
                  fromLayer: contextLayer,
                  toLayer: targetLayer,
                  suggestion: 'Route the dependency through an allowed intent, port, or event.',
                  details: { rule: blocked },
                }
              )
            );
          }
        }
      }

      if (options.extensions) {
        for (const ext of options.extensions) {
          try {
            const extViolations = ext.analyze(source, context);
            violations.push(...extViolations);
          } catch (err) {
            violations.push(
              violation(
                'EXTENSION_ERROR',
                `Extension "${ext.name}" failed: ${err instanceof Error ? err.message : String(err)}`
              )
            );
          }
        }
      }

      return {
        valid: violations.length === 0,
        violations,
      };
    },
  };
}
