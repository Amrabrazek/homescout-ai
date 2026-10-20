import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aboutBuyer } from './context';

const empty = {
  preferences: {
    budgetMin: null,
    budgetMax: null,
    areas: [],
    propertyTypes: [],
    minRooms: null,
    minSize: null,
    amenities: [],
  },
  saved: [],
  viewed: [],
  skipped: [],
  facts: [],
};

const unit = {
  id: 'u1',
  name: '3-Bedroom Apartment',
  project: 'Mivida',
  area: 'New Cairo',
  propertyType: 'apartment' as const,
  rooms: 3,
  price: 13_830_000,
};

describe('aboutBuyer', () => {
  it('says a new buyer has nothing saved', () => {
    const text = aboutBuyer(empty);
    assert.match(text, /^## About this buyer\n/);
    assert.match(text, /Saved preferences: none yet\./);
    assert.doesNotMatch(
      text,
      /Saved units|Recently viewed|Not interested|Remembered facts/
    );
  });

  it('lists preferences and units with their IDs', () => {
    const text = aboutBuyer({
      preferences: {
        ...empty.preferences,
        budgetMax: 9_000_000,
        areas: ['New Cairo'],
        propertyTypes: ['serviced_apartment'],
        minRooms: 2,
      },
      saved: [unit],
      viewed: [],
      skipped: [{ ...unit, id: 'u2', project: null }],
      facts: [],
    });
    assert.match(
      text,
      /Saved preferences: budget up to 9M EGP; areas: New Cairo; types: serviced apartment; at least 2 bedrooms\./
    );
    assert.match(
      text,
      /Saved units:\n- 3-Bedroom Apartment, Mivida, New Cairo, 13\.83M EGP, id u1/
    );
    assert.match(
      text,
      /Not interested \(skipped, do not suggest again\):\n- 3-Bedroom Apartment, New Cairo, 13\.83M EGP, id u2/
    );
    assert.doesNotMatch(text, /Recently viewed/);
  });

  it('shows a budget range', () => {
    const text = aboutBuyer({
      ...empty,
      preferences: { ...empty.preferences, budgetMin: 5_500_000, budgetMax: 8_000_000 },
    });
    assert.match(text, /budget 5\.5M to 8M EGP/);
  });

  it('lists remembered facts with their ids', () => {
    const text = aboutBuyer({
      ...empty,
      facts: [
        { id: '4', text: 'Has two kids' },
        { id: '9', text: 'Works from home' },
      ],
    });
    assert.match(
      text,
      /Remembered facts \(what the buyer told you in earlier chats\):\n- Has two kids \(fact id 4\)\n- Works from home \(fact id 9\)/
    );
  });
});
