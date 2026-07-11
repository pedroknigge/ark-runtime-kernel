import { describe, expect, it } from 'vitest';
import {
  resolveBooleanEnvironment,
  resolveEnvironmentValue,
} from '../../../bin/lib/product-identity.mjs';

describe('Structrail v3 environment compatibility', () => {
  it('uses the legacy value when the canonical variable is absent', () => {
    expect(resolveEnvironmentValue({ ARK_EXAMPLE: 'legacy' }, 'STRUCTRAIL_EXAMPLE', 'ARK_EXAMPLE'))
      .toMatchObject({ value: 'legacy', source: 'ARK_EXAMPLE', conflict: false });
  });

  it('gives the canonical variable precedence, including an explicit empty value', () => {
    expect(
      resolveEnvironmentValue(
        { STRUCTRAIL_EXAMPLE: '', ARK_EXAMPLE: 'legacy' },
        'STRUCTRAIL_EXAMPLE',
        'ARK_EXAMPLE'
      )
    ).toEqual({ value: '', source: 'STRUCTRAIL_EXAMPLE', conflict: true });
  });

  it('applies the same canonical precedence to boolean flags', () => {
    expect(
      resolveBooleanEnvironment(
        { STRUCTRAIL_FLAG: 'false', ARK_FLAG: 'true' },
        'STRUCTRAIL_FLAG',
        'ARK_FLAG'
      )
    ).toEqual({ value: false, source: 'STRUCTRAIL_FLAG', conflict: true });
  });
});
