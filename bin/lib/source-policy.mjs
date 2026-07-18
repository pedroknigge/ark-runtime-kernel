/**
 * GENERATED FILE — do not edit by hand.
 *
 * Canonical algorithm: src/domain/sourcePolicy.ts
 * Regenerate: node scripts/generate-cli-pure.mjs
 * Drift check: node scripts/generate-cli-pure.mjs --check
 *
 * Pure CLI helper (bin/lib/source-policy.mjs). Zero Node I/O.
 */

export const SOURCE_POLICY_MESSAGES = {
    RAW_EVENT_PUBLISH: 'Publish through a registered intent creator; raw event objects or intent strings bypass Ark contracts and tooling.',
    PUBLISH_MISSING_SOURCE: 'Strict Ark publish calls must include metadata.source.',
};
export const DEFAULT_INTENT_PREFIXES = Object.freeze([
    { layer: 'DomainModel', prefixes: ['Domain.'] },
    { layer: 'ApplicationOrchestration', prefixes: ['Application.'] },
    { layer: 'PersistenceAdapters', prefixes: ['Adapter.Persistence.', 'Adapter.Repository.'] },
    { layer: 'IntegrationAdapters', prefixes: ['Adapter.Integration.', 'Adapter.External.'] },
    { layer: 'WorkflowSagaEngine', prefixes: ['Workflow.'] },
    { layer: 'BackgroundJobsScheduling', prefixes: ['Job.'] },
    { layer: 'PresentationAdapters', prefixes: ['Presentation.', 'Adapter.Presentation.', 'Adapter.Api.'] },
    { layer: 'ReportingReadModels', prefixes: ['Reporting.'] },
    { layer: 'ExtensibilityMetadata', prefixes: ['Metadata.'] },
    { layer: 'SecurityAuditObservability', prefixes: ['Security.', 'Audit.', 'Observability.'] },
    { layer: 'Kernel', prefixes: ['Kernel.'] },
]);
/** Longest matching prefix wins; declaration order resolves an identical-prefix tie. */
export function resolveIntentLayer(intent, layers) {
    const candidates = layers.flatMap((layer, layerIndex) => (layer.prefixes ?? layer.intentPrefixes ?? []).map((prefix) => ({
        layer: layer.name,
        layerIndex,
        prefix: prefix.endsWith('.') ? prefix : `${prefix}.`,
    })));
    return candidates
        .filter(({ prefix }) => intent.startsWith(prefix))
        .sort((left, right) => right.prefix.length - left.prefix.length || left.layerIndex - right.layerIndex)[0]?.layer;
}
export function looksLikeArkIntent(value) {
    return /^(Domain|Application|Adapter|Workflow|Job|Presentation|Reporting|Metadata|Security|Audit|Observability|Kernel)\.[A-Za-z0-9_.]+$/.test(value);
}
export function classifyPublishFacts(facts) {
    if (!facts.publishCall)
        return [];
    const findings = [];
    if ((facts.rawIntentName !== undefined && looksLikeArkIntent(facts.rawIntentName)) ||
        facts.objectHasIntent) {
        findings.push({
            ruleId: 'RAW_EVENT_PUBLISH',
            message: SOURCE_POLICY_MESSAGES.RAW_EVENT_PUBLISH,
        });
    }
    if (facts.arkPublishCandidate && !facts.hasSource) {
        findings.push({
            ruleId: 'PUBLISH_MISSING_SOURCE',
            message: SOURCE_POLICY_MESSAGES.PUBLISH_MISSING_SOURCE,
        });
    }
    return findings;
}
