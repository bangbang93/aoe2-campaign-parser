import {decode, encode} from 'iconv-lite'
import {SmartBuffer} from 'smart-buffer'

export function writeStringFixed(buffer: SmartBuffer, str: string, length: number, encoding = 'utf8'): Buffer {
  const buf = Buffer.alloc(length)
  encode(str, encoding).copy(buf)
  buffer.writeBuffer(buf)
  return buf
}

export function readStringFixed(buffer: SmartBuffer, length: number, encoding = 'gbk'): string {
  return decode(buffer.readBuffer(length), encoding).replace(/\0/g, '').trim()
}

export function writeString32(buffer: SmartBuffer, s: string, encoding = 'utf8'): Buffer {
  const buf = encode(s, encoding)
  buffer.writeInt32LE(buf.length)
  buffer.writeBuffer(buf)
  return buf
}

export function readString32(buffer: SmartBuffer, encoding = 'gbk'): string {
  return decode(buffer.readBuffer(buffer.readInt32LE()), encoding).replace(/\0/g, '').trim()
}

export function writeString16(buffer: SmartBuffer, s: string, encoding = 'utf8'): Buffer {
  const buf = encode(s, encoding)
  buffer.writeInt16LE(buf.length)
  buffer.writeBuffer(buf)
  return buf
}

export function readString16(buffer: SmartBuffer, encoding = 'gbk'): string {
  return decode(buffer.readBuffer(buffer.readInt16LE()), encoding).replace(/\0/g, '').trim()
}
