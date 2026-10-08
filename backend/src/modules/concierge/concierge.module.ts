import { Module } from '@nestjs/common';
import { BuyerModule } from '../buyer/buyer.module';
import { SearchModule } from '../search/search.module';
import { UnitModule } from '../unit/unit.module';
import { ConciergeController } from './concierge.controller';
import { ConciergeService } from './concierge.service';

@Module({
  imports: [SearchModule, UnitModule, BuyerModule],
  controllers: [ConciergeController],
  providers: [ConciergeService],
})
export class ConciergeModule {}
