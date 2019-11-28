import {Color, ConditionType, Diplomacy2, DiplomacyB, DiplomacyI, EffectType, StartAge} from './enums'
import {ScxFile} from './scx-file'

export class Player {
  public nameBuffer = Buffer.alloc(256)
  public stringTableName: number
  public isActive: number
  public isHuman: number
  public civilization: number
  public aiBuffer: Buffer
  public aiFile: Buffer
  public personality: number
  public gold: number
  public wood: number
  public food: number
  public stone: number
  public orex: number
  public playerNumber: number
  public diplomacies: DiplomacyI[] = []
  public alliedVictory: number
  public disabledTechs: number[] = []
  public disabledUnits: number[] = []
  public disabledBuildings: number[] = []
  public startAge: StartAge

  public get name(): string {
    return this.parent.encoding.getString(this.nameBuffer)
  }

  public set name(value: string) {
    this.nameBuffer = this.parent.getBytesFixed(value, 256)
  }

  public get ai(): string {
    return this.parent.encoding.getString(this.aiBuffer)
  }

  public set ai(value: string) {
    this.aiBuffer = this.parent.encoding.getBytes(value)
  }

  constructor(private parent: ScxFile) {
  }
}

export class Terrain {
  public id: number
  public elevation: number
  public toString(): string {
    return `${this.id}, ${this.elevation}`
  }
}

export class Resource {
  public food: number
  public wood: number
  public gold: number
  public stone: number
  public orex: number
  public populationLimit: number

  public toString(): string {
    return `F${this.food}\tW${this.wood}\tG${this.gold}\tS${this.stone}\tPop${this.populationLimit}`
  }
}

export class Unit {
  public posX: number
  public posY: number
  public posZ: number
  public id: number
  public unitId: number
  public state: number
  public rotation: number
  public frame: number
  public garrison: number
  public toString(): string {
    return `${this.unitId}\t${this.id}\t(${this.posX},${this.posY})`
  }
}

export class PlayerMisc {
  public nameBuffer: Buffer
  public cameraX: number
  public cameraY: number
  public alliedVictory: number
  public diplomacy: DiplomacyB[] = []
  public diplomacy2: Diplomacy2[] = []
  public color: Color

  public get name(): string {
    return this.parent.encoding.getString(this.nameBuffer)
  }

  public set name(value: string) {
    this.nameBuffer = this.parent.encoding.getBytes(value)
  }

  constructor(private parent: ScxFile) {}

  public toString(): string {
    return `${this.name}, ${this.color}`
  }
}

export class Effect {
  public textBuffer: Buffer
  public soundFileBuffer: Buffer
  public type: EffectType
  public fields: number[] = []
  public unitIds: number[]

  public get text(): string {
    return this.parent.encoding.getString(this.textBuffer)
  }

  public set text(value: string) {
    this.textBuffer = this.parent.encoding.getBytes(value)
  }

  public get soundFile(): string {
    return this.parent.encoding.getString(this.soundFileBuffer)
  }

  public set soundFile(value: string) {
    this.soundFileBuffer = this.parent.encoding.getBytes(value)
  }

  constructor(private parent: ScxFile) {
  }

  public getFields(): number[] {
    return this.fields
  }

  public toString(): string {
    return this.type.toString()
  }
}

export class Condition {
  public fields: number[] = []
  public type: ConditionType

  public getFields(): number[] {
    return this.fields
  }

  public toString(): string {
    return this.type.toString()
  }
}

export class Trigger {
  public descriptionBuffer: Buffer
  public nameBuffer: Buffer
  public isEnabled: number
  public isLooping: number
  public isObjective: number
  public descriptionOrder: number
  public effects: Effect[] = []
  public effectOrder: number[] = []
  public conditions: Condition[] = []
  public conditionOrder: number[] = []

  public get description(): string {
    return this.parent.encoding.getString(this.descriptionBuffer)
  }

  public set description(value: string) {
    this.descriptionBuffer = this.parent.encoding.getBytes(value)
  }

  public get name(): string {
    return this.parent.encoding.getString(this.nameBuffer)
  }

  public set name(value: string) {
    this.nameBuffer = this.parent.encoding.getBytes(value)
  }

  constructor(private parent: ScxFile) {}

  public toString(): string {
    return `${this.name}\t${this.conditions.length} Conditions, ${this.effects.length} Effects`
  }
}

export class RGB {
  public blue: number
  public green: number
  public red: number
}

export class BITMAPDIB {
  public biSize: number
  public biWidth: number
  public biHeight: number
  public biPlanes: number
  public biBitCount: number
  public biCompression: number
  public biSizeImage: number
  public biXPelsPerMeter: number
  public biYPelsPerMeter: number
  public biClrUsed: number
  public biClrImportant: number
  public colors: RGB[] = []
  public imageData: Buffer
}
