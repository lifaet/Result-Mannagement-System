// Cache storage
let cache = null;

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
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Fetch from origin and initialize cache
    if (!cache) {
      const SHEET_API = `https://script.google.com/macros/s/${env.SHEET_API}/exec`;
      const response = await fetch(`${SHEET_API}?action=AKfycbweayPsZkobJlPVTkAsRd7DuvZqjwE9nBBqhOvsHkZ3G2xzELiFA64dpcIlInAyyi_Cmg`);
      const data = await response.json();
      
      if (!data || data.status !== 'success' || !data.data) {
        throw new Error('Failed to fetch data from origin');
      }
      
      cache = data.data;
    }

    // Verify cache exists before processing requests
    if (!cache || !Array.isArray(cache)) {
      throw new Error('Cache not properly initialized');
    }

    // Handle requests
    if (action === 'getSemesters') {
      const semesters = [...new Set(cache.map(r => r.semester))].filter(Boolean);
      return new Response(JSON.stringify({
        status: 'success',
        data: semesters
      }), { headers });
    }

    if (studentId && semester) {
      const result = cache.find(r => r.id === studentId && r.semester === semester);
      if (!result) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Result not found'
        }), { status: 404, headers });
      }
      return new Response(JSON.stringify({
        status: 'success',
        data: result
      }), { headers });
    }

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid request'
    }), { status: 400, headers });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers 
    });
  }
}