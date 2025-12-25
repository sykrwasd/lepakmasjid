# Image Storage Setup Summary

This document summarizes what was set up for storing mosque images in PocketBase.

## What Was Done

### 1. Collection Schema Updated
- Added `image` field to the `mosques` collection
- Field type: `file`
- Max size: 5MB
- Allowed types: JPEG, PNG, WebP, GIF
- Max files: 1 (single image per mosque)

### 2. TypeScript Types Updated
- Updated `Mosque` interface in `src/types/index.ts` to include `image` field
- Type supports: `string | File | string[]` (filename, upload file, or array)

### 3. Helper Functions Created
Created `src/lib/pocketbase-images.ts` with utilities:
- `getImageUrl()` - Get image URL with optional thumbnail
- `getImageUrls()` - Get multiple image URLs
- `validateImageFile()` - Validate images before upload
- `createFormDataWithImage()` - Create FormData with image for upload

### 4. API Methods Updated
Updated `src/lib/api/mosques.ts`:
- `create()` - Now accepts optional `imageFile` parameter
- `update()` - Now accepts optional `imageFile` parameter
- Both methods validate images before upload

### 5. Collection Creation Script Updated
Updated `scripts/create-collections.js`:
- Added image field to mosques collection definition
- Updated `formatField()` to handle file fields correctly

## Next Steps

### 1. Update Your PocketBase Collection

If your `mosques` collection already exists, you need to add the image field:

**Option A: Run the setup script (Recommended)**
```powershell
npm run setup:collections
```

This will update existing collections with new fields.

**Option B: Manual via Admin Panel**
1. Go to your PocketBase Admin Panel: `https://pb.muazhazali.me/_/`
2. Navigate to Collections → mosques
3. Click "Add new field"
4. Configure:
   - Name: `image`
   - Type: `File`
   - Required: No
   - Max files: 1
   - Max size: 5242880 (5MB)
   - MIME types: `image/jpeg,image/png,image/webp,image/gif`

### 2. Test Image Upload

You can test the image upload functionality using the example in:
- `docs/examples/mosque-image-upload-example.tsx`

Or create a simple test:

```typescript
import { mosquesApi } from '@/lib/api/mosques';
import { pb } from '@/lib/pocketbase';

// Make sure you're authenticated
await pb.collection('users').authWithPassword('your-email@example.com', 'password');

// Create a mosque with image
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';

fileInput.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const mosque = await mosquesApi.create({
      name: 'Test Mosque',
      address: 'Test Address',
      state: 'WP Kuala Lumpur',
      lat: 3.1498,
      lng: 101.6957,
      created_by: pb.authStore.model?.id || '',
      status: 'pending',
    }, file);
    
    console.log('Mosque created:', mosque);
  }
};
```

### 3. Display Images in Your UI

Use the helper function to get image URLs:

```tsx
import { getImageUrl } from '@/lib/pocketbase-images';

function MosqueCard({ mosque }) {
  const imageUrl = getImageUrl(mosque, mosque.image, '400x300');
  
  return (
    <div>
      <h3>{mosque.name}</h3>
      {imageUrl ? (
        <img src={imageUrl} alt={mosque.name} />
      ) : (
        <div>No image</div>
      )}
    </div>
  );
}
```

## Files Modified

1. `scripts/create-collections.js` - Added image field to collection schema
2. `src/types/index.ts` - Added image field to Mosque interface
3. `src/lib/pocketbase-images.ts` - **NEW** - Helper functions for image handling
4. `src/lib/api/mosques.ts` - Updated create/update methods to support images

## Files Created

1. `docs/POCKETBASE_IMAGE_STORAGE.md` - Complete documentation guide
2. `docs/examples/mosque-image-upload-example.tsx` - Example component
3. `docs/IMAGE_SETUP_SUMMARY.md` - This file

## Documentation

For detailed information, see:
- **Main Guide**: `docs/POCKETBASE_IMAGE_STORAGE.md`
- **Example Code**: `docs/examples/mosque-image-upload-example.tsx`

## Quick Reference

### Upload Image
```typescript
const mosque = await mosquesApi.create(mosqueData, imageFile);
```

### Get Image URL
```typescript
const imageUrl = getImageUrl(mosque, mosque.image, '300x300');
```

### Validate Image
```typescript
const error = validateImageFile(file);
if (error) {
  console.error(error);
}
```

## Troubleshooting

If images don't work:
1. Verify the `image` field exists in your PocketBase collection
2. Check file size (must be ≤ 5MB)
3. Verify file type is allowed
4. Ensure user is authenticated
5. Check browser console for errors

For more help, see the troubleshooting section in `docs/POCKETBASE_IMAGE_STORAGE.md`.

