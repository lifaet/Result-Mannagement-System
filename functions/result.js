export async function onRequest(context) {
  try {
    const scriptId = context.env.SHEET_API
    if (!scriptId) {
      throw new Error('Missing SHEET_API environment variable')
    }

    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`
    const { request } = context
    const url = new URL(request.url)
    
    // Debug logging
    console.log('Script ID:', scriptId)
    console.log('Full API URL:', SHEET_API)
    console.log('Request URL:', url.toString())
    console.log('Search Params:', Object.fromEntries(url.searchParams))

    const cache = caches.default
    
    // Handle semester list request
    const action = url.searchParams.get('action')
    if (action === 'getSemesters') {
      const cacheKey = 'semesters'
      let response = await cache.match(cacheKey)
      
      if (!response) {
        try {
          const apiUrl = new URL(SHEET_API)
          apiUrl.searchParams.append('action', 'getSemesters')
          
          console.log('Fetching semesters from:', apiUrl.toString())
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          })
          
          console.log('API Status:', apiResponse.status)
          
          if (!apiResponse.ok) {
            throw new Error(`API responded with status ${apiResponse.status}`)
          }
          
          const data = await apiResponse.json()
          console.log('API Response:', data)
          
          response = new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'max-age=60'
            }
          })
          
          await cache.put(cacheKey, response.clone())
        } catch (fetchError) {
          console.error('Fetch error:', fetchError)
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

    console.log('Fetching result for:', { studentId, semester })

    const cacheKey = `${studentId}-${semester}`
    let response = await cache.match(cacheKey)
    
    if (!response) {
      try {
        const apiUrl = new URL(SHEET_API)
        apiUrl.searchParams.append('id', studentId)
        apiUrl.searchParams.append('semester', semester)
        
        console.log('Fetching result from:', apiUrl.toString())
        
        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
        
        console.log('API Status:', apiResponse.status)
        
        if (!apiResponse.ok) {
          throw new Error(`API responded with status ${apiResponse.status}`)
        }
        
        const data = await apiResponse.json()
        console.log('API Response:', data)
        
        response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=60'
          }
        })
        
        await cache.put(cacheKey, response.clone())
      } catch (fetchError) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }
    }
    
    return response

  } catch (error) {
    console.error('Worker error:', error.message, error.stack)
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message || 'Failed to process request',
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}