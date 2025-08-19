const protocolCtx = document.getElementById('protocol-chart').getContext('2d');
const threatsCtx = document.getElementById('threats-chart').getContext('2d');

const initialProtocolData = {
    labels: ['TCP', 'UDP', 'ICMP', 'Other'],
    datasets: [{
        label: 'Protocol Distribution',
        data: [0, 0, 0, 0],
        backgroundColor: ['#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        borderColor: '#ffffff',
        borderWidth: 2
    }]
};

const protocolChart = new Chart(protocolCtx, {
    type: 'doughnut',
    data: initialProtocolData,
    options: { responsive: true, maintainAspectRatio: false }
});

const initialThreatsData = {
    labels: [],
    datasets: [{
        label: 'Detected Threats',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
    }]
};

const threatsChart = new Chart(threatsCtx, {
    type: 'line',
    data: initialThreatsData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    }
});

// --- Monitoring Logic ---
const toggleBtn = document.getElementById('toggle-btn');
const logArea = document.getElementById('log-area');
let isMonitoring = false;
let threatCount = 0;

toggleBtn.addEventListener('click', () => {
    isMonitoring = !isMonitoring;
    if (isMonitoring) {
        toggleBtn.textContent = 'Stop Monitoring';
        window.api.startMonitoring();
    } else {
        toggleBtn.textContent = 'Start Monitoring';
        window.api.stopMonitoring();
        resetDashboard();
    }
});

// Listen for the 'packet-data' event forwarded by the main process
window.api.onPacket((data) => {
    const packetInfo = JSON.parse(data);

    // **FIX:** Check for and display the new sniffer error message
    if (packetInfo.error) {
        addLog(`[PYTHON ERROR] ${packetInfo.error}`);
        return;
    }

    if (packetInfo.protocol_counts) {
        protocolChart.data.datasets[0].data = Object.values(packetInfo.protocol_counts);
        protocolChart.update();
    }
    
    if (packetInfo.log) { // For single system messages or packet logs
        addLog(packetInfo.log);
        
        // Update threats chart for each packet log
        threatCount++;
        const now = new Date();
        const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        threatsChart.data.labels.push(timestamp);
        threatsChart.data.datasets[0].data.push(threatCount);

        if (threatsChart.data.labels.length > 20) {
            threatsChart.data.labels.shift();
            threatsChart.data.datasets[0].data.shift();
        }
        threatsChart.update();
    }
});

function addLog(message) {
    const p = document.createElement('p');
    p.textContent = `> ${message}`;
    logArea.appendChild(p);
    logArea.scrollTop = logArea.scrollHeight;
}

function resetDashboard() {
    threatCount = 0;
    logArea.innerHTML = '';
    
    protocolChart.data.datasets[0].data = [0, 0, 0, 0];
    protocolChart.update();

    threatsChart.data.labels = [];
    threatsChart.data.datasets[0].data = [];
    threatsChart.update();

    addLog("[System] Dashboard has been reset.");
}
