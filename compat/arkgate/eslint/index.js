import plugin from 'structrail/eslint';

const legacyPlugin = {
  ...plugin,
  configs: {
    ...plugin.configs,
    recommended: plugin.configs['recommended-legacy'],
  },
};

export default legacyPlugin;
export * from 'structrail/eslint';
