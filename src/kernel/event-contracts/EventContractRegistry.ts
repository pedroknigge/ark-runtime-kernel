import type { DomainEvent } from '../../domain/types';
import type {
  EventContract,
  EventContractIssue,
  EventContractRegistry,
  EventContractValidationResult,
  EventSchemaFieldType,
} from './types';

function actualType(value: unknown): EventSchemaFieldType {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'object';
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'object') {
    return type;
  }
  return 'unknown';
}

export class EventContractRegistryImpl implements EventContractRegistry {
  private readonly contracts = new Map<string, EventContract>();

  register(contract: EventContract): void {
    const key = this.key(contract.intent, contract.version);
    if (this.contracts.has(key)) {
      throw new Error(`Event contract "${key}" is already registered.`);
    }
    this.contracts.set(key, { allowAdditionalFields: true, ...contract });
  }

  get(intent: string, version?: string): EventContract | undefined {
    if (version) return this.contracts.get(this.key(intent, version));
    return this.list(intent).at(-1);
  }

  list(intent?: string): EventContract[] {
    return Array.from(this.contracts.values()).filter(
      (contract) => !intent || contract.intent === intent
    );
  }

  validate(event: DomainEvent): EventContractValidationResult {
    const version = event.metadata.eventVersion;
    const contract = this.get(event.intent, version);
    const issues: EventContractIssue[] = [];

    if (!contract) {
      return {
        ok: false,
        issues: [
          {
            intent: event.intent,
            version,
            message: version
              ? `No event contract registered for version "${version}".`
              : 'No event contract registered for intent.',
          },
        ],
      };
    }

    if (contract.deprecated) {
      issues.push({
        intent: event.intent,
        version: contract.version,
        message:
          typeof contract.deprecated === 'string'
            ? contract.deprecated
            : 'Event contract is deprecated.',
      });
    }

    const payload =
      event.payload != null && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)
        : undefined;

    if (contract.schema) {
      if (!payload) {
        issues.push({
          intent: event.intent,
          version: contract.version,
          message: 'Payload must be an object for schema validation.',
        });
      } else {
        for (const [field, schema] of Object.entries(contract.schema)) {
          const value = payload[field];
          if (value === undefined) {
            if (schema.required) {
              issues.push({
                intent: event.intent,
                version: contract.version,
                field,
                message: 'Required field is missing.',
              });
            }
            continue;
          }

          if (schema.type !== 'unknown' && actualType(value) !== schema.type) {
            issues.push({
              intent: event.intent,
              version: contract.version,
              field,
              message: `Expected ${schema.type}, received ${actualType(value)}.`,
            });
          }
        }

        if (contract.allowAdditionalFields === false) {
          for (const field of Object.keys(payload)) {
            if (!contract.schema[field]) {
              issues.push({
                intent: event.intent,
                version: contract.version,
                field,
                message: 'Additional field is not allowed by event contract.',
              });
            }
          }
        }
      }
    }

    return { ok: issues.length === 0, contract, issues };
  }

  clear(): void {
    this.contracts.clear();
  }

  private key(intent: string, version: string): string {
    return `${intent}@${version}`;
  }
}

export function createEventContractRegistry(): EventContractRegistry {
  return new EventContractRegistryImpl();
}
