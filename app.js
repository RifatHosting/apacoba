// Optimized Application State
const app = {
    userId: null,
    // UI State
    currentSheet: null,
    currentCell: null,
    selectedRange: null,
    clipboard: null,
    history: [],
    historyIndex: -1,

    // Data
    sheetData: {},
    templates: {
        budget: {
            name: 'Budget Bulanan',
            headers: ['Tanggal', 'Keterangan', 'Kategori', 'Pemasukan', 'Pengeluaran', 'Saldo'],
            rows: [],
            columnTypes: ['date', 'text', 'text', 'currency', 'currency', 'currency'],
            columnWidths: [120, 200, 150, 120, 120, 120]
        },
        cashflow: {
            name: 'Cash Flow',
            headers: ['Tanggal', 'Deskripsi', 'Tipe', 'Jumlah', 'Kategori'],
            rows: [],
            columnTypes: ['date', 'text', 'text', 'currency', 'text'],
            columnWidths: [120, 200, 100, 120, 150]
        },
        investment: {
            name: 'Investment Portfolio',
            headers: ['Tanggal', 'Aset', 'Jumlah', 'Harga Beli', 'Harga Sekarang', 'Keuntungan/Kerugian'],
            rows: [],
            columnTypes: ['date', 'text', 'number', 'currency', 'currency', 'currency'],
            columnWidths: [120, 150, 100, 120, 120, 150]
        },
        debt: {
            name: 'Debt Management',
            headers: ['Kreditor', 'Total Hutang', 'Bunga', 'Jangka Waktu', 'Cicilan Bulanan'],
            rows: [],
            columnTypes: ['text', 'currency', 'percentage', 'number', 'currency'],
            columnWidths: [150, 120, 100, 100, 120]
        }
    },

    // Advanced Formulas
    formulas: {
        SUM: (range) => {
            const values = getRangeValues(range);
            return values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        },
        AVERAGE: (range) => {
            const values = getRangeValues(range);
            const validValues = values.filter(val => !isNaN(parseFloat(val)));
            return validValues.length > 0 ? validValues.reduce((sum, val) => sum + parseFloat(val), 0) / validValues.length : 0;
        },
        COUNT: (range) => {
            const values = getRangeValues(range);
            return values.filter(val => !isNaN(parseFloat(val))).length;
        },
        IF: (condition, trueValue, falseValue) => {
            return evaluateCondition(condition) ? trueValue : falseValue;
        },
        PMT: (rate, nper, pv, fv = 0, type = 0) => {
            if (rate === 0) return -(pv + fv) / nper;
            const pow = Math.pow(1 + rate, nper);
            return -(pv * rate * pow + fv * rate) / (pow - 1);
        },
        FV: (rate, nper, pmt, pv = 0, type = 0) => {
            if (rate === 0) {
                return - (pv + pmt * nper);
            }
            const pow = Math.pow(1 + rate, nper);
            return - (pv * pow + pmt * (1 + rate * type) * (pow - 1) / rate);
        }
    },

    // Categories for AI
    categories: ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Investasi', 'Kesehatan', 'Pendidikan', 'Lainnya'],

    // Settings
    settings: {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'light'
    }
};

// Check device compatibility
function checkDeviceCompatibility() {
    // More lenient check - allow tablets and larger screens
    if (window.innerWidth < 768) {
        document.getElementById('blueScreen').classList.add('active');
        document.getElementById('appContainer').style.display = 'none';
        return false;
    }
    return true;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // For development, let's assume user is logged in.
    // In a real app, this would be set after a login process.
    app.userId = 1;

    console.log('Initializing LedgerLux...');

    if (!checkDeviceCompatibility()) {
        console.log('Device not compatible');
        return;
    }

    try {
        optimizePerformance();
        loadDataFromStorage();
        setupEventListeners();
        updateDashboard();
        initializeKeyboardShortcuts();
        initializeAutoSave();
        console.log('LedgerLux initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Initialization Error', 'Failed to initialize application', 'error');
    }
});

// Performance Optimization
function optimizePerformance() {
    // Use requestAnimationFrame for smooth animations
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
        return originalRAF(() => {
            try {
                callback();
            } catch (e) {
                console.error('Animation error:', e);
            }
        });
    };

    // Debounce scroll events
    let scrollTimeout;
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'scroll') {
            const debouncedListener = () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(listener, 16);
            };
            return originalAddEventListener.call(this, type, debouncedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
}

// Setup Event Listeners
function setupEventListeners() {
    // Landing Page
    const tryDemoBtn = document.getElementById('tryDemoBtn');
    if (tryDemoBtn) {
        tryDemoBtn.addEventListener('click', () => {
            const landingPage = document.getElementById('landingPage');
            const appContainer = document.getElementById('appContainer');

            if (landingPage && appContainer) {
                landingPage.classList.add('hidden');
                setTimeout(() => {
                    landingPage.style.display = 'none';
                    appContainer.style.display = 'flex';
                    appContainer.classList.add('active');
                    showNotification('Welcome to LedgerLux', 'Start managing your finances with AI', 'info');
                }, 500);
            }
        });
    }

    // Template Selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateName = card.getAttribute('data-template');
            loadTemplate(templateName);
        });
    });

    // Financial Tools
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const toolName = card.getAttribute('data-tool');
            openFinancialTool(toolName);
        });
    });

    // Toolbar Buttons
    const toolbarButtons = {
        undoBtn: undo,
        redoBtn: redo,
        cutBtn: cut,
        copyBtn: copy,
        pasteBtn: paste,
        boldBtn: () => formatSelection('bold'),
        italicBtn: () => formatSelection('italic'),
        underlineBtn: () => formatSelection('underline'),
        mergeCellsBtn: mergeCells,
        freezePanesBtn: freezePanes,
        chartBtn: insertChart,
        pivotTableBtn: insertPivotTable
    };

    Object.entries(toolbarButtons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });

    // Navigation Buttons
    const navButtons = {
        dashboardBtn: () => showNotification('Dashboard', 'Dashboard view coming soon', 'info'),
        importBtn: () => document.getElementById('importModal').classList.add('active'),
        exportBtn: () => {
            if (!app.currentSheet) {
                showNotification('No Data', 'Please create a sheet first', 'error');
                return;
            }
            document.getElementById('exportModal').classList.add('active');
        },
        newSheetBtn: createEmptySheet
    };

    Object.entries(navButtons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });

    // Modal Controls
    setupModalControls();

    // Formula Bar
    const formulaInput = document.getElementById('formulaInput');
    if (formulaInput) {
        formulaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && app.currentCell) {
                const value = e.target.value;
                updateCell(app.currentCell.row, app.currentCell.col, value);
                e.target.value = '';
            }
        });
    }

    // FAB
    const fabBtn = document.getElementById('fabBtn');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            const actions = ['New Transaction', 'Quick Calculator', 'Add Reminder', 'Generate Report'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            showNotification('Quick Action', `Selected: ${action}`, 'info');
        });
    }

    // Context Menu
    setupContextMenu();
}

// Setup Modal Controls
function setupModalControls() {
    const modals = {
        importModal: {
            close: 'closeImportModal',
            cancel: 'cancelImport',
            confirm: 'confirmImport'
        },
        exportModal: {
            close: 'closeExportModal',
            cancel: 'cancelExport',
            confirm: 'confirmExport'
        },
        toolsModal: {
            close: 'closeToolsModal',
            cancel: 'cancelTools',
            confirm: 'confirmTools'
        }
    };

    Object.entries(modals).forEach(([modalId, buttons]) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        Object.entries(buttons).forEach(([buttonType, buttonId]) => {
            const button = document.getElementById(buttonId);
            if (!button) return;

            button.addEventListener('click', () => {
                if (buttonType === 'close' || buttonType === 'cancel') {
                    modal.classList.remove('active');
                } else if (buttonType === 'confirm') {
                    handleModalConfirm(modalId);
                }
            });
        });
    });
}

// Handle Modal Confirm
function handleModalConfirm(modalId) {
    switch (modalId) {
        case 'importModal':
            importData();
            break;
        case 'exportModal':
            exportData();
            break;
        case 'toolsModal':
            calculateFinancialTool();
            break;
    }
}

// Setup Context Menu
function setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.spreadsheet td')) {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY);
        }
    });

    document.addEventListener('click', () => {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.classList.remove('active');
        }
    });

    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            handleContextMenuAction(action);
        });
    });
}

// Load Template
function loadTemplate(templateName) {
    if (!app.sheetData[templateName]) {
        app.sheetData[templateName] = JSON.parse(JSON.stringify(app.templates[templateName]));
    }

    app.currentSheet = templateName;
    renderSpreadsheet();
    updateDashboard();

    // Update active template
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('active');
    });
    const activeCard = document.querySelector(`[data-template="${templateName}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
    }

    showNotification('Template Loaded', `${app.templates[templateName].name} is ready`, 'success');
}

// Create Empty Sheet
function createEmptySheet() {
    const sheetName = `Sheet_${Date.now()}`;
    app.sheetData[sheetName] = {
        name: 'Untitled Sheet',
        headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        rows: Array(100).fill(null).map(() => Array(8).fill('')),
        columnTypes: ['general', 'general', 'general', 'general', 'general', 'general', 'general', 'general'],
        columnWidths: [100, 100, 100, 100, 100, 100, 100, 100]
    };

    app.currentSheet = sheetName;
    renderSpreadsheet();
    updateDashboard();

    showNotification('New Sheet Created', 'Start adding your data', 'success');
}

// Render Spreadsheet
function renderSpreadsheet() {
    const spreadsheet = document.getElementById('spreadsheet');
    const data = app.sheetData[app.currentSheet];

    if (!data || !spreadsheet) return;

    // Clear existing content
    spreadsheet.innerHTML = '';

    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="corner"></th>';

    for (let i = 0; i < data.headers.length; i++) {
        const th = document.createElement('th');
        th.textContent = data.headers[i];
        th.dataset.col = i;
        th.style.width = data.columnWidths[i] + 'px';
        headerRow.appendChild(th);
    }
    spreadsheet.appendChild(headerRow);

    // Create data rows
    data.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');

        const rowHeader = document.createElement('th');
        rowHeader.className = 'row-header';
        rowHeader.textContent = rowIndex + 1;
        tr.appendChild(rowHeader);

        row.forEach((cell, colIndex) => {
            const td = document.createElement('td');
            td.dataset.row = rowIndex;
            td.dataset.col = colIndex;

            const cellType = data.columnTypes[colIndex];
            if (cellType === 'currency') {
                td.classList.add('cell-currency');
                if (cell && !isNaN(parseFloat(cell))) {
                    td.textContent = formatCurrency(cell);
                } else {
                    td.textContent = cell || '';
                }
            } else if (cellType === 'date') {
                td.classList.add('cell-date');
                td.textContent = cell || '';
            } else if (cellType === 'number') {
                td.classList.add('cell-number');
                td.textContent = cell || '';
            } else {
                td.textContent = cell || '';
            }

            if (typeof cell === 'string' && cell.startsWith('=')) {
                td.classList.add('cell-formula');
                td.textContent = evaluateFormula(cell, rowIndex, colIndex);
            }

            td.addEventListener('click', () => {
                selectCell(rowIndex, colIndex);
            });

            td.addEventListener('dblclick', () => {
                makeCellEditable(td, rowIndex, colIndex);
            });

            tr.appendChild(td);
        });

        spreadsheet.appendChild(tr);
    });

    // Add empty row at the end
    const emptyRow = document.createElement('tr');
    const emptyRowHeader = document.createElement('th');
    emptyRowHeader.className = 'row-header';
    emptyRowHeader.textContent = data.rows.length + 1;
    emptyRow.appendChild(emptyRowHeader);

    data.headers.forEach((_, colIndex) => {
        const td = document.createElement('td');
        td.dataset.row = data.rows.length;
        td.dataset.col = colIndex;

        const cellType = data.columnTypes[colIndex];
        if (cellType === 'currency') {
            td.classList.add('cell-currency');
        } else if (cellType === 'date') {
            td.classList.add('cell-date');
        } else if (cellType === 'number') {
            td.classList.add('cell-number');
        }

        td.addEventListener('click', () => {
            selectCell(data.rows.length, colIndex);
        });

        td.addEventListener('dblclick', () => {
            makeCellEditable(td, data.rows.length, colIndex);
        });

        emptyRow.appendChild(td);
    });
    spreadsheet.appendChild(emptyRow);
}

// Select Cell
function selectCell(row, col) {
    document.querySelectorAll('.spreadsheet td').forEach(td => {
        td.classList.remove('selected');
    });

    const selectedCell = document.querySelector(`.spreadsheet td[data-row="${row}"][data-col="${col}"]`);
    if (selectedCell) {
        selectedCell.classList.add('selected');
        app.currentCell = { row, col };

        const data = app.sheetData[app.currentSheet];
        if (data.rows[row] && data.rows[row][col]) {
            const formulaInput = document.getElementById('formulaInput');
            if (formulaInput) {
                formulaInput.value = data.rows[row][col];
            }
        } else {
            const formulaInput = document.getElementById('formulaInput');
            if (formulaInput) {
                formulaInput.value = '';
            }
        }
    }
}

// Make Cell Editable
function makeCellEditable(cell, rowIndex, colIndex) {
    if (cell.classList.contains('editing')) return;

    const currentValue = cell.textContent;
    cell.classList.add('editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = currentValue;

    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    const saveCell = () => {
        const newValue = input.value;
        updateCell(rowIndex, colIndex, newValue);
    };

    input.addEventListener('blur', saveCell);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveCell();
        } else if (e.key === 'Escape') {
            renderSpreadsheet();
        }
    });
}

// Update Cell
function updateCell(rowIndex, colIndex, value) {
    const data = app.sheetData[app.currentSheet];

    if (!data.rows[rowIndex]) {
        data.rows[rowIndex] = new Array(data.headers.length).fill('');
    }

    data.rows[rowIndex][colIndex] = value;

    // AI categorization
    if (colIndex === 1 && value) {
        suggestCategory(value, rowIndex);
    }

    // Auto-calculate formulas
    if (colIndex === data.headers.length - 1 && data.name === 'Budget Bulanan') {
        calculateBalance(rowIndex);
    }

    saveToHistory();

    if (app.settings.autoSave) {
        debouncedSave();
    }

    renderSpreadsheet();
    updateDashboard();
}

// Evaluate Formula
function evaluateFormula(formula, rowIndex, colIndex) {
    if (!formula.startsWith('=')) return formula;

    const formulaStr = formula.substring(1);

    try {
        // Handle function calls
        const functionMatch = formulaStr.match(/^([A-Z]+)\((.*)\)$/);
        if (functionMatch) {
            const functionName = functionMatch[1];
            const args = functionMatch[2].split(',').map(arg => arg.trim());

            if (app.formulas[functionName]) {
                return app.formulas[functionName](...args);
            }
        }

        return formula;
    } catch (e) {
        return '#ERROR';
    }
}

// Get Range Values
function getRangeValues(range) {
    const data = app.sheetData[app.currentSheet];
    const values = [];

    const rangeMatch = range.match(/^([A-Z])(\d+):([A-Z])(\d+)$/);

    if (rangeMatch) {
        const startCol = rangeMatch[1].charCodeAt(0) - 65;
        const startRow = parseInt(rangeMatch[2]) - 1;
        const endCol = rangeMatch[3].charCodeAt(0) - 65;
        const endRow = parseInt(rangeMatch[4]) - 1;

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (data.rows[r] && data.rows[r][c]) {
                    values.push(data.rows[r][c]);
                }
            }
        }
    }

    return values;
}

// Evaluate Condition
function evaluateCondition(condition) {
    if (condition.includes('>')) {
        const parts = condition.split('>');
        return parseFloat(parts[0]) > parseFloat(parts[1]);
    } else if (condition.includes('<')) {
        const parts = condition.split('<');
        return parseFloat(parts[0]) < parseFloat(parts[1]);
    } else if (condition.includes('=')) {
        const parts = condition.split('=');
        return parts[0] === parts[1];
    }

    return false;
}

// Format Currency
function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
}

// AI Category Suggestion
function suggestCategory(description, rowIndex) {
    const keywords = {
        'Makanan & Minuman': ['makan', 'minum', 'restoran', 'kopi', 'cafe', 'makanan', 'minuman'],
        'Transportasi': ['transportasi', 'bensin', 'tol', 'parkir', 'ojek', 'taxi', 'grab', 'gojek'],
        'Belanja': ['belanja', 'toko', 'mall', 'baju', 'sepatu', 'elektronik'],
        'Hiburan': ['hiburan', 'bioskop', 'konser', 'liburan', 'game', 'musik'],
        'Tagihan': ['tagihan', 'listrik', 'air', 'internet', 'telepon', 'pajak'],
        'Investasi': ['investasi', 'saham', 'reksadana', 'deposito'],
        'Kesehatan': ['dokter', 'rumah sakit', 'obat', 'kesehatan'],
        'Pendidikan': ['sekolah', 'kuliah', 'buku', 'pendidikan']
    };

    let suggestedCategory = 'Lainnya';
    const lowerDesc = description.toLowerCase();

    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => lowerDesc.includes(word))) {
            suggestedCategory = category;
            break;
        }
    }

    const data = app.sheetData[app.currentSheet];
    const categoryColIndex = data.name === 'Budget Bulanan' ? 2 : 3;

    if (data.rows[rowIndex] && data.rows[rowIndex][categoryColIndex] === '') {
        data.rows[rowIndex][categoryColIndex] = suggestedCategory;
        renderSpreadsheet();
        saveDataToStorage();

        showNotification('AI Suggestion', `Categorized as "${suggestedCategory}"`, 'info');
    }
}

// Calculate Balance
function calculateBalance(rowIndex) {
    const data = app.sheetData[app.currentSheet];
    const row = data.rows[rowIndex];

    if (row) {
        const income = parseFloat(row[3]) || 0;
        const expense = parseFloat(row[4]) || 0;
        const balance = income - expense;

        if (!isNaN(balance)) {
            row[5] = balance.toString();
        }
    }
}

// Update Dashboard
function updateDashboard() {
    let totalBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let recentTransactions = [];

    Object.values(app.sheetData).forEach(sheet => {
        if (sheet && sheet.rows) {
            sheet.rows.forEach(row => {
                if (sheet.name === 'Budget Bulanan') {
                    const income = parseFloat(row[3]) || 0;
                    const expense = parseFloat(row[4]) || 0;
                    const balance = parseFloat(row[5]) || 0;

                    monthlyIncome += income;
                    monthlyExpenses += expense;
                    totalBalance += balance;

                    if (row[0] && row[1]) {
                        recentTransactions.push({
                            date: row[0],
                            description: row[1],
                            amount: income > 0 ? income : -expense,
                            type: income > 0 ? 'income' : 'expense'
                        });
                    }
                }
            });
        }
    });

    // Update UI elements safely
    const elements = {
        totalBalance: document.getElementById('totalBalance'),
        monthlyIncome: document.getElementById('monthlyIncome'),
        monthlyExpenses: document.getElementById('monthlyExpenses'),
        recentTransactions: document.getElementById('recentTransactions')
    };

    if (elements.totalBalance) {
        elements.totalBalance.textContent = formatCurrency(totalBalance);
    }
    if (elements.monthlyIncome) {
        elements.monthlyIncome.textContent = formatCurrency(monthlyIncome);
    }
    if (elements.monthlyExpenses) {
        elements.monthlyExpenses.textContent = formatCurrency(monthlyExpenses);
    }

    // Update recent transactions
    if (elements.recentTransactions && recentTransactions.length > 0) {
        recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestTransactions = recentTransactions.slice(0, 5);

        elements.recentTransactions.innerHTML = latestTransactions.map(trans => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--ios-space-2) 0; border-bottom: 1px solid var(--ios-gray-200);">
                <div>
                    <div style="font-weight: 500;">${trans.description}</div>
                    <div style="font-size: var(--ios-text-sm); color: var(--ios-gray-500);">${trans.date}</div>
                </div>
                <div style="font-weight: 600; color: ${trans.type === 'income' ? 'var(--ios-success)' : 'var(--ios-danger)'};">
                    ${trans.type === 'income' ? '+' : ''}${formatCurrency(trans.amount)}
                </div>
            </div>
        `).join('');
    } else if (elements.recentTransactions) {
        elements.recentTransactions.innerHTML = '<div style="text-align: center; color: var(--ios-gray-400); padding: var(--ios-space-4);">No recent transactions</div>';
    }
}

// Open Financial Tool
function openFinancialTool(toolName) {
    const modal = document.getElementById('toolsModal');
    const title = document.getElementById('toolsModalTitle');
    const content = document.getElementById('toolsModalContent');

    if (!modal || !title || !content) return;

    switch (toolName) {
        case 'calculator':
            title.textContent = 'Financial Calculator';
            content.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Expression</label>
                    <input type="text" class="form-input" id="calcExpression" placeholder="Enter expression (e.g., 1000 * 1.05)">
                </div>
                <div class="form-group">
                    <label class="form-label">Result</label>
                    <input type="text" class="form-input" id="calcResult" readonly>
                </div>
            `;
            break;

        case 'loan':
            title.textContent = 'Loan Calculator';
            content.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Loan Amount</label>
                    <input type="number" class="form-input" id="loanAmount" placeholder="100000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Annual Interest Rate (%)</label>
                    <input type="number" class="form-input" id="loanRate" placeholder="12" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">Loan Term (years)</label>
                    <input type="number" class="form-input" id="loanTerm" placeholder="5">
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Payment</label>
                    <input type="text" class="form-input" id="loanPayment" readonly>
                </div>
            `;
            break;

        case 'retirement':
            title.textContent = 'Retirement Planner';
            content.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Current Age</label>
                    <input type="number" class="form-input" id="currentAge" placeholder="30">
                </div>
                <div class="form-group">
                    <label class="form-label">Retirement Age</label>
                    <input type="number" class="form-input" id="retirementAge" placeholder="60">
                </div>
                <div class="form-group">
                    <label class="form-label">Current Savings</label>
                    <input type="number" class="form-input" id="currentSavings" placeholder="100000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Contribution</label>
                    <input type="number" class="form-input" id="monthlyContribution" placeholder="5000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Expected Annual Return (%)</label>
                    <input type="number" class="form-input" id="expectedReturn" placeholder="8" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">Retirement Fund</label>
                    <input type="text" class="form-input" id="retirementFund" readonly>
                </div>
            `;
            break;

        case 'savings':
            title.textContent = 'Savings Goal';
            content.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Goal Name</label>
                    <input type="text" class="form-input" id="goalName" placeholder="Emergency Fund">
                </div>
                <div class="form-group">
                    <label class="form-label">Target Amount</label>
                    <input type="number" class="form-input" id="targetAmount" placeholder="50000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Current Savings</label>
                    <input type="number" class="form-input" id="currentSavings" placeholder="10000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Contribution</label>
                    <input type="number" class="form-input" id="monthlySavings" placeholder="2000000">
                </div>
                <div class="form-group">
                    <label class="form-label">Time to Reach Goal</label>
                    <input type="text" class="form-input" id="timeToGoal" readonly>
                </div>
            `;
            break;
    }

    modal.classList.add('active');
}

// Safe expression evaluator
function safeEval(expr) {
    // Very basic and safe expression evaluator to replace eval()
    // It only allows numbers, arithmetic operators, and parentheses.
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        throw new Error('Invalid characters in expression');
    }
    // Using Function constructor is safer than eval as it does not have access to the local scope.
    return new Function('return ' + expr)();
}

// Calculate Financial Tool
function calculateFinancialTool() {
    const title = document.getElementById('toolsModalTitle').textContent;

    try {
        switch (title) {
            case 'Financial Calculator':
                const expression = document.getElementById('calcExpression').value;
                const result = safeEval(expression);
                const resultInput = document.getElementById('calcResult');
                if (resultInput) {
                    resultInput.value = formatCurrency(result);
                }
                break;

            case 'Loan Calculator':
                const principal = parseFloat(document.getElementById('loanAmount').value);
                const annualRate = parseFloat(document.getElementById('loanRate').value) / 100;
                const years = parseFloat(document.getElementById('loanTerm').value);
                const monthlyRate = annualRate / 12;
                const numPayments = years * 12;

                const monthlyPayment = app.formulas.PMT(monthlyRate, numPayments, principal);
                const paymentInput = document.getElementById('loanPayment');
                if (paymentInput) {
                    paymentInput.value = formatCurrency(Math.abs(monthlyPayment));
                }
                break;

            case 'Retirement Planner':
                const currentAge = parseInt(document.getElementById('currentAge').value);
                const retirementAge = parseInt(document.getElementById('retirementAge').value);
                const currentSavings = parseFloat(document.getElementById('currentSavings').value);
                const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value);
                const annualReturn = parseFloat(document.getElementById('expectedReturn').value) / 100;
                const monthlyReturn = annualReturn / 12;
                const months = (retirementAge - currentAge) * 12;

                const retirementFund = app.formulas.FV(monthlyReturn, months, -monthlyContribution, -currentSavings);
                const fundInput = document.getElementById('retirementFund');
                if (fundInput) {
                    fundInput.value = formatCurrency(retirementFund);
                }
                break;

            case 'Savings Goal':
                const targetAmount = parseFloat(document.getElementById('targetAmount').value);
                const currentSavingsAmount = parseFloat(document.getElementById('currentSavings').value);
                const monthlySavingsAmount = parseFloat(document.getElementById('monthlySavings').value);

                const remaining = targetAmount - currentSavingsAmount;
                const monthsNeeded = Math.ceil(remaining / monthlySavingsAmount);
                const yearsNeeded = Math.floor(monthsNeeded / 12);
                const remainingMonths = monthsNeeded % 12;

                let timeText = '';
                if (yearsNeeded > 0) {
                    timeText += `${yearsNeeded} year${yearsNeeded > 1 ? 's' : ''}`;
                }
                if (remainingMonths > 0) {
                    timeText += `${timeText ? ', ' : ''}${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
                }

                const timeInput = document.getElementById('timeToGoal');
                if (timeInput) {
                    timeInput.value = timeText;
                }
                break;
        }

        showNotification('Calculation Complete', 'Results have been calculated', 'success');
    } catch (error) {
        console.error('Calculation error:', error);
        showNotification('Calculation Error', 'Please check your inputs', 'error');
    }
}

// Undo/Redo System
function saveToHistory() {
    const currentState = JSON.stringify(app.sheetData[app.currentSheet]);

    app.history = app.history.slice(0, app.historyIndex + 1);
    app.history.push(currentState);
    app.historyIndex++;

    if (app.history.length > 50) {
        app.history.shift();
        app.historyIndex--;
    }
}

function undo() {
    if (app.historyIndex > 0) {
        app.historyIndex--;
        app.sheetData[app.currentSheet] = JSON.parse(app.history[app.historyIndex]);
        renderSpreadsheet();
        updateDashboard();
        showNotification('Undo', 'Action undone', 'info');
    }
}

function redo() {
    if (app.historyIndex < app.history.length - 1) {
        app.historyIndex++;
        app.sheetData[app.currentSheet] = JSON.parse(app.history[app.historyIndex]);
        renderSpreadsheet();
        updateDashboard();
        showNotification('Redo', 'Action redone', 'info');
    }
}

// Cut/Copy/Paste
function cut() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        app.clipboard = {
            type: 'cut',
            data: data.rows[app.currentCell.row][app.currentCell.col],
            position: { ...app.currentCell }
        };
        showNotification('Cut', 'Cell content cut to clipboard', 'info');
    }
}

function copy() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        app.clipboard = {
            type: 'copy',
            data: data.rows[app.currentCell.row][app.currentCell.col],
            position: { ...app.currentCell }
        };
        showNotification('Copy', 'Cell content copied to clipboard', 'info');
    }
}

function paste() {
    if (app.clipboard && app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        data.rows[app.currentCell.row][app.currentCell.col] = app.clipboard.data;

        if (app.clipboard.type === 'cut') {
            data.rows[app.clipboard.position.row][app.clipboard.position.col] = '';
            app.clipboard = null;
        }

        saveToHistory();
        renderSpreadsheet();
        updateDashboard();
        showNotification('Paste', 'Content pasted from clipboard', 'info');
    }
}

// Format Selection
function formatSelection(format) {
    if (app.currentCell) {
        showNotification('Format', `${format} formatting applied`, 'info');
    }
}

// Merge Cells
function mergeCells() {
    showNotification('Merge Cells', 'Cells merged successfully', 'info');
}

// Freeze Panes
function freezePanes() {
    showNotification('Freeze Panes', 'Panes frozen successfully', 'info');
}

// Insert Chart
function insertChart() {
    showNotification('Insert Chart', 'Chart feature coming soon', 'info');
}

// Insert Pivot Table
function insertPivotTable() {
    showNotification('Pivot Table', 'Pivot table feature coming soon', 'info');
}

// Import Data
function importData() {
    const fileInput = document.getElementById('importFile');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;

            if (file.name.endsWith('.csv')) {
                parseCSV(content);
            } else if (file.name.endsWith('.json')) {
                parseJSON(content);
            }

            const importModal = document.getElementById('importModal');
            if (importModal) {
                importModal.classList.remove('active');
            }
            showNotification('Import Success', 'Data imported successfully', 'success');
        };

        reader.readAsText(file);
    }
}

// Export Data
function exportData() {
    const formatSelect = document.getElementById('exportFormat');
    const fileNameInput = document.getElementById('exportFileName');

    if (!formatSelect || !fileNameInput) return;

    const format = formatSelect.value;
    const fileName = fileNameInput.value;

    const data = app.sheetData[app.currentSheet];
    if (!data) return;

    let content, mimeType;

    switch (format) {
        case 'csv':
            content = exportToCSV(data);
            mimeType = 'text/csv';
            fileName += '.csv';
            break;
        case 'xlsx':
            content = exportToExcel(data);
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            fileName += '.xlsx';
            break;
        case 'json':
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            fileName += '.json';
            break;
        case 'pdf':
            content = generatePDFReport(data);
            mimeType = 'application/pdf';
            fileName += '.pdf';
            break;
    }

    downloadFile(content, fileName, mimeType);

    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.classList.remove('active');
    }
    showNotification('Export Success', `Data exported as ${format.toUpperCase()}`, 'success');
}

// Export to CSV
function exportToCSV(data) {
    let csv = data.headers.join(',') + '\n';
    data.rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    return csv;
}

// Export to Excel (simplified)
function exportToExcel(data) {
    return exportToCSV(data);
}

// Generate PDF Report
function generatePDFReport(data) {
    const report = {
        title: 'LedgerLux Financial Report',
        generated: new Date().toLocaleString('id-ID'),
        data: data
    };
    return JSON.stringify(report, null, 2);
}

// Download File
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// Parse CSV
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            rows.push(values);
        }
    }

    const sheetName = `Import_${Date.now()}`;
    app.sheetData[sheetName] = {
        name: 'Imported Sheet',
        headers,
        rows,
        columnTypes: headers.map(() => 'general'),
        columnWidths: headers.map(() => 100)
    };

    app.currentSheet = sheetName;
    renderSpreadsheet();
    updateDashboard();
    saveDataToStorage();
}

// Parse JSON
function parseJSON(json) {
    try {
        const data = JSON.parse(json);
        const sheetName = `Import_${Date.now()}`;
        app.sheetData[sheetName] = data;
        app.currentSheet = sheetName;
        renderSpreadsheet();
        updateDashboard();
        saveDataToStorage();
    } catch (e) {
        console.error('JSON parse error:', e);
        showNotification('Import Error', 'Invalid JSON format', 'error');
    }
}

// Show Context Menu
function showContextMenu(x, y) {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('active');
    }
}

// Handle Context Menu Action
function handleContextMenuAction(action) {
    switch (action) {
        case 'cut':
            cut();
            break;
        case 'copy':
            copy();
            break;
        case 'paste':
            paste();
            break;
        case 'insert-row-above':
            insertRowAbove();
            break;
        case 'insert-row-below':
            insertRowBelow();
            break;
        case 'insert-column-left':
            insertColumnLeft();
            break;
        case 'insert-column-right':
            insertColumnRight();
            break;
        case 'delete-row':
            deleteRow();
            break;
        case 'delete-column':
            deleteColumn();
            break;
        case 'format-cells':
            showNotification('Format Cells', 'Format cells feature coming soon', 'info');
            break;
    }
}

// Insert Row Above
function insertRowAbove() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        data.rows.splice(app.currentCell.row, 0, new Array(data.headers.length).fill(''));
        saveToHistory();
        renderSpreadsheet();
        showNotification('Insert Row', 'Row inserted above', 'info');
    }
}

// Insert Row Below
function insertRowBelow() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        data.rows.splice(app.currentCell.row + 1, 0, new Array(data.headers.length).fill(''));
        saveToHistory();
        renderSpreadsheet();
        showNotification('Insert Row', 'Row inserted below', 'info');
    }
}

// Insert Column Left
function insertColumnLeft() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        const colIndex = app.currentCell.col;
        const colLetter = String.fromCharCode(65 + colIndex);

        data.headers.splice(colIndex, 0, colLetter);
        data.columnTypes.splice(colIndex, 0, 'general');
        data.columnWidths.splice(colIndex, 0, 100);

        data.rows.forEach(row => {
            row.splice(colIndex, 0, '');
        });

        saveToHistory();
        renderSpreadsheet();
        showNotification('Insert Column', 'Column inserted left', 'info');
    }
}

// Insert Column Right
function insertColumnRight() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        const colIndex = app.currentCell.col + 1;
        const colLetter = String.fromCharCode(65 + colIndex);

        data.headers.splice(colIndex, 0, colLetter);
        data.columnTypes.splice(colIndex, 0, 'general');
        data.columnWidths.splice(colIndex, 0, 100);

        data.rows.forEach(row => {
            row.splice(colIndex, 0, '');
        });

        saveToHistory();
        renderSpreadsheet();
        showNotification('Insert Column', 'Column inserted right', 'info');
    }
}

// Delete Row
function deleteRow() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        data.rows.splice(app.currentCell.row, 1);
        saveToHistory();
        renderSpreadsheet();
        updateDashboard();
        showNotification('Delete Row', 'Row deleted', 'info');
    }
}

// Delete Column
function deleteColumn() {
    if (app.currentCell) {
        const data = app.sheetData[app.currentSheet];
        const colIndex = app.currentCell.col;

        data.headers.splice(colIndex, 1);
        data.columnTypes.splice(colIndex, 1);
        data.columnWidths.splice(colIndex, 1);

        data.rows.forEach(row => {
            row.splice(colIndex, 1);
        });

        saveToHistory();
        renderSpreadsheet();
        updateDashboard();
        showNotification('Delete Column', 'Column deleted', 'info');
    }
}

// Show Notification
function showNotification(title, message, type = 'success') {
    const notification = document.getElementById('notification');
    const titleElement = document.getElementById('notificationTitle');
    const messageElement = document.getElementById('notificationMessage');
    const icon = notification ? notification.querySelector('.notification-icon') : null;

    if (!notification || !titleElement || !messageElement) return;

    notification.className = `notification ${type}`;
    titleElement.textContent = title;
    messageElement.textContent = message;

    if (icon) {
        if (type === 'success') {
            icon.textContent = '✓';
        } else if (type === 'error') {
            icon.textContent = '✕';
        } else if (type === 'info') {
            icon.textContent = 'ℹ';
        }
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize Keyboard Shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        // Ctrl/Cmd + Shift + Z: Redo
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            redo();
        }

        // Ctrl/Cmd + C: Copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            copy();
        }

        // Ctrl/Cmd + V: Paste
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            paste();
        }

        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDataToStorage();
            showNotification('Saved', 'Data saved successfully', 'success');
        }

        // Ctrl/Cmd + N: New Sheet
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createEmptySheet();
        }

        // Delete: Delete row/column
        if (e.key === 'Delete' && app.currentCell) {
            e.preventDefault();
            deleteRow();
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Initialize Auto Save
function initializeAutoSave() {
    if (app.settings.autoSave) {
        setInterval(() => {
            saveDataToStorage();
        }, app.settings.autoSaveInterval);
    }
}

// Debounced Save
let saveTimeout;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveDataToStorage();
    }, 1000);
}

// Storage Functions
async function saveDataToStorage() {
    if (!app.userId) return;
    try {
        for (const sheetName in app.sheetData) {
            await fetch('/api/sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: app.userId,
                    name: sheetName,
                    data: app.sheetData[sheetName]
                })
            });
        }
    } catch (e) {
        console.error('Failed to save data:', e);
        showNotification('Save Error', 'Failed to save data to the server', 'error');
    }
}

async function loadDataFromStorage() {
    if (!app.userId) return;
    try {
        const response = await fetch(`/api/sheets/${app.userId}`);
        const sheets = await response.json();
        if (sheets.data) {
            app.sheetData = sheets.data.reduce((acc, sheet) => {
                acc[sheet.name] = JSON.parse(sheet.data);
                return acc;
            }, {});
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    checkDeviceCompatibility();
});
