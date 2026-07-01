/**
 * Architecture layer profiles.
 *
 * A profile turns semantic names such as `Domain.Order.Placed` into governed
 * layer names and dependency rules.
 */

export interface ArchitectureLayer {
  name: string;
  prefixes: string[];
  description?: string;
  order?: number;
}

export interface ArchitectureRule {
  from: string;
  to: string;
  allowed: boolean;
  message?: string;
}

export interface ArchitectureProfile {
  name: string;
  layers: ArchitectureLayer[];
  rules: ArchitectureRule[];
  resolveLayer(name: string): string | undefined;
}

export interface CreateArchitectureProfileOptions {
  name: string;
  layers: ArchitectureLayer[];
  rules?: ArchitectureRule[];
}
