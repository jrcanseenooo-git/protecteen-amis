const cp = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        walk(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkJavaScript() {
  const roots = ["api", "handlers", "lib", "public", "scripts"]
    .map((name) => path.join(rootDir, name))
    .filter((dir) => fs.existsSync(dir));

  for (const dir of roots) {
    for (const file of walk(dir)) {
      cp.execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
    }
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildStaticOutput() {
  fs.rmSync(distDir, { recursive: true, force: true });
  copyDir(publicDir, distDir);
}

checkJavaScript();
buildStaticOutput();
console.log("Build complete: static files copied to dist/");
