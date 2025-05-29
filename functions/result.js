// Configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

// In-memory cache for storing API data
let resultCache = null;

// Helper functions
async function initializeCache(env) {
  const response = await fetch(env.SHEET_API);
  const data = await response.json();
  resultCache = data.data;
}

function getSemestersList(results) {
  const uniqueSemesters = [...new Set(results.map(r => r.semester))];
  return uniqueSemesters.map(sem => ({
    value: sem,
    label: sem
  }));
}

function findStudentResult(results, studentId, semester) {
  return results.find(r => r.id === studentId && r.semester === semester);
}

// Response handlers
function successResponse(data) {
  return new Response(
    JSON.stringify({ status: 'success', data }), 
    { headers: CORS_HEADERS }
  );
}

function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({ status: 'error', message }), 
    { status, headers: CORS_HEADERS }
  );
}

// Main request handler
export async function onRequest(context) {
  try {
    if (!resultCache) await initializeCache(context.env);
    if (!Array.isArray(resultCache)) throw new Error('Invalid cache');

    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    if (action === 'getSemesters') {
      return successResponse(getSemestersList(resultCache));
    }

    if (studentId && semester) {
      const result = findStudentResult(resultCache, studentId, semester);
      return result ? successResponse(result) : errorResponse('Result not found', 404);
    }

    return errorResponse('Invalid request', 400);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}