/** Fail-closed completeness evidence for one proposed source snippet. */
import { ANALYSIS_COMPLETENESS } from './analysis-completeness.mjs';

function finding(ruleId, message, file, nextAction) {
  return {
    ruleId,
    code: ruleId,
    message,
    ...(file ? { file, filePath: file } : {}),
    nextAction,
  };
}

export function validateSnippetAnalysis({ gate, ts, source, context = {} }) {
  const observed = gate.validate(source, context);
  const base = {
    valid: Boolean(observed.lexicalValid ?? observed.valid),
    violations: Array.isArray(observed.violations) ? observed.violations : [],
  };
  const file = context.filePath;

  if (!ts || typeof ts.createSourceFile !== 'function') {
    return {
      mode: 'lexical-compatibility',
      valid: false,
      lexicalValid: false,
      completeness: ANALYSIS_COMPLETENESS.unavailable,
      completenessReasons: [
        {
          code: 'ANALYSIS_HOST_UNAVAILABLE',
          message: 'No API-compatible TypeScript host parsed the proposed source.',
          ...(file ? { file } : {}),
        },
      ],
      violations: [
        ...base.violations,
        finding(
          'ANALYSIS_HOST_UNAVAILABLE',
          'Analysis unavailable: no API-compatible TypeScript host parsed the proposed source.',
          file,
          'Restore ArkGate\'s TypeScript analysis host, then validate the complete source again.'
        ),
      ],
    };
  }

  try {
    const parsed = ts.createSourceFile(
      file || 'generated.ts',
      source,
      ts.ScriptTarget.Latest,
      true
    );
    if (!Array.isArray(parsed.parseDiagnostics)) throw new Error('parse diagnostics unavailable');
    const diagnosticCount = parsed.parseDiagnostics.length;
    if (diagnosticCount > 0) {
      return {
        mode: 'lexical-compatibility',
        valid: false,
        lexicalValid: false,
        completeness: ANALYSIS_COMPLETENESS.partial,
        completenessReasons: [
          {
            code: 'ANALYSIS_PARSE_INCOMPLETE',
            message: `The proposed source has ${diagnosticCount} parse diagnostic(s).`,
            ...(file ? { file } : {}),
          },
        ],
        violations: [
          ...base.violations,
          finding(
            'ANALYSIS_PARSE_INCOMPLETE',
            `Analysis partial: proposed source has ${diagnosticCount} parse diagnostic(s).`,
            file,
            'Fix the syntax until the TypeScript parser reports zero diagnostics, then validate again.'
          ),
        ],
      };
    }
    return {
      ...base,
      mode: 'lexical-compatibility',
      valid: false,
      lexicalValid: base.valid,
      completeness: ANALYSIS_COMPLETENESS.partial,
      completenessReasons: [
        {
          code: 'LEXICAL_EVIDENCE_INCOMPLETE',
          message:
            'Single-file validation cannot prove project module resolution or complete candidate evidence; use ark_prepare_change for a parity-capable verdict.',
          ...(file ? { file } : {}),
        },
      ],
    };
  } catch {
    return {
      mode: 'lexical-compatibility',
      valid: false,
      lexicalValid: false,
      completeness: ANALYSIS_COMPLETENESS.unavailable,
      completenessReasons: [
        {
          code: 'ANALYSIS_HOST_UNAVAILABLE',
          message: 'The TypeScript host could not parse the proposed source.',
          ...(file ? { file } : {}),
        },
      ],
      violations: [
        ...base.violations,
        finding(
          'ANALYSIS_HOST_UNAVAILABLE',
          'Analysis unavailable: the TypeScript host could not parse the proposed source.',
          file,
          'Restore ArkGate\'s TypeScript analysis host, then validate the complete source again.'
        ),
      ],
    };
  }
}
