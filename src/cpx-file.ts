import {decode, encode} from 'iconv-lite'
import {SmartBuffer} from 'smart-buffer'
import {CpxVersion} from './enums'
import {readString32, readStringFixed, writeStringFixed} from './func'
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
    this.campaignName = readStringFixed(buffer, 256, from)
    const scenarioCount = buffer.readInt32LE()
    for (let i = 0; i < scenarioCount; i++) {
      const bufferLength = buffer.readInt32LE()
      const startPosition = buffer.readInt32LE()
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          this.scenarioNames.push(readStringFixed(buffer, 255, from))
          this.scenarioNamesWithExtension.push(readStringFixed(buffer, 257, from))
          break
        case CpxVersion.CpxVersion2: {
          let stringLength = buffer.readInt16LE()
          buffer.readInt16LE()
          this.scenarioNames.push(readString32(buffer, from))
          stringLength = buffer.readInt16LE()
          buffer.readInt16LE()
          this.scenarioNamesWithExtension.push(decode(buffer.readBuffer(stringLength), from))
          break
        }
        // no default
      }
      const position = buffer.readOffset
      buffer.readOffset = startPosition
      const scx = new ScxFile(buffer.readBuffer(bufferLength), from, this.to)
      this.scenarios.push(scx)
      buffer.readOffset = position
    }
  }

  public getBuffer(): Buffer {
    const buffer = SmartBuffer.fromSize(10 * 1024 * 1024)
    const queue = []
    buffer.writeBuffer(this.signature)
    if (this.getVersion() === CpxVersion.CpxVersion2) {
      buffer.writeInt32LE(this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        buffer.writeInt32LE(unknownInt32)
      }
    }
    writeStringFixed(buffer, this.campaignName, 256, this.to)
    buffer.writeInt32LE(this.scenarios.length)
    this.scenarios.forEach((scenario, i) => {
      const scxFile = scenario.getBuffer()
      buffer.writeInt32LE(scxFile.length)
      queue.push(buffer.writeOffset)
      buffer.writeInt32LE(0)
      switch (this.getVersion()) {
        case CpxVersion.CpxVersion1:
          writeStringFixed(buffer, this.scenarioNames[i], 255, this.to)
          writeStringFixed(buffer, this.scenarioNamesWithExtension[i], 257, this.to)
          break
        case CpxVersion.CpxVersion2: {
          const name = encode(this.scenarioNames[i], this.to)
          buffer.writeInt16LE(name.length)
          buffer.writeInt16LE(2656)
          buffer.writeBuffer(name)
          const nameWithExt = encode(this.scenarioNamesWithExtension[i], this.to)
          buffer.writeInt16LE(nameWithExt.length)
          buffer.writeInt16LE(2656)
          buffer.writeBuffer(nameWithExt)
          break
        }
        //no default
      }
    })
    for (const scenario of this.scenarios) {
      const pos = buffer.writeOffset
      buffer.writeInt32LE(pos, queue.shift())
      buffer.writeBuffer(scenario.getBuffer())
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
