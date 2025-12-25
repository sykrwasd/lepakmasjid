/**
 * Example: Mosque Image Upload Component
 * 
 * This is a complete example showing how to upload a mosque with an image.
 * Copy and adapt this code for your use case.
 */

import { useState, useEffect } from 'react';
import { mosquesApi } from '@/lib/api/mosques';
import { validateImageFile, getImageUrl } from '@/lib/pocketbase-images';
import { pb } from '@/lib/pocketbase';
import type { Mosque } from '@/types';

export function MosqueImageUploadExample() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    state: '',
    lat: 0,
    lng: 0,
    description: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdMosque, setCreatedMosque] = useState<Mosque | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lat' || name === 'lng' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate the image file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = ''; // Clear the input
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }

    setError(null);
    setImageFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check authentication
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        throw new Error('You must be logged in to create a mosque');
      }

      // Prepare mosque data
      const mosqueData = {
        ...formData,
        created_by: currentUser.id,
        status: 'pending' as const,
      };

      // Create mosque with image
      const mosque = await mosquesApi.create(mosqueData, imageFile || undefined);
      
      setCreatedMosque(mosque);
      alert('Mosque submitted successfully!');
      
      // Reset form
      setFormData({
        name: '',
        address: '',
        state: '',
        lat: 0,
        lng: 0,
        description: '',
      });
      setImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      console.error('Error creating mosque:', err);
      setError(err.message || 'Failed to create mosque. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Mosque</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {createdMosque && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p>Mosque created successfully!</p>
          {createdMosque.image && (
            <img 
              src={getImageUrl(createdMosque, createdMosque.image, '400x300') || ''} 
              alt={createdMosque.name}
              className="mt-2 max-w-xs rounded"
            />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Mosque Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium mb-1">
            State *
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lat" className="block text-sm font-medium mb-1">
              Latitude *
            </label>
            <input
              type="number"
              id="lat"
              name="lat"
              value={formData.lat}
              onChange={handleInputChange}
              required
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium mb-1">
              Longitude *
            </label>
            <input
              type="number"
              id="lng"
              name="lng"
              value={formData.lng}
              onChange={handleInputChange}
              required
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium mb-1">
            Mosque Image
          </label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="mt-1 text-sm text-gray-500">
            Max size: 5MB. Allowed formats: JPEG, PNG, WebP, GIF
          </p>
          
          {previewUrl && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-xs rounded-md border border-gray-300"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Mosque'}
        </button>
      </form>
    </div>
  );
}

// Example: Displaying a mosque with its image
export function MosqueImageDisplay({ mosque }: { mosque: Mosque }) {
  const imageUrl = getImageUrl(mosque, mosque.image, '400x300');

  return (
    <div className="mosque-card">
      <h3>{mosque.name}</h3>
      <p>{mosque.address}</p>
      
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={mosque.name}
          className="w-full h-48 object-cover rounded"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded">
          <span className="text-gray-500">No image available</span>
        </div>
      )}
    </div>
  );
}

