import { parse as parseJson } from "json5";
import { parse as parseToml } from "smol-toml";
import { parse as parseEnv } from "dotenv";
import { parse as parseYaml } from "yaml";
import logger from "./logger.js";
import { isObject } from "./helpers.js";
import { applyPlugins } from "./config-plugins.js";

export const parserMap: { [key: string]: ParserFunction } = {
  json: parseJson,
  env: (input: string) => parseEnv(Buffer.from(input)),
  toml: parseToml as ParserFunction,
  yaml: parseYaml,
};

export const parseConfig = (
  config: KeyValueStore,
  currentKey: string,
  parent: KeyValueStore,
): KeyValueStore => {
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

export const extendConfig = (config: KeyValueStore, currentKey: string, parent: KeyValueStore) => {
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

    currentExtend = currentExtend[key] as KeyValueStore;
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

export const processValue = (value: string, currentKey: string, parent: KeyValueStore) => {
  if (!value.startsWith("~")) return value;

  value = applyPlugins(value, currentKey, parent) as string;

  return value;
};
