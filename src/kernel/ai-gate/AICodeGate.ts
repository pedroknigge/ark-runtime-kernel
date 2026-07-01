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

function looksLikeIntentName(s: string): boolean {
  return /^(Domain|Application|Adapter|Workflow|Job|Presentation|Reporting|Metadata|Security|Audit|Observability|Kernel)\.[A-Za-z0-9_.]+$/.test(s);
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

      for (const pat of forbidden) {
        if (pat instanceof RegExp) {
          const match = source.match(pat);
          if (match) {
            violations.push(
              violation('FORBIDDEN_PATTERN', `Forbidden pattern matched: ${pat}`, {
                line: match.index === undefined ? undefined : lineOf(source, match.index),
                suggestion: 'Remove infrastructure imports from domain/application layers.',
              })
            );
          }
        } else if (source.includes(pat)) {
          violations.push(
            violation('FORBIDDEN_SUBSTRING', `Forbidden substring: ${pat}`, {
              line: lineOf(source, source.indexOf(pat)),
            })
          );
        }
      }

      if (options.policies) {
        for (const policy of options.policies) {
          const res = policy.check({ source, context });
          if (res !== true) {
            if (Array.isArray(res)) {
              for (const v of res) {
                violations.push(
                  violation('POLICY_VIOLATION', v.message, {
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
                  suggestion: `Register intent "${literal.value}" via defineIntent() or remove the reference.`,
                }
              )
            );
          }
        }
      }

      const contextLayer = (context as AICodeGateContext | undefined)?.layer;
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
                  suggestion: 'Route the dependency through an allowed intent, port, or event.',
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
