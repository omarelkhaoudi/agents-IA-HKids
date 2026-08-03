import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(__filename), '..');
const sourceDirectory = path.join(apiRoot, 'src');
const outputDirectory = path.join(apiRoot, 'dist');
const entrypoint = path.join(sourceDirectory, 'index.js');

await stat(entrypoint);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

console.info(`API production build prepared at ${path.relative(apiRoot, outputDirectory)}`);
