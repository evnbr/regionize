import type { Plugin } from '../types';
import { allPluginKeys } from '../types';

export const makePlugin = (plugin: Plugin): Plugin => {
  for (let key of Object.keys(plugin)) {
    if (!allPluginKeys.includes(key)) {
      throw Error(`Unknown plugin key: ${key}`);
    }  
  }
  // todo: more helpful warning messages
  return plugin;
}