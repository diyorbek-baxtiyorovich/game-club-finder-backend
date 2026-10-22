import cors from "cors";
import express from "express";

import { env } from "./config/env.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
