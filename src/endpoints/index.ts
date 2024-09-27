import { Hono } from "hono/tiny";
import { controller as configurationController } from "./v1.configuration.js";

const Controller = new Hono({ strict: false });

Controller.route("/", configurationController);

export default Controller;
