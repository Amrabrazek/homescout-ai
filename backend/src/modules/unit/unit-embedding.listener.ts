import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UnitCreatedEvent,
  UnitUpdatedEvent,
  UnitEventType,
} from '../../common/events/unit.events';
import { UnitService } from './unit.service';

@Injectable()
export class UnitEmbeddingListener {
  constructor(private readonly unitService: UnitService) {}

  @OnEvent(UnitEventType.CREATED)
  async handleUnitCreatedEvent(event: UnitCreatedEvent) {
    try {
      await this.unitService.updateUnitEmbedding(event.unitId);
    } catch (error) {
      console.error(
        `Error generating embedding for unit ${event.unitId}:`,
        error.message
      );
    }
  }

  @OnEvent(UnitEventType.UPDATED)
  async handleUnitUpdatedEvent(event: UnitUpdatedEvent) {
    try {
      await this.unitService.updateUnitEmbedding(event.unitId);
    } catch (error) {
      console.error(
        `Error updating embedding for unit ${event.unitId}:`,
        error.message
      );
    }
  }
}
