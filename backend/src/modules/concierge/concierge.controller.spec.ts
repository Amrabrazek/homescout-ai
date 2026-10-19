import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ConciergeController } from './concierge.controller';
import { ConciergeService } from './concierge.service';

const BUYER = '11111111-2222-4333-8444-555555555555';
const UNIT = '0486b96d-90fc-45d7-8cc5-64982eca2a14';

describe('ConciergeController', () => {
  let app: INestApplication;
  const concierge = {
    searchUnits: jest.fn(async () => ({ total: 0, units: [] })),
    compareUnits: jest.fn(async () => []),
    getUnit: jest.fn(async () => ({ id: UNIT })),
    similarUnits: jest.fn(async () => []),
    saveUnit: jest.fn(async () => undefined),
    getPreferences: jest.fn(async () => ({ areas: [] })),
    updatePreferences: jest.fn(async () => ({ areas: [] })),
    buyerContext: jest.fn(async () => ({ saved: [] })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ConciergeController],
      providers: [{ provide: ConciergeService, useValue: concierge }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('searches with validated filters', async () => {
    await request(app.getHttpServer())
      .post('/internal/units/search')
      .send({ query: 'villa', propertyTypes: ['villa'], maxPrice: 1e7 })
      .expect(200);
    expect(concierge.searchUnits).toHaveBeenCalledWith({
      query: 'villa',
      propertyTypes: ['villa'],
      maxPrice: 1e7,
    });
  });

  it.each([
    [{ propertyTypes: ['castle'] }],
    [{ maxPrice: -1 }],
    [{ limit: 50 }],
    [{ bedrooms: 3 }],
  ])('rejects an invalid search %j', async (body) => {
    await request(app.getHttpServer())
      .post('/internal/units/search')
      .send(body)
      .expect(400);
  });

  it('compares two to six units', async () => {
    await request(app.getHttpServer())
      .post('/internal/units/compare')
      .send({ ids: [UNIT] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/internal/units/compare')
      .send({ ids: Array(7).fill(UNIT) })
      .expect(400);
    await request(app.getHttpServer())
      .post('/internal/units/compare')
      .send({ ids: [UNIT, UNIT] })
      .expect(200);
  });

  it('rejects a unit ID that is not a UUID', async () => {
    await request(app.getHttpServer()).get('/internal/units/42').expect(400);
  });

  it('caps the number of similar units', async () => {
    await request(app.getHttpServer())
      .get(`/internal/units/${UNIT}/similar?limit=50`)
      .expect(200);
    expect(concierge.similarUnits).toHaveBeenCalledWith(UNIT, 8);
  });

  it('needs the buyer header for buyer routes', async () => {
    await request(app.getHttpServer()).get('/internal/preferences').expect(400);
    await request(app.getHttpServer())
      .post(`/internal/units/${UNIT}/save`)
      .set('x-buyer-id', 'not-a-uuid')
      .expect(400);
    expect(concierge.saveUnit).not.toHaveBeenCalled();
  });

  it('saves a unit for the buyer in the header', async () => {
    await request(app.getHttpServer())
      .post(`/internal/units/${UNIT}/save`)
      .set('x-buyer-id', BUYER)
      .expect(204);
    expect(concierge.saveUnit).toHaveBeenCalledWith(BUYER, UNIT);
  });

  it('updates preferences, allowing null to clear a value', async () => {
    await request(app.getHttpServer())
      .patch('/internal/preferences')
      .set('x-buyer-id', BUYER)
      .send({ budgetMax: null, locations: ['New Cairo'] })
      .expect(200);
    expect(concierge.updatePreferences).toHaveBeenCalledWith(BUYER, {
      budgetMax: null,
      locations: ['New Cairo'],
    });
  });

  it('returns the context of the buyer in the header', async () => {
    await request(app.getHttpServer()).get('/internal/context').expect(400);
    await request(app.getHttpServer())
      .get('/internal/context')
      .set('x-buyer-id', BUYER)
      .expect(200, { saved: [] });
    expect(concierge.buyerContext).toHaveBeenCalledWith(BUYER);
  });
});
