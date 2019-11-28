export enum ScxVersion {
  Version118,
  Version122,
  Version123,
  Version124,
  Version126,
  Unknown
}

export enum InfoType {
  Instruction,
  Hints,
  Victory,
  Defeat,
  History,
  Scouts,
  PregameCinematic,
  VictoryCinematic,
  LossCinematic,
  BackgroundPicture
}

export enum EffectField {
  AIGoal,
  Amount,
  Resource,
  Diplomacy,
  NumSelected,
  LocationUnit,
  UnitID,
  PlayerSource,
  PlayerTarget,
  Technology,
  StringTableID,
  Unknown,
  DisplayTime,
  Trigger,
  LocationX,
  LocationY,
  AreaSWX,
  AreaSWY,
  AreaNEX,
  AreaNEY,
  UnitGroup,
  UnitType,
  InstructionPanel
}

export enum ConditionField {
  Amount,
  Resource,
  UnitObject,
  UnitLocation,
  UnitClass,
  Player,
  Technology,
  Time,
  Unknown,
  AreaSWX,
  AreaSWY,
  AreaNEX,
  AreaNEY,
  UnitGroup,
  UnitType,
  AiSignal
}

export enum VictoryMode {
  Standard,
  Conquest,
  Score,
  Timed,
  Custom
}

export enum DiplomacyI {
  Allied = 0,
  Neutral = 1,
  Enemy = 3
}

export enum DiplomacyB {
  Allied = 0,
  Neutral = 1,
  Enemy = 3
}

export enum Diplomacy2 {
  Gaia,
  Self,
  Allied,
  Neutral,
  Enemy
}

export enum StartAge {
  None = -1,
  Dark,
  Feudal,
  Castle,
  Imperial,
  PostImperial
}

export enum AiMapType {
  Arabia = 9,
  Archipelago = 10,
  Baltic = 11,
  BlackForest = 12,
  Coastal = 13,
  Continental = 14,
  CraterLake = 0xF,
  Fortress = 0x10,
  GoldRush = 17,
  Highland = 18,
  Islands = 19,
  Mediterranean = 20,
  Migration = 21,
  Rivers = 22,
  TeamIslands = 23,
  Scandinavia = 25,
  Yucatan = 27,
  SaltMarsh = 28,
  KingOfTheHill = 30,
  Oasis = 0x1F,
  Nomad = 33
}

export enum Color {
  Blue,
  Red,
  Green,
  Yellow,
  Cyan,
  Purple,
  Gray,
  Orange
}

export enum EffectType {
  ChangeDiplomacy = 1,
  ResearchTechnology = 2,
  SendChat = 3,
  PlaySound = 4,
  SendTribute = 5,
  UnlockGate = 6,
  LockGate = 7,
  ActivateTrigger = 8,
  DeactivateTrigger = 9,
  AIScriptGoal = 10,
  CreateObject = 11,
  TaskObject = 12,
  DeclareVictory = 13,
  KillObject = 14,
  RemoveObject = 0xF,
  ChangeView = 0x10,
  Unload = 17,
  ChangeOwnership = 18,
  Patrol = 19,
  DisplayInstructions = 20,
  ClearInstructions = 21,
  FreezeUnit = 22,
  UseAdvancedButtons = 23,
  DamageObject = 24,
  PlaceFoundation = 25,
  ChangeObjectName = 26,
  ChangeObjectHP = 27,
  ChangeObjectAttack = 28,
  StopUnit = 29,
  SnapView = 30,
  EnableTech = 0x20,
  DisableTech = 33,
  EnableUnit = 34,
  DisableUnit = 35,
  FlashObjects = 36
}

export enum ConditionType {
  BringObjectToArea,
  BringObjectToObject,
  OwnObjects,
  OwnFewerObjects,
  ObjectsInArea,
  DestroyObject,
  CaptureObject,
  AccumulateAttribute,
  ResearchTechnology,
  Timer,
  ObjectSelected,
  AiSignal,
  PlayerDefeated,
  ObjectHasTarget,
  ObjectVisible,
  ObjectNotVisible,
  ResearchingTechnology,
  UnitsGarrisoned,
  DifficultyLevel,
  OwnFewerFoundations,
  SelectedObjectsInArea,
  PoweredObjectsInArea,
  UnitsQueuedPastPopCap
}

export enum CpxVersion {
  CpxVersion1,
  CpxVersion2,
  Unknown
}
