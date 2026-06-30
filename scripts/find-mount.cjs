const fs = require("fs");
const js = fs.readFileSync("C:/Users/oviey/esquites/dist/assets/index-BEsCwBYD.js", "utf-8");
// Find where route tree is defined - look for IndexRoute pattern
const idx = js.indexOf('IndexRoute');
console.log("IndexRoute found at:", idx);
if (idx > 0) {
  console.log("Context around IndexRoute:");
  console.log(js.slice(Math.max(0, idx - 200), idx + 200));
}

// Also check for route matching
const lm = js.indexOf('firstId');
console.log("\nfirstId found at:", lm);
