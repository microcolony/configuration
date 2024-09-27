import { parse as parseJson } from "json5";
import { parse as parseToml } from "smol-toml";
import { parse as parseEnv } from "dotenv";
import { parse as parseYaml } from "yaml";
import logger from "./logger.js";
import { isObject } from "./helpers.js";
import { applyPlugins } from "./config-plugins.js";

export const parserMap: { [key: str]: ParserFunction } = {
  json: parseJson,
  env: (input: str) => parseEnv(Buffer.from(input)),
  toml: parseToml as ParserFunction,
  yaml: parseYaml,
};

export const parseConfig = (
  config: ConfigStore,
  currentKey: str,
  parent: ConfigStore,
): ConfigStore => {
  config = extendConfig(config, currentKey, parent);

  for (const key in config) {
    if (isObject(config[key])) {
      config[key] = parseConfig(config[key], currentKey, parent);
    }

    if (typeof config[key] === "string") {
      config[key] = processValue(config[key], currentKey, parent);
    }
  }

  return config;
};

export const extendConfig = (config: ConfigStore, currentKey: str, parent: ConfigStore) => {
  if (!config["~extends~"]) return config;

  if (typeof config["~extends~"] !== "string") {
    logger.warn(`Invalid ~extends~ value: ${config["~extends~"]}`);
    return config;
  }

  const extendPath = config["~extends~"].split(".");
  extendPath[0] ||= currentKey;
  let currentExtend = parent;
  for (const key of extendPath) {
    if (!isObject(currentExtend) || currentExtend[key] === undefined) {
      logger.warn(`Invalid ~extends~ path: ${config["~extends~"]}`);
      return config;
    }

    currentExtend = currentExtend[key] as ConfigStore;
  }

  if (!isObject(currentExtend)) {
    logger.warn(`Extending invalid config: ${config["~extends~"]}`);
    return config;
  }

  if (currentExtend["~extends~"]) {
    currentExtend = extendConfig(currentExtend, currentKey, parent);
  }

  delete config["~extends~"];

  config = { ...currentExtend, ...config };

  return config;
};

/**
 * Apply plugins to a value
 *
 * Note: When and external plugin system is developed, the currentKey and parent should not be sent
 * to them. They are only for internal plugins. External plugins should receive only the value
 *
 * @param value
 * @param currentKey This is used by internal plugins to get a base when not specified in references
 * @param parent This is used by internal plugins to apply references
 * @returns
 */
export const processValue = (
  value: str,
  currentKey: str,
  parent: ConfigStore,
): str | ConfigStore => {
  if (!value.startsWith("~")) return value;

  value = applyPlugins(value, currentKey, parent) as str;

  return value;
};
