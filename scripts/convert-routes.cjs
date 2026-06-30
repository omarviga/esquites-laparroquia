// Batch convert TanStack Router route files to SPA-compatible format
const fs = require("fs");
const path = require("path");

const routesDir = "C:/Users/oviey/esquites/src/routes";

function processRouteFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // 1. Remove tanstack router imports
  content = content.replace(
    /import\s*\{[^}]*\}\s*from\s*["']@tanstack\/react-router["'];?\s*\n/g,
    ""
  );

  // 2. Remove Route export block: export const Route = createFileRoute(...)({...component: Xxx,...});
  content = content.replace(
    /export\s+const\s+Route\s*=\s*createFileRoute\(["'][^"']*["']\)\s*\(\s*\{[\s\S]*?component:\s*(\w+)[\s\S]*?\}\s*\)\s*;?\s*\n*/g,
    (match, componentName) => {
      // Save the component name for later
      return `// Route: ${filePath} — converted to SPA\n`;
    }
  );

  // 3. For layout route (_authenticated/route.tsx), handle context differently
  if (filePath.includes("_authenticated/route.tsx")) {
    // This needs manual handling — skip for now
    return { filePath, modified: false, reason: "layout route needs manual" };
  }

  // 4. Find component functions and make them default exports
  content = content.replace(
    /(export\s+)?function\s+(\w+Page|\w+Component)\(/g,
    "export default function $2("
  );

  // 5. Also handle arrow function components
  content = content.replace(
    /(export\s+)?const\s+(\w+Page|\w+Component)\s*=\s*(\([^)]*\)|\(\{[^}]*\}\))\s*=>/g,
    "const $2 = $3 =>"
  );

  // 6. Replace useNavigate() calls
  content = content.replace(
    /const\s+navigate\s*=\s*useNavigate\s*\(\s*\)\s*;?\s*/g,
    'const goTo = (path) => { window.location.href = path; };\n'
  );

  // 7. Replace navigate({ to: "..." }) calls
  content = content.replace(/navigate\s*\(\s*\{\s*to:\s*["']([^"']+)["'][^}]*\}\s*\)/g, 'goTo("$1")');

  // 8. Replace navigate(-1) / navigate(1)
  content = content.replace(/navigate\s*\(\s*(-?\d+)\s*\)/g, "window.history.go($1)");

  // 9. Replace Link imports and usages — handled in read at step 1

  if (content !== fs.readFileSync(filePath, "utf-8")) {
    fs.writeFileSync(filePath, content, "utf-8");
    modified = true;
  }

  return { filePath, modified };
}

function walk(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const routeFiles = walk(routesDir);
console.log(`Found ${routeFiles.length} route files\n`);

for (const file of routeFiles) {
  const result = processRouteFile(file);
  if (result.modified) {
    console.log(`✅ ${path.relative(routesDir, file)}`);
  } else if (result.reason) {
    console.log(`⏭️ ${path.relative(routesDir, file)} — ${result.reason}`);
  } else {
    console.log(`· ${path.relative(routesDir, file)} — no changes`);
  }
}
