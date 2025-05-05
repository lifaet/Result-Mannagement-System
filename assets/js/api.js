/**
 * Main API endpoint handler
 */
function doGet(e) {
  try {
    const { action, id: studentId, semester } = e.parameter || {};

    // Handle semester list request
    if (action === 'getSemesters') {
      return handleGetSemesters();
    }

    // Handle result request
    if (!studentId || !semester) {
      return createApiResponse(400, {
        error: 'Missing required parameters',
        required: {
          id: 'Student ID',
          semester: 'Semester'
        }
      });
    }

    // Get result data
    const result = getStudentResult(studentId, semester);

    if (!result) {
      return createApiResponse(404, {
        error: 'Result not found',
        params: { studentId, semester }
      });
    }

    // Format CGPA and AGPA
    if (result.cgpa !== undefined && typeof result.cgpa === 'number') {
      result.cgpa = parseFloat(result.cgpa.toFixed(2));
    }
    if (result.agpa !== undefined && typeof result.agpa === 'number') {
      result.agpa = parseFloat(result.agpa.toFixed(2));
    }

    return createApiResponse(200, { data: result });

  } catch (error) {
    return createApiResponse(500, {
      error: 'Server error',
      message: error.toString()
    });
  }
}

/**
 * Handle semester list request
 */
function handleGetSemesters() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const semesters = sheets
      .map(sheet => sheet.getName())
      .filter(name => !name.startsWith('_'))
      .map(semester => ({
        value: semester
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

    return createApiResponse(200, { data: semesters });
  } catch (error) {
    return createApiResponse(500, {
      error: 'Failed to fetch semesters',
      message: error.toString()
    });
  }
}

/**
 * Get student result from sheet
 */
function getStudentResult(studentId, semester) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(semester);

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const studentRow = data.find((row, index) =>
    index > 0 && row[0].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase()
  );

  if (!studentRow) return null;

  const result = {
    id: studentRow[0],
    name: studentRow[1],
    department: studentRow[2],
    cgpa: Number(studentRow[3]),
    agpa: Number(studentRow[4]),
    lg: studentRow[5],
    result: studentRow[6],
    subjects: []
  };

  for (let i = 7; i < studentRow.length - 1; i += 2) {
    const subjectName = studentRow[i];
    const subjectGrade = studentRow[i + 1];

    if (subjectName && subjectGrade && 
        subjectName.toString().trim() !== '' && 
        subjectGrade.toString().trim() !== '') {
      result.subjects.push({
        name: subjectName.toString().trim(),
        grade: subjectGrade.toString().trim()
      });
    }
  }

  return result;
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