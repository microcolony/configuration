import { Hono } from "hono/tiny";
import { Context } from "hono";
import chokidar from "chokidar";
import configLoader, { KeyValueStore, isObject } from "./lib/config-loader.js";

const app = new Hono({ strict: false });

const CONFIGURATION_DIRECTORY = "tests/storage-mock";
let config = await configLoader(CONFIGURATION_DIRECTORY);
chokidar.watch(CONFIGURATION_DIRECTORY, { ignoreInitial: true }).on("all", async (event, path) => {
  console.info(`Configuration file event: ${event} - ${path}`);
  console.info("Configuration files changed, reloading...");
  config = await configLoader(CONFIGURATION_DIRECTORY);
});

app.get("/v1/configuration/:sections{.*}?", (c: Context) => {
  const sectionParts = (c.req.param("sections") || "").split("/");
  if (sectionParts[0] === "") return c.json(config);

  let currentSection: KeyValueStore = config;

  for (const section of sectionParts) {
    if (!currentSection[section]) return c.json({ error: "Not found" }, 404);
    if (!isObject(currentSection[section])) return c.json({ [section]: currentSection[section] });
    currentSection = currentSection[section] as KeyValueStore;
  }

  return c.json(currentSection);
});

export default {
  port: 8475,
  fetch: app.fetch.bind(app),
};
