/**
 * Main API endpoint handler
 */
function doGet(e) {
    try {
      // Parameter validation
      const { id: studentId, semester } = e.parameter || {};
      
      if (!studentId || !semester) {
        return createApiResponse(400, {
          error: 'Missing required parameters',
          required: {
            id: 'Student ID (format: H22020101)',
            semester: 'Semester code (format: 2025_01)'
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
  
      return createApiResponse(200, { data: result });
  
    } catch (error) {
      return createApiResponse(500, {
        error: 'Server error',
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
      index > 0 && row[0] === studentId
    );
  
    if (!studentRow) return null;
  
    return {
      id: studentRow[0],
      name: studentRow[1],
      department: studentRow[2],
      credits: studentRow[3],
      letterGrade: studentRow[4],
      cgpa: studentRow[5],
      result: studentRow[6],
      subjects: extractSubjects(studentRow)
    };
  }
  
  /**
   * Extract subjects from student data row
   */
  function extractSubjects(row) {
    const subjects = [];
    
    // Process all columns after the basic info (index 7 onwards)
    for (let i = 7; i < row.length; i += 2) {
      const subjectName = row[i];
      const subjectGrade = row[i + 1];
      
      // Validate subject and grade
      if (subjectName && subjectGrade && 
          subjectName.toString().trim() !== '' && 
          subjectGrade.toString().trim() !== '') {
        
        subjects.push({
          name: subjectName.toString().trim(),
          grade: subjectGrade.toString().trim()
        });
      }
    }
    
    return subjects;
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