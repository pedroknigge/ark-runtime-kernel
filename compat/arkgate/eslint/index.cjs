'use strict';
const namespace = require('structrail/eslint');
const plugin = namespace.default || namespace;
const legacyPlugin = {
  ...plugin,
  configs: {
    ...plugin.configs,
    recommended: plugin.configs['recommended-legacy'],
  },
};

module.exports = { ...namespace, default: legacyPlugin, plugin: legacyPlugin };
