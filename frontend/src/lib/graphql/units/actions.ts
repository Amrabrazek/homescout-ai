'use server';

import { getServerClient } from '@/lib/apollo/client';
import {
  CREATE_UNIT,
  UPDATE_UNIT,
  CREATE_IMAGE,
  DELETE_UNIT,
} from './mutations';
import { UnitFormValues } from '@/lib/graphql/units/schema';
import { revalidatePath, revalidateTag } from 'next/cache';
import { UNITS_CACHE_TAG } from './server.loaders';

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

    revalidateTag(UNITS_CACHE_TAG);
    revalidatePath('/');

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
    const client = getServerClient();
    const response = await client.mutate({
      mutation: UPDATE_UNIT,
      variables: {
        updateUnitInput: data,
      },
    });

    revalidateTag(UNITS_CACHE_TAG);
    revalidatePath(`/dashboard/units/${response.data.updateUnit.id}`);
    revalidatePath(`/unit/${response.data.updateUnit.id}`);

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

    revalidateTag(UNITS_CACHE_TAG);
    revalidatePath('/');

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
    // Make sure the URL is properly formatted
    const formattedUrl = url.trim();

    const client = getServerClient();
    const response = await client.mutate({
      mutation: CREATE_IMAGE,
      variables: {
        createImageInput: {
          url: formattedUrl,
          altText,
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
