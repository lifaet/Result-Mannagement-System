export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) throw new Error('Missing SHEET_API environment variable')

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default
    const action = url.searchParams.get('action')

    // Create cache key based on URL
    const cacheKey = new Request(request.url)
    
    // Try cache first
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      // Update cache in background
      context.waitUntil(
        fetch(`${SHEET_API}?${url.searchParams.toString()}`).then(response => 
          cache.put(cacheKey, response)
        ).catch(console.error)
      )
      return cachedResponse
    }

    // If not in cache, fetch fresh
    const response = await fetch(`${SHEET_API}?${url.searchParams.toString()}`)
    const newResponse = new Response(response.body, response)
    
    // Cache the response
    await cache.put(cacheKey, newResponse.clone())
    
    return newResponse

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

// Preload function to cache semesters and all results
export async function preloadCache(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) throw new Error('Missing SHEET_API environment variable')

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default

    const action = url.searchParams.get('action')

    // Add preload functionality
    if (action === 'preload') {
      console.log('Starting preload...')
      
      // First cache semesters
      const semesterResponse = await fetch(`${SHEET_API}?action=getSemesters`)
      const semesterData = await semesterResponse.json()
      
      if (semesterData.status === 'success') {
        // Cache semester list
        const semesterCacheKey = new Request(`${SHEET_API}?action=getSemesters`)
        await cache.put(semesterCacheKey, new Response(JSON.stringify(semesterData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30, stale-while-revalidate=60'
          }
        }))
        
        // Get all results for each semester
        const allResults = await fetch(`${SHEET_API}?action=${AllDataAPI}`)
        const resultsData = await allResults.json()
        
        if (resultsData.status === 'success') {
          // Cache each result
          for (const result of resultsData.data) {
            const resultCacheKey = new Request(`${SHEET_API}?id=${result.id}&semester=${result.semester}`)
            await cache.put(resultCacheKey, new Response(JSON.stringify({
              status: 'success',
              data: result
            }), {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=30, stale-while-revalidate=60'
              }
            }))
            console.log(`Cached result for: ${result.id}`)
          }
        }
        
        return new Response(JSON.stringify({
          status: 'success',
          message: 'Cache preloaded successfully'
        }))
      }
    }
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