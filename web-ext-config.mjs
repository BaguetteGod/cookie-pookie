// web-ext settings: keep dev files out of the packaged add-on.
export default {
  ignoreFiles: [
    "package.json",
    "package-lock.json",
    "README.md",
    "CHANGELOG.md",
    "docs",
    "node_modules",
    "scripts",
    "tests",
    "web-ext-config.mjs",
    ".gitignore",
    // web-ext sign builds in a temporary folder, so it doesn't skip this one by itself
    "web-ext-artifacts"
  ]
};
