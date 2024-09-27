import { Hono } from "hono/tiny";
import Controller from "./endpoints/index.js";

const app = new Hono({ strict: false });
app.route("/", Controller);

export default {
  port: 8475,
  fetch: app.fetch.bind(app),
};
