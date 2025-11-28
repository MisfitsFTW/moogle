// DOM Elements
const queryInput = document.getElementById('queryInput');
const submitBtn = document.getElementById('submitBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const resultsCount = document.getElementById('resultsCount');
const resultsTable = document.getElementById('resultsTable');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const exportBtn = document.getElementById('exportBtn');
const exampleChips = document.querySelectorAll('.example-chip');

// State
let currentResults = [];

// API Configuration
const API_BASE_URL = window.location.origin;

// Event Listeners
submitBtn.addEventListener('click', handleSubmit);
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit();
    }
});

exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        queryInput.value = query;
        handleSubmit();
    });
});

exportBtn.addEventListener('click', exportToCSV);

// Main Functions
async function handleSubmit() {
    const query = queryInput.value.trim();

    if (!query) {
        showError('Please enter a query', 'You need to ask a question to search the data.');
        return;
    }

    // Show loading state
    hideAll();
    loadingState.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || data.details || 'Failed to process query');
        }

        // Store results and display
        currentResults = data.data;
        displayResults(data.data, data.count);

    } catch (error) {
        console.error('Error:', error);
        showError('Query Failed', error.message);
    } finally {
        loadingState.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function displayResults(data, count) {
    hideAll();

    if (!data || data.length === 0) {
        showError('No Results Found', 'Your query returned no results. Try rephrasing your question.');
        return;
    }

    // Update count
    resultsCount.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;

    // Get column names from first row
    const columns = Object.keys(data[0]);

    // Build table header
    tableHead.innerHTML = '';
    const headerRow = document.createElement('tr');
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(column);
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Build table body
    tableBody.innerHTML = '';
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.02}s`;

        columns.forEach(column => {
            const td = document.createElement('td');
            td.textContent = formatCellValue(row[column]);
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    // Show results section with animation
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(title, message) {
    hideAll();
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
}

function hideAll() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

function formatColumnName(columnName) {
    // Convert snake_case or camelCase to Title Case
    return columnName
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
}

function formatCellValue(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    // Format numbers
    if (typeof value === 'number') {
        return value.toLocaleString();
    }

    return value;
}

function exportToCSV() {
    if (!currentResults || currentResults.length === 0) {
        return;
    }

    const columns = Object.keys(currentResults[0]);

    // Build CSV content
    let csvContent = columns.join(',') + '\n';

    currentResults.forEach(row => {
        const values = columns.map(column => {
            let value = row[column];

            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Escape quotes and wrap in quotes if contains comma or quote
            value = value.toString();
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }

            return value;
        });

        csvContent += values.join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `moogle-results-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Auto-resize textarea
queryInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Check API health on load
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();

        if (data.success) {
            console.log('✓ API is healthy');
            console.log(`✓ ${data.recordCount} records loaded`);
        }
    } catch (error) {
        console.warn('API health check failed:', error);
    }
}

// Initialize
checkHealth();
