export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    const apiKey = context.env.API_KEY

    if (!scriptId || !apiKey) {
      throw new Error('Missing environment variables')
    }

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default

    const action = url.searchParams.get('action')
    
    // Handle semester list request
    if (action === 'getSemesters') {
      const cacheKey = new Request(`${SHEET_API}?action=getSemesters`)
      const response = await fetchAndValidateCache(cache, cacheKey, async () => {
        const params = new URLSearchParams({ key: apiKey, action: 'getSemesters' })
        return fetch(`${SHEET_API}?${params.toString()}`)
      })
      return response
    }

    // Handle individual result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      throw new Error('Missing studentId or semester parameter')
    }

    const cacheKey = new Request(`${SHEET_API}?id=${studentId}&semester=${semester}`)
    const response = await fetchAndValidateCache(cache, cacheKey, async () => {
      const params = new URLSearchParams({ key: apiKey, id: studentId, semester })
      return fetch(`${SHEET_API}?${params.toString()}`)
    })
    return response

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message || 'Failed to process request'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

async function fetchAndValidateCache(cache, cacheKey, fetchFn) {
  // Try to get from cache
  const cachedResponse = await cache.match(cacheKey)
  
  // Always fetch fresh data
  const fetchPromise = fetchFn().then(async (response) => {
    if (!response.ok) throw new Error(`API responded with status ${response.status}`)
    
    const data = await response.clone().json()
    const freshResponse = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=30, stale-while-revalidate=60'
      }
    })
    
    // Update cache with fresh data
    await cache.put(cacheKey, freshResponse.clone())
    return freshResponse
  })

  // If we have cached data, use it while fetching fresh data in background
  if (cachedResponse) {
    // Update cache in background
    context.waitUntil(fetchPromise.catch(console.error))
    return cachedResponse
  }

  // If no cache, wait for fresh data
  return await fetchPromise
}