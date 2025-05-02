// EV Charging Complaint Management System - Consumer Page JavaScript
// Add this to the top of each JS file
(function() {
    // Force reload if cached
    if (localStorage.getItem('appVersion') !== '1.0.1') {
        localStorage.setItem('appVersion', '1.0.1');
        window.location.reload(true);
    }
})();
// Global variables
let qrScannerInstance = null;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup tab switching
    setupTabs();
    
    // Setup QR scanner
    setupQRScanner();
    
    // Setup complaint form
    setupComplaintForm();
    
    // Setup toast notification system
    setupToastSystem();
    
    // Setup charger ID lookup
    setupChargerLookup();
    
    // Setup confirmation modal
    setupConfirmationModal();
});

// Function to extract just the CPID part from a full charger ID
// This removes the IN*ADN* prefix if present

// Function to extract just the CPID part from a full charger ID
function extractCPID(fullChargerId) {
    if (!fullChargerId) return '';
    
    // Convert to uppercase for consistent handling
    const upperCaseId = fullChargerId.toUpperCase();
    
    // Check if the ID follows the IN*ADN* format with asterisks
    if (upperCaseId.includes('IN*ADN*')) {
        return upperCaseId.split('IN*ADN*')[1];
    }
    
    // Check if the ID follows the IN-ADN- format with hyphens
    if (upperCaseId.includes('IN-ADN-')) {
        return upperCaseId.split('IN-ADN-')[1];
    }
    
    // Otherwise, assume it's already just the CPID
    return upperCaseId;
}


// Setup Tab Switching
function setupTabs() {
    const manualEntryTab = document.getElementById('manualEntryTab');
    const scanQrTab = document.getElementById('scanQrTab');
    const qrScannerSection = document.getElementById('qrScannerSection');
    const complaintFormSection = document.getElementById('complaintFormSection');
    
    if (manualEntryTab && scanQrTab) {
        manualEntryTab.addEventListener('click', () => {
            // Stop QR scanner if running
            stopQRScanner();
            
            // Switch tabs
            manualEntryTab.classList.add('active');
            scanQrTab.classList.remove('active');
            
            // Show/hide sections
            qrScannerSection.classList.add('hidden');
            complaintFormSection.classList.remove('hidden');
        });
        
        scanQrTab.addEventListener('click', () => {
            // Switch tabs
            scanQrTab.classList.add('active');
            manualEntryTab.classList.remove('active');
            
            // Show/hide sections
            complaintFormSection.classList.add('hidden');
            qrScannerSection.classList.remove('hidden');
            
            // Start QR scanner
            startQRScanner();
        });
    }
    
    // Cancel scan button
    const cancelScanBtn = document.getElementById('cancelScanBtn');
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', () => {
            // Stop scanner and switch to manual entry
            stopQRScanner();
            manualEntryTab.click();
        });
    }
}

// Setup QR Scanner
function setupQRScanner() {
    // Nothing to do here - scanner is started when tab is clicked
}

// Start QR Scanner
function startQRScanner() {
    const videoElem = document.getElementById('qrVideo');
    if (!videoElem) return;
    
    // Check if QR scanner library is available
    if (typeof jsQR === 'undefined') {
        showToast('error', 'QR Scanner Error', 'QR scanner library not loaded. Please use manual entry.');
        return;
    }
    
    // Get user media
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(stream => {
        videoElem.srcObject = stream;
        videoElem.setAttribute('playsinline', true); // Required for iPhone
        videoElem.play();
        qrScannerInstance = requestAnimationFrame(scanQRCode);
    })
    .catch(err => {
        console.error('Error accessing camera:', err);
        showToast('error', 'Camera Error', 'Could not access your camera. Please check permissions or use manual entry.');
        
        // Revert to manual entry
        const manualEntryTab = document.getElementById('manualEntryTab');
        if (manualEntryTab) {
            manualEntryTab.click();
        }
    });
}

// Check if Charger ID is valid - accepts all formats
function isValidChargerID(id) {
    if (!id) return false;
    
    // Convert to uppercase for consistent handling
    const upperCaseId = id.toUpperCase();
    
    // Check for various formats
    // 1. Full format with IN*ADN* prefix and asterisks
    const fullIdPattern1 = /^IN\*ADN\*[A-Z0-9]+(-?[A-Z0-9]+)?$/;
    
    // 2. Full format with IN-ADN- prefix and hyphens
    const fullIdPattern2 = /^IN-ADN-[A-Z0-9]+(-?[A-Z0-9]+)?$/;
    
    // 3. Just the CPID part - various manufacturer formats
    const cpidPattern = /^[A-Z0-9]+(-?[A-Z0-9]+)?$/;
    
    return fullIdPattern1.test(upperCaseId) || 
           fullIdPattern2.test(upperCaseId) || 
           cpidPattern.test(upperCaseId);
}
// Scan QR Code - extracts CPID when scanning QR
// Scan QR Code - properly handling all formats
function scanQRCode() {
    const videoElem = document.getElementById('qrVideo');
    if (!videoElem || !videoElem.videoWidth) {
        qrScannerInstance = requestAnimationFrame(scanQRCode);
        return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoElem.videoWidth;
    canvas.height = videoElem.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Scan for QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
    });
    
    if (code) {
        // QR code detected
        console.log('QR Code detected:', code.data);
        
        // Check if it's a valid charger ID format
        if (isValidChargerID(code.data)) {
            stopQRScanner();
            
            // Switch to form tab
            const manualEntryTab = document.getElementById('manualEntryTab');
            if (manualEntryTab) {
                manualEntryTab.click();
            }
            
            // Extract just the CPID part and set it in the input
            const stationIdInput = document.getElementById('stationId');
            if (stationIdInput) {
                const cpid = extractCPID(code.data);
                stationIdInput.value = cpid;
                
                // Fetch charger details with CPID
                fetchChargerDetails(cpid);
            }
            
            // Show notification with just the CPID
            showToast('success', 'QR Code Detected', `Charger ID: ${extractCPID(code.data)}`);
        } else {
            // Continue scanning if not a valid charger ID
            qrScannerInstance = requestAnimationFrame(scanQRCode);
        }
    } else {
        // No QR code found, continue scanning
        qrScannerInstance = requestAnimationFrame(scanQRCode);
    }
}
// Stop QR Scanner
function stopQRScanner() {
    if (qrScannerInstance) {
        cancelAnimationFrame(qrScannerInstance);
        qrScannerInstance = null;
    }
    
    const videoElem = document.getElementById('qrVideo');
    if (videoElem && videoElem.srcObject) {
        const tracks = videoElem.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElem.srcObject = null;
    }
}

// Find matching charger in our database (case insensitive)
function findCharger(cpid) {
    if (!cpid) return null;
    
    // Get chargers from storage
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Extract just the CPID part in case the full ID was passed
    const pureCpid = extractCPID(cpid);
    
    // Convert to uppercase for case-insensitive comparison
    const upperCaseCPID = pureCpid.toUpperCase();
    
    // Find charger with case-insensitive matching on just the CPID part
    return chargers.find(c => extractCPID(c.id).toUpperCase() === upperCaseCPID);
}

// Setup Complaint Form
function setupComplaintForm() {
    const complaintForm = document.getElementById('consumerComplaintForm');
    
    if (complaintForm) {
        // Set up issue type change event
        const complaintTypeSelect = document.getElementById('complaintType');
        const subIssueContainer = document.getElementById('subIssueContainer');
        const subIssueSelect = document.getElementById('subIssueType');
        const subIssueHint = document.getElementById('subIssueHint');
        
        if (complaintTypeSelect && subIssueContainer) {
            complaintTypeSelect.addEventListener('change', () => {
                const selectedType = complaintTypeSelect.value;
                if (selectedType) {
                    // Reset sub-issue selection
                    subIssueSelect.selectedIndex = 0;
                    
                    // Load sub-issues for the selected type
                    loadSubIssues(selectedType);
                    
                    // Show sub-issue container
                    subIssueContainer.classList.remove('hidden');
                    
                    // Hide hint initially
                    subIssueHint.classList.remove('show');
                } else {
                    // Hide sub-issue container if no main issue is selected
                    subIssueContainer.classList.add('hidden');
                }
            });
        }
        
        // Add event listener for sub-issue selection
        if (subIssueSelect) {
            subIssueSelect.addEventListener('change', () => {
                if (subIssueSelect.value) {
                    // Hide hint when a selection is made
                    subIssueHint.classList.remove('show');
                }
            });
        }
        
        // Process station ID when changing focus
        const stationIdInput = document.getElementById('stationId');
        if (stationIdInput) {
            stationIdInput.addEventListener('blur', () => {
                // Extract CPID part from input value
                const fullId = stationIdInput.value.trim();
                const cpid = extractCPID(fullId);
                
                if (cpid) {
                    // Update input field with only the CPID part
                    stationIdInput.value = cpid;
                }
            });
        }
        
        // Form submission
        complaintForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Extract CPID from station ID before validation
            if (stationIdInput) {
                stationIdInput.value = extractCPID(stationIdInput.value.trim());
            }
            
            // Validate form
            if (!validateComplaintForm()) {
                return;
            }
            
            // Get form data
            const formData = {
                stationId: document.getElementById('stationId').value.trim(),
                consumerName: document.getElementById('consumerName').value.trim(),
                consumerPhone: document.getElementById('consumerPhone').value.trim(),
                consumerEmail: document.getElementById('consumerEmail').value.trim() || 'Not provided',
                complaintType: complaintTypeSelect.options[complaintTypeSelect.selectedIndex].text,
                subIssueType: '',
                complaintDescription: document.getElementById('complaintDescription').value.trim()
            };
            
            // Get sub-issue type if available
            if (subIssueSelect && !subIssueContainer.classList.contains('hidden')) {
                formData.subIssueType = subIssueSelect.options[subIssueSelect.selectedIndex].text;
            }
            
            // Submit complaint
            submitComplaint(formData);
        });
    }
}

// Validate Complaint Form
function validateComplaintForm() {
    const stationId = document.getElementById('stationId').value.trim();
    const cpid = extractCPID(stationId); // Extract CPID for validation
    const consumerName = document.getElementById('consumerName').value.trim();
    const consumerPhone = document.getElementById('consumerPhone').value.trim();
    const complaintType = document.getElementById('complaintType').value;
    const subIssueType = document.getElementById('subIssueType').value;
    const complaintDescription = document.getElementById('complaintDescription').value.trim();
    const subIssueHint = document.getElementById('subIssueHint');
    
    // Basic validation
    if (!cpid) {
        showToast('error', 'Missing Charger ID', 'Please enter the charging station ID');
        return false;
    }
    
    if (!consumerName) {
        showToast('error', 'Missing Name', 'Please enter your name');
        return false;
    }
    
    if (!consumerPhone) {
        showToast('error', 'Missing Phone', 'Please enter your phone number');
        return false;
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(consumerPhone.replace(/[\s-]/g, ''))) {
        showToast('error', 'Invalid Phone Number', 'Please enter a valid phone number (10-15 digits)');
        return false;
    }
    
    if (!complaintType) {
        showToast('error', 'Missing Issue Type', 'Please select the type of issue');
        return false;
    }
    
    // Make sub-issue selection mandatory
    if (!subIssueType) {
        showToast('error', 'Missing Sub-Issue', 'Please select a specific issue');
        
        // Show hint in the form
        if (subIssueHint) {
            subIssueHint.classList.add('show');
        }
        
        return false;
    }
    
    if (!complaintDescription) {
        showToast('error', 'Missing Description', 'Please describe the issue you are experiencing');
        return false;
    }
    
    return true;
}
// Submit Complaint - ensuring only CPID is used
function submitComplaint(formData) {
    // Extract CPID from the station ID and convert to uppercase
    const cpid = extractCPID(formData.stationId);
    
    // Get division from hidden field or charger
    const divisionHidden = document.getElementById('chargerDivisionHidden');
    let chargerDivision = divisionHidden ? divisionHidden.value : '';
    
    if (!chargerDivision) {
        // Try to get division from charger using case-insensitive lookup
        const charger = findCharger(cpid);
        chargerDivision = charger ? charger.division : '';
    }
    
    // Retrieve charger info if found
    const charger = findCharger(cpid);
    let chargerLocation = '';
    
    if (charger) {
        chargerLocation = charger.location;
        // If not already set, get division from charger
        if (!chargerDivision) {
            chargerDivision = charger.division;
        }
    }
    
    // Generate tracking ID
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const trackingId = `CP-${year}${month}${day}-${random}`;
    
    // Prepare complaint object - using CPID instead of full charger ID
    const complaint = {
        trackingId,
        chargerID: cpid, // Store only the CPID in uppercase
        location: chargerLocation,
        division: chargerDivision,
        type: formData.complaintType,
        subType: formData.subIssueType,
        status: 'Open', // Always start as Open
        consumerName: formData.consumerName,
        consumerPhone: formData.consumerPhone,
        consumerEmail: formData.consumerEmail,
        description: formData.complaintDescription,
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        timeline: [
            {
                status: 'Complaint Received',
                timestamp: new Date().toISOString(),
                description: 'Complaint has been registered in the system.'
            }
        ]
    };
    
    // Add auto-assignment note to timeline if division exists
    if (chargerDivision) {
        complaint.timeline.push({
            status: 'Assigned to Division',
            timestamp: new Date().toISOString(),
            description: `Complaint automatically assigned to ${chargerDivision}`
        });
    }
    
    // Store complaints
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    complaints.push(complaint);
    localStorage.setItem('complaints', JSON.stringify(complaints));
    
    // Show confirmation
    document.getElementById('generatedTrackingId').textContent = trackingId;
    document.getElementById('complaintConfirmationModal').classList.add('active');
    
    // Reset form
    document.getElementById('consumerComplaintForm').reset();
    
    // Hide charger info display
    document.getElementById('chargerInfoDisplay').classList.add('hidden');
    
    // Remove hidden division field if exists
    const hiddenField = document.getElementById('chargerDivisionHidden');
    if (hiddenField) hiddenField.remove();
    
    // Hide sub-issue container
    const subIssueContainer = document.getElementById('subIssueContainer');
    if (subIssueContainer) subIssueContainer.classList.add('hidden');
}
// Load Sub-Issues for Complaint Types
function loadSubIssues(issueType) {
    const subIssueSelect = document.getElementById('subIssueType');
    const subIssueContainer = document.getElementById('subIssueContainer');

    if (!subIssueSelect || !subIssueContainer) return;

    // Clear existing options
    subIssueSelect.innerHTML = '<option value="">Select a Specific Issue</option>';

    // Define sub-issues based on your requirements
    const subIssues = {
        'charger_not_working': [
            'Charger Won\'t Start Charging',
            'No Power at All',
            'Charging Stops Midway'
        ],
        'physical_damage': [
            'Broken Cover/Casing',
            'Screen/Display Damaged',
            'Physical Damage to Connector'
        ],
        'mobile_app_issue': [
            'QR Code Not Scanning',
            'App Showing Awaiting Connection',
            'Charging Session Not Starting',
            'Charging Session Not Stopping',
            'Connector Busy'
        ],
        'payment_problem': [
            'Credit/Debit Card Declined',
            'No Receipt Generated',
            'Payment Transaction Failed',
            'Payment Refund Required'
        ],
        'billing_issue': [
            'Incorrect Billing Amount',
            'Not Billed for Session',
            'Multiple Charges for Same Session',
            'Unable to Access Billing History'
        ],
        'connector_problem': [
            'Connector Stuck or Jammed',
            'Connector Won\'t Lock Properly',
            'Connector Overheating',
            'Damaged Pins or Sockets'
        ],
        'feedback': [
            'Feedback',
            'System Improvement Suggestion'
        ],
        'other': [
            'General Issue',
            'Have a Question',
            'Other Unspecified Problem'
        ]
    };

    // Populate sub-issues for the selected issue type
    const issues = subIssues[issueType] || [];
    
    if (issues.length > 0) {
        issues.forEach(issue => {
            const option = document.createElement('option');
            option.value = issue.toLowerCase().replace(/[\s']/g, '_');
            option.textContent = issue;
            subIssueSelect.appendChild(option);
        });
        
        // Show sub-issue container
        subIssueContainer.classList.remove('hidden');
    } else {
        // Hide sub-issue container if no sub-issues available
        subIssueContainer.classList.add('hidden');
    }
}

// Setup Charger Lookup
function setupChargerLookup() {
    const stationIdInput = document.getElementById('stationId');
    if (stationIdInput) {
        stationIdInput.addEventListener('input', debounce(function() {
            const stationId = stationIdInput.value.trim();
            if (stationId && stationId.length >= 3) { // Only fetch if ID has at least 3 characters
                // Extract CPID part for lookup
                const cpid = extractCPID(stationId);
                fetchChargerDetails(cpid);
            } else {
                // Hide charger info if ID is too short
                const chargerInfoDisplay = document.getElementById('chargerInfoDisplay');
                if (chargerInfoDisplay) {
                    chargerInfoDisplay.classList.add('hidden');
                }
            }
        }, 500)); // Debounce to avoid too many requests
    }
}

// Debounce function to limit input event firing
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


// Fetch Charger Details
function fetchChargerDetails(stationId) {
    const chargerInfoDisplay = document.getElementById('chargerInfoDisplay');
    const chargerLocationInfo = document.getElementById('chargerLocationInfo');
    
    if (!chargerInfoDisplay || !chargerLocationInfo) return;
    
    // Extract CPID and find charger with case-insensitive matching
    const cpid = extractCPID(stationId);
    const charger = findCharger(cpid);
    
    if (charger) {
        // Update charger location info
        chargerLocationInfo.textContent = charger.location || 'Unknown Location';
        
        // Store division for auto-assignment
        if (charger.division) {
            let hiddenDivisionInput = document.getElementById('chargerDivisionHidden');
            
            if (!hiddenDivisionInput) {
                hiddenDivisionInput = document.createElement('input');
                hiddenDivisionInput.type = 'hidden';
                hiddenDivisionInput.id = 'chargerDivisionHidden';
                document.getElementById('consumerComplaintForm').appendChild(hiddenDivisionInput);
            }
            
            hiddenDivisionInput.value = charger.division;
        }
        
        // Show charger info display
        chargerInfoDisplay.classList.remove('hidden');
    } else {
        // If not found, create minimal information
        chargerLocationInfo.textContent = 'Unregistered Charger';
        
        // Show charger info display
        chargerInfoDisplay.classList.remove('hidden');
        
        // Let user know this is an unregistered charger
        showToast('info', 'Unregistered Charger', 'This charger ID is not in our system. Your complaint will be forwarded to the administrator.');
    }
}
// Setup Confirmation Modal
function setupConfirmationModal() {
    // Close button handlers
    const closeButtons = document.querySelectorAll('#closeConfirmationModal, #closeConfirmation');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('complaintConfirmationModal').classList.remove('active');
        });
    });
    
    // Track complaint handler
    const trackComplaintBtn = document.getElementById('closeAndTrack');
    if (trackComplaintBtn) {
        trackComplaintBtn.addEventListener('click', () => {
            const trackingId = document.getElementById('generatedTrackingId').textContent;
            document.getElementById('complaintConfirmationModal').classList.remove('active');
            
            // Redirect to tracking page
            window.location.href = 'index.html#tracking';
            
            // Alert user to remember their phone number for tracking
            // Use timeout to make sure the alert appears after the page change
            setTimeout(() => {
                alert('Please use your phone number to track your complaint on the login page.');
            }, 500);
        });
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