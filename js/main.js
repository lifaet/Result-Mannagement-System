document.addEventListener('DOMContentLoaded', function() {
    const resultForm = document.getElementById('resultForm');
    const resultDisplay = document.getElementById('resultDisplay');
    const API_URL = 'https://script.google.com/macros/s/AKfycbw4UAGT8Uv9fl_5Si9loLqEfR8gPjXvq9uDx8LSElOl5KZMf3K7xySY7gWG88uzbDkLpg/exec';

    resultForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const studentId = document.getElementById('studentId').value.trim().toUpperCase();
        const semester = document.getElementById('semester').value;
        
        try {
            showLoading();
            const response = await fetch(`${API_URL}?id=${studentId}&semester=${semester}`);
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
            <div class="card">
                <div class="result-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5>${data.name}</h5>
                        <button class="btn btn-sm btn-outline-primary print-btn" onclick="window.print()">
                            <i class="bi bi-printer"></i> Print Result
                        </button>
                    </div>
                    <div class="mt-2">
                        <div><strong>Student ID:</strong> ${data.id}</div>
                        <div><strong>Department:</strong> ${data.department}</div>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.subjects.map(subject => `
                                    <tr>
                                        <td>${subject.name}</td>
                                        <td><span class="badge ${getGradeColor(subject.grade)} grade-badge">${subject.grade}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Credits:</strong> ${data.credits}
                    </div>
                    <div>
                        <strong>CGPA:</strong> ${data.cgpa} (${data.letterGrade})
                    </div>
                </div>
            </div>
        `;

        resultDisplay.innerHTML = html;
    }

    function getGradeColor(grade) {
        if (grade.startsWith('A')) return 'bg-success';
        if (grade.startsWith('B')) return 'bg-primary';
        if (grade.startsWith('C')) return 'bg-warning';
        return 'bg-danger';
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