const fs = require("fs");
const path = require("path");
const dir = "C:/Users/oviey/esquites/src/routes";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".tsx") && !f.startsWith("_"));
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), "utf-8");
  const hasExport = c.includes("export default");
  const hasRoute = c.includes("createFileRoute") || c.includes("createRootRoute");
  console.log(f, `default:${hasExport}`, `hasRouter:${hasRoute}`);
}
