export class StreamingBuffer {
  private chunks: Buffer[] = [];
  push(chunk: Buffer): void { this.chunks.push(chunk); }
  consume(): Buffer { return Buffer.concat(this.chunks.splice(0)); }
}
