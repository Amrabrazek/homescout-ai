'use server';

import { getServerClient } from '@/lib/apollo/client';
import {
  CREATE_UNIT,
  UPDATE_UNIT,
  CREATE_IMAGE,
  DELETE_UNIT,
} from './mutations';
import { UnitFormValues } from '@/lib/graphql/units/schema';
import { revalidatePath } from 'next/cache';

// Action to create a unit
export async function createUnit(data: UnitFormValues) {
  try {
    const client = getServerClient();
    const response = await client.mutate({
      mutation: CREATE_UNIT,
      variables: {
        createUnitInput: data,
      },
    });

    // Return the data so the component can handle the redirect
    return {
      success: true,
      data: response.data.createUnit,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create unit',
    };
  }
}

// Action to update a unit
export async function updateUnit(data: UnitFormValues) {
  try {
    console.log('data', data);
    const client = getServerClient();
    const response = await client.mutate({
      mutation: UPDATE_UNIT,
      variables: {
        updateUnitInput: data,
      },
    });

    // Revalidate paths to update the UI
    revalidatePath(`/dashboard/units/${response.data.updateUnit.id}`);
    revalidatePath(`/unit/${response.data.updateUnit.id}`); // Also revalidate the public view page if it exists

    return {
      success: true,
      data: response.data.updateUnit,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update unit',
    };
  }
}

// Action to delete a unit
export async function deleteUnit(id: string) {
  try {
    const client = getServerClient();
    const response = await client.mutate({
      mutation: DELETE_UNIT,
      variables: {
        id,
      },
    });

    // Revalidate paths to update the UI
    revalidatePath('/dashboard/units');
    revalidatePath('/'); // Revalidate home page to update listings

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete unit',
    };
  }
}

// Action to create an image entity via GraphQL
export async function createImageEntity({
  url,
  altText,
}: {
  url: string;
  altText: string;
}) {
  try {
    const client = getServerClient();
    const response = await client.mutate({
      mutation: CREATE_IMAGE,
      variables: {
        createImageInput: {
          url,
          alt_text: altText,
        },
      },
    });

    return {
      success: true,
      data: response.data.createImage,
    };
  } catch (error: any) {
    console.error('Failed to create image entity:', error);
    return {
      success: false,
      error: error.message || 'Failed to create image entity',
    };
  }
}
