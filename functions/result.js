export async function onRequest(context) {
  const CACHE_TTL = 60 // Cache for 1 minute
  const SHEET_API = context.env.SHEET_API // Get from environment variable
  
  const { request } = context
  const url = new URL(request.url)
  
  const studentId = url.searchParams.get('id')
  const semester = url.searchParams.get('semester')
  
  if (!studentId || !semester) {
    return new Response('Missing required parameters', { status: 400 })
  }

  const cacheKey = `${studentId}-${semester}`
  const cache = caches.default

  // Try to get the cached response
  let response = await cache.match(cacheKey)
  
  if (response) {
    // If we have a cached response, trigger a background revalidation
    context.waitUntil(updateCache(cache, cacheKey, studentId, semester))
    return response
  }

  // If no cache, fetch from origin
  return await fetchAndCache(cache, cacheKey, studentId, semester)
}

async function updateCache(cache, cacheKey, studentId, semester) {
  return await fetchAndCache(cache, cacheKey, studentId, semester)
}

async function fetchAndCache(cache, cacheKey, studentId, semester) {
  try {
    const apiUrl = `${context.env.SHEET_API}?id=${studentId}&semester=${semester}`
    const response = await fetch(apiUrl)
    const results = await response.json()
    
    const newResponse = new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `max-age=${CACHE_TTL}`,
        'stale-while-revalidate': '300'
      }
    })

    // Store in cache
    context.waitUntil(cache.put(cacheKey, newResponse.clone()))
    
    return newResponse
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error',
      error: 'Failed to fetch results'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}