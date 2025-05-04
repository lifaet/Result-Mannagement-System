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
            <div class="result-container">
                <div class="result-header">
                    <img src="https://rmu.ac.bd/wp-content/uploads/2023/04/logo-80.jpg" alt="RMU Logo" class="result-logo">
                    <div class="header-text">
                        <h1>Rabindra Maitree University</h1>
                        <h2>Semester Final Examination 2025</h2>
                        <h3>Result Sheet</h3>
                    </div>
                </div>

                <table class="student-info-table">
                    <tr>
                        <td>Student ID</td>
                        <td>${data.id}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>${data.name}</td>
                    </tr>
                    <tr>
                        <td>Program</td>
                        <td>${data.department}</td>
                    </tr>
                    <tr>
                        <td>Letter Grade</td>
                        <td>${data.letterGrade}</td>
                    </tr>
                    <tr>
                        <td>CGPA</td>
                        <td>${data.cgpa}</td>
                    </tr>
                    <tr>
                        <td>Result</td>
                        <td>${data.result}</td>
                    </tr>
                </table>

                <h2 class="grade-sheet-title">Grade Sheet</h2>

                <table class="grade-table">
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
                                <td>${subject.grade}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <button onclick="window.print()" class="print-button">Print Result</button>
            </div>
        `;

        document.getElementById('resultDisplay').innerHTML = html;
    }

    function showLoading() {
        resultDisplay.innerHTML = `
            <div class="loading-container">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3 class="loading-text">Fetching Result...</h3>
                    <p class="loading-message">Please wait while we retrieve your result</p>
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