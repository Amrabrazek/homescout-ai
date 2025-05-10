import { gql } from '@apollo/client';

export const GET_UNITS = gql`
  query GetUnits($filter: UnitFilterInput, $limit: Int, $offset: Int) {
    units(filter: $filter, limit: $limit, offset: $offset) {
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

export const GET_PROJECTS = gql`
  query GetProjects($searchTerm: String, $limit: Int, $offset: Int) {
    projects(searchTerm: $searchTerm, limit: $limit, offset: $offset) {
      id
      name
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
