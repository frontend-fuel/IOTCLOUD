let currentChannel = null;
let allChannels = [];
let currentChannelIndex = 0;
let charts = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Channel detail page initializing...');
    try {
        // Check authentication first
        console.log('🔐 Checking authentication...');
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
            console.log('❌ Not authenticated, redirecting to login');
            window.location.href = '/';
            return;
        }
        console.log('✅ User authenticated');
        
        // Get channel ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const channelId = urlParams.get('id');
        
        console.log('📋 Channel ID from URL:', channelId);
        
        if (!channelId) {
            console.log('❌ No channel ID found, redirecting to dashboard');
            window.location.href = '/dashboard.html';
            return;
        }

        // Load channel data
        console.log('📡 Loading channel details...');
        await loadChannelDetails(channelId);
        console.log('📡 Loading all channels...');
        await loadAllChannels();
        console.log('✅ Channel detail page initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing channel detail page:', error);
        showNotification('Failed to load channel details: ' + error.message, 'error');
    }
});

// Load channel details
async function loadChannelDetails(channelId) {
    try {
        console.log('Loading channel details for ID:', channelId);
        const response = await fetch(`/api/channels/${channelId}`);
        console.log('Channel details response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Channel details error response:', errorText);
            throw new Error(`Failed to fetch channel: ${response.status}`);
        }
        
        currentChannel = await response.json();
        console.log('Loaded channel:', currentChannel);
        displayChannelInfo();
        await loadChannelData();
        
    } catch (error) {
        console.error('Error loading channel details:', error);
        showNotification('Failed to load channel details', 'error');
    }
}

// Load all channels for navigation
async function loadAllChannels() {
    try {
        const response = await fetch('/api/channels');
        if (response.ok) {
            allChannels = await response.json();
            currentChannelIndex = allChannels.findIndex(c => c._id === currentChannel._id);
        }
    } catch (error) {
        console.error('Error loading all channels:', error);
    }
}

// Display channel information
function displayChannelInfo() {
    if (!currentChannel) return;
    
    // Update page title and header
    const channelNameEl = document.getElementById('channelName');
    if (channelNameEl) {
        channelNameEl.textContent = currentChannel.name;
    }
    document.title = `${currentChannel.name} - IoT Cloud Platform`;
    
    // Update stats with null checks
    const totalEntriesEl = document.getElementById('totalEntries');
    if (totalEntriesEl) {
        totalEntriesEl.textContent = currentChannel.entryCount || 0;
    }
    
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = currentChannel.lastEntry ? 
            new Date(currentChannel.lastEntry).toLocaleString() : 'Never';
    }
    
    const activeFieldsEl = document.getElementById('activeFields');
    if (activeFieldsEl) {
        activeFieldsEl.textContent = currentChannel.fields ? currentChannel.fields.length : 0;
    }
    
    // Update channel information with null checks
    const channelNameInfoEl = document.getElementById('channelNameInfo');
    if (channelNameInfoEl) {
        channelNameInfoEl.textContent = currentChannel.name;
    }
    
    const channelDescriptionEl = document.getElementById('channelDescription');
    if (channelDescriptionEl) {
        channelDescriptionEl.textContent = currentChannel.description || 'No description provided';
    }
    
    const channelCreatedEl = document.getElementById('channelCreated');
    if (channelCreatedEl) {
        channelCreatedEl.textContent = new Date(currentChannel.createdAt).toLocaleDateString();
    }
    
    // Update privacy badge
    const privacyBadge = document.getElementById('privacyBadge');
    if (privacyBadge) {
        const isPublic = currentChannel.isPublic === true;
        privacyBadge.textContent = isPublic ? 'Public' : 'Private';
        privacyBadge.className = `privacy-badge ${isPublic ? 'public' : 'private'}`;
    }
    
    // Display fields
    displayChannelFields();
    
    // Update API keys with null checks
    const channelIdEl = document.getElementById('channelId');
    if (channelIdEl) {
        channelIdEl.textContent = currentChannel._id;
    }
    
    const writeApiKeyEl = document.getElementById('writeApiKey');
    if (writeApiKeyEl) {
        writeApiKeyEl.textContent = currentChannel.writeApiKey || currentChannel.apiKey || 'Not available';
    }
    
    // Handle read API key
    const readApiKey = currentChannel.readApiKey;
    const readApiKeyElement = document.getElementById('readApiKey');
    const copyReadKeyBtn = document.getElementById('copyReadKey');
    const generateReadKeyBtn = document.getElementById('generateReadKey');
    
    if (readApiKeyElement && copyReadKeyBtn && generateReadKeyBtn) {
        if (readApiKey) {
            readApiKeyElement.textContent = readApiKey;
            copyReadKeyBtn.style.display = 'inline-flex';
            generateReadKeyBtn.style.display = 'none';
        } else {
            readApiKeyElement.textContent = 'Not generated';
            copyReadKeyBtn.style.display = 'none';
            generateReadKeyBtn.style.display = 'inline-flex';
        }
    }
}

// Display channel fields with data values
function displayChannelFields() {
    const fieldsContainer = document.getElementById('fieldsContainer');
    
    if (!fieldsContainer) return; // Exit if element doesn't exist
    
    if (!currentChannel.fields || currentChannel.fields.length === 0) {
        fieldsContainer.innerHTML = `
            <div class="no-fields">
                <i class="fas fa-info-circle" style="color: #64748b; margin-bottom: 8px;"></i>
                <p style="color: #64748b; margin: 0; font-size: 14px;">No data fields configured for this channel</p>
            </div>
        `;
        return;
    }
    
    const fieldIcons = [
        'fa-thermometer-half', 'fa-tint', 'fa-wind', 'fa-sun', 
        'fa-bolt', 'fa-gauge', 'fa-chart-line', 'fa-cog'
    ];
    
    fieldsContainer.innerHTML = currentChannel.fields.map((field, index) => {
        const iconClass = fieldIcons[index] || 'fa-chart-line';
        const fieldValue = getLatestFieldValue(field.name);
        const fieldUnit = getFieldUnit(field.label || field.name);
        
        return `
            <div class="field-item">
                <div class="field-info">
                    <div class="field-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="field-details">
                        <h4>${field.label || field.name}</h4>
                        <p>Field ${index + 1} • ${field.name}</p>
                    </div>
                </div>
                <div class="field-value-section">
                    <div class="field-value">
                        <span class="value-number">${fieldValue}</span>
                        <span class="value-unit">${fieldUnit}</span>
                    </div>
                    <div class="field-timestamp" id="timestamp-${field.name}">
                        ${getFieldTimestamp(field.name)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Get latest field value from channel data
function getLatestFieldValue(fieldName) {
    if (!currentChannel.latestData || !currentChannel.latestData[fieldName]) {
        return '--';
    }
    
    const value = currentChannel.latestData[fieldName];
    
    // Format number values - show full precision
    if (typeof value === 'number') {
        return value.toString();
    }
    
    return value;
}

// Get appropriate unit for field based on name/label
function getFieldUnit(fieldName) {
    const name = fieldName.toLowerCase();
    
    if (name.includes('temp')) return '°C';
    if (name.includes('humid')) return '%';
    if (name.includes('pressure')) return 'hPa';
    if (name.includes('light')) return 'lux';
    if (name.includes('voltage') || name.includes('volt')) return 'V';
    if (name.includes('current')) return 'A';
    if (name.includes('speed') || name.includes('wind')) return 'm/s';
    if (name.includes('distance')) return 'cm';
    if (name.includes('ph')) return 'pH';
    if (name.includes('co2')) return 'ppm';
    if (name.includes('moisture') || name.includes('soil')) return '%';
    if (name.includes('battery')) return '%';
    if (name.includes('weight')) return 'kg';
    if (name.includes('altitude') || name.includes('elevation')) return 'm';
    
    return ''; // No unit
}

// Get timestamp for field data
function getFieldTimestamp(fieldName) {
    if (!currentChannel.latestDataTime || !currentChannel.latestDataTime[fieldName]) {
        return 'No data';
    }
    
    const timestamp = new Date(currentChannel.latestDataTime[fieldName]);
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return timestamp.toLocaleDateString();
}

// Load channel data and create charts
async function loadChannelData() {
    try {
        console.log('Loading channel data for:', currentChannel._id);
        
        // First, get total count of entries
        const countResponse = await fetch(`/api/data/channels/${currentChannel._id}?results=1000`);
        console.log('Channel data count response status:', countResponse.status);
        
        if (!countResponse.ok) {
            console.log('No data available for this channel yet');
            return;
        }
        
        const allData = await countResponse.json();
        const allFeeds = Array.isArray(allData) ? allData : (allData.feeds || []);
        
        // Update total entry count
        currentChannel.entryCount = allFeeds.length;
        console.log('Total entries found:', currentChannel.entryCount);
        
        // Use the same data for both display and charts (allFeeds already contains all data)
        const feeds = allFeeds;
        console.log('Using all feeds for field data:', feeds.length, 'entries');
        
        // Store latest data if available
        if (feeds && feeds.length > 0) {
            currentChannel.latestData = {};
            currentChannel.latestDataTime = {};
            
            // Get the latest available value for each field (not just from latest entry)
            if (currentChannel.fields) {
                currentChannel.fields.forEach(field => {
                    console.log(`Looking for data in field: ${field.name}`);
                    // Find the most recent entry that has data for this field
                    for (let i = feeds.length - 1; i >= 0; i--) {
                        const entry = feeds[i];
                        if (entry[field.name] !== undefined && entry[field.name] !== null) {
                            currentChannel.latestData[field.name] = entry[field.name];
                            currentChannel.latestDataTime[field.name] = entry.createdAt;
                            console.log(`Found data for ${field.name}:`, entry[field.name], 'at', entry.createdAt);
                            break; // Found the latest value for this field
                        }
                    }
                    if (!currentChannel.latestData[field.name]) {
                        console.log(`No data found for field: ${field.name}`);
                    }
                });
            }
        }
        
        // Refresh the display with new data
        displayChannelInfo();
        displayChannelFields();
        
        // Initialize visualization
        initializeVisualization(allFeeds);
        
    } catch (error) {
        console.error('Error loading channel data:', error);
        showNotification('Failed to load channel data', 'error');
    }
}

// Initialize visualization controls
function initializeVisualization(feeds) {
    console.log('Initializing visualization with feeds:', feeds.length, 'entries');
    
    // Store feeds globally for chart updates
    window.allFeeds = feeds;
    
    // Populate field selector
    populateFieldSelector();
    
    // Show initial message
    showInitialVisualizationMessage();
}

// Populate field selector with available fields
function populateFieldSelector() {
    const fieldSelector = document.getElementById('fieldSelector');
    if (!fieldSelector || !currentChannel.fields) return;
    
    // Clear existing options except the first one
    fieldSelector.innerHTML = '<option value="">Select Field</option>';
    
    // Add options for each configured field that has data
    currentChannel.fields.forEach(field => {
        if (currentChannel.latestData && currentChannel.latestData[field.name] !== undefined) {
            const option = document.createElement('option');
            option.value = field.name;
            option.textContent = `${field.label || field.name} (${field.name})`;
            fieldSelector.appendChild(option);
        }
    });
    
    // Auto-select first field if available
    if (fieldSelector.options.length > 1) {
        fieldSelector.selectedIndex = 1;
    }
}

// Show initial visualization message
function showInitialVisualizationMessage() {
    const chartsContainer = document.getElementById('chartsContainer');
    if (!chartsContainer) return;
    
    // Disable iframe copy button initially
    const iframeCopyBtn = document.getElementById('iframeCopyBtn');
    if (iframeCopyBtn) {
        iframeCopyBtn.disabled = true;
    }
    
    chartsContainer.innerHTML = `
        <div class="visualization-welcome">
            <div class="welcome-icon">
                <i class="fas fa-chart-area"></i>
            </div>
            <h3>Interactive Data Visualization</h3>
            <p>Select a field and chart type above, then click <strong>Update</strong> to visualize your IoT data.</p>
            <div class="quick-actions">
                <button class="quick-btn" onclick="quickVisualize('field1', 'line')">
                    <i class="fas fa-chart-line"></i> Quick Line Chart
                </button>
                <button class="quick-btn" onclick="quickVisualize('field1', 'bar')">
                    <i class="fas fa-chart-bar"></i> Quick Bar Chart
                </button>
            </div>
        </div>
    `;
}

// Update visualization based on user selections
function updateVisualization() {
    const fieldSelector = document.getElementById('fieldSelector');
    const chartTypeSelector = document.getElementById('chartTypeSelector');
    const dataPointsRange = document.getElementById('dataPointsRange');
    
    const selectedField = fieldSelector.value;
    const selectedChartType = chartTypeSelector.value;
    const selectedDataPoints = dataPointsRange.value;
    
    if (!selectedField) {
        showNotification('Please select a field to visualize', 'warning');
        return;
    }
    
    if (!window.allFeeds || window.allFeeds.length === 0) {
        showNotification('No data available for visualization', 'error');
        return;
    }
    
    console.log('Updating visualization:', { selectedField, selectedChartType, selectedDataPoints });
    
    createSelectedChart(selectedField, selectedChartType, selectedDataPoints);
}

// Quick visualization function
function quickVisualize(fieldName, chartType) {
    document.getElementById('fieldSelector').value = fieldName;
    document.getElementById('chartTypeSelector').value = chartType;
    updateVisualization();
}

// Create chart based on selections
function createSelectedChart(fieldName, chartType, dataPoints) {
    const chartsContainer = document.getElementById('chartsContainer');
    
    // Clear existing charts
    charts.forEach(chart => chart.destroy());
    charts = [];
    
    // Get field configuration
    const fieldConfig = currentChannel.fields.find(f => f.name === fieldName);
    const fieldLabel = fieldConfig ? fieldConfig.label : fieldName;
    
    // Filter and prepare data
    const filteredFeeds = filterDataByRange(window.allFeeds, fieldName);
    const chartData = prepareChartData(filteredFeeds, fieldName, dataPoints);
    
    if (chartData.data.length === 0) {
        chartsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>No Data for ${fieldLabel}</h3>
                <p>This field doesn't have any data points to visualize.</p>
            </div>
        `;
        return;
    }
    
    // Create chart container
    chartsContainer.innerHTML = `
        <div class="chart-item">
            <div class="chart-header">
                <h3><i class="fas fa-chart-${getChartIcon(chartType)}"></i> ${fieldLabel} - ${getChartTypeName(chartType)}</h3>
                <div class="chart-info">
                    <span class="data-count">${chartData.data.length} data points</span>
                    <span class="field-badge">${fieldName}</span>
                </div>
            </div>
            <div class="chart-wrapper">
                <canvas id="dynamicChart" width="400" height="300"></canvas>
            </div>
        </div>
    `;
    
    // Create the chart
    const ctx = document.getElementById('dynamicChart').getContext('2d');
    const chart = createChartByType(ctx, chartType, chartData, fieldLabel);
    
    charts.push(chart);
    
    // Enable iframe copy button
    const iframeCopyBtn = document.getElementById('iframeCopyBtn');
    if (iframeCopyBtn) {
        iframeCopyBtn.disabled = false;
    }
    
    showNotification(`${fieldLabel} ${getChartTypeName(chartType)} created successfully!`, 'success');
}

// Filter data by time range
function filterDataByRange(feeds, fieldName) {
    const timeRange = document.getElementById('timeRange').value;
    const now = new Date();
    let cutoffTime;
    
    switch (timeRange) {
        case '1h':
            cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '6h':
            cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
        case '24h':
            cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        default:
            return feeds.filter(feed => feed[fieldName] !== null && feed[fieldName] !== undefined);
    }
    
    return feeds.filter(feed => {
        const feedTime = new Date(feed.createdAt);
        return feedTime >= cutoffTime && feed[fieldName] !== null && feed[fieldName] !== undefined;
    });
}

// Prepare chart data
function prepareChartData(feeds, fieldName, dataPoints) {
    let processedFeeds = feeds;
    
    // Limit data points if specified
    if (dataPoints !== 'all') {
        const limit = parseInt(dataPoints);
        processedFeeds = feeds.slice(-limit);
    }
    
    const labels = processedFeeds.map(feed => {
        const date = new Date(feed.createdAt);
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit'
        });
    });
    
    const data = processedFeeds.map(feed => {
        const value = feed[fieldName];
        return value !== null && value !== undefined ? parseFloat(value) : null;
    }).filter(val => val !== null);
    
    return { labels, data };
}

// Create chart by type
function createChartByType(ctx, chartType, chartData, fieldLabel) {
    const colors = {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444'
    };
    
    const baseConfig = {
        data: {
            labels: chartData.labels,
            datasets: [{
                label: fieldLabel,
                data: chartData.data,
                borderColor: colors.primary,
                backgroundColor: chartType === 'doughnut' ? 
                    generateColors(chartData.data.length) : 
                    `rgba(59, 130, 246, ${chartType === 'area' ? '0.3' : '0.1'})`,
                borderWidth: 2,
                pointRadius: chartType === 'line' ? 3 : 0,
                pointHoverRadius: 5,
                tension: chartType === 'line' || chartType === 'area' ? 0.3 : 0,
                fill: chartType === 'area'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartType === 'doughnut',
                    position: 'right'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: colors.primary,
                    borderWidth: 1
                }
            },
            scales: chartType === 'doughnut' ? {} : {
                x: {
                    display: true,
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    ticks: { maxTicksLimit: 10, color: '#6b7280' }
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    ticks: { color: '#6b7280' }
                }
            }
        }
    };
    
    return new Chart(ctx, {
        type: chartType === 'area' ? 'line' : chartType,
        ...baseConfig
    });
}

// Helper functions
function getChartIcon(chartType) {
    const icons = {
        line: 'line',
        bar: 'bar',
        doughnut: 'pie',
        area: 'area'
    };
    return icons[chartType] || 'line';
}

function getChartTypeName(chartType) {
    const names = {
        line: 'Line Chart',
        bar: 'Bar Chart',
        doughnut: 'Doughnut Chart',
        area: 'Area Chart'
    };
    return names[chartType] || 'Chart';
}

function generateColors(count) {
    const baseColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

// Setup channel navigation
function setupChannelNavigation() {
    if (allChannels.length > 0) {
        document.getElementById('currentChannelNum').textContent = currentChannelIndex + 1;
        document.getElementById('totalChannels').textContent = allChannels.length;
        
        // Update navigation buttons
        document.getElementById('prevBtn').disabled = currentChannelIndex === 0;
        document.getElementById('nextBtn').disabled = currentChannelIndex === allChannels.length - 1;
    }
}

// Navigation functions
function previousChannel() {
    if (currentChannelIndex > 0) {
        const prevChannelId = allChannels[currentChannelIndex - 1]._id;
        window.location.href = `channel-detail.html?id=${prevChannelId}`;
    }
}

function nextChannel() {
    if (currentChannelIndex < allChannels.length - 1) {
        const nextChannelId = allChannels[currentChannelIndex + 1]._id;
        window.location.href = `channel-detail.html?id=${nextChannelId}`;
    }
}

// Tab navigation
function showTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    event.target.classList.add('active');
    
    // Handle tab content
    switch(tabName) {
        case 'private-view':
            // Show private view (default)
            break;
        case 'public-view':
            // Show public view (same as private for now)
            break;
        case 'channel-settings':
            showNotification('Channel settings functionality coming soon!', 'info');
            break;
        case 'sharing':
            if (currentChannel) {
                shareChannel(currentChannel._id);
            }
            break;
        case 'api-keys':
            if (currentChannel) {
                showApiKeys(currentChannel._id);
            }
            break;
        case 'data-import-export':
            if (currentChannel) {
                exportChannelData(currentChannel._id);
            }
            break;
    }
}

// Action functions
function addVisualization() {
    showNotification('Add visualization functionality coming soon!', 'info');
}

function addWidgets() {
    showNotification('Add widgets functionality coming soon!', 'info');
}

function exportRecentData() {
    if (currentChannel) {
        window.open(`/api/channels/${currentChannel._id}/feeds?format=csv`, '_blank');
    }
}

function openMatlabAnalysis() {
    showNotification('MATLAB Analysis integration coming soon!', 'info');
}

function openMatlabVisualization() {
    showNotification('MATLAB Visualization integration coming soon!', 'info');
}

// Chart action functions
function expandChart(fieldNum) {
    showNotification(`Expand chart ${fieldNum} functionality coming soon!`, 'info');
}

function shareChart(fieldNum) {
    showNotification(`Share chart ${fieldNum} functionality coming soon!`, 'info');
}

function editChart(fieldNum) {
    showNotification(`Edit chart ${fieldNum} functionality coming soon!`, 'info');
}

function deleteChart(fieldNum) {
    if (confirm(`Are you sure you want to delete Field ${fieldNum} chart?`)) {
        showNotification(`Chart ${fieldNum} deleted`, 'success');
        // Remove chart from display
        const chartContainer = document.querySelector(`#chart${fieldNum}`).closest('.chart-container');
        if (chartContainer) {
            chartContainer.remove();
        }
    }
}

// Load current user information
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('userName').textContent = data.user.name;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Sidebar toggle function
function toggleDetailSidebar() {
    const sidebar = document.getElementById('detailSidebar');
    const mainWrapper = document.querySelector('.detail-main-wrapper');
    
    sidebar.classList.toggle('show');
    if (sidebar.classList.contains('show')) {
        mainWrapper.style.marginLeft = '0';
    } else {
        mainWrapper.style.marginLeft = '280px';
    }
}

// Section navigation
function scrollToSection(sectionId) {
    // Remove active class from all nav items
    document.querySelectorAll('.detail-sidebar .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(sectionId).classList.add('active');
}

// Chart control functions
function updateTimeRange() {
    const timeRange = document.getElementById('timeRange').value;
    showNotification(`Time range updated to ${timeRange}`, 'info');
    // Reload charts with new time range
    loadChannelData();
}

function refreshCharts() {
    showNotification('Refreshing charts...', 'info');
    loadChannelData();
}

// New action functions
function editChannelSettings() {
    showNotification('Channel settings editor coming soon!', 'info');
}

function duplicateChannel() {
    if (confirm('Are you sure you want to duplicate this channel?')) {
        showNotification('Channel duplication coming soon!', 'info');
    }
}

function deleteChannel() {
    if (confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
        showNotification('Channel deletion coming soon!', 'info');
    }
}

function addWidgets() {
    showNotification('Widget management coming soon!', 'info');
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard!', 'success');
    });
}

// Generate read API key
async function generateReadKey() {
    if (!currentChannel) return;
    
    try {
        const response = await fetch(`/api/channels/${currentChannel._id}/generate-read-key`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('readApiKey').textContent = data.readApiKey;
            currentChannel.readApiKey = data.readApiKey;
            showNotification('Read API key generated successfully!', 'success');
        } else {
            showNotification('Failed to generate read API key', 'error');
        }
    } catch (error) {
        console.error('Error generating read API key:', error);
        showNotification('Network error while generating key', 'error');
    }
}

// Share channel function
function shareChannel() {
    if (!currentChannel) return;
    
    const shareUrl = `${window.location.origin}/channel-detail.html?id=${currentChannel._id}`;
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 20px 0;">Share Channel: ${currentChannel.name}</h3>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Public URL:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" value="${shareUrl}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyShareUrl('${shareUrl}')" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            <div style="text-align: right;">
                <button onclick="this.closest('div').parentElement.remove()" style="padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Copy share URL
function copyShareUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Share URL copied to clipboard!', 'success');
    });
}

// Export data function
function exportData() {
    if (!currentChannel) return;
    
    const exportUrl = `/api/channels/${currentChannel._id}/feeds?format=csv`;
    window.open(exportUrl, '_blank');
    showNotification('Exporting data...', 'info');
}

// Delete channel function
async function deleteChannel() {
    if (!currentChannel) return;
    
    const confirmed = confirm(`Are you sure you want to delete the channel "${currentChannel.name}"? This action cannot be undone.`);
    
    if (confirmed) {
        try {
            const response = await fetch(`/api/channels/${currentChannel._id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Channel deleted successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 2000);
            } else {
                showNotification('Failed to delete channel', 'error');
            }
        } catch (error) {
            console.error('Error deleting channel:', error);
            showNotification('Network error while deleting channel', 'error');
        }
    }
}

// Go back to dashboard
function goBack() {
    window.location.href = '/dashboard.html';
}

// Edit channel function
function editChannel() {
    // Redirect to dashboard with edit mode
    window.location.href = `/dashboard.html?edit=${currentChannel._id}`;
}

// Generate read API key
async function generateReadKey() {
    try {
        const response = await fetch(`/api/channels/${currentChannel._id}/generate-read-key`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentChannel.readApiKey = data.readApiKey;
            
            // Update UI
            const readApiKeyElement = document.getElementById('readApiKey');
            const copyReadKeyBtn = document.getElementById('copyReadKey');
            const generateReadKeyBtn = document.getElementById('generateReadKey');
            
            readApiKeyElement.textContent = data.readApiKey;
            copyReadKeyBtn.style.display = 'inline-flex';
            generateReadKeyBtn.style.display = 'none';
            
            showNotification('Read API key generated successfully!', 'success');
        } else {
            showNotification('Failed to generate read API key', 'error');
        }
    } catch (error) {
        console.error('Error generating read API key:', error);
        showNotification('Network error while generating key', 'error');
    }
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (text === 'Not available' || text === 'Not generated' || text === '-') {
        showNotification('No value to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy to clipboard', 'error');
    });
}

// Share channel function
function shareChannel() {
    if (!currentChannel.isPublic) {
        showNotification('Only public channels can be shared', 'error');
        return;
    }
    
    const shareUrl = `${window.location.origin}/channel-detail.html?id=${currentChannel._id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Share URL copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy share URL:', err);
        showNotification('Failed to copy share URL', 'error');
    });
}

// Delete channel function
async function deleteChannel() {
    if (!confirm(`Are you sure you want to delete "${currentChannel.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/channels/${currentChannel._id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Channel deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showNotification('Failed to delete channel', 'error');
        }
    } catch (error) {
        console.error('Error deleting channel:', error);
        showNotification('Network error while deleting channel', 'error');
    }
}

// Refresh channel data (smart refresh - preserves charts)
async function refreshChannelData() {
    const now = Date.now();
    
    // Rate limiting - prevent calls more frequent than 2.5 seconds
    if (now - lastRefreshTime < 2500) {
        console.log(`⏱️ [${pageInstanceId}] Rate limited - too soon since last refresh`);
        return;
    }
    
    if (refreshInProgress) {
        console.log(`⏭️ [${pageInstanceId}] Skipping refresh - already in progress`);
        return;
    }
    
    if (currentChannel) {
        refreshInProgress = true;
        lastRefreshTime = now;
        console.log(`🔄 [${pageInstanceId}] Auto-refresh triggered for channel:`, currentChannel._id);
        try {
            await loadChannelDataSilent();
            console.log(`✅ [${pageInstanceId}] Data auto-refreshed at:`, new Date().toLocaleTimeString());
        } catch (error) {
            console.error(`❌ [${pageInstanceId}] Auto-refresh failed:`, error);
        } finally {
            refreshInProgress = false;
        }
    } else {
        console.log(`⚠️ [${pageInstanceId}] Auto-refresh called but no current channel`);
    }
}

// Silent data loading that doesn't reinitialize visualization
async function loadChannelDataSilent() {
    try {
        console.log(`🔄 [${pageInstanceId}] Silent refresh - loading channel data for:`, currentChannel._id);
        
        // Get updated data
        const countResponse = await fetch(`/api/data/channels/${currentChannel._id}?results=1000`);
        if (!countResponse.ok) {
            console.log('No data available during refresh');
            return;
        }
        
        const allData = await countResponse.json();
        const allFeeds = Array.isArray(allData) ? allData : (allData.feeds || []);
        
        // Update total entry count
        currentChannel.entryCount = allFeeds.length;
        
        // Check if data actually changed
        if (allFeeds.length === lastDataCount) {
            console.log(`📊 [${pageInstanceId}] No new data (${allFeeds.length} entries)`);
            return; // No new data, skip update
        }
        
        lastDataCount = allFeeds.length;
        console.log(`📊 [${pageInstanceId}] Data updated: ${allFeeds.length} entries`);
        
        // Update global feeds for charts (if they exist)
        if (window.allFeeds) {
            window.allFeeds = allFeeds;
        }
        
        // Update latest data for each field
        if (allFeeds && allFeeds.length > 0) {
            currentChannel.latestData = {};
            currentChannel.latestDataTime = {};
            
            if (currentChannel.fields) {
                currentChannel.fields.forEach(field => {
                    // Find the most recent entry that has data for this field
                    for (let i = allFeeds.length - 1; i >= 0; i--) {
                        const entry = allFeeds[i];
                        if (entry[field.name] !== undefined && entry[field.name] !== null) {
                            currentChannel.latestData[field.name] = entry[field.name];
                            currentChannel.latestDataTime[field.name] = entry.createdAt;
                            break;
                        }
                    }
                });
            }
        }
        
        // Only update the display elements, don't reinitialize visualization
        displayChannelInfo();
        displayChannelFields();
        
        // Update existing chart data if a chart is currently displayed
        updateExistingChart(allFeeds);
        
    } catch (error) {
        console.error('Error during silent refresh:', error);
    }
}

// Update existing chart with new data (without recreating)
function updateExistingChart(feeds) {
    if (charts.length === 0) return; // No charts to update
    
    const fieldSelector = document.getElementById('fieldSelector');
    const chartTypeSelector = document.getElementById('chartTypeSelector');
    const dataPointsRange = document.getElementById('dataPointsRange');
    
    if (!fieldSelector.value) return; // No field selected
    
    const selectedField = fieldSelector.value;
    const selectedChartType = chartTypeSelector.value;
    const selectedDataPoints = dataPointsRange.value;
    
    // Filter and prepare new data
    const filteredFeeds = filterDataByRange(feeds, selectedField);
    const chartData = prepareChartData(filteredFeeds, selectedField, selectedDataPoints);
    
    if (chartData.data.length === 0) return;
    
    // Update the existing chart data
    const chart = charts[0]; // We only have one chart at a time
    if (chart) {
        chart.data.labels = chartData.labels;
        chart.data.datasets[0].data = chartData.data;
        chart.update('none'); // Update without animation for smooth refresh
        
        // Update data count in header
        const dataCountElement = document.querySelector('.data-count');
        if (dataCountElement) {
            dataCountElement.textContent = `${chartData.data.length} data points`;
        }
    }
}

// Auto-refresh control
let autoRefreshInterval;
let autoRefreshEnabled = true;
let refreshInProgress = false;
let lastRefreshTime = 0;
let lastDataCount = 0;

// Generate unique page instance ID
const pageInstanceId = 'page_' + Math.random().toString(36).substr(2, 9);
console.log('🆔 Page instance ID:', pageInstanceId);

// Start auto-refresh
function startAutoRefresh() {
    if (autoRefreshInterval) {
        console.log('🛑 Clearing existing auto-refresh interval');
        clearInterval(autoRefreshInterval);
    }
    console.log('🚀 Starting new auto-refresh interval (3s)');
    autoRefreshInterval = setInterval(refreshChannelData, 3000);
    autoRefreshEnabled = true;
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    autoRefreshEnabled = false;
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    const toggleBtn = document.getElementById('refreshToggleBtn');
    
    if (autoRefreshEnabled) {
        stopAutoRefresh();
        toggleBtn.innerHTML = '<i class="fas fa-play"></i> Resume Refresh';
        toggleBtn.classList.add('paused');
        showNotification('Auto-refresh paused - Charts will not update automatically', 'info');
    } else {
        startAutoRefresh();
        toggleBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Refresh';
        toggleBtn.classList.remove('paused');
        showNotification('Auto-refresh resumed', 'success');
    }
}

// Prevent multiple intervals if page is loaded multiple times
window.addEventListener('beforeunload', () => {
    console.log('🚪 Page unloading - clearing intervals');
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
});

// Add page visibility handling to pause refresh when tab is not active
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('👁️ Page hidden - pausing auto-refresh');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    } else {
        console.log('👁️ Page visible - resuming auto-refresh');
        if (autoRefreshEnabled && currentChannel) {
            startAutoRefresh();
        }
    }
});

// Copy iframe embed code
function copyIframeCode() {
    const fieldSelector = document.getElementById('fieldSelector');
    const chartTypeSelector = document.getElementById('chartTypeSelector');
    const dataPointsRange = document.getElementById('dataPointsRange');
    const timeRange = document.getElementById('timeRange');
    
    if (!fieldSelector.value) {
        showNotification('Please select a field and create a visualization first', 'warning');
        return;
    }
    
    if (!currentChannel || !currentChannel.readApiKey) {
        showNotification('Read API key required for embedding. Please generate one first.', 'warning');
        return;
    }
    
    // Build the embed URL with current visualization settings
    const baseUrl = window.location.origin;
    const channelId = currentChannel._id;
    const readApiKey = currentChannel.readApiKey;
    const field = fieldSelector.value;
    const chartType = chartTypeSelector.value;
    const dataPoints = dataPointsRange.value;
    const timeRangeValue = timeRange.value;
    
    const embedUrl = `${baseUrl}/embed.html?` + 
        `channelId=${channelId}&` +
        `readApiKey=${readApiKey}&` +
        `field=${field}&` +
        `chartType=${chartType}&` +
        `dataPoints=${dataPoints}&` +
        `timeRange=${timeRangeValue}`;
    
    // Generate iframe code
    const iframeCode = `<iframe src="${embedUrl}" width="600" height="400" frameborder="0" scrolling="no" style="border: 1px solid #ddd; border-radius: 8px;"></iframe>`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(iframeCode).then(() => {
        showNotification('Embed code copied to clipboard!', 'success');
        
        // Show preview modal
        showIframePreview(iframeCode, embedUrl);
    }).catch(err => {
        console.error('Failed to copy iframe code:', err);
        showNotification('Failed to copy embed code', 'error');
    });
}

// Show iframe preview modal
function showIframePreview(iframeCode, embedUrl) {
    const modal = document.createElement('div');
    modal.className = 'iframe-modal';
    modal.innerHTML = `
        <div class="iframe-modal-content">
            <div class="iframe-modal-header">
                <h3><i class="fas fa-code"></i> Embed Code</h3>
                <button class="iframe-modal-close" onclick="this.closest('.iframe-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="iframe-modal-body">
                <div class="embed-section">
                    <label>Iframe Code:</label>
                    <textarea class="embed-code" readonly id="iframeCodeText">${iframeCode}</textarea>
                    <button class="copy-code-btn" id="copyCodeBtn">
                        <i class="fas fa-copy"></i> Copy Code
                    </button>
                </div>
                <div class="embed-section">
                    <label>Direct URL:</label>
                    <input type="text" class="embed-url" value="${embedUrl}" readonly id="embedUrlText">
                    <button class="copy-url-btn" id="copyUrlBtn">
                        <i class="fas fa-copy"></i> Copy URL
                    </button>
                </div>
                <div class="embed-preview">
                    <label>Preview:</label>
                    <div class="preview-container">
                        ${iframeCode}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for copy buttons
    const copyCodeBtn = modal.querySelector('#copyCodeBtn');
    const copyUrlBtn = modal.querySelector('#copyUrlBtn');
    
    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(iframeCode).then(() => {
            showNotification('Embed code copied!', 'success');
        }).catch(() => {
            showNotification('Failed to copy code', 'error');
        });
    });
    
    copyUrlBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(embedUrl).then(() => {
            showNotification('URL copied!', 'success');
        }).catch(() => {
            showNotification('Failed to copy URL', 'error');
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Start auto-refresh initially (with delay to ensure page is fully loaded)
setTimeout(() => {
    console.log('🎬 Initializing auto-refresh system');
    if (typeof startAutoRefresh === 'function') {
        startAutoRefresh();
    } else {
        console.error('❌ startAutoRefresh function not found!');
    }
}, 1000);

// Notification function
function showNotification(message, type) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
