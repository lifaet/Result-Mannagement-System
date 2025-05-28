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
    
    // Handle semester list request
    const action = url.searchParams.get('action')
    if (action === 'getSemesters') {
      const cacheKey = 'semesters'
      let response = await cache.match(cacheKey)
      
      if (!response) {
        // Create proper URL with URLSearchParams
        const params = new URLSearchParams({ action: 'getSemesters' })
        const apiUrl = `${SHEET_API}?${params.toString()}`
        
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
      }
      
      return response
    }

    // Handle result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      throw new Error('Missing studentId or semester parameter')
    }

    const cacheKey = `${studentId}-${semester}`
    let response = await cache.match(cacheKey)
    
    if (!response) {
      // Create proper URL with URLSearchParams
      const params = new URLSearchParams({
        id: studentId,
        semester: semester
      })
      const apiUrl = `${SHEET_API}?${params.toString()}`
      
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
    }
    
    return response

  } catch (error) {
    console.error('Worker error:', error.message)
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