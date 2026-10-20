import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BuyerEventType } from '../../common/enums/buyer-event-type';
import { BuyerService } from '../buyer/buyer.service';
import { UpdatePreferencesInput } from '../buyer/dto/update-preferences.input';
import { UnitFilterInput } from '../unit/dto/unit-filter.input';
import { SearchService } from '../search/search.service';
import { UnitService } from '../unit/unit.service';
import { planDiscountRate } from '../unit/payment-plan';
import { SearchUnitsDto } from './dto/search-units.dto';
import { UpdateBuyerPreferencesDto } from './dto/update-preferences.dto';
import {
  toUnitCard,
  toUnitDetail,
  UnitCard,
  UnitDetail,
  UnitLike,
} from './unit-card';
import {
  expandToAreas,
  LocationRow,
  NamedItem,
  resolveAmenities,
  resolveLocations,
} from './vocabulary';

export interface UnitSearchResult {
  total: number;
  units: UnitCard[];
  /** The hard filters every returned unit meets, plus the leftover keywords. */
  appliedFilters: Record<string, unknown>;
  /** Names that matched nothing in the data and were ignored. */
  unmatched: string[];
}

export interface SimilarUnit {
  unit: UnitCard;
  reasons: string[];
}

export interface BuyerPreferences {
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  propertyTypes: string[];
  minRooms: number | null;
  minSize: number | null;
  amenities: string[];
  savedUnitIds: string[];
}

/** Enough to name a unit and reopen it with get_unit. */
export interface ContextUnit {
  id: string;
  name: string;
  project: string | null;
  area: string | null;
  propertyType: string | null;
  rooms: number;
  price: number;
}

export interface BuyerContext {
  preferences: Omit<BuyerPreferences, 'savedUnitIds'>;
  saved: ContextUnit[];
  viewed: ContextUnit[];
  skipped: ContextUnit[];
  facts: { id: string; text: string }[];
}

const DEFAULT_LIMIT = 6;
const CONTEXT_SAVED = 5;
const CONTEXT_VIEWED = 5;
const CONTEXT_SKIPPED = 3;

/**
 * The concierge agent's tools. Results are compact and come straight from the
 * DB so the chat can render them as cards without trusting model text.
 */
@Injectable()
export class ConciergeService {
  private readonly logger = new Logger(ConciergeService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly unitService: UnitService,
    private readonly buyerService: BuyerService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService
  ) {}

  private get discountRate(): number | null {
    return planDiscountRate(this.config);
  }

  async searchUnits(input: SearchUnitsDto): Promise<UnitSearchResult> {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const [rows, amenities] = await Promise.all([
      this.locationRows(),
      this.amenities(),
    ]);
    const places = resolveLocations(input.locations ?? [], rows);
    const amenityMatch = resolveAmenities(input.amenities ?? [], amenities);
    const unmatched = [...places.unknown, ...amenityMatch.unknown];

    // Every place name failed to resolve: searching without a location would
    // return homes anywhere in Egypt as if they met the buyer's place.
    if (
      input.locations?.length &&
      places.unknown.length === input.locations.length
    ) {
      return { total: 0, units: [], appliedFilters: {}, unmatched };
    }

    const requested: UnitFilterInput = {
      searchTerm: input.query?.trim() || undefined,
      areas: places.areas,
      cities: places.cities,
      regions: places.regions,
      propertyTypes: input.propertyTypes,
      amenityIds: amenityMatch.ids,
      minRooms: input.minRooms,
      maxRooms: input.maxRooms,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      minFloorArea: input.minFloorArea,
      maxFloorArea: input.maxFloorArea,
    };
    const { text, filter } = await this.searchService.understand(requested);

    let total: number;
    let units: UnitCard[];
    try {
      const result = await this.searchService.search({
        filter: requested,
        limit,
      });
      total = result.total;
      units = result.items.map(toUnitCard);
      // The keywords' vector match has a distance cutoff, so a vague query can
      // hide units that meet every hard filter. Keywords rank; they never filter.
      if (text && units.length < limit) {
        const filtered = await this.searchService.search({ filter, limit });
        const seen = new Set(units.map((u) => u.id));
        units = [
          ...units,
          ...filtered.items.map(toUnitCard).filter((u) => !seen.has(u.id)),
        ].slice(0, limit);
        total = Math.max(total, filtered.total);
      }
    } catch (error) {
      this.logger.warn(
        `Search index unavailable, using Postgres filters only: ${error.message}`
      );
      const [found, count] = await this.unitService.findAllWithCount(
        filter,
        undefined,
        limit,
        0
      );
      total = count;
      units = found.map(toUnitCard);
    }

    return {
      total,
      units,
      appliedFilters: withoutEmpty({
        keywords: text,
        ...filter,
        amenityIds: undefined,
        amenities: amenityMatch.ids.map(
          (id) => amenities.find((a) => a.id === id).name
        ),
      }),
      unmatched,
    };
  }

  async getUnit(id: string): Promise<UnitDetail> {
    return toUnitDetail(await this.unitService.findOne(id), this.discountRate);
  }

  async compareUnits(ids: string[]): Promise<UnitDetail[]> {
    const units = await this.unitService.findManyByIds(ids);
    const rate = this.discountRate;
    return units.map((unit) => toUnitDetail(unit, rate));
  }

  async similarUnits(id: string, limit = 4): Promise<SimilarUnit[]> {
    const ranked = await this.unitService.findSimilarUnits(id, limit);
    return ranked.map((r) => ({
      unit: toUnitCard(r.unit),
      reasons: r.reasons,
    }));
  }

  async getPreferences(buyerId: string): Promise<BuyerPreferences> {
    const [profile, amenities, savedUnitIds] = await Promise.all([
      this.buyerService.getProfile(buyerId),
      this.amenities(),
      this.buyerService.savedUnitIds(buyerId),
    ]);
    return {
      budgetMin: profile.budgetMin ?? null,
      budgetMax: profile.budgetMax ?? null,
      areas: profile.areas,
      propertyTypes: profile.propertyTypes,
      minRooms: profile.minRooms ?? null,
      minSize: profile.minSize ?? null,
      amenities: profile.amenityIds
        .map((id) => amenities.find((a) => a.id === id)?.name)
        .filter((name): name is string => !!name),
      savedUnitIds,
    };
  }

  /**
   * What the concierge knows about the buyer before the chat starts. Viewed
   * leaves out units already saved or skipped, so each unit shows up once.
   */
  async buyerContext(buyerId: string): Promise<BuyerContext> {
    const [{ savedUnitIds, ...preferences }, saved, viewed, skipped, facts] =
      await Promise.all([
        this.getPreferences(buyerId),
        this.buyerService.recentUnitIds(
          buyerId,
          BuyerEventType.SAVE,
          CONTEXT_SAVED
        ),
        this.buyerService.recentUnitIds(
          buyerId,
          BuyerEventType.VIEW,
          CONTEXT_VIEWED + CONTEXT_SAVED + CONTEXT_SKIPPED
        ),
        this.buyerService.recentUnitIds(
          buyerId,
          BuyerEventType.SKIP,
          CONTEXT_SKIPPED
        ),
        this.buyerService.facts(buyerId),
      ]);
    const decided = new Set([...savedUnitIds, ...skipped]);
    const viewedOnly = viewed
      .filter((id) => !decided.has(id))
      .slice(0, CONTEXT_VIEWED);
    const units = await this.unitService.findManyByIds([
      ...saved,
      ...viewedOnly,
      ...skipped,
    ]);
    const byId = new Map(units.map((u) => [u.id, toContextUnit(u)]));
    const pick = (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((u): u is ContextUnit => !!u);
    return {
      preferences,
      saved: pick(saved),
      viewed: pick(viewedOnly),
      skipped: pick(skipped),
      facts: facts.map(({ id, text }) => ({ id, text })),
    };
  }

  /** Lists replace the stored ones; send null to clear a value. */
  async updatePreferences(
    buyerId: string,
    input: UpdateBuyerPreferencesDto
  ): Promise<BuyerPreferences & { unmatched: string[] }> {
    const { locations, amenities: amenityNames, ...rest } = input;
    const unmatched: string[] = [];
    const changes: Record<string, unknown> = { ...rest };

    if (locations) {
      const rows = await this.locationRows();
      const places = resolveLocations(locations, rows);
      changes.areas = expandToAreas(places, rows);
      unmatched.push(...places.unknown);
    }
    if (amenityNames) {
      const match = resolveAmenities(amenityNames, await this.amenities());
      changes.amenityIds = match.ids;
      unmatched.push(...match.unknown);
    }

    await this.buyerService.updatePreferences(
      buyerId,
      changes as UpdatePreferencesInput
    );
    return { ...(await this.getPreferences(buyerId)), unmatched };
  }

  async saveUnit(buyerId: string, unitId: string): Promise<void> {
    await this.buyerService.recordEvent(buyerId, unitId, BuyerEventType.SAVE);
  }

  private locationRows(): Promise<LocationRow[]> {
    return this.dataSource.query(
      `SELECT DISTINCT area, city, region FROM projects`
    );
  }

  private amenities(): Promise<NamedItem[]> {
    return this.dataSource.query(`SELECT id, name FROM amenities`);
  }
}

function toContextUnit(unit: UnitLike): ContextUnit {
  const card = toUnitCard(unit);
  return {
    id: card.id,
    name: card.name,
    project: card.project,
    area: card.area,
    propertyType: card.propertyType,
    rooms: card.rooms,
    price: card.price,
  };
}

function withoutEmpty<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  ) as Partial<T>;
}
