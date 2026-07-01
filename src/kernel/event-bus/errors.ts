/**
 * Event bus governance errors.
 */

export class UnregisteredIntentError extends Error {
  readonly intentName: string;

  constructor(intentName: string) {
    super(
      `Intent "${intentName}" is not registered. Register via IntentRegistry.define() before publish/subscribe.`
    );
    this.name = 'UnregisteredIntentError';
    this.intentName = intentName;
  }
}

export class InvalidIntentNameError extends Error {
  readonly intentName: string;
  readonly reason: string;

  constructor(intentName: string, reason: string) {
    super(`Invalid intent name "${intentName}": ${reason}`);
    this.name = 'InvalidIntentNameError';
    this.intentName = intentName;
    this.reason = reason;
  }
}

export class LayerPolicyContextError extends Error {
  constructor() {
    super(
      'Layer/architecture policies require intentRegistry, dependencyGraph, or a custom getPolicyContext. ' +
        'Without graph/registry context, layer policies cannot inspect relationships.'
    );
    this.name = 'LayerPolicyContextError';
  }
}

export class EventContractViolationError extends Error {
  readonly intentName: string;
  readonly issues: unknown[];

  constructor(intentName: string, issues: unknown[]) {
    super(`Event contract violation for "${intentName}".`);
    this.name = 'EventContractViolationError';
    this.intentName = intentName;
    this.issues = issues;
  }
}

export class UnknownEventSourceError extends Error {
  constructor(intentName: string) {
    super(`Event "${intentName}" must include a known metadata.source.`);
    this.name = 'UnknownEventSourceError';
  }
}

/**
 * Thrown when the OBSERVED producer→event flow crosses a forbidden layer boundary
 * under `enforceObservedLayerFlow: 'hard'`. Unlike declared-model policy errors, this
 * reflects what the running system actually did at publish time.
 */
export class ObservedLayerFlowViolationError extends Error {
  readonly source: string;
  readonly intentName: string;
  readonly fromLayer: string;
  readonly toLayer: string;

  constructor(
    source: string,
    intentName: string,
    fromLayer: string,
    toLayer: string,
    message?: string
  ) {
    super(
      message ??
        `Observed layer violation: "${source}" (${fromLayer}) must not produce "${intentName}" (${toLayer}).`
    );
    this.name = 'ObservedLayerFlowViolationError';
    this.source = source;
    this.intentName = intentName;
    this.fromLayer = fromLayer;
    this.toLayer = toLayer;
  }
}
