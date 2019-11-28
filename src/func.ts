import * as iconv from 'iconv-lite'
import {Readable, Writable} from 'stream'

export function readInt32(stream: Readable): number {
  return (stream.read(4) as Buffer).readInt32BE(0)
}

export function writeInt32(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32BE(n, 0)
  stream.write(buffer)
  return stream
}

export function readInt16(stream: Readable): number {
  return (stream.read(4) as Buffer).readInt16BE(0)
}

export function writeInt16(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(2)
  buffer.writeInt16BE(n, 0)
  stream.write(buffer)
  return stream
}

export function readByte(stream: Readable): number {
  return (stream.read(1) as Buffer)[0]
}

export function writeByte(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(1)
  buffer.writeInt8(n, 0)
  stream.write(buffer)
  return stream
}

export function readInt64(stream: Readable): bigint {
  return (stream.read(8) as Buffer).readBigInt64BE()
}

export function writeInt64(stream: Writable, n: bigint): Writable {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(n, 0)
  stream.write(buffer)
  return stream
}

export function readUInt16(stream: Readable): number {
  return (stream.read(2) as Buffer).readUInt16BE(0)
}

export function writeUInt16(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(n, 0)
  stream.write(buffer)
  return stream
}

export function readFloat(stream: Readable): number {
  return (stream.read(4) as Buffer).readFloatBE(0)
}

export function writeFloat(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(4)
  buffer.writeFloatBE(n, 0)
  stream.write(buffer)
  return stream
}

export function convert(buf: Buffer, from = 'gbk', to = 'utf8'): Buffer {
  return iconv.encode(iconv.decode(buf, from), to)
}

export class FakeEncoding {
  public targetEncoding = 'utf8'

  getString(buffer: Buffer): string {
    return buffer.toString(this.targetEncoding)
  }

  getBytes(s: string): Buffer {
    return Buffer.from(s, this.targetEncoding as 'utf8')
  }
}
