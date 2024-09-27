import { isObject } from "./helpers.js";
import logger from "./logger.js";

const internalPlugins: ParserPlugin[] = [
  (value: string, currentKey: string, parent: KeyValueStore): string | KeyValueStore => {
    if (!value.startsWith("~ref~")) return value;

    const referencePath = value.replace("~ref~", "").trim().split(".");
    referencePath[0] ||= currentKey;
    let currentValue: KeyValueStore | string = parent;

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
  value: string,
  currentKey: string,
  parent: KeyValueStore,
): string | KeyValueStore => {
  for (const plugin of internalPlugins) {
    value = plugin(value, currentKey, parent) as string;
  }

  return value;
};
