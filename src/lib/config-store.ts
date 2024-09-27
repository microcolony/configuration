import chokidar from "chokidar";
import configLoader from "./config-loader.js";
import logger from "./logger.js";

const CONFIGURATION_DIRECTORY = "configs";
let config = await configLoader(CONFIGURATION_DIRECTORY);

const listeners: ListenerFunction[] = [];
export const addConfigUpdateListener = (listener: ListenerFunction) => listeners.push(listener);

chokidar.watch(CONFIGURATION_DIRECTORY, { ignoreInitial: true }).on("all", async (event, path) => {
  logger.info(`Configuration file event: ${event} - ${path}`);
  logger.info("Configuration files changed, reloading...");
  config = await configLoader(CONFIGURATION_DIRECTORY);

  listeners.forEach((listener) => listener(config));
});

export default config;
