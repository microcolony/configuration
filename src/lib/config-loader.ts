import { readdir, readFile } from "fs/promises";
import { parserMap } from "./config-parser.js";
import logger from "./logger.js";
import { parseConfig } from "./config-parser.js";

const configLoader = async (configPath: string): Promise<ConfigStore> => {
  logger.info(`Loading config files from: ${configPath}`);

  let files: string[];
  try {
    files = await readdir(configPath);
  } catch (error: unknown) {
    logger.error(`Failed to read directory: ${error}`);
    return {};
  }

  const configStore: ConfigStore = {};
  for (const file of files) {
    const fileParts = file.split(".");
    let fileExtension = (fileParts[fileParts.length - 1] || "").toLowerCase();

    if (fileParts.length < 2) fileExtension = "env";

    const parser = parserMap[fileExtension];
    if (!parser) {
      logger.warn(`Skipping file (unknown file extension): ${file}`);
      continue;
    }

    let fileData: string;
    try {
      fileData = await readFile(`${configPath}/${file}`, "utf-8");
      configStore[(fileParts[0] || "").toLowerCase()] = parser(fileData);
    } catch (error: unknown) {
      logger.error(`Failed to read and parse file ${file}: ${error}`);
      continue;
    }
  }

  logger.info(`Loaded ${Object.keys(configStore).length} config files`);

  for (const key in configStore) {
    configStore[key] = parseConfig(configStore[key] as KeyValueStore, key, configStore);
  }

  return configStore;
};

export default configLoader;
