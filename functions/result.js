export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) throw new Error('Missing SHEET_API environment variable')

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default
    const action = url.searchParams.get('action')

    if (action === 'preload') {
      console.log('Starting cache preload...')
      
      // 1. Cache semesters
      const semResponse = await fetch(`${SHEET_API}?action=getSemesters`)
      if (!semResponse.ok) throw new Error('Failed to fetch semesters')
      
      const semesterData = await semResponse.json()
      console.log('Semester data:', semesterData) // Debug log

      // Fix the condition check
      if (!semesterData || semesterData.status !== 'success' || !semesterData.data) {
        throw new Error('Invalid semester data received')
      }

      const semCacheKey = new Request(`${SHEET_API}?action=getSemesters`)
      await cache.put(semCacheKey, new Response(JSON.stringify(semesterData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=30, stale-while-revalidate=60'
        }
      }))
      console.log(`${semesterData.data.length} semesters cached`)

      // 2. Cache all results
      const allResponse = await fetch(`${SHEET_API}?action=getAllResults`)
      if (!allResponse.ok) throw new Error('Failed to fetch all results')
      
      const allData = await allResponse.json()
      console.log('All results data:', allData) // Debug log

      // Fix the condition check for results data
      if (!allData || allData.status !== 'success' || !Array.isArray(allData.data)) {
        console.error('Received data:', allData)
        throw new Error('Invalid results data received')
      }

      let cached = 0
      for (const result of allData.data) {
        if (!result.id || !result.semester) continue; // Skip invalid entries
        
        const resultKey = new Request(`${SHEET_API}?id=${result.id}&semester=${result.semester}`)
        await cache.put(resultKey, new Response(JSON.stringify({
          status: 'success',
          data: result
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30, stale-while-revalidate=60'
          }
        }))
        cached++
      }

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Cache preloaded successfully',
        cached: {
          semesters: semesterData.data.length,
          results: cached
        }
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    // Handle regular requests as before
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')

    // Create cache key based on request
    const cacheKey = new Request(
      action === 'getSemesters' ? `${SHEET_API}?action=getSemesters` :
      action === `${AllDataAPI}` ? `${SHEET_API}?action=${AllDataAPI}` :
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
    console.error('Error:', error)
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