import {decode, encode} from 'iconv-lite'
import {SmartBuffer} from 'smart-buffer'
import {CpxVersion} from './enums'
import {writeFixedString} from './func'
import {ScxFile} from './scx-file'

export class CpxFile {
  private signature: Buffer
  private unknownInt32s: number[] = []
  private campaignName: string
  private scenarioNames: string[] = []
  private scenarioNamesWithExtension: string[] = []
  private scenarios: ScxFile[] = []

  constructor(src: Buffer, from = 'gbk', private to = 'utf8') {
    const buffer = SmartBuffer.fromBuffer(src)
    this.signature = buffer.readBuffer(4)
    if (this.getVersion() === CpxVersion.CpxVersion2) {
      const num = buffer.readInt32LE()
      for (let i = 0; i <= num; i++) {
        this.unknownInt32s.push(buffer.readInt32LE())
      }
    }
    this.campaignName = decode(buffer.readBuffer(256), from)
    const num2 = buffer.readInt32LE() - 1
    for (let i = 0; i <= num2; i++) {
      const count = buffer.readInt32LE()
      const num3 = buffer.readInt32LE()
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          this.scenarioNames.push(decode(buffer.readBuffer(255), from))
          this.scenarioNamesWithExtension.push(decode(buffer.readBuffer(257), from))
          break
        case CpxVersion.CpxVersion2: {
          let count2 = buffer.readInt16LE()
          buffer.readInt16LE()
          this.scenarioNames.push(decode(buffer.readBuffer(count2), from))
          count2 = buffer.readInt16LE()
          this.scenarioNamesWithExtension.push(decode(buffer.readBuffer(count2), from))
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

  public getBuffer(): Buffer {
    const buffer = SmartBuffer.fromSize(10 * 1024 * 1024)
    const queue = []
    buffer.writeBuffer(this.signature)
    if (this.getVersion() === CpxVersion.CpxVersion2) {
      buffer.writeInt32BE(this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        buffer.writeInt32BE(unknownInt32)
      }
    }
    buffer.writeBuffer(writeFixedString(this.campaignName, 256, this.to))
    buffer.writeInt32BE(this.scenarios.length)
    this.scenarios.forEach((scenario, i) => {
      const scxFile = scenario.getBuffer()
      buffer.writeInt32BE(scxFile.length)
      queue.push(buffer.writeOffset)
      buffer.writeInt32BE(0)
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          buffer.writeBuffer(writeFixedString(this.scenarioNames[i], 255, this.to))
          buffer.writeBuffer(writeFixedString(this.scenarioNamesWithExtension[i], 257, this.to))
          break
        case CpxVersion.CpxVersion2: {
          const name = encode(this.scenarioNames[i], this.to)
          buffer.writeInt16BE(name.length)
          buffer.writeInt16BE(2656)
          buffer.writeBuffer(name)
          const nameWithExt = encode(this.scenarioNamesWithExtension[i], this.to)
          buffer.writeInt16BE(nameWithExt.length)
          buffer.writeInt16BE(2656)
          buffer.writeBuffer(nameWithExt)
          break
        }
        //no default
      }
    })
    for (let i = 0; i <= this.scenarios.length - 1; i++) {
      const pos = buffer.writeOffset
      buffer.writeOffset = queue.unshift()
      buffer.writeInt32BE(pos)
      buffer.writeOffset = pos
      buffer.writeBuffer(this.scenarios[i].getBuffer())
    }

    return buffer.toBuffer()
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
