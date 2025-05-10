import { gql } from '@apollo/client';

export const GET_PROJECTS = gql`
  query GetProjects(
    $searchTerm: String
    $limit: Int
    $offset: Int
    $developerId: String
  ) {
    projects(
      searchTerm: $searchTerm
      limit: $limit
      offset: $offset
      developerId: $developerId
    ) {
      id
      name
      developer {
        id
        name
      }
    }
  }
`;
