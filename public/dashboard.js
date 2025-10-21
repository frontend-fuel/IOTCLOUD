// Dashboard JavaScript
let currentUser = null;
let channels = [];
let currentChart = null;
let fieldCount = 1;
let currentSection = 'overview';

// Check authentication and load dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        document.getElementById('userName').textContent = currentUser.name;
        
        await loadChannels();
        await loadDashboardStats();
        populateChannelSelect();
        setupProfileForm();
        setupChannelSearch();
        setupTableSorting();
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/';
    }
});

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Add active class to selected nav item
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    // Update page title
    const titles = {
        overview: 'Dashboard Overview',
        channels: 'My Channels',
        analytics: 'Analytics Dashboard',
        settings: 'Account Settings'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName];
    
    currentSection = sectionName;
    
    // Load section-specific data
    if (sectionName === 'analytics') {
        loadAnalyticsData();
    } else if (sectionName === 'settings') {
        loadUserSettings();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    
    sidebar.classList.toggle('show');
    sidebar.classList.toggle('collapsed');
    mainWrapper.classList.toggle('expanded');
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const totalChannels = channels.length;
        const activeChannels = channels.filter(c => c.lastEntry && 
            new Date(c.lastEntry) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
        
        document.getElementById('totalChannels').textContent = totalChannels;
        document.getElementById('activeChannels').textContent = activeChannels;
        
        // Last update
        const lastUpdate = channels.reduce((latest, channel) => {
            if (channel.lastEntry && new Date(channel.lastEntry) > new Date(latest)) {
                return channel.lastEntry;
            }
            return latest;
        }, 0);
        
        if (lastUpdate) {
            document.getElementById('lastUpdate').textContent = 
                new Date(lastUpdate).toLocaleTimeString();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}


// Populate channel select for analytics
function populateChannelSelect() {
    const select = document.getElementById('chartChannelSelect');
    if (select) {
        select.innerHTML = '<option value="">Select Channel</option>' + 
            channels.map(channel => 
                `<option value="${channel._id}">${channel.name}</option>`
            ).join('');
    }
}

// Load user channels
async function loadChannels() {
    try {
        const response = await fetch('/api/channels');
        if (response.ok) {
            channels = await response.json();
            
            // Check and fix channels that might have missing writeApiKey
            for (const channel of channels) {
                if (!channel.writeApiKey && channel.apiKey) {
                    // Migrate old apiKey to writeApiKey
                    channel.writeApiKey = channel.apiKey;
                } else if (!channel.writeApiKey && !channel.apiKey) {
                    console.warn(`Channel ${channel.name} has no API key`);
                }
            }
            
            displayChannels();
        } else {
            showNotification('Failed to load channels', 'error');
        }
    } catch (error) {
        console.error('Error loading channels:', error);
        showNotification('Network error while loading channels', 'error');
    }
}

// Update create channel button state based on limit
function updateCreateChannelButton() {
    const createButtons = document.querySelectorAll('button[onclick="showCreateChannelModal()"]');
    const isLimitReached = channels.length >= 4;
    
    createButtons.forEach(button => {
        if (isLimitReached) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-lock"></i> Channel Limit Reached (4/4)';
            button.title = 'Maximum 4 channels allowed per account';
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-plus"></i> Create Channel';
            button.title = '';
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
    });
}

// Display channels
function displayChannels() {
    const channelsTableBody = document.getElementById('channelsTableBody');
    
    // Update create channel button state based on limit
    updateCreateChannelButton();
    
    if (channels.length === 0) {
        channelsTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 60px; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 16px; color: #cbd5e1;">
                        <i class="fas fa-broadcast-tower"></i>
                    </div>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No channels yet</h3>
                    <p>Create your first IoT channel to start collecting data</p>
                    <button class="btn btn-primary" onclick="showCreateChannelModal()" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Create Channel
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    channelsTableBody.innerHTML = channels.map(channel => {
        const createdDate = new Date(channel.createdAt).toLocaleDateString();
        const lastUpdate = channel.lastEntry ? new Date(channel.lastEntry).toLocaleString() : 'Never';
        // Simple privacy check - default to private if unclear
        const isPrivate = channel.isPublic === true ? false : true;
        
        return `
            <tr>
                <td>
                    <div class="channel-name">
                        <i class="fas ${isPrivate ? 'fa-lock' : 'fa-globe'} channel-privacy-icon"></i>
                        <a href="channel-detail.html?id=${channel._id}" class="channel-name-link">${channel.name}</a>
                    </div>
                    <div class="channel-actions-row">
                        <button class="channel-action-btn" onclick="editChannel('${channel._id}')">Settings</button>
                        <button class="channel-action-btn" onclick="shareChannel('${channel._id}')">Sharing</button>
                        <button class="channel-action-btn" onclick="showApiKeys('${channel._id}')">API Keys</button>
                    </div>
                </td>
                <td>
                    <div class="channel-date">${createdDate}</div>
                </td>
                <td>
                    <div class="channel-date">${lastUpdate}</div>
                </td>
            </tr>
        `;
    }).join('');
}

// Channel action functions
async function setChannelPrivacy(channelId, isPrivate) {
    try {
        const response = await fetch(`/api/channels/${channelId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPrivate: isPrivate, isPublic: !isPrivate })
        });

        if (response.ok) {
            // Update local channel data
            const channel = channels.find(c => c._id === channelId);
            if (channel) {
                channel.isPrivate = isPrivate;
                channel.isPublic = !isPrivate;
            }
            displayChannels();
            showNotification(`Channel privacy ${isPrivate ? 'set to private' : 'set to public'}`, 'success');
        } else {
            showNotification('Failed to update channel privacy', 'error');
        }
    } catch (error) {
        console.error('Error updating channel privacy:', error);
        showNotification('Network error while updating privacy', 'error');
    }
}

function shareChannel(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    const shareUrl = `${window.location.origin}/channel/${channelId}`;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Share Channel: ${channel.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Public URL:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" value="${shareUrl}" readonly style="flex: 1;">
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${shareUrl}'); showNotification('URL copied!', 'success')">Copy</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Embed Code:</label>
                    <textarea readonly style="width: 100%; height: 80px;">&lt;iframe src="${shareUrl}" width="450" height="260"&gt;&lt;/iframe&gt;</textarea>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showApiKeys(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content api-keys-modal">
            <div class="modal-header api-keys-header">
                <div class="header-icon">
                    <i class="fas fa-key"></i>
                </div>
                <div class="header-text">
                    <h3>API Keys Management</h3>
                    <p>Manage access keys for <strong>${channel.name}</strong></p>
                </div>
                <button class="close-btn modern-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body api-keys-body">
                <!-- Write API Key Section -->
                <div class="api-key-section">
                    <div class="api-key-header">
                        <div class="api-key-icon write-key">
                            <i class="fas fa-edit"></i>
                        </div>
                        <div class="api-key-info">
                            <h4>Write API Key</h4>
                            <p>Use this key to send data to your channel</p>
                        </div>
                        <div class="api-key-status">
                            <span class="status-badge active">Active</span>
                        </div>
                    </div>
                    <div class="api-key-content">
                        <div class="key-display">
                            <code class="api-key-value">${channel.writeApiKey || channel.apiKey || 'Not available'}</code>
                            <button class="copy-btn" onclick="navigator.clipboard.writeText('${channel.writeApiKey || channel.apiKey}'); showNotification('Write API Key copied!', 'success')" title="Copy to clipboard">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Read API Key Section -->
                <div class="api-key-section">
                    <div class="api-key-header">
                        <div class="api-key-icon read-key">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="api-key-info">
                            <h4>Read API Key</h4>
                            <p>Use this key to read private channel data</p>
                        </div>
                        <div class="api-key-status">
                            <span class="status-badge ${channel.readApiKey ? 'active' : 'inactive'}">${channel.readApiKey ? 'Active' : 'Not Set'}</span>
                        </div>
                    </div>
                    <div class="api-key-content">
                        <div class="key-display">
                            <code class="api-key-value">${channel.readApiKey || 'Click Generate to create a read API key'}</code>
                            ${channel.readApiKey ? 
                                `<button class="copy-btn" onclick="navigator.clipboard.writeText('${channel.readApiKey}'); showNotification('Read API Key copied!', 'success')" title="Copy to clipboard">
                                    <i class="fas fa-copy"></i>
                                </button>` :
                                `<button class="generate-btn" onclick="generateReadApiKey('${channelId}')" title="Generate read API key">
                                    <i class="fas fa-plus"></i> Generate
                                </button>`
                            }
                        </div>
                    </div>
                </div>

                <!-- API Usage Example -->
                <div class="api-usage-section">
                    <div class="usage-header">
                        <div class="usage-icon">
                            <i class="fas fa-link"></i>
                        </div>
                        <h4>Write URL Endpoint</h4>
                    </div>
                    
                    <!-- Direct URL -->
                    <div class="url-section">
                        <div class="url-header">
                            <span class="url-label">Direct Write URL</span>
                            <button class="copy-url-btn" onclick="copyWriteUrl('${channelId}')">
                                <i class="fas fa-copy"></i> Copy URL
                            </button>
                        </div>
                        <div class="url-display">
                            <code class="url-value">${window.location.origin}/api/data/update</code>
                        </div>
                        <small>Use this URL to send POST requests with JSON data</small>
                    </div>

                    <!-- GET URL Format -->
                    <div class="url-section">
                        <div class="url-header">
                            <span class="url-label">GET Request Format</span>
                            <button class="copy-url-btn" onclick="copyGetUrl('${channelId}')">
                                <i class="fas fa-copy"></i> Copy GET URL
                            </button>
                        </div>
                        <div class="url-display">
                            <code class="url-value">${generateGetUrl(channel)}</code>
                        </div>
                        <small>Use this format for simple HTTP GET requests</small>
                    </div>
                    
                    <div class="code-example">
                        <div class="code-header">
                            <span class="code-language">JSON POST Example</span>
                            <button class="copy-code-btn" onclick="copyCodeExample('${channelId}')">
                                <i class="fas fa-copy"></i> Copy JSON
                            </button>
                        </div>
                        <pre class="code-content"><code>POST ${window.location.origin}/api/data/update
Content-Type: application/json

${generateCodePreview(channel)}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Generate code preview with real field names
function generateCodePreview(channel) {
    let dataFields = {};
    dataFields["api_key"] = channel.writeApiKey || channel.apiKey;
    
    // Add actual channel fields with example values
    if (channel.fields && channel.fields.length > 0) {
        channel.fields.forEach((field, index) => {
            const fieldName = field.name || `field${index + 1}`;
            const exampleValue = getExampleValue(field.label || fieldName);
            dataFields[fieldName] = exampleValue;
        });
    } else {
        // Fallback if no fields configured
        dataFields["field1"] = "25.6";
        dataFields["field2"] = "60.2";
    }
    
    return JSON.stringify(dataFields, null, 2);
}

// Generate GET URL format
function generateGetUrl(channel) {
    let params = [`api_key=${channel.writeApiKey || channel.apiKey}`];
    
    if (channel.fields && channel.fields.length > 0) {
        channel.fields.forEach((field, index) => {
            const fieldName = field.name || `field${index + 1}`;
            const exampleValue = getExampleValue(field.label || fieldName);
            params.push(`${fieldName}=${exampleValue}`);
        });
    } else {
        params.push('field1=25.6');
        params.push('field2=60.2');
    }
    
    return `${window.location.origin}/api/data/update?${params.join('&')}`;
}

// Copy write URL
function copyWriteUrl(channelId) {
    const writeUrl = `${window.location.origin}/api/data/update`;
    
    navigator.clipboard.writeText(writeUrl).then(() => {
        showNotification('Write URL copied!', 'success');
    }).catch(err => {
        console.error('Failed to copy URL:', err);
        showNotification('Failed to copy URL', 'error');
    });
}

// Copy GET URL
function copyGetUrl(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    const getUrl = generateGetUrl(channel);
    
    navigator.clipboard.writeText(getUrl).then(() => {
        showNotification('GET URL copied!', 'success');
    }).catch(err => {
        console.error('Failed to copy GET URL:', err);
        showNotification('Failed to copy GET URL', 'error');
    });
}

// Copy code example function
function copyCodeExample(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    // Build the data object with real field names
    let dataFields = {};
    dataFields["api_key"] = channel.writeApiKey || channel.apiKey;
    
    // Add actual channel fields with example values
    if (channel.fields && channel.fields.length > 0) {
        channel.fields.forEach((field, index) => {
            const fieldName = field.name || `field${index + 1}`;
            // Use field label as a hint for example value, or generic number
            const exampleValue = getExampleValue(field.label || fieldName);
            dataFields[fieldName] = exampleValue;
        });
    } else {
        // Fallback if no fields configured
        dataFields["field1"] = "25.6";
        dataFields["field2"] = "60.2";
    }
    
    // Format the JSON properly
    const jsonData = JSON.stringify(dataFields, null, 2);
    
    const codeExample = `POST ${window.location.origin}/api/data/update
Content-Type: application/json

${jsonData}`;
    
    navigator.clipboard.writeText(codeExample).then(() => {
        showNotification('Code example copied with real field names!', 'success');
    }).catch(err => {
        console.error('Failed to copy code example:', err);
        showNotification('Failed to copy code example', 'error');
    });
}

// Generate example values based on field names/labels
function getExampleValue(fieldName) {
    const name = fieldName.toLowerCase();
    
    if (name.includes('temp')) return "23.5";
    if (name.includes('humid')) return "65.2";
    if (name.includes('pressure')) return "1013.25";
    if (name.includes('light')) return "450";
    if (name.includes('voltage') || name.includes('volt')) return "3.3";
    if (name.includes('current')) return "0.15";
    if (name.includes('speed') || name.includes('wind')) return "12.8";
    if (name.includes('distance')) return "150.5";
    if (name.includes('ph')) return "7.2";
    if (name.includes('co2')) return "400";
    if (name.includes('moisture') || name.includes('soil')) return "45.8";
    if (name.includes('battery')) return "85";
    
    // Default numeric value
    return (Math.random() * 100).toFixed(1);
}

async function generateReadApiKey(channelId) {
    console.log('Generating read API key for channel:', channelId);
    try {
        const response = await fetch(`/api/channels/${channelId}/generate-read-key`, {
            method: 'POST'
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            // Update local channel data
            const channel = channels.find(c => c._id === channelId);
            if (channel) {
                channel.readApiKey = data.readApiKey;
            }
            
            // Close current modal and reopen with updated data
            document.querySelector('.modal').remove();
            showApiKeys(channelId);
            
            showNotification('Read API key generated successfully', 'success');
        } else {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            showNotification('Failed to generate read API key', 'error');
        }
    } catch (error) {
        console.error('Error generating read API key:', error);
        showNotification('Network error while generating key', 'error');
    }
}

function exportChannelData(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Data Import / Export: ${channel.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <h4>Export Data</h4>
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <button class="btn btn-primary" onclick="exportData('${channelId}', 'json')">Export as JSON</button>
                        <button class="btn btn-primary" onclick="exportData('${channelId}', 'csv')">Export as CSV</button>
                    </div>
                </div>
                <div class="form-group">
                    <h4>Import Data</h4>
                    <input type="file" id="importFile" accept=".json,.csv" style="margin-bottom: 8px;">
                    <button class="btn btn-secondary" onclick="importData('${channelId}')">Import Data</button>
                    <small>Supported formats: JSON, CSV</small>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function exportData(channelId, format) {
    try {
        const response = await fetch(`/api/channels/${channelId}/feeds?format=${format}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `channel_${channelId}_data.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
        } else {
            showNotification('Failed to export data', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Network error while exporting', 'error');
    }
}

async function importData(channelId) {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`/api/channels/${channelId}/import`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`Successfully imported ${data.count} records`, 'success');
            document.querySelector('.modal').remove();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to import data', 'error');
        }
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Network error while importing', 'error');
    }
}

// Show create channel modal
function showCreateChannelModal(skipReset = false) {
    // Only reset if not in edit mode
    if (!skipReset) {
        // Reset form to create mode
        document.getElementById('createChannelForm').reset();
        delete document.getElementById('createChannelForm').dataset.editingId;
        
        // Reset form title and button text
        const headerTitle = document.querySelector('.header-text h3');
        const headerSubtitle = document.querySelector('.header-text p');
        const createButton = document.querySelector('.btn-create');
        
        if (headerTitle) headerTitle.textContent = 'Create New IoT Channel';
        if (headerSubtitle) headerSubtitle.textContent = 'Set up a new data collection channel for your IoT devices';
        if (createButton) createButton.innerHTML = '<i class="fas fa-rocket"></i> Create Channel';
        
        // Initialize fields container with default field
        fieldCount = 1;
        document.getElementById('fieldsContainer').innerHTML = `
            <div class="field-item">
                <div class="field-header">
                    <span class="field-number">1</span>
                    <i class="fas fa-thermometer-half field-icon"></i>
                </div>
                <div class="field-input">
                    <input type="text" placeholder="e.g., Temperature" data-field="1">
                    <small>Field 1 Label</small>
                </div>
            </div>
        `;
        document.getElementById('fieldCount').textContent = fieldCount;
        document.querySelector('.add-field-btn').disabled = false;
    }
    
    // Show the modal
    document.getElementById('createChannelModal').classList.add('show');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Add field to create channel form
function addField() {
    if (fieldCount >= 8) {
        showNotification('Maximum 8 fields allowed', 'error');
        document.querySelector('.add-field-btn').disabled = true;
        return;
    }
    
    fieldCount++;
    const container = document.getElementById('fieldsContainer');
    
    // Get appropriate icon for field type
    const fieldIcons = [
        'fa-thermometer-half', 'fa-tint', 'fa-wind', 'fa-sun', 
        'fa-bolt', 'fa-gauge', 'fa-chart-line', 'fa-cog'
    ];
    const iconClass = fieldIcons[fieldCount - 1] || 'fa-chart-line';
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-item';
    fieldDiv.innerHTML = `
        <div class="field-header">
            <span class="field-number">${fieldCount}</span>
            <i class="fas ${iconClass} field-icon"></i>
        </div>
        <div class="field-input">
            <input type="text" placeholder="e.g., Pressure" data-field="${fieldCount}">
            <small>Field ${fieldCount} Label</small>
        </div>
        <button type="button" class="remove-field-btn" onclick="removeField(this)" title="Remove Field">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(fieldDiv);
    
    // Update field counter
    document.getElementById('fieldCount').textContent = fieldCount;
    
    // Disable add button if max fields reached
    if (fieldCount >= 8) {
        document.querySelector('.add-field-btn').disabled = true;
    }
}

// Remove field from create channel form
function removeField(button) {
    if (fieldCount <= 1) {
        showNotification('At least 1 field is required', 'error');
        return;
    }
    
    button.closest('.field-item').remove();
    fieldCount--;
    
    // Update field counter
    document.getElementById('fieldCount').textContent = fieldCount;
    
    // Re-enable add button if below max
    if (fieldCount < 8) {
        document.querySelector('.add-field-btn').disabled = false;
    }
    
    // Update field numbers
    const fieldItems = document.querySelectorAll('.field-item');
    fieldItems.forEach((item, index) => {
        const fieldNumber = index + 1;
        const numberSpan = item.querySelector('.field-number');
        const smallText = item.querySelector('small');
        const input = item.querySelector('input');
        
        if (numberSpan) numberSpan.textContent = fieldNumber;
        if (smallText) smallText.textContent = `Field ${fieldNumber} Label`;
        if (input) input.setAttribute('data-field', fieldNumber);
    });
}

// Create channel form handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createChannelForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submission triggered!');
    
    const editingId = document.getElementById('createChannelForm').dataset.editingId;
    const isEditing = !!editingId;
    
    // Check channel limit only for new channels, not when editing
    if (!isEditing && channels.length >= 4) {
        showNotification('Maximum 4 channels allowed per account', 'error');
        return;
    }
    
    const name = document.getElementById('channelName').value;
    const description = document.getElementById('channelDescription').value;
    const isPublic = document.getElementById('isPublic').checked;
    
    // Validate required fields
    if (!name.trim()) {
        showNotification('Channel name is required', 'error');
        return;
    }
    
    // Collect field labels
    const fieldInputs = document.querySelectorAll('#fieldsContainer input[data-field]');
    const fields = [];
    fieldInputs.forEach(input => {
        if (input.value.trim()) {
            fields.push({
                name: `field${input.dataset.field}`,
                label: input.value.trim()
            });
        }
    });
    
    // Ensure at least one field is provided
    if (fields.length === 0) {
        showNotification('At least one field label is required', 'error');
        return;
    }
    
    try {
        console.log('Submitting channel data:', { name, description, fields, isPublic, isEditing });
        console.log('Editing ID:', editingId);
        console.log('Request URL:', isEditing ? `/api/channels/${editingId}` : '/api/channels');
        console.log('Request method:', isEditing ? 'PUT' : 'POST');
        
        const response = await fetch(isEditing ? `/api/channels/${editingId}` : '/api/channels', {
            method: isEditing ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, fields, isPublic })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            showNotification(isEditing ? 'Channel updated successfully!' : 'Channel created successfully!', 'success');
            closeModal('createChannelModal');
            
            // Reset form
            document.getElementById('createChannelForm').reset();
            delete document.getElementById('createChannelForm').dataset.editingId;
            
            // Reset form title and button
            document.querySelector('.header-text h3').textContent = 'Create New IoT Channel';
            document.querySelector('.header-text p').textContent = 'Set up a new data collection channel for your IoT devices';
            document.querySelector('.btn-create').innerHTML = '<i class="fas fa-rocket"></i> Create Channel';
            
            // Reset fields
            fieldCount = 1;
            document.getElementById('fieldsContainer').innerHTML = `
                <div class="field-item">
                    <div class="field-header">
                        <span class="field-number">1</span>
                        <i class="fas fa-thermometer-half field-icon"></i>
                    </div>
                    <div class="field-input">
                        <input type="text" placeholder="e.g., Temperature" data-field="1">
                        <small>Field 1 Label</small>
                    </div>
                </div>
            `;
            document.getElementById('fieldCount').textContent = fieldCount;
            document.querySelector('.add-field-btn').disabled = false;
            await loadChannels();
        } else {
            const data = await response.json();
            console.error('Server error response:', JSON.stringify(data, null, 2));
            console.error('Response status:', response.status);
            showNotification(data.message || `Server error (${response.status})`, 'error');
        }
    } catch (error) {
        console.error('Error creating channel:', error);
        showNotification('Network error while creating channel', 'error');
    }
        });
    } else {
        console.error('Create channel form not found!');
    }
});

// View channel data
async function viewChannelData(channelId) {
    try {
        const response = await fetch(`/api/data/channels/${channelId}?results=50`);
        if (response.ok) {
            const data = await response.json();
            displayChart(data);
        } else {
            showNotification('Failed to load channel data', 'error');
        }
    } catch (error) {
        console.error('Error loading channel data:', error);
        showNotification('Network error while loading data', 'error');
    }
}

// Display chart
function displayChart(data) {
    // Show analytics section if not already visible
    if (currentSection !== 'analytics') {
        showSection('analytics');
    }
    
    const ctx = document.getElementById('dataChart').getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Prepare data for chart
    const labels = data.feeds.map(feed => {
        const date = new Date(feed.createdAt);
        return date.toLocaleTimeString();
    });
    const datasets = [];
    
    // Create datasets for each field that has data
    for (let i = 1; i <= 8; i++) {
        const fieldName = `field${i}`;
        const fieldData = data.feeds.map(feed => feed[fieldName]);
        
        if (fieldData.some(value => value !== null && value !== undefined)) {
            const fieldLabel = data.channel.fields.find(f => f.name === fieldName)?.label || `Field ${i}`;
            datasets.push({
                label: fieldLabel,
                data: fieldData,
                borderColor: getColor(i - 1),
                backgroundColor: getColor(i - 1, 0.1),
                tension: 0.4,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            });
        }
    }
    
    // Update chart legend
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
        legendContainer.innerHTML = datasets.map((dataset, index) => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${dataset.borderColor}"></div>
                <span>${dataset.label}</span>
            </div>
        `).join('');
    }
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false // We're using custom legend
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    
    // Update channel select to show current channel
    const channelSelect = document.getElementById('chartChannelSelect');
    if (channelSelect) {
        channelSelect.value = data.channel.id;
    }
}

// Get color for chart datasets
function getColor(index, alpha = 1) {
    const colors = [
        `rgba(66, 165, 245, ${alpha})`,
        `rgba(76, 175, 80, ${alpha})`,
        `rgba(255, 152, 0, ${alpha})`,
        `rgba(244, 67, 54, ${alpha})`,
        `rgba(156, 39, 176, ${alpha})`,
        `rgba(255, 193, 7, ${alpha})`,
        `rgba(96, 125, 139, ${alpha})`,
        `rgba(233, 30, 99, ${alpha})`
    ];
    return colors[index % colors.length];
}

// Show channel details
function showChannelDetails(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    document.getElementById('channelDetailsTitle').textContent = channel.name;
    document.getElementById('channelDetailsContent').innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>Channel Information</h4>
            <p><strong>Name:</strong> ${channel.name}</p>
            <p><strong>Description:</strong> ${channel.description || 'No description'}</p>
            <p><strong>Status:</strong> ${channel.isPublic ? 'Public' : 'Private'}</p>
            <p><strong>Created:</strong> ${new Date(channel.createdAt).toLocaleString()}</p>
            <p><strong>Last Entry:</strong> ${channel.lastEntry ? new Date(channel.lastEntry).toLocaleString() : 'No data yet'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>Write API Key</h4>
            <code style="background: #f5f5f5; padding: 10px; border-radius: 4px; display: block; word-break: break-all;">
                ${channel.writeApiKey || channel.apiKey || 'Not available'}
            </code>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>Fields Configuration</h4>
            ${channel.fields.length > 0 ? 
                channel.fields.map(field => `<p><strong>${field.name}:</strong> ${field.label}</p>`).join('') :
                '<p>No fields configured</p>'
            }
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>API Usage</h4>
            <p>Send data to your channel using HTTP POST:</p>
            <code style="background: #f5f5f5; padding: 10px; border-radius: 4px; display: block; font-size: 12px;">
POST /api/data/update
Content-Type: application/json

{
  "api_key": "${channel.writeApiKey || channel.apiKey}",
  "field1": 25.6,
  "field2": 60.2
}
            </code>
        </div>
    `;
    
    document.getElementById('channelDetailsModal').classList.add('show');
}

// Edit channel function
function editChannel(channelId) {
    const channel = channels.find(c => c._id === channelId);
    if (!channel) return;
    
    // Pre-fill the create channel modal with existing data
    document.getElementById('channelName').value = channel.name;
    document.getElementById('channelDescription').value = channel.description || '';
    document.getElementById('isPublic').checked = channel.isPublic || false;
    
    // Clear existing fields
    fieldCount = 0;
    document.getElementById('fieldsContainer').innerHTML = '';
    
    // Add existing fields
    if (channel.fields && channel.fields.length > 0) {
        channel.fields.forEach((field, index) => {
            fieldCount++;
            const fieldIcons = [
                'fa-thermometer-half', 'fa-tint', 'fa-wind', 'fa-sun', 
                'fa-bolt', 'fa-gauge', 'fa-chart-line', 'fa-cog'
            ];
            const iconClass = fieldIcons[index] || 'fa-chart-line';
            
            const container = document.getElementById('fieldsContainer');
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field-item';
            fieldDiv.innerHTML = `
                <div class="field-header">
                    <span class="field-number">${fieldCount}</span>
                    <i class="fas ${iconClass} field-icon"></i>
                </div>
                <div class="field-input">
                    <input type="text" placeholder="e.g., Temperature" data-field="${fieldCount}" value="${field.label}">
                    <small>Field ${fieldCount} Label</small>
                </div>
                ${fieldCount > 1 ? `<button type="button" class="remove-field-btn" onclick="removeField(this)" title="Remove Field"><i class="fas fa-times"></i></button>` : ''}
            `;
            container.appendChild(fieldDiv);
        });
    } else {
        // Add default field if no fields exist
        fieldCount = 1;
        addField();
    }
    
    // Update field counter
    document.getElementById('fieldCount').textContent = fieldCount;
    
    // Change form title and button text
    const headerTitle = document.querySelector('.header-text h3');
    const headerSubtitle = document.querySelector('.header-text p');
    const createButton = document.querySelector('.btn-create');
    
    if (headerTitle) headerTitle.textContent = 'Edit Channel';
    if (headerSubtitle) headerSubtitle.textContent = 'Update your IoT channel settings';
    if (createButton) createButton.innerHTML = '<i class="fas fa-save"></i> Update Channel';
    
    // Store the channel ID for update
    document.getElementById('createChannelForm').dataset.editingId = channelId;
    
    // Show modal without resetting (preserve edit data)
    showCreateChannelModal(true);
}

// Delete channel
async function deleteChannel(channelId) {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/channels/${channelId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Channel deleted successfully', 'success');
            await loadChannels();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to delete channel', 'error');
        }
    } catch (error) {
        console.error('Error deleting channel:', error);
        showNotification('Network error while deleting channel', 'error');
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            showNotification('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Network error during logout', 'error');
    }
}

// Additional dashboard functions
function refreshChannels() {
    loadChannels();
    showNotification('Channels refreshed', 'success');
}


function exportData() {
    showNotification('Export feature coming soon!', 'info');
}

function showAPIGuide() {
    // Create a simple API guide modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>API Integration Guide</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 24px;">
                <h4>Send Data to Your Channel</h4>
                <p>Use HTTP POST to send data:</p>
                <pre style="background: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto;">
POST /api/data/update
Content-Type: application/json

{
  "api_key": "your_channel_api_key",
  "field1": 25.6,
  "field2": 60.2,
  "field3": 1013.25
}
                </pre>
                <h4>Arduino Example</h4>
                <pre style="background: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px;">
#include &lt;WiFi.h&gt;
#include &lt;HTTPClient.h&gt;

void sendData(float temp, float humidity) {
  HTTPClient http;
  http.begin("http://your-server.com/api/data/update");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\\"api_key\\":\\"YOUR_API_KEY\\",\\"field1\\":" + 
                   String(temp) + ",\\"field2\\":" + String(humidity) + "}";
  
  int httpResponseCode = http.POST(payload);
  http.end();
}
                </pre>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Got it!</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}


function loadAnalyticsData() {
    // Load analytics when analytics section is shown
    if (channels.length > 0) {
        // Auto-select first channel if none selected
        const select = document.getElementById('chartChannelSelect');
        if (select && !select.value && channels.length > 0) {
            select.value = channels[0]._id;
            updateSelectedChannel();
        }
    }
}

function updateChartTimeRange() {
    const selectedChannel = document.getElementById('chartChannelSelect').value;
    if (selectedChannel) {
        viewChannelData(selectedChannel);
    }
}

function updateSelectedChannel() {
    const selectedChannel = document.getElementById('chartChannelSelect').value;
    if (selectedChannel) {
        viewChannelData(selectedChannel);
    }
}

// Load user settings
function loadUserSettings() {
    if (currentUser) {
        const nameInput = document.getElementById('settingsName');
        const emailInput = document.getElementById('settingsEmail');
        
        if (nameInput) {
            nameInput.value = currentUser.name || '';
        }
        if (emailInput) {
            emailInput.value = currentUser.email || '';
        }
    }
}

// Update user profile
async function updateProfile() {
    console.log('updateProfile function called');
    
    const nameInput = document.getElementById('settingsName');
    const emailInput = document.getElementById('settingsEmail');
    
    console.log('Name input:', nameInput);
    console.log('Email input:', emailInput);
    
    if (!nameInput || !emailInput) {
        console.error('Form fields not found');
        showNotification('Form fields not found', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    
    if (!name || !email) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        console.log('Sending profile update request...');
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                showNotification(errorData.message || 'Failed to update profile', 'error');
            } catch (parseError) {
                showNotification(`Server error: ${response.status} ${response.statusText}`, 'error');
            }
            return;
        }
        
        const data = await response.json();
        console.log('Profile update successful:', data);
        
        // Update current user data
        currentUser.name = name;
        currentUser.email = email;
        
        // Update display name in topbar
        document.getElementById('userName').textContent = name;
        
        showNotification('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Network error updating profile:', error);
        showNotification(`Network error: ${error.message}. Please check your connection and try again.`, 'error');
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Change password function
async function changePassword() {
    console.log('changePassword function called');
    
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
        showNotification('Password form fields not found', 'error');
        return;
    }
    
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (currentPassword === newPassword) {
        showNotification('New password must be different from current password', 'error');
        return;
    }
    
    try {
        console.log('Sending password change request...');
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                currentPassword, 
                newPassword 
            })
        });
        
        console.log('Password change response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                showNotification(errorData.message || 'Failed to change password', 'error');
            } catch (parseError) {
                showNotification(`Server error: ${response.status} ${response.statusText}`, 'error');
            }
            return;
        }
        
        const data = await response.json();
        console.log('Password change successful:', data);
        
        // Clear the form
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        
        showNotification('Password changed successfully!', 'success');
        
    } catch (error) {
        console.error('Network error changing password:', error);
        showNotification(`Network error: ${error.message}. Please check your connection and try again.`, 'error');
    }
}

// Setup profile form event listener
function setupProfileForm() {
    const profileForm = document.getElementById('updateProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });
    }
    
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }
}

// Setup channel search functionality
function setupChannelSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filterChannels(searchTerm);
        };
        
        searchInput.addEventListener('input', performSearch);
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Filter channels based on search term
function filterChannels(searchTerm) {
    if (!searchTerm) {
        displayChannels();
        return;
    }
    
    const filteredChannels = channels.filter(channel => 
        channel.name.toLowerCase().includes(searchTerm) ||
        (channel.description && channel.description.toLowerCase().includes(searchTerm)) ||
        (channel.tags && channel.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
    
    displayFilteredChannels(filteredChannels);
}

// Display filtered channels
function displayFilteredChannels(filteredChannels) {
    const channelsTableBody = document.getElementById('channelsTableBody');
    
    if (filteredChannels.length === 0) {
        channelsTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom: 16px; color: #cbd5e1;">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No channels found</h3>
                    <p>Try adjusting your search terms</p>
                </td>
            </tr>
        `;
        return;
    }
    
    channelsTableBody.innerHTML = filteredChannels.map(channel => {
        const createdDate = new Date(channel.createdAt).toLocaleDateString();
        const lastUpdate = channel.lastEntry ? new Date(channel.lastEntry).toLocaleString() : 'Never';
        // Simple privacy check - default to private if unclear
        const isPrivate = channel.isPublic === true ? false : true;
        
        return `
            <tr>
                <td>
                    <div class="channel-name">
                        <i class="fas ${isPrivate ? 'fa-lock' : 'fa-globe'} channel-privacy-icon"></i>
                        <a href="channel-detail.html?id=${channel._id}" class="channel-name-link">${channel.name}</a>
                    </div>
                    <div class="channel-actions-row">
                        <button class="channel-action-btn" onclick="editChannel('${channel._id}')">Settings</button>
                        <button class="channel-action-btn" onclick="shareChannel('${channel._id}')">Sharing</button>
                        <button class="channel-action-btn" onclick="showApiKeys('${channel._id}')">API Keys</button>
                    </div>
                </td>
                <td>
                    <div class="channel-date">${createdDate}</div>
                </td>
                <td>
                    <div class="channel-date">${lastUpdate}</div>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup table sorting
function setupTableSorting() {
    const sortableHeaders = document.querySelectorAll('.channels-table th.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.textContent.trim().toLowerCase();
            sortChannels(column);
        });
    });
}

let currentSortColumn = '';
let currentSortDirection = 'asc';

// Sort channels by column
function sortChannels(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    const sortedChannels = [...channels].sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'created':
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
            case 'updated':
                aValue = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
                bValue = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return currentSortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Update sort icons
    updateSortIcons(column, currentSortDirection);
    
    // Display sorted channels
    displaySortedChannels(sortedChannels);
}

// Update sort icons in headers
function updateSortIcons(activeColumn, direction) {
    const headers = document.querySelectorAll('.channels-table th.sortable');
    
    headers.forEach(header => {
        const icon = header.querySelector('i');
        const columnName = header.textContent.trim().toLowerCase();
        
        if (columnName === activeColumn) {
            icon.className = direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
}

// Display sorted channels
function displaySortedChannels(sortedChannels) {
    const originalChannels = channels;
    channels = sortedChannels;
    displayChannels();
    channels = originalChannels;
}

// Notification function
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
