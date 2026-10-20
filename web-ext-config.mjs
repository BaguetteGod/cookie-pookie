// web-ext settings: keep dev files out of the packaged add-on.
export default {
  ignoreFiles: [
    "package.json",
    "package-lock.json",
    "README.md",
    "node_modules",
    "scripts",
    "tests",
    "web-ext-config.mjs",
    ".gitignore"
  ]
};
