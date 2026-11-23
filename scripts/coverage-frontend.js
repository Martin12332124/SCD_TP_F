import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendDirectory = process.env.BACKEND_DIRECTORY ?? path.resolve(repoRoot, '..', 'SCD_TP_B');
const backendPath = path.resolve(repoRoot, backendDirectory, 'index.js');

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status < 500) {
        return true;
      }
    } catch {
      // Espera a que el backend levante.
    }

    await delay(500);
  }

  return false;
}

async function main() {
  console.log('==> Levantando backend para la cobertura del frontend');
  const backend = spawn(process.execPath, [backendPath], {
    cwd: repoRoot,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_ENV: 'test' }
  });

  try {
    const ready = await waitForServer('http://localhost:3000');
    if (!ready) {
      throw new Error('El backend no respondió en http://localhost:3000 dentro del tiempo esperado.');
    }

    console.log('==> Backend disponible, ejecutando cobertura del frontend');
    const c8Bin = path.resolve(repoRoot, 'node_modules', 'c8', 'bin', 'c8.js');
    const verifier = spawn(process.execPath, [c8Bin, '--reporter=text', '--reporter=lcov', '--reporter=html', 'node', 'test-verificacion.js'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env
    });

    const code = await new Promise((resolve) => {
      verifier.on('exit', (exitCode) => resolve(exitCode ?? 1));
      verifier.on('error', () => resolve(1));
    });

    if (code !== 0) {
      process.exit(code);
    }
  } finally {
    if (!backend.killed) {
      backend.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
