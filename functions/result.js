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

    // Handle result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      throw new Error('Missing studentId or semester parameter')
    }

    // Add API key to all requests
    const params = new URLSearchParams({
      key: apiKey
    });

    const apiUrl = `${SHEET_API}?${params.toString()}&id=${studentId}&semester=${semester}`
    const cacheKey = new Request(apiUrl)
    let response = await cache.match(cacheKey)
    
    // If we have a cached response, serve it immediately
    // but trigger a background refresh
    if (response) {
      context.waitUntil(updateCache(cache, cacheKey, SHEET_API, studentId, semester))
      return response
    }

    // If no cache, fetch directly
    return await fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester)
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

// Helper function to fetch and cache response
async function fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester) {
  const apiUrl = new URL(SHEET_API)
  apiUrl.searchParams.append('id', studentId)
  apiUrl.searchParams.append('semester', semester)
  
  const apiResponse = await fetch(apiUrl)
  if (!apiResponse.ok) {
    throw new Error(`API responded with status ${apiResponse.status}`)
  }
  
  const data = await apiResponse.json()
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=60'
    }
  })
  
  await cache.put(cacheKey, response.clone())
  return response
}

// Helper function to update cache in background
async function updateCache(cache, cacheKey, SHEET_API, studentId, semester) {
  try {
    const freshResponse = await fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester)
    return freshResponse
  } catch (error) {
    console.error('Background cache update failed:', error)
  }
}