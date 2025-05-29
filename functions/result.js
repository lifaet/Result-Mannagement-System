// Mock data for testing (remove in production)
const testData = {
  semesters: ['1/1', '1/2', '2/1', '2/2', '3/1', '3/2', '4/1', '4/2'],
  results: [
    {
      id: "CS2301002",
      name: "Test Student",
      semester: "1/1",
      // ... other result data
    }
  ]
};

// Global cache variable
const cachedData = {
  lastFetched: null,
  results: null,
  semesters: null
};

// Standard response headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Main request handler for Pages Functions
export async function onRequest(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get request parameters
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Use test data if SHEET_API is not configured
    if (!env.SHEET_API) {
      console.warn('Using test data - SHEET_API not configured');
      cachedData.semesters = testData.semesters;
      cachedData.results = testData.results;
    }
    
    // Initialize cache if needed
    if (!cachedData.results) {
      await fetchFromOrigin(env);
    }

    // Handle different endpoints
    if (action === 'getSemesters') {
      return new Response(JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        data: {
          semesters: cachedData.semesters || testData.semesters
        }
      }), { headers: corsHeaders });
    }

    if (action === 'getAllResults') {
      return new Response(JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        data: cachedData.results || testData.results
      }), { headers: corsHeaders });
    }

    if (studentId && semester) {
      const results = cachedData.results || testData.results;
      const result = results.find(r => 
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

    // Handle invalid requests
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
      path: request.url
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Helper function to fetch from origin
async function fetchFromOrigin(env) {
  if (!env.SHEET_API) return false;
  
  try {
    const SHEET_API = `https://script.google.com/macros/s/${env.SHEET_API}/exec`;
    const fetchOptions = {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const [semestersRes, resultsRes] = await Promise.all([
      fetch(`${SHEET_API}?action=getSemesters`, fetchOptions),
      fetch(`${SHEET_API}?action=getAllResults`, fetchOptions)
    ]);

    if (!semestersRes.ok || !resultsRes.ok) {
      throw new Error('API response not OK');
    }

    const [semesters, results] = await Promise.all([
      semestersRes.json(),
      resultsRes.json()
    ]);

    if (semesters.status === 'success' && results.status === 'success') {
      cachedData.lastFetched = new Date().toISOString();
      cachedData.semesters = semesters.data.semesters;
      cachedData.results = results.data;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error fetching from origin:', error);
    return false;
  }
}