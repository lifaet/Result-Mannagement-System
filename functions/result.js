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
  const headers = corsHeaders;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Fetch from origin and initialize cache
    if (!cache) {
      const response = await fetch(`${env.SHEET_API}`);
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
      const semestersList = [...new Set(cache.map(r => r.semester))].filter(Boolean);
      const semesters = semestersList.map(sem => ({
        value: sem,
        label: sem
      }));

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