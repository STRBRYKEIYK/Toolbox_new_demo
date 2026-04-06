/**
 * Example: Updating Enhanced Item Card for Encrypted Images
 * 
 * This file shows how to update the enhanced-item-card component
 * to work with encrypted images.
 */

// ============================================================================
// BEFORE: Using URL methods (won't work with encrypted images)
// ============================================================================

import { useState, useEffect } from 'react'
import { apiBridge } from '@/lib/api-bridge'

function EnhancedItemCardBefore({ item }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      try {
        // This won't work if images are encrypted
        const url = apiBridge.getItemLatestImageUrl(item.item_no)
        setImageUrl(url)
        setImageLoaded(true)
      } catch (error) {
        console.error('Failed to load image:', error)
      }
    }

    loadImage()
  }, [item.item_no])

  return (
    <div className="item-card">
      <img 
        src={imageUrl || '/placeholder.png'} 
        alt={item.item_name}
      />
      <h3>{item.item_name}</h3>
      <p>Stock: {item.quantity_on_hand}</p>
    </div>
  )
}

// ============================================================================
// AFTER: Using decrypted image hook (works with encrypted images)
// ============================================================================

import { useDecryptedLatestImage } from '@/hooks/useDecryptedImage'
import { Loader2, AlertCircle } from 'lucide-react'

function EnhancedItemCardAfter({ item }) {
  const { imageUrl, loading, error, retry } = useDecryptedLatestImage(item.item_no)

  return (
    <div className="item-card">
      <div className="relative h-48 bg-gray-100">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-xs text-red-600 text-center">{error}</p>
            <button 
              onClick={retry}
              className="text-xs underline text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Image */}
        <img 
          src={imageUrl || '/placeholder.png'} 
          alt={item.item_name}
          className={`w-full h-full object-cover ${loading ? 'opacity-50' : ''}`}
          onError={() => console.log('Image failed to load (using fallback)')}
        />
      </div>

      <div className="p-4">
        <h3 className="font-semibold">{item.item_name}</h3>
        <p className="text-sm text-gray-600">Stock: {item.quantity_on_hand}</p>
      </div>
    </div>
  )
}

// ============================================================================
// ADVANCED: With Image List Support
// ============================================================================

import { useDecryptedImage } from '@/hooks/useDecryptedImage'

function EnhancedItemCardAdvanced({ item }) {
  const [images, setImages] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Fetch image list
  useEffect(() => {
    const loadImages = async () => {
      try {
        const result = await apiBridge.getItemImages(item.item_no)
        if (result?.success && result.data?.length > 0) {
          setImages(result.data)
          setSelectedImage(result.data[0].filename)
        }
      } catch (error) {
        console.error('Failed to load image list:', error)
      }
    }

    loadImages()
  }, [item.item_no])

  // Use latest image if no images in list
  const { imageUrl: latestImageUrl, loading, error } = useDecryptedLatestImage(
    item.item_no,
    { skip: selectedImage !== null }
  )

  // Use specific image if selected
  const { imageUrl: specificImageUrl } = useDecryptedImage(
    item.item_no,
    selectedImage,
    { skip: selectedImage === null }
  )

  const displayUrl = specificImageUrl || latestImageUrl

  return (
    <div className="item-card">
      <div className="relative h-48 bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        <img 
          src={displayUrl || '/placeholder.png'} 
          alt={item.item_name}
          className={`w-full h-full object-cover ${loading ? 'opacity-50' : ''}`}
        />

        {/* Image thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img.filename)}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 ${
                  selectedImage === img.filename 
                    ? 'border-blue-500' 
                    : 'border-transparent'
                }`}
              >
                <ImageThumbnail itemId={item.item_no} filename={img.filename} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold">{item.item_name}</h3>
        <p className="text-sm text-gray-600">Stock: {item.quantity_on_hand}</p>
        {images.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{images.length} images</p>
        )}
      </div>
    </div>
  )
}

function ImageThumbnail({ itemId, filename }) {
  const { imageUrl } = useDecryptedImage(itemId, filename)
  return (
    <img 
      src={imageUrl || '/placeholder.png'} 
      className="w-full h-full object-cover"
      alt=""
    />
  )
}

// ============================================================================
// OPTIMIZATION: Conditional Decryption
// ============================================================================

/**
 * If you're not sure whether images are encrypted, you can try direct URL first
 * and fall back to decrypted blob on error.
 */

function EnhancedItemCardOptimized({ item }) {
  const [useDecryption, setUseDecryption] = useState(false)
  const directUrl = apiBridge.getItemLatestImageUrl(item.item_no)
  
  const { imageUrl: decryptedUrl, loading } = useDecryptedLatestImage(
    item.item_no,
    { skip: !useDecryption }
  )

  const handleImageError = () => {
    console.log('Direct URL failed, switching to decryption')
    setUseDecryption(true)
  }

  return (
    <div className="item-card">
      <img 
        src={useDecryption ? (decryptedUrl || '/placeholder.png') : directUrl} 
        alt={item.item_name}
        onError={handleImageError}
        className={loading ? 'opacity-50' : ''}
      />
      <h3>{item.item_name}</h3>
    </div>
  )
}

// ============================================================================
// CACHE MANAGEMENT: Clear cache after upload/delete
// ============================================================================

function ItemWithUpload({ item }) {
  const { imageUrl, loading } = useDecryptedLatestImage(item.item_no)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      
      // Upload new image
      await apiBridge.uploadItemImage(item.item_no, file)
      
      // Clear cache to force refresh
      apiBridge.clearItemImageCache(item.item_no)
      
      // Force component to re-fetch by remounting
      // Or you can use forceRefresh option in the hook
      
      alert('Image uploaded successfully!')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageUrl: string) => {
    try {
      await apiBridge.deleteItemImage(item.item_no, imageUrl)
      
      // Clear cache
      apiBridge.clearItemImageCache(item.item_no)
      
      alert('Image deleted successfully!')
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete image')
    }
  }

  return (
    <div className="item-card">
      <img src={imageUrl || '/placeholder.png'} alt={item.item_name} />
      
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      
      {uploading && <p>Uploading...</p>}
    </div>
  )
}

export {
  EnhancedItemCardBefore,
  EnhancedItemCardAfter,
  EnhancedItemCardAdvanced,
  EnhancedItemCardOptimized,
  ItemWithUpload
}
