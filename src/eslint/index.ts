type RuleContext = {
  report(descriptor: Record<string, unknown>): void;
  getFilename?: () => string;
};

type RuleListener = Record<string, (node: AstNode) => void>;

type AstNode = {
  type?: string;
  name?: string;
  value?: unknown;
  source?: AstNode;
  callee?: AstNode;
  property?: AstNode;
  key?: AstNode;
  arguments?: AstNode[];
  properties?: AstNode[];
};

type ArkRule = {
  meta: {
    type: 'problem';
    docs: { description: string };
    messages: Record<string, string>;
    schema: unknown[];
  };
  create(context: RuleContext): RuleListener;
};

type ArkEslintPlugin = {
  rules: Record<string, ArkRule>;
  configs?: Record<string, unknown>;
};

function stringValue(node: AstNode | undefined): string | undefined {
  return typeof node?.value === 'string' ? node.value : undefined;
}

function propertyName(node: AstNode | undefined): string | undefined {
  return node?.name ?? stringValue(node);
}

function calleePropertyName(node: AstNode): string | undefined {
  return propertyName(node.callee?.property);
}

function objectProperty(node: AstNode | undefined, name: string): AstNode | undefined {
  return node?.properties?.find((property) => propertyName(property.key) === name);
}

function objectHasProperty(node: AstNode | undefined, name: string): boolean {
  return objectProperty(node, name) !== undefined;
}

function objectHasMetadataSource(node: AstNode | undefined): boolean {
  const metadata = objectProperty(node, 'metadata')?.value as AstNode | undefined;
  return objectHasProperty(metadata, 'source');
}

function looksLikeIntent(value: string): boolean {
  return /^(Domain|Application|Adapter|Workflow|Job|Presentation|Reporting|Metadata|Security|Audit|Observability|Kernel)\.[A-Za-z0-9_.]+$/.test(value);
}

function isDomainFile(context: RuleContext): boolean {
  const filename = context.getFilename?.() ?? '';
  const normalized = filename.split('\\').join('/').toLowerCase();
  return normalized.includes('/domain/') || normalized.endsWith('/domain.ts');
}

function isInfraImport(specifier: string): boolean {
  const normalized = specifier.toLowerCase();
  return [
    'adapter',
    'adapters',
    'infrastructure',
    'persistence',
    'repository',
    'repositories',
    'integration',
    'database',
    'db',
  ].some((token) => normalized.includes(token));
}

function isPublishCall(node: AstNode): boolean {
  return calleePropertyName(node) === 'publish';
}

export const noDomainInfraImports: ArkRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing infrastructure or adapters from domain files.',
    },
    messages: {
      forbiddenImport: 'Domain code must not import infrastructure, adapters, repositories, or database modules.',
    },
    schema: [],
  },
  create(context) {
    const check = (node: AstNode) => {
      if (!isDomainFile(context)) return;
      const source = stringValue(node.source);
      if (source && isInfraImport(source)) {
        context.report({ node, messageId: 'forbiddenImport' });
      }
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

export const noRawEventPublish: ArkRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require event bus publish calls to use registered intent creators instead of raw event objects or intent strings.',
    },
    messages: {
      rawPublish: 'Publish through a registered intent creator; raw event objects or intent strings bypass Ark contracts.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isPublishCall(node)) return;
        const firstArg = node.arguments?.[0];
        const firstValue = stringValue(firstArg);
        if (
          firstValue && looksLikeIntent(firstValue) ||
          objectHasProperty(firstArg, 'intent')
        ) {
          context.report({ node, messageId: 'rawPublish' });
        }
      },
    };
  },
};

export const requirePublishSource: ArkRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require event bus publish calls to include source metadata.',
    },
    messages: {
      missingSource: 'Strict Ark publish calls must include metadata.source.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isPublishCall(node)) return;
        const firstArg = node.arguments?.[0];
        const metadataArg = node.arguments?.[2];
        if (objectHasMetadataSource(firstArg) || objectHasProperty(metadataArg, 'source')) {
          return;
        }
        context.report({ node, messageId: 'missingSource' });
      },
    };
  },
};

const rules = {
  'no-domain-infra-imports': noDomainInfraImports,
  'no-raw-event-publish': noRawEventPublish,
  'require-publish-source': requirePublishSource,
};

const plugin: ArkEslintPlugin = { rules };

plugin.configs = {
  recommended: {
    plugins: { ark: plugin },
    rules: {
      'ark/no-domain-infra-imports': 'error',
      'ark/no-raw-event-publish': 'error',
      'ark/require-publish-source': 'error',
    },
  },
};

export { plugin };
export default plugin;
