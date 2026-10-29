import { resolve } from "node:path";
import { Router } from "express";

export const swaggerRouter = Router();

const swaggerCsp = [
  "default-src 'none'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: https://unpkg.com",
  "font-src 'self' data: https://unpkg.com",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

swaggerRouter.get("/", (_request, response) => {
  response.setHeader("Content-Security-Policy", swaggerCsp);
  response.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GameClubFinder</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" integrity="sha384-+yyzNgM3K92sROwsXxYCxaiLWxWJ0G+v/9A+qIZ2rgefKgkdcmJI+L601cqPD/Ut" crossorigin="anonymous">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" integrity="sha384-qn5tagrAjZi8cSmvZ+k3zk4+eDEEUcP9myuR2J6V+/H6rne++v6ChO7EeHAEzqxQ" crossorigin="anonymous"></script>
  <script src="/api/docs/init.js"></script>
</body>
</html>`);
});

swaggerRouter.get("/init.js", (_request, response) => {
  response.type("js").send(`window.addEventListener("load", () => {
  window.ui = SwaggerUIBundle({
    url: "/api/docs/openapi.yaml",
    dom_id: "#swagger-ui",
    deepLinking: true,
  });
});`);
});

swaggerRouter.get("/openapi.yaml", (_request, response) => {
  response.type("yaml").sendFile(resolve(process.cwd(), "docs/openapi.yaml"));
});
