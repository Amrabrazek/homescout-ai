import { gql } from '@apollo/client';

// Unit mutations
export const CREATE_UNIT = gql`
  mutation CreateUnit($createUnitInput: CreateUnitInput!) {
    createUnit(createUnitInput: $createUnitInput) {
      id
      name
    }
  }
`;

export const UPDATE_UNIT = gql`
  mutation UpdateUnit($updateUnitInput: UpdateUnitInput!) {
    updateUnit(updateUnitInput: $updateUnitInput) {
      id
      name
    }
  }
`;

export const DELETE_UNIT = gql`
  mutation DeleteUnit($id: String!) {
    deleteUnit(id: $id) {
      id
      name
    }
  }
`;

// Image upload mutation (legacy approach)
export const UPLOAD_IMAGES = gql`
  mutation UploadImages($files: [Upload!]!) {
    uploadImages(files: $files) {
      id
      url
      altText
    }
  }
`;

// Registers an uploaded image so it can be attached to units
export const CREATE_IMAGE = gql`
  mutation CreateImage($createImageInput: CreateImageInput!) {
    createImage(createImageInput: $createImageInput) {
      id
      url
      altText
    }
  }
`;

export const REJECT_SEARCH_GUESS = gql`
  mutation RejectSearchGuess($searchTerm: String!) {
    rejectSearchGuess(searchTerm: $searchTerm)
  }
`;
