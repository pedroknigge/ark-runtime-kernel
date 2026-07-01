/**
 * AI Code Gate (basic).
 *
 * Allows validation of generated source code against the defined architecture.
 */

export interface AICodeGateViolation {
  /** Stable rule identifier for agents and CI pipelines. */
  ruleId: string;
  /** @deprecated Use ruleId — kept for backward compatibility. */
  code: string;
  message: string;
  line?: number;
  suggestion?: string;
  source?: string;
}

/** Extension point for external analyzers (AST, semantic, etc.). */
export interface AIGateExtension<Context = unknown> {
  readonly name: string;
  analyze(source: string, context?: Context): AICodeGateViolation[];
}

export interface AICodeGateContext {
  filePath?: string;
  agentId?: string;
  [key: string]: unknown;
}

export interface AICodeGateResult {
  valid: boolean;
  violations: AICodeGateViolation[];
}

export interface AICodeGate<Context = AICodeGateContext> {
  validate(source: string, context?: Context): AICodeGateResult;
}
