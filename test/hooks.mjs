import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const MOCK = pathToFileURL(join(here, "mock-blobs.mjs")).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@netlify/blobs") return { url: MOCK, shortCircuit: true };
  return nextResolve(specifier, context);
}
