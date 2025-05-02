// EV Charging Complaint Management System - Division Dashboard JavaScript
// Script version to force reload if cache detected
const APP_VERSION = '1.0.2';

// Force reload if cached
(function() {
    if (localStorage.getItem('appVersion') !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        window.location.reload(true);
    }
})();

// Set the base URL for API - leave empty for same domain, or set to your domain if needed
const API_BASE_URL = '';

// Global Variables
let currentDivision = null;
let complaintsPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10
};
let chargersPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Setup sidebar navigation
    setupSidebarNavigation();
    
    // Setup logout button
    setupLogout();
    
    // Setup notification system
    setupToastSystem();
    
    // Setup modals
    setupModals();
    
    // Load division dashboard data
    loadDashboardData();
    
    // Setup filters for complaints
    setupComplaintsFilters();
    
    // Setup filters for chargers
    setupChargersFilters();
    
    // Setup pagination
    setupPagination();

    // Setup charger management features
    setupChargerManagement();
    
    // Setup bulk upload functionality
    setupBulkChargerUpload();
    
    // Add charger management styles
    addChargerManagementStyles();
});

// Add this function to setup charger management
function setupChargerManagement() {
    // Setup add charger button
    const addChargerBtn = document.getElementById('addDivisionChargerBtn');
    if (addChargerBtn) {
        addChargerBtn.addEventListener('click', showAddChargerModal);
    }
    
    // Setup bulk upload button
    const bulkUploadBtn = document.getElementById('bulkUploadChargersBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', showBulkUploadModal);
    }
}

// Add this CSS at the beginning of the JS file to ensure styles are added
function addChargerManagementStyles() {
    if (document.getElementById('charger-management-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'charger-management-styles';
    styles.textContent = `
        /* Form styles for charger management */
        .form-row {
            display: flex;
            margin-left: -10px;
            margin-right: -10px;
        }
        
        .form-group {
            margin-bottom: 15px;
            width: 100%;
        }
        
        .form-row .form-group {
            padding-left: 10px;
            padding-right: 10px;
        }
        
        .form-row .form-group.half {
            width: 50%;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 3px;
        }
        
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #777;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 15px 20px;
            border-top: 1px solid #eee;
        }
    `;
    
    document.head.appendChild(styles);
}

// Authentication Check - using API
function checkAuth() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.role !== 'division') {
        // Not logged in or not a division user, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Get division from session storage
    currentDivision = JSON.parse(sessionStorage.getItem('currentDivision'));
    
    if (!currentDivision || !currentDivision.name) {
        // No division information, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Update user name display
    document.getElementById('divisionUserName').textContent = currentDivision.name;
    document.getElementById('divisionWelcomeName').textContent = currentDivision.name;
}

// Sidebar Navigation
function setupSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.getAttribute('data-section');
            
            // Update active sidebar item
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section, hide others
            dashboardSections.forEach(section => {
                if (section.id === targetSection + 'Section') {
                    section.classList.remove('hidden');
                    
                    // Load section data if needed
                    if (targetSection === 'divisionComplaints') {
                        loadFilteredDivisionComplaints(1);
                    } else if (targetSection === 'divisionChargers') {
                        loadFilteredDivisionChargers(1);
                    } else if (targetSection === 'assignedVendors') {
                        loadDivisionVendors();
                    }
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
    
    // Set up "View all complaints" link
    document.getElementById('viewAllDivisionComplaints').addEventListener('click', (e) => {
        e.preventDefault();
        // Find complaints sidebar item and click it
        const complaintsItem = document.querySelector('.sidebar-item[data-section="divisionComplaints"]');
        if (complaintsItem) {
            complaintsItem.click();
        }
    });
}

// Logout Functionality
function setupLogout() {
    const logoutBtn = document.getElementById('divisionLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear session storage
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentDivision');
            
            // Redirect to login page
            window.location.href = 'index.html';
        });
    }
}

// Setup Toast Notification System
function setupToastSystem() {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

// Show Toast Notification
function showToast(type, title, message, duration = 3000) {
    // Get toast container
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Determine icon based on type
    const iconClass = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-times-circle' : 
                     type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon ${type}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Add event listener to close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fading');
        
        // Remove after fade animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Set up modals
function setupModals() {
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.modal-close, .btn-secondary[id^="cancel"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Find closest modal parent
            const modal = button.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Set up assign to vendor form
    const assignToVendorForm = document.getElementById('assignToVendorForm');
    if (assignToVendorForm) {
        assignToVendorForm.addEventListener('submit', handleAssignToVendor);
    }
    
    // Set up update status form
    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', handleUpdateStatus);
    }
}

// Load Dashboard Data using API
function loadDashboardData() {
    if (!currentDivision) return;
    
    // Show loading state
    document.getElementById('divTotalChargers').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divActiveChargers').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divOpenComplaints').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divResolutionRate').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // API request for dashboard statistics
    fetch(`${API_BASE_URL}/api/division.php?action=getDashboardStats&divisionId=${currentDivision.id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update DOM with stats
                updateDashboardWithStats(data.data);
                
                // Load recent complaints
                loadDivisionRecentComplaints();
                
                // Create charger status chart
                createChargerStatusChart(data.data.chargerStatusData);
            } else {
                showToast('error', 'Data Load Failed', data.message || 'Failed to load dashboard data');
                
                // Reset stats to 0
                document.getElementById('divTotalChargers').textContent = '0';
                document.getElementById('divActiveChargers').textContent = '0';
                document.getElementById('divOpenComplaints').textContent = '0';
                document.getElementById('divResolutionRate').textContent = '0%';
            }
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            showToast('error', 'Connection Error', 'Failed to connect to the server. Please check your connection.');
            
            // Reset stats to 0
            document.getElementById('divTotalChargers').textContent = '0';
            document.getElementById('divActiveChargers').textContent = '0';
            document.getElementById('divOpenComplaints').textContent = '0';
            document.getElementById('divResolutionRate').textContent = '0%';
        });
}

// Update Dashboard with Stats Data
function updateDashboardWithStats(stats) {
    document.getElementById('divTotalChargers').textContent = stats.totalChargers || '0';
    document.getElementById('divActiveChargers').textContent = stats.activeChargers || '0';
    document.getElementById('divOpenComplaints').textContent = stats.openComplaints || '0';
    document.getElementById('divResolutionRate').textContent = `${stats.resolutionRate || '0'}%`;
    
    // Update trend indicators
    document.getElementById('divChargersChange').textContent = stats.chargersTrend || '0';
    
    // Update trend classes and icons
    const activeChargersTrend = document.getElementById('activeChargersTrend');
    const openComplaintsTrend = document.getElementById('openComplaintsTrend');
    const resolutionRateTrend = document.getElementById('resolutionRateTrend');
    
    if (activeChargersTrend) {
        const isPositive = parseInt(stats.activeChargersTrend || 0) >= 0;
        activeChargersTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        activeChargersTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(parseInt(stats.activeChargersTrend || 0))}
        `;
    }
    
    if (openComplaintsTrend) {
        const isPositive = parseInt(stats.openComplaintsTrend || 0) <= 0; // Fewer complaints is positive
        openComplaintsTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        openComplaintsTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'down' : 'up'}"></i>
            ${Math.abs(parseInt(stats.openComplaintsTrend || 0))}
        `;
    }
    
    if (resolutionRateTrend) {
        // Higher resolution rate is positive
        const isPositive = parseInt(stats.resolutionRateTrend || 0) >= 0;
        resolutionRateTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        resolutionRateTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(parseInt(stats.resolutionRateTrend || 0))}%
        `;
    }
}

// Load Recent Complaints for Dashboard using API
function loadDivisionRecentComplaints() {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divisionComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading complaints...</td></tr>';
    
    // API request for recent complaints
    fetch(`${API_BASE_URL}/api/division.php?action=getRecentComplaints&divisionId=${currentDivision.id}&limit=5`)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success && data.data.length > 0) {
                // Add complaints to table
                data.data.forEach(complaint => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.location || 'Unknown Location'}</td>
                        <td>${complaint.type || 'General'}</td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                        <td>${complaint.vendor_name || 'Not Assigned'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.tracking_id}">
                                View
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners to view buttons
                const viewButtons = tableBody.querySelectorAll('.view-complaint-btn');
                viewButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showComplaintDetails(trackingId);
                    });
                });
            } else {
                // Show no data message
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No complaints found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading recent complaints:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Failed to load complaints. Please try again.</td></tr>';
        });
}

// Create Charger Status Chart using API data
function createChargerStatusChart(chargerStatusData) {
    if (!currentDivision) return;
    
    const chartCanvas = document.getElementById('chargerStatusChart');
    if (!chartCanvas) return;
    
    // Default data if none provided
    const statusCounts = chargerStatusData || {
        active: 0,
        inactive: 0,
        maintenance: 0
    };
    
    // Create or update chart
    if (window.chargerStatusChart) {
        window.chargerStatusChart.destroy();
    }
    
    window.chargerStatusChart = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Inactive', 'Under Maintenance'],
            datasets: [{
                data: [
                    statusCounts.active,
                    statusCounts.inactive,
                    statusCounts.maintenance
                ],
                backgroundColor: [
                    '#4CAF50', // Green for active
                    '#F44336', // Red for inactive
                    '#FFC107'  // Yellow for maintenance
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Charger Status Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Setup Complaints Filters
function setupComplaintsFilters() {
    const applyFiltersBtn = document.getElementById('applyDivFilters');
    const resetFiltersBtn = document.getElementById('resetDivFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            complaintsPagination.currentPage = 1;
            loadFilteredDivisionComplaints(1);
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset filter inputs
            document.getElementById('divComplaintStatusFilter').value = 'all';
            document.getElementById('divComplaintTypeFilter').value = 'all';
            document.getElementById('divComplaintSearch').value = '';
            document.getElementById('divDateFrom').value = '';
            document.getElementById('divDateTo').value = '';
            
            complaintsPagination.currentPage = 1;
            loadFilteredDivisionComplaints(1);
        });
    }
}

// Load Filtered Division Complaints using API
function loadFilteredDivisionComplaints(page = 1) {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading complaints...</td></tr>';
    
    // Get filter values
    const statusFilter = document.getElementById('divComplaintStatusFilter').value;
    const typeFilter = document.getElementById('divComplaintTypeFilter').value;
    const searchInput = document.getElementById('divComplaintSearch').value.toLowerCase();
    const dateFrom = document.getElementById('divDateFrom').value;
    const dateTo = document.getElementById('divDateTo').value;
    
    // Build API URL with query parameters
    let apiUrl = `${API_BASE_URL}/api/division.php?action=getComplaints&divisionId=${currentDivision.id}&page=${page}&limit=${complaintsPagination.itemsPerPage}`;
    
    if (statusFilter !== 'all') {
        apiUrl += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    if (typeFilter !== 'all') {
        apiUrl += `&type=${encodeURIComponent(typeFilter)}`;
    }
    
    if (searchInput) {
        apiUrl += `&search=${encodeURIComponent(searchInput)}`;
    }
    
    if (dateFrom) {
        apiUrl += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    }
    
    if (dateTo) {
        apiUrl += `&dateTo=${encodeURIComponent(dateTo)}`;
    }
    
    // Fetch filtered complaints
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success) {
                // Update pagination
                complaintsPagination.totalPages = data.pagination.totalPages || 1;
                complaintsPagination.currentPage = data.pagination.currentPage || 1;
                
                // Update pagination controls
                document.getElementById('currentDivComplaintPage').textContent = complaintsPagination.currentPage;
                document.getElementById('totalDivComplaintPages').textContent = complaintsPagination.totalPages;
                document.getElementById('prevDivComplaintPage').disabled = complaintsPagination.currentPage <= 1;
                document.getElementById('nextDivComplaintPage').disabled = complaintsPagination.currentPage >= complaintsPagination.totalPages;
                
                // Check if we have complaints to display
                if (data.data.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No complaints found</td></tr>';
                    return;
                }
                
                // Add complaints to table
                data.data.forEach(complaint => {
                    // Create row with complaint data
                    const row = document.createElement('tr');
                    
                    // First cells
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.location || 'Unknown Location'}</td>
                        <td>${complaint.consumer_name || 'Anonymous'}</td>
                        <td>${complaint.type || 'General'}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                    `;
                    
                    // Create SLA info cell
                    const slaCell = document.createElement('td');
                    if (complaint.assigned_to && complaint.sla_priority && complaint.expected_resolution_date) {
                        // Calculate time remaining or delay based on the SLA deadline
                        const now = new Date();
                        const deadline = new Date(complaint.expected_resolution_date);
                        const timeRemaining = deadline - now;
                        
                        // Get SLA priority class
                        const slaClass = getSLAPriorityClass(complaint.sla_priority);
                        
                        // Create SLA badge
                        const slaBadgeHTML = `<span class="sla-badge ${slaClass}">${complaint.sla_priority.toUpperCase()}</span>`;
                        
                        // Create SLA timer with appropriate class
                        let slaTimerHTML = '';
                        if (timeRemaining > 0) {
                            // Still has time - create countdown timer element
                            slaTimerHTML = `
                                <div class="sla-timer on-time" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-div-table">
                                    Loading timer...
                                </div>
                            `;
                        } else {
                            // Overdue - show delay timer
                            slaTimerHTML = `
                                <div class="sla-timer overdue" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-div-table">
                                    Loading timer...
                                </div>
                            `;
                        }
                        
                        // Set cell content
                        slaCell.innerHTML = `
                            ${new Date(complaint.expected_resolution_date).toLocaleDateString()} ${slaBadgeHTML}
                            ${slaTimerHTML}
                        `;
                        
                        // Add class to row if overdue
                        if (timeRemaining < 0) {
                            row.classList.add('sla-overdue');
                        }
                    } else {
                        // Not assigned to vendor yet
                        slaCell.innerHTML = '<span class="muted-text">Not yet assigned to vendor</span>';
                    }
                    row.appendChild(slaCell);
                    
                    // Continue with remaining cells
                    row.innerHTML += `
                        <td>${complaint.vendor_name || 'Not Assigned'}</td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.tracking_id}">
                                View
                            </button>
                            ${complaint.status !== 'Resolved' ? `
                            <button class="btn btn-sm btn-primary assign-complaint-btn" data-id="${complaint.tracking_id}">
                                Assign
                            </button>
                            <button class="btn btn-sm btn-secondary update-status-btn" data-id="${complaint.tracking_id}">
                                Update
                            </button>
                            ` : ''}
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners
                tableBody.querySelectorAll('.view-complaint-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showComplaintDetails(trackingId);
                    });
                });
                
                tableBody.querySelectorAll('.assign-complaint-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showAssignToVendorModal(trackingId);
                    });
                });
                
                tableBody.querySelectorAll('.update-status-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showUpdateStatusModal(trackingId);
                    });
                });
                
                // Initialize SLA timers
                initializeSLATimers();
                
                // Add required styles if not already present
                if (!document.getElementById('sla-styles')) {
                    addSLAStyles();
                }
                
                if (!document.getElementById('extra-sla-styles')) {
                    addExtraSLAStyles();
                }
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error loading complaints:', error);
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Failed to load complaints. Please try again.</td></tr>';
        });
}

// Setup Chargers Filters
function setupChargersFilters() {
    const applyFiltersBtn = document.getElementById('applyDivChargerFilters');
    const resetFiltersBtn = document.getElementById('resetDivChargerFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            chargersPagination.currentPage = 1;
            loadFilteredDivisionChargers(1);
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset filter inputs
            document.getElementById('divChargerStatusFilter').value = 'all';
            document.getElementById('divChargerTypeFilter').value = 'all';
            document.getElementById('divChargerSearch').value = '';
            
            chargersPagination.currentPage = 1;
            loadFilteredDivisionChargers(1);
        });
    }
}

// Load Filtered Division Chargers using API
function loadFilteredDivisionChargers(page = 1) {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divisionChargersTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading chargers...</td></tr>';
    
    // Get filter values
    const statusFilter = document.getElementById('divChargerStatusFilter').value;
    const typeFilter = document.getElementById('divChargerTypeFilter').value;
    const searchInput = document.getElementById('divChargerSearch').value.toLowerCase();
    
    // Build API URL with query parameters
    let apiUrl = `${API_BASE_URL}/api/division.php?action=getChargers&divisionId=${currentDivision.id}&page=${page}&limit=${chargersPagination.itemsPerPage}`;
    
    if (statusFilter !== 'all') {
        apiUrl += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    if (typeFilter !== 'all') {
        apiUrl += `&type=${encodeURIComponent(typeFilter)}`;
    }
    
    if (searchInput) {
        apiUrl += `&search=${encodeURIComponent(searchInput)}`;
    }
    
    // Fetch filtered chargers
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success) {
                // Update pagination
                chargersPagination.totalPages = data.pagination.totalPages || 1;
                chargersPagination.currentPage = data.pagination.currentPage || 1;
                
                // Update pagination controls
                document.getElementById('currentDivChargerPage').textContent = chargersPagination.currentPage;
                document.getElementById('totalDivChargerPages').textContent = chargersPagination.totalPages;
                document.getElementById('prevDivChargerPage').disabled = chargersPagination.currentPage <= 1;
                document.getElementById('nextDivChargerPage').disabled = chargersPagination.currentPage >= chargersPagination.totalPages;
                
                // Check if we have chargers to display
                if (data.data.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No chargers found</td></tr>';
                    return;
                }
                
                // Add chargers to table
                data.data.forEach(charger => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${charger.cpid}</td>
                        <td>${charger.serial_number || 'N/A'}</td>
                        <td>${charger.location || 'Unknown'}</td>
                        <td>${(charger.make || '') + ' ' + (charger.model || '')}</td>
                        <td>${charger.type || 'Unknown'}</td>
                        <td><span class="status-badge ${getChargerStatusClass(charger.status)}">${charger.status || 'Unknown'}</span></td>
                        <td>${charger.open_complaints || 0}</td>
                        <td>${charger.commission_date ? new Date(charger.commission_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-charger-btn" data-id="${charger.id}" data-cpid="${charger.cpid}">
                                View
                            </button>
                            <button class="btn btn-sm btn-primary edit-charger-btn" data-id="${charger.id}" data-cpid="${charger.cpid}">
                                Edit
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners
                tableBody.querySelectorAll('.view-charger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const chargerId = btn.getAttribute('data-id');
                        const cpid = btn.getAttribute('data-cpid');
                        showChargerDetails(chargerId, cpid);
                    });
                });
                
                tableBody.querySelectorAll('.edit-charger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const chargerId = btn.getAttribute('data-id');
                        const cpid = btn.getAttribute('data-cpid');
                        // TO-DO: Implement edit charger functionality
                        showToast('info', 'Feature Coming Soon', 'Charger editing will be available in a future update');
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error loading chargers:', error);
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Failed to load chargers. Please try again.</td></tr>';
        });
}

// Load Division Vendors using API
function loadDivisionVendors() {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divVendorsTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading vendors...</td></tr>';
    
    // Fetch vendors for division
    fetch(`${API_BASE_URL}/api/division.php?action=getVendors&divisionId=${currentDivision.id}`)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success) {
                // Check if we have vendors to display
                if (data.data.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No vendors available for your division</td></tr>';
                    return;
                }
                
                // Add vendors to table
                data.data.forEach(vendor => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${vendor.name}</td>
                        <td>${vendor.contact_person || 'N/A'}</td>
                        <td>${vendor.email || 'N/A'}</td>
                        <td>${vendor.phone || 'N/A'}</td>
                        <td>${vendor.open_tickets}</td>
                        <td>${vendor.avg_resolution_time || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-vendor-btn" data-id="${vendor.id}">
                                View
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners
                tableBody.querySelectorAll('.view-vendor-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vendorId = btn.getAttribute('data-id');
                        // TO-DO: Implement view vendor details
                        showToast('info', 'Feature Coming Soon', 'Vendor details will be available in a future update');
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error loading vendors:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load vendors. Please try again.</td></tr>';
        });
}

// Setup Pagination
function setupPagination() {
    // Complaints pagination
    const prevComplaintBtn = document.getElementById('prevDivComplaintPage');
    const nextComplaintBtn = document.getElementById('nextDivComplaintPage');
    
    if (prevComplaintBtn) {
        prevComplaintBtn.addEventListener('click', () => {
            if (complaintsPagination.currentPage > 1) {
                loadFilteredDivisionComplaints(complaintsPagination.currentPage - 1);
            }
        });
    }
    
    if (nextComplaintBtn) {
        nextComplaintBtn.addEventListener('click', () => {
            if (complaintsPagination.currentPage < complaintsPagination.totalPages) {
                loadFilteredDivisionComplaints(complaintsPagination.currentPage + 1);
            }
        });
    }
    
    // Chargers pagination
    const prevChargerBtn = document.getElementById('prevDivChargerPage');
    const nextChargerBtn = document.getElementById('nextDivChargerPage');
    
    if (prevChargerBtn) {
        prevChargerBtn.addEventListener('click', () => {
            if (chargersPagination.currentPage > 1) {
                loadFilteredDivisionChargers(chargersPagination.currentPage - 1);
            }
        });
    }
    
    if (nextChargerBtn) {
        nextChargerBtn.addEventListener('click', () => {
            if (chargersPagination.currentPage < chargersPagination.totalPages) {
                loadFilteredDivisionChargers(chargersPagination.currentPage + 1);
            }
        });
    }
}

// Show Complaint Details using API
function showComplaintDetails(trackingId) {
    // Get complaint data from API
    fetch(`${API_BASE_URL}/api/division.php?action=getComplaintDetails&trackingId=${trackingId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const complaint = data.data;
                
                // Get modal elements
                const modal = document.getElementById('complaintDetailsModal');
                const modalContent = document.getElementById('complaintDetailsContent');
                const actionButtons = document.getElementById('complaintActionButtons');
                
                if (!modal || !modalContent || !actionButtons) return;
                
                // Build complaint details HTML
                let detailsHTML = `
                    <div class="complaint-details-container">
                        <div class="complaint-header">
                            <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                            <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Complaint Information</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Charger ID:</div>
                                    <div class="detail-value">${complaint.charger_id}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Location:</div>
                                    <div class="detail-value">${complaint.location || 'Unknown Location'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Issue Type:</div>
                                    <div class="detail-value">${complaint.type}${complaint.sub_type ? ` - ${complaint.sub_type}` : ''}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Reported By:</div>
                                    <div class="detail-value">${complaint.consumer_name || 'Anonymous'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Contact:</div>
                                    <div class="detail-value">${complaint.consumer_phone || 'N/A'} / ${complaint.consumer_email || 'N/A'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Submitted On:</div>
                                    <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Assigned To:</div>
                                    <div class="detail-value">${complaint.vendor_name || 'Not Assigned'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Expected Resolution:</div>
                                    <div class="detail-value">${complaint.expected_resolution_date ? new Date(complaint.expected_resolution_date).toLocaleDateString() : 'Not Specified'}</div>
                                </div>
                            </div>
                            
                            <div class="description-section">
                                <div class="detail-label">Description:</div>
                                <div class="detail-value description">${complaint.description || 'No description provided'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Timeline</h3>
                            <div class="tracking-timeline">
                `;
                
                // Add timeline events
                if (complaint.timeline && complaint.timeline.length > 0) {
                    complaint.timeline.forEach(event => {
                        const statusClass = 
                            event.status.toLowerCase().includes('resolved') ? 'green' :
                            event.status.toLowerCase().includes('progress') ? 'yellow' : 'blue';
                        
                        detailsHTML += `
                            <div class="timeline-item">
                                <div class="timeline-icon ${statusClass}"></div>
                                <div class="timeline-content">
                                    <div class="timeline-title">${event.status}</div>
                                    <div class="timeline-date">${new Date(event.timestamp).toLocaleString()}</div>
                                    <div class="timeline-description">${event.description || ''}</div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    detailsHTML += `
                        <div class="timeline-item">
                            <div class="timeline-icon"></div>
                            <div class="timeline-content">
                                <div class="timeline-title">Complaint Received</div>
                                <div class="timeline-date">${new Date(complaint.created_at).toLocaleString()}</div>
                                <div class="timeline-description">Complaint has been registered in the system.</div>
                            </div>
                        </div>
                    `;
                }
                
                detailsHTML += `
                            </div>
                        </div>
                    </div>
                `;
                
                // Update modal content
                modalContent.innerHTML = detailsHTML;
                
                // Update action buttons
                let buttonsHTML = `<button type="button" class="btn btn-secondary" id="closeDetailsBtn">Close</button>`;
                
                if (complaint.status !== 'Resolved') {
                    buttonsHTML = `
                        <button type="button" class="btn btn-primary assign-vendor-modal-btn" data-id="${complaint.tracking_id}">
                            <i class="fas fa-user-plus"></i> Assign to Vendor
                        </button>
                        <button type="button" class="btn btn-primary update-status-modal-btn" data-id="${complaint.tracking_id}">
                            <i class="fas fa-edit"></i> Update Status
                        </button>
                        ${buttonsHTML}
                    `;
                }
                
                actionButtons.innerHTML = buttonsHTML;
                
                // Add event listeners to action buttons
                actionButtons.querySelector('#closeDetailsBtn').addEventListener('click', () => {
                    modal.classList.remove('active');
                });
                
                const assignVendorBtn = actionButtons.querySelector('.assign-vendor-modal-btn');
                if (assignVendorBtn) {
                    assignVendorBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        showAssignToVendorModal(complaint.tracking_id);
                    });
                }
                
                const updateStatusBtn = actionButtons.querySelector('.update-status-modal-btn');
                if (updateStatusBtn) {
                    updateStatusBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        showUpdateStatusModal(complaint.tracking_id);
                    });
                }
                
                // Show modal
                modal.classList.add('active');
                
                setTimeout(() => enhanceComplaintDetailsDisplay(complaint), 200);
            } else {
                showToast('error', 'Complaint Not Found', data.message || 'The requested complaint information could not be found');
            }
        })
        .catch(error => {
            console.error('Error fetching complaint details:', error);
            showToast('error', 'Connection Error', 'Failed to fetch complaint details. Please try again.');
        });
}

// Enhance complaint details display with SLA info
function enhanceComplaintDetailsDisplay(complaint) {
    if (!complaint) return;
    
    // Get complaint detail container
    let detailContainer;
    
    // Check which page we're on by looking for different container IDs
    if (document.getElementById('complaintDetailsContent')) {
        // Division page
        detailContainer = document.getElementById('complaintDetailsContent');
    } else if (document.querySelector('#complaintDetailsModal .modal-body')) {
        // Admin page
        detailContainer = document.querySelector('#complaintDetailsModal .modal-body');
    } else {
        // No compatible container found
        return;
    }
    
    // Only add SLA section if assigned to vendor with SLA
    if (complaint.vendor_name && complaint.sla_priority && complaint.expected_resolution_date) {
        // Create SLA section if it doesn't exist
        if (!detailContainer.querySelector('.sla-info-section')) {
            const slaSection = document.createElement('div');
            slaSection.className = 'detail-section sla-info-section';
            
            const slaClass = getSLAPriorityClass(complaint.sla_priority);
            const deadlineDate = new Date(complaint.expected_resolution_date);
            
            // Calculate time remaining or delay
            const now = new Date();
            const timeRemaining = deadlineDate - now;
            
            // Create SLA timer component
            let slaTimerHTML = '';
            if (timeRemaining > 0) {
                slaTimerHTML = `
                    <div class="sla-timer detail-timer on-time" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-detail">
                        Loading timer...
                    </div>
                `;
            } else {
                slaTimerHTML = `
                    <div class="sla-timer detail-timer overdue" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-detail">
                        Loading timer...
                    </div>
                `;
            }
            
            slaSection.innerHTML = `
                <h3>SLA Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Priority:</div>
                        <div class="detail-value">
                            <span class="sla-badge ${slaClass}">${complaint.sla_priority.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Deadline:</div>
                        <div class="detail-value">${deadlineDate.toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time Remaining:</div>
                        <div class="detail-value">${slaTimerHTML}</div>
                    </div>
                </div>
            `;
            
            // Find a good insertion point (after complaint info, before timeline)
            const timelineSection = detailContainer.querySelector('.detail-section:last-child');
            if (timelineSection) {
                timelineSection.insertAdjacentElement('beforebegin', slaSection);
            } else {
                // Just append if no better place found
                detailContainer.appendChild(slaSection);
            }
            
            // Initialize SLA timers
            initializeSLATimers();
        }
    }
}

// Show Assign to Vendor Modal using API
function showAssignToVendorModal(trackingId) {
    // Get complaint data from API
    fetch(`${API_BASE_URL}/api/division.php?action=getComplaintDetails&trackingId=${trackingId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const complaint = data.data;
                
                // Get modal elements
                const modal = document.getElementById('assignToVendorModal');
                const vendorSelect = document.getElementById('vendorSelect');
                const trackingIdInput = document.getElementById('vendorComplaintTrackingId');
                
                if (!modal || !vendorSelect || !trackingIdInput) return;
                
                // Clear previous selections
                vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
                
                // Set tracking ID
                trackingIdInput.value = trackingId;
                
                // Fetch available vendors for this division
                fetch(`${API_BASE_URL}/api/division.php?action=getAvailableVendors&divisionId=${currentDivision.id}`)
                    .then(response => response.json())
                    .then(vendorData => {
                        if (vendorData.success && vendorData.data.length > 0) {
                            // Add vendor options
                            vendorData.data.forEach(vendor => {
                                vendorSelect.innerHTML += `<option value="${vendor.id}">${vendor.name}</option>`;
                            });
                        } else {
                            vendorSelect.innerHTML += '<option value="" disabled>No vendors available for this division</option>';
                        }
                        
                        // Add SLA priority selection if it doesn't exist
                        if (!document.getElementById('slaPriority')) {
                            // Create SLA priority field
                            const slaPriorityField = document.createElement('div');
                            slaPriorityField.className = 'form-group';
                            
                            // Get SLA settings from API
                            fetch(`${API_BASE_URL}/api/division.php?action=getSLASettings`)
                                .then(response => response.json())
                                .then(slaData => {
                                    // Use either API data or defaults
                                    const slaSettings = slaData.success ? slaData.data : {};
                                    const criticalHours = slaSettings.criticalSLA || 4;
                                    const highHours = slaSettings.highSLA || 12;
                                    const mediumHours = slaSettings.mediumSLA || 24;
                                    const lowHours = slaSettings.lowSLA || 48;
                                    
                                    // Format SLA times for display
                                    const formatSLATime = (hours) => {
                                        if (hours < 24) return `${hours} hours`;
                                        const days = Math.floor(hours / 24);
                                        const remainingHours = hours % 24;
                                        return days > 0 ? 
                                            (remainingHours > 0 ? `${days} days, ${remainingHours} hours` : `${days} days`) : 
                                            `${hours} hours`;
                                    };
                                    
                                    slaPriorityField.innerHTML = `
                                        <label for="slaPriority">Priority Level (SLA)</label>
                                        <select id="slaPriority" name="slaPriority" required>
                                            <option value="critical">Critical (${formatSLATime(criticalHours)})</option>
                                            <option value="high">High (${formatSLATime(highHours)})</option>
                                            <option value="medium" selected>Medium (${formatSLATime(mediumHours)})</option>
                                            <option value="low">Low (${formatSLATime(lowHours)})</option>
                                        </select>
                                        <p class="help-text">SLA timer will start immediately after assignment</p>
                                    `;
                                    
                                    // Get the form
                                    const form = document.getElementById('assignToVendorForm');
                                    
                                    // Get insertion point (after vendorSelect)
                                    const vendorSelectGroup = vendorSelect.parentElement;
                                    const assignmentNoteGroup = document.getElementById('vendorAssignmentNote').parentElement;
                                    
                                    // Insert after vendor select and before assignment note
                                    form.insertBefore(slaPriorityField, assignmentNoteGroup);
                                })
                                .catch(error => {
                                    console.error('Error fetching SLA settings:', error);
                                    
                                    // Use default SLA settings
                                    slaPriorityField.innerHTML = `
                                        <label for="slaPriority">Priority Level (SLA)</label>
                                        <select id="slaPriority" name="slaPriority" required>
                                            <option value="critical">Critical (4 hours)</option>
                                            <option value="high">High (12 hours)</option>
                                            <option value="medium" selected>Medium (24 hours)</option>
                                            <option value="low">Low (48 hours)</option>
                                        </select>
                                        <p class="help-text">SLA timer will start immediately after assignment</p>
                                    `;
                                    
                                    // Get the form
                                    const form = document.getElementById('assignToVendorForm');
                                    
                                    // Get insertion point (after vendorSelect)
                                    const vendorSelectGroup = vendorSelect.parentElement;
                                    const assignmentNoteGroup = document.getElementById('vendorAssignmentNote').parentElement;
                                    
                                    // Insert after vendor select and before assignment note
                                    form.insertBefore(slaPriorityField, assignmentNoteGroup);
                                });
                        }
                        
                        // Remove the expected resolution date field if it exists
                        const expectedDateField = document.getElementById('expectedResolutionDate');
                        if (expectedDateField) {
                            const fieldGroup = expectedDateField.parentElement;
                            if (fieldGroup) {
                                fieldGroup.remove();
                            }
                        }
                        
                        // Show modal
                        modal.classList.add('active');
                    })
                    .catch(error => {
                        console.error('Error fetching vendors:', error);
                        showToast('error', 'Connection Error', 'Failed to fetch vendors. Please try again.');
                    });
            } else {
                showToast('error', 'Complaint Not Found', data.message || 'The requested complaint information could not be found');
            }
        })
        .catch(error => {
            console.error('Error fetching complaint details:', error);
            showToast('error', 'Connection Error', 'Failed to fetch complaint details. Please try again.');
        });
}

// Handle Assign to Vendor submission
function handleAssignToVendor(e) {
    e.preventDefault();
    
    // Get form data
    const trackingId = document.getElementById('vendorComplaintTrackingId').value;
    const selectedVendorId = document.getElementById('vendorSelect').value;
    const assignmentNote = document.getElementById('vendorAssignmentNote').value;
    const updateToInProgress = document.getElementById('updateToInProgress').checked;
    const slaPriority = document.getElementById('slaPriority').value;
    
    if (!trackingId || !selectedVendorId) {
        showToast('error', 'Required Fields', 'Please select a vendor to assign the complaint');
        return;
    }
    
    // Disable form submission
    const submitButton = document.querySelector('#assignToVendorForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
    }
    
    // Prepare data for API request
    const requestData = {
        action: 'assignComplaintToVendor',
        trackingId: trackingId,
        vendorId: selectedVendorId,
        note: assignmentNote,
        updateStatus: updateToInProgress,
        slaPriority: slaPriority,
        divisionId: currentDivision.id
    };
    
    // Make API request
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Assign';
        }
        
        if (data.success) {
            // Close modal
            document.getElementById('assignToVendorModal').classList.remove('active');
            
            // Reset form
            document.getElementById('assignToVendorForm').reset();
            
            // Show success message
            showToast('success', 'Complaint Assigned', `Complaint has been assigned to ${data.data.vendorName} with ${slaPriority} priority`);
            
            // Refresh complaints tables
            loadDivisionRecentComplaints();
            loadFilteredDivisionComplaints(complaintsPagination.currentPage);
        } else {
            showToast('error', 'Assignment Failed', data.message || 'Failed to assign complaint to vendor');
        }
    })
    .catch(error => {
        console.error('Error assigning complaint:', error);
        
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Assign';
        }
        
        showToast('error', 'Connection Error', 'Failed to connect to the server. Please try again.');
    });
}

// Show Update Status Modal using API
function showUpdateStatusModal(trackingId) {
    // Get complaint data from API
    fetch(`${API_BASE_URL}/api/division.php?action=getComplaintDetails&trackingId=${trackingId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const complaint = data.data;
                
                // Get modal elements
                const modal = document.getElementById('updateStatusModal');
                const currentStatusInfo = document.getElementById('currentStatusInfo');
                const newStatusSelect = document.getElementById('newStatus');
                const trackingIdInput = document.getElementById('statusComplaintId');
                
                if (!modal || !currentStatusInfo || !newStatusSelect || !trackingIdInput) return;
                
                // Update current status info
                currentStatusInfo.innerHTML = `
                    <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                    <div class="tracking-status">Current Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
                `;
                
                // Set tracking ID
                trackingIdInput.value = trackingId;
                
                // Clear previous options
                newStatusSelect.innerHTML = '<option value="">Select New Status</option>';
                
                // If complaint is pending resolution approval, add approval options
                if (complaint.status === 'Pending Resolution Approval') {
                    // Add "Approve Resolution" and "Reject Resolution" options
                    newStatusSelect.innerHTML += `
                        <option value="Resolved">Approve Resolution</option>
                        <option value="In Progress">Reject Resolution (Return to In Progress)</option>
                    `;
                } else if (complaint.status === 'Site Visit Done') {
                    // Options for Site Visit Done
                    newStatusSelect.innerHTML += `
                        <option value="In Progress">Return to In Progress</option>
                        <option value="Resolved">Mark as Resolved</option>
                    `;
                } else {
                    // Define available statuses (exclude current status)
                    const statuses = ['Open', 'In Progress', 'Site Visit Done', 'Resolved'];
                    const availableStatuses = statuses.filter(status => 
                        status.toLowerCase() !== complaint.status.toLowerCase()
                    );
                    
                    // Add status options
                    availableStatuses.forEach(status => {
                        newStatusSelect.innerHTML += `<option value="${status}">${status}</option>`;
                    });
                }
                
                // Initialize SLA section if complaint has SLA info
                if (complaint.vendor_name && complaint.sla_priority && complaint.expected_resolution_date) {
                    enhanceComplaintDetailsDisplay(complaint);
                }
                
                // Show modal
                modal.classList.add('active');
            } else {
                showToast('error', 'Complaint Not Found', data.message || 'The requested complaint information could not be found');
            }
        })
        .catch(error => {
            console.error('Error fetching complaint details:', error);
            showToast('error', 'Connection Error', 'Failed to fetch complaint details. Please try again.');
        });
}

// Handle Update Status Form submission
function handleUpdateStatus(e) {
    e.preventDefault();
    
    // Get form data
    const trackingId = document.getElementById('statusComplaintId').value;
    const newStatus = document.getElementById('newStatus').value;
    const statusNote = document.getElementById('statusNote').value;
    
    if (!trackingId || !newStatus) {
        showToast('error', 'Required Fields', 'Please select a new status');
        return;
    }
    
    // Disable form submission
    const submitButton = document.querySelector('#updateStatusForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }
    
    // Prepare data for API request
    const requestData = {
        action: 'updateComplaintStatus',
        trackingId: trackingId,
        newStatus: newStatus,
        note: statusNote,
        divisionId: currentDivision.id
    };
    
    // Make API request
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Update Status';
        }
        
        if (data.success) {
            // Close modal
            document.getElementById('updateStatusModal').classList.remove('active');
            
            // Reset form
            document.getElementById('updateStatusForm').reset();
            
            // Show appropriate success message based on action
            if (data.data && data.data.specialAction) {
                if (data.data.specialAction === 'resolution_approved') {
                    showToast('success', 'Resolution Approved', 'The complaint has been marked as resolved');
                } else if (data.data.specialAction === 'resolution_rejected') {
                    showToast('warning', 'Resolution Rejected', 'The complaint has been returned to In Progress status');
                } else {
                    showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
                }
            } else {
                showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
            }
            
            // Refresh complaints tables
            loadDivisionRecentComplaints();
            loadFilteredDivisionComplaints(complaintsPagination.currentPage);
        } else {
            showToast('error', 'Update Failed', data.message || 'Failed to update complaint status');
        }
    })
    .catch(error => {
        console.error('Error updating status:', error);
        
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Update Status';
        }
        
        showToast('error', 'Connection Error', 'Failed to connect to the server. Please try again.');
    });
}

// Show Charger Details
function showChargerDetails(chargerId, cpid) {
    // Get charger data from API
    fetch(`${API_BASE_URL}/api/division.php?action=getChargerDetails&chargerId=${chargerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const charger = data.data;
                
                // Create modal if it doesn't exist
                let chargerModal = document.getElementById('chargerDetailsModal');
                
                if (!chargerModal) {
                    chargerModal = document.createElement('div');
                    chargerModal.id = 'chargerDetailsModal';
                    chargerModal.className = 'modal';
                    document.body.appendChild(chargerModal);
                }
                
                // Create modal content
                chargerModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title">Charger Details</h2>
                            <button class="modal-close" id="closeChargerDetailModal">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="detail-section">
                                <h3>Charger Information</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Charge Point ID:</div>
                                        <div class="detail-value">${charger.cpid}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Serial Number:</div>
                                        <div class="detail-value">${charger.serial_number || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Location:</div>
                                        <div class="detail-value">${charger.location || 'Unknown'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Make & Model:</div>
                                        <div class="detail-value">${(charger.make || '') + ' ' + (charger.model || '')}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Type:</div>
                                        <div class="detail-value">${charger.type || 'Unknown'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Status:</div>
                                        <div class="detail-value">
                                            <span class="status-badge ${getChargerStatusClass(charger.status)}">${charger.status || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Commission Date:</div>
                                        <div class="detail-value">${charger.commission_date ? new Date(charger.commission_date).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Open Complaints:</div>
                                        <div class="detail-value">${charger.open_complaints || 0}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Recent Complaints</h3>
                                <div class="recent-complaints">
                                    ${charger.recent_complaints && charger.recent_complaints.length > 0 ? `
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Tracking ID</th>
                                                    <th>Type</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${charger.recent_complaints.map(c => `
                                                    <tr>
                                                        <td>${c.tracking_id}</td>
                                                        <td>${c.type}</td>
                                                        <td><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td>
                                                        <td>${new Date(c.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    ` : '<p class="no-data">No complaints found for this charger.</p>'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary edit-charger-btn" data-id="${charger.id}" data-cpid="${charger.cpid}">
                                Edit Charger
                            </button>
                            <button type="button" class="btn btn-secondary" id="closeDetailBtn">Close</button>
                        </div>
                    </div>
                `;
                
                // Show modal
                chargerModal.classList.add('active');
                
                // Add event listeners
                document.getElementById('closeChargerDetailModal').addEventListener('click', () => {
                    chargerModal.classList.remove('active');
                });
                
                document.getElementById('closeDetailBtn').addEventListener('click', () => {
                    chargerModal.classList.remove('active');
                });
                
                const editBtn = chargerModal.querySelector('.edit-charger-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        chargerModal.classList.remove('active');
                        // Call edit function
                        showEditChargerModal(chargerId, cpid);
                    });
                }
            } else {
                showToast('error', 'Charger Not Found', data.message || 'The requested charger information could not be found');
            }
        })
        .catch(error => {
            console.error('Error fetching charger details:', error);
            showToast('error', 'Connection Error', 'Failed to fetch charger details. Please try again.');
        });
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
        case 'site visit done': return 'blue';
        case 'pending resolution approval': return 'orange';
        case 'resolved': return 'green';
        default: return '';
    }
}

// Helper function to get charger status class
function getChargerStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'active': return 'green';
        case 'inactive': return 'red';
        case 'maintenance': return 'yellow';
        default: return '';
    }
}

// Show Add New Charger Modal
function showAddChargerModal() {
    // Create a modal for adding a new charger
    let modal = document.createElement('div');
    modal.id = 'addDivisionChargerModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Commission New Charger</h2>
                <button class="modal-close" id="closeDivChargerModal">×</button>
            </div>
            <div class="modal-body">
                <form id="addDivisionChargerForm">
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerCPID">Charge Point ID (CPID)*</label>
                            <input type="text" id="divChargerCPID" name="divChargerCPID" placeholder="e.g., EVC-1234" required>
                            <p class="help-text">Must be unique. Format: EVC-XXXX or similar</p>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerSerialNumber">Serial Number*</label>
                            <input type="text" id="divChargerSerialNumber" name="divChargerSerialNumber" placeholder="e.g., SN12345678" required>
                            <p class="help-text">Must be unique. Manufacturer-provided</p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="divChargerLocation">Location*</label>
                        <input type="text" id="divChargerLocation" name="divChargerLocation" placeholder="e.g., Central Mall Parking" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerMake">Make*</label>
                            <input type="text" id="divChargerMake" name="divChargerMake" placeholder="e.g., ABB" required>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerModel">Model*</label>
                            <input type="text" id="divChargerModel" name="divChargerModel" placeholder="e.g., Terra AC" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerType">Charger Type*</label>
                            <select id="divChargerType" name="divChargerType" required>
                                <option value="">Select Type</option>
                                <option value="AC Type 2">AC Type 2</option>
                                <option value="DC CCS">DC CCS</option>
                                <option value="DC CHAdeMO">DC CHAdeMO</option>
                                <option value="AC+DC Combo">AC+DC Combo</option>
                            </select>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerStatus">Status*</label>
                            <select id="divChargerStatus" name="divChargerStatus" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Under Maintenance</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerCapacity">Capacity (kW)</label>
                            <input type="number" id="divChargerCapacity" name="divChargerCapacity" placeholder="e.g., 50">
                        </div>
                        <div class="form-group half">
                            <label for="divChargerCommissionDate">Commission Date*</label>
                            <input type="date" id="divChargerCommissionDate" name="divChargerCommissionDate" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="divChargerNotes">Notes (Optional)</label>
                        <textarea id="divChargerNotes" name="divChargerNotes" rows="3" placeholder="Additional information about this charger..."></textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelDivChargerBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Commission Charger</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Set today's date as default commission date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('divChargerCommissionDate').value = today;
    
    // Show modal
    document.getElementById('addDivisionChargerModal').classList.add('active');
    
    // Setup event listeners
    setupDivisionChargerModalListeners();
}

// Function to handle the form submission for adding a charger
function handleAddDivisionCharger(e) {
    e.preventDefault();
    
    // Get form data
    const chargerCPID = document.getElementById('divChargerCPID').value.trim();
    const serialNumber = document.getElementById('divChargerSerialNumber').value.trim();
    const location = document.getElementById('divChargerLocation').value.trim();
    const make = document.getElementById('divChargerMake').value.trim();
    const model = document.getElementById('divChargerModel').value.trim();
    const type = document.getElementById('divChargerType').value;
    const status = document.getElementById('divChargerStatus').value;
    const capacity = document.getElementById('divChargerCapacity').value;
    const commissionDate = document.getElementById('divChargerCommissionDate').value;
    const notes = document.getElementById('divChargerNotes').value.trim();
    
    // Disable form submission
    const submitButton = document.querySelector('#addDivisionChargerForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }
    
    // Prepare data for API request
    const requestData = {
        action: 'addCharger',
        cpid: chargerCPID,
        serialNumber: serialNumber,
        location: location,
        make: make,
        model: model,
        type: type,
        status: status,
        divisionId: currentDivision.id,
        capacity: capacity || null,
        commissionDate: commissionDate,
        notes: notes || null
    };
    
    // Make API request
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Commission Charger';
        }
        
        if (data.success) {
            // Close modal
            document.getElementById('addDivisionChargerModal').classList.remove('active');
            document.getElementById('addDivisionChargerModal').remove();
            
            // Show success message
            showToast('success', 'Charger Added', 'Charger has been successfully commissioned');
            
            // Refresh chargers list
            loadFilteredDivisionChargers(1);
            
            // Update dashboard stats
            updateDivisionDashboardStats();
        } else {
            showToast('error', 'Addition Failed', data.message || 'Failed to add charger. Please check the details and try again.');
        }
    })
    .catch(error => {
        console.error('Error adding charger:', error);
        
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Commission Charger';
        }
        
        showToast('error', 'Connection Error', 'Failed to connect to the server. Please try again.');
    });
}

// Function to set up charger modal listeners
function setupDivisionChargerModalListeners() {
    // Setup close and cancel buttons
    document.getElementById('closeDivChargerModal').addEventListener('click', () => {
        document.getElementById('addDivisionChargerModal').classList.remove('active');
        document.getElementById('addDivisionChargerModal').remove();
    });
    
    document.getElementById('cancelDivChargerBtn').addEventListener('click', () => {
        document.getElementById('addDivisionChargerModal').classList.remove('active');
        document.getElementById('addDivisionChargerModal').remove();
    });
    
    // Setup form submission
    document.getElementById('addDivisionChargerForm').addEventListener('submit', handleAddDivisionCharger);
}

// Function to handle bulk charger upload
function setupBulkChargerUpload() {
    // Add event listener to the bulk upload button
    const bulkUploadBtn = document.getElementById('bulkUploadChargersBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', showBulkUploadModal);
    }
}

// Function to show the bulk upload modal
function showBulkUploadModal() {
    // Create a modal for bulk upload
    let modal = document.createElement('div');
    modal.id = 'bulkUploadModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Bulk Upload Chargers</h2>
                <button class="modal-close" id="closeBulkUploadModal">×</button>
            </div>
            <div class="modal-body">
                <div class="bulk-upload-info">
                    <p>Upload multiple chargers at once using an Excel file. Please ensure your file follows the required format.</p>
                    <div class="template-download">
                        <button class="btn btn-sm btn-outline" id="downloadTemplateBtn">
                            <i class="fas fa-download"></i> Download Template
                        </button>
                        <span class="help-text">Download the Excel template for bulk upload</span>
                    </div>
                </div>
                
                <form id="bulkUploadForm" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="chargerExcelFile">Upload Excel File*</label>
                        <input type="file" id="chargerExcelFile" name="chargerExcelFile" accept=".xlsx, .xls" required>
                        <p class="help-text">Accepted formats: .xlsx, .xls</p>
                    </div>
                    
                    <div class="upload-preview">
                        <h3>File Preview</h3>
                        <div id="uploadPreviewContent" class="preview-content">
                            <p class="text-center text-muted">No file selected</p>
                        </div>
                    </div>
                    
                    <div class="validation-summary hidden" id="validationSummary">
                        <h3>Validation Results</h3>
                        <div id="validationContent"></div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelBulkUploadBtn">Cancel</button>
                        <button type="button" class="btn btn-primary" id="validateFileBtn">Validate File</button>
                        <button type="button" class="btn btn-success hidden" id="confirmUploadBtn">Confirm Upload</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Show modal
    document.getElementById('bulkUploadModal').classList.add('active');
    
    // Setup event listeners
    setupBulkUploadModalListeners();
}

// Function to setup bulk upload modal listeners
function setupBulkUploadModalListeners() {
    // Close modal buttons
    document.getElementById('closeBulkUploadModal').addEventListener('click', () => {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.getElementById('bulkUploadModal').remove();
    });
    
    document.getElementById('cancelBulkUploadBtn').addEventListener('click', () => {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.getElementById('bulkUploadModal').remove();
    });
    
    // Download template button
    document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
        // Request template download from API
        fetch(`${API_BASE_URL}/api/division.php?action=downloadChargerTemplate&divisionId=${currentDivision.id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Template download failed');
                }
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `charger_template_${currentDivision.name.replace(/\s+/g, '_')}.xlsx`;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
                showToast('success', 'Template Downloaded', 'Excel template has been downloaded successfully');
            })
            .catch(error => {
                console.error('Error downloading template:', error);
                showToast('error', 'Download Failed', 'Failed to download Excel template. Please try again.');
            });
    });
    
    // File input change
    document.getElementById('chargerExcelFile').addEventListener('change', handleFileSelection);
    
    // Validate button
    document.getElementById('validateFileBtn').addEventListener('click', validateExcelFile);
    
    // Confirm upload button
    document.getElementById('confirmUploadBtn').addEventListener('click', handleBulkUpload);
}

// Function to handle file selection for bulk upload
function handleFileSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Show loading state
    const previewDiv = document.getElementById('uploadPreviewContent');
    previewDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Reading file...</div>';
    
    // Create FormData
    const formData = new FormData();
    formData.append('action', 'previewExcelFile');
    formData.append('divisionId', currentDivision.id);
    formData.append('file', file);
    
    // Send file to API for preview
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Display preview
            displayFilePreview(data.data);
            
            // Show validate button
            document.getElementById('validateFileBtn').classList.remove('hidden');
        } else {
            previewDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${data.message || 'Error reading file. Please make sure it\'s a valid Excel file.'}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error reading file:', error);
        previewDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error reading file. Please make sure it's a valid Excel file.</p>
            </div>
        `;
    });
}

// Function to display file preview
function displayFilePreview(data) {
    const previewDiv = document.getElementById('uploadPreviewContent');
    
    if (!data || data.rows === 0) {
        previewDiv.innerHTML = '<p class="text-center text-muted">No data found in file</p>';
        return;
    }
    
    let tableHTML = '<div class="table-responsive preview-table"><table class="data-table">';
    
    // Headers
    const headers = data.headers;
    tableHTML += '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Only show first 5 rows in preview
    const rowCount = Math.min(data.preview.length, 5);
    for (let i = 0; i < rowCount; i++) {
        tableHTML += '<tr>';
        const rowData = data.preview[i];
        
        // Make sure we don't exceed the number of headers
        for (let j = 0; j < headers.length; j++) {
            tableHTML += `<td>${rowData[j] || ''}</td>`;
        }
        
        tableHTML += '</tr>';
    }
    
    // Show ellipsis if there are more rows
    if (data.rows > 5) {
        tableHTML += '<tr><td colspan="' + headers.length + '" class="text-center">...</td></tr>';
    }
    
    tableHTML += '</tbody></table></div>';
    tableHTML += `<p class="text-center text-muted">Total: ${data.rows} chargers</p>`;
    
    previewDiv.innerHTML = tableHTML;
}

// Function to validate Excel file
function validateExcelFile() {
    const fileInput = document.getElementById('chargerExcelFile');
    if (!fileInput.files[0]) {
        showToast('error', 'No File Selected', 'Please select an Excel file to validate');
        return;
    }
    
    // Show loading state
    const validateButton = document.getElementById('validateFileBtn');
    validateButton.disabled = true;
    validateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
    
    // Create FormData
    const formData = new FormData();
    formData.append('action', 'validateExcelFile');
    formData.append('divisionId', currentDivision.id);
    formData.append('file', fileInput.files[0]);
    
    // Send file to API for validation
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        validateButton.disabled = false;
        validateButton.innerHTML = 'Validate File';
        
        // Display validation results
        const validationSummary = document.getElementById('validationSummary');
        const validationContent = document.getElementById('validationContent');
        
        validationSummary.classList.remove('hidden');
        
        if (data.success) {
            // Generate validation results HTML
            let validationHTML = '';
            
            // Success section
            validationHTML += `
                <div class="validation-section success">
                    <h4>Validation Successful</h4>
                    <p>All rows in the file have been validated successfully.</p>
                    <p>Total valid chargers: ${data.data.validRows}</p>
                </div>
            `;
            
            validationContent.innerHTML = validationHTML;
            
            // Show confirm button
            document.getElementById('confirmUploadBtn').classList.remove('hidden');
            
            // Show success message
            showToast('success', 'Validation Successful', `Found ${data.data.validRows} valid chargers ready for upload`);
        } else {
            // Generate validation results HTML with errors
            let validationHTML = '';
            
            if (data.data && data.data.headerIssues && data.data.headerIssues.length > 0) {
                validationHTML += `
                    <div class="validation-section error">
                        <h4>Header Issues</h4>
                        <ul>
                            ${data.data.headerIssues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (data.data && data.data.duplicateIssues && data.data.duplicateIssues.length > 0) {
                validationHTML += `
                    <div class="validation-section error">
                        <h4>Duplicate Issues</h4>
                        <ul>
                            ${data.data.duplicateIssues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (data.data && data.data.rowIssues && data.data.rowIssues.length > 0) {
                validationHTML += `
                    <div class="validation-section error">
                        <h4>Data Issues</h4>
                        <ul>
                            ${data.data.rowIssues.map(issue => `
                                <li>
                                    Row ${issue.row}: 
                                    <ul>
                                        ${issue.errors.map(error => `<li>${error}</li>`).join('')}
                                    </ul>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // Summary section
            validationHTML += `
                <div class="validation-section ${data.data && data.data.validRows > 0 ? 'warning' : 'error'}">
                    <h4>Summary</h4>
                    <p>Total rows in file: ${data.data ? data.data.totalRows : 0}</p>
                    <p>Valid chargers: ${data.data ? data.data.validRows : 0}</p>
                    <p>Rows with issues: ${data.data && data.data.rowIssues ? data.data.rowIssues.length : 0}</p>
                    <p>Duplicate entries: ${data.data && data.data.duplicateIssues ? data.data.duplicateIssues.length : 0}</p>
                </div>
            `;
            
            validationContent.innerHTML = validationHTML;
            
            // Show/hide confirm button based on validation
            const confirmBtn = document.getElementById('confirmUploadBtn');
            
            if (data.data && data.data.validRows > 0) {
                confirmBtn.classList.remove('hidden');
                // Show warning message
                showToast('warning', 'Validation Complete', `Found ${data.data.validRows} valid chargers with some issues`);
            } else {
                confirmBtn.classList.add('hidden');
                // Show error message
                showToast('error', 'Validation Failed', data.message || 'No valid chargers found in file');
            }
        }
    })
    .catch(error => {
        console.error('Error validating file:', error);
        
        // Reset button
        validateButton.disabled = false;
        validateButton.innerHTML = 'Validate File';
        
        // Show error message
        showToast('error', 'Validation Error', 'An error occurred during validation. Please try again.');
    });
}

// Function to handle bulk upload
function handleBulkUpload() {
    const fileInput = document.getElementById('chargerExcelFile');
    if (!fileInput.files[0]) {
        showToast('error', 'No File Selected', 'Please select an Excel file to upload');
        return;
    }
    
    // Show loading state
    const confirmButton = document.getElementById('confirmUploadBtn');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // Create FormData
    const formData = new FormData();
    formData.append('action', 'uploadChargers');
    formData.append('divisionId', currentDivision.id);
    formData.append('file', fileInput.files[0]);
    
    // Send file to API for processing
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Confirm Upload';
        
        if (data.success) {
            // Close modal
            document.getElementById('bulkUploadModal').classList.remove('active');
            document.getElementById('bulkUploadModal').remove();
            
            // Show success message
            showToast('success', 'Upload Successful', `${data.data.uploadedCount} chargers have been added to the system`);
            
            // Refresh chargers list
            loadFilteredDivisionChargers(1);
            
            // Update dashboard stats
            updateDivisionDashboardStats();
        } else {
            showToast('error', 'Upload Failed', data.message || 'Failed to upload chargers. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error uploading chargers:', error);
        
        // Reset button
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Confirm Upload';
        
        // Show error message
        showToast('error', 'Upload Error', 'An error occurred during upload. Please try again.');
    });
}

// Add CSS styles for the bulk upload modal
function addBulkUploadStyles() {
    if (document.getElementById('bulk-upload-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'bulk-upload-styles';
    styles.textContent = `
        .bulk-upload-info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        
        .template-download {
            margin-top: 10px;
            display: flex;
            align-items: center;
        }
        
        .template-download .help-text {
            margin-left: 10px;
            color: #666;
        }
        
        .preview-content {
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
        }
        
        .preview-table {
            width: 100%;
            overflow-x: auto;
        }
        
        .validation-summary {
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .validation-section {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        
        .validation-section.error {
            background-color: rgba(244, 67, 54, 0.1);
            border-left: 3px solid #F44336;
        }
        
        .validation-section.warning {
            background-color: rgba(255, 193, 7, 0.1);
            border-left: 3px solid #FFC107;
        }
        
        .validation-section.success {
            background-color: rgba(76, 175, 80, 0.1);
            border-left: 3px solid #4CAF50;
        }
        
        .validation-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .validation-section ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .error-message {
            color: #F44336;
            text-align: center;
            padding: 20px;
        }
        
        .error-message i {
            font-size: 24px;
            margin-bottom: 10px;
        }
    `;
    
    document.head.appendChild(styles);
}

// Function to refresh current view based on what's visible
function refreshCurrentView() {
    // Check which section is currently visible
    const dashboardSection = document.getElementById('divisionHomeSection');
    const complaintsSection = document.getElementById('divisionComplaintsSection');
    const chargersSection = document.getElementById('divisionChargersSection');
    
    if (dashboardSection && !dashboardSection.classList.contains('hidden')) {
        // Dashboard is visible
        loadDashboardData();
    } else if (complaintsSection && !complaintsSection.classList.contains('hidden')) {
        // Complaints section is visible
        loadFilteredDivisionComplaints(complaintsPagination.currentPage);
    } else if (chargersSection && !chargersSection.classList.contains('hidden')) {
        // Chargers section is visible
        loadFilteredDivisionChargers(chargersPagination.currentPage);
    }
}

// Function to initialize SLA timers
function initializeSLATimers() {
    const timers = document.querySelectorAll('.sla-timer');
    
    timers.forEach(timer => {
        const deadline = new Date(timer.dataset.deadline);
        const timerId = timer.dataset.id;
        
        // Clear any existing interval for this timer
        if (window.slaTimers && window.slaTimers[timerId]) {
            clearInterval(window.slaTimers[timerId]);
        }
        
        // Initialize slaTimers object if it doesn't exist
        if (!window.slaTimers) {
            window.slaTimers = {};
        }
        
        // Initial update
        updateTimer(timer, deadline);
        
        // Set interval to update every second
        window.slaTimers[timerId] = setInterval(() => {
            updateTimer(timer, deadline);
        }, 1000);
    });
}

// Function to update a timer element
function updateTimer(timerElement, deadline) {
    const now = new Date();
    const timeDifference = deadline - now;
    
    // Format the time
    const formattedTime = formatTimeDifference(Math.abs(timeDifference));
    
    // Update timer text and class
    if (timeDifference > 0) {
        timerElement.textContent = formattedTime + ' remaining';
        timerElement.classList.remove('overdue');
        timerElement.classList.add('on-time');
    } else {
        timerElement.textContent = formattedTime + ' overdue';
        timerElement.classList.remove('on-time');
        timerElement.classList.add('overdue');
    }
}

// Format time difference in days, hours, minutes, seconds
function formatTimeDifference(timeDifference) {
    // Calculate time components
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    
    // Format time string
    let timeString = '';
    
    if (days > 0) {
        timeString += `${days}d `;
    }
    
    timeString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return timeString;
}

// Helper function to get SLA priority class for styling
function getSLAPriorityClass(priority) {
    if (!priority) return '';
    
    switch(priority.toLowerCase()) {
        case 'critical': return 'red';
        case 'high': return 'orange';
        case 'medium': return 'yellow';
        case 'low': return 'green';
        default: return '';
    }
}

// Add SLA CSS styles
function addSLAStyles() {
    if (document.getElementById('sla-styles')) return;
    
    const slaStyles = document.createElement('style');
    slaStyles.id = 'sla-styles';
    slaStyles.textContent = `
        .sla-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
            margin-left: 5px;
        }
        
        .sla-badge.red {
            background-color: #F44336;
        }
        
        .sla-badge.orange {
            background-color: #FF9800;
        }
        
        .sla-badge.yellow {
            background-color: #FFC107;
        }
        
        .sla-badge.green {
            background-color: #4CAF50;
        }
        
        .sla-timer {
            font-size: 0.8em;
            font-family: monospace;
            margin-top: 3px;
            padding: 2px 4px;
            border-radius: 2px;
            display: inline-block;
        }
        
        .sla-timer.on-time {
            color: #4CAF50;
            background-color: rgba(76, 175, 80, 0.1);
        }
        
        .sla-timer.overdue {
            color: #F44336;
            font-weight: bold;
            background-color: rgba(244, 67, 54, 0.1);
        }
        
        .detail-timer {
            font-size: 1em;
            padding: 4px 8px;
        }
        
        tr.sla-overdue {
            background-color: rgba(244, 67, 54, 0.1);
        }
    `;
    document.head.appendChild(slaStyles);
}

// Add extra CSS styles for admin and division
function addExtraSLAStyles() {
    if (document.getElementById('extra-sla-styles')) return;
    
    const extraStyles = document.createElement('style');
    extraStyles.id = 'extra-sla-styles';
    extraStyles.textContent = `
        .muted-text {
            color: #777;
            font-style: italic;
        }
        
        .sla-info-section {
            margin-top: 20px;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
    `;
    document.head.appendChild(extraStyles);
}

// Initialize SLA display when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add required styles
    addSLAStyles();
    addExtraSLAStyles();
    addBulkUploadStyles();
    
    // Set up mutation observer to monitor table changes
    const tableObserver = new MutationObserver(function(mutations) {
        // Initialize SLA timers after table content changes
        initializeSLATimers();
    });
    
    // Tables to observe
    const tables = [
        document.querySelector('#divComplaintsTable tbody'),
        document.querySelector('#divisionComplaintsTable tbody')
    ];
    
    // Start observing each table
    tables.forEach(table => {
        if (table) {
            tableObserver.observe(table, { childList: true });
        }
    });
    
    // Initial SLA timer initialization
    initializeSLATimers();
});
