import { readdir, readFile } from 'node:fs/promises';
import { parse as parseJson } from 'json5';
import { parse as parseToml } from 'smol-toml';
import { parse as parseEnv } from 'dotenv';
import { parse as parseYaml } from 'yaml';

export type KeyValueStore = { [key: string]: KeyValueStore | string };
type ConfigStore = {
  [key: string]: KeyValueStore;
};
type ParserFunction = (input: string) => KeyValueStore;

export const isObject = (value: unknown) => typeof value === "object" && value !== null;

const parserMap: { [key: string]: ParserFunction } = {
  "json": parseJson,
  "env": (input: string) => parseEnv(Buffer.from(input)),
  "toml": parseToml as ParserFunction,
  "yaml": parseYaml
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

  const parseConfig = (config: KeyValueStore, currentKeyName: string, parent: KeyValueStore): KeyValueStore => {
    if (config['~extends~']) {
      if (typeof config['~extends~'] !== "string") {
        console.warn(`Invalid ~extends~ value: ${config['~extends~']}`);
        return config;
      }

      const extendPath = config['~extends~'].split(".");
      extendPath[0] ||= currentKeyName;
      let currentExtend = parent;
      for (const key of extendPath) {
        if (!isObject(currentExtend) || currentExtend[key] === undefined) {
          console.warn(`Invalid ~extends~ path: ${config['~extends~']}`);
          return config;
        }

        currentExtend = currentExtend[key] as KeyValueStore;
      }

      if (!isObject(currentExtend)) {
        console.warn(`Extending invalid config: ${config['~extends~']}`);
        return config;
      }

      delete config['~extends~'];

      config = { ...currentExtend, ...config };
    }

    for (const key in config) {
      if (isObject(config[key])) {
        config[key] = parseConfig(config[key] as KeyValueStore, currentKeyName, parent);
      }

      if (typeof config[key] === "string" && config[key].startsWith("~ref~")) {
        const referencePath = config[key].replace('~ref~', '').trim().split(".");
        if (referencePath[0] === "")  referencePath[0] = currentKeyName;
        let currentValue: KeyValueStore | string = parent;

        for (const referencedKey of referencePath) {
          if (!isObject(currentValue) || currentValue[referencedKey] === undefined) {
            console.warn(`Invalid reference: ${config[key]}`);
            currentValue = "";
            break;
          }
          currentValue = currentValue[referencedKey];
        }

        config[key] = currentValue;
      }
    }

    return config;
  };

  for (const key in configStore) {
    configStore[key] = parseConfig(configStore[key] as KeyValueStore, key, configStore);
  }

  return configStore;
};

export default configLoader;
