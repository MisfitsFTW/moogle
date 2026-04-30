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
const analyticalSummary = document.getElementById('analyticalSummary');
const sourcesContainer = document.getElementById('sourcesContainer');
const sourcesList = document.getElementById('sourcesList');
const searchView = document.getElementById('searchView');
const resultsView = document.getElementById('resultsView');
const backToSearchBtn = document.getElementById('backToSearchBtn');
const micBtn = document.getElementById('micBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const sourcesGrid = document.getElementById('sourcesGrid');
const uploadSection = document.getElementById('uploadSection');
const csvFileInput = document.getElementById('csvFileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const clearFileBtn = document.getElementById('clearFileBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

// State
let currentResults = [];
let isListening = false;
let sourcesLoaded = false;
let authStatus = { isAuthenticated: false, user: null };

// API Configuration
const API_BASE_URL = window.location.origin;

// Auth Functions
async function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`);
        authStatus = await response.json();

        if (authStatus.isAuthenticated) {
            authContainer.innerHTML = `
                <div class="user-info">
                    <span class="user-name">Welcome, ${authStatus.user.name || 'User'}</span>
                    <button id="logoutBtn" class="btn btn-secondary btn-sm">Logout</button>
                </div>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => {
                window.location.href = '/logout';
            });
        } else {
            authContainer.innerHTML = `
                <button id="loginBtn" class="btn btn-primary btn-sm">Login</button>
            `;
            document.getElementById('loginBtn').addEventListener('click', () => {
                window.location.href = '/login';
            });
        }

        // Show/hide upload section based on auth
        if (uploadSection) {
            if (authStatus.isAuthenticated) {
                uploadSection.classList.remove('hidden');
            } else {
                uploadSection.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error fetching auth status:', error);
    }
}

// Voice Search Initialization
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('active');
        queryInput.placeholder = 'Listening...';
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('active');
        queryInput.placeholder = 'Ask MEEC Information Management Portal...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        queryInput.value = transcript;
        handleSubmit();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        micBtn.classList.remove('active');
    };
}

// Event Listeners
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // Load sources if tab is clicked
        if (tabId === 'tab-sources' && !sourcesLoaded) {
            loadOfficialSources();
        }
    });
});

submitBtn.addEventListener('click', handleSubmit);

backToSearchBtn.addEventListener('click', () => {
    resultsView.classList.add('hidden');
    searchView.classList.remove('hidden');
    queryInput.value = '';
    queryInput.style.height = 'auto';
    hideAll();
});

queryInput.addEventListener('input', () => {
    // Auto-resize textarea
    queryInput.style.height = 'auto';
    queryInput.style.height = (queryInput.scrollHeight) + 'px';
});

queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
});

if (micBtn) {
    micBtn.addEventListener('click', () => {
        if (!recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
}

if (uploadBtn) {
    uploadBtn.addEventListener('click', handleFileUpload);
}

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', resetUploadSection);
}

if (clearFileBtn) {
    clearFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetUploadSection();
    });
}

if (csvFileInput) {
    csvFileInput.addEventListener('change', () => {
        const file = csvFileInput.files[0];
        const fileName = file?.name;
        const labelSpan = document.querySelector('.file-label span');
        if (fileName && labelSpan) {
            labelSpan.textContent = fileName;
            if (clearFileBtn) clearFileBtn.classList.remove('hidden');
        } else {
            if (labelSpan) labelSpan.textContent = 'Choose CSV File';
            if (clearFileBtn) clearFileBtn.classList.add('hidden');
        }
    });
}

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

        if (response.status === 401) {
            showLoginRequired();
            return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || data.error || data.details || 'Failed to process query');
        }

        // Store results and display
        currentResults = data.data;
        displayResults(data.data, data.count, data.summary, data.insight, data.sources);

        // Switch to Results View
        searchView.classList.add('hidden');
        resultsView.classList.remove('hidden');

    } catch (error) {
        console.error('Error:', error);
        showError('Query Failed', error.message);
    } finally {
        loadingState.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function showLoginRequired() {
    hideAll();
    errorTitle.textContent = 'Authentication Required';
    errorMessage.textContent = 'Your session has expired or you are not logged in. Please log in to search organizational data.';

    // Add premium login button to error state
    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn btn-auth-premium';
    loginBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
        <span>Secure Log In Now</span>
    `;
    loginBtn.onclick = () => window.location.href = '/login';

    const existingBtn = errorState.querySelector('button');
    if (existingBtn) {
        errorState.replaceChild(loginBtn, existingBtn);
    } else {
        errorState.appendChild(loginBtn);
    }

    errorState.classList.remove('hidden');
}

function displayResults(data, count, summary, insight, sources) {
    // Clear and hide previous results
    resultsSection.classList.add('hidden');
    analyticalSummary.classList.add('hidden');
    sourcesContainer.classList.add('hidden');

    if (!data || data.length === 0) {
        if (summary) {
            // Show AI explanation for 0 results instead of error
            analyticalSummary.innerHTML = `
                <div class="analysis-header">
                    <div class="analysis-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    <div class="analysis-title">Search Guidance</div>
                </div>
                <div class="analysis-content">${summary}</div>
                <div class="analysis-footer">
                    <span class="persona-badge">AI Assistant Guidance</span>
                </div>
            `;
            analyticalSummary.classList.remove('hidden');
            
            // Show back button so they can search again
            resultsSection.classList.remove('hidden');
            resultsCount.textContent = '0 results';
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 3rem; color: var(--text-muted);">No matching records found in the database.</td></tr>';
            exportBtn.classList.add('hidden');
            
            return;
        }
        
        showError('No Results Found', 'Your query returned no results. Try rephrasing your question.');
        return;
    }

    // Ensure export button is visible for actual results
    if (exportBtn) exportBtn.classList.remove('hidden');

    // Update summary & Combined Insight
    if (summary) {
        // If insight is provided separately, join them. If llmService already unified them, insight will be null.
        const combinedText = insight ? `${summary} ${insight}` : summary;

        // Render Structured Premium Analysis Display
        analyticalSummary.innerHTML = `
            <div class="analysis-header">
                <div class="analysis-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                </div>
                <div class="analysis-title">Analytical Insight</div>
            </div>
            <div class="analysis-content">${combinedText}</div>
            <div class="analysis-footer">
                <span class="persona-badge">Verified Data Analyst</span>
                <span class="persona-badge">SQL Validated</span>
            </div>
        `;
        analyticalSummary.classList.remove('hidden');
    }

    // Update Sources
    if (sources && sources.length > 0) {
        sourcesList.innerHTML = '';
        sources.forEach(source => {
            const chip = document.createElement('div');
            chip.className = 'source-chip';
            chip.textContent = source;
            sourcesList.appendChild(chip);
        });
        sourcesContainer.classList.remove('hidden');
    }

    // Update count
    resultsCount.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;

    // Get column names from first row
    const originalColumns = Object.keys(data[0]);
    const MAX_VISIBLE_COLS = 6;
    const showExpand = originalColumns.length > MAX_VISIBLE_COLS;
    const visibleColumns = showExpand ? originalColumns.slice(0, MAX_VISIBLE_COLS) : originalColumns;

    // Build table header
    tableHead.innerHTML = '';
    const headerRow = document.createElement('tr');

    if (showExpand) {
        const th = document.createElement('th');
        th.style.width = '40px';
        headerRow.appendChild(th);
    }

    visibleColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(column);
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Build table body
    tableBody.innerHTML = '';
    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        if (showExpand) {
            const td = document.createElement('td');
            const btn = document.createElement('button');
            btn.className = 'toggle-btn';
            btn.textContent = '▶';
            btn.onclick = () => toggleDetails(index);
            td.appendChild(btn);
            tr.appendChild(td);
        }

        visibleColumns.forEach(column => {
            const td = document.createElement('td');
            td.textContent = formatCellValue(row[column], column);
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);

        if (showExpand) {
            const detailTr = document.createElement('tr');
            detailTr.id = `detail-${index}`;
            detailTr.className = 'details-row hidden';
            const detailTd = document.createElement('td');
            detailTd.colSpan = visibleColumns.length + (showExpand ? 1 : 0);

            const detailGrid = document.createElement('div');
            detailGrid.className = 'details-grid';

            originalColumns.forEach(col => {
                const item = document.createElement('div');
                item.className = 'detail-item';
                const label = document.createElement('div');
                label.className = 'detail-label';
                label.textContent = formatColumnName(col);
                const value = document.createElement('div');
                value.className = 'detail-value';
                value.textContent = formatCellValue(row[col], col);
                item.appendChild(label);
                item.appendChild(value);
                detailGrid.appendChild(item);
            });

            detailTd.appendChild(detailGrid);
            detailTr.appendChild(detailTd);
            tableBody.appendChild(detailTr);
        }
    });

    resultsSection.classList.remove('hidden');
}

async function loadOfficialSources() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();

        if (data.success && data.recordCount) {
            renderSourceCards(data.recordCount);
            sourcesLoaded = true;
        }
    } catch (error) {
        console.error('Error loading sources:', error);
        sourcesGrid.innerHTML = '<p class="error">Failed to load official source inventory. Please try again later.</p>';
    }
}

const TABLE_DESCRIPTIONS = {
    'MEEC_Hr': 'Comprehensive database of MEEC personnel, including identity details, roles, and department assignments.',
    'MEEC AMS Asset List': 'Central inventory of all MITA and MEEC IT assets, including inventory numbers, user assignments, and asset status.',
    'workers': 'Primary directory of organizational employees and their core professional attributes.'
};

function renderSourceCards(recordCounts) {
    sourcesGrid.innerHTML = '';

    Object.entries(recordCounts).forEach(([tableName, count]) => {
        const card = document.createElement('div');
        card.className = 'source-card';

        const title = document.createElement('div');
        title.className = 'source-title';
        title.textContent = tableName; // Exact from SQL source as requested

        const description = document.createElement('div');
        description.className = 'source-description';
        description.textContent = TABLE_DESCRIPTIONS[tableName] || 'Official government dataset containing organizational records and administrative data.';

        const type = document.createElement('div');
        type.className = 'source-type';
        type.textContent = 'SQL Table';

        const meta = document.createElement('div');
        meta.className = 'source-meta';

        const recordCount = document.createElement('div');
        recordCount.className = 'record-count';
        recordCount.innerHTML = `Records: <span class="count-val">${count.toLocaleString()}</span>`;

        meta.appendChild(recordCount);
        meta.appendChild(type);

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(meta);
        sourcesGrid.appendChild(card);
    });
}

function toggleDetails(index) {
    const detailRow = document.getElementById(`detail-${index}`);
    const btn = document.querySelector(`tr:nth-child(${index * (currentResults.length > 6 ? 2 : 1) + (currentResults.length > 6 ? 1 : 1)}) .toggle-btn`);

    if (detailRow) {
        const isHidden = detailRow.classList.contains('hidden');
        if (isHidden) {
            detailRow.classList.remove('hidden');
            if (btn) btn.textContent = '▼';
        } else {
            detailRow.classList.add('hidden');
            if (btn) btn.textContent = '▶';
        }
    }
}

function showError(title, message) {
    hideAll();
    errorTitle.textContent = title;
    errorMessage.textContent = message;

    // Restore default refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-primary';
    refreshBtn.textContent = 'Refresh Page';
    refreshBtn.onclick = () => location.reload();

    const existingBtn = errorState.querySelector('button');
    if (existingBtn) {
        errorState.replaceChild(refreshBtn, existingBtn);
    } else {
        errorState.appendChild(refreshBtn);
    }

    errorState.classList.remove('hidden');
}

function hideAll() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    analyticalSummary.classList.add('hidden');
    sourcesContainer.classList.add('hidden');
}

function formatColumnName(columnName) {
    if (!columnName) return '';

    // Specific business mappings
    if (columnName === 'MITA Inventory Number') return 'MITA Inv No.';

    return columnName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

function formatCellValue(value, columnName) {
    if (value === null || value === undefined || value === '') return '-';
    const lowerCol = columnName ? columnName.toLowerCase() : '';
    if (lowerCol.includes('id') || lowerCol.includes('number') || lowerCol.includes('phone') || lowerCol.includes('code') || lowerCol.includes('no')) {
        return value.toString();
    }
    if (typeof value === 'number') return value.toLocaleString();
    return value;
}

function exportToCSV() {
    if (!currentResults || currentResults.length === 0) return;
    const columns = Object.keys(currentResults[0]);
    let csvContent = columns.join(',') + '\n';
    currentResults.forEach(row => {
        const values = columns.map(column => {
            let value = row[column];
            if (value === null || value === undefined) return '';
            value = value.toString();
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `portal-results-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        if (data.success) {
            console.log('✓ API Healthy:', data.recordCount, 'records');
        }
    } catch (e) { console.warn('Health check failed'); }
}

async function handleFileUpload() {
    const file = csvFileInput.files[0];
    const btnSpan = uploadBtn.querySelector('span');
    const originalText = btnSpan ? btnSpan.textContent : 'Upload Data';

    if (!file) {
        showUploadStatus('Please select a CSV file first.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    // Disable button and show loading
    uploadBtn.disabled = true;
    if (btnSpan) btnSpan.textContent = 'Uploading...';
    showUploadStatus('Uploading and processing data. Please wait...', 'info');

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-csv`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showUploadStatus(`✓ ${data.message}`, 'success');
            csvFileInput.value = '';
            const labelSpan = document.querySelector('.file-label span');
            if (labelSpan) labelSpan.textContent = 'Choose CSV File';
            
            // Refresh sources grid
            loadOfficialSources();
        } else {
            throw new Error(data.details || data.error || 'Failed to upload CSV');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus(`⚠ Upload failed: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = originalText;
    }
}

function showUploadStatus(message, type) {
    if (!uploadStatus) return;
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
    uploadStatus.classList.remove('hidden');
}

function resetUploadSection() {
    if (csvFileInput) csvFileInput.value = '';
    const labelSpan = document.querySelector('.file-label span');
    if (labelSpan) labelSpan.textContent = 'Choose CSV File';
    if (clearFileBtn) clearFileBtn.classList.add('hidden');
    if (uploadStatus) uploadStatus.classList.add('hidden');
}

checkHealth();
updateAuthUI();
