document.addEventListener('DOMContentLoaded', async function () {
    const resultForm = document.getElementById('resultForm');
    const resultDisplay = document.getElementById('resultDisplay');
    const semesterSelect = document.getElementById('semester');
    const api = "/result"
    // Disable form while loading semesters
    resultForm.querySelector('button[type="submit"]').disabled = true;
    semesterSelect.disabled = true;

    // Fetch available semesters
    try {
        const response = await fetch(`${api}?action=getSemesters`);
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

            if (result.lastUpdated) {
                const footer = document.querySelector('footer');
                const timestampContainer = document.createElement('div');
                timestampContainer.classList.add('update-timestamp');
                timestampContainer.innerHTML = `
                    Cache last synced: ${new Date(result.lastUpdated).toLocaleString()}
                    <button id="refreshCache" class="refresh-btn">&#x21BB;</button>
                `;
                footer.parentNode.insertBefore(timestampContainer, footer);

                // Add refresh functionality
                const refreshBtn = document.getElementById('refreshCache');
                refreshBtn.addEventListener('click', async function () {
                    const btn = this;
                    btn.disabled = true;
                    btn.classList.add('spinning');

                    try {
                        const response = await fetch(`${api}?action=refresh`);
                        const result = await response.json();

                        if (result.status === 'success') {
                            // Update timestamp
                            const timestamp = btn.parentElement;
                            timestamp.innerHTML = `
                                Cache last synced: ${new Date(result.lastUpdated).toLocaleString()}
                                <button id="refreshCache" class="refresh-btn">&#x21BB;</button>
                            `;
                            // Reattach event listener to new button
                            document.getElementById('refreshCache').addEventListener('click', arguments.callee);
                        } else {
                            console.error('Cache refresh failed:', result.message);
                        }
                    } catch (error) {
                        console.error('Error refreshing cache:', error);
                    } finally {
                        btn.disabled = false;
                        btn.classList.remove('spinning');
                    }
                });
            }

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

    resultForm.addEventListener('submit', async function (e) {
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

            const response = await fetch(`${api}?id=${studentId}&semester=${semester}`);
            const result = await response.json();

            if (result.status === 'error') {
                showError(result.error);
                return;
            }

            displayResult(result.data);
        } catch (error) {
            showError('Failed to fetch result. Please try again.');
        }
    });

    function displayResult(result) {
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.innerHTML = `
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
                        <td>${result.id}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>${result.name}</td>
                    </tr>
                    <tr>
                        <td>Program</td>
                        <td>${result.department}</td>
                    </tr>
                    <tr>
                        <td>CGPA</td>
                        <td>${result.cgpa}</td>
                    </tr>
                    <tr>
                        <td>AGPA</td>
                        <td>${result.agpa}</td>
                    </tr>
                    <tr>
                        <td>Letter Grade</td>
                        <td>${result.lg}</td>
                    </tr>
                    <tr>
                        <td>Result</td>
                        <td>${result.result}</td>
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
                        ${result.subjects.map(subject => `
                            <tr>
                                <td>${subject.name}</td>
                                <td>${subject.grade}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="button-group center-buttons">
                    <button onclick="window.print()" class="btn print-btn">
                        <i class="fas fa-print"></i> Print Result
                    </button>
                    <button onclick="searchAgain()" class="btn search-again-btn">
                        <i class="fas fa-search"></i> Search Again
                    </button>
                </div>
            </div>
        `;
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
                    <h3>${message}</h3>
                </div>
            </div>
        `;
        resultDisplay.innerHTML = html;
    }
});

function searchAgain() {
    // Clear the result display
    document.getElementById('resultDisplay').innerHTML = '';

    // Reset the form
    document.getElementById('resultForm').reset();

    // Scroll back to the search form
    document.querySelector('.search-container').scrollIntoView({ behavior: 'smooth' });
}