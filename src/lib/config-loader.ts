import { readdir, readFile } from "fs/promises";
import { parse as parseJson } from "json5";
import { parse as parseToml } from "smol-toml";
import { parse as parseEnv } from "dotenv";
import { parse as parseYaml } from "yaml";

export type KeyValueStore = { [key: string]: KeyValueStore | string };
type ConfigStore = {
  [key: string]: KeyValueStore;
};
type ParserFunction = (input: string) => KeyValueStore;

export const isObject = (value: unknown) => typeof value === "object" && value !== null;

const parserMap: { [key: string]: ParserFunction } = {
  json: parseJson,
  env: (input: string) => parseEnv(Buffer.from(input)),
  toml: parseToml as ParserFunction,
  yaml: parseYaml,
};

const configLoader = async (configPath: string): Promise<ConfigStore> => {
  console.info(`Loading config files from: ${configPath}`);

  let files: string[];
  try {
    files = await readdir(configPath);
  } catch (error: unknown) {
    console.error(`Failed to read directory: ${error}`);
    return {};
  }

  const configStore: ConfigStore = {};
  for (const file of files) {
    const fileParts = file.split(".");
    let fileExtension = (fileParts[fileParts.length - 1] || "").toLowerCase();

    if (fileParts.length < 2) fileExtension = "env";

    const parser = parserMap[fileExtension];
    if (!parser) {
      console.warn(`Skipping file (unknown file extension): ${file}`);
      continue;
    }

    let fileData: string;
    try {
      fileData = await readFile(`${configPath}/${file}`, "utf-8");
      configStore[(fileParts[0] || "").toLowerCase()] = parser(fileData);
    } catch (error: unknown) {
      console.error(`Failed to read and parse file ${file}: ${error}`);
      continue;
    }
  }

  console.info(`Loaded ${Object.keys(configStore).length} config files`);

  const extendConfig = (config: KeyValueStore, currentKeyName: string, parent: KeyValueStore) => {
    if (!config["~extends~"]) return config;

    if (typeof config["~extends~"] !== "string") {
      console.warn(`Invalid ~extends~ value: ${config["~extends~"]}`);
      return config;
    }

    const extendPath = config["~extends~"].split(".");
    extendPath[0] ||= currentKeyName;
    let currentExtend = parent;
    for (const key of extendPath) {
      if (!isObject(currentExtend) || currentExtend[key] === undefined) {
        console.warn(`Invalid ~extends~ path: ${config["~extends~"]}`);
        return config;
      }

      currentExtend = currentExtend[key] as KeyValueStore;
    }

    if (!isObject(currentExtend)) {
      console.warn(`Extending invalid config: ${config["~extends~"]}`);
      return config;
    }

    if (currentExtend["~extends~"]) {
      currentExtend = extendConfig(currentExtend, currentKeyName, parent);
    }

    delete config["~extends~"];

    config = { ...currentExtend, ...config };

    return config;
  };

  const processValue = (value: string, currentKeyName: string, parent: KeyValueStore) => {
    if (!value.startsWith("~")) return value;

    for (const plugin of plugins) {
      value = plugin(value, currentKeyName, parent) as string;
    }

    return value;
  };

  const parseConfig = (
    config: KeyValueStore,
    currentKeyName: string,
    parent: KeyValueStore,
  ): KeyValueStore => {
    config = extendConfig(config, currentKeyName, parent);

    for (const key in config) {
      if (isObject(config[key])) {
        config[key] = parseConfig(config[key], currentKeyName, parent);
      }

      if (typeof config[key] === "string") {
        config[key] = processValue(config[key], currentKeyName, parent);
      }
    }

    return config;
  };

  for (const key in configStore) {
    configStore[key] = parseConfig(configStore[key] as KeyValueStore, key, configStore);
  }

  return configStore;
};

type Plugin = (
  value: string,
  currentKeyName: string,
  parent: KeyValueStore,
) => string | KeyValueStore;
const plugins: Plugin[] = [
  (value: string, currentKeyName: string, parent: KeyValueStore): string | KeyValueStore => {
    if (!value.startsWith("~ref~")) return value;

    const referencePath = value.replace("~ref~", "").trim().split(".");
    referencePath[0] ||= currentKeyName;
    let currentValue: KeyValueStore | string = parent;

    for (const referencedKey of referencePath) {
      if (!isObject(currentValue) || currentValue[referencedKey] === undefined) {
        console.warn(`Invalid reference: ${value}`);
        currentValue = "";
        break;
      }
      currentValue = currentValue[referencedKey];
    }

    return currentValue;
  },
];

export default configLoader;
