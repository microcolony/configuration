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

const parserMap: {[key: string]: ParserFunction} = {
  "json": parseJson,
  "env": (input: string) => parseEnv(Buffer.from(input)),
  "toml": parseToml as ParserFunction,
  "yaml": parseYaml
};

const configLoader = async (configPath: string): Promise<ConfigStore> => {
  console.info(`Loading config files from: ${configPath}`);

  /* Read all files in the config path */
  const files = await readdir(configPath);

  /* Load all the files */
  const configStore: ConfigStore = {};
  for (const file of files) {
    const fileParts   = file.split(".");
    let fileExtension = fileParts[fileParts.length - 1].toLowerCase();

    /** No extension === env file */
    if (fileParts.length < 2) fileExtension = "env";

    if (undefined === parserMap[fileExtension]) {
      console.warn(`Skipping file (unknown file extension): ${file}`);
      continue;
    }

    let fileData: string = await readFile(`${configPath}/${file}`, "utf-8");
    configStore[fileParts[0].toLowerCase()] = parserMap[fileExtension](fileData);
  }

  /** Now all the files are pre-loaded, we can process them */
  console.info(`Loaded ${Object.keys(configStore).length} config files`);

  const parseConfig = (config: KeyValueStore, parent: KeyValueStore | null = null): KeyValueStore => {
    if (null === parent) parent = config;

    if (undefined !== config._extends) {
      const baseConfig = parent[config._extends as string];
      if (undefined === baseConfig) {
        console.warn(`Base config not found: ${config._extends}`);
        return config;
      }

      delete config._extends;
      config = Object.assign({}, baseConfig, config);
    }

    for (const key in config) {
      if (typeof config[key] === "object") {
        config[key] = parseConfig(config[key] as KeyValueStore, parent);
      }

      if (typeof config[key] === "string" && config[key].startsWith("$")) {
        let currentValue: KeyValueStore | string = parent;

        config[key].replace("$.", "")
          .split(".")
          .forEach((referencedKey: string) => {
            if (typeof currentValue !== "object") {
              console.warn(`Invalid reference: ${config[key]}`);
              return;
            }

            currentValue = currentValue[referencedKey];
          });

        config[key] = currentValue;
      }
    }

    return config;
  }

  for (const key in configStore) {
    configStore[key] = parseConfig(configStore[key]);
  }

  return configStore;
}

export default configLoader;
