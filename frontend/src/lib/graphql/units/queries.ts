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
          area
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
      facets {
        field_name
        counts {
          value
          count
        }
        stats {
          min
          max
          avg
          sum
        }
      }
    }
  }
`;

// New dedicated Typesense search query
export const SEARCH_UNITS = gql`
  query SearchUnits(
    $filter: UnitFilterInput
    $sort: UnitSortInput
    $limit: Int
    $offset: Int
  ) {
    searchUnits(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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
          area
          developer {
            name
          }
        }
        amenities {
          id
          name
        }
        images {
          url
        }
      }
      total
      facets {
        field_name
        counts {
          value
          count
        }
        stats {
          min
          max
          avg
          sum
        }
      }
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
      createdAt
      propertyType
      finishing
      view
      deliveryYear
      downPaymentPct
      installmentYears
      project {
        id
        name
        area
        city
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
      score
      reasons
      unit {
        id
        name
        number
        floor
        rooms
        bathrooms
        floorArea
        price
        createdAt
        images {
          id
          url
          altText
        }
        project {
          id
          name
          area
          developer {
            id
            name
          }
        }
      }
    }
  }
`;

// Add query for efficient facet counts
export const SEARCH_FACETS = gql`
  query SearchFacets($filter: UnitFilterInput) {
    searchFacets(filter: $filter) {
      facets {
        field_name
        counts {
          value
          count
        }
        stats {
          min
          max
          avg
          sum
        }
      }
      total
    }
  }
`;

export const UNDERSTAND_SEARCH = gql`
  query UnderstandSearch($searchTerm: String!) {
    understandSearch(searchTerm: $searchTerm) {
      text
      minRooms
      maxRooms
      minPrice
      maxPrice
      areas
      cities
      regions
      propertyTypes
    }
  }
`;
