const https = require("https");

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        https.get(new URL(res.headers.location, url).href, res2 => {
          let d = "";
          res2.on("data", c => d += c);
          res2.on("end", () => resolve({ status: res2.statusCode, body: d }));
        });
        return;
      }
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    }).on("error", reject);
  });
}

async function main() {
  // Get the HTML first
  const html = await fetchURL("https://esquites.vercel.app/");
  console.log("HTML status:", html.status, "size:", html.body.length);
  const match = html.body.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!match) { console.log("NO JS in HTML"); return; }
  const jsUrl = "https://esquites.vercel.app" + match[1];
  console.log("JS URL:", match[1]);
  
  const js = await fetchURL(jsUrl);
  console.log("JS status:", js.status, "size:", js.body.length);
  console.log("JS Content-Type:", js.body.length > 0 ? "loaded" : "empty");
  
  // Check for syntax errors - try parsing first 10 chars
  const firstChars = js.body.slice(0, 50);
  console.log("First 50 chars:", JSON.stringify(firstChars));
  
  // Check if main.tsx code is there
  console.log("Has ROUTER DEBUG:", js.body.includes("ROUTER DEBUG"));
  console.log("Has createRoot:", js.body.includes("createRoot"));
}

main().catch(e => console.error(e));
