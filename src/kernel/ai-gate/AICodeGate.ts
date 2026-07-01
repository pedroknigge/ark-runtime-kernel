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

export interface AICodeGateOptions<Context = AICodeGateContext> {
  policies?: Policy[];
  intents?: Array<string | IntentCreator<any>>;
  /**
   * Additional forbidden patterns (regex or strings).
   */
  forbiddenPatterns?: Array<string | RegExp>;
  /**
   * External analyzer extensions (type-only contract; plug in AST tools later).
   */
  extensions?: AIGateExtension<Context>[];
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

/** Extract quoted string literals from source (naive scan). */
function extractQuotedStrings(source: string): string[] {
  const matches: string[] = [];
  const re = /['"`]([A-Za-z][A-Za-z0-9_.]*)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function looksLikeIntentName(s: string): boolean {
  return /^(Domain|Application|Adapter|Workflow)\.[A-Za-z0-9_.]+$/.test(s);
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
          if (pat.test(source)) {
            violations.push(
              violation('FORBIDDEN_PATTERN', `Forbidden pattern matched: ${pat}`, {
                suggestion: 'Remove infrastructure imports from domain/application layers.',
              })
            );
          }
        } else if (source.includes(pat)) {
          violations.push(
            violation('FORBIDDEN_SUBSTRING', `Forbidden substring: ${pat}`)
          );
        }
      }

      if (options.policies) {
        for (const policy of options.policies) {
          const res = policy.check({ source, context } as never);
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
          if (looksLikeIntentName(literal) && !intentNames.has(literal)) {
            violations.push(
              violation(
                'UNKNOWN_INTENT',
                `Unknown intent reference: "${literal}"`,
                {
                  suggestion: `Register intent "${literal}" via defineIntent() or remove the reference.`,
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