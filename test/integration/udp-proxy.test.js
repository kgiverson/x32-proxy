import test from 'node:test';
import assert from 'node:assert';
import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import UdpServer from '../../lib/UdpServer.js';

/**
 * Helper to create OSC strings with 4-byte padding
 */
function oscString(str) {
  const buf = Buffer.from(str + '\0');
  const padLen = (4 - (buf.length % 4)) % 4;
  return Buffer.concat([buf, Buffer.alloc(padLen, 0)]);
}

test('UDP Proxy Integration', async (t) => {
  console.log('Starting UDP Proxy Integration test...');
  const MIXER_PORT = 10025;
  const PROXY_PORT = 10026;
  const BIND_ADDR = '127.0.0.1';

  const { MockMixer } = await import('../mock-mixer.js');
  const mixer = new MockMixer(MIXER_PORT, BIND_ADDR);
  await mixer.start();
  console.log('Mixer started');

  const proxy = new UdpServer({
    address: BIND_ADDR,
    port: PROXY_PORT,
    target: BIND_ADDR,
    targetPort: MIXER_PORT,
    disableSubscriptionPool: true,
    udpClientTimeout: 100 // Fast timeout for tests
  });

  try {
    console.log('Waiting for proxy listening event...');
    // Wait for proxy to be listening (check if it already is first)
    if (!proxy.listening) {
      await new Promise(resolve => proxy.addEventListener('listening', resolve, { once: true }));
    }
    console.log('Proxy is listening');

    await t.test('proxies /status and rewrites IP', async () => {
      console.log('Running subtest: proxies /status and rewrites IP');
      const client = dgram.createSocket('udp4');
      const statusRequest = oscString('/status');

      const responsePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for proxy response')), 2000);
        client.on('message', (msg) => {
          console.log('Client received message from proxy');
          clearTimeout(timeout);
          resolve(msg);
        });
      });

      console.log('Sending /status request to proxy...');
      client.send(statusRequest, PROXY_PORT, BIND_ADDR);

      const response = await responsePromise;
      const responseString = response.toString();

      console.log('Received response from proxy:', responseString);
      
      assert.ok(responseString.includes('/status'), 'Response should be a /status message');
      assert.ok(responseString.includes(BIND_ADDR), 'Response should contain the proxy address');
      
      client.close();
      console.log('Subtest finished');
    });
  } catch (err) {
    console.error('Test error:', err);
    throw err;
  } finally {
    // Cleanup
    console.log('Cleaning up integration test...');
    await mixer.stop();
    proxy.server.close();
    console.log('Cleanup complete');
  }
});
