/**
 * Main API endpoint handler
 */
function doGet(e) {
  try {
    const { action, id: studentId, semester } = e.parameter || {};

    if (action === 'getAllResults') {
      // Return all results from the database
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Results')
      const data = sheet.getDataRange().getValues()
      const headers = data[0]
      const results = data.slice(1).map(row => {
        const result = {}
        headers.forEach((header, index) => {
          result[header] = row[index]
        })
        return result
      })
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: results
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
    return createErrorResponse(500, error.toString());
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