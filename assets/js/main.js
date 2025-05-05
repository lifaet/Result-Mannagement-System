document.addEventListener('DOMContentLoaded', async function() {
    const resultForm = document.getElementById('resultForm');
    const resultDisplay = document.getElementById('resultDisplay');
    const semesterSelect = document.getElementById('semester');
    const p = "_";
    const a =  "AKfycbwWyYXRbQzOGQfeTYigqEa5ZtjwlZQ8VoZhmeDKi";
    const i = "xiTe5-pEhaCClFdUkUr33FUwdm";
    const u = "https://script.google.com";
    const r = "/macros/s/";
    const l = "/exec";

    // Disable form while loading semesters
    resultForm.querySelector('button[type="submit"]').disabled = true;
    semesterSelect.disabled = true;

    // Fetch available semesters
    try {
        const response = await fetch(`${u+r+a+p+i+l}?action=getSemesters`);
        const result = await response.json();

        if (result.status === 'success') {
            // Clear existing options except the first one
            semesterSelect.innerHTML = '<option value="">Select Semester</option>';
            
            // Add new options
            result.data.forEach(semester => {
                const option = document.createElement('option');
                option.value = semester.value;
                option.textContent = semester.value;
                semesterSelect.appendChild(option);
            });
        } else {
            console.error('Failed to load semesters:', result.error);
        }
    } catch (error) {
        console.error('Error loading semesters:', error);
    } finally {
        // Re-enable form
        resultForm.querySelector('button[type="submit"]').disabled = false;
        semesterSelect.disabled = false;
    }

    resultForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const studentId = document.getElementById('studentId').value.trim().toUpperCase();
        const semester = document.getElementById('semester').value;
        
        try {
            showLoading();
            
            // Add delay before scrolling for better UX
            setTimeout(() => {
                window.scrollTo({
                    top: resultDisplay.offsetTop - 20,
                    behavior: 'smooth'
                });
            }, 100);

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
                    <img src="./assets/logo.png" alt="RMU Logo" class="result-logo">
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
                        <td>CGPA</td>
                        <td>${data.cgpa}</td>
                    </tr>
                    <tr>
                        <td>AGPA</td>
                        <td>${data.agpa}</td>
                    </tr>
                    <tr>
                        <td>Letter Grade</td>
                        <td>${data.lg}</td>
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
        <div class="result-container">
            <div class="loading-container">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3 class="loading-text">Fetching Result...</h3>
                    <p class="loading-message">Please wait while we retrieve your result</p>
                </div>
            </div>
        </div>
        `;
    }

    function showError(message) {
        const html = `
            <div class="result-container">

                <div class="error-content">
                    <h3>${message}</3>
                </div>
            </div>
        `;
        resultDisplay.innerHTML = html;
    }
});