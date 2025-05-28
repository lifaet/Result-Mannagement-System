export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) throw new Error('Missing SHEET_API environment variable')

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default

    // Get requested action/params
    const action = url.searchParams.get('action')
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')

    // Create cache key based on request
    const cacheKey = new Request(
      action === 'getSemesters' ? `${SHEET_API}?action=getSemesters` :
      action === 'getAllResults' ? `${SHEET_API}?action=getAllResults` :
      `${SHEET_API}?id=${studentId}&semester=${semester}`
    )

    // Try to get from cache first
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      // Update cache in background
      context.waitUntil(updateCache(SHEET_API, cacheKey, cache, url.searchParams))
      return cachedResponse
    }

    // If not in cache, fetch and cache
    return await fetchAndCache(SHEET_API, cacheKey, cache, url.searchParams)

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function fetchAndCache(SHEET_API, cacheKey, cache, params) {
  const response = await fetch(`${SHEET_API}?${params.toString()}`)
  const data = await response.json()

  const newResponse = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=30, stale-while-revalidate=60'
    }
  })

  await cache.put(cacheKey, newResponse.clone())
  return newResponse
}

async function updateCache(SHEET_API, cacheKey, cache, params) {
  try {
    await fetchAndCache(SHEET_API, cacheKey, cache, params)
  } catch (error) {
    console.error('Background cache update failed:', error)
  }
}