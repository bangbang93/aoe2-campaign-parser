import {Color, ConditionType, Diplomacy2, DiplomacyB, DiplomacyI, EffectType, StartAge} from './enums'

export class Player {
  public name: string
  public stringTableName: number
  public isActive: number
  public isHuman: number
  public civilization: number
  public ai: string
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
  public name: string
  public cameraX: number
  public cameraY: number
  public alliedVictory: number
  public diplomacy: DiplomacyB[] = []
  public diplomacy2: Diplomacy2[] = []
  public color: Color

  public toString(): string {
    return `${this.name}, ${this.color}`
  }
}

export class Effect {
  public text: string
  public soundFile: string
  public type: EffectType
  public fields: number[] = []
  public unitIds: number[] = []

  public toString(): string {
    return this.type.toString()
  }
}

export class Condition {
  public fields: number[] = []
  public type: ConditionType

  public toString(): string {
    return this.type.toString()
  }
}

export class Trigger {
  public description: string
  public name: string
  public isEnabled: number
  public isLooping: number
  public isObjective: number
  public descriptionOrder: number
  public effects: Effect[] = []
  public effectOrder: number[] = []
  public conditions: Condition[] = []
  public conditionOrder: number[] = []

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
