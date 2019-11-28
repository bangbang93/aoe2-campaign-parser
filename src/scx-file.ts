import {writeFile} from 'fs-extra'
import {SmartBuffer} from 'smart-buffer'
import {deflateSync, inflateSync} from 'zlib'
import {AiMapType, EffectField, ScxVersion, VictoryMode} from './enums'
import {convert, FakeEncoding} from './func'
import {BITMAPDIB, Condition, Effect, Player, PlayerMisc, Resource, RGB, Terrain, Trigger, Unit} from './player'

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

  constructor(scx: Buffer) {
    const buffer = SmartBuffer.fromBuffer(scx)
    this.version = buffer.readBuffer(4)
    buffer.readBuffer(4)
    this.formatVersion = buffer.readInt32BE()
    this.lastSave = buffer.readInt32BE()
    this.instructionBuffer = buffer.readBuffer(buffer.readInt32BE())
    buffer.readBuffer(4)
    this.playerCount = buffer.readInt32BE()
    if (this.formatVersion === 3) {
      buffer.readBuffer(8)
      const num = buffer.readInt32BE()
      for (let i = 0; i < num; i++) {
        this.unknownInt32s.push(buffer.readInt32BE())
      }
    }

    const input = SmartBuffer.fromBuffer(inflateSync(buffer.readBuffer()))

    this.nextUid = input.readInt32BE()
    this.version2 = input.readFloatBE()
    for (let i = 0; i < 16; i++) {
      const player = new Player(this)
      player.nameBuffer = input.readBuffer(256)
      this.players.push(player)
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].stringTableName = input.readInt32BE()
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].isActive = input.readInt32BE()
      this.players[i].isHuman = input.readInt32BE()
      this.players[i].civilization = input.readInt32BE()
      input.readBuffer(4)
    }
    input.readBuffer(9)
    this.originalFilenameBuffer = input.readBuffer(input.readInt16BE())
    const num5 = (this.getVersion() >= ScxVersion.Version122) ? 5 : 4
    for (let i = 0; i <= num5; i++) {
      this.stringTableInfos.push(input.readInt32BE())
    }
    const num6 = (this.getVersion() > ScxVersion.Version122) ? 9 : 8
    for (let i = 0; i <= num6; i++) {
      this.stringInfos.push(input.readBuffer(input.readInt16BE()))
    }
    this.hasBitmap = input.readInt32BE()
    this.bitMapX = input.readInt32BE()
    this.bitMapY = input.readInt32BE()
    input.readBuffer(2)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      this.bitmap = new BITMAPDIB()
      this.bitmap.biSize = input.readInt32BE()
      this.bitmap.biWidth = input.readInt32BE()
      this.bitmap.biHeight = input.readInt32BE()
      this.bitmap.biPlanes = input.readInt16BE()
      this.bitmap.biBitCount = input.readInt16BE()
      this.bitmap.biCompression = input.readInt32BE()
      this.bitmap.biSizeImage = input.readInt32BE()
      this.bitmap.biXPelsPerMeter = input.readInt32BE()
      this.bitmap.biYPelsPerMeter = input.readInt32BE()
      this.bitmap.biClrUsed = input.readInt32BE()
      this.bitmap.biClrImportant = input.readInt32BE()
    }
    for (let i = 0; i <= 255; i++) {
      const rgb = new RGB()
      rgb.red = input.readInt8()
      rgb.green = input.readInt8()
      rgb.blue = input.readInt8()
      input.readBuffer(1)
      this.bitmap.colors.push(rgb)
      this.bitmap.imageData = input.readBuffer((~~((this.bitMapX - 1) / 4 + 1) * 4 * this.bitMapY))
    }
    for (let i = 0; i <= 31; i++) {
      input.readBuffer(input.readInt16BE())
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].aiBuffer = input.readBuffer(input.readInt16BE())
    }
    for (let i = 0; i <= 15; i++) {
      input.readBuffer(8)
      this.players[i].aiFile = input.readBuffer(input.readInt32BE())
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].personality = input.readInt8()
    }
    input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      this.players[i].gold = input.readInt32BE()
      this.players[i].wood = input.readInt32BE()
      this.players[i].food = input.readInt32BE()
      this.players[i].stone = input.readInt32BE()
      this.players[i].orex = input.readInt32BE()
      input.readInt32BE()
      if (this.getVersion() > ScxVersion.Version124) {
        this.players[i].playerNumber = input.readInt32BE()
      }
    }
    input.readInt32BE()
    this.conquest = input.readBigInt64BE()
    this.relics = input.readBigInt64BE()
    this.explored = input.readBigInt64BE()
    this.allMustMeet = input.readInt32BE()
    this.mode = input.readInt32BE()
    this.score = input.readInt32BE()
    this.time = input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 15; j++) {
        this.players[i].diplomacies.push(input.readInt32BE())
      }
    }
    input.readBuffer(11524)
    for (let i = 0; i <= 15; i++) {
      this.players[i].alliedVictory = input.readInt32BE()
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      this.lockTeams = input.readInt8()
      this.playerChooseTeams = input.readInt8()
      this.randomStartPoints = input.readInt8()
      this.maxTeams = input.readInt8()
    }
    for (let i = 0; i <= 15; i++) input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledTechs.push(input.readInt32BE())
      }
    }
    for (let i = 0; i <= 15; i++) input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledUnits.push(input.readInt32BE())
      }
    }
    for (let i = 0; i <= 15; i++) input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      const num24 = this.getVersion() >= ScxVersion.Version126 ? 29 : 19
      for (let j = 0; j <= num24; j++) {
        this.players[i].disabledBuildings.push(input.readInt32BE())
      }
    }
    input.readBuffer(8)
    this.allTechs = input.readInt32BE()
    for (let i = 0; i <= 15; i++) {
      this.players[i].startAge = input.readInt32BE() - (this.getVersion() >= ScxVersion.Version126 ? 2 : 0)
    }
    input.readInt32BE()
    this.cameraX = input.readInt32BE()
    this.cameraY = input.readInt32BE()
    if (this.getVersion() >= ScxVersion.Version122) {
      this.mapType = input.readInt32BE()
    }
    if (this.getVersion() > ScxVersion.Version124) {
      input.readBuffer(16)
    }
    this.mapX = input.readInt32BE()
    this.mapY = input.readInt32BE()
    this.map = []
    for (let i = 0; i <= this.mapX - 1; i++) {
      this.map[i] = []
      for (let j = 0; j <= this.mapY - 1; j++) {
        const terrain = new Terrain()
        terrain.id = input.readInt8()
        terrain.elevation = input.readUInt16BE()
      }
    }
    input.readBuffer(4)
    for (let i = 0; i <= 7; i++) {
      const resource = new Resource()
      resource.food = input.readFloatBE()
      resource.wood = input.readFloatBE()
      resource.gold = input.readFloatBE()
      resource.stone = input.readFloatBE()
      resource.orex = input.readFloatBE()
      this.resources.push(resource)
      input.readBuffer(4)
      if (this.getVersion() >= ScxVersion.Version122) {
        resource.populationLimit = input.readFloatBE()
      }
    }
    for (let i = 0; i <= 7; i++) {
      const unit = []
      this.units.push(unit)
      const num30 = input.readInt32BE()
      for (let j = 0; j <= num30 - 1; j++) {
        const e = new Unit()
        e.posX = input.readFloatBE()
        e.posY = input.readFloatBE()
        e.posZ = input.readFloatBE()
        e.id = input.readInt32BE()
        e.unitId = input.readInt16BE()
        e.state = input.readInt8()
        e.rotation = input.readFloatBE()
        e.frame = input.readInt16BE()
        e.garrison = input.readInt32BE()
        unit.push(e)
      }
    }
    input.readInt32BE()
    for (let i = 0; i <= 8; i++) {
      const playerMisc = new PlayerMisc(this)
      this.misc.push(playerMisc)
      playerMisc.nameBuffer = input.readBuffer(input.readInt16BE())
      playerMisc.cameraX = input.readFloatBE()
      playerMisc.cameraY = input.readFloatBE()
      input.readInt32BE()
      playerMisc.alliedVictory = input.readInt8()
      input.readBuffer(2)
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy.push(input.readInt8())
      }
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy2.push(input.readInt8())
      }
      playerMisc.color = input.readInt32BE()
      input.readBuffer(input.readFloatBE() === 2 ? 8 : 0)
    }
    input.readBuffer(9)
    const num35 = input.readInt32BE() - 1
    for (let i = 0; i <= num35; i++) {
      const trigger = new Trigger(this)
      trigger.isEnabled = input.readInt32BE()
      trigger.isLooping = input.readInt32BE()
      this.triggers.push(trigger)
      input.readBuffer(1)
      trigger.isObjective = input.readInt8()
      trigger.descriptionOrder = input.readInt32BE()
      input.readBuffer(4)
      trigger.descriptionBuffer = input.readBuffer(input.readInt32BE())
      trigger.nameBuffer = input.readBuffer(input.readInt32BE())
      const num37 = input.readInt32BE() - 1
      for (let j = 0; j <= num37; j++) {
        const effect = new Effect(this)
        effect.type = input.readInt32BE()
        trigger.effects.push(effect)
        const num39 = input.readInt32BE() - 1
        for (let k = 0; k <= num39; k++) {
          effect.fields.push(input.readInt32BE())
        }
        effect.textBuffer = input.readBuffer(input.readInt32BE())
        effect.soundFileBuffer = input.readBuffer(input.readInt32BE())
        if (effect.fields.length > 4) {
          const num41 = effect.fields[EffectField.NumSelected] - 1
          for (let k = 0; k <= num41; k++) {
            effect.unitIds.push(input.readInt32BE())
          }
        }
      }
      const num43 = trigger.effects.length - 1
      for (let j = 0; j <= num43; j++) {
        trigger.effectOrder.push(input.readInt32BE())
      }
      const num45 = input.readInt32BE() - 1
      for (let j = 0; j <= num45; j++) {
        const condition = new Condition()
        condition.type = input.readInt32BE()
        trigger.conditions.push(condition)
        const num47 = input.readInt32BE() - 1
        for (let k = 0; k <= num47; k++) {
          condition.getFields().push(input.readInt32BE())
        }
      }
      const num49 = trigger.conditions.length - 1
      for (let j = 0; j <= num49; j++) {
        trigger.conditionOrder.push(input.readInt32BE())
      }
    }
    const num51 = this.triggers.length - 1
    for (let i = 0; i <= num51; i++) {
      this.triggerOrder.push(input.readInt32BE())
    }
    this.hasAiFile = input.readInt32BE()
    this.needsWorkaround = input.readInt32BE()
    if (this.needsWorkaround === 1) {
      this.workaroundBytes = input.readBuffer(396)
    }
    if (this.hasAiFile === 1) {
      const num53 = input.readInt32BE() - 1
      for (let i = 0; i <= num53; i++) {
        this.aiFiles.set(input.readBuffer(input.readInt32BE()), input.readBuffer(input.readInt32BE()))
      }
    }
  }

  public getBuffer(): Buffer {
    const buffer = SmartBuffer.fromSize(10 * 1024 * 1024)
    buffer.writeBuffer(this.version)
    buffer.writeInt32BE(Buffer.byteLength(this.instruction) + 20)
    buffer.writeInt32BE(this.formatVersion)
    buffer.writeInt32BE(this.lastSave)
    this.writeString32(buffer, this.instruction)
    buffer.writeInt32BE(0)
    buffer.writeInt32BE(this.playerCount)
    if (this.formatVersion === 3) {
      buffer.writeInt32BE(1000)
      buffer.writeInt32BE(1)
      buffer.writeInt32BE(this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        buffer.writeInt32BE(unknownInt32)
      }
    }
    const dest = SmartBuffer.fromSize(10 * 1024 * 1024)
    dest.writeInt32BE(this.nextUid)
    dest.writeFloatBE(this.version2)
    for (const player of this.players) {
      dest.writeBuffer(this.getBytesFixed(player.name, 256))
    }
    for (const player of this.players) {
      dest.writeInt32BE(player.stringTableName)
    }
    for (const player of this.players) {
      dest.writeInt32BE(player.isActive)
      dest.writeInt32BE(player.isHuman)
      dest.writeInt32BE(player.civilization)
      dest.writeInt32BE(4)
    }
    dest.writeInt32BE(1)
    dest.writeInt16BE(0)
    dest.writeFloatBE(-1)
    this.writeString16(dest, this.originalFilename)
    for (const stringTableInfo of this.stringTableInfos) {
      dest.writeInt32BE(stringTableInfo)
    }
    for (const stringInfo of this.stringInfos) {
      dest.writeInt16BE(stringInfo.length)
      dest.writeBuffer(stringInfo)
    }
    dest.writeInt32BE(this.hasBitmap)
    dest.writeInt32BE(this.bitMapX)
    dest.writeInt32BE(this.bitMapY)
    dest.writeInt16BE(1)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      dest.writeInt32BE(this.bitmap.biSize)
      dest.writeInt32BE(this.bitmap.biWidth)
      dest.writeInt32BE(this.bitmap.biHeight)
      dest.writeInt16BE(this.bitmap.biPlanes)
      dest.writeInt16BE(this.bitmap.biBitCount)
      dest.writeInt32BE(this.bitmap.biCompression)
      dest.writeInt32BE(this.bitmap.biSizeImage)
      dest.writeInt32BE(this.bitmap.biXPelsPerMeter)
      dest.writeInt32BE(this.bitmap.biYPelsPerMeter)
      dest.writeInt32BE(this.bitmap.biClrUsed)
      dest.writeInt32BE(this.bitmap.biClrImportant)
      for (const color of this.bitmap.colors) {
        dest.writeInt8(color.red)
        dest.writeInt8(color.green)
        dest.writeInt8(color.blue)
        dest.writeInt8(0)
      }
      dest.writeBuffer(this.bitmap.imageData)
    }
    for (let i = 0; i <= 31; i++) {
      dest.writeInt16BE(0)
    }
    for (const player of this.players) {
      this.writeString16(dest, player.ai)
    }
    for (const player of this.players) {
      dest.writeBigInt64BE(0n)
      dest.writeInt32BE(player.aiFile.length)
      dest.writeBuffer(player.aiFile)
    }
    for (const player of this.players) {
      dest.writeInt8(player.personality)
    }
    dest.writeInt32BE(-99)
    for (const player of this.players) {
      dest.writeInt32BE(player.gold)
      dest.writeInt32BE(player.wood)
      dest.writeInt32BE(player.food)
      dest.writeInt32BE(player.stone)
      dest.writeInt32BE(player.orex)
      dest.writeInt32BE(0)
      if (this.getVersion() > ScxVersion.Version124) {
        dest.writeInt32BE(player.playerNumber)
      }
    }
    dest.writeInt32BE(-99)
    dest.writeBigInt64BE(this.conquest)
    dest.writeBigInt64BE(this.relics)
    dest.writeBigInt64BE(this.explored)
    dest.writeInt32BE(this.allMustMeet)
    dest.writeInt32BE(this.mode)
    dest.writeInt32BE(this.score)
    dest.writeInt32BE(this.time)
    for (const player of this.players) {
      for (const diplomacy of player.diplomacies) {
        dest.writeInt32BE(diplomacy)
      }
    }
    for (let i = 1; i <= 720; i++) {
      dest.writeBuffer(Buffer.alloc(16))
    }
    dest.writeInt32BE(-99)
    for (const player of this.players) {
      dest.writeInt32BE(player.alliedVictory)
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      dest.writeInt8(this.lockTeams)
      dest.writeInt8(this.playerChooseTeams)
      dest.writeInt8(this.randomStartPoints)
      dest.writeInt8(this.maxTeams)
    }
    for (const player of this.players) {
      dest.writeInt32BE(player.disabledTechs.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledTech of player.disabledTechs) {
        dest.writeInt32BE(disabledTech)
      }
    }
    for (const player of this.players) {
      dest.writeInt32BE(player.disabledUnits.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledUnits) {
        dest.writeInt32BE(disabledUnit)
      }
    }
    for (const player of this.players) {
      dest.writeInt32BE(player.disabledBuildings.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledBuildings) {
        dest.writeInt32BE(disabledUnit)
      }
    }
    dest.writeBigInt64BE(0n)
    dest.writeInt32BE(this.allTechs)
    for (const player of this.players) {
      dest.writeInt32BE(player.startAge + (this.getVersion() >= ScxVersion.Version126 ? 2 : 0))
    }
    dest.writeInt32BE(-99)
    dest.writeInt32BE(this.cameraX)
    dest.writeInt32BE(this.cameraY)
    if (this.getVersion() >= ScxVersion.Version122) {
      dest.writeInt32BE(this.mapType)
    }
    if (this.getVersion() >= ScxVersion.Version124) {
      dest.writeBuffer(Buffer.from(new Array(16).fill(0)))
    }
    dest.writeInt32BE(this.mapX)
    dest.writeInt32BE(this.mapY)
    for (let i = 0; i <= this.mapX - 1; i++) {
      for (let j = 0; j <= this.mapY - 1; j++) {
        dest.writeInt8(this.map[i][j].id)
        dest.writeUInt16BE(this.map[i][j].elevation)
      }
    }
    dest.writeInt32BE(9)
    for (const resource of this.resources) {
      dest.writeFloatBE(resource.food)
      dest.writeFloatBE(resource.wood)
      dest.writeFloatBE(resource.gold)
      dest.writeFloatBE(resource.stone)
      dest.writeFloatBE(resource.orex)
      dest.writeInt32BE(0)
      if (this.getVersion() >= ScxVersion.Version122) {
        dest.writeFloatBE(resource.populationLimit)
      }
    }
    for (const unit of this.units) {
      dest.writeInt32BE(unit.length)
      for (const e of unit) {
        dest.writeFloatBE(e.posX)
        dest.writeFloatBE(e.posY)
        dest.writeFloatBE(e.posZ)
        dest.writeInt32BE(e.id)
        dest.writeUInt16BE(e.unitId)
        dest.writeInt8(e.state)
        dest.writeFloatBE(e.rotation)
        dest.writeInt16BE(e.frame)
        dest.writeInt32BE(e.garrison)
      }
    }
    dest.writeInt32BE(9)
    for (const playerMisc of this.misc) {
      this.writeString16(dest, playerMisc.name)
      dest.writeFloatBE(playerMisc.cameraX)
      dest.writeFloatBE(playerMisc.cameraY)
      dest.writeInt32BE(0)
      dest.writeUInt8(playerMisc.alliedVictory)
      for (const diplomacyB of playerMisc.diplomacy) {
        dest.writeUInt8(diplomacyB)
      }
      for (const diplomacy2 of playerMisc.diplomacy2) {
        dest.writeInt32BE(diplomacy2)
      }
      dest.writeInt32BE(playerMisc.color)
      dest.writeFloatBE(2)
      dest.writeBigInt64BE(0n)
      dest.writeBigInt64BE(0n)
      dest.writeUInt8(0)
      dest.writeInt32BE(-1)
    }
    dest.writeFloatBE(1.6)
    dest.writeUInt8(0)
    dest.writeInt32BE(this.triggers.length)
    for (const trigger of this.triggers) {
      dest.writeInt32BE(trigger.isEnabled)
      dest.writeInt32BE(trigger.isLooping)
      dest.writeUInt8(0)
      dest.writeUInt8(trigger.isObjective)
      dest.writeInt32BE(trigger.descriptionOrder)
      dest.writeInt32BE(0)
      this.writeString32(dest, trigger.description)
      this.writeString32(dest, trigger.name)
      dest.writeInt32BE(trigger.effects.length)
      for (const effect of trigger.effects) {
        dest.writeInt32BE(effect.type)
        dest.writeInt32BE(effect.getFields().length)
        for (const fields of effect.getFields()) {
          dest.writeInt32BE(fields)
        }
        this.writeString32(dest, effect.text)
        this.writeString32(dest, effect.soundFile)
        for (const unitId of effect.unitIds) {
          dest.writeInt32BE(unitId)
        }
      }
      for (const effectOrder of trigger.effectOrder) {
        dest.writeInt32BE(effectOrder)
      }
      dest.writeInt32BE(trigger.conditions.length)
      for (const condition of trigger.conditions) {
        dest.writeInt32BE(condition.type)
        dest.writeInt32BE(condition.getFields().length)
        for (const field of condition.getFields()) {
          dest.writeInt32BE(field)
        }
      }
      for (const conditionOrder of trigger.conditionOrder) {
        dest.writeInt32BE(conditionOrder)
      }
    }
    for (const triggerOrder of this.triggerOrder) {
      dest.writeInt32BE(triggerOrder)
    }
    dest.writeInt32BE(this.hasAiFile)
    dest.writeInt32BE(this.needsWorkaround)
    if (this.needsWorkaround === 1) {
      dest.writeBuffer(this.workaroundBytes)
    }
    if (this.hasAiFile) {
      dest.writeInt32BE(this.aiFiles.size)
      for (const [k, v] of this.aiFiles.entries()) {
        dest.writeInt32BE(k.length)
        dest.writeBuffer(k)
        dest.writeInt32BE(v.length)
        dest.writeBuffer(v)
      }
    }
    buffer.writeBuffer(deflateSync(dest.toBuffer()))

    return buffer.toBuffer()
  }

  public async save(): Promise<void> {
    const buffer = this.getBuffer()
    await writeFile(this.fileName, buffer)
  }

  public async saveAs(fileName: string): Promise<void> {
    const buffer = this.getBuffer()
    await writeFile(fileName, buffer)
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

  private writeString32(buffer: SmartBuffer, s: string): void {
    buffer.writeInt32BE(Buffer.byteLength(s))
    buffer.writeString(s)
  }

  private writeString16(buffer: SmartBuffer, s: string): void {
    buffer.writeInt16BE(Buffer.byteLength(s))
    buffer.writeString(s)
  }

  private transcodeBytesFixed(buffer: Buffer, from = 'gbk', to = 'utf8'): Buffer {
    const length = buffer.length
    const newBuf = Buffer.alloc(length)
    newBuf.copy(convert(buffer, from, to))
    return newBuf
  }
}
