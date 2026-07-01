/**
 * Event Bus types for the Ark kernel.
 *
 * The Event Bus is the central nervous system for Domain Events.
 * It provides publish/subscribe, history for observability, and metadata handling.
 */

import type { DomainEvent, EventMetadata, IntentName } from '../../domain/types';
import type { IntentCreator, IntentRegistry } from '../intent';
import type { DependencyGraph } from '../graph';
import type { Policy, PolicyEngine, PolicyEvaluationResult } from '../policy';

export type { IntentCreator };

/** Standard trace record for observability and agent consumption. */
export type TraceRecordType =
  | 'event.published'
  | 'policy.softViolation'
  | 'handler.error'
  | 'hook.error';

export interface TraceRecord {
  type: TraceRecordType;
  timestamp: string;
  intent: string;
  correlationId?: string;
  details?: unknown;
}

/**
 * Options when creating an EventBus.
 */
export interface EventBusOptions<Context = unknown> {
  /** Optional hook called after every successful publish */
  onPublish?: (event: DomainEvent) => void | Promise<void>;

  /** Called when soft policies produce violations (publish still proceeds). */
  onSoftViolation?: (result: PolicyEvaluationResult, event: DomainEvent) => void | Promise<void>;

  /** Called when a subscriber handler throws or rejects. */
  onHandlerError?: (
    error: unknown,
    event: DomainEvent,
    intentName: string
  ) => void | Promise<void>;

  /** When true, rethrow handler errors after calling onHandlerError. Default: false. */
  rethrowHandlerErrors?: boolean;

  /**
   * Policies to evaluate on every publish.
   * If provided, they run before subscribers are notified.
   * Hard violations will cause publish to throw.
   */
  policies?: Policy<Context>[];

  /**
   * Function to build the context object passed to policies for a given event.
   * Default: { event }, or { event, relationships, edges } when registry/graph provided.
   */
  getPolicyContext?: (event: DomainEvent) => Context;

  /**
   * Intent registry whose relationships are injected into the default policy context.
   * Enables layer policies (e.g. architecturalPolicies.layerIsolation) on publish.
   */
  intentRegistry?: IntentRegistry;

  /**
   * Dependency graph whose edges are injected into the default policy context.
   */
  dependencyGraph?: DependencyGraph;

  /**
   * Pre-configured PolicyEngine to use (alternative to policies array).
   */
  policyEngine?: PolicyEngine<Context>;

  /**
   * Maximum publish history entries to retain. Oldest evicted when exceeded.
   * Default: unlimited.
   */
  maxHistorySize?: number;

  /**
   * When true (default: true if intentRegistry is provided), reject publish/subscribe
   * for intents not registered in intentRegistry and optionally validate naming.
   */
  strictRegistry?: boolean;

  /**
   * When true (default: matches strictRegistry), validate intent names follow
   * Domain.* / Application.* / Adapter.* / Workflow.* conventions at runtime.
   */
  validateIntentNaming?: boolean;
}

/**
 * A subscriber is a function that receives events of a specific intent.
 */
export type EventHandler<N extends IntentName, P = unknown> = (
  event: DomainEvent<N, P>
) => void | Promise<void>;

/**
 * Unsubscribe function returned by subscribe.
 */
export type Unsubscribe = () => void;

/**
 * Record of a published event for observability.
 */
export interface PublishedEventRecord {
  event: DomainEvent;
  publishedAt: string;
  subscribersNotified: number;
}

/**
 * The public EventBus interface.
 */
export interface EventBus {
  /**
   * Publish an event.
   * Accepts either a pre-built DomainEvent or an IntentCreator + payload (plus optional metadata).
   */
  publish<N extends IntentName, P>(
    eventOrCreator: DomainEvent<N, P> | IntentCreator<N, P>,
    payloadOrMeta?: P | Partial<EventMetadata>,
    metadata?: Partial<EventMetadata>
  ): Promise<void>;

  /**
   * Subscribe to events for a specific intent (by name or creator).
   * Returns an unsubscribe function.
   */
  subscribe<N extends IntentName, P>(
    intent: N | IntentCreator<N, P>,
    handler: EventHandler<N, P>
  ): Unsubscribe;

  /**
   * Returns the history of published events (for observability and testing).
   */
  getHistory(): PublishedEventRecord[];

  /**
   * Clears publish history (useful in tests).
   */
  clearHistory(): void;

  /**
   * Returns the observability trace (publish, soft violations, handler errors).
   */
  getTrace(): TraceRecord[];

  /**
   * Clears the observability trace.
   */
  clearTrace(): void;
}
