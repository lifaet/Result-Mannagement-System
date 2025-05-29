// Configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

let resultCache = {
  data: null,
  lastUpdated: null
};

async function initializeCache(env) {
  const response = await fetch(env.SHEET_API);
  const data = await response.json();
  if (data?.status === 'success' && Array.isArray(data.data)) {
    resultCache.data = data.data;
    resultCache.lastUpdated = Date.now();
    return true;
  }
  return false;
}

async function onRequest(context) {
  try {
    // Initial cache load
    if (!resultCache.data && !(await initializeCache(context.env))) {
      throw new Error('Failed to initialize cache');
    }

    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Cache refresh check
    if (Date.now() - resultCache.lastUpdated > 60*60*1000) {
      await initializeCache(context.env);
    }

    // Ensure we have valid data
    if (!Array.isArray(resultCache.data)) {
      throw new Error('Invalid cache state');
    }

    if (action === 'getSemesters') {
      const semesters = [...new Set(resultCache.data.map(r => r.semester))].map(sem => ({
        value: sem,
        label: sem
      }));
      return new Response(JSON.stringify({
        status: 'success',
        data: semesters,
        lastUpdated: new Date(resultCache.lastUpdated).toISOString()
      }), { headers: CORS_HEADERS });
    }

    if (studentId && semester) {
      const result = resultCache.data.find(r => r.id === studentId && r.semester === semester);
      if (!result) return new Response(JSON.stringify({
        status: 'error',
        message: 'Result not found'
      }), { status: 404, headers: CORS_HEADERS });

      return new Response(JSON.stringify({
        status: 'success',
        data: result,
        lastUpdated: new Date(resultCache.lastUpdated).toISOString()
      }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid request'
    }), { status: 400, headers: CORS_HEADERS });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), { status: 500, headers: CORS_HEADERS });
  }
}

export { onRequest };