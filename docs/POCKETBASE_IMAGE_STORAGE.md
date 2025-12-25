# PocketBase Image Storage Guide

This guide explains how to store and manage mosque images in PocketBase.

## Overview

PocketBase has built-in file storage capabilities. Images are stored as file fields in collections and can be accessed via URLs. This guide covers:

1. Setting up the image field in the mosques collection
2. Uploading images when creating/updating mosques
3. Retrieving and displaying images
4. Image validation and best practices

## Collection Setup

The `mosques` collection includes an `image` field of type `file` with the following configuration:

- **Type**: File
- **Required**: No (optional)
- **Max Files**: 1 (single image per mosque)
- **Max Size**: 5MB
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`

### Creating/Updating the Collection

To add the image field to your existing mosques collection, run:

```powershell
npm run setup:collections
```

This script will:
- Check if the collection exists
- Add the `image` field if it doesn't exist
- Update permissions if needed

**Note**: If the collection already exists, you may need to manually add the field through the PocketBase Admin Panel or update the collection programmatically.

## Uploading Images

### Method 1: Using the Helper Functions (Recommended)

The easiest way to upload images is using the helper functions in `src/lib/pocketbase-images.ts`:

```typescript
import { mosquesApi } from '@/lib/api/mosques';
import { validateImageFile } from '@/lib/pocketbase-images';

// Get file from input
const fileInput = document.getElementById('imageInput') as HTMLInputElement;
const imageFile = fileInput.files?.[0];

if (imageFile) {
  // Validate the file first
  const validationError = validateImageFile(imageFile);
  if (validationError) {
    console.error(validationError);
    return;
  }

  // Create mosque with image
  const mosqueData = {
    name: 'Masjid Jamek',
    address: 'Jalan Tun Perak',
    state: 'WP Kuala Lumpur',
    lat: 3.1498,
    lng: 101.6957,
    created_by: currentUserId,
    status: 'pending',
  };

  const mosque = await mosquesApi.create(mosqueData, imageFile);
}
```

### Method 2: Using FormData Directly

You can also use FormData directly with PocketBase:

```typescript
import { pb } from '@/lib/pocketbase';
import { createFormDataWithImage } from '@/lib/pocketbase-images';

const mosqueData = {
  name: 'Masjid Jamek',
  address: 'Jalan Tun Perak',
  state: 'WP Kuala Lumpur',
  lat: 3.1498,
  lng: 101.6957,
  created_by: currentUserId,
  status: 'pending',
};

const formData = createFormDataWithImage(mosqueData, imageFile, 'image');
const mosque = await pb.collection('mosques').create(formData);
```

### Method 3: Using Plain FormData

For more control, you can create FormData manually:

```typescript
import { pb } from '@/lib/pocketbase';

const formData = new FormData();
formData.append('name', 'Masjid Jamek');
formData.append('address', 'Jalan Tun Perak');
formData.append('state', 'WP Kuala Lumpur');
formData.append('lat', '3.1498');
formData.append('lng', '101.6957');
formData.append('created_by', currentUserId);
formData.append('status', 'pending');

// Add the image file
if (imageFile) {
  formData.append('image', imageFile);
}

const mosque = await pb.collection('mosques').create(formData);
```

## Updating Images

To update an existing mosque's image:

```typescript
import { mosquesApi } from '@/lib/api/mosques';

const imageFile = fileInput.files?.[0];

if (imageFile) {
  // Update mosque with new image
  const updatedMosque = await mosquesApi.update(mosqueId, {}, imageFile);
  
  // Or update with other fields too
  const updatedMosque = await mosquesApi.update(
    mosqueId,
    { name: 'New Name' },
    imageFile
  );
}
```

**Note**: When you update a file field, PocketBase automatically deletes the old file.

## Retrieving and Displaying Images

### Getting Image URLs

Use the `getImageUrl` helper function to get the full URL for an image:

```typescript
import { getImageUrl } from '@/lib/pocketbase-images';
import { mosquesApi } from '@/lib/api/mosques';

// Fetch mosque
const mosque = await mosquesApi.get(mosqueId);

// Get image URL
const imageUrl = getImageUrl(mosque, mosque.image);

// Get thumbnail URL (300x300)
const thumbnailUrl = getImageUrl(mosque, mosque.image, '300x300');
```

### Displaying Images in React

```tsx
import { getImageUrl } from '@/lib/pocketbase-images';
import { Mosque } from '@/types';

function MosqueImage({ mosque }: { mosque: Mosque }) {
  const imageUrl = getImageUrl(mosque, mosque.image, '400x300');

  if (!imageUrl) {
    return (
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        <span>No image available</span>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={mosque.name}
      className="w-full h-48 object-cover"
    />
  );
}
```

### Using Thumbnails

PocketBase automatically generates thumbnails when you request them. The format is `WIDTHxHEIGHT`:

```typescript
// Small thumbnail
const smallThumb = getImageUrl(mosque, mosque.image, '150x150');

// Medium thumbnail
const mediumThumb = getImageUrl(mosque, mosque.image, '300x300');

// Large thumbnail
const largeThumb = getImageUrl(mosque, mosque.image, '800x600');

// Original size (no thumbnail)
const original = getImageUrl(mosque, mosque.image);
```

## Image Validation

Always validate images before uploading:

```typescript
import { validateImageFile } from '@/lib/pocketbase-images';

function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  const error = validateImageFile(file);
  if (error) {
    alert(error);
    event.target.value = ''; // Clear the input
    return;
  }

  // File is valid, proceed with upload
  setSelectedImage(file);
}
```

### Custom Validation

You can customize validation:

```typescript
// Custom max size (10MB)
const error = validateImageFile(file, 10 * 1024 * 1024);

// Custom allowed types
const error = validateImageFile(
  file,
  5242880, // 5MB
  ['image/jpeg', 'image/png'] // Only JPEG and PNG
);
```

## Complete Example: Mosque Form with Image Upload

Here's a complete example of a form that uploads a mosque with an image:

```tsx
import { useState } from 'react';
import { mosquesApi } from '@/lib/api/mosques';
import { validateImageFile, getImageUrl } from '@/lib/pocketbase-images';
import { pb } from '@/lib/pocketbase';

function MosqueForm() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    setError(null);
    setImageFile(file);
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        throw new Error('You must be logged in');
      }

      const mosqueData = {
        name,
        address,
        state,
        lat,
        lng,
        created_by: currentUser.id,
        status: 'pending' as const,
      };

      const mosque = await mosquesApi.create(mosqueData, imageFile || undefined);
      
      console.log('Mosque created:', mosque);
      alert('Mosque submitted successfully!');
      
      // Reset form
      setName('');
      setAddress('');
      setState('');
      setLat(0);
      setLng(0);
      setImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create mosque');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Mosque Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label>Address</label>
        <input 
          type="text" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label>State</label>
        <input 
          type="text" 
          value={state} 
          onChange={(e) => setState(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label>Image</label>
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
        />
        {error && <div className="error">{error}</div>}
        {previewUrl && (
          <img 
            src={previewUrl} 
            alt="Preview" 
            style={{ maxWidth: '300px', marginTop: '10px' }}
          />
        )}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Best Practices

1. **Always validate images** before uploading to prevent errors and ensure good UX
2. **Use thumbnails** for list views to improve performance
3. **Handle missing images** gracefully with fallback UI
4. **Clean up object URLs** when using `URL.createObjectURL()` for previews
5. **Set appropriate file size limits** (5MB is a good default)
6. **Use appropriate image formats** (WebP for modern browsers, JPEG/PNG for compatibility)
7. **Consider image optimization** before upload for better performance

## Troubleshooting

### Image not displaying

1. Check that the image field exists in the collection
2. Verify the filename is correct: `mosque.image` should be a string
3. Check that the record ID is correct
4. Verify PocketBase URL is accessible

### Upload fails

1. Check file size (must be ≤ 5MB)
2. Verify file type is allowed
3. Ensure user is authenticated
4. Check collection permissions (createRule/updateRule)
5. Check browser console for detailed error messages

### Old image not deleted

PocketBase should automatically delete old files when updating. If not:
1. Check that you're using the update method correctly
2. Verify the field name matches exactly ('image')
3. Check PocketBase logs for errors

## API Reference

### Helper Functions

- `getImageUrl(record, filename, thumb?)` - Get image URL with optional thumbnail
- `getImageUrls(record, filenames, thumb?)` - Get multiple image URLs
- `validateImageFile(file, maxSize?, allowedTypes?)` - Validate image before upload
- `createFormDataWithImage(data, imageFile, fieldName?)` - Create FormData with image

### API Methods

- `mosquesApi.create(data, imageFile?)` - Create mosque with optional image
- `mosquesApi.update(id, data, imageFile?)` - Update mosque with optional image

## Additional Resources

- [PocketBase File Handling Documentation](https://pocketbase.io/docs/files-handling)
- [PocketBase JavaScript SDK](https://github.com/pocketbase/js-sdk)

