import { Hono } from "hono/tiny";
import { Context } from "hono";
import config, { addConfigUpdateListener } from "../lib/config-store.js";
import { isObject } from "../lib/helpers.js";

export const controller = new Hono({ strict: false }).basePath("/v1/configuration");

let localConfig = config;
addConfigUpdateListener((newConfig) => (localConfig = newConfig));

controller.get("/:sections{.*}?", (c: Context) => {
  const sectionParts = (c.req.param("sections") || "").split("/");
  if (sectionParts[0] === "") return c.json(localConfig);

  let currentSection: ConfigStore = localConfig;

  for (const section of sectionParts) {
    if (!currentSection[section]) return c.json({ error: "Not found" }, 404);
    if (!isObject(currentSection[section])) return c.json({ [section]: currentSection[section] });
    currentSection = currentSection[section] as ConfigStore;
  }

  return c.json(currentSection);
});
