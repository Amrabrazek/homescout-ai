import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { BuyerService } from '../buyer/buyer.service';
import { ConciergeController } from './concierge.controller';
import { ConciergeService } from './concierge.service';
import { ConversationService } from './conversation.service';

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
  const buyers = {
    rememberFact: jest.fn(async () => ({ id: '1', text: 'Has two kids' })),
    forgetFact: jest.fn(async (_buyer: string, id: string) => id === '1'),
  };

  const conversations = {
    lastChat: jest.fn(async () => null),
    latest: jest.fn(async () => null),
    get: jest.fn(async (_buyer: string, id: string) =>
      id === 'chat-1' ? { id, messages: [] } : null
    ),
    save: jest.fn(async (_buyer: string, id: string) => id === 'chat-1'),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ConciergeController],
      providers: [
        { provide: ConciergeService, useValue: concierge },
        { provide: BuyerService, useValue: buyers },
        { provide: ConversationService, useValue: conversations },
      ],
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
      .expect(200, { saved: [], lastChat: null });
    expect(concierge.buyerContext).toHaveBeenCalledWith(BUYER);
    expect(conversations.lastChat).toHaveBeenCalledWith(BUYER, undefined);

    await request(app.getHttpServer())
      .get('/internal/context?conversation=chat-2')
      .set('x-buyer-id', BUYER)
      .expect(200);
    expect(conversations.lastChat).toHaveBeenCalledWith(BUYER, 'chat-2');
  });

  it('saves and loads a chat by ID for the buyer in the header', async () => {
    const messages = [{ id: 'm1', role: 'user', parts: [] }];
    await request(app.getHttpServer())
      .put('/internal/conversations/chat-1')
      .set('x-buyer-id', BUYER)
      .send({ messages })
      .expect(204);
    expect(conversations.save).toHaveBeenCalledWith(BUYER, 'chat-1', messages);
    await request(app.getHttpServer())
      .put('/internal/conversations/chat-2')
      .set('x-buyer-id', BUYER)
      .send({ messages })
      .expect(404);
    await request(app.getHttpServer())
      .put('/internal/conversations/bad%20id')
      .set('x-buyer-id', BUYER)
      .send({ messages })
      .expect(400);
    await request(app.getHttpServer())
      .put('/internal/conversations/chat-1')
      .set('x-buyer-id', BUYER)
      .send({ messages: ['text'] })
      .expect(400);

    await request(app.getHttpServer())
      .get('/internal/conversations/chat-1')
      .set('x-buyer-id', BUYER)
      .expect(200, { id: 'chat-1', messages: [] });
    await request(app.getHttpServer())
      .get('/internal/conversations/chat-2')
      .set('x-buyer-id', BUYER)
      .expect(404);
    await request(app.getHttpServer())
      .get('/internal/conversations/latest')
      .set('x-buyer-id', BUYER)
      .expect(200, {});
  });

  it('remembers a fact for the buyer in the header', async () => {
    await request(app.getHttpServer())
      .post('/internal/facts')
      .set('x-buyer-id', BUYER)
      .send({ text: 'Has two kids' })
      .expect(201, { id: '1', text: 'Has two kids' });
    expect(buyers.rememberFact).toHaveBeenCalledWith(BUYER, 'Has two kids');

    await request(app.getHttpServer())
      .post('/internal/facts')
      .set('x-buyer-id', BUYER)
      .send({ text: 'x'.repeat(201) })
      .expect(400);
  });

  it('forgets a fact, or 404s when the buyer has none with that ID', async () => {
    await request(app.getHttpServer())
      .delete('/internal/facts/1')
      .set('x-buyer-id', BUYER)
      .expect(204);
    expect(buyers.forgetFact).toHaveBeenCalledWith(BUYER, '1');
    await request(app.getHttpServer())
      .delete('/internal/facts/2')
      .set('x-buyer-id', BUYER)
      .expect(404);
  });
});
