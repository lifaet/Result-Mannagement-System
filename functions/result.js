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

    // Handle preload action
    if (action === 'preload') {
      try {
        // Get semesters
        const semParams = new URLSearchParams({ action: 'getSemesters' })
        const semesterResponse = await fetch(`${SHEET_API}?${semParams.toString()}`)
        const semesterData = await semesterResponse.json()

        if (!semesterData || semesterData.status !== 'success') {
          throw new Error('Failed to fetch semesters')
        }

        // Cache semester list
        const semesterCacheKey = new Request(`${SHEET_API}?action=getSemesters`)
        await cache.put(semesterCacheKey, new Response(JSON.stringify(semesterData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30, stale-while-revalidate=60'
          }
        }))

        // Get all results
        const resultParams = new URLSearchParams({ action: 'getAllResults' })
        const resultsResponse = await fetch(`${SHEET_API}?${resultParams.toString()}`)
        const resultsData = await resultsResponse.json()

        if (!resultsData || resultsData.status !== 'success') {
          throw new Error('Failed to fetch results')
        }

        // Cache each result
        let count = 0
        for (const result of resultsData.data) {
          const resultParams = new URLSearchParams({
            id: result.id,
            semester: result.semester
          })
          const resultCacheKey = new Request(`${SHEET_API}?${resultParams.toString()}`)
          
          await cache.put(resultCacheKey, new Response(JSON.stringify({
            status: 'success',
            data: result
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=30, stale-while-revalidate=60'
            }
          }))
          count++
        }

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Cache preloaded successfully',
          stats: {
            semesters: semesterData.data.length,
            results: count
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })

      } catch (preloadError) {
        throw new Error(`Preload failed: ${preloadError.message}`)
      }
    }

    // Handle regular requests
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')

    const cacheKey = new Request(
      action === 'getSemesters' ? `${SHEET_API}?action=getSemesters` :
      action === 'getAllResults' ? `${SHEET_API}?action=getAllResults` :
      `${SHEET_API}?id=${studentId}&semester=${semester}`
    )

    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      context.waitUntil(updateCache(SHEET_API, cacheKey, cache, url.searchParams))
      return cachedResponse
    }

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