function doGet(e) {
  try {
    const { action, id: studentId, semester } = e.parameter || {};

    // Handle get all semesters
    if (action === 'getSemesters') {
      const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
      const semesters = sheets
        .map(sheet => sheet.getName())
        .filter(name => !name.startsWith('_'))
        .map(semester => ({ value: semester }))
        .sort();

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: semesters
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle get all results
    if (action === 'AKfycbweayPsZkobJlPVTkAsRd7DuvZqjwE9nBBqhOvsHkZ3G2xzELiFA64dpcIlInAyyi_Cmg') {
      const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
      const allResults = [];
      
      sheets.forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetName.startsWith('_')) return;
        
        const data = sheet.getDataRange().getValues();
        data.slice(1).forEach(row => {
          if (!row[0]) return;
          
          allResults.push({
            id: row[0],
            name: row[1],
            department: row[2],
            cgpa: Number(row[3]).toFixed(2),
            agpa: Number(row[4]).toFixed(2),
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
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle individual result
    if (studentId && semester) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(semester);
      if (!sheet) return createErrorResponse('Sheet not found');

      const data = sheet.getDataRange().getValues();
      const studentRow = data.find((row, i) => 
        i > 0 && row[0].toString().trim() === studentId.toString().trim()
      );

      if (!studentRow) return createErrorResponse('Result not found');

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: {
          id: studentRow[0],
          name: studentRow[1],
          department: studentRow[2],
          cgpa: Number(studentRow[3]).toFixed(2),
          agpa: Number(studentRow[4]).toFixed(2),
          lg: studentRow[5],
          result: studentRow[6],
          subjects: extractSubjects(studentRow)
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return createErrorResponse('Invalid parameters');

  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function extractSubjects(row) {
  const subjects = [];
  for (let i = 7; i < row.length - 1; i += 2) {
    if (!row[i]) continue;
    subjects.push({
      name: row[i],
      grade: isNaN(row[i + 1]) ? row[i + 1] : Number(row[i + 1]).toFixed(2)
    });
  }
  return subjects;
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}