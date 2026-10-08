import { registerEnumType } from '@nestjs/graphql';

export enum BuyerEventType {
  VIEW = 'view',
  SAVE = 'save',
  SKIP = 'skip',
}

registerEnumType(BuyerEventType, { name: 'BuyerEventType' });
