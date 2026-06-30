const fs = require("fs");

const files = [
  "C:/Users/oviey/esquites/src/components/PaymentQRDialog.tsx",
  "C:/Users/oviey/esquites/src/components/PaymentTerminalDialog.tsx",
  "C:/Users/oviey/esquites/src/components/ReceiptDialog.tsx",
  "C:/Users/oviey/esquites/src/components/SaleDetailDialog.tsx",
  "C:/Users/oviey/esquites/src/components/PlaceholderPage.tsx",
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  let modified = false;

  // Remove useServerFn import from tanstack
  if (content.includes('import { useServerFn } from "@tanstack/react-start"')) {
    content = content.replace(
      /import\s*\{\s*useServerFn\s*\}\s*from\s*["']@tanstack\/react-start["'];?\s*\n/g,
      ""
    );
    modified = true;
  }

  // Replace const xxx = useServerFn(funcName) with const xxx = funcName
  content = content.replace(
    /const\s+(\w+)\s*=\s*useServerFn\s*\(\s*(\w+)\s*\)/g,
    "const $1 = $2"
  );
  if (content !== fs.readFileSync(file, "utf-8")) modified = true;

  // Remove createFileRoute from PlaceholderPage
  if (content.includes("createFileRoute")) {
    content = content.replace(
      /import\s*\{\s*createFileRoute\s*\}\s*from\s*["']@tanstack\/react-router["'];?\s*\n/g,
      ""
    );
    content = content.replace(
      /export\s+const\s+Route\s*=\s*createFileRoute\([^)]+\)\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*\n*/g,
      ""
    );
    modified = true;
  }

  // Remove useNavigate from tanstack in PlaceholderPage
  content = content.replace(
    /import\s*\{\s*useNavigate\s*\}\s*from\s*["']@tanstack\/react-router["'];?\s*\n/g,
    ""
  );
  content = content.replace(
    /const\s+navigate\s*=\s*useNavigate\s*\(\s*\)\s*;?\s*/g,
    'const goTo = (path) => { window.location.href = path; };\n'
  );
  content = content.replace(
    /navigate\s*\(\s*\{\s*to:\s*["']([^"']+)["'][^}]*\}\s*\)/g,
    'goTo("$1")'
  );

  if (modified) {
    fs.writeFileSync(file, content, "utf-8");
    console.log("✅", file.split("/").pop());
  } else {
    console.log("·", file.split("/").pop(), "(no changes)");
  }
}
