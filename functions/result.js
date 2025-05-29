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
  const response = await fetch(env.SHEET_API + '?action=getAllResults');
  const data = await response.json();
  if (data?.status === 'success' && data?.data) {
    resultCache.data = data.data;
    resultCache.lastUpdated = Date.now();
  }
}

async function onRequest(context) {
  try {
    if (!resultCache.data) await initializeCache(context.env);

    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    if (Date.now() - resultCache.lastUpdated > 60000) {
      await initializeCache(context.env);
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