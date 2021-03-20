import type { Plugin } from '../types';
import { allPluginKeys } from '../types';

// This doesn't actually do anything besides error checking
export const makePlugin = (plugin: Plugin): Plugin => {
  for (let key of Object.keys(plugin)) {
    if (!allPluginKeys.includes(key)) {
      throw Error(`Unknown plugin key: ${key}`);
    }
  }
  // todo: more helpful warning messages
  return plugin;
}