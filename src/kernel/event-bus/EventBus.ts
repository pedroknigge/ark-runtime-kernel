/**
 * EventBus implementation.
 *
 * Core publish/subscribe mechanics with:
 * - Intent-aware typing via creators
 * - Automatic metadata enrichment
 * - Full publish history for observability
 * - Strict registry validation (opt-in by default when registry provided)
 */

import type {
  DomainEvent,
  EventMetadata,
  IntentName,
} from '../../domain/types';
import type {
  EventBus,
  EventBusOptions,
  EventHandler,
  IntentCreator,
  PublishedEventRecord,
  TraceRecord,
  Unsubscribe,
} from './types';
import type { IntentRegistry } from '../intent/IntentRegistry';
import { validateIntentName } from '../intent/validateIntentName';
import { PolicyEngine, isLayerPolicy } from '../policy';
import { buildPublishPolicyContext } from './policyContext';
import {
  UnregisteredIntentError,
  InvalidIntentNameError,
  LayerPolicyContextError,
} from './errors';

interface InternalSubscription {
  intentName: string;
  handler: EventHandler<IntentName, unknown>;
}

export class EventBusImpl<Context = unknown> implements EventBus {
  private readonly subscriptions: InternalSubscription[] = [];
  private readonly history: PublishedEventRecord[] = [];
  private readonly trace: TraceRecord[] = [];
  private readonly onPublish?: (event: DomainEvent) => void | Promise<void>;
  private readonly onSoftViolation?: EventBusOptions<Context>['onSoftViolation'];
  private readonly onHandlerError?: EventBusOptions<Context>['onHandlerError'];
  private readonly rethrowHandlerErrors: boolean;
  private readonly policyEngine?: PolicyEngine<Context>;
  private readonly getPolicyContext: (event: DomainEvent) => Context;
  private readonly maxHistorySize?: number;
  private readonly intentRegistry?: IntentRegistry;
  private readonly strictRegistry: boolean;
  private readonly validateIntentNaming: boolean;

  constructor(options: EventBusOptions<Context> = {}) {
    this.onPublish = options.onPublish;
    this.onSoftViolation = options.onSoftViolation;
    this.onHandlerError = options.onHandlerError;
    this.rethrowHandlerErrors = options.rethrowHandlerErrors ?? false;
    this.maxHistorySize = options.maxHistorySize;
    this.intentRegistry = options.intentRegistry;
    this.strictRegistry =
      options.strictRegistry ?? options.intentRegistry !== undefined;
    this.validateIntentNaming =
      options.validateIntentNaming ?? this.strictRegistry;

    if (options.policyEngine) {
      this.policyEngine = options.policyEngine;
    } else if (options.policies && options.policies.length > 0) {
      this.policyEngine = new PolicyEngine(options.policies);
    }

    const allPolicies =
      this.policyEngine?.getPolicies() ?? options.policies ?? [];
    if (
      allPolicies.some(isLayerPolicy) &&
      !options.intentRegistry &&
      !options.dependencyGraph &&
      !options.getPolicyContext
    ) {
      throw new LayerPolicyContextError();
    }

    if (options.getPolicyContext) {
      this.getPolicyContext = options.getPolicyContext;
    } else if (options.intentRegistry || options.dependencyGraph) {
      this.getPolicyContext = buildPublishPolicyContext({
        intentRegistry: options.intentRegistry,
        dependencyGraph: options.dependencyGraph,
      }) as (event: DomainEvent) => Context;
    } else {
      this.getPolicyContext = (event) => ({ event } as Context);
    }
  }

  async publish<N extends IntentName, P>(
    eventOrCreator: DomainEvent<N, P> | IntentCreator<N, P>,
    payloadOrMeta?: P | Partial<EventMetadata>,
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    let event: DomainEvent<N, P>;

    if (typeof eventOrCreator === 'function') {
      const creator = eventOrCreator as IntentCreator<N, P>;
      const payload = payloadOrMeta as P;
      const extraMeta = metadata ?? {};
      const created = creator(payload);
      event = {
        ...created,
        metadata: this.enrichMetadata(created.metadata, extraMeta),
      } as DomainEvent<N, P>;
    } else {
      const rawEvent = eventOrCreator as DomainEvent<N, P>;
      const extraMeta =
        (metadata as Partial<EventMetadata>) ??
        (payloadOrMeta as Partial<EventMetadata>) ??
        {};
      event = {
        ...rawEvent,
        metadata: this.enrichMetadata(rawEvent.metadata, extraMeta),
      };
    }

    this.assertIntentAllowed(event.intent);

    const matching = this.subscriptions.filter(
      (s) => s.intentName === event.intent
    );

    if (this.policyEngine) {
      const ctx = this.getPolicyContext(event as DomainEvent);
      const policyResult = this.policyEngine.enforce(ctx);

      if (policyResult.softViolations.length > 0) {
        this.appendTrace({
          type: 'policy.softViolation',
          timestamp: new Date().toISOString(),
          intent: event.intent,
          correlationId: event.metadata.correlationId,
          details: { violations: policyResult.softViolations },
        });

        if (this.onSoftViolation) {
          await this.safeHook(
            () => this.onSoftViolation!(policyResult, event as DomainEvent),
            'onSoftViolation',
            event as DomainEvent
          );
        }
      }
    }

    const record: PublishedEventRecord = {
      event: event as DomainEvent,
      publishedAt: new Date().toISOString(),
      subscribersNotified: matching.length,
    };
    this.appendHistory(record);

    this.appendTrace({
      type: 'event.published',
      timestamp: record.publishedAt,
      intent: event.intent,
      correlationId: event.metadata.correlationId,
      details: { subscribersNotified: matching.length },
    });

    const notifications = matching.map((sub) =>
      this.invokeHandler(sub, event as DomainEvent)
    );

    await Promise.all(notifications);

    if (this.onPublish) {
      await this.safeHook(
        () => this.onPublish!(event as DomainEvent),
        'onPublish',
        event as DomainEvent
      );
    }
  }

  subscribe<N extends IntentName, P>(
    intent: N | IntentCreator<N, P>,
    handler: EventHandler<N, P>
  ): Unsubscribe {
    const intentName =
      typeof intent === 'string' ? intent : (intent as IntentCreator<N, P>).name;

    this.assertIntentAllowed(intentName);

    const sub: InternalSubscription = {
      intentName,
      handler: handler as EventHandler<IntentName, unknown>,
    };

    this.subscriptions.push(sub);

    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  getHistory(): PublishedEventRecord[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  getTrace(): TraceRecord[] {
    return [...this.trace];
  }

  clearTrace(): void {
    this.trace.length = 0;
  }

  private assertIntentAllowed(intentName: string): void {
    if (!this.strictRegistry && !this.validateIntentNaming) {
      return;
    }

    if (this.validateIntentNaming) {
      const validation = validateIntentName(intentName);
      if (!validation.valid) {
        throw new InvalidIntentNameError(intentName, validation.reason!);
      }
    }

    if (this.strictRegistry && this.intentRegistry && !this.intentRegistry.has(intentName)) {
      throw new UnregisteredIntentError(intentName);
    }
  }

  private async invokeHandler(
    sub: InternalSubscription,
    event: DomainEvent
  ): Promise<void> {
    try {
      await Promise.resolve(sub.handler(event));
    } catch (err) {
      this.appendTrace({
        type: 'handler.error',
        timestamp: new Date().toISOString(),
        intent: event.intent,
        correlationId: event.metadata.correlationId,
        details: { error: err instanceof Error ? err.message : String(err) },
      });

      if (this.onHandlerError) {
        await this.safeHook(
          () => this.onHandlerError!(err, event, sub.intentName),
          'onHandlerError',
          event
        );
      }

      if (this.rethrowHandlerErrors) {
        throw err;
      }
    }
  }

  private async safeHook(
    fn: () => void | Promise<void>,
    hookName: string,
    event: DomainEvent
  ): Promise<void> {
    try {
      await Promise.resolve(fn());
    } catch (err) {
      this.appendTrace({
        type: 'hook.error',
        timestamp: new Date().toISOString(),
        intent: event.intent,
        correlationId: event.metadata.correlationId,
        details: {
          hook: hookName,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private appendHistory(record: PublishedEventRecord): void {
    this.history.push(record);
    if (
      this.maxHistorySize !== undefined &&
      this.history.length > this.maxHistorySize
    ) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  private appendTrace(record: TraceRecord): void {
    this.trace.push(record);
    if (
      this.maxHistorySize !== undefined &&
      this.trace.length > this.maxHistorySize
    ) {
      this.trace.splice(0, this.trace.length - this.maxHistorySize);
    }
  }

  private enrichMetadata(
    base: EventMetadata,
    extra: Partial<EventMetadata>
  ): EventMetadata {
    return {
      ...base,
      ...extra,
      occurredAt:
        extra.occurredAt || base.occurredAt || new Date().toISOString(),
      source: extra.source || base.source || 'unknown',
      correlationId: extra.correlationId ?? base.correlationId,
      causationId: extra.causationId ?? base.causationId,
    };
  }
}

export function createEventBus<Context = unknown>(
  options?: EventBusOptions<Context>
): EventBus {
  return new EventBusImpl(options);
}
