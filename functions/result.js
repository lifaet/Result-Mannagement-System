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
    // Get parameters
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Fetch from origin if cache is empty
    if (!cache) {
      const SHEET_API = `https://script.google.com/macros/s/${env.SHEET_API}/exec`;
      const response = await fetch(`${SHEET_API}?action=getAllResults`);
      const data = await response.json();
      if (data.status === 'success') {
        cache = data.data;
      }
    }

    // Handle requests
    if (action === 'getSemesters') {
      const semesters = [...new Set(cache.map(r => r.semester))];
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
      message: error.message
    }), { status: 500, headers });
  }
}