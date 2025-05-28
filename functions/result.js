export async function onRequest(context) {
  const CACHE_TTL = 60 // Cache for 1 minute
  // Remove hardcoded API key and use environment variable
  const SHEET_API = `https://script.google.com/macros/s/${context.env.SHEET_API}/exec`
  
  const { request } = context
  const url = new URL(request.url)
  
  // Check if it's a semester list request
  const action = url.searchParams.get('action')
  if (action === 'getSemesters') {
    return await handleSemesterRequest(context, SHEET_API)
  }

  // Handle result request
  const studentId = url.searchParams.get('id')
  const semester = url.searchParams.get('semester')
  
  if (!studentId || !semester) {
    return new Response('Missing required parameters', { status: 400 })
  }

  const cacheKey = `${studentId}-${semester}`
  const cache = caches.default

  let response = await cache.match(cacheKey)
  
  if (response) {
    context.waitUntil(updateCache(cache, cacheKey, studentId, semester, context, SHEET_API))
    return response
  }

  return await fetchAndCache(cache, cacheKey, studentId, semester, context, SHEET_API)
}

async function handleSemesterRequest(context, SHEET_API) {
  const cache = caches.default
  const cacheKey = 'semesters'

  // Try to get from cache
  let response = await cache.match(cacheKey)
  if (response) {
    return response
  }

  try {
    // Fetch semesters from API
    const response = await fetch(`${SHEET_API}?action=getSemesters`)
    const results = await response.json()
    
    const newResponse = new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `max-age=${60}` // Cache semesters for 1 minute
      }
    })

    // Store in cache
    context.waitUntil(cache.put(cacheKey, newResponse.clone()))
    
    return newResponse
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: 'Failed to fetch semesters'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

async function updateCache(cache, cacheKey, studentId, semester, context, SHEET_API) {
  return await fetchAndCache(cache, cacheKey, studentId, semester, context, SHEET_API)
}

async function fetchAndCache(cache, cacheKey, studentId, semester, context, SHEET_API) {
  try {
    const apiUrl = `${SHEET_API}?id=${studentId}&semester=${semester}`
    const response = await fetch(apiUrl)
    const results = await response.json()
    
    const newResponse = new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `max-age=${60}`,
        'stale-while-revalidate': '300'
      }
    })

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