const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.resolve(__dirname, "..");
const CLIENT = path.join(ROOT, "client");
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function send(res, code, body, type) {
  res.writeHead(code, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (!err) {
      send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream");
      return;
    }
    if (path.extname(filePath)) {
      send(res, 404, "not found");
      return;
    }
    fs.readFile(path.join(CLIENT, "index.html"), (fallbackErr, html) => {
      if (fallbackErr) {
        send(res, 404, "not found");
        return;
      }
      send(res, 200, html, MIME[".html"]);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "method not allowed");
    return;
  }
  const pathname = decodeURIComponent(url.parse(req.url).pathname);
  const filePath = path.join(CLIENT, pathname === "/" ? "index.html" : pathname);
  if (!filePath.startsWith(CLIENT)) {
    send(res, 403, "forbidden");
    return;
  }
  serveFile(res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("campus-mutual-aid local preview on http://127.0.0.1:" + PORT);
});
