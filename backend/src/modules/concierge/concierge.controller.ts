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
import { UnitDetail } from './unit-card';

/**
 * REST endpoints behind the concierge agent's tools, called by the web app's
 * server. Buyer-scoped routes take the buyer from the x-buyer-id header.
 */
@Controller('internal')
export class ConciergeController {
  constructor(
    private readonly concierge: ConciergeService,
    private readonly buyers: BuyerService
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

  @Get('context')
  getContext(@BuyerId() buyerId: string): Promise<BuyerContext> {
    return this.concierge.buyerContext(buyerId);
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
}
