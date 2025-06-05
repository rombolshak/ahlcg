import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, readdir, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const assets = join(root, "public", "assets");
const generated = join(assets, "generated");
const i18n = join(assets, "i18n");

function createDirectoryStructure(loc, filename, basePath = ".") {
  // Separate string entries and nested objects
  const stringEntries = {};
  const nestedEntries = {};
  for (const key in loc) {
    if (typeof loc[key] === "string") {
      stringEntries[key] = loc[key];
    } else if (typeof loc[key] === "object") {
      nestedEntries[key] = loc[key];
    }
  }
  // If any string entries exist, write them all together to one file in the basePath
  if (Object.keys(stringEntries).length > 0) {
    // Ensure basePath exists (for root '.' it should already exist)
    mkdirSync(basePath, { recursive: true });
    const filePath = join(basePath, filename);
    console.log(filePath, "=>", JSON.stringify(stringEntries));
    writeFileSync(filePath, JSON.stringify(stringEntries), "utf8");
  }
  // For each nested entry, create directory and recurse
  for (const key in nestedEntries) {
    const dirPath = join(basePath, key);
    mkdirSync(dirPath, { recursive: true });
    createDirectoryStructure(nestedEntries[key], filename, dirPath);
  }
}

readdir(i18n, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach((file) => {
    console.log("\n\nParsing file: " + file);

    const loc = {};
    const content = readFileSync(join(i18n, file), "utf8");
    const terms = JSON.parse(content);
    Object.keys(terms).forEach((key) => {
      const parts = key.split("_");
      console.log(parts);
      const obj = parts.reduce((acc, part, index) => {
        if (index === parts.length - 1) {
          return acc;
        }
        acc[part] ??= {};
        return acc[part];
      }, loc);

      obj[parts[parts.length - 1]] = terms[key];
    });

    createDirectoryStructure(loc, file, generated);
  });
});
