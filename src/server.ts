import { Hono } from "hono/tiny";
import { controller } from "./endpoints/v1.configuration.js";

const app = new Hono({ strict: false });
app.route("/", controller);

export default {
  port: 8475,
  fetch: app.fetch.bind(app),
};
