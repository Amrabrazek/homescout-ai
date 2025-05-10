'use server';

import { getServerClient } from '@/lib/apollo/client';
import { CREATE_UNIT, UPDATE_UNIT, UPLOAD_IMAGES } from './mutations';
import { UnitFormValues } from '@/lib/graphql/units/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

    // Revalidate paths to update the UI
    redirect(`/dashboard/units/${response.data.createUnit.id}`);

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

// Note: Image uploads typically need to be handled differently
// as they involve file uploads which don't work directly with server actions
// This is just a placeholder to demonstrate the pattern
export async function uploadImages(files: any[]) {
  try {
    // This would need special handling for file uploads
    // In a real implementation, you might use a direct API route
    // or a third-party storage solution like Supabase Storage
    const client = getServerClient();
    const response = await client.mutate({
      mutation: UPLOAD_IMAGES,
      variables: {
        files,
      },
    });

    return {
      success: true,
      data: response.data.uploadImages,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload images',
    };
  }
}
