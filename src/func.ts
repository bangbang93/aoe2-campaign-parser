import * as iconv from 'iconv-lite'

export function convert(buf: Buffer, from = 'gbk', to = 'utf8'): Buffer {
  return iconv.encode(iconv.decode(buf, from), to)
}

export function writeFixedString(str: string, length: number, encoding = 'utf8'): Buffer {
  const buffer = Buffer.alloc(length)
  iconv.encode(str, encoding).copy(buffer)
  return buffer
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
