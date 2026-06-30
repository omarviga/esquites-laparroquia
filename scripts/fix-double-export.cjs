const fs = require("fs");
const path = require("path");
const dir = "C:/Users/oviey/esquites/src/routes";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".tsx"));
for (const f of files) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, "utf-8");
  if (content.includes("export default export default")) {
    content = content.replace(/export default export default/g, "export default");
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("Fixed:", f);
  }
}
