import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = path.join(__dirname, '..', 'public', 'vs');

try {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log('Successfully copied local monaco-editor resources to public/vs');
  } else {
    console.warn('Monaco editor source directory not found. Please run npm install first.');
  }
} catch (error) {
  console.error('Failed to copy monaco-editor resources:', error);
}
