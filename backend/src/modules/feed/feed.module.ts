import { Module } from '@nestjs/common';
import { BuyerModule } from '../buyer/buyer.module';
import { UnitModule } from '../unit/unit.module';
import { FeedResolver } from './feed.resolver';
import { FeedService } from './feed.service';

@Module({
  imports: [BuyerModule, UnitModule],
  providers: [FeedService, FeedResolver],
})
export class FeedModule {}
