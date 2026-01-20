import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Set up arguments for the tests
process.argv.push('--target', '127.0.0.1');
process.argv.push('--udp-client-timeout', '100');
process.argv.push('--disable-subscription-pool');

const testFile = resolve(__dirname, './integration/udp-proxy.test.js');

const stream = run({
  files: [testFile],
});

stream.on('test:fail', () => {
  process.exitCode = 1;
});

stream.compose(new spec()).pipe(process.stdout);