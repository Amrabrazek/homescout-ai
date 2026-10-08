import { registerEnumType } from '@nestjs/graphql';

export enum PropertyType {
  STUDIO = 'studio',
  APARTMENT = 'apartment',
  DUPLEX = 'duplex',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  TWIN_HOUSE = 'twin_house',
  VILLA = 'villa',
  CHALET = 'chalet',
  SERVICED_APARTMENT = 'serviced_apartment',
}

export enum Finishing {
  CORE_SHELL = 'core_shell',
  SEMI_FINISHED = 'semi_finished',
  FULLY_FINISHED = 'fully_finished',
  FURNISHED = 'furnished',
}

export enum UnitView {
  GARDEN = 'garden',
  SEA = 'sea',
  POOL = 'pool',
  CITY = 'city',
  STREET = 'street',
}

export enum Region {
  EAST_CAIRO = 'East Cairo',
  WEST_CAIRO = 'West Cairo',
  NORTH_COAST = 'North Coast',
  RED_SEA = 'Red Sea',
  ALEXANDRIA = 'Alexandria',
  DELTA = 'Delta & Canal',
}

registerEnumType(PropertyType, { name: 'PropertyType' });
registerEnumType(Finishing, { name: 'Finishing' });
registerEnumType(UnitView, { name: 'UnitView' });
