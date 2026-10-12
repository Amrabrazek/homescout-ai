import { gql } from '@apollo/client';

export const MATCHED_UNIT_FIELDS = gql`
  fragment MatchedUnitCard on Unit {
    id
    name
    number
    floor
    rooms
    bathrooms
    floorArea
    price
    createdAt
    propertyType
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
`;

export const FOR_YOU = gql`
  ${MATCHED_UNIT_FIELDS}
  query ForYou($section: FeedSection!, $limit: Int!, $since: DateTime) {
    forYou(section: $section, limit: $limit, since: $since) {
      section
      coldStart
      items {
        matchScore
        reasons
        unit {
          ...MatchedUnitCard
        }
      }
    }
  }
`;
