import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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

/**
 * Inicia sesión con el usuario de CI. Si el backend todavía no tiene login (responde 404),
 * devuelve null y la verificación sigue sin token: así el script sirve antes y después de
 * integrar el login en la rama dev del backend.
 */
async function obtenerToken(usuario, contrasena, llaveApi) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    // x-api-key: el API gateway del backend la exige en todo /api, también en el login.
    // Un backend anterior al gateway simplemente la ignora.
    headers: { 'Content-Type': 'application/json', 'x-api-key': llaveApi },
    body: JSON.stringify({ usuario, contrasena })
  });
  if (res.status === 404) return null;
  const datos = await res.json();
  if (!datos.ok) throw new Error(`No se pudo iniciar sesión en el backend: ${datos.error}`);
  return datos.token;
}

async function main() {
  console.log('==> Levantando backend de referencia para la verificación de integración');
  // Credenciales desechables, generadas en cada corrida: no hay secretos en el repo.
  const usuarioCi = 'integracion';
  const contrasenaCi = randomBytes(18).toString('base64url');
  // Llave de aplicación desechable para el API gateway (API_KEYS del backend), también por corrida.
  const llaveApiCi = randomBytes(24).toString('base64url');
  const backend = spawn(process.execPath, [backendPath], {
    cwd: repoRoot,
    stdio: ['ignore', 'inherit', 'inherit'],
    // DB_PATH=':memory:' hace que el backend use una base SQLite temporal: la prueba
    // parte siempre con las 10 mesas libres y no escribe en data/restaurante.db.
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      JWT_SECRET: randomBytes(32).toString('base64'),
      USUARIOS_INICIALES: `${usuarioCi}:${contrasenaCi}`,
      API_KEYS: `integracion:${llaveApiCi}`
    }
  });

  try {
    const ready = await waitForServer('http://localhost:3000');
    if (!ready) {
      throw new Error('El backend no respondió en http://localhost:3000 dentro del tiempo esperado.');
    }

    const token = await obtenerToken(usuarioCi, contrasenaCi, llaveApiCi);
    console.log(`==> Backend disponible (${token ? 'con' : 'sin'} login), verificando el frontend`);
    const verifier = spawn(process.execPath, ['test-verificacion.js'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, BACKEND_TOKEN: token ?? '', BACKEND_API_KEY: llaveApiCi }
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
