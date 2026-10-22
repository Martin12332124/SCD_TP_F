import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendPath = path.resolve(repoRoot, '..', 'SCD_TP_B', 'index.js');

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
  console.log('==> Levantando backend de referencia para la verificación de integración');
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

    console.log('==> Backend disponible, ejecutando verificación del frontend');
    const verifier = spawn(process.execPath, ['test-verificacion.js'], {
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
