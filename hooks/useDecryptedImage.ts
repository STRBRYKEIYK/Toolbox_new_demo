/**
 * useDecryptedImage Hook
 * 
 * React hook for fetching and displaying encrypted item images in Toolbox.
 * Automatically handles decryption, caching, and cleanup of blob URLs.
 * 
 * Usage:
 * ```tsx
 * const { imageUrl, loading, error } = useDecryptedImage(itemId, filename)
 * 
 * return <img src={imageUrl || fallbackUrl} alt="Item" />
 * ```
 */

import { useState, useEffect } from 'react'
import { apiBridge } from '../lib/api-bridge'

interface UseDecryptedImageResult {
  /** Blob URL for the decrypted image (use in <img src>) */
  imageUrl: string | null
  /** Loading state */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Retry function to refetch the image */
  retry: () => void
}

interface UseDecryptedImageOptions {
  /** Skip fetching if true */
  skip?: boolean
  /** Force refresh from server (bypass cache) */
  forceRefresh?: boolean
}

/**
 * Hook to fetch and decrypt a specific item image by filename
 */
export function useDecryptedImage(
  itemId: number | null | undefined,
  filename: string | null | undefined,
  options: UseDecryptedImageOptions = {}
): UseDecryptedImageResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryFlag, setRetryFlag] = useState(0)

  const { skip = false, forceRefresh = false } = options

  useEffect(() => {
    // Skip if no itemId/filename or skip flag is set
    if (!itemId || !filename || skip) {
      setImageUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let isMounted = true
    let blobUrl: string | null = null

    const fetchImage = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await apiBridge.getItemImageBlob(itemId, filename, forceRefresh)

        if (!isMounted) return

        if (result.success && result.url) {
          blobUrl = result.url
          setImageUrl(result.url)
        } else {
          setError(result.error || 'Failed to load image')
          setImageUrl(null)
        }
      } catch (err) {
        if (!isMounted) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setImageUrl(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchImage()

    // Cleanup: revoke blob URL when component unmounts or dependencies change
    return () => {
      isMounted = false
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl)
        } catch (err) {
          console.warn('Failed to revoke blob URL:', err)
        }
      }
    }
  }, [itemId, filename, skip, forceRefresh, retryFlag])

  const retry = () => setRetryFlag(prev => prev + 1)

  return { imageUrl, loading, error, retry }
}

/**
 * Hook to fetch and decrypt the latest item image
 */
export function useDecryptedLatestImage(
  itemId: number | null | undefined,
  options: UseDecryptedImageOptions = {}
): UseDecryptedImageResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryFlag, setRetryFlag] = useState(0)

  const { skip = false, forceRefresh = false } = options

  useEffect(() => {
    // Skip if no itemId or skip flag is set
    if (!itemId || skip) {
      setImageUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let isMounted = true
    let blobUrl: string | null = null

    const fetchImage = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await apiBridge.getLatestItemImageBlob(itemId, forceRefresh)

        if (!isMounted) return

        if (result.success && result.url) {
          blobUrl = result.url
          setImageUrl(result.url)
        } else {
          setError(result.error || 'Failed to load image')
          setImageUrl(null)
        }
      } catch (err) {
        if (!isMounted) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setImageUrl(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchImage()

    // Cleanup: revoke blob URL when component unmounts or dependencies change
    return () => {
      isMounted = false
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl)
        } catch (err) {
          console.warn('Failed to revoke blob URL:', err)
        }
      }
    }
  }, [itemId, skip, forceRefresh, retryFlag])

  const retry = () => setRetryFlag(prev => prev + 1)

  return { imageUrl, loading, error, retry }
}
