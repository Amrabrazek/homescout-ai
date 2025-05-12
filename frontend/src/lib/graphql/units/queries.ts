import { gql } from '@apollo/client';

export const GET_UNITS = gql`
  query GetUnits(
    $filter: UnitFilterInput
    $sort: UnitSortInput
    $limit: Int
    $offset: Int
  ) {
    units(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      items {
        id
        name
        number
        floor
        rooms
        bathrooms
        floorArea
        price
        description
        createdAt
        project {
          id
          name
          developer {
            id
            name
          }
        }
        amenities {
          id
          name
          icon
        }
        images {
          id
          url
          altText
        }
      }
      total
    }
  }
`;

export const GET_FILTER_DATA = gql`
  query GetFilterData {
    amenities {
      id
      name
      icon
    }
  }
`;

export const GET_UNIT = gql`
  query GetUnit($id: String!) {
    unit(id: $id) {
      id
      name
      number
      floor
      rooms
      bathrooms
      floorArea
      price
      description
      project {
        id
        name
        developer {
          id
          name
        }
      }
      amenities {
        id
        name
        icon
      }
      images {
        id
        url
        altText
      }
    }
  }
`;

export const SIMILAR_UNITS_QUERY = gql`
  query SimilarUnits($unitId: String!, $limit: Int) {
    similarUnits(unitId: $unitId, limit: $limit) {
      id
      name
      number
      floor
      rooms
      bathrooms
      floorArea
      price
      images {
        id
        url
        altText
      }
      project {
        id
        name
        developer {
          id
          name
        }
      }
    }
  }
`;
