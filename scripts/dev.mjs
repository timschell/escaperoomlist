// Runs the API server (port 3000) and the Vite dev server (port 5173) together.
// Vite proxies /api and /uploads to the backend (see client/vite.config.ts).
import { spawn } from 'node:child_process';

const procs = [
  { name: 'server', cmd: 'npm', args: ['--prefix', 'server', 'run', 'dev'], color: '\x1b[35m' },
  { name: 'client', cmd: 'npm', args: ['--prefix', 'client', 'run', 'dev'], color: '\x1b[36m' },
];

const children = procs.map(({ name, cmd, args, color }) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  const tag = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    stream.setEncoding('utf8');
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(tag + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  return child;
});

const shutdown = () => {
  for (const c of children) c.kill('SIGINT');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\nDev läuft:  App → http://localhost:5173   API → http://localhost:3000\n');
