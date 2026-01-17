import test from 'node:test';
import assert from 'node:assert';
import Client from '../../lib/Client.js';
import argv from '../../lib/argv.js';
import { Buffer } from 'node:buffer';

/**
 * Helper to create OSC strings with 4-byte padding
 */
function oscString(str) {
  const buf = Buffer.from(str + '\0');
  const padLen = (4 - (buf.length % 4)) % 4;
  return Buffer.concat([buf, Buffer.alloc(padLen, 0)]);
}

/**
 * Helper to create a /status packet
 */
function createStatusPacket(state, ip, name) {
  return Buffer.concat([
    oscString('/status'),
    oscString(',sss'),
    oscString(state),
    oscString(ip),
    oscString(name)
  ]);
}

/**
 * Helper to create a /xinfo packet
 */
function createXInfoPacket(ip, name, model, version) {
  return Buffer.concat([
    oscString('/xinfo'),
    oscString(',ssss'),
    oscString(ip),
    oscString(name),
    oscString(model),
    oscString(version)
  ]);
}

test('Client.sendDownstream rewriting logic', async (t) => {
  const mockServer = {
    address: '10.0.0.1' // The "Proxy IP"
  };

  const client = new Client({
    server: mockServer,
    upstreamAddress: '127.0.0.1' // Needed for constructor
  });

  // Clean up the socket created by Client constructor
  client.destroy();

  await t.test('rewrites /status packet with proxy IP', () => {
    argv.disableStatusRewrite = false;
    argv.name = 'Proxy-Mixer';
    
    const originalPacket = createStatusPacket('active', '192.168.1.100', 'Real-X32');
    const processedPacket = client.sendDownstream(originalPacket);

    // Should contain Proxy IP (10.0.0.1) and Proxy Name (Proxy-Mixer)
    const processedString = processedPacket.toString();
    assert.ok(processedString.includes('10.0.0.1'), 'Packet should contain proxy IP');
    assert.ok(processedString.includes('Proxy-Mixer'), 'Packet should contain proxy name');
    assert.ok(!processedString.includes('192.168.1.100'), 'Packet should NOT contain original IP');
  });

  await t.test('rewrites /xinfo packet with proxy info', () => {
    argv.disableStatusRewrite = false;
    argv.name = 'Proxy-X32';
    argv.model = 'X32-Custom';

    const originalPacket = createXInfoPacket('192.168.1.100', 'Real-X32', 'X32R', '4.06');
    const processedPacket = client.sendDownstream(originalPacket);

    const processedString = processedPacket.toString();
    assert.ok(processedString.includes('10.0.0.1'), 'Packet should contain proxy IP');
    assert.ok(processedString.includes('Proxy-X32'), 'Packet should contain proxy name');
    assert.ok(processedString.includes('X32-Custom'), 'Packet should contain proxy model');
  });

  await t.test('leaves non-status packets untouched', () => {
    const faderPacket = Buffer.concat([
      oscString('/ch/01/mix/fader'),
      oscString(',f'),
      Buffer.from([0x3f, 0x00, 0x00, 0x00]) // 0.5 float
    ]);

    const processedPacket = client.sendDownstream(faderPacket);
    assert.deepStrictEqual(processedPacket, faderPacket, 'Fader packet should be unchanged');
  });

  await t.test('respects disableStatusRewrite flag', () => {
    argv.disableStatusRewrite = true;
    const originalPacket = createStatusPacket('active', '192.168.1.100', 'Real-X32');
    const processedPacket = client.sendDownstream(originalPacket);

    assert.deepStrictEqual(processedPacket, originalPacket, 'Packet should NOT be rewritten when disabled');
  });
});
