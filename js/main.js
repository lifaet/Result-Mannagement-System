document.addEventListener('DOMContentLoaded', function() {
    const resultForm = document.getElementById('resultForm');
    const resultDisplay = document.getElementById('resultDisplay');
    const p = "-IBUb6wQNR4FaSzG34raX-s2b5RJl";
    const a =  "AKfycbwHtIzZZFFCtrt7gHcx1cYYxYB";
    const i = "-k-f7eso6zhejA";
    const u = "https://script.google.com";
    const r = "/macros/s/";
    const l = "/exec";
    
    resultForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const studentId = document.getElementById('studentId').value.trim().toUpperCase();
        const semester = document.getElementById('semester').value;
        
        try {
            showLoading();
            const response = await fetch(`${u+r+a+p+i+l}?id=${studentId}&semester=${semester}`);
            const result = await response.json();

            if (result.status === 'error') {
                showError(result.error);
                return;
            }

            showResult(result.data);
        } catch (error) {
            showError('Failed to fetch result. Please try again.');
        }
    });

    function showResult(data) {
        const html = `
            <div class="card result-card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Result Information</h5>
                    <button class="btn btn-sm btn-outline-light print-btn" onclick="window.print()">
                        <i class="bi bi-printer"></i> Print
                    </button>
                </div>
                <div class="card-body">
                    <div class="result-info">
                        <div class="info-item">
                            <strong>Student ID:</strong> ${data.id}
                        </div>
                        <div class="info-item">
                            <strong>Name:</strong> ${data.name}
                        </div>
                        <div class="info-item">
                            <strong>Department:</strong> ${data.department}
                        </div>
                        <div class="info-item">
                            <strong>Credits:</strong> ${data.credits}
                        </div>
                        <div class="info-item">
                            <strong>Letter Grade:</strong> ${data.letterGrade}
                        </div>
                        <div class="info-item">
                            <strong>CGPA:</strong> ${data.cgpa}
                        </div>
                    </div>
                    
                    <div class="alert ${data.result === 'Promoted' ? 'alert-success' : 'alert-danger'} text-center">
                        <strong>Result Status:</strong> ${data.result}
                    </div>

                    <div class="table-responsive mt-3">
                        <table class="table table-bordered table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Subject</th>
                                    <th class="text-center">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.subjects.map(subject => `
                                    <tr>
                                        <td>${subject.name}</td>
                                        <td class="text-center">
                                            <span class="badge ${getGradeColor(subject.grade)} grade-badge">
                                                ${subject.grade}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        resultDisplay.innerHTML = html;
    }

    function getGradeColor(grade) {
        switch(grade[0]) {
            case 'A': return 'bg-success';
            case 'B': return 'bg-primary';
            case 'C': return 'bg-warning';
            default: return 'bg-danger';
        }
    }

    function showLoading() {
        resultDisplay.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    function showError(message) {
        resultDisplay.innerHTML = `
            <div class="alert alert-danger">${message}</div>
        `;
    }
});