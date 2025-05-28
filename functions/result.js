export async function onRequest(context) {
  // Get script ID from environment variable
  const scriptId = context.env.SHEET_API
  if (!scriptId) {
    return new Response('API configuration error', { status: 500 })
  }

  const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
  const { request } = context
  const url = new URL(request.url)
  const cache = caches.default
  
  try {
    // Handle semester list request
    const action = url.searchParams.get('action')
    if (action === 'getSemesters') {
      const cacheKey = 'semesters'
      let response = await cache.match(cacheKey)
      
      if (!response) {
        const apiResponse = await fetch(`${SHEET_API}?action=getSemesters`)
        const data = await apiResponse.json()
        
        response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=60'
          }
        })
        
        context.waitUntil(cache.put(cacheKey, response.clone()))
      }
      
      return response
    }

    // Handle result request
    const studentId = url.searchParams.get('id')
    const semester = url.searchParams.get('semester')
    
    if (!studentId || !semester) {
      return new Response('Missing required parameters', { status: 400 })
    }

    const cacheKey = `${studentId}-${semester}`
    let response = await cache.match(cacheKey)
    
    if (!response) {
      const apiResponse = await fetch(`${SHEET_API}?id=${studentId}&semester=${semester}`)
      const data = await apiResponse.json()
      
      response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'max-age=60'
        }
      })
      
      context.waitUntil(cache.put(cacheKey, response.clone()))
    }
    
    return response

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: 'Failed to process request'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}