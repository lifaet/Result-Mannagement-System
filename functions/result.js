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

    // Handle semester list request
    const action = url.searchParams.get('action')
    if (action === 'getSemesters') {
      const cacheKey = new Request(`${SHEET_API}?action=getSemesters`)
      let response = await cache.match(cacheKey)

      if (response) {
        // Update cache in background if we have cached data
        context.waitUntil(updateSemesterCache(cache, cacheKey, SHEET_API, apiKey))
        return response
      }

      // If no cache, fetch directly
      return await fetchAndCacheSemesters(cache, cacheKey, SHEET_API, apiKey)
    }

    // Handle getAllResults request for initial cache population
    if (action === 'getAllResults') {
      const params = new URLSearchParams({ key: apiKey, action: 'getAllResults' })
      const apiUrl = `${SHEET_API}?${params.toString()}`
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.status === 'success') {
        // Cache each result individually
        for (const result of data.data) {
          const resultCacheKey = new Request(`${SHEET_API}?id=${result.id}&semester=${result.semester}`)
          await cache.put(resultCacheKey, new Response(JSON.stringify({
            status: 'success',
            data: result
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=3600'
            }
          }))
        }
        return new Response(JSON.stringify({ status: 'success', message: 'Cache updated' }))
      }
    }

    // Handle individual result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      throw new Error('Missing studentId or semester parameter')
    }

    const cacheKey = new Request(`${SHEET_API}?id=${studentId}&semester=${semester}`)
    let response = await cache.match(cacheKey)
    
    if (response) {
      context.waitUntil(updateCache(cache, cacheKey, SHEET_API, studentId, semester, apiKey))
      return response
    }

    return await fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester, apiKey)
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

async function fetchAndCacheSemesters(cache, cacheKey, SHEET_API, apiKey) {
  const params = new URLSearchParams({ key: apiKey, action: 'getSemesters' })
  const apiUrl = `${SHEET_API}?${params.toString()}`
  
  const apiResponse = await fetch(apiUrl)
  if (!apiResponse.ok) {
    throw new Error(`API responded with status ${apiResponse.status}`)
  }
  
  const data = await apiResponse.json()
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600'
    }
  })
  
  await cache.put(cacheKey, response.clone())
  return response
}

async function updateSemesterCache(cache, cacheKey, SHEET_API, apiKey) {
  try {
    return await fetchAndCacheSemesters(cache, cacheKey, SHEET_API, apiKey)
  } catch (error) {
    console.error('Background semester cache update failed:', error)
  }
}

async function fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester, apiKey) {
  const params = new URLSearchParams({
    key: apiKey,
    id: studentId,
    semester: semester
  })
  const apiUrl = `${SHEET_API}?${params.toString()}`
  
  const apiResponse = await fetch(apiUrl)
  if (!apiResponse.ok) {
    throw new Error(`API responded with status ${apiResponse.status}`)
  }
  
  const data = await apiResponse.json()
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600'
    }
  })
  
  await cache.put(cacheKey, response.clone())
  return response
}

async function updateCache(cache, cacheKey, SHEET_API, studentId, semester, apiKey) {
  try {
    return await fetchAndCache(cache, cacheKey, SHEET_API, studentId, semester, apiKey)
  } catch (error) {
    console.error('Background cache update failed:', error)
  }
}