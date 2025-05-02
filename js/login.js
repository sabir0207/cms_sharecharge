// EV Charging Complaint Management System - Login JavaScript
(function() {
    // Force reload if cached
    const appVersion = '1.0.1';
    if (localStorage.getItem('appVersion') !== appVersion) {
        localStorage.setItem('appVersion', appVersion);
        window.location.reload(true);
    }
})();

// DOM References
document.addEventListener('DOMContentLoaded', () => {
    // Initialize authentication system
    initializeAuth();
    
    // Setup login and tracking functionality
    setupLoginSystem();
    
    // Setup toast notification system
    setupToastSystem();
});

// Authentication Management
function initializeAuth() {
    // Check if user is already logged in
    checkAuthStatus();
}

function login(username, password, role) {
    // Create form data for API request
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('role', role);
    
    // Show loading notification
    showToast('info', 'Please Wait', 'Authenticating...');
    
    // Send login request to API
    fetch('api/login.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store user data in session storage
            sessionStorage.setItem('currentUser', JSON.stringify({
                ...data.user,
                loginTime: new Date().toISOString()
            }));
            
            // Show success message
            showToast('success', 'Login Successful', `Welcome to ${data.user.name || role} Dashboard`);
            
            // Redirect based on user role
            setTimeout(() => {
                switch(role) {
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    case 'division':
                        // Store division info in session storage
                        sessionStorage.setItem('currentDivision', JSON.stringify({
                            id: data.user.division_id,
                            name: data.user.name,
                            role: 'division'
                        }));
                        window.location.href = 'division.html';
                        break;
                    case 'vendor':
                        window.location.href = 'vendor.html';
                        break;
                }
            }, 1000);
        } else {
            // Show error message
            showToast('error', 'Login Failed', data.message || 'Invalid credentials');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showToast('error', 'Login Failed', 'A server error occurred. Please try again later.');
    });
    
    return null;
}

function logout() {
    // Clear session storage
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentDivision');
    
    // Redirect to login page
    window.location.href = 'index.html';
}

// Login System Setup
function setupLoginSystem() {
    const loginForm = document.getElementById('userLoginForm');
    const trackingForm = document.getElementById('trackComplaintForm');
    const loginTab = document.getElementById('loginTab');
    const trackingTab = document.getElementById('trackingTab');

    // Tab Switching
    if (loginTab && trackingTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            trackingTab.classList.remove('active');
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('trackingForm').classList.add('hidden');
        });

        trackingTab.addEventListener('click', () => {
            trackingTab.classList.add('active');
            loginTab.classList.remove('active');
            document.getElementById('trackingForm').classList.remove('hidden');
            document.getElementById('loginForm').classList.add('hidden');
        });
    }

    // Login Form Handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.getElementById('userType').value;

            login(username, password, userType);
        });
    }

    // Tracking Form Handler
    if (trackingForm) {
        trackingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('trackingId').value.trim();
            if (!phoneNumber) {
                showToast('error', 'Invalid Input', 'Please enter your phone number');
                return;
            }
            
            // Track complaints by phone number
            trackComplaintsByPhone(phoneNumber);
        });
    }
}

// Complaint Tracking Functions
function trackComplaintsByPhone(phoneNumber) {
    // Show loading notification
    showToast('info', 'Please Wait', 'Searching for your complaints...');
    
    // Create form data for API request
    const formData = new FormData();
    formData.append('phone', phoneNumber);
    
    // Send tracking request to API
    fetch('api/consumer.php?action=trackComplaints', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.complaints.length > 0) {
            const trackingResultSection = document.getElementById('trackingResultSection');
            const trackingResult = document.getElementById('trackingResult');

            if (trackingResultSection && trackingResult) {
                trackingResultSection.classList.remove('hidden');

                // Generate header
                let resultHTML = `
                    <div class="tracking-header">
                        <h3>Your Complaints (${data.complaints.length})</h3>
                        <p class="text-gray">Showing your ${data.complaints.length} most recent complaints</p>
                    </div>
                `;
                
                // Generate complaint cards
                resultHTML += '<div class="complaint-cards">';
                
                data.complaints.forEach(complaint => {
                    resultHTML += `
                        <div class="complaint-card">
                            <div class="complaint-card-header">
                                <div class="complaint-info">
                                    <div class="complaint-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                                    <div class="complaint-status">
                                        <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span>
                                    </div>
                                </div>
                                <div class="complaint-date">${new Date(complaint.created_at).toLocaleDateString()}</div>
                            </div>
                            <div class="complaint-card-content">
                                <div class="detail-row">
                                    <div class="detail-label">Charger ID:</div>
                                    <div class="detail-value">${complaint.charger_id}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Location:</div>
                                    <div class="detail-value">${complaint.location || 'Not specified'}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Type:</div>
                                    <div class="detail-value">${complaint.type}${complaint.sub_type ? ' - ' + complaint.sub_type : ''}</div>
                                </div>
                            </div>
                            <div class="complaint-card-footer">
                                <button class="btn btn-sm btn-outline view-simple-timeline-btn" data-id="${complaint.tracking_id}">
                                    View Status <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                resultHTML += '</div>';
                
                trackingResult.innerHTML = resultHTML;
                trackingResultSection.scrollIntoView({ behavior: 'smooth' });
                
                // Add event listeners to timeline buttons
                const timelineButtons = document.querySelectorAll('.view-simple-timeline-btn');
                timelineButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showSimpleComplaintTimeline(trackingId);
                    });
                });
            }
        } else {
            showToast('error', 'No Complaints Found', 'We could not find any complaints associated with this phone number');
        }
    })
    .catch(error => {
        console.error('Tracking error:', error);
        showToast('error', 'Tracking Failed', 'A server error occurred. Please try again later.');
    });
}

// Show Simple Timeline for Consumers
function showSimpleComplaintTimeline(trackingId) {
    // Create form data for API request
    const formData = new FormData();
    formData.append('tracking_id', trackingId);
    
    // Fetch complaint timeline from API
    fetch('api/consumer.php?action=getTimeline', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            showToast('error', 'Timeline Error', data.message || 'Failed to load timeline');
            return;
        }
        
        const complaint = data.complaint;
        const timeline = data.timeline;
        
        // Get modal element
        let timelineModal = document.getElementById('complaintTimelineModal');
        
        // Create a simplified timeline with key status changes
        let timelineHTML = `
            <div class="tracking-header">
                <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
            </div>
            
            <div class="consumer-tracking-timeline">
        `;
        
        // Add timeline events with better icons and colors
        timeline.forEach((event, index) => {
            // Determine appropriate status class and icon
            let statusClass = '';
            let iconClass = '';
            
            if (event.status.toLowerCase().includes('resolved') || 
                event.status.toLowerCase().includes('resolution')) {
                statusClass = 'green';
                iconClass = 'fa-check-circle';
            } else if (event.status.toLowerCase().includes('assigned')) {
                statusClass = 'blue';
                iconClass = 'fa-user-plus';
            } else if (event.status.toLowerCase().includes('visit')) {
                statusClass = 'yellow';
                iconClass = 'fa-tools';
            } else if (event.status.toLowerCase().includes('submitted')) {
                statusClass = 'blue';
                iconClass = 'fa-file-alt';
            } else if (event.status.toLowerCase().includes('in progress')) {
                statusClass = 'yellow';
                iconClass = 'fa-spinner';
            } else {
                statusClass = 'blue';
                iconClass = 'fa-info-circle';
            }
            
            // Add completed class for past events
            const completedClass = index < timeline.length - 1 ? 'completed' : '';
            
            timelineHTML += `
                <div class="consumer-timeline-item ${completedClass}">
                    <div class="consumer-timeline-icon ${statusClass}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="consumer-timeline-content">
                        <div class="consumer-timeline-title">${event.status}</div>
                        <div class="consumer-timeline-date">${new Date(event.created_at).toLocaleString()}</div>
                        <div class="consumer-timeline-description">${event.description}</div>
                    </div>
                </div>
            `;
        });
        
        timelineHTML += `</div>`;
        
        // Update modal content
        const modalBody = timelineModal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = timelineHTML;
            
            // Add additional styles for consumer timeline if not already present
            if (!document.getElementById('consumer-timeline-styles')) {
                const consumerTimelineStyles = document.createElement('style');
                consumerTimelineStyles.id = 'consumer-timeline-styles';
                consumerTimelineStyles.textContent = `
                    .consumer-tracking-timeline {
                        position: relative;
                        margin: 20px 0;
                        padding: 0;
                    }
                    
                    .consumer-tracking-timeline:before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 20px;
                        height: 100%;
                        width: 4px;
                        background: #e0e0e0;
                    }
                    
                    .consumer-timeline-item {
                        position: relative;
                        margin-bottom: 30px;
                        padding-left: 50px;
                    }
                    
                    .consumer-timeline-item.completed .consumer-timeline-icon:after {
                        content: '';
                        position: absolute;
                        top: 40px;
                        left: 20px;
                        height: calc(100% + 30px);
                        width: 4px;
                        background: #4CAF50;
                    }
                    
                    .consumer-timeline-icon {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        text-align: center;
                        line-height: 40px;
                        background: white;
                        border: 4px solid #ccc;
                        z-index: 1;
                    }
                    
                    .consumer-timeline-icon.blue {
                        border-color: #2196F3;
                    }
                    
                    .consumer-timeline-icon.green {
                        border-color: #4CAF50;
                    }
                    
                    .consumer-timeline-icon.yellow {
                        border-color: #FFC107;
                    }
                    
                    .consumer-timeline-icon.red {
                        border-color: #F44336;
                    }
                    
                    .consumer-timeline-icon i {
                        font-size: 20px;
                        color: #555;
                    }
                    
                    .consumer-timeline-content {
                        background: #f9f9f9;
                        padding: 15px;
                        border-radius: 5px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    
                    .consumer-timeline-title {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    
                    .consumer-timeline-date {
                        color: #777;
                        font-size: 12px;
                        margin-bottom: 10px;
                    }
                    
                    .consumer-timeline-description {
                        color: #333;
                    }
                `;
                document.head.appendChild(consumerTimelineStyles);
            }
        }
        
        // Show modal
        timelineModal.classList.add('active');
        
        // Add event listeners to close buttons
        document.getElementById('closeTimelineModal').addEventListener('click', () => {
            timelineModal.classList.remove('active');
        });
        document.getElementById('closeTimelineBtn').addEventListener('click', () => {
            timelineModal.classList.remove('active');
        });
    })
    .catch(error => {
        console.error('Timeline error:', error);
        showToast('error', 'Timeline Failed', 'A server error occurred. Please try again later.');
    });
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return '';
    
    status = status.toLowerCase();
    
    switch(status) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
        case 'site visit done': return 'blue';
        case 'pending resolution approval': return 'orange';
        case 'resolved': return 'green';
        default: return '';
    }
}

// Toast Notification System
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

// Check if user is already logged in
function checkAuthStatus() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Redirect to appropriate dashboard
        switch(currentUser.role) {
            case 'admin':
                window.location.href = 'admin.html';
                break;
            case 'division':
                window.location.href = 'division.html';
                break;
            case 'vendor':
                window.location.href = 'vendor.html';
                break;
        }
    }
}
