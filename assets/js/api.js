function doGet(e) {
  try {
    const { action, id: studentId, semester, key } = e.parameter || {};

    // Verify API key for secure endpoints
    if (action === 'getAllResults' && !verifyApiKey(key)) {
      throw new Error('Unauthorized');
    }

    if (action === 'getAllResults') {
      const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
      const allResults = [];
      
      // Get results from all semester sheets
      sheets.forEach(sheet => {
        const sheetName = sheet.getName();
        // Skip hidden/system sheets that start with _
        if (sheetName.startsWith('_')) return;
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        
        // Process each student in the semester
        data.slice(1).forEach(row => {
          if (!row[0]) return; // Skip empty rows
          
          allResults.push({
            id: row[0],
            name: row[1],
            department: row[2],
            cgpa: formatNumber(row[3]),
            agpa: formatNumber(row[4]),
            lg: row[5],
            result: row[6],
            semester: sheetName,
            subjects: extractSubjects(row)
          });
        });
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: allResults
      })).setMimeType(ContentService.MimeType.JSON)
    }

    const result = getStudentResult(studentId, semester);

    if (action === 'getSemesters') {
      return handleGetSemesters();
    }

    if (!studentId || !semester) {
      return createErrorResponse(400, 'Missing required parameters');
    }

    if (!result) {
      return createErrorResponse(404, 'Result not found');
    }

    return createSuccessResponse(formatResult(result));

  } catch (error) {
    return createErrorResponse(
      error.message === 'Unauthorized' ? 401 : 500, 
      error.toString()
    )
  }
}

/**
 * Format numbers to 2 decimal places
 */
function formatNumber(num) {
  return Number(num).toFixed(2);
}

/**
 * Format result data with proper decimal places
 */
function formatResult(result) {
  return {
    ...result,
    cgpa: formatNumber(result.cgpa),
    agpa: formatNumber(result.agpa)
  };
}

/**
 * Get student result from sheet
 */
function getStudentResult(studentId, semester) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(semester);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const studentRow = findStudentRow(data, studentId);
  if (!studentRow) return null;

  return {
    id: studentRow[0],
    name: studentRow[1],
    department: studentRow[2],
    cgpa: studentRow[3],
    agpa: studentRow[4],
    lg: studentRow[5],
    result: studentRow[6],
    subjects: extractSubjects(studentRow)
  };
}

/**
 * Find student row by ID
 */
function findStudentRow(data, studentId) {
  return data.find((row, index) => 
    index > 0 && row[0].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase()
  );
}

/**
 * Extract subjects from student row
 */
function extractSubjects(studentRow) {
  const subjects = [];
  for (let i = 7; i < studentRow.length - 1; i += 2) {
    subjects.push({
      name: studentRow[i],
      grade: formatGrade(studentRow[i + 1])
    });
  }
  return subjects;
}

/**
 * Format grade value
 */
function formatGrade(grade) {
  return !isNaN(grade) ? formatNumber(grade) : grade;
}

/**
 * Handle semester list request
 */
function handleGetSemesters() {
  try {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    const semesters = sheets
      .map(sheet => sheet.getName())
      .filter(name => !name.startsWith('_'))
      .map(semester => ({ value: semester }))
      .sort((a, b) => a.value.localeCompare(b.value));

    return createSuccessResponse(semesters);
  } catch (error) {
    return createErrorResponse(500, error.toString());
  }
}

/**
 * Create success response
 */
function createSuccessResponse(data) {
  return createApiResponse(200, { data });
}

/**
 * Create error response
 */
function createErrorResponse(code, message) {
  return createApiResponse(code, { error: message });
}

/**
 * Create standardized API response
 */
function createApiResponse(code, body) {
  const response = {
    status: code === 200 ? 'success' : 'error',
    code,
    timestamp: new Date().toISOString(),
    ...body
  };

  return ContentService.createTextOutput(JSON.stringify(response, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generate and set a random API key
 * Run this function manually from the Apps Script editor
 */
function setupApiKey() {
  // Generate a random string of 32 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let apiKey = '';
  for (let i = 0; i < 32; i++) {
    apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Save to script properties
  PropertiesService.getScriptProperties().setProperty('API_KEY', apiKey);
  
  // Log the key to copy it
  console.log('New API Key:', apiKey);
  return apiKey;
}