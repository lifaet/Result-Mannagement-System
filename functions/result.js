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

    // Add preload action to cache all data
    if (action === 'preload') {
      // First get all semesters
      const params = new URLSearchParams({ key: apiKey, action: 'getSemesters' })
      const semResponse = await fetch(`${SHEET_API}?${params.toString()}`)
      const semData = await semResponse.json()

      if (semData.status === 'success') {
        // Cache semester list
        await cache.put(
          new Request(`${SHEET_API}?action=getSemesters`),
          new Response(JSON.stringify(semData), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=30, stale-while-revalidate=60'
            }
          })
        )

        // Get and cache all results for each semester
        for (const sem of semData.data) {
          const allParams = new URLSearchParams({ 
            key: apiKey, 
            action: 'getAllResults',
            semester: sem.value 
          })
          const resultsResponse = await fetch(`${SHEET_API}?${allParams.toString()}`)
          const results = await resultsResponse.json()

          if (results.status === 'success') {
            for (const result of results.data) {
              const cacheKey = new Request(`${SHEET_API}?id=${result.id}&semester=${sem.value}`)
              await cache.put(cacheKey, new Response(JSON.stringify({
                status: 'success',
                data: result
              }), {
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'max-age=30, stale-while-revalidate=60'
                }
              }))
            }
          }
        }
        return new Response(JSON.stringify({ 
          status: 'success', 
          message: 'Cache preloaded successfully' 
        }))
      }
    }

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
  // Define cachedResponse in outer scope
  let cachedResponse = null;
  
  try {
    // Try to get from cache
    cachedResponse = await cache.match(cacheKey)
    
    // Always fetch fresh data
    const fetchPromise = fetchFn().then(async (response) => {
      if (!response.ok) throw new Error(`API responded with status ${response.status}`)
      
      const data = await response.clone().json()
      
      // Validate data structure
      if (!data || data.status !== 'success') {
        throw new Error('Invalid data structure from API')
      }
      
      const freshResponse = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'max-age=30, stale-while-revalidate=60',
          'X-Cache-Time': new Date().toISOString()
        }
      })
      
      // Update cache and verify
      await cache.put(cacheKey, freshResponse.clone())
      const verifyCached = await cache.match(cacheKey)
      
      if (!verifyCached) {
        throw new Error('Cache verification failed')
      }
      
      console.log(`Cache updated successfully for: ${cacheKey.url}`)
      return freshResponse
    })

    if (cachedResponse) {
      console.log(`Cache hit for: ${cacheKey.url}`)
      
      // Update cache in background
      context.waitUntil(
        fetchPromise.catch(error => {
          console.error(`Background cache update failed: ${error.message}`)
        })
      )
      return cachedResponse
    }

    console.log(`Cache miss for: ${cacheKey.url}, fetching fresh data...`)
    return await fetchPromise

  } catch (error) {
    console.error(`Cache error for ${cacheKey.url}:`, error)
    // Now cachedResponse is accessible here
    if (cachedResponse) {
      console.log(`Serving stale cache for: ${cacheKey.url}`)
      return cachedResponse
    }
    throw error
  }
}