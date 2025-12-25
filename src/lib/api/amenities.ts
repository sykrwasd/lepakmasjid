import { pb } from '../pocketbase';
import type { Amenity } from '@/types';
import { sanitizeError } from '../error-handler';

export const amenitiesApi = {
  // List all amenities
  async list(): Promise<Amenity[]> {
    try {
      const result = await pb.collection('amenities').getList(1, 100, {
        sort: 'order',
      });
      return result.items as unknown as Amenity[];
    } catch (error: any) {
      // Sanitize error to prevent information disclosure
      if (error.status === 403) {
        throw new Error('Access denied. Please check your permissions.');
      }
      throw sanitizeError(error);
    }
  },

  // Get single amenity
  async get(id: string): Promise<Amenity> {
    return await pb.collection('amenities').getOne(id) as unknown as Amenity;
  },
};

