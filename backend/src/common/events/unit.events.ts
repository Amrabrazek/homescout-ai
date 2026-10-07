export enum UnitEventType {
  CREATED = 'unit.created',
  UPDATED = 'unit.updated',
  DELETED = 'unit.deleted',
}

export class UnitEvent {
  constructor(
    public readonly type: UnitEventType,
    public readonly unitId: string
  ) {}
}

export class UnitCreatedEvent extends UnitEvent {
  constructor(unitId: string) {
    super(UnitEventType.CREATED, unitId);
  }
}

export class UnitUpdatedEvent extends UnitEvent {
  constructor(unitId: string) {
    super(UnitEventType.UPDATED, unitId);
  }
}

export class UnitDeletedEvent extends UnitEvent {
  constructor(unitId: string) {
    super(UnitEventType.DELETED, unitId);
  }
}
