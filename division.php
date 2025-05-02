<?php
// Include database connection
require_once '../config/db.php';

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get action from request
$action = '';
if ($method === 'GET' && isset($_GET['action'])) {
    $action = $_GET['action'];
} else if (($method === 'POST' || $method === 'PUT' || $method === 'DELETE') && !empty(file_get_contents("php://input"))) {
    $data = json_decode(file_get_contents("php://input"));
    if (isset($data->action)) {
        $action = $data->action;
    }
}

// Routes for different actions
switch ($action) {
    // Dashboard Statistics
    case 'getDashboardStats':
        getDashboardStats();
        break;
    
    // Recent Complaints
    case 'getRecentComplaints':
        getRecentComplaints();
        break;
    
    // Complaints Management
    case 'getComplaints':
        getComplaints($_GET['filter'] ?? null);
        break;
    case 'getComplaintDetails':
        getComplaintDetails($_GET['id'] ?? $data->id ?? null);
        break;
    case 'updateComplaintStatus':
        updateComplaintStatus($data);
        break;
    case 'assignComplaint':
        assignComplaint($data);
        break;
    
    // Charger Management
    case 'getChargers':
        getChargers($_GET['filter'] ?? null);
        break;
    case 'addCharger':
        addCharger($data);
        break;
    case 'updateCharger':
        updateCharger($data);
        break;
    case 'deleteCharger':
        deleteCharger($data);
        break;
    case 'getChargerDetails':
        getChargerDetails($_GET['id'] ?? $data->id ?? null);
        break;
    case 'bulkUploadChargers':
        bulkUploadChargers();
        break;
    
    // Vendor Management
    case 'getVendors':
        getVendors();
        break;
    case 'getVendorDetails':
        getVendorDetails($_GET['id'] ?? $data->id ?? null);
        break;
    
    default:
        sendJsonResponse(false, 'Invalid action');
        break;
}

/**
 * Get Dashboard Statistics for Division
 */
function getDashboardStats() {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get total chargers
        $queryChargers = "SELECT COUNT(*) as total FROM chargers c 
                          JOIN divisions d ON c.division_id = d.id 
                          WHERE d.name = :division_name";
        $stmtChargers = $conn->prepare($queryChargers);
        $stmtChargers->bindParam(':division_name', $divisionName);
        $stmtChargers->execute();
        $totalChargers = $stmtChargers->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get active chargers
        $queryActiveChargers = "SELECT COUNT(*) as total FROM chargers c 
                               JOIN divisions d ON c.division_id = d.id 
                               WHERE d.name = :division_name AND c.status = 'active'";
        $stmtActiveChargers = $conn->prepare($queryActiveChargers);
        $stmtActiveChargers->bindParam(':division_name', $divisionName);
        $stmtActiveChargers->execute();
        $activeChargers = $stmtActiveChargers->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get open complaints
        $queryOpenComplaints = "SELECT COUNT(*) as total FROM complaints 
                               WHERE division = :division_name 
                               AND status IN ('Open', 'In Progress', 'Pending Resolution Approval')";
        $stmtOpenComplaints = $conn->prepare($queryOpenComplaints);
        $stmtOpenComplaints->bindParam(':division_name', $divisionName);
        $stmtOpenComplaints->execute();
        $openComplaints = $stmtOpenComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get resolution rate
        $queryAllComplaints = "SELECT COUNT(*) as total FROM complaints WHERE division = :division_name";
        $stmtAllComplaints = $conn->prepare($queryAllComplaints);
        $stmtAllComplaints->bindParam(':division_name', $divisionName);
        $stmtAllComplaints->execute();
        $totalComplaints = $stmtAllComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        $queryResolvedComplaints = "SELECT COUNT(*) as total FROM complaints 
                                   WHERE division = :division_name AND status = 'Resolved'";
        $stmtResolvedComplaints = $conn->prepare($queryResolvedComplaints);
        $stmtResolvedComplaints->bindParam(':division_name', $divisionName);
        $stmtResolvedComplaints->execute();
        $resolvedComplaints = $stmtResolvedComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        $resolutionRate = $totalComplaints > 0 ? round(($resolvedComplaints / $totalComplaints) * 100) : 0;
        
        // Generate random positive changes for demo purposes (remove in production)
        $chargersChange = rand(1, 5);
        $activeChargersChange = rand(-2, 3); // Can be negative for active chargers
        $complaintsChange = rand(1, 10);
        $resolutionChange = rand(1, 3);
        
        // Compile statistics
        $stats = [
            'totalChargers' => $totalChargers,
            'activeChargers' => $activeChargers,
            'openComplaints' => $openComplaints,
            'resolutionRate' => $resolutionRate . '%',
            'chargersChange' => '+' . $chargersChange,
            'activeChargersChange' => $activeChargersChange >= 0 ? '+' . $activeChargersChange : $activeChargersChange,
            'complaintsChange' => '+' . $complaintsChange,
            'resolutionChange' => '+' . $resolutionChange . '%'
        ];
        
        sendJsonResponse(true, 'Dashboard statistics fetched successfully', $stats);
    } catch(PDOException $e) {
        error_log("Dashboard Stats Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch dashboard statistics');
    }
}

/**
 * Get Recent Complaints for Division
 */
function getRecentComplaints() {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get 5 most recent complaints for this division
        $query = "SELECT c.id, c.tracking_id, c.charger_id, c.type, c.sub_type, 
                 c.status, c.division, c.created_at, c.assigned_to,
                 v.name as vendor_name
                 FROM complaints c 
                 LEFT JOIN vendors v ON c.assigned_to = v.id
                 WHERE c.division = :division_name
                 ORDER BY c.created_at DESC 
                 LIMIT 5";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':division_name', $divisionName);
        $stmt->execute();
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Recent complaints fetched successfully', $complaints);
    } catch(PDOException $e) {
        error_log("Recent Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch recent complaints');
    }
}

/**
 * Get Complaints with Filtering for Division
 */
function getComplaints($filter = null) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        $query = "SELECT c.*, 
                  ch.location as charger_location,
                  v.name as vendor_name
                  FROM complaints c 
                  LEFT JOIN chargers ch ON c.charger_id = ch.cpid
                  LEFT JOIN vendors v ON c.assigned_to = v.id
                  WHERE c.division = :division_name";
        
        $params = [':division_name' => $divisionName];
        
        // Apply filters if provided
        if ($filter) {
            $filterData = json_decode($filter);
            
            if (isset($filterData->status) && $filterData->status !== 'all') {
                $query .= " AND c.status = :status";
                $params[':status'] = $filterData->status;
            }
            
            if (isset($filterData->type) && $filterData->type !== 'all') {
                if ($filterData->type === 'charger') {
                    $query .= " AND c.type NOT LIKE '%Billing%'";
                } else if ($filterData->type === 'billing') {
                    $query .= " AND c.type LIKE '%Billing%'";
                }
            }
            
            if (isset($filterData->search) && !empty($filterData->search)) {
                $query .= " AND (c.tracking_id LIKE :search OR c.charger_id LIKE :search OR c.consumer_name LIKE :search OR c.consumer_phone LIKE :search)";
                $params[':search'] = '%' . $filterData->search . '%';
            }
            
            if (isset($filterData->dateFrom) && !empty($filterData->dateFrom)) {
                $query .= " AND c.created_at >= :date_from";
                $params[':date_from'] = $filterData->dateFrom . ' 00:00:00';
            }
            
            if (isset($filterData->dateTo) && !empty($filterData->dateTo)) {
                $query .= " AND c.created_at <= :date_to";
                $params[':date_to'] = $filterData->dateTo . ' 23:59:59';
            }
            
            // Pagination
            $page = $filterData->page ?? 1;
            $itemsPerPage = $filterData->itemsPerPage ?? 10;
            $offset = ($page - 1) * $itemsPerPage;
            
            // Get total count first
            $countQuery = str_replace("SELECT c.*, \n                  ch.location as charger_location,\n                  v.name as vendor_name", "SELECT COUNT(*) as total", $query);
            $countStmt = $conn->prepare($countQuery);
            
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            
            $countStmt->execute();
            $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            $totalPages = ceil($totalItems / $itemsPerPage);
            
            // Add sorting and pagination
            $query .= " ORDER BY c.created_at DESC LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $itemsPerPage;
        } else {
            // Default sort by created date
            $query .= " ORDER BY c.created_at DESC";
        }
        
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        foreach ($params as $key => $value) {
            // Special binding for LIMIT parameters which must be integers
            if ($key === ':offset' || $key === ':limit') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }
        
        $stmt->execute();
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($filter) {
            sendJsonResponse(true, 'Complaints fetched successfully', [
                'complaints' => $complaints,
                'pagination' => [
                    'totalItems' => $totalItems,
                    'totalPages' => $totalPages,
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage
                ]
            ]);
        } else {
            sendJsonResponse(true, 'Complaints fetched successfully', $complaints);
        }
    } catch(PDOException $e) {
        error_log("Get Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaints');
    }
}

/**
 * Get Complaint Details
 */
function getComplaintDetails($id) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    if (!$id) {
        sendJsonResponse(false, 'Complaint ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get complaint details
        $query = "SELECT c.*, 
                 ch.location as charger_location,
                 v.name as vendor_name
                 FROM complaints c 
                 LEFT JOIN chargers ch ON c.charger_id = ch.cpid
                 LEFT JOIN vendors v ON c.assigned_to = v.id
                 WHERE (c.tracking_id = :id OR c.id = :id_numeric) AND c.division = :division_name";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':id_numeric', $id, PDO::PARAM_INT);
        $stmt->bindParam(':division_name', $divisionName);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found');
            return;
        }
        
        // Get timeline events
        $timelineQuery = "SELECT * FROM complaint_timeline 
                         WHERE complaint_id = :complaint_id 
                         ORDER BY timestamp ASC";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaint_id', $complaint['id']);
        $timelineStmt->execute();
        
        $timeline = $timelineStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add initial event if timeline is empty
        if (empty($timeline)) {
            $timeline[] = [
                'status' => 'Complaint Received',
                'description' => 'Complaint has been registered in the system.',
                'timestamp' => $complaint['created_at']
            ];
        }
        
        // Get SLA info if assigned to vendor
        $slaInfo = null;
        if ($complaint['assigned_to']) {
            $slaQuery = "SELECT s.* 
                        FROM sla_settings s 
                        WHERE s.id = (SELECT MAX(id) FROM sla_settings)";
            
            $slaStmt = $conn->prepare($slaQuery);
            $slaStmt->execute();
            
            $slaSettings = $slaStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($slaSettings) {
                // Get assignment time
                $assignmentEvent = null;
                foreach ($timeline as $event) {
                    if (stripos($event['status'], 'assigned to vendor') !== false) {
                        $assignmentEvent = $event;
                        break;
                    }
                }
                
                if ($assignmentEvent) {
                    $assignmentTime = new DateTime($assignmentEvent['timestamp']);
                    $currentTime = new DateTime();
                    
                    // Determine SLA priority and deadline
                    $slaPriority = 'medium'; // Default
                    $slaHours = $slaSettings['medium_sla'] ?? 24;
                    
                    // Allow custom priority if set in complaint
                    if (isset($complaint['sla_priority']) && !empty($complaint['sla_priority'])) {
                        $slaPriority = strtolower($complaint['sla_priority']);
                        
                        switch($slaPriority) {
                            case 'critical':
                                $slaHours = $slaSettings['critical_sla'] ?? 4;
                                break;
                            case 'high':
                                $slaHours = $slaSettings['high_sla'] ?? 12;
                                break;
                            case 'medium':
                                $slaHours = $slaSettings['medium_sla'] ?? 24;
                                break;
                            case 'low':
                                $slaHours = $slaSettings['low_sla'] ?? 48;
                                break;
                        }
                    }
                    
                    // Calculate expected resolution date
                    $deadline = clone $assignmentTime;
                    $deadline->add(new DateInterval("PT{$slaHours}H"));
                    
                    // Calculate time remaining or overdue
                    $timeRemaining = $currentTime->diff($deadline);
                    $isOverdue = $currentTime > $deadline;
                    
                    $slaInfo = [
                        'priority' => $slaPriority,
                        'hours' => $slaHours,
                        'deadline' => $deadline->format('Y-m-d H:i:s'),
                        'isOverdue' => $isOverdue,
                        'timeRemaining' => $timeRemaining->format('%a days, %h hours, %i minutes'),
                        'formattedStatus' => $isOverdue ? 'OVERDUE' : 'On Time'
                    ];
                }
            }
        }
        
        // Prepare response
        $response = [
            'complaint' => $complaint,
            'timeline' => $timeline,
            'sla' => $slaInfo
        ];
        
        sendJsonResponse(true, 'Complaint details fetched successfully', $response);
    } catch(PDOException $e) {
        error_log("Complaint Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaint details');
    }
}

/**
 * Update Complaint Status
 */
function updateComplaintStatus($data) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    if (!isset($data->trackingId) || empty($data->trackingId) ||
        !isset($data->newStatus) || empty($data->newStatus)) {
        
        sendJsonResponse(false, 'Tracking ID and new status are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $query = "SELECT * FROM complaints WHERE tracking_id = :tracking_id AND division = :division_name";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':tracking_id', $data->trackingId);
        $stmt->bindParam(':division_name', $divisionName);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found or does not belong to your division');
            return;
        }
        
        $oldStatus = $complaint['status'];
        $currentTime = date('Y-m-d H:i:s');
        
        // Special handling for resolved status
        $statusNote = $data->statusNote ?? '';
        
        if ($data->newStatus === 'Resolved') {
            // Calculate resolution metrics if SLA was set
            $resolutionMetrics = '';
            
            if ($complaint['assigned_to'] && isset($complaint['expected_resolution_date']) && !empty($complaint['expected_resolution_date'])) {
                $deadline = new DateTime($complaint['expected_resolution_date']);
                $resolvedTime = new DateTime();
                $resolvedOnTime = $resolvedTime <= $deadline;
                
                // Calculate time difference
                $timeDifference = $resolvedTime->getTimestamp() - $deadline->getTimestamp();
                
                // Format the difference for display
                $hours = floor(abs($timeDifference) / 3600);
                $days = floor($hours / 24);
                $remainingHours = $hours % 24;
                
                $formattedDiff = $days > 0 ? "{$days} days, {$remainingHours} hours" : "{$hours} hours";
                
                if ($resolvedOnTime) {
                    // Resolved on time - calculate time before deadline
                    $resolutionMetrics = "Resolved {$formattedDiff} before SLA deadline";
                } else {
                    // Resolved late - calculate delay
                    $resolutionMetrics = "Resolved {$formattedDiff} after SLA deadline (DELAYED)";
                }
                
                // Append resolution metrics to note
                if (!empty($resolutionMetrics)) {
                    $statusNote .= "\n" . $resolutionMetrics;
                }
            }
        }
        
        // Update complaint status
        $updateQuery = "UPDATE complaints SET status = :status, last_updated = :last_updated WHERE id = :id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':status', $data->newStatus);
        $updateStmt->bindParam(':last_updated', $currentTime);
        $updateStmt->bindParam(':id', $complaint['id']);
        $updateStmt->execute();
        
        // Add timeline entry
        $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                         VALUES (:complaint_id, :status, :description, :timestamp)";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaint_id', $complaint['id']);
        $timelineStmt->bindParam(':status', $data->newStatus);
        
        $description = !empty($statusNote) ? $statusNote : "Status changed from {$oldStatus} to {$data->newStatus}";
        $timelineStmt->bindParam(':description', $description);
        $timelineStmt->bindParam(':timestamp', $currentTime);
        $timelineStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Complaint status updated successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Update Complaint Status Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update complaint status');
    }
}

/**
 * Assign Complaint to Vendor
 */
function assignComplaint($data) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    if (!isset($data->trackingId) || empty($data->trackingId) ||
        !isset($data->vendorId) || empty($data->vendorId)) {
        
        sendJsonResponse(false, 'Tracking ID and vendor are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $query = "SELECT * FROM complaints WHERE tracking_id = :tracking_id AND division = :division_name";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':tracking_id', $data->trackingId);
        $stmt->bindParam(':division_name', $divisionName);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found or does not belong to your division');
            return;
        }
        
        // Get vendor details
        $vendorQuery = "SELECT v.* FROM vendors v 
                       JOIN divisions d ON FIND_IN_SET(d.id, v.division_id) > 0 
                       WHERE v.id = :vendor_id AND d.name = :division_name";
        $vendorStmt = $conn->prepare($vendorQuery);
        $vendorStmt->bindParam(':vendor_id', $data->vendorId);
        $vendorStmt->bindParam(':division_name', $divisionName);
        $vendorStmt->execute();
        
        $vendor = $vendorStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$vendor) {
            sendJsonResponse(false, 'Vendor not found or not assigned to your division');
            return;
        }
        
        // Current time - this is when the complaint is assigned
        $currentTime = date('Y-m-d H:i:s');
        
        // Set SLA based on priority
        if (isset($data->slaPriority) && !empty($data->slaPriority)) {
            // Get SLA settings
            $slaQuery = "SELECT * FROM sla_settings WHERE id = (SELECT MAX(id) FROM sla_settings)";
            $slaStmt = $conn->prepare($slaQuery);
            $slaStmt->execute();
            
            $slaSettings = $slaStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($slaSettings) {
                $slaHours = 24; // Default medium
                
                switch(strtolower($data->slaPriority)) {
                    case 'critical':
                        $slaHours = $slaSettings['critical_sla'] ?? 4;
                        break;
                    case 'high':
                        $slaHours = $slaSettings['high_sla'] ?? 12;
                        break;
                    case 'medium':
                        $slaHours = $slaSettings['medium_sla'] ?? 24;
                        break;
                    case 'low':
                        $slaHours = $slaSettings['low_sla'] ?? 48;
                        break;
                }
                
                // Calculate expected resolution date
                $deadline = new DateTime($currentTime);
                $deadline->add(new DateInterval("PT{$slaHours}H"));
                $expectedResolutionDate = $deadline->format('Y-m-d H:i:s');
                
                // Update complaint
                $updateQuery = "UPDATE complaints SET 
                               assigned_to = :assigned_to, 
                               sla_priority = :sla_priority, 
                               expected_resolution_date = :expected_resolution_date, 
                               last_updated = :last_updated";
                
                // Update status if needed
                if (isset($data->updateStatus) && $data->updateStatus === true) {
                    $updateQuery .= ", status = 'In Progress'";
                }
                
                $updateQuery .= " WHERE id = :id";
                
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bindParam(':assigned_to', $data->vendorId);
                $updateStmt->bindParam(':sla_priority', $data->slaPriority);
                $updateStmt->bindParam(':expected_resolution_date', $expectedResolutionDate);
                $updateStmt->bindParam(':last_updated', $currentTime);
                $updateStmt->bindParam(':id', $complaint['id']);
                $updateStmt->execute();
                
                // Add timeline entry
                $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                                 VALUES (:complaint_id, :status, :description, :timestamp)";
                
                $timelineStmt = $conn->prepare($timelineQuery);
                $timelineStmt->bindParam(':complaint_id', $complaint['id']);
                $timelineStmt->bindValue(':status', 'Assigned to Vendor');
                
                // Format SLA time for display
                $slaText = '';
                if ($slaHours < 24) {
                    $slaText = "{$slaHours} hours";
                } else {
                    $days = floor($slaHours / 24);
                    $remainingHours = $slaHours % 24;
                    $slaText = $days > 0 ? 
                        ($remainingHours > 0 ? "{$days} days, {$remainingHours} hours" : "{$days} days") : 
                        "{$slaHours} hours";
                }
                
                // Format deadline for display
                $deadlineFormatted = $deadline->format('Y-m-d H:i:s');
                
                $description = "Complaint assigned to {$vendor['name']} with " . strtoupper($data->slaPriority) . " priority SLA ({$slaText}). ";
                $description .= "Deadline: {$deadlineFormatted}";
                
                if (isset($data->assignmentNote) && !empty($data->assignmentNote)) {
                    $description .= "\nNote: {$data->assignmentNote}";
                }
                
                $timelineStmt->bindParam(':description', $description);
                $timelineStmt->bindParam(':timestamp', $currentTime);
                $timelineStmt->execute();
                
                // Add status change timeline entry if needed
                if (isset($data->updateStatus) && $data->updateStatus === true && $complaint['status'] !== 'In Progress') {
                    $statusTimelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                                          VALUES (:complaint_id, :status, :description, :timestamp)";
                    
                    $statusTimelineStmt = $conn->prepare($statusTimelineQuery);
                    $statusTimelineStmt->bindParam(':complaint_id', $complaint['id']);
                    $statusTimelineStmt->bindValue(':status', 'In Progress');
                    
                    $statusDesc = "Status changed from {$complaint['status']} to In Progress";
                    $statusTimelineStmt->bindParam(':description', $statusDesc);
                    $statusTimelineStmt->bindParam(':timestamp', $currentTime);
                    $statusTimelineStmt->execute();
                }
                
                // Commit transaction
                $conn->commit();
                
                sendJsonResponse(true, 'Complaint assigned successfully to vendor with SLA');
            } else {
                sendJsonResponse(false, 'SLA settings not found');
            }
        } else {
            // Simple assignment without SLA
            // Update complaint
            $updateQuery = "UPDATE complaints SET 
                           assigned_to = :assigned_to, 
                           last_updated = :last_updated";
            
            // Update status if needed
            if (isset($data->updateStatus) && $data->updateStatus === true) {
                $updateQuery .= ", status = 'In Progress'";
            }
            
            $updateQuery .= " WHERE id = :id";
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bindParam(':assigned_to', $data->vendorId);
            $updateStmt->bindParam(':last_updated', $currentTime);
            $updateStmt->bindParam(':id', $complaint['id']);
            $updateStmt->execute();
            
            // Add timeline entry
            $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                             VALUES (:complaint_id, :status, :description, :timestamp)";
            
            $timelineStmt = $conn->prepare($timelineQuery);
            $timelineStmt->bindParam(':complaint_id', $complaint['id']);
            $timelineStmt->bindValue(':status', 'Assigned to Vendor');
            
            $description = "Complaint assigned to {$vendor['name']}";
            
            if (isset($data->assignmentNote) && !empty($data->assignmentNote)) {
                $description .= "\nNote: {$data->assignmentNote}";
            }
            
            $timelineStmt->bindParam(':description', $description);
            $timelineStmt->bindParam(':timestamp', $currentTime);
            $timelineStmt->execute();
            
            // Add status change timeline entry if needed
            if (isset($data->updateStatus) && $data->updateStatus === true && $complaint['status'] !== 'In Progress') {
                $statusTimelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                                      VALUES (:complaint_id, :status, :description, :timestamp)";
                
                $statusTimelineStmt = $conn->prepare($statusTimelineQuery);
                $statusTimelineStmt->bindParam(':complaint_id', $complaint['id']);
                $statusTimelineStmt->bindValue(':status', 'In Progress');
                
                $statusDesc = "Status changed from {$complaint['status']} to In Progress";
                $statusTimelineStmt->bindParam(':description', $statusDesc);
                $statusTimelineStmt->bindParam(':timestamp', $currentTime);
                $statusTimelineStmt->execute();
            }
            
            // Commit transaction
            $conn->commit();
            
            sendJsonResponse(true, 'Complaint assigned successfully to vendor');
        }
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Assign Complaint Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to assign complaint');
    }
}

/**
 * Get Chargers with Filtering for Division
 */
function getChargers($filter = null) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get division ID from division name
        $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $divisionName);
        $divisionStmt->execute();
        
        $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
        
        if (!$divisionId) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        $query = "SELECT c.*, d.name as division_name 
                  FROM chargers c 
                  LEFT JOIN divisions d ON c.division_id = d.id 
                  WHERE c.division_id = :division_id";
        
        $params = [':division_id' => $divisionId];
        
        // Apply filters if provided
        if ($filter) {
            $filterData = json_decode($filter);
            
            if (isset($filterData->status) && $filterData->status !== 'all') {
                $query .= " AND c.status = :status";
                $params[':status'] = $filterData->status;
            }
            
            if (isset($filterData->type) && $filterData->type !== 'all') {
                // Handle AC/DC type filter
                if ($filterData->type === 'ac') {
                    $query .= " AND (c.type LIKE '%AC%' OR c.type LIKE '%Type 2%')";
                } else if ($filterData->type === 'dc') {
                    $query .= " AND (c.type LIKE '%DC%' OR c.type LIKE '%CCS%' OR c.type LIKE '%CHAdeMO%')";
                }
            }
            
            if (isset($filterData->search) && !empty($filterData->search)) {
                $query .= " AND (c.cpid LIKE :search OR c.location LIKE :search OR c.serial_number LIKE :search)";
                $params[':search'] = '%' . $filterData->search . '%';
            }
            
            // Pagination
            $page = $filterData->page ?? 1;
            $itemsPerPage = $filterData->itemsPerPage ?? 10;
            $offset = ($page - 1) * $itemsPerPage;
            
            // Get total count first
            $countQuery = str_replace("SELECT c.*, d.name as division_name", "SELECT COUNT(*) as total", $query);
            $countStmt = $conn->prepare($countQuery);
            
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            
            $countStmt->execute();
            $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            $totalPages = ceil($totalItems / $itemsPerPage);
            
            // Add sorting and pagination
            $query .= " ORDER BY c.created_at DESC LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $itemsPerPage;
        } else {
            // Default sort by created date
            $query .= " ORDER BY c.created_at DESC";
        }
        
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        foreach ($params as $key => $value) {
            // Special binding for LIMIT parameters which must be integers
            if ($key === ':offset' || $key === ':limit') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }
        
        $stmt->execute();
        $chargers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($filter) {
            sendJsonResponse(true, 'Chargers fetched successfully', [
                'chargers' => $chargers,
                'pagination' => [
                    'totalItems' => $totalItems,
                    'totalPages' => $totalPages,
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage
                ]
            ]);
        } else {
            sendJsonResponse(true, 'Chargers fetched successfully', $chargers);
        }
    } catch(PDOException $e) {
        error_log("Get Chargers Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch chargers');
    }
}

/**
 * Add New Charger
 */
function addCharger($data) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    // Validate required fields
    if (!isset($data->cpid) || empty($data->cpid) ||
        !isset($data->location) || empty($data->location) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Check if charger with same CPID already exists
        $checkQuery = "SELECT COUNT(*) as count FROM chargers WHERE cpid = :cpid";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':cpid', $data->cpid);
        $checkStmt->execute();
        
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'A charger with this CPID already exists');
            return;
        }
        
        // If serial number is provided, check for duplicates
        if (isset($data->serialNumber) && !empty($data->serialNumber)) {
            $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number";
            $checkSerialStmt = $conn->prepare($checkSerialQuery);
            $checkSerialStmt->bindParam(':serial_number', $data->serialNumber);
            $checkSerialStmt->execute();
            
            if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A charger with this Serial Number already exists');
                return;
            }
        }
        
        // Get division ID from division name
        $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $divisionName);
        $divisionStmt->execute();
        
        $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
        
        if (!$divisionId) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Insert charger
        $chargerQuery = "INSERT INTO chargers (cpid, serial_number, location, make, model, 
                        division_id, type, address, status, created_at) 
                        VALUES (:cpid, :serial_number, :location, :make, :model, 
                        :division_id, :type, :address, :status, NOW())";
        
        $chargerStmt = $conn->prepare($chargerQuery);
        $chargerStmt->bindParam(':cpid', $data->cpid);
        $chargerStmt->bindParam(':serial_number', $data->serialNumber);
        $chargerStmt->bindParam(':location', $data->location);
        $chargerStmt->bindParam(':make', $data->make);
        $chargerStmt->bindParam(':model', $data->model);
        $chargerStmt->bindParam(':division_id', $divisionId);
        $chargerStmt->bindParam(':type', $data->type);
        $chargerStmt->bindParam(':address', $data->address);
        $chargerStmt->bindParam(':status', $data->status);
        $chargerStmt->execute();
        
        sendJsonResponse(true, 'Charger added successfully', [
            'cpid' => $data->cpid
        ]);
    } catch(PDOException $e) {
        error_log("Add Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to add charger');
    }
}

/**
 * Update Charger
 */
function updateCharger($data) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    // Validate required fields
    if (!isset($data->cpid) || empty($data->cpid) ||
        !isset($data->location) || empty($data->location) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get current charger data to verify it belongs to this division
        $getQuery = "SELECT c.*, d.name as division_name 
                    FROM chargers c 
                    LEFT JOIN divisions d ON c.division_id = d.id 
                    WHERE c.cpid = :cpid";
        
        $getStmt = $conn->prepare($getQuery);
        $getStmt->bindParam(':cpid', $data->cpid);
        $getStmt->execute();
        
        $charger = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$charger) {
            sendJsonResponse(false, 'Charger not found');
            return;
        }
        
        if ($charger['division_name'] !== $divisionName) {
            sendJsonResponse(false, 'This charger does not belong to your division');
            return;
        }
        
        // If serial number is being changed, check for duplicates
        if (isset($data->serialNumber) && !empty($data->serialNumber) && $data->serialNumber !== $charger['serial_number']) {
            $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number AND cpid != :cpid";
            $checkSerialStmt = $conn->prepare($checkSerialQuery);
            $checkSerialStmt->bindParam(':serial_number', $data->serialNumber);
            $checkSerialStmt->bindParam(':cpid', $data->cpid);
            $checkSerialStmt->execute();
            
            if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A different charger with this Serial Number already exists');
                return;
            }
        }
        
        // Update charger
        $updateQuery = "UPDATE chargers 
                       SET serial_number = :serial_number, 
                       location = :location, 
                       make = :make, 
                       model = :model, 
                       type = :type, 
                       address = :address, 
                       status = :status 
                       WHERE cpid = :cpid";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':serial_number', $data->serialNumber);
        $updateStmt->bindParam(':location', $data->location);
        $updateStmt->bindParam(':make', $data->make);
        $updateStmt->bindParam(':model', $data->model);
        $updateStmt->bindParam(':type', $data->type);
        $updateStmt->bindParam(':address', $data->address);
        $updateStmt->bindParam(':status', $data->status);
        $updateStmt->bindParam(':cpid', $data->cpid);
        $updateStmt->execute();
        
        // Update charger location in complaints
        $updateComplaintsQuery = "UPDATE complaints SET location = :location WHERE charger_id = :cpid";
        $updateComplaintsStmt = $conn->prepare($updateComplaintsQuery);
        $updateComplaintsStmt->bindParam(':location', $data->location);
        $updateComplaintsStmt->bindParam(':cpid', $data->cpid);
        $updateComplaintsStmt->execute();
        
        sendJsonResponse(true, 'Charger updated successfully');
    } catch(PDOException $e) {
        error_log("Update Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update charger');
    }
}

/**
 * Delete Charger
 */
function deleteCharger($data) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    if (!isset($data->cpid) || empty($data->cpid)) {
        sendJsonResponse(false, 'Charger ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Check if charger belongs to this division
        $checkQuery = "SELECT c.*, d.name as division_name 
                      FROM chargers c 
                      LEFT JOIN divisions d ON c.division_id = d.id 
                      WHERE c.cpid = :cpid";
        
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':cpid', $data->cpid);
        $checkStmt->execute();
        
        $charger = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$charger) {
            sendJsonResponse(false, 'Charger not found');
            return;
        }
        
        if ($charger['division_name'] !== $divisionName) {
            sendJsonResponse(false, 'This charger does not belong to your division');
            return;
        }
        
        // Check if charger has associated complaints
        $checkComplaintsQuery = "SELECT COUNT(*) as count FROM complaints WHERE charger_id = :cpid";
        $checkComplaintsStmt = $conn->prepare($checkComplaintsQuery);
        $checkComplaintsStmt->bindParam(':cpid', $data->cpid);
        $checkComplaintsStmt->execute();
        
        if ($checkComplaintsStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Cannot delete charger with associated complaints. Please resolve complaints first.');
            return;
        }
        
        // Delete charger
        $deleteQuery = "DELETE FROM chargers WHERE cpid = :cpid";
        $deleteStmt = $conn->prepare($deleteQuery);
        $deleteStmt->bindParam(':cpid', $data->cpid);
        $deleteStmt->execute();
        
        sendJsonResponse(true, 'Charger deleted successfully');
    } catch(PDOException $e) {
        error_log("Delete Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to delete charger');
    }
}

/**
 * Get Charger Details
 */
function getChargerDetails($cpid) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    if (!$cpid) {
        sendJsonResponse(false, 'Charger ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get charger details
        $query = "SELECT c.*, d.name as division_name 
                 FROM chargers c 
                 LEFT JOIN divisions d ON c.division_id = d.id 
                 WHERE c.cpid = :cpid AND d.name = :division_name";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':cpid', $cpid);
        $stmt->bindParam(':division_name', $divisionName);
        $stmt->execute();
        
        $charger = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$charger) {
            sendJsonResponse(false, 'Charger not found or does not belong to your division');
            return;
        }
        
        // Get complaint history for this charger
        $complaintsQuery = "SELECT c.id, c.tracking_id, c.created_at, c.type, c.sub_type, c.status, 
                           c.last_updated, 
                           (CASE 
                              WHEN c.status = 'Resolved' THEN 
                                TIMESTAMPDIFF(HOUR, c.created_at, c.last_updated) 
                              ELSE NULL 
                           END) as resolution_time
                           FROM complaints c 
                           WHERE c.charger_id = :cpid 
                           ORDER BY c.created_at DESC";
        
        $complaintsStmt = $conn->prepare($complaintsQuery);
        $complaintsStmt->bindParam(':cpid', $cpid);
        $complaintsStmt->execute();
        
        $complaints = $complaintsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Prepare response
        $response = [
            'charger' => $charger,
            'complaints' => $complaints
        ];
        
        sendJsonResponse(true, 'Charger details fetched successfully', $response);
    } catch(PDOException $e) {
        error_log("Charger Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch charger details');
    }
}

/**
 * Bulk Upload Chargers
 */
function bulkUploadChargers() {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    // Check if file is uploaded
    if (!isset($_FILES['excelFile'])) {
        sendJsonResponse(false, 'No file uploaded');
    }
    
    // Validate file
    $file = $_FILES['excelFile'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendJsonResponse(false, 'File upload error: ' . $file['error']);
    }
    
    // Check file extension
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (!in_array($ext, ['xlsx', 'xls'])) {
        sendJsonResponse(false, 'Only Excel files (xlsx, xls) are allowed');
    }
    
    // Load the PhpSpreadsheet library
    // Note: You need to have PhpSpreadsheet installed via Composer
    require_once '../vendor/autoload.php';
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get division ID from division name
        $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $divisionName);
        $divisionStmt->execute();
        
        $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
        
        if (!$divisionId) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Read Excel file
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($file['tmp_name']);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($file['tmp_name']);
        $worksheet = $spreadsheet->getActiveSheet();
        
        // Get all rows as array
        $rows = $worksheet->toArray();
        
        // Remove header row
        $headers = array_shift($rows);
        
        // Initialize counters and errors array
        $addedCount = 0;
        $errorCount = 0;
        $duplicateCount = 0;
        $errors = [];
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Process each row
        foreach ($rows as $rowIndex => $row) {
            // Skip empty rows
            if (empty($row[0])) {
                continue;
            }
            
            $cpid = $row[0];
            $serialNumber = $row[1] ?? null;
            $location = $row[2] ?? null;
            $make = $row[3] ?? null;
            $model = $row[4] ?? null;
            $type = $row[5] ?? null;
            $address = $row[6] ?? null;
            $status = $row[7] ?? 'active';
            
            // Validate required fields
            if (empty($cpid) || empty($location)) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Missing required fields (CPID or Location)";
                $errorCount++;
                continue;
            }
            
            // Check if charger with same CPID already exists
            $checkQuery = "SELECT COUNT(*) as count FROM chargers WHERE cpid = :cpid";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':cpid', $cpid);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Charger with CPID '{$cpid}' already exists";
                $duplicateCount++;
                continue;
            }
            
            // If serial number is provided, check for duplicates
            if (!empty($serialNumber)) {
                $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number";
                $checkSerialStmt = $conn->prepare($checkSerialQuery);
                $checkSerialStmt->bindParam(':serial_number', $serialNumber);
                $checkSerialStmt->execute();
                
                if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                    $errors[] = "Row " . ($rowIndex + 2) . ": Charger with Serial Number '{$serialNumber}' already exists";
                    $duplicateCount++;
                    continue;
                }
            }
            
            try {
                // Insert charger
                $chargerQuery = "INSERT INTO chargers (cpid, serial_number, location, make, model, 
                                division_id, type, address, status, created_at) 
                                VALUES (:cpid, :serial_number, :location, :make, :model, 
                                :division_id, :type, :address, :status, NOW())";
                
                $chargerStmt = $conn->prepare($chargerQuery);
                $chargerStmt->bindParam(':cpid', $cpid);
                $chargerStmt->bindParam(':serial_number', $serialNumber);
                $chargerStmt->bindParam(':location', $location);
                $chargerStmt->bindParam(':make', $make);
                $chargerStmt->bindParam(':model', $model);
                $chargerStmt->bindParam(':division_id', $divisionId);
                $chargerStmt->bindParam(':type', $type);
                $chargerStmt->bindParam(':address', $address);
                $chargerStmt->bindParam(':status', $status);
                $chargerStmt->execute();
                
                $addedCount++;
            } catch (PDOException $e) {
                $errors[] = "Row " . ($rowIndex + 2) . ": Error adding charger: " . $e->getMessage();
                $errorCount++;
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Bulk upload completed', [
            'addedCount' => $addedCount,
            'errorCount' => $errorCount,
            'duplicateCount' => $duplicateCount,
            'errors' => $errors
        ]);
    } catch (Exception $e) {
        // Rollback transaction
        if ($conn) {
            $conn->rollBack();
        }
        
        error_log("Bulk Upload Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to process bulk upload: ' . $e->getMessage());
    }
}

/**
 * Get Vendors for Division
 */
function getVendors() {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser) {
        sendJsonResponse(false, 'Unauthorized access');
        return;
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    $divisionName = $currentUser['division_name'];
    
    try {
        // Get division ID
        $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $divisionName);
        $divisionStmt->execute();
        
        $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
        
        if (!$divisionId) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Get vendors that serve this division
        $query = "SELECT v.* 
                 FROM vendors v 
                 WHERE v.status = 'active' 
                 AND FIND_IN_SET(:division_id, v.division_id) > 0";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':division_id', $divisionId);
        $stmt->execute();
        
        $vendors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Vendors fetched successfully', $vendors);
    } catch(PDOException $e) {
        error_log("Get Vendors Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch vendors');
    }
}

/**
 * Get Vendor Details
 */
function getVendorDetails($id) {
    // First authenticate the division
    $currentUser = authenticateDivisionUser();
    if (!$currentUser)