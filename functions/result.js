// Configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

// Cache storage with metadata
let resultCache = {
  data: null,
  lastUpdated: null,
  hash: null
};

// Helper functions
async function initializeCache(env) {
  const response = await fetch(env.SHEET_API + '?action=getAllResults');
  const data = await response.json();
  
  if (data?.status !== 'success' || !data?.data) { // Fixed condition
    throw new Error('Invalid response from origin');
  }
  
  resultCache.data = data.data;
  resultCache.lastUpdated = Date.now();
  resultCache.hash = await generateHash(data.data);
}

async function checkAndUpdateCache(env) {
  try {
    const response = await fetch(env.SHEET_API + '?action=getAllResults');
    const data = await response.json();
    
    if (data?.status !== 'success' || !data?.data) { // Fixed condition
      return false;
    }

    const newHash = await generateHash(data.data);
    
    // Always update if hash is different
    if (newHash !== resultCache.hash) {
      resultCache.data = data.data;
      resultCache.lastUpdated = Date.now();
      resultCache.hash = newHash;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Cache update failed:', error);
    return false;
  }
}

async function generateHash(data) {
  const text = JSON.stringify(data);
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    JSON.stringify({ 
      status: 'success', 
      data,
      lastUpdated: new Date(resultCache.lastUpdated).toISOString()
    }), 
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
    // Initialize cache if empty
    if (!resultCache.data) {
      await initializeCache(context.env);
    }

    const url = new URL(context.request.url);
    const action = url.searchParams.get('action');
    const studentId = url.searchParams.get('id');
    const semester = url.searchParams.get('semester');

    // Check cache age and update if needed (only once per request)
    const cacheAge = Date.now() - resultCache.lastUpdated;
    if (cacheAge > 60 * 1000) {
      await checkAndUpdateCache(context.env);
    }

    // Handle requests
    if (action === 'refresh') {
      const updated = await checkAndUpdateCache(context.env);
      return successResponse({
        updated,
        lastUpdated: new Date(resultCache.lastUpdated).toISOString()
      });
    }

    if (action === 'getSemesters') {
      return successResponse(getSemestersList(resultCache.data));
    }

    if (studentId && semester) {
      const result = findStudentResult(resultCache.data, studentId, semester);
      return result ? successResponse(result) : errorResponse('Result not found', 404);
    }

    return errorResponse('Invalid request', 400);
  } catch (error) {
    return errorResponse(error.message || 'Server error', 500);
  }
}