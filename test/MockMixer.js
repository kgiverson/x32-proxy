import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';

export default class MockMixer {
  constructor(port = 10023, address = '127.0.0.1') {
    this.port = port;
    this.address = address;
    this.socket = dgram.createSocket('udp4');
    this.running = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.socket.on('error', (err) => {
        console.error('[MockMixer] Server error', err);
        this.socket.close();
        this.running = false;
        reject(err);
      });

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });

      this.socket.bind(this.port, this.address, () => {
        this.running = true;
        const addr = this.socket.address();
        console.log(`[MockMixer] Listening on ${addr.address}:${addr.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.running) return resolve();
      this.socket.close(() => {
        this.running = false;
        console.log('[MockMixer] Stopped');
        resolve();
      });
    });
  }

  handleMessage(msg, rinfo) {
    const msgString = msg.toString();
    console.log(`[MockMixer] Received: ${msgString} from ${rinfo.address}:${rinfo.port}`);

    if (msgString.startsWith('/info')) {
      this.sendInfo(rinfo);
    } else if (msgString.startsWith('/status')) {
      this.sendStatus(rinfo);
    } else if (msgString.startsWith('/xinfo')) {
        this.sendXInfo(rinfo);
    } else {
        // Echo back for generic testing
        // this.socket.send(msg, rinfo.port, rinfo.address);
    }
  }

  /**
   * Constructs an OSC string argument with proper padding (null-terminated, 4-byte aligned)
   */
  oscString(str) {
    const buf = Buffer.from(str + '\0');
    const padLen = (4 - (buf.length % 4)) % 4;
    const padding = Buffer.alloc(padLen, 0);
    return Buffer.concat([buf, padding]);
  }

  sendInfo(rinfo) {
    // Response format: /info ,ssss V2.05 osc-server X32 2.10
    const address = this.oscString('/info');
    const typeTags = this.oscString(',ssss');
    const arg1 = this.oscString('V2.05');
    const arg2 = this.oscString('osc-server');
    const arg3 = this.oscString('X32');
    const arg4 = this.oscString('2.10');

    const packet = Buffer.concat([address, typeTags, arg1, arg2, arg3, arg4]);
    this.socket.send(packet, rinfo.port, rinfo.address);
  }

  sendStatus(rinfo) {
    // Response format: /status ,sss active 192.168.0.64 osc-server
    const address = this.oscString('/status');
    const typeTags = this.oscString(',sss');
    const arg1 = this.oscString('active');
    const arg2 = this.oscString(this.address); // Use our own address as the "mixer IP"
    const arg3 = this.oscString('osc-server');

    const packet = Buffer.concat([address, typeTags, arg1, arg2, arg3]);
    this.socket.send(packet, rinfo.port, rinfo.address);
  }

  sendXInfo(rinfo) {
      // Response format: /xinfo ,ssss 192.168.0.64 X32-00-00-00 X32 2.10
      const address = this.oscString('/xinfo');
      const typeTags = this.oscString(',ssss');
      const arg1 = this.oscString(this.address);
      const arg2 = this.oscString('X32-Mock-01');
      const arg3 = this.oscString('X32');
      const arg4 = this.oscString('2.10');

      const packet = Buffer.concat([address, typeTags, arg1, arg2, arg3, arg4]);
      this.socket.send(packet, rinfo.port, rinfo.address);
  }
}

// Allow standalone execution
if (process.argv[1] === import.meta.filename) {
  const mixer = new MockMixer();
  mixer.start();
}