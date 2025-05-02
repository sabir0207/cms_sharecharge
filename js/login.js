// EV Charging Complaint Management System - Login JavaScript
// Add this to the top of each JS file
(function() {
    // Force reload if cached
    if (localStorage.getItem('appVersion') !== '1.0.1') {
        localStorage.setItem('appVersion', '1.0.1');
        window.location.reload(true);
    }
})();
// Constants
const APP_CONFIG = {
    version: '1.0.0',
    defaultCredentials: {
        admin: { username: 'admin', password: 'admin123' }
    }
};

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
    // Initialize default users in localStorage if not exists
    if (!localStorage.getItem('systemUsers')) {
        const defaultUsers = {
            admin: [{ 
                username: 'admin', 
                password: 'admin123', 
                role: 'admin',
                name: 'Administrator'
            }],
            divisions: [],
            vendors: []
        };
        localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
    }
    
    // Initialize empty arrays for entities if they don't exist
    if (!localStorage.getItem('divisions')) {
        localStorage.setItem('divisions', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('vendors')) {
        localStorage.setItem('vendors', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('chargers')) {
        localStorage.setItem('chargers', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('complaints')) {
        localStorage.setItem('complaints', JSON.stringify([]));
    }
}

function login(username, password, role) {
    const systemUsers = JSON.parse(localStorage.getItem('systemUsers'));
    const userGroup = role === 'admin' ? systemUsers.admin : systemUsers[role + 's'] || [];
    
    const user = userGroup.find(u => 
        u.username === username && u.password === password
    );

    if (user) {
        // Store current user in session storage
        sessionStorage.setItem('currentUser', JSON.stringify({
            ...user,
            loginTime: new Date().toISOString()
        }));
        return user;
    }
    return null;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentDivision');
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

            const user = login(username, password, userType);

            if (user) {
                showToast('success', 'Login Successful', `Welcome to ${user.name || userType} Dashboard`);
                
                // Redirect based on user role
                setTimeout(() => {
                    switch(userType) {
                        case 'admin':
                            window.location.href = 'admin.html';
                            break;
                        case 'division':
                            // Store division info in session storage
                            sessionStorage.setItem('currentDivision', JSON.stringify({
                                name: user.name,
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
                showToast('error', 'Login Failed', 'Invalid credentials');
            }
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
    // Retrieve complaints from localStorage
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Find complaints matching the phone number
    const userComplaints = complaints.filter(c => 
        c.consumerPhone && c.consumerPhone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
    );

    if (userComplaints.length > 0) {
        // Sort by date (most recent first)
        userComplaints.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        
        // Take up to 5 most recent complaints
        const recentComplaints = userComplaints.slice(0, 5);
        
        const trackingResultSection = document.getElementById('trackingResultSection');
        const trackingResult = document.getElementById('trackingResult');

        if (trackingResultSection && trackingResult) {
            trackingResultSection.classList.remove('hidden');

            // Generate header
            let resultHTML = `
                <div class="tracking-header">
                    <h3>Your Complaints (${recentComplaints.length})</h3>
                    <p class="text-gray">Showing your ${recentComplaints.length} most recent complaints</p>
                </div>
            `;
            
            // Generate complaint cards
            resultHTML += '<div class="complaint-cards">';
            
            recentComplaints.forEach(complaint => {
                resultHTML += `
                    <div class="complaint-card">
                        <div class="complaint-card-header">
                            <div class="complaint-info">
                                <div class="complaint-id">Tracking ID: <span class="highlight-text">${complaint.trackingId}</span></div>
                                <div class="complaint-status">
                                    <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span>
                                </div>
                            </div>
                            <div class="complaint-date">${new Date(complaint.createdDate).toLocaleDateString()}</div>
                        </div>
                        <div class="complaint-card-content">
                            <div class="detail-row">
                                <div class="detail-label">Charger ID:</div>
                                <div class="detail-value">${complaint.chargerID}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Location:</div>
                                <div class="detail-value">${complaint.location || 'Not specified'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Type:</div>
                                <div class="detail-value">${complaint.type}${complaint.subType ? ' - ' + complaint.subType : ''}</div>
                            </div>
                        </div>
                        <div class="complaint-card-footer">
                            <button class="btn btn-sm btn-outline view-simple-timeline-btn" data-id="${complaint.trackingId}">
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
                btn.addEventListener('click', (e) => {
                    const trackingId = btn.getAttribute('data-id');
                    showSimpleComplaintTimeline(trackingId);
                });
            });
        }
    } else {
        showToast('error', 'No Complaints Found', 'We could not find any complaints associated with this phone number');
    }
}

// Show Simple Timeline for Consumers
// Improve the simplified timeline for consumers
function showSimpleComplaintTimeline(trackingId) {
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaint = complaints.find(c => c.trackingId === trackingId);
    
    if (!complaint) return;
    
    // Get modal element
    let timelineModal = document.getElementById('complaintTimelineModal');
    
    // Create a simplified timeline with key status changes
    const statusTimeline = [];
    
    // Always show submission as first event
    statusTimeline.push({
        status: 'Complaint Submitted',
        timestamp: complaint.createdDate,
        description: 'Your complaint has been registered in our system.'
    });
    
    // If the complaint has been assigned to a vendor, show that
    if (complaint.assignedTo) {
        // Find the assignment event in the timeline
        const assignmentEvent = complaint.timeline && complaint.timeline.find(t => 
            t.status.toLowerCase().includes('assigned to vendor')
        );
        
        if (assignmentEvent) {
            statusTimeline.push({
                status: 'Assigned to Vendor',
                timestamp: assignmentEvent.timestamp,
                description: `Your complaint has been assigned to a service vendor for resolution.`
            });
        } else {
            // If no specific event found but we know it's assigned, create a generic one
            statusTimeline.push({
                status: 'Assigned to Vendor',
                timestamp: complaint.lastUpdated || complaint.createdDate,
                description: `Your complaint has been assigned to a service vendor for resolution.`
            });
        }
    }
    
    // If there's a Site Visit Done event, show it
    const siteVisitEvent = complaint.timeline && complaint.timeline.find(t => 
        t.status.toLowerCase().includes('site visit done')
    );
    
    if (siteVisitEvent) {
        statusTimeline.push({
            status: 'Site Visit Completed',
            timestamp: siteVisitEvent.timestamp,
            description: 'A technician has visited the site to assess the issue.'
        });
    }
    
    // Show current status if different from initial submission
    if (complaint.status.toLowerCase() !== 'open') {
        const currentStatus = complaint.status;
        
        // For 'Pending Resolution Approval', show a more consumer-friendly message
        if (currentStatus.toLowerCase() === 'pending resolution approval') {
            // Find timestamp of the pending resolution event
            const pendingEvent = complaint.timeline && complaint.timeline.find(t => 
                t.status.toLowerCase().includes('pending resolution')
            );
            
            statusTimeline.push({
                status: 'Resolution in Review',
                timestamp: pendingEvent ? pendingEvent.timestamp : complaint.lastUpdated,
                description: 'The vendor has completed the work and the resolution is being verified.'
            });
        }
        // For 'Resolved', show the resolution event
        else if (currentStatus.toLowerCase() === 'resolved') {
            // Find the resolution event
            const resolvedEvent = complaint.timeline && complaint.timeline.find(t => 
                t.status.toLowerCase() === 'resolved'
            );
            
            statusTimeline.push({
                status: 'Complaint Resolved',
                timestamp: resolvedEvent ? resolvedEvent.timestamp : complaint.lastUpdated,
                description: 'Your complaint has been successfully resolved. Thank you for your patience.'
            });
        }
        // For any other status, show it with a generic description
        else if (currentStatus.toLowerCase() !== 'complaint submitted') {
            // Find the latest status event
            const statusEntries = complaint.timeline && complaint.timeline.filter(t => 
                t.status.toLowerCase().includes(currentStatus.toLowerCase())
            );
            
            if (statusEntries && statusEntries.length > 0) {
                const latestEntry = statusEntries[statusEntries.length - 1];
                statusTimeline.push({
                    status: currentStatus,
                    timestamp: latestEntry.timestamp,
                    description: latestEntry.description || `Your complaint status has been updated to ${currentStatus}.`
                });
            } else {
                statusTimeline.push({
                    status: currentStatus,
                    timestamp: complaint.lastUpdated || complaint.createdDate,
                    description: `Your complaint status has been updated to ${currentStatus}.`
                });
            }
        }
    }
    
    // Generate timeline HTML with improved styling
    let timelineHTML = `
        <div class="tracking-header">
            <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.trackingId}</span></div>
            <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
        </div>
        
        <div class="consumer-tracking-timeline">
    `;
    
    // Add status events with better icons and colors
    statusTimeline.forEach((event, index) => {
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
        const completedClass = index < statusTimeline.length - 1 ? 'completed' : '';
        
        timelineHTML += `
            <div class="consumer-timeline-item ${completedClass}">
                <div class="consumer-timeline-icon ${statusClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="consumer-timeline-content">
                    <div class="consumer-timeline-title">${event.status}</div>
                    <div class="consumer-timeline-date">${new Date(event.timestamp).toLocaleString()}</div>
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
}


// Replace the original function with our improved version
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to make sure the original function is defined
    setTimeout(function() {
        // Save reference to original function if needed
        window.originalShowSimpleComplaintTimeline = window.showSimpleComplaintTimeline;
        // Replace with our improved version
        window.showSimpleComplaintTimeline = showSimpleComplaintTimeline;
    }, 1000);
});


// Helper function to get status class
function getStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
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

// Check authentication status when page loads
checkAuthStatus();