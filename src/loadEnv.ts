import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Resolve the project root .env regardless of compiled output location
// When compiled, __dirname will be something like src/dist/src
// So we traverse up to the project root and load .env from there
const possibleRoots = [
  // running ts-node from src
  path.resolve(__dirname, '..'),
  // running compiled from src/dist/src
  path.resolve(__dirname, '../../..'),
  // workspace root fallback
  path.resolve(__dirname, '../..')
];

for (const root of possibleRoots) {
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export {}; // module marker
