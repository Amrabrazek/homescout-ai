import { Unit } from '../entities/unit.entity';

export enum UnitEventType {
  CREATED = 'unit.created',
  UPDATED = 'unit.updated',
  DELETED = 'unit.deleted',
}

export class UnitEvent {
  constructor(
    public readonly type: UnitEventType,
    public readonly unit: Unit
  ) {}
}

export class UnitCreatedEvent extends UnitEvent {
  constructor(unit: Unit) {
    super(UnitEventType.CREATED, unit);
  }
}

export class UnitUpdatedEvent extends UnitEvent {
  constructor(unit: Unit) {
    super(UnitEventType.UPDATED, unit);
  }
}

export class UnitDeletedEvent extends UnitEvent {
  constructor(unit: Unit) {
    super(UnitEventType.DELETED, unit);
  }
}
