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

// State
let currentResults = [];
let isListening = false;
let sourcesLoaded = false;

// API Configuration
const API_BASE_URL = window.location.origin;

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

function displayResults(data, count, summary, insight, sources) {
    // Clear and hide previous results
    resultsSection.classList.add('hidden');
    analyticalSummary.classList.add('hidden');
    sourcesContainer.classList.add('hidden');

    if (!data || data.length === 0) {
        showError('No Results Found', 'Your query returned no results. Try rephrasing your question.');
        return;
    }

    // Update summary & Combined Insight
    if (summary) {
        // If insight is provided separately, join them. If llmService already unified them, insight will be null.
        const combinedText = insight ? `${summary} ${insight}` : summary;
        analyticalSummary.textContent = combinedText;
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
    return columnName
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

function formatCellValue(value, columnName) {
    if (value === null || value === undefined || value === '') return '-';
    const lowerCol = columnName ? columnName.toLowerCase() : '';
    if (lowerCol.includes('id') || lowerCol.includes('number') || lowerCol.includes('phone') || lowerCol.includes('code')) {
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

checkHealth();
