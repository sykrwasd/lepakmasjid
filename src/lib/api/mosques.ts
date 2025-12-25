import { pb } from '../pocketbase';
import type { Mosque, MosqueFilters, MosqueWithDetails } from '@/types';
import type { Amenity, MosqueAmenity, Activity } from '@/types';
import { createFormDataWithImage, validateImageFile } from '../pocketbase-images';

// Helper function to fetch and attach amenities to mosques
async function attachAmenitiesToMosques(mosques: Mosque[]): Promise<Mosque[]> {
  if (mosques.length === 0) {
    return mosques;
  }

  try {
    const mosqueIds = mosques.map(m => m.id);
    const mosqueIdsFilter = mosqueIds.map(id => `mosque_id = "${id}"`).join(' || ');
    
    const amenitiesResult = await pb.collection('mosque_amenities').getList(1, 500, {
      filter: `(${mosqueIdsFilter})`,
      expand: 'amenity_id',
    });
    
    // Group amenities by mosque_id
    const amenitiesByMosque: Record<string, (Amenity & { details: any; verified: boolean })[]> = {};
    const customAmenitiesByMosque: Record<string, MosqueAmenity[]> = {};
    
    amenitiesResult.items.forEach((item: any) => {
      const mosqueId = item.mosque_id;
      
      if (item.amenity_id && item.expand?.amenity_id) {
        // Regular amenity
        if (!amenitiesByMosque[mosqueId]) {
          amenitiesByMosque[mosqueId] = [];
        }
        amenitiesByMosque[mosqueId].push({
          ...item.expand.amenity_id,
          details: item.details || {},
          verified: item.verified || false,
        });
      } else {
        // Custom amenity
        if (!customAmenitiesByMosque[mosqueId]) {
          customAmenitiesByMosque[mosqueId] = [];
        }
        customAmenitiesByMosque[mosqueId].push({
          id: item.id,
          mosque_id: item.mosque_id,
          amenity_id: null,
          details: item.details || {},
          verified: item.verified || false,
          created: item.created,
          updated: item.updated,
        });
      }
    });
    
    // Attach amenities to mosques
    return mosques.map(mosque => ({
      ...mosque,
      amenities: amenitiesByMosque[mosque.id] || [],
      customAmenities: customAmenitiesByMosque[mosque.id] || [],
    })) as Mosque[];
  } catch (amenitiesError: any) {
    // If amenities fetch fails, return mosques without amenities
    console.warn('Failed to fetch amenities:', amenitiesError);
    return mosques;
  }
}

export const mosquesApi = {
  // List mosques with filters
  async list(filters?: MosqueFilters): Promise<Mosque[]> {
    try {
      // Build filter parts
      const filterParts: string[] = [];
      
      // Try to filter by approved status
      filterParts.push('status = "approved"');
      
      if (filters) {
        if (filters.state && filters.state !== 'all') {
          filterParts.push(`state = "${filters.state}"`);
        }
        
        if (filters.amenities && filters.amenities.length > 0) {
          // This requires a join query - simplified for now
          // In production, you'd need to query mosque_amenities and join
        }
        
        if (filters.search && filters.search.trim()) {
          const searchLower = filters.search.toLowerCase().trim();
          // Escape quotes in search term to prevent filter syntax errors
          const escapedSearch = searchLower.replace(/"/g, '\\"');
          filterParts.push(`(name ~ "${escapedSearch}" || address ~ "${escapedSearch}" || state ~ "${escapedSearch}")`);
        }
      }
      
      const filterString = filterParts.join(' && ');
      const sortString = filters?.sortBy ? this.getSortString(filters.sortBy) : '-created';
      
      // Try query with status filter
      try {
        const result = await pb.collection('mosques').getList(1, 50, {
          filter: filterString,
          sort: sortString,
        });
        const mosques = result.items as unknown as Mosque[];
        
        // Fetch and attach amenities to mosques
        return await attachAmenitiesToMosques(mosques);
      } catch (statusError: any) {
        // If status filter fails with 400, try without it
        if (statusError.status === 400) {
          console.warn('⚠️ Query with status filter failed, trying without status filter');
          
          // Build filter without status
          const filterPartsNoStatus: string[] = [];
          
          if (filters) {
            if (filters.state && filters.state !== 'all') {
              filterPartsNoStatus.push(`state = "${filters.state}"`);
            }
            
            if (filters.search && filters.search.trim()) {
              const searchLower = filters.search.toLowerCase().trim();
              const escapedSearch = searchLower.replace(/"/g, '\\"');
              filterPartsNoStatus.push(`(name ~ "${escapedSearch}" || address ~ "${escapedSearch}" || state ~ "${escapedSearch}")`);
            }
          }
          
          const filterStringNoStatus = filterPartsNoStatus.length > 0 ? filterPartsNoStatus.join(' && ') : undefined;
          
          try {
            const result = await pb.collection('mosques').getList(1, 50, {
              ...(filterStringNoStatus && { filter: filterStringNoStatus }),
              sort: sortString,
            });
            
            // Filter client-side by status if available
            const items = result.items as unknown as Mosque[];
            const mosques = items.filter((mosque: any) => !mosque.status || mosque.status === 'approved');
            
            // Fetch and attach amenities to mosques
            return await attachAmenitiesToMosques(mosques);
          } catch (noStatusError: any) {
            // If even the query without status fails, try the most basic query
            console.warn('⚠️ Query without status filter also failed, trying basic query');
            
            try {
              const result = await pb.collection('mosques').getList(1, 50);
              const items = result.items as unknown as Mosque[];
              // Filter client-side by status and other filters if available
              let filtered = items.filter((mosque: any) => !mosque.status || mosque.status === 'approved');
              
              if (filters) {
                if (filters.state && filters.state !== 'all') {
                  filtered = filtered.filter((m: any) => m.state === filters.state);
                }
                if (filters.search && filters.search.trim()) {
                  const searchLower = filters.search.toLowerCase().trim();
                  filtered = filtered.filter((m: any) => 
                    m.name?.toLowerCase().includes(searchLower) ||
                    m.address?.toLowerCase().includes(searchLower) ||
                    m.state?.toLowerCase().includes(searchLower)
                  );
                }
              }
              
              // Fetch and attach amenities to mosques
              return await attachAmenitiesToMosques(filtered);
            } catch (basicError: any) {
              // Log the actual error from PocketBase
              console.error('❌ All query attempts failed');
              console.error('Basic query error:', {
                status: basicError.status,
                message: basicError.message,
                data: basicError.data,
                url: basicError.url,
              });
              
              throw new Error(
                basicError.data?.message || 
                basicError.message || 
                'Failed to fetch mosques. The collection may not exist or may not be accessible.'
              );
            }
          }
        } else {
          // Re-throw if it's not a 400 error
          throw statusError;
        }
      }
    } catch (error: any) {
      console.error('Error fetching mosques:', error);
      
      // Log detailed error information
      if (error.data) {
        console.error('Error data:', JSON.stringify(error.data, null, 2));
      }
      if (error.response) {
        console.error('Error response:', error.response);
      }
      
      throw new Error(
        error.data?.message || 
        error.message || 
        'Failed to fetch mosques. Please check your connection and verify the collection exists.'
      );
    }
  },

  // Get single mosque with details
  async get(id: string): Promise<MosqueWithDetails> {
    try {
      const mosque = await pb.collection('mosques').getOne(id) as unknown as Mosque;
      
      // Fetch related amenities
      const amenitiesResult = await pb.collection('mosque_amenities').getList(1, 100, {
        filter: `mosque_id = "${id}"`,
        expand: 'amenity_id',
      });
      
      const amenities = amenitiesResult.items.map((item: any) => ({
        ...(item.expand?.amenity_id || {}),
        details: item.details || {},
        verified: item.verified || false,
      })) as (Amenity & { details: any; verified: boolean })[];
      
      // Fetch custom amenities (where amenity_id is null)
      const customAmenities = amenitiesResult.items
        .filter((item: any) => !item.amenity_id)
        .map((item: any) => ({
          id: item.id,
          mosque_id: item.mosque_id,
          amenity_id: null,
          details: item.details || {},
          verified: item.verified || false,
          created: item.created,
          updated: item.updated,
        })) as MosqueAmenity[];
      
      // Fetch activities
      const activitiesResult = await pb.collection('activities').getList(1, 100, {
        filter: `mosque_id = "${id}" && status = "active"`,
        sort: '-created',
      });
      
      const activities = activitiesResult.items as unknown as Activity[];
      
      return {
        ...mosque,
        amenities,
        customAmenities,
        activities,
      };
    } catch (error: any) {
      console.error('Error fetching mosque details:', error);
      if (error.status === 404) {
        throw new Error('Mosque not found');
      }
      throw new Error(error.message || 'Failed to fetch mosque details. Please check your connection.');
    }
  },

  // Create mosque (for submissions)
  async create(data: Partial<Mosque>, imageFile?: File): Promise<Mosque> {
    // If image file is provided, validate it first
    if (imageFile) {
      const validationError = validateImageFile(imageFile);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    // If we have an image file, use FormData
    if (imageFile) {
      const formData = createFormDataWithImage(data, imageFile, 'image');
      return await pb.collection('mosques').create(formData) as unknown as Mosque;
    }

    // Otherwise, create normally
    return await pb.collection('mosques').create(data) as unknown as Mosque;
  },

  // Update mosque
  async update(id: string, data: Partial<Mosque>, imageFile?: File): Promise<Mosque> {
    // If image file is provided, validate it first
    if (imageFile) {
      const validationError = validateImageFile(imageFile);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    // If we have an image file, use FormData
    if (imageFile) {
      const formData = createFormDataWithImage(data, imageFile, 'image');
      return await pb.collection('mosques').update(id, formData) as unknown as Mosque;
    }

    // Otherwise, update normally
    return await pb.collection('mosques').update(id, data) as unknown as Mosque;
  },

  // Delete mosque
  async delete(id: string): Promise<boolean> {
    await pb.collection('mosques').delete(id);
    return true;
  },

  // Helper to get sort string
  getSortString(sortBy?: string): string {
    switch (sortBy) {
      case 'alphabetical':
        return 'name';
      case 'most_amenities':
        return '-created'; // Placeholder - would need aggregation
      case 'nearest':
        return '-created'; // Placeholder - would need geospatial query
      default:
        return '-created';
    }
  },
};

