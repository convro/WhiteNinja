/**
 * Image Search Module — searches for relevant images using Pexels API,
 * downloads them to the project's assets folder, and returns local paths.
 *
 * Falls back to the existing image catalog if no PEXELS_API_KEY is set.
 */

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { formatImageCatalogForAgent } from './imageCatalog.js'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ''
const PEXELS_BASE_URL = 'https://api.pexels.com/v1'

/**
 * Check if Pexels API is available.
 */
export function isPexelsAvailable() {
  return PEXELS_API_KEY.length > 10
}

/**
 * Search Pexels for images matching a query.
 * Returns array of { id, url, alt, width, height, photographer }
 */
export async function searchImages(query, count = 5) {
  if (!isPexelsAvailable()) {
    return []
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(Math.min(count, 15)),
      orientation: 'landscape',
      size: 'medium',
    })

    const response = await fetch(`${PEXELS_BASE_URL}/search?${params}`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[ImageSearch] Pexels API returned ${response.status}: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    return (data.photos || []).map(photo => ({
      id: photo.id,
      url: photo.src.large || photo.src.medium || photo.src.original,
      urlMedium: photo.src.medium,
      urlSmall: photo.src.small,
      alt: photo.alt || query,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
    }))
  } catch (err) {
    console.warn(`[ImageSearch] Pexels search failed for "${query}":`, err.message)
    return []
  }
}

/**
 * Download an image and save it to the build's assets directory.
 * Returns the local relative path (e.g., "assets/images/hero-bg.jpg").
 */
export async function downloadImage(imageUrl, buildDir, filename) {
  try {
    const imagesDir = join(buildDir, 'assets', 'images')
    await mkdir(imagesDir, { recursive: true })

    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.warn(`[ImageSearch] Download failed for ${imageUrl}: ${response.status}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const filePath = join(imagesDir, filename)
    await writeFile(filePath, buffer)

    return `assets/images/${filename}`
  } catch (err) {
    console.warn(`[ImageSearch] Download failed for ${imageUrl}:`, err.message)
    return null
  }
}

/**
 * Search and download multiple images for a project based on brief analysis.
 * Returns an array of { query, localPath, alt, photographer, url }
 *
 * @param {Array<{query: string, filename: string, alt: string}>} imageRequests
 * @param {string} buildDir - Path to the build directory
 */
export async function searchAndDownloadImages(imageRequests, buildDir) {
  if (!isPexelsAvailable()) {
    return []
  }

  const results = []

  for (const request of imageRequests) {
    try {
      const images = await searchImages(request.query, 3)
      if (images.length === 0) continue

      // Pick the best image (first result is usually best match)
      const chosen = images[0]
      const localPath = await downloadImage(chosen.url, buildDir, request.filename)

      if (localPath) {
        results.push({
          query: request.query,
          localPath,
          alt: request.alt || chosen.alt,
          photographer: chosen.photographer,
          originalUrl: chosen.url,
          width: chosen.width,
          height: chosen.height,
        })
      }
    } catch (err) {
      console.warn(`[ImageSearch] Failed to process image request "${request.query}":`, err.message)
    }
  }

  return results
}

/**
 * Generate image requests from an architect's plan/brief analysis.
 * The architect provides image descriptions, and we convert them to search queries.
 */
export function parseImageRequestsFromPlan(planText) {
  const requests = []
  const imageMatches = planText.matchAll(/===IMAGE_REQUEST:\s*([^\n=]+)===([\s\S]*?)===END_IMAGE===/g)

  for (const match of imageMatches) {
    const filename = match[1].trim()
    const body = match[2].trim()
    const queryLine = body.split('\n').find(l => l.startsWith('Query:'))
    const altLine = body.split('\n').find(l => l.startsWith('Alt:'))

    if (queryLine) {
      requests.push({
        query: queryLine.replace('Query:', '').trim(),
        filename: filename.endsWith('.jpg') ? filename : `${filename}.jpg`,
        alt: altLine ? altLine.replace('Alt:', '').trim() : queryLine.replace('Query:', '').trim(),
      })
    }
  }

  return requests
}

/**
 * Format available images for agent context.
 * If Pexels is available, agents get instructions to request images.
 * Otherwise, they get the static image catalog.
 */
export function formatImageContextForAgent(downloadedImages = []) {
  const parts = []

  if (downloadedImages.length > 0) {
    parts.push('DOWNLOADED PROJECT IMAGES (use these local paths in <img> tags):')
    for (const img of downloadedImages) {
      parts.push(`- "${img.alt}" → src="${img.localPath}" (${img.width}x${img.height}, photo by ${img.photographer})`)
    }
    parts.push('')
  }

  if (isPexelsAvailable()) {
    parts.push('IMAGE SEARCH IS ENABLED — you can request specific images!')
    parts.push('To request images, use this format:')
    parts.push('===IMAGE_REQUEST: hero-background.jpg===')
    parts.push('Query: modern office workspace with natural light')
    parts.push('Alt: Modern open-plan office with floor-to-ceiling windows')
    parts.push('===END_IMAGE===')
    parts.push('')
    parts.push('The system will search and download real photos. Use descriptive queries.')
    parts.push('Request 3-6 images max per project. Use meaningful filenames.')
  } else {
    parts.push('AVAILABLE STOCK IMAGES (use these real URLs in <img> tags):')
    parts.push(formatImageCatalogForAgent())
  }

  return parts.join('\n')
}
