# Encrypted Image Support for Toolbox

## Overview

The Toolbox now fully supports encrypted images from the backend. Images are automatically decrypted when fetched through the new API methods.

## Architecture

```
Backend (Encrypted Images) 
    ↓ 
API Endpoint (/api/items/:id/images/...)
    ↓
toolbox-items-service.js (decrypts using axios-encryption.js)
    ↓
api-bridge.ts (TypeScript wrapper)
    ↓
useDecryptedImage hook (React)
    ↓
Component (displays blob URL)
```

## Quick Start

### Option 1: Using the React Hook (Recommended)

The `useDecryptedImage` hook automatically handles fetching, decryption, caching, and cleanup.

```tsx
import { useDecryptedLatestImage } from '@/hooks/useDecryptedImage'

function ItemCard({ item }) {
  const { imageUrl, loading, error } = useDecryptedLatestImage(item.item_no)
  
  return (
    <img 
      src={imageUrl || '/placeholder.png'} 
      alt={item.item_name}
      className={loading ? 'opacity-50' : ''}
    />
  )
}
```

### Option 2: Using API Bridge Directly

For more control, use the API bridge methods directly:

```tsx
import { apiBridge } from '@/lib/api-bridge'
import { useState, useEffect } from 'react'

function ItemImage({ itemId }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchImage = async () => {
      const result = await apiBridge.getLatestItemImageBlob(itemId)
      if (result.success) {
        setBlobUrl(result.url)
      }
    }
    
    fetchImage()
    
    // Cleanup: revoke blob URL when unmounting
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [itemId])
  
  return <img src={blobUrl || '/placeholder.png'} alt="Item" />
}
```

## Available Methods

### React Hooks

#### `useDecryptedLatestImage(itemId, options)`

Fetch and decrypt the latest image for an item.

```tsx
const { imageUrl, loading, error, retry } = useDecryptedLatestImage(itemId, {
  skip: false,          // Skip fetching if true
  forceRefresh: false   // Bypass cache
})
```

#### `useDecryptedImage(itemId, filename, options)`

Fetch and decrypt a specific image by filename.

```tsx
const { imageUrl, loading, error, retry } = useDecryptedImage(itemId, filename, {
  skip: false,
  forceRefresh: false
})
```

### API Bridge Methods

#### `getLatestItemImageBlob(itemId, forceRefresh?)`

```ts
const result = await apiBridge.getLatestItemImageBlob(itemId)
// Returns: { success: boolean, blob?: Blob, url?: string, error?: string }
```

#### `getItemImageBlob(itemId, filename, forceRefresh?)`

```ts
const result = await apiBridge.getItemImageBlob(itemId, 'image.jpg')
// Returns: { success: boolean, blob?: Blob, url?: string, filename?: string, error?: string }
```

#### `clearItemImageCache(itemId)`

Clear all cached images for a specific item:

```ts
apiBridge.clearItemImageCache(itemId)
```

#### `clearAllImageCache()`

Clear all cached images:

```ts
apiBridge.clearAllImageCache()
```

#### `getImageCacheStats()`

Get cache statistics:

```ts
const stats = apiBridge.getImageCacheStats()
console.log(stats.totalCached) // Number of cached images
```

### Legacy URL Methods (Still Available)

For non-encrypted images or when you need direct URLs:

```ts
const url = apiBridge.getItemLatestImageUrl(itemId)
const url = apiBridge.getItemImageUrl(itemId, 'image.jpg')
```

⚠️ **Note:** These URL methods won't work with encrypted images. Use the blob methods instead.

## Migration Guide

### Before (Not Working with Encrypted Images)

```tsx
function ItemCard({ item }) {
  const imageUrl = apiBridge.getItemLatestImageUrl(item.item_no)
  
  return <img src={imageUrl} alt={item.item_name} />
}
```

### After (Works with Encrypted Images)

```tsx
import { useDecryptedLatestImage } from '@/hooks/useDecryptedImage'

function ItemCard({ item }) {
  const { imageUrl, loading } = useDecryptedLatestImage(item.item_no)
  
  return (
    <img 
      src={imageUrl || '/placeholder.png'} 
      alt={item.item_name}
      className={loading ? 'animate-pulse' : ''}
    />
  )
}
```

## Examples

### Enhanced Item Card with Error Handling

```tsx
import { useDecryptedLatestImage } from '@/hooks/useDecryptedImage'

function EnhancedItemCard({ item }) {
  const { imageUrl, loading, error, retry } = useDecryptedLatestImage(item.item_no)
  
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-red-500">Failed to load image</p>
        <button onClick={retry} className="text-xs underline">
          Retry
        </button>
      </div>
    )
  }
  
  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      )}
      <img 
        src={imageUrl || '/placeholder.png'} 
        alt={item.item_name}
        className={loading ? 'opacity-50' : ''}
      />
    </div>
  )
}
```

### Image Gallery with Specific Files

```tsx
import { useDecryptedImage } from '@/hooks/useDecryptedImage'

function ImageGallery({ itemId, images }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img) => (
        <GalleryImage key={img.filename} itemId={itemId} filename={img.filename} />
      ))}
    </div>
  )
}

function GalleryImage({ itemId, filename }) {
  const { imageUrl, loading } = useDecryptedImage(itemId, filename)
  
  return (
    <img 
      src={imageUrl || '/placeholder.png'} 
      className={loading ? 'animate-pulse' : ''}
    />
  )
}
```

### Force Refresh After Upload

```tsx
import { useDecryptedLatestImage } from '@/hooks/useDecryptedImage'

function ItemWithUpload({ item }) {
  const [refreshFlag, setRefreshFlag] = useState(false)
  const { imageUrl } = useDecryptedLatestImage(item.item_no, { 
    forceRefresh: refreshFlag 
  })
  
  const handleUpload = async (file: File) => {
    await apiBridge.uploadItemImage(item.item_no, file)
    setRefreshFlag(true) // Force refresh to show new image
    setTimeout(() => setRefreshFlag(false), 1000)
  }
  
  return (
    <div>
      <img src={imageUrl || '/placeholder.png'} alt={item.item_name} />
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
    </div>
  )
}
```

## Caching

Images are automatically cached after first fetch:
- **Cache Key Format:** `latest_{itemId}` or `{itemId}_{filename}`
- **Automatic Cleanup:** Blob URLs are revoked when:
  - Component unmounts (when using hooks)
  - Cache is explicitly cleared
  - Item is deleted/updated

**Manual Cache Control:**

```ts
// Clear specific item cache (e.g., after upload/delete)
apiBridge.clearItemImageCache(itemId)

// Clear all images (e.g., on logout)
apiBridge.clearAllImageCache()
```

## Performance Tips

1. **Use the React hook** for automatic cleanup and optimal performance
2. **Enable caching** by not setting `forceRefresh: true` unless needed
3. **Clear cache** after image uploads/deletes to show fresh data
4. **Use placeholder images** for better UX during loading

## Troubleshooting

### Images not loading

1. Check if backend is encrypting image responses
2. Verify `VITE_ENCRYPTION_KEY` matches backend encryption key
3. Check console for decryption errors
4. Try `forceRefresh: true` to bypass cache

### Blob URLs not cleaning up

- Ensure you're using the React hook or manually revoking URLs with `URL.revokeObjectURL()`

### TypeScript errors

- Import types from the hook file:
  ```ts
  import type { UseDecryptedImageResult } from '@/hooks/useDecryptedImage'
  ```

## Backend Requirements

The backend should:
1. Encrypt image responses using the same key as other API responses
2. Return encrypted data in format: `{ encrypted: true, data: "base64-encrypted-blob" }`
3. Support endpoints:
   - `GET /api/items/:id/images/latest` - Latest image
   - `GET /api/items/:id/images/:filename` - Specific image
