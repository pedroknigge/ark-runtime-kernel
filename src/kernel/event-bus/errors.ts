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
