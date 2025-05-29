// Variable to store all results
let cachedData = {
  lastFetched: null,
  results: null,
  semesters: null
};

// Function to fetch fresh data from Google API
async function fetchFromOrigin(env) {
  try {
    const scriptId = env.SHEET_API;
    if (!scriptId) throw new Error('Missing SHEET_API environment variable');
    
    const SHEET_API = `https://script.google.com/macros/s/${scriptId}/exec`;
    
    // Add logging for debugging
    console.log('Fetching from origin:', SHEET_API);
    
    // Add proper fetch options
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    // Fetch all data in parallel with timeout
    const [semestersRes, resultsRes] = await Promise.all([
      fetch(`${SHEET_API}?action=getSemesters`, fetchOptions),
      fetch(`${SHEET_API}?action=getAllResults`, fetchOptions)
    ]);

    // Check response status
    if (!semestersRes.ok || !resultsRes.ok) {
      throw new Error('API response not OK');
    }

    // Verify content type
    const semesterContentType = semestersRes.headers.get('content-type');
    const resultsContentType = resultsRes.headers.get('content-type');
    
    if (!semesterContentType?.includes('application/json') || 
        !resultsContentType?.includes('application/json')) {
      throw new Error('Invalid content type received');
    }

    const [semesters, results] = await Promise.all([
      semestersRes.json(),
      resultsRes.json()
    ]);

    if (semesters.status === 'success' && results.status === 'success') {
      cachedData = {
        lastFetched: new Date().toISOString(),
        semesters: semesters.data.semesters,
        results: results.data
      };
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error fetching from origin:', error);
    throw error;
  }
}

export default {
  // Fetch fresh data every 5 minutes
  async scheduled(event, env, ctx) {
    await fetchFromOrigin(env);
  },

  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    try {
      const url = new URL(request.url);
      console.log('Request URL:', url.toString());

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Initial data fetch if not cached
      if (!cachedData.results) {
        console.log('Cache miss, fetching from origin');
        await fetchFromOrigin(env);
      }

      // Handle different API endpoints
      const action = url.searchParams.get('action');
      const studentId = url.searchParams.get('id');
      const semester = url.searchParams.get('semester');

      if (action === 'getSemesters') {
        return new Response(JSON.stringify({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: {
            semesters: cachedData.semesters
          }
        }), { headers: corsHeaders });
      }

      if (action === 'getAllResults') {
        return new Response(JSON.stringify({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: cachedData.results
        }), { headers: corsHeaders });
      }

      if (studentId && semester) {
        const result = cachedData.results.find(r => 
          r.id === studentId && r.semester === semester
        );

        if (!result) {
          return new Response(JSON.stringify({
            status: 'error',
            timestamp: new Date().toISOString(),
            message: 'Result not found'
          }), { 
            status: 404,
            headers: corsHeaders 
          });
        }

        return new Response(JSON.stringify({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: result
        }), { headers: corsHeaders });
      }

      // Force refresh cache
      if (action === 'refresh') {
        const success = await fetchFromOrigin(env);
        return new Response(JSON.stringify({
          status: success ? 'success' : 'error',
          timestamp: new Date().toISOString(),
          message: success ? 'Cache refreshed' : 'Failed to refresh cache',
          lastFetched: cachedData.lastFetched
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        status: 'error',
        message: 'Invalid request'
      }), { 
        status: 400,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error.message || 'Internal server error',
        type: error.name,
        path: request.url
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};