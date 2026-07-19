/** Build the one effective policy consumed by resolved Tooling adapters. */
export function effectiveAnalysisConfig(config, manifest) {
  const manifestRules = manifest?.architecture?.rules;
  const manifestLayers = manifest?.architecture?.layers;
  const hasManifestIntentLayers = Array.isArray(manifestLayers);
  const prefixesByLayer = new Map(
    hasManifestIntentLayers
      ? manifestLayers
          .filter((layer) => layer && typeof layer.name === 'string')
          .map((layer) => [
            layer.name,
            Array.isArray(layer.prefixes)
              ? layer.prefixes.filter((prefix) => typeof prefix === 'string')
              : [],
          ])
      : []
  );
  return {
    ...config,
    layers: config.layers.map((layer) =>
      hasManifestIntentLayers
        ? { ...layer, intentPrefixes: prefixesByLayer.get(layer.name) ?? [] }
        : { ...layer }
    ),
    rules: Array.isArray(manifestRules) ? manifestRules : config.rules,
  };
}
