import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import net from 'net';  // ADD THIS

// ADD THIS FUNCTION
function waitForPort(port: number, retries = 30, delay = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const socket = net.createConnection(port, '127.0.0.1');
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => {
        socket.destroy();
        if (++attempts >= retries) return reject(new Error(`Port ${port} not ready`));
        setTimeout(check, delay);
      });
    };
    check();
  });
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'express-server',
        async configureServer() {  // ADD async
          console.log('[Express Plugin] Spawning backend server on port 3001...');
          const child = spawn('npx', ['tsx', './backend/src/server.ts'], {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PORT: '3001', NODE_ENV: 'development' }
          });
          process.on('exit', () => child.kill());

          await waitForPort(3001);  // ADD THIS — waits before Vite starts proxying
          console.log('[Express Plugin] Backend ready ✓');
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',  // CHANGED: localhost → 127.0.0.1
          changeOrigin: true,
          configure: (proxy) => {           // ADD THIS error handler
            proxy.on('error', (err, _req, res) => {
              if ((err as any).code === 'ECONNREFUSED') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend starting, please retry' }));
              }
            });
          },
        }
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});