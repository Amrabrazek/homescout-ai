import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BuyerModule } from '../buyer/buyer.module';
import { SearchModule } from '../search/search.module';
import { UnitModule } from '../unit/unit.module';
import { createChatSummarizer } from './chat-summary';
import { ConciergeController } from './concierge.controller';
import { ConciergeService } from './concierge.service';
import { CHAT_SUMMARIZER, ConversationService } from './conversation.service';

@Module({
  imports: [SearchModule, UnitModule, BuyerModule],
  controllers: [ConciergeController],
  providers: [
    ConciergeService,
    ConversationService,
    {
      provide: CHAT_SUMMARIZER,
      inject: [ConfigService],
      useFactory: createChatSummarizer,
    },
  ],
})
export class ConciergeModule {}
