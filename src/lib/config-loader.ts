import { readdir, readFile } from 'fs/promises';
import { parse as parseJson } from 'json5';
import { parse as parseToml } from 'smol-toml';
import { parse as parseEnv } from 'dotenv';
import { parse as parseYaml } from 'yaml';

type KeyValueStore = { [key: string]: KeyValueStore | string };
type ConfigStore = {
  [key: string]: KeyValueStore;
};
type ParserFunction = (input: string) => KeyValueStore;

const isObject = (value: unknown) => typeof value === "object" && value !== null;

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

  const parseConfig = (config: KeyValueStore, parent: KeyValueStore | null = null): KeyValueStore => {
    if (!parent) parent = config;

    if (config['_extends']) {
      const baseConfig = parent[config['_extends'] as string];
      if (!isObject(baseConfig)) {
        console.warn(`Extending invalid config: ${config['_extends']}`);
        return config;
      }

      delete config['_extends'];

      config = { ...baseConfig, ...config };
    }

    for (const key in config) {
      if (isObject(config[key])) {
        config[key] = parseConfig(config[key] as KeyValueStore, parent);
      }

      if (typeof config[key] === "string" && config[key].startsWith("$")) {
        let currentValue: KeyValueStore | string = parent;
        const referencePath = config[key].slice(2).split(".");

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
    configStore[key] = parseConfig(configStore[key] as KeyValueStore);
  }

  return configStore;
};

export default configLoader;
