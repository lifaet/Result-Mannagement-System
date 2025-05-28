export async function onRequest(context) {
  const CACHE_TTL = 60 // Cache for 1 minute
  const SHEET_API = context.env.SHEET_API
  
  const { request } = context
  const url = new URL(request.url)
  
  // Check if it's a semester list request
  const action = url.searchParams.get('action')
  if (action === 'getSemesters') {
    return await handleSemesterRequest(context)
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
    context.waitUntil(updateCache(cache, cacheKey, studentId, semester, context))
    return response
  }

  return await fetchAndCache(cache, cacheKey, studentId, semester, context)
}

async function handleSemesterRequest(context) {
  const cache = caches.default
  const cacheKey = 'semesters'

  // Try to get from cache
  let response = await cache.match(cacheKey)
  if (response) {
    return response
  }

  try {
    // Fetch semesters from API
    const response = await fetch(`${context.env.SHEET_API}?action=getSemesters`)
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

async function updateCache(cache, cacheKey, studentId, semester, context) {
  return await fetchAndCache(cache, cacheKey, studentId, semester, context)
}

async function fetchAndCache(cache, cacheKey, studentId, semester, context) {
  try {
    const apiUrl = `${context.env.SHEET_API}?id=${studentId}&semester=${semester}`
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