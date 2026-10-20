import { gql } from '@apollo/client';

const BUYER_PROFILE_FIELDS = gql`
  fragment BuyerProfileFields on BuyerProfile {
    id
    budgetMin
    budgetMax
    areas
    propertyTypes
    minRooms
    minSize
    amenityIds
    savedUnitIds
    hasTasteVector
    activity {
      views
      saves
      skips
    }
    facts {
      id
      text
    }
  }
`;

export const MY_PROFILE = gql`
  ${BUYER_PROFILE_FIELDS}
  query MyProfile {
    myProfile {
      ...BuyerProfileFields
    }
  }
`;

export const SAVED_UNITS = gql`
  query SavedUnits {
    savedUnits {
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
  }
`;

export const PREFERENCE_OPTIONS = gql`
  query PreferenceOptions {
    projects(limit: 1000) {
      id
      area
    }
    amenities {
      id
      name
    }
  }
`;

export const UPDATE_PREFERENCES = gql`
  ${BUYER_PROFILE_FIELDS}
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      ...BuyerProfileFields
    }
  }
`;

export const RESET_PROFILE = gql`
  ${BUYER_PROFILE_FIELDS}
  mutation ResetProfile {
    resetProfile {
      ...BuyerProfileFields
    }
  }
`;

export const RECORD_BUYER_EVENT = gql`
  mutation RecordBuyerEvent($unitId: String!, $type: BuyerEventType!) {
    recordBuyerEvent(unitId: $unitId, type: $type)
  }
`;

export const FORGET_FACT = gql`
  mutation ForgetFact($id: ID!) {
    forgetFact(id: $id)
  }
`;

export const UNSAVE_UNIT = gql`
  mutation UnsaveUnit($unitId: String!) {
    unsaveUnit(unitId: $unitId)
  }
`;
