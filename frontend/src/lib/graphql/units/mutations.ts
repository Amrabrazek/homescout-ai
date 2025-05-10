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

// Image upload mutation
export const UPLOAD_IMAGES = gql`
  mutation UploadImages($files: [Upload!]!) {
    uploadImages(files: $files) {
      id
      url
      altText
    }
  }
`;
