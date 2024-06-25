import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Find, read, and parse the package.json file.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getPackageJson() {
  const file = await findPackageJson();
  const parsed = JSON.parse(file);

  return parsed;
}

/**
 * Traverse folder tree upwards until we find a package.json.
 * @returns {Promise<string>} The contents of the package.json file.
 */
async function findPackageJson() {
  let currentDir = import.meta.dirname;

  while (currentDir !== "") {
    const path = join(currentDir, "package.json");

    try {
      return await readFile(path, { encoding: "utf-8" });
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    currentDir = join(...currentDir.split(/[\\\/]/).slice(0, -1));
  }

  throw Error(`No package.json file found in "${import.meta.dirname} or any of its parent folders."`);
}
