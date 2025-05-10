import { gql } from '@apollo/client';

export const GET_DEVELOPERS = gql`
  query GetDevelopers {
    developers {
      id
      name
    }
  }
`;
