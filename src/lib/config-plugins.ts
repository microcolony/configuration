import { isObject } from "./helpers.js";
import logger from "./logger.js";

const internalPlugins: InternalPlugin[] = [
  (value: str, currentKey: str, parent: ConfigStore): str | ConfigStore => {
    if (!value.startsWith("~ref~")) return value;

    const referencePath = value.replace("~ref~", "").trim().split(".");
    referencePath[0] ||= currentKey;
    let currentValue: ConfigStore | str = parent;

    for (const referencedKey of referencePath) {
      if (!isObject(currentValue) || currentValue[referencedKey] === undefined) {
        logger.warn(`Invalid reference: ${value}`);
        currentValue = "";
        break;
      }
      currentValue = currentValue[referencedKey];
    }

    return currentValue;
  },
];

export const applyPlugins = (
  value: str,
  currentKey: str,
  parent: ConfigStore,
): str | ConfigStore => {
  for (const plugin of internalPlugins) {
    value = plugin(value, currentKey, parent) as str;
  }

  return value;
};
