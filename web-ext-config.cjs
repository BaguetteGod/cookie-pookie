// web-ext settings: keep dev files out of the packaged add-on.
module.exports = {
  ignoreFiles: ["package.json", "package-lock.json", "README.md", "node_modules", "web-ext-config.cjs", ".gitignore"]
};
