import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BuyerFact } from '../../common/entities/buyer-fact.entity';
import { BuyerId } from '../buyer/buyer-id.decorator';
import { BuyerService } from '../buyer/buyer.service';
import {
  BuyerContext,
  BuyerPreferences,
  ConciergeService,
  SimilarUnit,
  UnitSearchResult,
} from './concierge.service';
import { RememberFactDto } from './dto/remember-fact.dto';
import { CompareUnitsDto } from './dto/compare-units.dto';
import { SearchUnitsDto } from './dto/search-units.dto';
import { UpdateBuyerPreferencesDto } from './dto/update-preferences.dto';
import { ParseChatIdPipe } from './dto/parse-chat-id.pipe';
import { SaveConversationDto } from './dto/save-conversation.dto';
import { UnitDetail } from './unit-card';
import {
  Conversation,
  ConversationService,
  LastChat,
} from './conversation.service';

/**
 * REST endpoints behind the concierge agent's tools, called by the web app's
 * server. Buyer-scoped routes take the buyer from the x-buyer-id header.
 */
@Controller('internal')
export class ConciergeController {
  constructor(
    private readonly concierge: ConciergeService,
    private readonly buyers: BuyerService,
    private readonly conversations: ConversationService
  ) {}

  @Post('units/search')
  @HttpCode(200)
  searchUnits(@Body() input: SearchUnitsDto): Promise<UnitSearchResult> {
    return this.concierge.searchUnits(input);
  }

  @Post('units/compare')
  @HttpCode(200)
  compareUnits(@Body() input: CompareUnitsDto): Promise<UnitDetail[]> {
    return this.concierge.compareUnits(input.ids);
  }

  @Get('units/:id')
  getUnit(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDetail> {
    return this.concierge.getUnit(id);
  }

  @Get('units/:id/similar')
  similarUnits(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number
  ): Promise<SimilarUnit[]> {
    return this.concierge.similarUnits(id, Math.min(Math.max(limit, 1), 8));
  }

  @Post('units/:id/save')
  @HttpCode(204)
  saveUnit(
    @BuyerId() buyerId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.concierge.saveUnit(buyerId, id);
  }

  @Get('preferences')
  getPreferences(@BuyerId() buyerId: string): Promise<BuyerPreferences> {
    return this.concierge.getPreferences(buyerId);
  }

  /** `conversation` is the chat asking; "last chat" is the one before it. */
  @Get('context')
  async getContext(
    @BuyerId() buyerId: string,
    @Query('conversation') conversationId?: string
  ): Promise<BuyerContext & { lastChat: LastChat | null }> {
    const [context, lastChat] = await Promise.all([
      this.concierge.buyerContext(buyerId),
      this.conversations.lastChat(buyerId, conversationId),
    ]);
    return { ...context, lastChat };
  }

  @Patch('preferences')
  updatePreferences(
    @BuyerId() buyerId: string,
    @Body() input: UpdateBuyerPreferencesDto
  ): Promise<BuyerPreferences & { unmatched: string[] }> {
    return this.concierge.updatePreferences(buyerId, input);
  }

  @Post('facts')
  async rememberFact(
    @BuyerId() buyerId: string,
    @Body() input: RememberFactDto
  ): Promise<Pick<BuyerFact, 'id' | 'text'>> {
    const { id, text } = await this.buyers.rememberFact(buyerId, input.text);
    return { id, text };
  }

  @Delete('facts/:id')
  @HttpCode(204)
  async forgetFact(
    @BuyerId() buyerId: string,
    @Param('id') id: string
  ): Promise<void> {
    if (!(await this.buyers.forgetFact(buyerId, id))) {
      throw new NotFoundException(`No fact with ID ${id}`);
    }
  }

  @Get('conversations/latest')
  async latestConversation(
    @BuyerId() buyerId: string
  ): Promise<Conversation | Record<string, never>> {
    return (await this.conversations.latest(buyerId)) ?? {};
  }

  @Get('conversations/:id')
  async getConversation(
    @BuyerId() buyerId: string,
    @Param('id', new ParseChatIdPipe()) id: string
  ): Promise<Conversation> {
    const conversation = await this.conversations.get(buyerId, id);
    if (!conversation) throw new NotFoundException(`No chat with ID ${id}`);
    return conversation;
  }

  @Put('conversations/:id')
  @HttpCode(204)
  async saveConversation(
    @BuyerId() buyerId: string,
    @Param('id', new ParseChatIdPipe()) id: string,
    @Body() input: SaveConversationDto
  ): Promise<void> {
    if (!(await this.conversations.save(buyerId, id, input.messages))) {
      throw new NotFoundException(`No chat with ID ${id}`);
    }
  }
}
