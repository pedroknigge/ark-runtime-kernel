/**
 * Basic MetadataRegistry implementation.
 */

import type { EntityMeta, MetadataRegistry } from './types';

export class MetadataRegistryImpl implements MetadataRegistry {
  private entities = new Map<string, EntityMeta>();

  entity(name: string, meta: Omit<EntityMeta, 'name'>): EntityMeta {
    const full: EntityMeta = { name, fields: {}, ...meta };
    this.entities.set(name, full);
    return full;
  }

  getEntity(name: string): EntityMeta | undefined {
    return this.entities.get(name);
  }

  listEntities(): EntityMeta[] {
    return Array.from(this.entities.values());
  }
}

export function createMetadataRegistry(): MetadataRegistry {
  return new MetadataRegistryImpl();
}
