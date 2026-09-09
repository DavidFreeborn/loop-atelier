/** Expand test files explicitly for Node 20 and Windows shells. */
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../tests/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.test.mjs')).sort()
  .map(name => fileURLToPath(new URL(name, directory)));
if (!files.length) throw new Error('No test files found.');
const child = spawn(process.execPath, ['--test', ...process.argv.slice(2), ...files], { cwd: root, stdio: 'inherit', windowsHide: true });
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
