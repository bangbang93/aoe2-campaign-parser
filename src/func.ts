import * as iconv from 'iconv-lite'
import {Writable} from 'stream'

export function writeInt32(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32BE(n, 0)
  stream.write(buffer)
  return stream
}

export function writeInt16(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(2)
  buffer.writeInt16BE(n, 0)
  stream.write(buffer)
  return stream
}

export function writeByte(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(1)
  buffer.writeInt8(n, 0)
  stream.write(buffer)
  return stream
}

export function writeInt64(stream: Writable, n: bigint): Writable {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(n, 0)
  stream.write(buffer)
  return stream
}

export function writeUInt16(stream: Writable, n: number): Writable {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(n, 0)
  stream.write(buffer)
  return stream
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
