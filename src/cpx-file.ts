import {SmartBuffer} from 'smart-buffer'
import {CpxVersion} from './enums'
import {convert, FakeEncoding} from './func'
import {ScxFile} from './scx-file'

export class CpxFile {
  public fileName: string
  private encoding = new FakeEncoding()
  private signature: Buffer
  private unknownInt32s: number[] = []
  private campaignNameBuffer: Buffer
  private scenarioNames: Buffer[] = []
  private scenarioNamesWithExtension: Buffer[] = []
  private scenarios: ScxFile[] = []

  public get campaignName(): string {
    return this.encoding.getString(this.campaignNameBuffer)
  }

  public get scenarioCount(): number {
    return this.scenarios.length
  }

  constructor(buffer: SmartBuffer) {
    this.signature = buffer.readBuffer(4)
    if (this.getVersion() === CpxVersion.CpxVersion2) {
      const num = buffer.readInt32BE()
      for (let i = 0; i <= num; i++) {
        this.unknownInt32s.push(buffer.readInt32BE())
      }
    }
    this.campaignNameBuffer = buffer.readBuffer(256)
    const num2 = buffer.readInt32BE() - 1
    for (let i = 0; i <= num2; i++) {
      const count = buffer.readInt32BE()
      const num3 = buffer.readInt32BE()
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          this.scenarioNames.push(buffer.readBuffer(255))
          this.scenarioNamesWithExtension.push(buffer.readBuffer(257))
          break
        case CpxVersion.CpxVersion2: {
          let count2 = buffer.readInt16BE()
          buffer.readInt16BE()
          this.scenarioNames.push(buffer.readBuffer(count2))
          count2 = buffer.readInt16BE()
          this.scenarioNamesWithExtension.push(buffer.readBuffer(count2))
          break
        }
        // no default
      }
      const position = buffer.readOffset
      buffer.readOffset = num3
      this.scenarios.push(new ScxFile(buffer.readBuffer(count)))
      buffer.readOffset = position
    }
  }

  public async getStream(): Promise<Buffer> {
    const buffer = SmartBuffer.fromSize(10 * 1024 * 1024)
    const queue = []
    buffer.writeBuffer(this.signature)
    if (this.getVersion() === CpxVersion.CpxVersion2) {
      buffer.writeInt32BE(this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        buffer.writeInt32BE(unknownInt32)
      }
    }
    buffer.writeString(this.campaignName)
    buffer.writeInt32BE(this.scenarios.length)
    for (let i = 0; i <= this.scenarios.length - 1; i++) {
      const scxFile = await this.scenarios[i].getBytes()
      buffer.writeInt32BE(scxFile.length)
      queue.push(buffer.writeOffset)
      buffer.writeInt32BE(0)
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          buffer.writeBuffer(this.scenarioNames[i])
          buffer.writeBuffer(this.scenarioNamesWithExtension[i])
          break
        case CpxVersion.CpxVersion2:
          buffer.writeInt16BE(this.scenarioNames[i].length)
          buffer.writeInt16BE(2656)
          buffer.writeBuffer(this.scenarioNames[i])
          buffer.writeInt16BE(this.scenarioNamesWithExtension[i].length)
          buffer.writeInt16BE(2656)
          buffer.writeBuffer(this.scenarioNamesWithExtension[i])
          break
        //no default
      }
    }
    for (let i = 0; i <= this.scenarios.length - 1; i++) {
      const pos = buffer.writeOffset
      buffer.writeOffset = queue.unshift()
      buffer.writeInt32BE(pos)
      buffer.writeOffset = pos
      buffer.writeBuffer(await this.scenarios[i].getBytes())
    }

    return buffer.toBuffer()
  }

  public transcode() {
    this.campaignNameBuffer = this.transcodeBytesFixed(this.campaignNameBuffer)
    for (let i = 0; i <= this.scenarios.length; i++) {
      this.scenarioNames[i] = this.transcodeBytesFixed(this.scenarioNames[i])
      this.scenarioNamesWithExtension[i] = this.transcodeBytesFixed(this.scenarioNamesWithExtension[i])
      this.scenarios[i].transcode()
    }
  }

  private transcodeBytesFixed(buffer: Buffer, from = 'gbk', to = 'utf8'): Buffer {
    const length = buffer.length
    const newBuf = Buffer.alloc(length)
    newBuf.copy(convert(buffer, from, to))
    return newBuf
  }

  private getVersion(): CpxVersion {
    switch (this.signature[0]) {
      case 49:
        return CpxVersion.CpxVersion1
      case 50:
        return CpxVersion.CpxVersion2
      default:
        return CpxVersion.Unknown
    }
  }
}
