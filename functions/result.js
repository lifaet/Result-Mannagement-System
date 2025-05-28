export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) {
      throw new Error('Missing SHEET_API environment variable')
    }

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    const cache = caches.default

    // Add preload action
    const action = url.searchParams.get('action')
    if (action === 'preload') {
      try {
        const apiUrl = new URL(SHEET_API)
        apiUrl.searchParams.append('action', 'getAllResults')
        
        const apiResponse = await fetch(apiUrl)
        if (!apiResponse.ok) {
          throw new Error(`API responded with status ${apiResponse.status}`)
        }
        
        const allResults = await apiResponse.json()
        
        // Cache each result individually
        for (const result of allResults.data) {
          const cacheKey = new Request(`${SHEET_API}?id=${result.id}&semester=${result.semester}`)
          const response = new Response(JSON.stringify({
            status: 'success',
            data: result
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'max-age=3600' // Cache for 1 hour
            }
          })
          await cache.put(cacheKey, response.clone())
        }
        
        return new Response(JSON.stringify({
          status: 'success',
          message: 'Cache preloaded successfully'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      } catch (error) {
        throw new Error(`Failed to preload cache: ${error.message}`)
      }
    }

    // Handle semester list request
    const semesterAction = url.searchParams.get('action')
    if (semesterAction === 'getSemesters') {
      const cacheKey = new Request(SHEET_API + '?action=getSemesters')
      let response = await cache.match(cacheKey)
      
      if (!response) {
        try {
          const apiUrl = new URL(SHEET_API)
          apiUrl.searchParams.append('action', 'getSemesters')
          
          const apiResponse = await fetch(apiUrl)
          if (!apiResponse.ok) {
            throw new Error(`API responded with status ${apiResponse.status}`)
          }
          
          const data = await apiResponse.json()
          response = new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'max-age=60'
            }
          })
          
          await cache.put(cacheKey, response.clone())
        } catch (fetchError) {
          throw fetchError
        }
      }
      
      return response
    }

    // Handle result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      throw new Error('Missing studentId or semester parameter')
    }

    const cacheKey = new Request(`${SHEET_API}?id=${studentId}&semester=${semester}`)
    let response = await cache.match(cacheKey)
    
    if (!response) {
      try {
        const apiUrl = new URL(SHEET_API)
        apiUrl.searchParams.append('id', studentId)
        apiUrl.searchParams.append('semester', semester)
        
        const apiResponse = await fetch(apiUrl)
        if (!apiResponse.ok) {
          throw new Error(`API responded with status ${apiResponse.status}`)
        }
        
        const data = await apiResponse.json()
        response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=60'
          }
        })
        
        await cache.put(cacheKey, response.clone())
      } catch (fetchError) {
        throw fetchError
      }
    }
    
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