import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDROGzGRPxjwXJs4ukSdwgiSrUSt3wLE14",
    authDomain: "coba-counter.firebasestorage.app",
    databaseURL: "https://coba-counter-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "coba-counter",
    storageBucket: "coba-counter.firebasestorage.app",
    messagingSenderId: "1004514441681",
    appId: "1:1004514441681:web:2c0b008fda3ffc7fd408f0"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const counterRef = ref(database, 'counter');
const historyRef = ref(database, 'history');

// Elements
const counterValue = document.getElementById('counterValue');
const currentCount = document.getElementById('currentCount');
const targetDisplay = document.getElementById('targetDisplay');
const operatorDisplay = document.getElementById('operatorDisplay');
const productDisplay = document.getElementById('productDisplay');
const layerDisplay = document.getElementById('layerDisplay');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const remainingCount = document.getElementById('remainingCount');
const progressPercentage = document.getElementById('progressPercentage');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const deviceStatus = document.getElementById('deviceStatus');
const lastUpdate = document.getElementById('lastUpdate');
const alertContainer = document.getElementById('alertContainer');
const sessionStatus = document.getElementById('sessionStatus');
const startTime = document.getElementById('startTime');
const duration = document.getElementById('duration');

// Buttons
const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnFinish = document.getElementById('btnFinish');
const btnReset = document.getElementById('btnReset');

let previousValue = 0;
let animationTimer = null;
let sessionStartTime = null;
let durationInterval = null;
let allHistoryData = [];
let productHistoryData = {}; // Store previous sessions by product name

// Listen for real-time updates
onValue(counterRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
        updateDisplay(data);
        updateButtonStates(data);
        
        statusIndicator.classList.remove('status-offline');
        statusIndicator.classList.add('status-online');
        statusText.textContent = 'Connected';
        
        // Update device status
        if (data.deviceOnline) {
            deviceStatus.classList.remove('text-red-600');
            deviceStatus.classList.add('text-green-600');
            deviceStatus.innerHTML = '<i class="fas fa-circle text-green-500 mr-1"></i> Device Online';
        } else {
            deviceStatus.classList.remove('text-green-600');
            deviceStatus.classList.add('text-red-600');
            deviceStatus.innerHTML = '<i class="fas fa-circle text-red-500 mr-1"></i> Device Offline';
        }
        
        if (data.lastUpdate) {
            const timestamp = Number(data.lastUpdate);
            const date = new Date(timestamp);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            lastUpdate.textContent = `${hours}:${minutes}:${seconds}`;
        }
        
        if (data.sessionStatus === 'running' && data.startTime) {
            sessionStartTime = data.startTime;
            if (!durationInterval) {
                durationInterval = setInterval(updateDuration, 1000);
            }
            const startDate = new Date(data.startTime);
            startTime.textContent = startDate.toLocaleTimeString('id-ID');
        } else if (data.sessionStatus === 'paused' && data.startTime) {
            sessionStartTime = data.startTime;
            if (durationInterval) {
                clearInterval(durationInterval);
                durationInterval = null;
            }
            const startDate = new Date(data.startTime);
            startTime.textContent = startDate.toLocaleTimeString('id-ID');
            if (data.finishTime && data.startTime) {
                const dur = data.finishTime - data.startTime;
                duration.textContent = formatDuration(dur);
            }
        } else {
            if (durationInterval) {
                clearInterval(durationInterval);
                durationInterval = null;
            }
            if (data.sessionStatus === 'finished') {
                startTime.textContent = data.startTime ? new Date(data.startTime).toLocaleTimeString('id-ID') : '-';
                if (data.finishTime && data.startTime) {
                    const dur = data.finishTime - data.startTime;
                    duration.textContent = formatDuration(dur);
                }
            } else {
                startTime.textContent = '-';
                duration.textContent = '-';
            }
        }
        
        if (data.value >= data.target && previousValue < data.target) {
            showAlert('success', '<i class="fas fa-trophy"></i> Target Reached! Great job!');
        }
        
        previousValue = data.value || 0;
    }
}, (error) => {
    console.error('Firebase error:', error);
    statusIndicator.classList.remove('status-online');
    statusIndicator.classList.add('status-offline');
    statusText.textContent = 'Disconnected';
});

function updateDisplay(data) {
    const count = data.value || 0;
    const target = data.target || 100;
    const layers = data.layerCount || 1;
    const progress = Math.min((count / target * 100), 100).toFixed(1);
    const remaining = Math.max(target - count, 0);

    const currentDisplayValue = parseInt(counterValue.textContent) || 0;
    if (currentDisplayValue !== count) {
        animateValue(counterValue, currentDisplayValue, count, 300);
    }
    
    currentCount.textContent = count;
    targetDisplay.textContent = target;
    operatorDisplay.textContent = data.operator || '-';
    productDisplay.textContent = data.product || '-';
    layerDisplay.textContent = layers;
    
    progressBar.style.width = progress + '%';
    progressText.textContent = progress + '%';
    
    remainingCount.textContent = remaining;
    progressPercentage.textContent = progress + '%';
    
    const status = data.sessionStatus || 'idle';
    if (status === 'running') {
        sessionStatus.textContent = '● RUNNING';
        sessionStatus.style.background = 'rgba(16, 185, 129, 0.9)';
    } else if (status === 'paused') {
        sessionStatus.textContent = '● PAUSED';
        sessionStatus.style.background = 'rgba(251, 191, 36, 0.9)';
    } else if (status === 'finished') {
        sessionStatus.textContent = '● FINISHED';
        sessionStatus.style.background = 'rgba(59, 130, 246, 0.9)';
    } else {
        sessionStatus.textContent = '● IDLE';
        sessionStatus.style.background = 'rgba(255, 255, 255, 0.2)';
    }
    
    document.getElementById('operatorInput').value = data.operator || '';
    document.getElementById('productInput').value = data.product || '';
    document.getElementById('targetInput').value = target;
    document.getElementById('layerInput').value = layers;
}

function updateButtonStates(data) {
    const status = data.sessionStatus || 'idle';
    
    if (status === 'running') {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnFinish.disabled = false;
        btnReset.disabled = false;
    } else if (status === 'paused') {
        btnStart.disabled = false;
        btnStart.innerHTML = '<i class="fas fa-play"></i> Resume Session';
        btnPause.disabled = true;
        btnFinish.disabled = false;
        btnReset.disabled = false;
    } else if (status === 'finished') {
        btnStart.disabled = false;
        btnStart.innerHTML = '<i class="fas fa-play"></i> Start Session';
        btnPause.disabled = true;
        btnFinish.disabled = true;
        btnReset.disabled = false;
    } else {
        btnStart.disabled = false;
        btnStart.innerHTML = '<i class="fas fa-play"></i> Start Session';
        btnPause.disabled = true;
        btnFinish.disabled = true;
        btnReset.disabled = true;
    }
}

function animateValue(element, start, end, duration) {
    if (animationTimer) {
        clearInterval(animationTimer);
    }

    if (start === end) {
        element.textContent = end;
        return;
    }

    const range = end - start;
    const steps = Math.min(Math.abs(range), 20);
    const stepValue = range / steps;
    const stepDuration = duration / steps;
    let current = start;
    let step = 0;
    
    animationTimer = setInterval(() => {
        step++;
        current += stepValue;
        
        if (step >= steps) {
            element.textContent = end;
            clearInterval(animationTimer);
            animationTimer = null;
        } else {
            element.textContent = Math.round(current);
        }
    }, stepDuration);
}

function updateDuration() {
    if (sessionStartTime) {
        const now = Date.now();
        const elapsed = now - sessionStartTime;
        duration.textContent = formatDuration(elapsed);
    }
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showAlert(type, message) {
    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

// Load product history for continuation feature
async function loadProductHistory() {
    try {
        const snapshot = await get(historyRef);
        const historyData = snapshot.val();
        
        if (historyData) {
            productHistoryData = {};
            
            Object.keys(historyData).forEach(dateKey => {
                const dayData = historyData[dateKey];
                
                if (dayData.Session) {
                    Object.keys(dayData.Session).forEach(sessionKey => {
                        const session = dayData.Session[sessionKey];
                        const productName = session.product;
                        
                        if (productName && productName !== 'Unknown') {
                            if (!productHistoryData[productName]) {
                                productHistoryData[productName] = {
                                    totalCount: 0,
                                    totalTarget: session.target || 0,
                                    lastSession: session
                                };
                            }
                            productHistoryData[productName].totalCount += session.Count || 0;
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading product history:', error);
    }
}

// Configuration
window.updateConfiguration = async function() {
    const operator = document.getElementById('operatorInput').value.trim();
    const product = document.getElementById('productInput').value.trim();
    const target = parseInt(document.getElementById('targetInput').value);
    const layers = parseInt(document.getElementById('layerInput').value) || 1;

    if (!operator || !product || !target || target < 1 || layers < 1) {
        showAlert('warning', '<i class="fas fa-exclamation-triangle"></i> Please fill all fields correctly!');
        return;
    }

    try {
        const snapshot = await get(counterRef);
        const currentData = snapshot.val() || {};
        
        // Check if product changed
        const previousProduct = currentData.product;
        let currentValue = currentData.value || 0;
        
        // If product name matches previous history, load previous progress
        if (product !== previousProduct && productHistoryData[product]) {
            const previousData = productHistoryData[product];
            currentValue = previousData.totalCount;
            showAlert('info', `<i class="fas fa-info-circle"></i> Continuing previous session for ${product}. Current count: ${currentValue}`);
        }

        await update(counterRef, {
            operator: operator,
            product: product,
            target: target,
            layerCount: layers,
            value: currentValue,
            progress: Math.min((currentValue / target * 100), 100),
            lastUpdate: Date.now()
        });

        showAlert('success', '<i class="fas fa-check-circle"></i> Configuration updated successfully!');
    } catch (error) {
        console.error('Error:', error);
        showAlert('warning', '<i class="fas fa-times-circle"></i> Failed to update configuration');
    }
};

// Start or Resume session
window.startSession = async function() {
    try {
        const snapshot = await get(counterRef);
        const data = snapshot.val() || {};
        
        if (!data.operator || !data.product) {
            showAlert('warning', '<i class="fas fa-exclamation-triangle"></i> Please set operator and product first!');
            return;
        }

        const now = Date.now();
        
        // Check if resuming from pause
        if (data.sessionStatus === 'paused') {
            await update(counterRef, {
                sessionStatus: 'running',
                lastUpdate: now
            });
            showAlert('success', '<i class="fas fa-play-circle"></i> Session resumed!');
        } else {
            // Starting new session
            const sessionId = 'Session_' + String(Date.now()).slice(-6);
            
            await update(counterRef, {
                sessionStatus: 'running',
                value: data.value || 0, // Keep existing value if product continues
                progress: data.progress || 0,
                startTime: now,
                finishTime: null,
                downtime: 0,
                efficiency: 100,
                lastUpdate: now,
                currentSessionId: sessionId
            });

            showAlert('success', '<i class="fas fa-play-circle"></i> Session started!');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('warning', '<i class="fas fa-times-circle"></i> Failed to start session');
    }
};

// Pause session
window.pauseSession = async function() {
    try {
        const now = Date.now();
        
        await update(counterRef, {
            sessionStatus: 'paused',
            lastUpdate: now
        });

        showAlert('info', '<i class="fas fa-pause-circle"></i> Session paused');
    } catch (error) {
        console.error('Error:', error);
        showAlert('warning', '<i class="fas fa-times-circle"></i> Failed to pause session');
    }
};

// Finish session
window.finishSession = async function() {
    if (!confirm('Finish this session? Data will be saved to history.')) return;

    try {
        const snapshot = await get(counterRef);
        const data = snapshot.val() || {};
        const now = Date.now();
        
        // Calculate duration and efficiency
        const totalDuration = now - (data.startTime || now);
        const downtime = data.downtime || 0;
        const activeDuration = totalDuration - downtime;
        const efficiency = totalDuration > 0 ? ((activeDuration / totalDuration) * 100).toFixed(1) : 100;
        
        // Update counter status
        await update(counterRef, {
            sessionStatus: 'finished',
            finishTime: now,
            efficiency: parseFloat(efficiency),
            lastUpdate: now
        });

        // Save to history
        const dateKey = new Date(now).toISOString().split('T')[0];
        const sessionId = data.currentSessionId || 'Session_' + String(now).slice(-6);
        
        const historyData = {
            Count: data.value || 0,
            operator: data.operator || 'Unknown',
            product: data.product || 'Unknown',
            target: data.target || 100,
            layers: data.layerCount || 1,
            timestamp: now,
            startTime: data.startTime || now,
            finishTime: now,
            duration: totalDuration,
            downtime: downtime,
            efficiency: parseFloat(efficiency),
            progress: data.progress || 0,
            status: (data.value >= data.target) ? 'completed' : 'incomplete'
        };

        await set(ref(database, `history/${dateKey}/Session/${sessionId}`), historyData);
        
        // Update totalCount
        const daySnapshot = await get(ref(database, `history/${dateKey}`));
        const dayData = daySnapshot.val() || {};
        let totalCount = 0;
        
        if (dayData.Session) {
            Object.values(dayData.Session).forEach(session => {
                totalCount += session.Count || 0;
            });
        }
        
        await set(ref(database, `history/${dateKey}/totalCount`), totalCount);

        // Reload product history
        await loadProductHistory();

        showAlert('info', '<i class="fas fa-flag-checkered"></i> Session finished and saved to history!');
    } catch (error) {
        console.error('Error:', error);
        showAlert('warning', '<i class="fas fa-times-circle"></i> Failed to finish session');
    }
};

// Reset session
window.resetSession = async function() {
    if (!confirm('Reset session? This will clear all data and return to idle state.')) return;

    try {
        await update(counterRef, {
            sessionStatus: 'idle',
            value: 0,
            progress: 0,
            startTime: null,
            finishTime: null,
            downtime: 0,
            efficiency: 0,
            lastUpdate: Date.now(),
            currentSessionId: null
        });

        showAlert('success', '<i class="fas fa-rotate-left"></i> Session reset successfully!');
    } catch (error) {
        console.error('Error:', error);
        showAlert('warning', '<i class="fas fa-times-circle"></i> Failed to reset session');
    }
};

// Tab switching
window.switchTab = function(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    
    if (tab === 'history') {
        loadHistory();
    }
};

// Load history
window.loadHistory = async function() {
    try {
        const snapshot = await get(historyRef);
        const historyData = snapshot.val();
        
        if (!historyData) {
            document.getElementById('historyBody').innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-gray-500 py-8">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>No history data yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        allHistoryData = [];
        let totalSessions = 0;
        let totalProduction = 0;
        let completedSessions = 0;
        let totalEfficiency = 0;

        Object.keys(historyData).forEach(dateKey => {
            const dayData = historyData[dateKey];
            
            if (dayData.Session) {
                Object.keys(dayData.Session).forEach(sessionKey => {
                    const session = dayData.Session[sessionKey];
                    allHistoryData.push({
                        date: dateKey,
                        sessionId: sessionKey,
                        ...session
                    });
                    
                    totalSessions++;
                    totalProduction += session.Count || 0;
                    if (session.status === 'completed') completedSessions++;
                    totalEfficiency += parseFloat(session.efficiency || 0);
                });
            }
        });

        allHistoryData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('totalProduction').textContent = totalProduction;
        document.getElementById('completedSessions').textContent = completedSessions;
        
        const avgEff = totalSessions > 0 ? (totalEfficiency / totalSessions).toFixed(1) : 0;
        document.getElementById('avgEfficiency').textContent = avgEff + '%';

        renderHistoryTable(allHistoryData);

    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                    <p>Error loading history</p>
                </td>
            </tr>
        `;
    }
};

function renderHistoryTable(data) {
    const tbody = document.getElementById('historyBody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-gray-500 py-8">
                    <i class="fas fa-filter text-4xl mb-2"></i>
                    <p>No data found for selected filter</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(session => {
        const progress = ((session.Count / session.target) * 100).toFixed(1);
        const statusBadge = session.status === 'completed' 
            ? '<span class="badge badge-success">Completed</span>'
            : '<span class="badge badge-warning">Incomplete</span>';
        
        const timestamp = new Date(session.timestamp || session.startTime);
        const dateStr = timestamp.toLocaleDateString('id-ID');
        const timeStr = timestamp.toLocaleTimeString('id-ID');
        
        const efficiency = session.efficiency || 0;
        const effColor = efficiency >= 80 ? 'text-emerald-600' : efficiency >= 60 ? 'text-amber-600' : 'text-red-600';
        
        return `
            <tr>
                <td>
                    <div class="font-semibold">${dateStr}</div>
                    <div class="text-xs text-gray-500">${timeStr}</div>
                </td>
                <td><span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">${session.sessionId}</span></td>
                <td class="font-semibold">${session.operator}</td>
                <td>${session.product}</td>
                <td class="text-center text-gray-600">${session.layers || 1}</td>
                <td class="font-bold text-emerald-600">${session.Count}</td>
                <td class="text-gray-600">${session.target}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="flex-1 bg-gray-100 rounded-full h-2">
                            <div class="bg-emerald-500 h-2 rounded-full" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-xs font-semibold">${progress}%</span>
                    </div>
                </td>
                <td class="text-sm">${formatDuration(session.duration || 0)}</td>
                <td class="text-sm text-gray-600">${formatDuration(session.downtime || 0)}</td>
                <td class="font-bold ${effColor}">${efficiency}%</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// Filter by date
window.filterByDate = function() {
    const filterDate = document.getElementById('filterDate').value;
    if (!filterDate) return;
    
    const filtered = allHistoryData.filter(session => session.date === filterDate);
    renderHistoryTable(filtered);
};

window.clearFilter = function() {
    document.getElementById('filterDate').value = '';
    renderHistoryTable(allHistoryData);
};

// Export to Excel
window.exportToExcel = function() {
    if (allHistoryData.length === 0) {
        showAlert('warning', '<i class="fas fa-exclamation-triangle"></i> No data to export!');
        return;
    }

    const ws_data = [
        ['Date', 'Time', 'Session ID', 'Operator', 'Product', 'Layers', 'Count', 'Target', 'Progress (%)', 'Duration', 'Downtime', 'Efficiency (%)', 'Status']
    ];

    allHistoryData.forEach(session => {
        const timestamp = new Date(session.timestamp || session.startTime);
        const dateStr = timestamp.toLocaleDateString('id-ID');
        const timeStr = timestamp.toLocaleTimeString('id-ID');
        const progress = ((session.Count / session.target) * 100).toFixed(1);
        
        ws_data.push([
            dateStr,
            timeStr,
            session.sessionId,
            session.operator,
            session.product,
            session.layers || 1,
            session.Count,
            session.target,
            progress,
            formatDuration(session.duration || 0),
            formatDuration(session.downtime || 0),
            session.efficiency || 0,
            session.status === 'completed' ? 'Completed' : 'Incomplete'
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths
    ws['!cols'] = [
        {wch: 12}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 8},
        {wch: 8}, {wch: 8}, {wch: 10}, {wch: 10},
        {wch: 10}, {wch: 10}, {wch: 12}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Production History');
    
    const filename = `Production_History_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showAlert('success', '<i class="fas fa-check-circle"></i> Excel file downloaded!');
};

// Export to PDF
window.exportToPDF = function() {
    if (allHistoryData.length === 0) {
        showAlert('warning', '<i class="fas fa-exclamation-triangle"></i> No data to export!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Production History Report', 14, 15);
    
    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    
    // Summary
    doc.setFontSize(11);
    doc.text(`Total Sessions: ${allHistoryData.length}`, 14, 30);
    const totalProd = allHistoryData.reduce((sum, s) => sum + (s.Count || 0), 0);
    doc.text(`Total Production: ${totalProd} pcs`, 80, 30);
    const avgEff = (allHistoryData.reduce((sum, s) => sum + (s.efficiency || 0), 0) / allHistoryData.length).toFixed(1);
    doc.text(`Avg Efficiency: ${avgEff}%`, 160, 30);
    
    // Table
    const tableData = allHistoryData.map(session => {
        const timestamp = new Date(session.timestamp || session.startTime);
        const dateStr = timestamp.toLocaleDateString('id-ID');
        const timeStr = timestamp.toLocaleTimeString('id-ID');
        const progress = ((session.Count / session.target) * 100).toFixed(1);
        
        return [
            `${dateStr} ${timeStr}`,
            session.sessionId,
            session.operator,
            session.product,
            session.layers || 1,
            session.Count,
            session.target,
            progress + '%',
            formatDuration(session.duration || 0),
            formatDuration(session.downtime || 0),
            (session.efficiency || 0) + '%',
            session.status === 'completed' ? 'Done' : 'Incomplete'
        ];
    });

    doc.autoTable({
        head: [['Date/Time', 'Session', 'Operator', 'Product', 'Layers', 'Count', 'Target', 'Progress', 'Duration', 'Downtime', 'Eff.', 'Status']],
        body: tableData,
        startY: 38,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [102, 126, 234], fontStyle: 'bold' },
        columnStyles: {
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            10: { halign: 'right' }
        }
    });
    
    const filename = `Production_History_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    showAlert('success', '<i class="fas fa-check-circle"></i> PDF file downloaded!');
};

// Clock
function updateDateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    document.getElementById('date').textContent = `${dayName}, ${day} ${month} ${year}`;
}

updateDateTime();
setInterval(updateDateTime, 1000);

// Load product history on startup
loadProductHistory();
