import {createWriteStream} from 'fs'
import * as GetStream from 'get-stream'
import {Readable, Writable} from 'stream'
import {createDeflate, createInflate} from 'zlib'
import {AiMapType, EffectField, ScxVersion, VictoryMode} from './enums'
import {
  convert, FakeEncoding, readByte, readFloat, readInt16, readInt32, readInt64, readUInt16, writeByte, writeFloat,
  writeInt16, writeInt32, writeInt64, writeUInt16,
} from './func'
import {BITMAPDIB, Condition, Effect, Player, PlayerMisc, Resource, RGB, Terrain, Trigger, Unit} from './player'
import MemoryStream = require('memorystream')

export class ScxFile {
  public encoding = new FakeEncoding()
  public fileName: string
  public lastSave: number
  public players: Player[] = []
  public bitMapX: number
  public bitMapY: number
  public hasBitmap: number
  public bitmap: BITMAPDIB
  public conquest: bigint
  public relics: bigint
  public explored: bigint
  public allMustMeet: number
  public mode: VictoryMode
  public score: number
  public time: number
  public allTechs: number
  public cameraX: number
  public cameraY: number
  public mapType: AiMapType
  public mapX: number
  public mapY: number
  public map: Terrain[][]
  public resources: Resource[] = []
  public units: Unit[][] = []
  public misc: PlayerMisc[] = []
  public lockTeams: number
  public playerChooseTeams: number
  public randomStartPoints: number
  public maxTeams: number
  public triggers: Trigger[] = []
  public triggerOrder: number[] = []
  public hasAiFile: number
  public needsWorkaround: number
  public workaroundBytes: Buffer
  public aiFiles: Map<Buffer, Buffer> = new Map()
  private version: Buffer
  private instructionBuffer: Buffer
  private playerCount: number
  private formatVersion: number
  private unknownInt32s: number[] = []
  private nextUid: number
  private version2: number
  private originalFilenameBuffer: Buffer
  private stringTableInfos: number[] = []
  private stringInfos: Buffer[] = []

  public get instruction(): string {
    return this.encoding.getString(this.instructionBuffer)
  }

  public set instruction(value: string) {
    this.instructionBuffer = this.encoding.getBytes(value)
  }

  public get originalFilename(): string {
    return this.encoding.getString(this.originalFilenameBuffer)
  }

  public set originalFilename(value: string) {
    this.originalFilenameBuffer = this.encoding.getBytes(value)
  }

  constructor(stream: Readable) {
    this.version = stream.read(4)
    stream.read(4)
    this.formatVersion = readInt32(stream)
    this.lastSave = readInt32(stream)
    this.instructionBuffer = stream.read(readInt32(stream))
    stream.read(4)
    this.playerCount = readInt32(stream)
    if (this.formatVersion === 3) {
      stream.read(8)
      const num = readInt32(stream)
      for (let i = 0; i < num; i++) {
        this.unknownInt32s.push(readInt32(stream))
      }
    }

    const input = createInflate()
    stream.pipe(input)

    this.nextUid = readInt32(input)
    this.version2 = readFloat(input)
    for (let i = 0; i < 16; i++) {
      const player = new Player(this)
      player.name = input.read(256)
      this.players.push(player)
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].stringTableName = readInt32(input)
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].isActive = readInt32(input)
      this.players[i].isHuman = readInt32(input)
      this.players[i].civilization = readInt32(input)
      input.read(4)
    }
    input.read(9)
    this.originalFilenameBuffer = input.read(readInt16(input))
    const num5 = (this.getVersion() >= ScxVersion.Version122) ? 5 : 4
    for (let i = 0; i <= num5; i++) {
      this.stringTableInfos.push(readInt32(input))
    }
    const num6 = (this.getVersion() > ScxVersion.Version122) ? 9 : 8
    for (let i = 0; i <= num6; i++) {
      this.stringInfos.push(input.read(readInt16(input)))
    }
    this.hasBitmap = readInt32(input)
    this.bitMapX = readInt32(input)
    this.bitMapY = readInt32(input)
    input.read(2)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      this.bitmap = new BITMAPDIB()
      this.bitmap.biSize = readInt32(input)
      this.bitmap.biWidth = readInt32(input)
      this.bitmap.biHeight = readInt32(input)
      this.bitmap.biPlanes = readInt16(input)
      this.bitmap.biBitCount = readInt16(input)
      this.bitmap.biCompression = readInt32(input)
      this.bitmap.biSizeImage = readInt32(input)
      this.bitmap.biXPelsPerMeter = readInt32(input)
      this.bitmap.biYPelsPerMeter = readInt32(input)
      this.bitmap.biClrUsed = readInt32(input)
      this.bitmap.biClrImportant = readInt32(input)
    }
    for (let i = 0; i <= 255; i++) {
      const rgb = new RGB()
      rgb.red = readByte(input)
      rgb.green = readByte(input)
      rgb.blue = readByte(input)
      input.read(1)
      this.bitmap.colors.push(rgb)
      this.bitmap.imageData = input.read((~~((this.bitMapX - 1) / 4 + 1) * 4 * this.bitMapY))
    }
    for (let i = 0; i <= 31; i++) {
      input.read(readInt16(input))
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].aiBuffer = input.read(readInt16(input))
    }
    for (let i = 0; i <= 15; i++) {
      input.read(8)
      this.players[i].aiFile = input.read(readInt32(input))
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].personality = readByte(input)
    }
    readInt32(input)
    for (let i = 0; i <= 15; i++) {
      this.players[i].gold = readInt32(input)
      this.players[i].wood = readInt32(input)
      this.players[i].food = readInt32(input)
      this.players[i].stone = readInt32(input)
      this.players[i].orex = readInt32(input)
      readInt32(input)
      if (this.getVersion() > ScxVersion.Version124) {
        this.players[i].playerNumber = readInt32(input)
      }
    }
    readInt32(input)
    this.conquest = readInt64(input)
    this.relics = readInt64(input)
    this.explored = readInt64(input)
    this.allMustMeet = readInt32(input)
    this.mode = readInt32(input)
    this.score = readInt32(input)
    this.time = readInt32(input)
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 15; j++) {
        this.players[i].diplomacies.push(readInt32(input))
      }
    }
    input.read(11524)
    for (let i = 0; i <= 15; i++) {
      this.players[i].alliedVictory = readInt32(input)
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      this.lockTeams = readByte(input)
      this.playerChooseTeams = readByte(input)
      this.randomStartPoints = readByte(input)
      this.maxTeams = readByte(input)
    }
    for (let i = 0; i <= 15; i++) readInt32(input)
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledTechs.push(readInt32(input))
      }
    }
    for (let i = 0; i <= 15; i++) readInt32(input)
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledUnits.push(readInt32(input))
      }
    }
    for (let i = 0; i <= 15; i++) readInt32(input)
    for (let i = 0; i <= 15; i++) {
      const num24 = this.getVersion() >= ScxVersion.Version126 ? 29 : 19
      for (let j = 0; j <= num24; j++) {
        this.players[i].disabledBuildings.push(readInt32(input))
      }
    }
    input.read(8)
    this.allTechs = readInt32(input)
    for (let i = 0; i <= 15; i++) {
      this.players[i].startAge = readInt32(input) - (this.getVersion() >= ScxVersion.Version126 ? 2 : 0)
    }
    readInt32(input)
    this.cameraX = readInt32(input)
    this.cameraY = readInt32(input)
    if (this.getVersion() >= ScxVersion.Version122) {
      this.mapType = readInt32(input)
    }
    if (this.getVersion() > ScxVersion.Version124) {
      input.read(16)
    }
    this.mapX = readInt32(input)
    this.mapY = readInt32(input)
    this.map = []
    for (let i = 0; i <= this.mapX - 1; i++) {
      this.map[i] = []
      for (let j = 0; j <= this.mapY - 1; j++) {
        const terrain = new Terrain()
        terrain.id = readByte(input)
        terrain.elevation = readUInt16(input)
      }
    }
    input.read(4)
    for (let i = 0; i <= 7; i++) {
      const resource = new Resource()
      resource.food = readFloat(input)
      resource.wood = readFloat(input)
      resource.gold = readFloat(input)
      resource.stone = readFloat(input)
      resource.orex = readFloat(input)
      this.resources.push(resource)
      input.read(4)
      if (this.getVersion() >= ScxVersion.Version122) {
        resource.populationLimit = readFloat(input)
      }
    }
    for (let i = 0; i <= 7; i++) {
      const unit = []
      this.units.push(unit)
      const num30 = readInt32(input)
      for (let j = 0; j <= num30 - 1; j++) {
        const e = new Unit()
        e.posX = readFloat(input)
        e.posY = readFloat(input)
        e.posZ = readFloat(input)
        e.id = readInt32(input)
        e.unitId = readInt16(input)
        e.state = readByte(input)
        e.rotation = readFloat(input)
        e.frame = readInt16(input)
        e.garrison = readInt32(input)
        unit.push(e)
      }
    }
    readInt32(input)
    for (let i = 0; i <= 8; i++) {
      const playerMisc = new PlayerMisc(this)
      this.misc.push(playerMisc)
      playerMisc.nameBuffer = input.read(readInt16(input))
      playerMisc.cameraX = readFloat(input)
      playerMisc.cameraY = readFloat(input)
      readInt32(input)
      playerMisc.alliedVictory = readByte(input)
      input.read(2)
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy.push(readByte(input))
      }
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy2.push(readByte(input))
      }
      playerMisc.color = readInt32(input)
      input.read(readFloat(input) === 2 ? 8 : 0)
    }
    input.read(9)
    const num35 = readInt32(input) - 1
    for (let i = 0; i <= num35; i++) {
      const trigger = new Trigger(this)
      trigger.isEnabled = readInt32(input)
      trigger.isLooping = readInt32(input)
      this.triggers.push(trigger)
      input.read(1)
      trigger.isObjective = readByte(input)
      trigger.descriptionOrder = readInt32(input)
      input.read(4)
      trigger.descriptionBuffer = input.read(readInt32(input))
      trigger.nameBuffer = input.read(readInt32(input))
      const num37 = readInt32(input) - 1
      for (let j = 0; j <= num37; j++) {
        const effect = new Effect(this)
        effect.type = readInt32(input)
        trigger.effects.push(effect)
        const num39 = readInt32(input) - 1
        for (let k = 0; k <= num39; k++) {
          effect.fields.push(readInt32(input))
        }
        effect.textBuffer = input.read(readInt32(input))
        effect.soundFileBuffer = input.read(readInt32(input))
        if (effect.fields.length > 4) {
          const num41 = effect.fields[EffectField.NumSelected] - 1
          for (let k = 0; k <= num41; k++) {
            effect.unitIds.push(readInt32(input))
          }
        }
      }
      const num43 = trigger.effects.length - 1
      for (let j = 0; j <= num43; j++) {
        trigger.effectOrder.push(readInt32(input))
      }
      const num45 = readInt32(input) - 1
      for (let j = 0; j <= num45; j++) {
        const condition = new Condition()
        condition.type = readInt32(input)
        trigger.conditions.push(condition)
        const num47 = readInt32(input) - 1
        for (let k = 0; k <= num47; k++) {
          condition.getFields().push(readInt32(input))
        }
      }
      const num49 = trigger.conditions.length - 1
      for (let j = 0; j <= num49; j++) {
        trigger.conditionOrder.push(readInt32(input))
      }
    }
    const num51 = this.triggers.length - 1
    for (let i = 0; i <= num51; i++) {
      this.triggerOrder.push(readInt32(input))
    }
    this.hasAiFile = readInt32(input)
    this.needsWorkaround = readInt32(input)
    if (this.needsWorkaround === 1) {
      this.workaroundBytes = input.read(396)
    }
    if (this.hasAiFile === 1) {
      const num53 = readInt32(input) - 1
      for (let i = 0; i <= num53; i++) {
        this.aiFiles.set(input.read(readInt32(input)), input.read(readInt32(input)))
      }
    }
  }

  public getStream(): Readable {
    const ms = new MemoryStream()
    ms.write(this.version)
    writeInt32(ms, Buffer.byteLength(this.instruction) + 20)
    writeInt32(ms, this.formatVersion)
    writeInt32(ms, this.lastSave)
    this.writeString32(ms, this.instruction)
    writeInt32(ms, 0)
    writeInt32(ms, this.playerCount)
    if (this.formatVersion === 3) {
      writeInt32(ms, 1000)
      writeInt32(ms, 1)
      writeInt32(ms, this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        writeInt32(ms, unknownInt32)
      }
    }
    const dest = createDeflate().pipe(ms)
    writeInt32(dest, this.nextUid)
    writeFloat(dest, this.version2)
    for (const player of this.players) {
      dest.write(this.getBytesFixed(player.name, 256))
    }
    for (const player of this.players) {
      writeInt32(dest, player.stringTableName)
    }
    for (const player of this.players) {
      writeInt32(dest, player.isActive)
      writeInt32(dest, player.isHuman)
      writeInt32(dest, player.civilization)
      writeInt32(dest, 4)
    }
    writeInt32(dest, 1)
    writeInt16(dest, 0)
    writeFloat(dest, -1)
    this.writeString16(dest, this.originalFilename)
    for (const stringTableInfo of this.stringTableInfos) {
      writeInt32(dest, stringTableInfo)
    }
    for (const stringInfo of this.stringInfos) {
      writeInt16(dest, stringInfo.length)
      dest.write(stringInfo)
    }
    writeInt32(dest, this.hasBitmap)
    writeInt32(dest, this.bitMapX)
    writeInt32(dest, this.bitMapY)
    writeInt16(dest, 1)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      writeInt32(dest, this.bitmap.biSize)
      writeInt32(dest, this.bitmap.biWidth)
      writeInt32(dest, this.bitmap.biHeight)
      writeInt16(dest, this.bitmap.biPlanes)
      writeInt16(dest, this.bitmap.biBitCount)
      writeInt32(dest, this.bitmap.biCompression)
      writeInt32(dest, this.bitmap.biSizeImage)
      writeInt32(dest, this.bitmap.biXPelsPerMeter)
      writeInt32(dest, this.bitmap.biYPelsPerMeter)
      writeInt32(dest, this.bitmap.biClrUsed)
      writeInt32(dest, this.bitmap.biClrImportant)
      for (const color of this.bitmap.colors) {
        dest.write(color.red)
        dest.write(color.green)
        dest.write(color.blue)
        dest.write(0)
      }
      dest.write(this.bitmap.imageData)
    }
    for (let i = 0; i <= 31; i++) {
      writeInt16(dest, 0)
    }
    for (const player of this.players) {
      this.writeString16(dest, player.ai)
    }
    for (const player of this.players) {
      writeInt64(dest, 0n)
      writeInt32(dest, player.aiFile.length)
      dest.write(player.aiFile)
    }
    for (const player of this.players) {
      dest.write(player.personality)
    }
    writeInt32(dest, -99)
    for (const player of this.players) {
      writeInt32(dest, player.gold)
      writeInt32(dest, player.wood)
      writeInt32(dest, player.food)
      writeInt32(dest, player.stone)
      writeInt32(dest, player.orex)
      writeInt32(dest, 0)
      if (this.getVersion() > ScxVersion.Version124) {
        writeInt32(dest, player.playerNumber)
      }
    }
    writeInt32(dest, -99)
    writeInt64(dest, this.conquest)
    writeInt64(dest, this.relics)
    writeInt64(dest, this.explored)
    writeInt32(dest, this.allMustMeet)
    writeInt32(dest, this.mode)
    writeInt32(dest, this.score)
    writeInt32(dest, this.time)
    for (const player of this.players) {
      for (const diplomacy of player.diplomacies) {
        writeInt32(dest, diplomacy)
      }
    }
    for (let i = 1; i <= 720; i++) {
      dest.write(Buffer.alloc(16))
    }
    writeInt32(dest, -99)
    for (const player of this.players) {
      writeInt32(dest, player.alliedVictory)
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      dest.write(this.lockTeams)
      dest.write(this.playerChooseTeams)
      dest.write(this.randomStartPoints)
      dest.write(this.maxTeams)
    }
    for (const player of this.players) {
      writeInt32(dest, player.disabledTechs.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledTech of player.disabledTechs) {
        writeInt32(dest, disabledTech)
      }
    }
    for (const player of this.players) {
      writeInt32(dest, player.disabledUnits.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledUnits) {
        writeInt32(dest, disabledUnit)
      }
    }
    for (const player of this.players) {
      writeInt32(dest, player.disabledBuildings.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledBuildings) {
        writeInt32(dest, disabledUnit)
      }
    }
    writeInt64(dest, 0n)
    writeInt32(dest, this.allTechs)
    for (const player of this.players) {
      writeInt32(dest, player.startAge + (this.getVersion() >= ScxVersion.Version126 ? 2 : 0))
    }
    writeInt32(dest, -99)
    writeInt32(dest, this.cameraX)
    writeInt32(dest, this.cameraY)
    if (this.getVersion() >= ScxVersion.Version122) {
      writeInt32(dest, this.mapType)
    }
    if (this.getVersion() >= ScxVersion.Version124) {
      dest.write(Buffer.from(new Array(16).fill(0)))
    }
    writeInt32(dest, this.mapX)
    writeInt32(dest, this.mapY)
    for (let i = 0; i <= this.mapX - 1; i++) {
      for (let j = 0; j <= this.mapY - 1; j++) {
        dest.write(this.map[i][j].id)
        writeUInt16(dest, this.map[i][j].elevation)
      }
    }
    writeInt32(dest, 9)
    for (const resource of this.resources) {
      writeFloat(dest, resource.food)
      writeFloat(dest, resource.wood)
      writeFloat(dest, resource.gold)
      writeFloat(dest, resource.stone)
      writeFloat(dest, resource.orex)
      writeInt32(dest, 0)
      if (this.getVersion() >= ScxVersion.Version122) {
        writeFloat(dest, resource.populationLimit)
      }
    }
    for (const unit of this.units) {
      writeInt32(dest, unit.length)
      for (const e of unit) {
        writeFloat(dest, e.posX)
        writeFloat(dest, e.posY)
        writeFloat(dest, e.posZ)
        writeInt32(dest, e.id)
        writeUInt16(dest, e.unitId)
        writeByte(dest, e.state)
        writeFloat(dest, e.rotation)
        writeInt16(dest, e.frame)
        writeInt32(dest, e.garrison)
      }
    }
    writeInt32(dest, 9)
    for (const playerMisc of this.misc) {
      this.writeString16(dest, playerMisc.name)
      writeFloat(dest, playerMisc.cameraX)
      writeFloat(dest, playerMisc.cameraY)
      writeInt32(dest, 0)
      writeByte(dest, playerMisc.alliedVictory)
      for (const diplomacyB of playerMisc.diplomacy) {
        writeByte(dest, diplomacyB)
      }
      for (const diplomacy2 of playerMisc.diplomacy2) {
        writeInt32(dest, diplomacy2)
      }
      writeInt32(dest, playerMisc.color)
      writeFloat(dest, 2)
      writeInt64(dest, 0n)
      writeInt64(dest, 0n)
      writeByte(dest, 0)
      writeInt32(dest, -1)
    }
    writeFloat(dest, 1.6)
    writeByte(dest, 0)
    writeInt32(dest, this.triggers.length)
    for (const trigger of this.triggers) {
      writeInt32(dest, trigger.isEnabled)
      writeInt32(dest, trigger.isLooping)
      writeByte(dest, 0)
      writeByte(dest, trigger.isObjective)
      writeInt32(dest, trigger.descriptionOrder)
      writeInt32(dest, 0)
      this.writeString32(dest, trigger.description)
      this.writeString32(dest, trigger.name)
      writeInt32(dest, trigger.effects.length)
      for (const effect of trigger.effects) {
        writeInt32(dest, effect.type)
        writeInt32(dest, effect.getFields().length)
        for (const fields of effect.getFields()) {
          writeInt32(dest, fields)
        }
        this.writeString32(dest, effect.text)
        this.writeString32(dest, effect.soundFile)
        for (const unitId of effect.unitIds) {
          writeInt32(dest, unitId)
        }
      }
      for (const effectOrder of trigger.effectOrder) {
        writeInt32(dest, effectOrder)
      }
      writeInt32(dest, trigger.conditions.length)
      for (const condition of trigger.conditions) {
        writeInt32(dest, condition.type)
        writeInt32(dest, condition.getFields().length)
        for (const field of condition.getFields()) {
          writeInt32(dest, field)
        }
      }
      for (const conditionOrder of trigger.conditionOrder) {
        writeInt32(dest, conditionOrder)
      }
    }
    for (const triggerOrder of this.triggerOrder) {
      writeInt32(dest, triggerOrder)
    }
    writeInt32(dest, this.hasAiFile)
    writeInt32(dest, this.needsWorkaround)
    if (this.needsWorkaround === 1) {
      dest.write(this.workaroundBytes)
    }
    if (this.hasAiFile) {
      writeInt32(dest, this.aiFiles.size)
      for (const [k, v] of this.aiFiles.entries()) {
        writeInt32(dest, k.length)
        dest.write(k)
        writeInt32(dest, v.length)
        dest.write(v)
      }
    }

    return ms
  }

  public save(): void {
    const stream = this.getStream()
    stream.pipe(createWriteStream(this.fileName))
  }

  public saveAs(fileName: string): void {
    const stream = this.getStream()
    stream.pipe(createWriteStream(this.fileName))
  }

  public async getBytes(): Promise<Buffer> {
    return GetStream.buffer(this.getStream())
  }

  public getBytesFixed(s: string, length: number): Buffer {
    const buffer = Buffer.alloc(length)
    buffer.write(s)
    return buffer
  }

  public getVersion(): ScxVersion {
    if (this.version[2] === 49) {
      return ScxVersion.Version118
    }
    if (this.version2 < 1.2201) {
      return ScxVersion.Version122
    }
    if (this.version2 < 1.2301) {
      return ScxVersion.Version123
    }
    if (this.version2 === 1.2401) {
      return ScxVersion.Version124
    }
    if (this.version2 < 1.2601) {
      return ScxVersion.Version126
    }
    return ScxVersion.Unknown
  }

  public transcode(to = 'utf8'): void {
    this.instructionBuffer = convert(this.instructionBuffer)
    this.originalFilenameBuffer = convert(this.originalFilenameBuffer)
    for (let i = 0; i < this.stringInfos.length; i++) {
      this.stringInfos[i] = convert(this.stringInfos[i])
    }
    for (const player of this.players) {
      player.nameBuffer = this.transcodeBytesFixed(player.nameBuffer)
      player.aiBuffer = convert(player.aiBuffer)
    }
    for (const playerMisc of this.misc) {
      playerMisc.nameBuffer = convert(playerMisc.nameBuffer)
    }
    for (const trigger of this.triggers) {
      trigger.nameBuffer = convert(trigger.nameBuffer)
      trigger.descriptionBuffer = convert(trigger.descriptionBuffer)
      for (const effect of trigger.effects) {
        effect.textBuffer = convert(effect.textBuffer)
        effect.soundFileBuffer = convert(effect.soundFileBuffer)
      }
    }
  }

  private writeString32(stream: Writable, s: string): void {
    writeInt32(stream, Buffer.byteLength(s))
    stream.write(s)
  }

  private writeString16(stream: Writable, s: string): void {
    writeInt16(stream, Buffer.byteLength(s))
    stream.write(s)
  }

  private transcodeBytesFixed(buffer: Buffer, from = 'gbk', to = 'utf8'): Buffer {
    const length = buffer.length
    const newBuf = Buffer.alloc(length)
    newBuf.copy(convert(buffer, from, to))
    return newBuf
  }
}
