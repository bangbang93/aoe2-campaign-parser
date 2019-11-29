import {writeFile} from 'fs-extra'
import {decode, encode} from 'iconv-lite'
import {SmartBuffer} from 'smart-buffer'
import {deflateRawSync, inflateRawSync} from 'zlib'
import {AiMapType, EffectField, ScxVersion, VictoryMode} from './enums'
import {FakeEncoding} from './func'
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
  private instruction: string
  private playerCount: number
  private formatVersion: number
  private unknownInt32s: number[] = []
  private nextUid: number
  private version2: number
  private originalFilename: string
  private stringTableInfos: number[] = []
  private stringInfos: string[] = []
  private buffer: Buffer

  constructor(scx: Buffer, from = 'gbk', private to = 'utf8') {
    const buffer = SmartBuffer.fromBuffer(scx)
    this.version = buffer.readBuffer(4)
    buffer.readBuffer(4)
    this.formatVersion = buffer.readInt32LE()
    this.lastSave = buffer.readInt32LE()
    const instructionLength = buffer.readInt32LE()
    this.instruction = decode(buffer.readBuffer(instructionLength), from)
    buffer.readBuffer(4)
    this.playerCount = buffer.readInt32LE()
    if (this.formatVersion === 3) {
      buffer.readBuffer(8)
      const num = buffer.readInt32LE()
      for (let i = 0; i < num; i++) {
        this.unknownInt32s.push(buffer.readInt32LE())
      }
    }
    const compressed = buffer.readBuffer()
    const input = SmartBuffer.fromBuffer(inflateRawSync(compressed))

    this.nextUid = input.readInt32LE()
    this.version2 = input.readFloatLE()
    for (let i = 0; i < 16; i++) {
      const player = new Player()
      player.name = decode(input.readBuffer(256), from)
      this.players.push(player)
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].stringTableName = input.readInt32LE()
    }
    for (let i = 0; i < 16; i++) {
      this.players[i].isActive = input.readInt32LE()
      this.players[i].isHuman = input.readInt32LE()
      this.players[i].civilization = input.readInt32LE()
      input.readBuffer(4)
    }
    input.readBuffer(9)
    const originalFilenameLength = input.readInt16LE()
    this.originalFilename = decode(input.readBuffer(originalFilenameLength), from)
    const num5 = this.getVersion() >= ScxVersion.Version122 ? 5 : 4
    for (let i = 0; i <= num5; i++) {
      this.stringTableInfos.push(input.readInt32LE())
    }
    const num6 = this.getVersion() >= ScxVersion.Version122 ? 9 : 8
    for (let i = 0; i <= num6; i++) {
      this.stringInfos.push(decode(input.readBuffer(input.readInt16LE()), from))
    }
    this.hasBitmap = input.readInt32LE()
    this.bitMapX = input.readInt32LE()
    this.bitMapY = input.readInt32LE()
    input.readBuffer(2)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      this.bitmap = new BITMAPDIB()
      this.bitmap.biSize = input.readInt32LE()
      this.bitmap.biWidth = input.readInt32LE()
      this.bitmap.biHeight = input.readInt32LE()
      this.bitmap.biPlanes = input.readInt16LE()
      this.bitmap.biBitCount = input.readInt16LE()
      this.bitmap.biCompression = input.readInt32LE()
      this.bitmap.biSizeImage = input.readInt32LE()
      this.bitmap.biXPelsPerMeter = input.readInt32LE()
      this.bitmap.biYPelsPerMeter = input.readInt32LE()
      this.bitmap.biClrUsed = input.readInt32LE()
      this.bitmap.biClrImportant = input.readInt32LE()
      for (let i = 0; i <= 255; i++) {
        const rgb = new RGB()
        rgb.red = input.readInt8()
        rgb.green = input.readInt8()
        rgb.blue = input.readInt8()
        input.readBuffer(1)
        this.bitmap.colors.push(rgb)
        this.bitmap.imageData = input.readBuffer(~~((this.bitMapX - 1) / 4 + 1) * 4 * this.bitMapY)
      }
    }
    for (let i = 0; i <= 31; i++) {
      input.readBuffer(input.readInt16LE())
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].ai = decode(input.readBuffer(input.readInt16LE()), from)
    }
    for (let i = 0; i <= 15; i++) {
      input.readBuffer(8)
      this.players[i].aiFile = input.readBuffer(input.readInt32LE())
    }
    for (let i = 0; i <= 15; i++) {
      this.players[i].personality = input.readInt8()
    }
    input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      this.players[i].gold = input.readInt32LE()
      this.players[i].wood = input.readInt32LE()
      this.players[i].food = input.readInt32LE()
      this.players[i].stone = input.readInt32LE()
      this.players[i].orex = input.readInt32LE()
      input.readInt32LE()
      if (this.getVersion() > ScxVersion.Version124) {
        this.players[i].playerNumber = input.readInt32LE()
      }
    }
    input.readInt32LE()
    this.conquest = input.readBigInt64LE()
    this.relics = input.readBigInt64LE()
    this.explored = input.readBigInt64LE()
    this.allMustMeet = input.readInt32LE()
    this.mode = input.readInt32LE()
    this.score = input.readInt32LE()
    this.time = input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 15; j++) {
        this.players[i].diplomacies.push(input.readInt32LE())
      }
    }
    input.readBuffer(11524)
    for (let i = 0; i <= 15; i++) {
      this.players[i].alliedVictory = input.readInt32LE()
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      this.lockTeams = input.readInt8()
      this.playerChooseTeams = input.readInt8()
      this.randomStartPoints = input.readInt8()
      this.maxTeams = input.readInt8()
    }
    for (let i = 0; i <= 15; i++) input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledTechs.push(input.readInt32LE())
      }
    }
    for (let i = 0; i <= 15; i++) input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      for (let j = 0; j <= 29; j++) {
        this.players[i].disabledUnits.push(input.readInt32LE())
      }
    }
    for (let i = 0; i <= 15; i++) input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      const num24 = this.getVersion() >= ScxVersion.Version126 ? 29 : 19
      for (let j = 0; j <= num24; j++) {
        this.players[i].disabledBuildings.push(input.readInt32LE())
      }
    }
    input.readBuffer(8)
    this.allTechs = input.readInt32LE()
    for (let i = 0; i <= 15; i++) {
      this.players[i].startAge = input.readInt32LE() - (this.getVersion() >= ScxVersion.Version126 ? 2 : 0)
    }
    input.readInt32LE()
    this.cameraX = input.readInt32LE()
    this.cameraY = input.readInt32LE()
    if (this.getVersion() >= ScxVersion.Version122) {
      this.mapType = input.readInt32LE()
    }
    if (this.getVersion() > ScxVersion.Version124) {
      input.readBuffer(16)
    }
    this.mapX = input.readInt32LE()
    this.mapY = input.readInt32LE()
    this.map = []
    for (let i = 0; i <= this.mapX - 1; i++) {
      this.map[i] = []
      for (let j = 0; j <= this.mapY - 1; j++) {
        const terrain = new Terrain()
        terrain.id = input.readInt8()
        terrain.elevation = input.readUInt16LE()
        this.map[i].push(terrain)
      }
    }
    input.readBuffer(4)
    for (let i = 0; i <= 7; i++) {
      const resource = new Resource()
      resource.food = input.readFloatLE()
      resource.wood = input.readFloatLE()
      resource.gold = input.readFloatLE()
      resource.stone = input.readFloatLE()
      resource.orex = input.readFloatLE()
      this.resources.push(resource)
      input.readBuffer(4)
      if (this.getVersion() >= ScxVersion.Version122) {
        resource.populationLimit = input.readFloatLE()
      }
    }
    for (let i = 0; i <= 8; i++) {
      const unit = []
      this.units.push(unit)
      const num30 = input.readInt32LE()
      for (let j = 0; j <= num30 - 1; j++) {
        const e = new Unit()
        e.posX = input.readFloatLE()
        e.posY = input.readFloatLE()
        e.posZ = input.readFloatLE()
        e.id = input.readInt32LE()
        e.unitId = input.readUInt16LE()
        e.state = input.readInt8()
        e.rotation = input.readFloatLE()
        e.frame = input.readInt16LE()
        e.garrison = input.readInt32LE()
        unit.push(e)
      }
    }
    input.readInt32LE()
    for (let i = 0; i <= 7; i++) {
      const playerMisc = new PlayerMisc()
      this.misc.push(playerMisc)
      const nameLength = input.readInt16LE()
      playerMisc.name = decode(input.readBuffer(nameLength), from)
      playerMisc.cameraX = input.readFloatLE()
      playerMisc.cameraY = input.readFloatLE()
      input.readInt32LE()
      playerMisc.alliedVictory = input.readUInt8()
      input.readBuffer(2)
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy.push(input.readInt8())
      }
      for (let j = 0; j <= 8; j++) {
        playerMisc.diplomacy2.push(input.readInt32LE())
      }
      playerMisc.color = input.readInt32LE()
      const readCount = (input.readFloatLE() === 2 ? 8 : 0) + input.readInt16LE() * 44 + 11
      input.readBuffer(readCount)
    }
    input.readBuffer(9)
    const triggerCount = input.readInt32LE()
    for (let i = 0; i < triggerCount; i++) {
      const trigger = new Trigger()
      this.triggers.push(trigger)
      trigger.isEnabled = input.readInt32LE()
      trigger.isLooping = input.readInt32LE()
      input.readBuffer(1)
      trigger.isObjective = input.readInt8()
      trigger.descriptionOrder = input.readInt32LE()
      input.readBuffer(4)
      trigger.description = decode(input.readBuffer(input.readInt32LE()), from)
      // console.log(trigger.description)
      trigger.name = decode(input.readBuffer(input.readInt32LE()), from)
      const effectCount = input.readInt32LE()
      for (let j = 0; j < effectCount; j++) {
        const effect = new Effect()
        effect.type = input.readInt32LE()
        trigger.effects.push(effect)
        const fieldCount = input.readInt32LE()
        for (let k = 0; k < fieldCount; k++) {
          effect.fields.push(input.readInt32LE())
        }
        effect.text = decode(input.readBuffer(input.readInt32LE()), from)
        effect.soundFile = decode(input.readBuffer(input.readInt32LE()), from)
        if (effect.fields.length > 4) {
          const num41 = effect.fields[EffectField.NumSelected] - 1
          for (let k = 0; k <= num41; k++) {
            effect.unitIds.push(input.readInt32LE())
          }
        }
      }
      const num43 = trigger.effects.length - 1
      for (let j = 0; j <= num43; j++) {
        trigger.effectOrder.push(input.readInt32LE())
      }
      const num45 = input.readInt32LE() - 1
      for (let j = 0; j <= num45; j++) {
        const condition = new Condition()
        condition.type = input.readInt32LE()
        trigger.conditions.push(condition)
        const num47 = input.readInt32LE() - 1
        for (let k = 0; k <= num47; k++) {
          condition.getFields().push(input.readInt32LE())
        }
      }
      const num49 = trigger.conditions.length - 1
      for (let j = 0; j <= num49; j++) {
        trigger.conditionOrder.push(input.readInt32LE())
      }
    }
    const num51 = this.triggers.length - 1
    for (let i = 0; i <= num51; i++) {
      this.triggerOrder.push(input.readInt32LE())
    }
    this.hasAiFile = input.readInt32LE()
    this.needsWorkaround = input.readInt32LE()
    if (this.needsWorkaround === 1) {
      this.workaroundBytes = input.readBuffer(396)
    }
    if (this.hasAiFile === 1) {
      const num53 = input.readInt32LE() - 1
      for (let i = 0; i <= num53; i++) {
        this.aiFiles.set(input.readBuffer(input.readInt32LE()), input.readBuffer(input.readInt32LE()))
      }
    }
  }

  public getBuffer(): Buffer {
    if (this.buffer) return this.buffer
    const buffer = SmartBuffer.fromSize(10 * 1024 * 1024)
    buffer.writeBuffer(this.version)
    buffer.writeInt32LE(encode(this.instruction, this.to).length + 20)
    buffer.writeInt32LE(this.formatVersion)
    buffer.writeInt32LE(this.lastSave)
    this.writeString32(buffer, this.instruction)
    buffer.writeInt32LE(0)
    buffer.writeInt32LE(this.playerCount)
    if (this.formatVersion === 3) {
      buffer.writeInt32LE(1000)
      buffer.writeInt32LE(1)
      buffer.writeInt32LE(this.unknownInt32s.length)
      for (const unknownInt32 of this.unknownInt32s) {
        buffer.writeInt32LE(unknownInt32)
      }
    }
    const dest = SmartBuffer.fromSize(10 * 1024 * 1024)
    dest.writeInt32LE(this.nextUid)
    dest.writeFloatLE(this.version2)
    for (const player of this.players) {
      dest.writeBuffer(this.getBytesFixed(player.name, 256))
    }
    for (const player of this.players) {
      dest.writeInt32LE(player.stringTableName)
    }
    for (const player of this.players) {
      dest.writeInt32LE(player.isActive)
      dest.writeInt32LE(player.isHuman)
      dest.writeInt32LE(player.civilization)
      dest.writeInt32LE(4)
    }
    dest.writeInt32LE(1)
    dest.writeInt8(0)
    dest.writeFloatLE(-1)
    this.writeString16(dest, this.originalFilename)
    for (const stringTableInfo of this.stringTableInfos) {
      dest.writeInt32LE(stringTableInfo)
    }
    for (const stringInfo of this.stringInfos) {
      this.writeString16(dest, stringInfo)
    }
    dest.writeInt32LE(this.hasBitmap)
    dest.writeInt32LE(this.bitMapX)
    dest.writeInt32LE(this.bitMapY)
    dest.writeInt16LE(1)
    if (this.bitMapX > 0 && this.bitMapY > 0) {
      dest.writeInt32LE(this.bitmap.biSize)
      dest.writeInt32LE(this.bitmap.biWidth)
      dest.writeInt32LE(this.bitmap.biHeight)
      dest.writeInt16LE(this.bitmap.biPlanes)
      dest.writeInt16LE(this.bitmap.biBitCount)
      dest.writeInt32LE(this.bitmap.biCompression)
      dest.writeInt32LE(this.bitmap.biSizeImage)
      dest.writeInt32LE(this.bitmap.biXPelsPerMeter)
      dest.writeInt32LE(this.bitmap.biYPelsPerMeter)
      dest.writeInt32LE(this.bitmap.biClrUsed)
      dest.writeInt32LE(this.bitmap.biClrImportant)
      for (const color of this.bitmap.colors) {
        dest.writeInt8(color.red)
        dest.writeInt8(color.green)
        dest.writeInt8(color.blue)
        dest.writeInt8(0)
      }
      dest.writeBuffer(this.bitmap.imageData)
    }
    for (let i = 0; i <= 31; i++) {
      dest.writeInt16LE(0)
    }
    for (const player of this.players) {
      this.writeString16(dest, player.ai)
    }
    for (const player of this.players) {
      dest.writeBigInt64LE(0n)
      dest.writeInt32LE(player.aiFile.length)
      dest.writeBuffer(player.aiFile)
    }
    for (const player of this.players) {
      dest.writeInt8(player.personality)
    }
    dest.writeInt32LE(-99)
    for (const player of this.players) {
      dest.writeInt32LE(player.gold)
      dest.writeInt32LE(player.wood)
      dest.writeInt32LE(player.food)
      dest.writeInt32LE(player.stone)
      dest.writeInt32LE(player.orex)
      dest.writeInt32LE(0)
      if (this.getVersion() > ScxVersion.Version124) {
        dest.writeInt32BE(player.playerNumber)
      }
    }
    dest.writeInt32LE(-99)
    dest.writeBigInt64LE(this.conquest)
    dest.writeBigInt64LE(this.relics)
    dest.writeBigInt64LE(this.explored)
    dest.writeInt32LE(this.allMustMeet)
    dest.writeInt32LE(this.mode)
    dest.writeInt32LE(this.score)
    dest.writeInt32LE(this.time)
    for (const player of this.players) {
      for (const diplomacy of player.diplomacies) {
        dest.writeInt32LE(diplomacy)
      }
    }
    for (let i = 1; i <= 720; i++) {
      dest.writeBuffer(Buffer.alloc(16))
    }
    dest.writeInt32LE(-99)
    for (const player of this.players) {
      dest.writeInt32LE(player.alliedVictory)
    }
    if (this.getVersion() >= ScxVersion.Version123) {
      dest.writeInt8(this.lockTeams)
      dest.writeInt8(this.playerChooseTeams)
      dest.writeInt8(this.randomStartPoints)
      dest.writeInt8(this.maxTeams)
    }
    for (const player of this.players) {
      dest.writeInt32LE(player.disabledTechs.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledTech of player.disabledTechs) {
        dest.writeInt32LE(disabledTech)
      }
    }
    for (const player of this.players) {
      dest.writeInt32LE(player.disabledUnits.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledUnits) {
        dest.writeInt32LE(disabledUnit)
      }
    }
    for (const player of this.players) {
      dest.writeInt32LE(player.disabledBuildings.map((e) => e >= 0).length)
    }
    for (const player of this.players) {
      for (const disabledUnit of player.disabledBuildings) {
        dest.writeInt32LE(disabledUnit)
      }
    }
    dest.writeBigInt64LE(0n)
    dest.writeInt32LE(this.allTechs)
    for (const player of this.players) {
      dest.writeInt32LE(player.startAge + (this.getVersion() >= ScxVersion.Version126 ? 2 : 0))
    }
    dest.writeInt32LE(-99)
    dest.writeInt32LE(this.cameraX)
    dest.writeInt32LE(this.cameraY)
    if (this.getVersion() >= ScxVersion.Version122) {
      dest.writeInt32LE(this.mapType)
    }
    if (this.getVersion() >= ScxVersion.Version124) {
      dest.writeBuffer(Buffer.from(new Array(16).fill(0)))
    }
    dest.writeInt32LE(this.mapX)
    dest.writeInt32LE(this.mapY)
    for (let i = 0; i <= this.mapX - 1; i++) {
      for (let j = 0; j <= this.mapY - 1; j++) {
        dest.writeInt8(this.map[i][j].id)
        dest.writeUInt16LE(this.map[i][j].elevation)
      }
    }
    dest.writeInt32LE(9)
    for (const resource of this.resources) {
      dest.writeFloatLE(resource.food)
      dest.writeFloatLE(resource.wood)
      dest.writeFloatLE(resource.gold)
      dest.writeFloatLE(resource.stone)
      dest.writeFloatLE(resource.orex)
      dest.writeInt32LE(0)
      if (this.getVersion() >= ScxVersion.Version122) {
        dest.writeFloatLE(resource.populationLimit)
      }
    }
    for (const unit of this.units) {
      dest.writeInt32LE(unit.length)
      for (const e of unit) {
        dest.writeFloatLE(e.posX)
        dest.writeFloatLE(e.posY)
        dest.writeFloatLE(e.posZ)
        dest.writeInt32LE(e.id)
        dest.writeUInt16LE(e.unitId)
        dest.writeInt8(e.state)
        dest.writeFloatLE(e.rotation)
        dest.writeInt16LE(e.frame)
        dest.writeInt32LE(e.garrison)
      }
    }
    dest.writeInt32LE(9)
    for (const playerMisc of this.misc) {
      this.writeString16(dest, playerMisc.name)
      dest.writeFloatLE(playerMisc.cameraX)
      dest.writeFloatLE(playerMisc.cameraY)
      dest.writeInt32LE(0)
      dest.writeUInt8(playerMisc.alliedVictory)
      dest.writeInt16LE(9)
      for (const diplomacyB of playerMisc.diplomacy) {
        dest.writeUInt8(diplomacyB)
      }
      for (const diplomacy2 of playerMisc.diplomacy2) {
        dest.writeInt32LE(diplomacy2)
      }
      dest.writeInt32LE(playerMisc.color)
      dest.writeFloatLE(2)
      dest.writeBigInt64LE(0n)
      dest.writeBigInt64LE(0n)
      dest.writeUInt8(0)
      dest.writeInt32LE(-1)
    }
    dest.writeDoubleLE(1.6)
    dest.writeUInt8(0)
    dest.writeInt32LE(this.triggers.length)
    for (const trigger of this.triggers) {
      dest.writeInt32LE(trigger.isEnabled)
      dest.writeInt32LE(trigger.isLooping)
      dest.writeUInt8(0)
      dest.writeUInt8(trigger.isObjective)
      dest.writeInt32LE(trigger.descriptionOrder)
      dest.writeInt32LE(0)
      this.writeString32(dest, trigger.description)
      this.writeString32(dest, trigger.name)
      dest.writeInt32LE(trigger.effects.length)
      for (const effect of trigger.effects) {
        dest.writeInt32LE(effect.type)
        dest.writeInt32LE(effect.getFields().length)
        for (const fields of effect.getFields()) {
          dest.writeInt32LE(fields)
        }
        this.writeString32(dest, effect.text)
        this.writeString32(dest, effect.soundFile)
        for (const unitId of effect.unitIds) {
          dest.writeInt32LE(unitId)
        }
      }
      for (const effectOrder of trigger.effectOrder) {
        dest.writeInt32LE(effectOrder)
      }
      dest.writeInt32LE(trigger.conditions.length)
      for (const condition of trigger.conditions) {
        dest.writeInt32LE(condition.type)
        dest.writeInt32LE(condition.getFields().length)
        for (const field of condition.getFields()) {
          dest.writeInt32LE(field)
        }
      }
      for (const conditionOrder of trigger.conditionOrder) {
        dest.writeInt32LE(conditionOrder)
      }
    }
    for (const triggerOrder of this.triggerOrder) {
      dest.writeInt32LE(triggerOrder)
    }
    dest.writeInt32LE(this.hasAiFile)
    dest.writeInt32LE(this.needsWorkaround)
    if (this.needsWorkaround === 1) {
      dest.writeBuffer(this.workaroundBytes)
    }
    if (this.hasAiFile) {
      dest.writeInt32LE(this.aiFiles.size)
      for (const [k, v] of this.aiFiles.entries()) {
        dest.writeInt32LE(k.length)
        dest.writeBuffer(k)
        dest.writeInt32LE(v.length)
        dest.writeBuffer(v)
      }
    }
    buffer.writeBuffer(deflateRawSync(dest.toBuffer()))

    this.buffer = buffer.toBuffer()
    return this.buffer
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

  private writeString32(buffer: SmartBuffer, s: string): void {
    const buf = encode(s, this.to)
    buffer.writeInt32LE(buf.length)
    buffer.writeBuffer(buf)
  }

  private writeString16(buffer: SmartBuffer, s: string): void {
    const buf = encode(s, this.to)
    buffer.writeInt16LE(buf.length)
    buffer.writeBuffer(buf)
  }
}
