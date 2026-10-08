import { BuyerEventType } from '../../common/enums/buyer-event-type';
import { computeTasteVector, TasteEvent } from './taste-vector';

const now = new Date('2026-10-08T12:00:00Z');
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const event = (
  unitId: string,
  type: BuyerEventType,
  embedding: number[],
  ageDays = 0
): TasteEvent => ({ unitId, type, embedding, createdAt: daysAgo(ageDays) });

const expectVector = (actual: number[] | null, expected: number[]) => {
  expect(actual).not.toBeNull();
  actual!.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
};

describe('computeTasteVector', () => {
  it('is null without events', () => {
    expect(computeTasteVector([], now)).toBeNull();
  });

  it('equals the embedding of a single saved unit', () => {
    expectVector(
      computeTasteVector([event('a', BuyerEventType.SAVE, [1, 2])], now),
      [1, 2]
    );
  });

  it('weights a save above a view', () => {
    const taste = computeTasteVector(
      [
        event('a', BuyerEventType.SAVE, [1, 0]),
        event('b', BuyerEventType.VIEW, [0, 1]),
      ],
      now
    );
    expectVector(taste, [1 / 1.3, 0.3 / 1.3]);
  });

  it('pushes away from skipped units', () => {
    const taste = computeTasteVector(
      [
        event('a', BuyerEventType.SAVE, [1, 0]),
        event('b', BuyerEventType.SKIP, [0, 1]),
      ],
      now
    );
    expectVector(taste, [1 / 1.5, -0.5 / 1.5]);
  });

  it('halves the weight of an event every 14 days', () => {
    const taste = computeTasteVector(
      [
        event('old', BuyerEventType.SAVE, [1, 0], 14),
        event('new', BuyerEventType.SAVE, [0, 1], 0),
      ],
      now
    );
    expectVector(taste, [0.5 / 1.5, 1 / 1.5]);
  });

  it('counts repeated views of a unit once, at the latest time', () => {
    const once = computeTasteVector(
      [
        event('a', BuyerEventType.SAVE, [1, 0]),
        event('b', BuyerEventType.VIEW, [0, 1]),
      ],
      now
    );
    const repeated = computeTasteVector(
      [
        event('a', BuyerEventType.SAVE, [1, 0]),
        event('b', BuyerEventType.VIEW, [0, 1], 30),
        event('b', BuyerEventType.VIEW, [0, 1], 5),
        event('b', BuyerEventType.VIEW, [0, 1], 0),
      ],
      now
    );
    expect(repeated).toEqual(once);
  });

  it('is null when only skips remain', () => {
    expect(
      computeTasteVector([event('a', BuyerEventType.SKIP, [1, 0])], now)
    ).toBeNull();
  });

  it('rejects embeddings of different sizes', () => {
    expect(() =>
      computeTasteVector(
        [
          event('a', BuyerEventType.SAVE, [1, 0]),
          event('b', BuyerEventType.SAVE, [1, 0, 0]),
        ],
        now
      )
    ).toThrow();
  });
});
