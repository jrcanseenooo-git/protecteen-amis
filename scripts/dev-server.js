const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { URL } = require("url");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
let rpcHandler;

function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function contentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = err.code === "ENOENT" ? 404 : 500;
      res.end(res.statusCode === 404 ? "Not found" : "Server error");
      return;
    }
    res.setHeader("Content-Type", contentType(filePath));
    res.end(data);
  });
}

function resolveStaticPath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
    return null;
  }

  return filePath;
}

loadDotEnv();
rpcHandler = require(path.join(rootDir, "api", "rpc"));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/rpc") {
    await rpcHandler(req, res);
    return;
  }

  const filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      sendFile(res, path.join(filePath, "index.html"));
      return;
    }

    if (!err && stat.isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(publicDir, "index.html"));
  });
});

const preferredPort = Number(process.env.PORT || 3000);

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      reject(error);
    });
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, "127.0.0.1");
  });
}

async function choosePort(port) {
  if (process.env.PORT) return port;
  let candidate = port;
  while (!(await isPortAvailable(candidate))) {
    candidate++;
  }
  return candidate;
}

choosePort(preferredPort)
  .then((port) => {
    server.listen(port, "127.0.0.1", () => {
      console.log(`AMIS local dev server running at http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
