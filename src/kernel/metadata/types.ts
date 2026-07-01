/**
 * Metadata System (basic) for extensibility.
 *
 * Allows declaring entities, fields and simple rules/behaviors as data.
 * This can be used by tools, codegen, or AI to understand the domain without hardcoding.
 */

export interface FieldMeta {
  type: string;
  identity?: boolean;
  required?: boolean;
  [key: string]: unknown;
}

export interface EntityMeta {
  name: string;
  fields: Record<string, FieldMeta>;
  rules?: Array<{ name: string; description?: string }>;
  /** Intent names this entity emits (domain events). */
  emits?: string[];
  /** Intent names this entity consumes / reacts to. */
  consumes?: string[];
  [key: string]: unknown;
}

export interface MetadataRegistry {
  entity(name: string, meta: Omit<EntityMeta, 'name'>): EntityMeta;
  getEntity(name: string): EntityMeta | undefined;
  listEntities(): EntityMeta[];
}
