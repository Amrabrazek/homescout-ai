import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UnitCreatedEvent,
  UnitUpdatedEvent,
  UnitEventType,
  UnitDeletedEvent,
} from '../../common/events/unit.events';
import { UnitService } from './unit.service';
import { TypesenseService } from '../../common/typesense/typesense.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class UnitEmbeddingListener {
  private readonly logger = new Logger(UnitEmbeddingListener.name);

  constructor(
    private readonly unitService: UnitService,
    private readonly typesenseService: TypesenseService
  ) {}

  @OnEvent(UnitEventType.CREATED)
  async handleUnitCreatedEvent(event: UnitCreatedEvent) {
    try {
      // Get the full unit with all relations needed for indexing
      const unit = await this.unitService.findOne(event.unitId, );
      // Index directly to Typesense
      await this.typesenseService.indexUnit(unit);
      
      this.logger.log(`Successfully indexed unit ${event.unitId} to Typesense`);
    } catch (error) {
      this.logger.error(
        `Error indexing unit ${event.unitId} to Typesense:`,
        error.stack
      );
    }
  }

  @OnEvent(UnitEventType.UPDATED)
  async handleUnitUpdatedEvent(event: UnitUpdatedEvent) {
    try {
      // Get the full unit with all relations needed for indexing
      const unit = await this.unitService.findOne(event.unitId);
      // Index directly to Typesense
      await this.typesenseService.indexUnit(unit);
      
      this.logger.log(`Successfully updated unit ${event.unitId} in Typesense`);
    } catch (error) {
      this.logger.error(
        `Error updating unit ${event.unitId} in Typesense:`,
        error.stack
      );
    }
  }

  @OnEvent(UnitEventType.DELETED)
  async handleUnitDeletedEvent(event: UnitDeletedEvent) {
    try {
      // Delete from Typesense
      await this.typesenseService.deleteUnit(event.unitId);
    } catch (error) {
      this.logger.error(
        `Error deleting unit ${event.unitId} from Typesense:`,
        error.stack
      );
    }
  }
  
}
