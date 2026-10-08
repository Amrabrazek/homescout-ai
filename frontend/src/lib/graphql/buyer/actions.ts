'use server';

import { revalidatePath } from 'next/cache';
import { asBuyer } from './server';
import { RESET_PROFILE, UNSAVE_UNIT, UPDATE_PREFERENCES } from './queries';
import { PreferencesFormInput, preferencesSchema } from './schema';
import type { BuyerProfile } from './types';

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function updatePreferences(
  values: PreferencesFormInput
): Promise<Result<BuyerProfile>> {
  try {
    const input = preferencesSchema.parse(values);
    const data = await asBuyer<{ updatePreferences: BuyerProfile }>(
      { mutation: UPDATE_PREFERENCES },
      { input }
    );
    revalidatePath('/preferences');
    return { success: true, data: data.updatePreferences };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save preferences',
    };
  }
}

export async function resetProfile(): Promise<Result<BuyerProfile>> {
  try {
    const data = await asBuyer<{ resetProfile: BuyerProfile }>({
      mutation: RESET_PROFILE,
    });
    revalidatePath('/preferences');
    return { success: true, data: data.resetProfile };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reset' };
  }
}

export async function unsaveUnit(unitId: string): Promise<Result<true>> {
  try {
    await asBuyer({ mutation: UNSAVE_UNIT }, { unitId });
    revalidatePath('/preferences');
    return { success: true, data: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to unsave' };
  }
}
