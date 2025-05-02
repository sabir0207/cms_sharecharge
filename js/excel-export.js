// Reports & Analytics Section Functionality

// Initialize Report Section
function setupReportsSection() {
    // Populate division dropdowns
    populateReportDivisionDropdowns();
    
    // Populate vendor dropdown
    populateReportVendorDropdown();
    
    // Set current month date range as default
    setCurrentMonthDateRange();
    
    // Setup report type change handlers
    document.getElementById('complaintReportType').addEventListener('change', handleComplaintReportTypeChange);
    
    // Setup generate report buttons
    document.getElementById('generateComplaintReportBtn').addEventListener('click', generateComplaintReport);
    document.getElementById('generateChargerReportBtn').addEventListener('click', generateChargerReport);
    document.getElementById('generateVendorReportBtn').addEventListener('click', generateVendorReport);
    
    // Setup export buttons
    document.getElementById('complaintExportBtn').addEventListener('click', () => exportToExcel('complaints'));
    document.getElementById('chargerExportBtn').addEventListener('click', () => exportToExcel('chargers'));
    document.getElementById('vendorExportBtn').addEventListener('click', () => exportToExcel('vendors'));
    
    // Report actions
    document.getElementById('printReportBtn').addEventListener('click', printReport);
    document.getElementById('exportReportBtn').addEventListener('click', exportCurrentReport);
}

// Set current month date range as default
function setCurrentMonthDateRange() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    
    // Set dates for complaint report
    document.getElementById('complaintDateFrom').value = formatDate(firstDayOfMonth);
    document.getElementById('complaintDateTo').value = formatDate(lastDayOfMonth);
    
    // Set dates for vendor report
    document.getElementById('vendorDateFrom').value = formatDate(firstDayOfMonth);
    document.getElementById('vendorDateTo').value = formatDate(lastDayOfMonth);
}

// Populate division dropdowns on reports page
function populateReportDivisionDropdowns() {
    const divisions = JSON.parse(localStorage.getItem('divisions') || '[]');
    const divisionSelects = [
        document.getElementById('complaintReportDivision'),
        document.getElementById('chargerReportDivision')
    ];
    
    divisionSelects.forEach(select => {
        if (!select) return;
        
        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add division options
        divisions.forEach(division => {
            const option = document.createElement('option');
            option.value = division.name;
            option.textContent = division.name;
            select.appendChild(option);
        });
    });
}

// Populate vendor dropdown on reports page
function populateReportVendorDropdown() {
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    const vendorSelect = document.getElementById('vendorSelect');
    
    if (!vendorSelect) return;
    
    // Clear existing options except first
    while (vendorSelect.options.length > 1) {
        vendorSelect.remove(1);
    }
    
    // Add vendor options
    vendors.forEach(vendor => {
        const option = document.createElement('option');
        option.value = vendor.name;
        option.textContent = vendor.name;
        vendorSelect.appendChild(option);
    });
}

// Handle complaint report type change
function handleComplaintReportTypeChange() {
    const reportType = document.getElementById('complaintReportType').value;
    const divisionFilter = document.getElementById('complaintDivisionFilter');
    
    // Show/hide division filter based on report type
    if (reportType === 'division') {
        divisionFilter.style.display = 'block';
    } else {
        divisionFilter.style.display = 'none';
    }
}

// Generate Complaint Report
function generateComplaintReport() {
    const reportType = document.getElementById('complaintReportType').value;
    const dateFrom = document.getElementById('complaintDateFrom').value;
    const dateTo = document.getElementById('complaintDateTo').value;
    const division = reportType === 'division' ? document.getElementById('complaintReportDivision').value : 'all';
    
    // Validate dates
    if (!dateFrom || !dateTo) {
        showToast('error', 'Date Required', 'Please select both start and end dates');
        return;
    }
    
    // Get complaints data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Filter by date range
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59); // End of the day
    
    let filteredComplaints = complaints.filter(complaint => {
        const complaintDate = new Date(complaint.createdDate);
        return complaintDate >= startDate && complaintDate <= endDate;
    });
    
    // Filter by division if needed
    if (division !== 'all') {
        filteredComplaints = filteredComplaints.filter(complaint => complaint.division === division);
    }
    
    if (filteredComplaints.length === 0) {
        showToast('warning', 'No Data', 'No complaints found for the selected criteria');
        return;
    }
    
    // Generate appropriate report based on type
    switch(reportType) {
        case 'summary':
            generateComplaintSummaryReport(filteredComplaints);
            break;
        case 'division':
            generateComplaintsByDivisionReport(filteredComplaints);
            break;
        case 'type':
            generateComplaintsByTypeReport(filteredComplaints);
            break;
        case 'resolution':
            generateResolutionTimeReport(filteredComplaints);
            break;
        case 'trend':
            generateComplaintTrendReport(filteredComplaints, startDate, endDate);
            break;
    }
    
    // Show report container
    document.getElementById('reportResultsContainer').style.display = 'block';
    
    // Store current report data for export
    window.currentReportData = {
        type: 'complaint',
        subtype: reportType,
        title: document.getElementById('reportTitle').textContent,
        data: filteredComplaints
    };
}

// Generate Complaint Summary Report
function generateComplaintSummaryReport(complaints) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Complaint Summary Report';
    
    // Calculate summary statistics
    const totalComplaints = complaints.length;
    const openComplaints = complaints.filter(c => c.status === 'Open').length;
    const inProgressComplaints = complaints.filter(c => c.status === 'In Progress').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
    
    // Status distribution for chart
    const statusData = [
        { status: 'Open', count: openComplaints },
        { status: 'In Progress', count: inProgressComplaints },
        { status: 'Resolved', count: resolvedComplaints }
    ];
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'pie',
        data: {
            labels: statusData.map(d => d.status),
            datasets: [{
                data: statusData.map(d => d.count),
                backgroundColor: ['#F44336', '#FFC107', '#4CAF50'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Complaint Status Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / totalComplaints) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Percentage</th>
        </tr>
    `;
    
    tableBody.innerHTML = `
        <tr>
            <td>Total Complaints</td>
            <td>${totalComplaints}</td>
            <td>100%</td>
        </tr>
        <tr>
            <td>Open Complaints</td>
            <td>${openComplaints}</td>
            <td>${Math.round((openComplaints / totalComplaints) * 100)}%</td>
        </tr>
        <tr>
            <td>In Progress Complaints</td>
            <td>${inProgressComplaints}</td>
            <td>${Math.round((inProgressComplaints / totalComplaints) * 100)}%</td>
        </tr>
        <tr>
            <td>Resolved Complaints</td>
            <td>${resolvedComplaints}</td>
            <td>${Math.round((resolvedComplaints / totalComplaints) * 100)}%</td>
        </tr>
    `;
    
    // Add more detailed statistics
    const complaintTypes = {};
    const divisionCounts = {};
    
    complaints.forEach(complaint => {
        // Count by type
        if (!complaintTypes[complaint.type]) {
            complaintTypes[complaint.type] = 0;
        }
        complaintTypes[complaint.type]++;
        
        // Count by division
        const division = complaint.division || 'Unassigned';
        if (!divisionCounts[division]) {
            divisionCounts[division] = 0;
        }
        divisionCounts[division]++;
    });
    
    // Add types to table
    const typeRows = Object.entries(complaintTypes)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
            <tr>
                <td>Complaint Type: ${type}</td>
                <td>${count}</td>
                <td>${Math.round((count / totalComplaints) * 100)}%</td>
            </tr>
        `).join('');
    
    tableBody.innerHTML += typeRows;
    
    // Add division counts to table
    const divisionRows = Object.entries(divisionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([division, count]) => `
            <tr>
                <td>Division: ${division}</td>
                <td>${count}</td>
                <td>${Math.round((count / totalComplaints) * 100)}%</td>
            </tr>
        `).join('');
    
    tableBody.innerHTML += divisionRows;
}

// Generate Complaints by Division Report
function generateComplaintsByDivisionReport(complaints) {
    // Set report title
    const divisionName = document.getElementById('complaintReportDivision').value;
    document.getElementById('reportTitle').textContent = divisionName === 'all' 
        ? 'Complaints by Division Report' 
        : `Complaints Report for ${divisionName} Division`;
    
    // Group complaints by division
    const divisionCounts = {};
    const divisionStatusCounts = {};
    
    complaints.forEach(complaint => {
        const division = complaint.division || 'Unassigned';
        
        // Count total by division
        if (!divisionCounts[division]) {
            divisionCounts[division] = 0;
            divisionStatusCounts[division] = {
                'Open': 0,
                'In Progress': 0,
                'Resolved': 0
            };
        }
        divisionCounts[division]++;
        
        // Count by status for each division
        const status = complaint.status || 'Open';
        divisionStatusCounts[division][status]++;
    });
    
    // Sort divisions by count (descending)
    const sortedDivisions = Object.entries(divisionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([division]) => division);
    
    // Create chart data
    const chartData = {
        labels: sortedDivisions,
        datasets: [
            {
                label: 'Open',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['Open']),
                backgroundColor: '#F44336'
            },
            {
                label: 'In Progress',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['In Progress']),
                backgroundColor: '#FFC107'
            },
            {
                label: 'Resolved',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['Resolved']),
                backgroundColor: '#4CAF50'
            }
        ]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Complaints by Division and Status'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Division'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Division</th>
            <th>Total Complaints</th>
            <th>Open</th>
            <th>In Progress</th>
            <th>Resolved</th>
            <th>Resolution Rate</th>
        </tr>
    `;
    
    tableBody.innerHTML = sortedDivisions.map(division => {
        const totalCount = divisionCounts[division];
        const openCount = divisionStatusCounts[division]['Open'];
        const inProgressCount = divisionStatusCounts[division]['In Progress'];
        const resolvedCount = divisionStatusCounts[division]['Resolved'];
        const resolutionRate = Math.round((resolvedCount / totalCount) * 100);
        
        return `
            <tr>
                <td>${division}</td>
                <td>${totalCount}</td>
                <td>${openCount}</td>
                <td>${inProgressCount}</td>
                <td>${resolvedCount}</td>
                <td>${resolutionRate}%</td>
            </tr>
        `;
    }).join('');
}

// Generate Complaints by Type Report
function generateComplaintsByTypeReport(complaints) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Complaints by Type Report';
    
    // Group complaints by type
    const typeCounts = {};
    const typeStatusCounts = {};
    
    complaints.forEach(complaint => {
        const type = complaint.type || 'Unknown';
        
        // Count total by type
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
            typeStatusCounts[type] = {
                'Open': 0,
                'In Progress': 0,
                'Resolved': 0
            };
        }
        typeCounts[type]++;
        
        // Count by status for each type
        const status = complaint.status || 'Open';
        typeStatusCounts[type][status]++;
    });
    
    // Sort types by count (descending)
    const sortedTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type);
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: sortedTypes,
            datasets: [
                {
                    label: 'Total Complaints',
                    data: sortedTypes.map(type => typeCounts[type]),
                    backgroundColor: '#2196F3'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Complaints by Type'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Complaint Type</th>
            <th>Total Complaints</th>
            <th>Open</th>
            <th>In Progress</th>
            <th>Resolved</th>
            <th>Resolution Rate</th>
        </tr>
    `;
    
    tableBody.innerHTML = sortedTypes.map(type => {
        const totalCount = typeCounts[type];
        const openCount = typeStatusCounts[type]['Open'];
        const inProgressCount = typeStatusCounts[type]['In Progress'];
        const resolvedCount = typeStatusCounts[type]['Resolved'];
        const resolutionRate = Math.round((resolvedCount / totalCount) * 100);
        
        return `
            <tr>
                <td>${type}</td>
                <td>${totalCount}</td>
                <td>${openCount}</td>
                <td>${inProgressCount}</td>
                <td>${resolvedCount}</td>
                <td>${resolutionRate}%</td>
            </tr>
        `;
    }).join('');
}

// Generate Resolution Time Report
function generateResolutionTimeReport(complaints) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Resolution Time Analysis Report';
    
    // Filter only resolved complaints with resolution metrics
    const resolvedComplaints = complaints.filter(c => 
        c.status === 'Resolved' && c.resolutionMetrics
    );
    
    if (resolvedComplaints.length === 0) {
        showToast('warning', 'No Data', 'No resolved complaints found with resolution time data');
        return;
    }
    
    // Calculate resolution times and organize by priority
    const priorityGroups = {
        'critical': { count: 0, onTime: 0, avgTimeMs: 0, complaints: [] },
        'high': { count: 0, onTime: 0, avgTimeMs: 0, complaints: [] },
        'medium': { count: 0, onTime: 0, avgTimeMs: 0, complaints: [] },
        'low': { count: 0, onTime: 0, avgTimeMs: 0, complaints: [] },
        'unknown': { count: 0, onTime: 0, avgTimeMs: 0, complaints: [] }
    };
    
    resolvedComplaints.forEach(complaint => {
        // Determine priority
        const priority = (complaint.slaPriority || 'unknown').toLowerCase();
        
        // Add to the appropriate group
        if (priorityGroups[priority]) {
            priorityGroups[priority].count++;
            priorityGroups[priority].complaints.push(complaint);
            
            // Check if resolved on time
            if (complaint.resolutionMetrics.resolvedOnTime) {
                priorityGroups[priority].onTime++;
            }
            
            // Add to total time (for calculating average)
            priorityGroups[priority].avgTimeMs += Math.abs(complaint.resolutionMetrics.timeDifference);
        } else {
            priorityGroups.unknown.count++;
            priorityGroups.unknown.complaints.push(complaint);
        }
    });
    
    // Calculate averages
    Object.keys(priorityGroups).forEach(priority => {
        const group = priorityGroups[priority];
        if (group.count > 0) {
            group.avgTimeMs = group.avgTimeMs / group.count;
        }
    });
    
    // Create chart data
    const chartLabels = [];
    const onTimeData = [];
    const lateData = [];
    
    for (const [priority, group] of Object.entries(priorityGroups)) {
        if (group.count > 0) {
            const formattedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
            chartLabels.push(formattedPriority);
            onTimeData.push(group.onTime);
            lateData.push(group.count - group.onTime);
        }
    }
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Resolved On Time',
                    data: onTimeData,
                    backgroundColor: '#4CAF50'
                },
                {
                    label: 'Resolved Late',
                    data: lateData,
                    backgroundColor: '#F44336'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Resolution Time by Priority'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Priority'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Priority</th>
            <th>Total Resolved</th>
            <th>Resolved On Time</th>
            <th>Resolved Late</th>
            <th>On-Time Rate</th>
            <th>Average Resolution Time</th>
        </tr>
    `;
    
    tableBody.innerHTML = Object.entries(priorityGroups)
        .filter(([_, group]) => group.count > 0)
        .map(([priority, group]) => {
            const formattedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
            const onTimeRate = Math.round((group.onTime / group.count) * 100);
            
            // Format average time
            const avgTimeMs = group.avgTimeMs;
            let avgTimeFormatted;
            
            if (avgTimeMs < 60 * 60 * 1000) {
                // Less than an hour
                avgTimeFormatted = `${Math.round(avgTimeMs / (60 * 1000))} minutes`;
            } else if (avgTimeMs < 24 * 60 * 60 * 1000) {
                // Less than a day
                avgTimeFormatted = `${Math.round(avgTimeMs / (60 * 60 * 1000))} hours`;
            } else {
                // Days
                avgTimeFormatted = `${Math.round(avgTimeMs / (24 * 60 * 60 * 1000))} days`;
            }
            
            return `
                <tr>
                    <td>${formattedPriority}</td>
                    <td>${group.count}</td>
                    <td>${group.onTime}</td>
                    <td>${group.count - group.onTime}</td>
                    <td>${onTimeRate}%</td>
                    <td>${avgTimeFormatted}</td>
                </tr>
            `;
        }).join('');
}

// Generate Complaint Trend Report
function generateComplaintTrendReport(complaints, startDate, endDate) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Complaint Trend Analysis Report';
    
    // Determine date range and group by
    const dateRange = (endDate - startDate) / (1000 * 60 * 60 * 24); // days
    let groupBy, format, unit;
    
    if (dateRange <= 31) {
        // Group by day for ranges up to a month
        groupBy = 'day';
        format = 'MMM D';
        unit = 'day';
    } else if (dateRange <= 183) {
        // Group by week for ranges up to 6 months
        groupBy = 'week';
        format = 'MMM D';
        unit = 'week';
    } else {
        // Group by month for longer ranges
        groupBy = 'month';
        format = 'MMM YYYY';
        unit = 'month';
    }
    
    // Build trend data
    const trendData = {};
    
    // Initialize all dates in range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        let key;
        
        if (groupBy === 'day') {
            key = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
        } else if (groupBy === 'week') {
            // Get first day of the week (Sunday)
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            key = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
            key = currentDate.toISOString().slice(0, 7); // YYYY-MM
        }
        
        if (!trendData[key]) {
            trendData[key] = {
                date: new Date(currentDate),
                count: 0,
                byStatus: {
                    'Open': 0,
                    'In Progress': 0,
                    'Resolved': 0
                }
            };
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count complaints by period
    complaints.forEach(complaint => {
        const complaintDate = new Date(complaint.createdDate);
        let key;
        
        if (groupBy === 'day') {
            key = complaintDate.toISOString().slice(0, 10);
        } else if (groupBy === 'week') {
            const weekStart = new Date(complaintDate);
            weekStart.setDate(complaintDate.getDate() - complaintDate.getDay());
            key = weekStart.toISOString().slice(0, 10);
        } else if (groupBy === 'month') {
            key = complaintDate.toISOString().slice(0, 7);
        }
        
        if (trendData[key]) {
            trendData[key].count++;
            
            // Count by status
            const status = complaint.status || 'Open';
            trendData[key].byStatus[status]++;
        }
    });
    
    // Convert to sorted array and format for chart
    const trendArray = Object.entries(trendData)
        .map(([key, data]) => ({ key, ...data }))
        .sort((a, b) => a.date - b.date);
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    // Load moment.js helper
    window.moment = window.moment || {
        format: function(date, formatStr) {
            const d = new Date(date);
            const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
            return `${month} ${d.getDate()}`;
        }
    };
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: trendArray.map(d => {
                if (typeof moment !== 'undefined') {
                    return moment(d.date).format(format);
                } else {
                    return new Date(d.date).toLocaleDateString();
                }
            }),
            datasets: [
                {
                    label: 'Total Complaints',
                    data: trendArray.map(d => d.count),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Complaint Trend (by ${groupBy})`
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: `Time (${groupBy})`
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Time Period</th>
            <th>Total Complaints</th>
            <th>Open</th>
            <th>In Progress</th>
            <th>Resolved</th>
        </tr>
    `;
    
    tableBody.innerHTML = trendArray.map(data => {
        const formattedDate = typeof moment !== 'undefined' 
            ? moment(data.date).format(format)
            : new Date(data.date).toLocaleDateString();
            
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${data.count}</td>
                <td>${data.byStatus['Open']}</td>
                <td>${data.byStatus['In Progress']}</td>
                <td>${data.byStatus['Resolved']}</td>
            </tr>
        `;
    }).join('');
}

// Generate Charger Report
function generateChargerReport() {
    const reportType = document.getElementById('chargerReportType').value;
    const division = document.getElementById('chargerReportDivision').value;
    const status = document.getElementById('chargerReportStatus').value;
    
    // Get chargers data
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Filter by division if needed
    let filteredChargers = chargers;
    
    if (division !== 'all') {
        filteredChargers = filteredChargers.filter(charger => charger.division === division);
    }
    
    // Filter by status if needed
    if (status !== 'all') {
        filteredChargers = filteredChargers.filter(charger => 
            charger.status && charger.status.toLowerCase() === status.toLowerCase()
        );
    }
    
    if (filteredChargers.length === 0) {
        showToast('warning', 'No Data', 'No chargers found for the selected criteria');
        return;
    }
    
    // Generate appropriate report based on type
    switch(reportType) {
        case 'summary':
            generateChargerSummaryReport(filteredChargers);
            break;
        case 'division':
            generateChargersByDivisionReport(filteredChargers);
            break;
        case 'status':
            generateChargersByStatusReport(filteredChargers);
            break;
        case 'issues':
            generateFrequentIssuesReport(filteredChargers);
            break;
    }
    
    // Show report container
    document.getElementById('reportResultsContainer').style.display = 'block';
    
    // Store current report data for export
    window.currentReportData = {
        type: 'charger',
        subtype: reportType,
        title: document.getElementById('reportTitle').textContent,
        data: filteredChargers
    };
}

// Generate Charger Summary Report
function generateChargerSummaryReport(chargers) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Charger Summary Report';
    
    // Calculate summary statistics
    const totalChargers = chargers.length;
    const activeChargers = chargers.filter(c => c.status === 'active').length;
    const inactiveChargers = chargers.filter(c => c.status === 'inactive').length;
    const maintenanceChargers = chargers.filter(c => c.status === 'maintenance').length;
    
    // Status distribution for chart
    const statusData = [
        { status: 'Active', count: activeChargers },
        { status: 'Inactive', count: inactiveChargers },
        { status: 'Under Maintenance', count: maintenanceChargers }
    ];
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'pie',
        data: {
            labels: statusData.map(d => d.status),
            datasets: [{
                data: statusData.map(d => d.count),
                backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Charger Status Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / totalChargers) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Count chargers by type
    const typeCounts = {};
    
    chargers.forEach(charger => {
        const type = charger.type || 'Unknown';
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
        }
        typeCounts[type]++;
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Percentage</th>
        </tr>
    `;
    
    tableBody.innerHTML = `
        <tr>
            <td>Total Chargers</td>
            <td>${totalChargers}</td>
            <td>100%</td>
        </tr>
        <tr>
            <td>Active Chargers</td>
            <td>${activeChargers}</td>
            <td>${Math.round((activeChargers / totalChargers) * 100)}%</td>
        </tr>
        <tr>
            <td>Inactive Chargers</td>
            <td>${inactiveChargers}</td>
            <td>${Math.round((inactiveChargers / totalChargers) * 100)}%</td>
        </tr>
        <tr>
            <td>Chargers Under Maintenance</td>
            <td>${maintenanceChargers}</td>
            <td>${Math.round((maintenanceChargers / totalChargers) * 100)}%</td>
        </tr>
    `;
    
    // Add types to table
    const typeRows = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
            <tr>
                <td>Charger Type: ${type}</td>
                <td>${count}</td>
                <td>${Math.round((count / totalChargers) * 100)}%</td>
            </tr>
        `).join('');
    
    tableBody.innerHTML += typeRows;
}

// Generate Chargers by Division Report
function generateChargersByDivisionReport(chargers) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Chargers by Division Report';
    
    // Group chargers by division
    const divisionCounts = {};
    const divisionStatusCounts = {};
    
    chargers.forEach(charger => {
        const division = charger.division || 'Unassigned';
        
        // Count total by division
        if (!divisionCounts[division]) {
            divisionCounts[division] = 0;
            divisionStatusCounts[division] = {
                'active': 0,
                'inactive': 0,
                'maintenance': 0
            };
        }
        divisionCounts[division]++;
        
        // Count by status for each division
        const status = (charger.status || 'active').toLowerCase();
        divisionStatusCounts[division][status]++;
    });
    
    // Sort divisions by count (descending)
    const sortedDivisions = Object.entries(divisionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([division]) => division);
    
    // Create chart data
    const chartData = {
        labels: sortedDivisions,
        datasets: [
            {
                label: 'Active',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['active']),
                backgroundColor: '#4CAF50'
            },
            {
                label: 'Inactive',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['inactive']),
                backgroundColor: '#F44336'
            },
            {
                label: 'Under Maintenance',
                data: sortedDivisions.map(div => divisionStatusCounts[div]['maintenance']),
                backgroundColor: '#FFC107'
            }
        ]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Chargers by Division and Status'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Division'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Chargers'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Division</th>
            <th>Total Chargers</th>
            <th>Active</th>
            <th>Inactive</th>
            <th>Under Maintenance</th>
            <th>Operational Rate</th>
        </tr>
    `;
    
    tableBody.innerHTML = sortedDivisions.map(division => {
        const totalCount = divisionCounts[division];
        const activeCount = divisionStatusCounts[division]['active'];
        const inactiveCount = divisionStatusCounts[division]['inactive'];
        const maintenanceCount = divisionStatusCounts[division]['maintenance'];
        const operationalRate = Math.round((activeCount / totalCount) * 100);
        
        return `
            <tr>
                // Continued implementation from the previous section

                <td>${division}</td>
                <td>${totalCount}</td>
                <td>${activeCount}</td>
                <td>${inactiveCount}</td>
                <td>${maintenanceCount}</td>
                <td>${operationalRate}%</td>
            </tr>
        `;
    }).join('');
}

// Generate Chargers by Status Report
function generateChargersByStatusReport(chargers) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Chargers by Status Report';
    
    // Count chargers by status
    const statusCounts = {
        'active': 0,
        'inactive': 0,
        'maintenance': 0
    };
    
    chargers.forEach(charger => {
        const status = (charger.status || 'active').toLowerCase();
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        }
    });
    
    // Create chart data
    const chartData = {
        labels: ['Active', 'Inactive', 'Under Maintenance'],
        datasets: [{
            data: [
                statusCounts['active'],
                statusCounts['inactive'],
                statusCounts['maintenance']
            ],
            backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
            borderWidth: 1
        }]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Charger Status Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / chargers.length) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Group by type and status
    const typeStatusCounts = {};
    
    chargers.forEach(charger => {
        const type = charger.type || 'Unknown';
        const status = (charger.status || 'active').toLowerCase();
        
        if (!typeStatusCounts[type]) {
            typeStatusCounts[type] = {
                'active': 0,
                'inactive': 0,
                'maintenance': 0,
                'total': 0
            };
        }
        
        typeStatusCounts[type][status]++;
        typeStatusCounts[type].total++;
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Percentage</th>
        </tr>
    `;
    
    // Add status rows
    tableBody.innerHTML = `
        <tr>
            <td>Active</td>
            <td>${statusCounts['active']}</td>
            <td>${Math.round((statusCounts['active'] / chargers.length) * 100)}%</td>
        </tr>
        <tr>
            <td>Inactive</td>
            <td>${statusCounts['inactive']}</td>
            <td>${Math.round((statusCounts['inactive'] / chargers.length) * 100)}%</td>
        </tr>
        <tr>
            <td>Under Maintenance</td>
            <td>${statusCounts['maintenance']}</td>
            <td>${Math.round((statusCounts['maintenance'] / chargers.length) * 100)}%</td>
        </tr>
    `;
    
    // Add separator row
    tableBody.innerHTML += `
        <tr class="separator">
            <td colspan="3"><strong>Status by Charger Type</strong></td>
        </tr>
    `;
    
    // Add type status breakdown
    Object.entries(typeStatusCounts).forEach(([type, counts]) => {
        tableBody.innerHTML += `
            <tr>
                <td colspan="3"><strong>${type}</strong> (Total: ${counts.total})</td>
            </tr>
            <tr>
                <td class="sub-item">Active</td>
                <td>${counts.active}</td>
                <td>${Math.round((counts.active / counts.total) * 100)}%</td>
            </tr>
            <tr>
                <td class="sub-item">Inactive</td>
                <td>${counts.inactive}</td>
                <td>${Math.round((counts.inactive / counts.total) * 100)}%</td>
            </tr>
            <tr>
                <td class="sub-item">Under Maintenance</td>
                <td>${counts.maintenance}</td>
                <td>${Math.round((counts.maintenance / counts.total) * 100)}%</td>
            </tr>
        `;
    });
}

// Generate Frequent Issues Report
function generateFrequentIssuesReport(chargers) {
    // Set report title
    document.getElementById('reportTitle').textContent = 'Frequent Charger Issues Report';
    
    // Get complaints data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Filter complaints related to the filtered chargers
    const chargerIds = chargers.map(c => c.id);
    const chargerComplaints = complaints.filter(c => chargerIds.includes(c.chargerID));
    
    if (chargerComplaints.length === 0) {
        showToast('warning', 'No Data', 'No complaints found for the selected chargers');
        return;
    }
    
    // Count complaints by type
    const typeCounts = {};
    
    chargerComplaints.forEach(complaint => {
        const type = complaint.type || 'Unknown';
        
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
        }
        typeCounts[type]++;
    });
    
    // Sort types by count (descending)
    const sortedTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 issues
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: sortedTypes.map(([type]) => type),
            datasets: [{
                label: 'Number of Complaints',
                data: sortedTypes.map(([_, count]) => count),
                backgroundColor: '#2196F3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top Issues by Complaint Type'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    }
                }
            }
        }
    });
    
    // Count chargers with most complaints
    const chargerComplaintCounts = {};
    
    chargerComplaints.forEach(complaint => {
        const chargerId = complaint.chargerID;
        
        if (!chargerComplaintCounts[chargerId]) {
            chargerComplaintCounts[chargerId] = {
                count: 0,
                charger: chargers.find(c => c.id === chargerId)
            };
        }
        chargerComplaintCounts[chargerId].count++;
    });
    
    // Sort chargers by complaint count (descending)
    const sortedChargers = Object.entries(chargerComplaintCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10); // Top 10 problematic chargers
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Issue Type</th>
            <th>Count</th>
            <th>Percentage</th>
        </tr>
    `;
    
    // Add issue type rows
    tableBody.innerHTML = sortedTypes.map(([type, count]) => `
        <tr>
            <td>${type}</td>
            <td>${count}</td>
            <td>${Math.round((count / chargerComplaints.length) * 100)}%</td>
        </tr>
    `).join('');
    
    // Add separator row
    tableBody.innerHTML += `
        <tr class="separator">
            <td colspan="3"><strong>Most Problematic Chargers</strong></td>
        </tr>
        <tr>
            <th>Charger ID</th>
            <th>Location</th>
            <th>Complaints</th>
        </tr>
    `;
    
    // Add top problematic chargers
    tableBody.innerHTML += sortedChargers.map(([id, data]) => `
        <tr>
            <td>${id}</td>
            <td>${data.charger ? data.charger.location : 'Unknown'}</td>
            <td>${data.count}</td>
        </tr>
    `).join('');
}

// Generate Vendor Report
function generateVendorReport() {
    const reportType = document.getElementById('vendorReportType').value;
    const dateFrom = document.getElementById('vendorDateFrom').value;
    const dateTo = document.getElementById('vendorDateTo').value;
    const vendorName = document.getElementById('vendorSelect').value;
    
    // Validate dates
    if (!dateFrom || !dateTo) {
        showToast('error', 'Date Required', 'Please select both start and end dates');
        return;
    }
    
    // Get complaints and vendors data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    
    // Filter by date range
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59); // End of the day
    
    let filteredComplaints = complaints.filter(complaint => {
        const complaintDate = new Date(complaint.createdDate);
        return complaintDate >= startDate && complaintDate <= endDate;
    });
    
    // Filter by vendor if needed
    if (vendorName !== 'all') {
        filteredComplaints = filteredComplaints.filter(complaint => 
            complaint.assignedTo === vendorName
        );
    } else {
        // Only include complaints assigned to any vendor
        filteredComplaints = filteredComplaints.filter(complaint => 
            complaint.assignedTo && vendors.some(v => v.name === complaint.assignedTo)
        );
    }
    
    if (filteredComplaints.length === 0) {
        showToast('warning', 'No Data', 'No vendor-assigned complaints found for the selected criteria');
        return;
    }
    
    // Generate appropriate report based on type
    switch(reportType) {
        case 'performance':
            generateVendorPerformanceReport(filteredComplaints, vendors);
            break;
        case 'resolution':
            generateVendorResolutionReport(filteredComplaints, vendors);
            break;
        case 'sla':
            generateVendorSLAReport(filteredComplaints, vendors);
            break;
    }
    
    // Show report container
    document.getElementById('reportResultsContainer').style.display = 'block';
    
    // Store current report data for export
    window.currentReportData = {
        type: 'vendor',
        subtype: reportType,
        title: document.getElementById('reportTitle').textContent,
        data: filteredComplaints
    };
}

// Generate Vendor Performance Report
function generateVendorPerformanceReport(complaints, vendors) {
    // Set report title
    const vendorName = document.getElementById('vendorSelect').value;
    document.getElementById('reportTitle').textContent = vendorName === 'all' 
        ? 'Vendor Performance Summary' 
        : `Performance Report for ${vendorName}`;
    
    // Group complaints by vendor
    const vendorStats = {};
    
    vendors.forEach(vendor => {
        vendorStats[vendor.name] = {
            name: vendor.name,
            totalAssigned: 0,
            resolved: 0,
            open: 0,
            inProgress: 0,
            avgResolutionTime: 0, // in hours
            totalResolutionTime: 0,
            resolvedComplaints: []
        };
    });
    
    complaints.forEach(complaint => {
        const vendor = complaint.assignedTo;
        
        if (vendorStats[vendor]) {
            vendorStats[vendor].totalAssigned++;
            
            if (complaint.status === 'Resolved') {
                vendorStats[vendor].resolved++;
                
                // Calculate resolution time if available
                if (complaint.resolutionMetrics && complaint.resolutionMetrics.timeDifference) {
                    const resolutionTimeHours = Math.abs(complaint.resolutionMetrics.timeDifference) / (1000 * 60 * 60);
                    vendorStats[vendor].totalResolutionTime += resolutionTimeHours;
                    vendorStats[vendor].resolvedComplaints.push(complaint);
                }
            } else if (complaint.status === 'In Progress') {
                vendorStats[vendor].inProgress++;
            } else {
                vendorStats[vendor].open++;
            }
        }
    });
    
    // Calculate average resolution time
    Object.keys(vendorStats).forEach(vendor => {
        if (vendorStats[vendor].resolved > 0) {
            vendorStats[vendor].avgResolutionTime = 
                vendorStats[vendor].totalResolutionTime / vendorStats[vendor].resolved;
        }
    });
    
    // Filter by specific vendor if selected
    let reportVendors = Object.values(vendorStats);
    
    if (vendorName !== 'all') {
        reportVendors = reportVendors.filter(v => v.name === vendorName);
    }
    
    // Sort by total assigned (descending)
    reportVendors.sort((a, b) => b.totalAssigned - a.totalAssigned);
    
    // Create chart data
    const chartData = {
        labels: reportVendors.map(v => v.name),
        datasets: [
            {
                label: 'Resolved',
                data: reportVendors.map(v => v.resolved),
                backgroundColor: '#4CAF50'
            },
            {
                label: 'In Progress',
                data: reportVendors.map(v => v.inProgress),
                backgroundColor: '#FFC107'
            },
            {
                label: 'Open',
                data: reportVendors.map(v => v.open),
                backgroundColor: '#F44336'
            }
        ]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Vendor Complaint Status'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Vendor'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Complaints'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Vendor</th>
            <th>Total Assigned</th>
            <th>Resolved</th>
            <th>In Progress</th>
            <th>Open</th>
            <th>Resolution Rate</th>
            <th>Avg Resolution Time</th>
        </tr>
    `;
    
    tableBody.innerHTML = reportVendors.map(vendor => {
        const resolutionRate = vendor.totalAssigned > 0 
            ? Math.round((vendor.resolved / vendor.totalAssigned) * 100) 
            : 0;
            
        // Format avg resolution time
        let avgTimeFormatted = 'N/A';
        if (vendor.resolved > 0) {
            const avgHours = vendor.avgResolutionTime;
            if (avgHours < 24) {
                avgTimeFormatted = `${avgHours.toFixed(1)} hours`;
            } else {
                avgTimeFormatted = `${(avgHours / 24).toFixed(1)} days`;
            }
        }
        
        return `
            <tr>
                <td>${vendor.name}</td>
                <td>${vendor.totalAssigned}</td>
                <td>${vendor.resolved}</td>
                <td>${vendor.inProgress}</td>
                <td>${vendor.open}</td>
                <td>${resolutionRate}%</td>
                <td>${avgTimeFormatted}</td>
            </tr>
        `;
    }).join('');
}

// Generate Vendor Resolution Time Report
function generateVendorResolutionReport(complaints, vendors) {
    // Set report title
    const vendorName = document.getElementById('vendorSelect').value;
    document.getElementById('reportTitle').textContent = vendorName === 'all' 
        ? 'Vendor Resolution Time Analysis' 
        : `Resolution Time Analysis for ${vendorName}`;
    
    // Filter only resolved complaints with resolution metrics
    const resolvedComplaints = complaints.filter(c => 
        c.status === 'Resolved' && c.resolutionMetrics
    );
    
    if (resolvedComplaints.length === 0) {
        showToast('warning', 'No Data', 'No resolved complaints found with resolution time data');
        return;
    }
    
    // Group complaints by vendor
    const vendorResolutionData = {};
    
    vendors.forEach(vendor => {
        vendorResolutionData[vendor.name] = {
            name: vendor.name,
            totalResolved: 0,
            onTime: 0,
            late: 0,
            avgTimeHours: 0,
            totalTimeHours: 0,
            byPriority: {
                critical: { count: 0, onTime: 0, avgHours: 0 },
                high: { count: 0, onTime: 0, avgHours: 0 },
                medium: { count: 0, onTime: 0, avgHours: 0 },
                low: { count: 0, onTime: 0, avgHours: 0 }
            }
        };
    });
    
    resolvedComplaints.forEach(complaint => {
        const vendor = complaint.assignedTo;
        
        if (vendorResolutionData[vendor]) {
            vendorResolutionData[vendor].totalResolved++;
            
            // On-time or late resolution
            if (complaint.resolutionMetrics.resolvedOnTime) {
                vendorResolutionData[vendor].onTime++;
            } else {
                vendorResolutionData[vendor].late++;
            }
            
            // Calculate resolution time
            const resolutionTimeHours = Math.abs(complaint.resolutionMetrics.timeDifference) / (1000 * 60 * 60);
            vendorResolutionData[vendor].totalTimeHours += resolutionTimeHours;
            
            // Group by priority
            const priority = (complaint.slaPriority || 'medium').toLowerCase();
            if (vendorResolutionData[vendor].byPriority[priority]) {
                vendorResolutionData[vendor].byPriority[priority].count++;
                
                if (complaint.resolutionMetrics.resolvedOnTime) {
                    vendorResolutionData[vendor].byPriority[priority].onTime++;
                }
                
                vendorResolutionData[vendor].byPriority[priority].avgHours = 
                    (vendorResolutionData[vendor].byPriority[priority].avgHours * 
                    (vendorResolutionData[vendor].byPriority[priority].count - 1) + 
                    resolutionTimeHours) / vendorResolutionData[vendor].byPriority[priority].count;
            }
        }
    });
    
    // Calculate average resolution time
    Object.keys(vendorResolutionData).forEach(vendor => {
        if (vendorResolutionData[vendor].totalResolved > 0) {
            vendorResolutionData[vendor].avgTimeHours = 
                vendorResolutionData[vendor].totalTimeHours / vendorResolutionData[vendor].totalResolved;
        }
    });
    
    // Filter by specific vendor if selected
    let reportVendors = Object.values(vendorResolutionData)
        .filter(v => v.totalResolved > 0); // Only include vendors with resolved complaints
    
    if (vendorName !== 'all') {
        reportVendors = reportVendors.filter(v => v.name === vendorName);
    }
    
    // Sort by average resolution time (ascending)
    reportVendors.sort((a, b) => a.avgTimeHours - b.avgTimeHours);
    
    // Create chart data
    const chartLabels = reportVendors.map(v => v.name);
    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Average Resolution Time (Hours)',
                data: reportVendors.map(v => v.avgTimeHours.toFixed(1)),
                backgroundColor: '#2196F3',
                yAxisID: 'y',
                type: 'bar'
            },
            {
                label: 'On-Time Resolution Rate (%)',
                data: reportVendors.map(v => 
                    Math.round((v.onTime / v.totalResolved) * 100)
                ),
                borderColor: '#4CAF50',
                backgroundColor: '#4CAF50',
                yAxisID: 'y1',
                type: 'line',
                fill: false
            }
        ]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Vendor Resolution Time Analysis'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'On-Time %'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Vendor</th>
            <th>Total Resolved</th>
            <th>Resolved On-Time</th>
            <th>Resolved Late</th>
            <th>On-Time Rate</th>
            <th>Avg Resolution Time</th>
        </tr>
    `;
    
    tableBody.innerHTML = reportVendors.map(vendor => {
        const onTimeRate = Math.round((vendor.onTime / vendor.totalResolved) * 100);
        
        // Format avg resolution time
        let avgTimeFormatted;
        if (vendor.avgTimeHours < 24) {
            avgTimeFormatted = `${vendor.avgTimeHours.toFixed(1)} hours`;
        } else {
            avgTimeFormatted = `${(vendor.avgTimeHours / 24).toFixed(1)} days`;
        }
        
        let rows = `
            <tr>
                <td>${vendor.name}</td>
                <td>${vendor.totalResolved}</td>
                <td>${vendor.onTime}</td>
                <td>${vendor.late}</td>
                <td>${onTimeRate}%</td>
                <td>${avgTimeFormatted}</td>
            </tr>
        `;
        
        // Only add priority breakdown for single-vendor reports
        if (vendorName !== 'all') {
            const priorities = ['critical', 'high', 'medium', 'low'];
            
            // Add separator row
            rows += `
                <tr class="separator">
                    <td colspan="6"><strong>Resolution Time by Priority</strong></td>
                </tr>
                <tr>
                    <th>Priority</th>
                    <th>Count</th>
                    <th>Resolved On-Time</th>
                    <th>On-Time Rate</th>
                    <th>Avg Resolution Time</th>
                    <th></th>
                </tr>
            `;
            
            // Add priority rows
            priorities.forEach(priority => {
                const priorityData = vendor.byPriority[priority];
                
                if (priorityData.count > 0) {
                    const priorityOnTimeRate = Math.round((priorityData.onTime / priorityData.count) * 100);
                    
                    // Format avg resolution time
                    let priorityAvgTimeFormatted;
                    if (priorityData.avgHours < 24) {
                        priorityAvgTimeFormatted = `${priorityData.avgHours.toFixed(1)} hours`;
                    } else {
                        priorityAvgTimeFormatted = `${(priorityData.avgHours / 24).toFixed(1)} days`;
                    }
                    
                    rows += `
                        <tr>
                            <td>${priority.charAt(0).toUpperCase() + priority.slice(1)}</td>
                            <td>${priorityData.count}</td>
                            <td>${priorityData.onTime}</td>
                            <td>${priorityOnTimeRate}%</td>
                            <td>${priorityAvgTimeFormatted}</td>
                            <td></td>
                        </tr>
                    `;
                }
            });
        }
        
        return rows;
    }).join('');
}

// Generate Vendor SLA Compliance Report
function generateVendorSLAReport(complaints, vendors) {
    // Set report title
    const vendorName = document.getElementById('vendorSelect').value;
    document.getElementById('reportTitle').textContent = vendorName === 'all' 
        ? 'Vendor SLA Compliance Report' 
        : `SLA Compliance Report for ${vendorName}`;
    
    // Filter only complaints with SLA data
    const slaComplaints = complaints.filter(c => c.slaPriority);
    
    if (slaComplaints.length === 0) {
        showToast('warning', 'No Data', 'No complaints found with SLA data');
        return;
    }
    
    // Group complaints by vendor
    const vendorSLAData = {};
    
    vendors.forEach(vendor => {
        vendorSLAData[vendor.name] = {
            name: vendor.name,
            totalWithSLA: 0,
            resolved: 0,
            resolvedOnTime: 0,
            byPriority: {
                critical: { total: 0, resolved: 0, onTime: 0 },
                high: { total: 0, resolved: 0, onTime: 0 },
                medium: { total: 0, resolved: 0, onTime: 0 },
                low: { total: 0, resolved: 0, onTime: 0 }
            }
        };
    });
    
    slaComplaints.forEach(complaint => {
        const vendor = complaint.assignedTo;
        
        if (vendorSLAData[vendor]) {
            vendorSLAData[vendor].totalWithSLA++;
            
            // Check resolved status
            if (complaint.status === 'Resolved') {
                vendorSLAData[vendor].resolved++;
                
                // Check if resolved on time
                if (complaint.resolutionMetrics && complaint.resolutionMetrics.resolvedOnTime) {
                    vendorSLAData[vendor].resolvedOnTime++;
                }
            }
            
            // Group by priority
            const priority = (complaint.slaPriority || 'medium').toLowerCase();
            if (vendorSLAData[vendor].byPriority[priority]) {
                vendorSLAData[vendor].byPriority[priority].total++;
                
                if (complaint.status === 'Resolved') {
                    vendorSLAData[vendor].byPriority[priority].resolved++;
                    
                    if (complaint.resolutionMetrics && complaint.resolutionMetrics.resolvedOnTime) {
                        vendorSLAData[vendor].byPriority[priority].onTime++;
                    }
                }
            }
        }
    });
    
    // Filter by specific vendor if selected
    let reportVendors = Object.values(vendorSLAData)
        .filter(v => v.totalWithSLA > 0); // Only include vendors with SLA complaints
    
    if (vendorName !== 'all') {
        reportVendors = reportVendors.filter(v => v.name === vendorName);
    }
    
    // Sort by SLA compliance rate (descending)
    reportVendors.sort((a, b) => {
        const aRate = a.resolved > 0 ? (a.resolvedOnTime / a.resolved) : 0;
        const bRate = b.resolved > 0 ? (b.resolvedOnTime / b.resolved) : 0;
        return bRate - aRate;
    });
    
    // Create chart data
    const chartData = {
        labels: reportVendors.map(v => v.name),
        datasets: [{
            label: 'SLA Compliance Rate (%)',
            data: reportVendors.map(v => 
                v.resolved > 0 ? Math.round((v.resolvedOnTime / v.resolved) * 100) : 0
            ),
            backgroundColor: reportVendors.map(v => {
                const rate = v.resolved > 0 ? (v.resolvedOnTime / v.resolved) : 0;
                return rate >= 0.9 ? '#4CAF50' : rate >= 0.7 ? '#FFC107' : '#F44336';
            }),
            borderWidth: 1
        }]
    };
    
    // Create chart
    const chartCanvas = document.getElementById('reportChart');
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    window.reportChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Vendor SLA Compliance Rate'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Compliance Rate (%)'
                    }
                }
            }
        }
    });
    
    // Create table
    const tableHead = document.querySelector('#reportTable thead');
    const tableBody = document.querySelector('#reportTable tbody');
    
    tableHead.innerHTML = `
        <tr>
            <th>Vendor</th>
            <th>Total With SLA</th>
            <th>Resolved</th>
            <th>Resolved On-Time</th>
            <th>SLA Compliance Rate</th>
        </tr>
    `;
    
    tableBody.innerHTML = reportVendors.map(vendor => {
        const complianceRate = vendor.resolved > 0 
            ? Math.round((vendor.resolvedOnTime / vendor.resolved) * 100) 
            : 0;
        
        let rows = `
            <tr>
                <td>${vendor.name}</td>
                <td>${vendor.totalWithSLA}</td>
                <td>${vendor.resolved}</td>
                <td>${vendor.resolvedOnTime}</td>
                <td>${complianceRate}%</td>
            </tr>
        `;
        
        // Only add priority breakdown for single-vendor reports
        if (vendorName !== 'all') {
            // Add separator row
            rows += `
                <tr class="separator">
                    <td colspan="5"><strong>SLA Compliance by Priority</strong></td>
                </tr>
                <tr>
                    <th>Priority</th>
                    <th>Total</th>
                    <th>Resolved</th>
                    <th>Resolved On-Time</th>
                    <th>Compliance Rate</th>
                </tr>
            `;
            
            // Add priority rows
            const priorities = ['critical', 'high', 'medium', 'low'];
            
            priorities.forEach(priority => {
                const priorityData = vendor.byPriority[priority];
                
                if (priorityData.total > 0) {
                    const priorityRate = priorityData.resolved > 0 
                        ? Math.round((priorityData.onTime / priorityData.resolved) * 100) 
                        : 0;
                    
                    rows += `
                        <tr>
                            <td>${priority.charAt(0).toUpperCase() + priority.slice(1)}</td>
                            <td>${priorityData.total}</td>
                            <td>${priorityData.resolved}</td>
                            <td>${priorityData.onTime}</td>
                            <td>${priorityRate}%</td>
                        </tr>
                    `;
                }
            });
        }
        
        return rows;
    }).join('');
}

// Print Report
function printReport() {
    const reportTitle = document.getElementById('reportTitle').textContent;
    const reportChart = document.getElementById('reportChart');
    const reportTable = document.getElementById('reportTable');
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>${reportTitle}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .report-date {
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 14px;
                    color: #666;
                }
                .chart-container {
                    text-align: center;
                    margin-bottom: 30px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                tr.separator td {
                    background-color: #f9f9f9;
                    font-weight: bold;
                }
                .footer {
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    margin-top: 50px;
                }
            </style>
        </head>
        <body>
            <h1>${reportTitle}</h1>
            <div class="report-date">Generated on: ${new Date().toLocaleString()}</div>
            
            <div class="chart-container">
                <img src="${reportChart.toDataURL('image/png')}" alt="Report Chart">
            </div>
            
            <table>
                ${reportTable.innerHTML}
            </table>
            
            <div class="footer">
                EV Charging Complaint Management System<br>
                Confidential Report - For Internal Use Only
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Export Current Report
function exportCurrentReport() {
    // Get current report data
    const reportData = window.currentReportData;
    
    if (!reportData) {
        showToast('error', 'No Report Data', 'No report data available for export');
        return;
    }
    
    // Export to Excel
    exportToExcel(reportData.type, reportData.subtype);
}

// Export to Excel function - handles all export types
function exportToExcel(dataType, subType) {
    // Load SheetJS if not already loaded
    if (typeof XLSX === 'undefined') {
        // Show loading toast
        showToast('info', 'Preparing Export', 'Loading Excel export functionality...');
        
        // Load SheetJS library
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() {
            // Call export function again after library is loaded
            exportToExcel(dataType, subType);
        };
        document.head.appendChild(script);
        return;
    }
    
    // Show loading toast
    showToast('info', 'Preparing Export', 'Generating Excel file...');
    
    // Get export data based on type
    let exportData = [];
    let fileName = '';
    
    switch (dataType) {
        case 'complaints':
            exportData = prepareComplaintsExport(subType);
            fileName = 'Complaints_Report.xlsx';
            break;
        case 'chargers':
            exportData = prepareChargersExport(subType);
            fileName = 'Chargers_Report.xlsx';
            break;
        case 'vendors':
            exportData = prepareVendorsExport(subType);
            fileName = 'Vendor_Performance_Report.xlsx';
            break;
        case 'all_complaints':
            exportData = prepareAllComplaintsExport();
            fileName = 'All_Complaints_Export.xlsx';
            break;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add each sheet to the workbook
    exportData.forEach(sheet => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    // Show success toast
    showToast('success', 'Export Completed', 'Excel file has been generated and downloaded');
}

// Prepare Complaints Export
function prepareComplaintsExport(subType) {
    // Get complaints data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Get date filters if available
    const dateFrom = document.getElementById('complaintDateFrom')?.value;
    const dateTo = document.getElementById('complaintDateTo')?.value;
    
    let filteredComplaints = complaints;
    
    // Apply date filters if available
    if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59); // End of the day
        
        filteredComplaints = complaints.filter(complaint => {
            const complaintDate = new Date(complaint.createdDate);
            return complaintDate >= startDate && complaintDate <= endDate;
        });
    }
    
    // Format for Excel export
    const mainSheet = {
        name: 'Complaints Summary',
        data: filteredComplaints.map(c => ({
            'Tracking ID': c.trackingId,
            'Charger ID': c.chargerID,
            'Type': c.type,
            'Sub Type': c.subType || '',
            'Status': c.status,
            'Division': c.division || 'Unassigned',
            'Assigned To': c.assignedTo || 'Not Assigned',
            'Customer Name': c.consumerName,
            'Customer Phone': c.consumerPhone,
            'Customer Email': c.consumerEmail || '',
            'Created Date': new Date(c.createdDate).toLocaleString(),
            'Last Updated': new Date(c.lastUpdated).toLocaleString(),
            'Priority': c.slaPriority || 'None',
            'Resolution Time': c.resolutionMetrics ? c.resolutionMetrics.formattedDifference : 'N/A'
        }))
    };
    
    // Create secondary sheets
    const sheets = [mainSheet];
    
    // Status summary sheet
    const statusCount = {
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0
    };
    
    filteredComplaints.forEach(c => {
        const status = c.status || 'Open';
        if (statusCount[status] !== undefined) {
            statusCount[status]++;
        }
    });
    
    const statusSheet = {
        name: 'Status Summary',
        data: Object.entries(statusCount).map(([status, count]) => ({
            'Status': status,
            'Count': count,
            'Percentage': `${Math.round((count / filteredComplaints.length) * 100)}%`
        }))
    };
    
    sheets.push(statusSheet);
    
    // Division summary sheet
    const divisionCounts = {};
    filteredComplaints.forEach(c => {
        const division = c.division || 'Unassigned';
        if (!divisionCounts[division]) {
            divisionCounts[division] = 0;
        }
        divisionCounts[division]++;
    });
    
    const divisionSheet = {
        name: 'Division Summary',
        data: Object.entries(divisionCounts).map(([division, count]) => ({
            'Division': division,
            'Count': count,
            'Percentage': `${Math.round((count / filteredComplaints.length) * 100)}%`
        }))
    };
    
    sheets.push(divisionSheet);
    
    // Type summary sheet
    const typeCounts = {};
    filteredComplaints.forEach(c => {
        const type = c.type || 'Unknown';
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
        }
        typeCounts[type]++;
    });
    
    const typeSheet = {
        name: 'Complaint Types',
        data: Object.entries(typeCounts).map(([type, count]) => ({
            'Type': type,
            'Count': count,
            'Percentage': `${Math.round((count / filteredComplaints.length) * 100)}%`
        }))
    };
    
    sheets.push(typeSheet);
    
    return sheets;
}

// Prepare All Complaints Export
function prepareAllComplaintsExport() {
    // Get complaints data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Get current filters
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const divisionFilter = document.getElementById('divisionFilter')?.value || 'all';
    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    // Apply filters
    let filteredComplaints = complaints;
    
    if (statusFilter !== 'all') {
        filteredComplaints = filteredComplaints.filter(c => 
            c.status && c.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    if (divisionFilter !== 'all') {
        filteredComplaints = filteredComplaints.filter(c => 
            c.division === divisionFilter
        );
    }
    
    if (typeFilter !== 'all') {
        filteredComplaints = filteredComplaints.filter(c => 
            c.type && (
                (typeFilter === 'charger' && !c.type.toLowerCase().includes('billing')) ||
                (typeFilter === 'billing' && c.type.toLowerCase().includes('billing'))
            )
        );
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredComplaints = filteredComplaints.filter(c => 
            new Date(c.createdDate) >= fromDate
        );
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59); // End of the day
        filteredComplaints = filteredComplaints.filter(c => 
            new Date(c.createdDate) <= toDate
        );
    }
    
    // Format for Excel export
    const mainSheet = {
        name: 'All Complaints',
        data: filteredComplaints.map(c => ({
            'Tracking ID': c.trackingId,
            'Charger ID': c.chargerID,
            'Customer Name': c.consumerName,
            'Customer Phone': c.consumerPhone,
            'Customer Email': c.consumerEmail || '',
            'Division': c.division || 'Unassigned',
            'Type': c.type,
            'Sub Type': c.subType || '',
            'Description': c.description,
            'Status': c.status,
            'Assigned To': c.assignedTo || 'Not Assigned',
            'Priority': c.slaPriority || 'None',
            'Created Date': new Date(c.createdDate).toLocaleString(),
            'Last Updated': new Date(c.lastUpdated).toLocaleString(),
            'Expected Resolution': c.expectedResolutionDate ? new Date(c.expectedResolutionDate).toLocaleString() : 'N/A',
            'Resolution Time': c.resolutionMetrics ? c.resolutionMetrics.formattedDifference : 'N/A',
            'On-Time Resolution': c.resolutionMetrics ? (c.resolutionMetrics.resolvedOnTime ? 'Yes' : 'No') : 'N/A'
        }))
    };
    
    return [mainSheet];
}

// Prepare Chargers Export
function prepareChargersExport(subType) {
    // Get chargers data
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Get division and status filters if available
    const divisionFilter = document.getElementById('chargerReportDivision')?.value || 'all';
    const statusFilter = document.getElementById('chargerReportStatus')?.value || 'all';
    
    let filteredChargers = chargers;
    
    // Apply division filter if needed
    if (divisionFilter !== 'all') {
        filteredChargers = filteredChargers.filter(charger => 
            charger.division === divisionFilter
        );
    }
    
    // Apply status filter if needed
    if (statusFilter !== 'all') {
        filteredChargers = filteredChargers.filter(charger => 
            charger.status && charger.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    // Format for Excel export
    const mainSheet = {
        name: 'Chargers',
        data: filteredChargers.map(c => {
            // Count complaints for this charger
            const chargerComplaints = complaints.filter(comp => comp.chargerID === c.id);
            const openComplaints = chargerComplaints.filter(comp => 
                comp.status === 'Open' || comp.status === 'In Progress'
            ).length;
            const resolvedComplaints = chargerComplaints.filter(comp => 
                comp.status === 'Resolved'
            ).length;
            
            return {
                'Charge Point ID': c.id,
                'Serial Number': c.serialNumber || 'N/A',
                'Location': c.location || 'Unknown',
                'Division': c.division || 'Unassigned',
                'Make': c.make || 'N/A',
                'Model': c.model || 'N/A',
                'Type': c.type || 'N/A',
                'Address': c.address || 'N/A',
                'Status': c.status || 'Unknown',
                'Commission Date': c.commissionDate ? new Date(c.commissionDate).toLocaleDateString() : 'N/A',
                'Last Updated': c.lastUpdated ? new Date(c.lastUpdated).toLocaleDateString() : 'N/A',
                'Total Complaints': chargerComplaints.length,
                'Open Complaints': openComplaints,
                'Resolved Complaints': resolvedComplaints
            };
        })
    };
    
    // Create secondary sheets
    const sheets = [mainSheet];
    
    // Status summary sheet
    const statusCount = {
        'active': 0,
        'inactive': 0,
        'maintenance': 0
    };
    
    filteredChargers.forEach(c => {
        const status = (c.status || 'active').toLowerCase();
        if (statusCount[status] !== undefined) {
            statusCount[status]++;
        }
    });
    
    const statusSheet = {
        name: 'Status Summary',
        data: Object.entries(statusCount).map(([status, count]) => ({
            'Status': status.charAt(0).toUpperCase() + status.slice(1),
            'Count': count,
            'Percentage': `${Math.round((count / filteredChargers.length) * 100)}%`
        }))
    };
    
    sheets.push(statusSheet);
    
    // Division summary sheet
    const divisionCounts = {};
    filteredChargers.forEach(c => {
        const division = c.division || 'Unassigned';
        if (!divisionCounts[division]) {
            divisionCounts[division] = {
                total: 0,
                active: 0,
                inactive: 0,
                maintenance: 0
            };
        }
        divisionCounts[division].total++;
        
        const status = (c.status || 'active').toLowerCase();
        if (divisionCounts[division][status] !== undefined) {
            divisionCounts[division][status]++;
        }
    });
    
    const divisionSheet = {
        name: 'Division Summary',
        data: Object.entries(divisionCounts).map(([division, counts]) => ({
            'Division': division,
            'Total Chargers': counts.total,
            'Active': counts.active,
            'Inactive': counts.inactive,
            'Under Maintenance': counts.maintenance,
            'Percentage': `${Math.round((counts.total / filteredChargers.length) * 100)}%`,
            'Operational Rate': `${Math.round((counts.active / counts.total) * 100)}%`
        }))
    };
    
    sheets.push(divisionSheet);
    
    // Type summary sheet
    const typeCounts = {};
    filteredChargers.forEach(c => {
        const type = c.type || 'Unknown';
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
        }
        typeCounts[type]++;
    });
    
    const typeSheet = {
        name: 'Charger Types',
        data: Object.entries(typeCounts).map(([type, count]) => ({
            'Type': type,
            'Count': count,
            'Percentage': `${Math.round((count / filteredChargers.length) * 100)}%`
        }))
    };
    
    sheets.push(typeSheet);
    
    return sheets;
}

// Prepare Vendors Export
function prepareVendorsExport(subType) {
    // Get vendors and complaints data
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Get vendor and date filters if available
    const vendorName = document.getElementById('vendorSelect')?.value || 'all';
    const dateFrom = document.getElementById('vendorDateFrom')?.value;
    const dateTo = document.getElementById('vendorDateTo')?.value;
    
    // Filter complaints by date first
    let filteredComplaints = complaints;
    
    if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59); // End of the day
        
        filteredComplaints = complaints.filter(complaint => {
            const complaintDate = new Date(complaint.createdDate);
            return complaintDate >= startDate && complaintDate <= endDate;
        });
    }
    
    // Filter by vendor if needed
    if (vendorName !== 'all') {
        filteredComplaints = filteredComplaints.filter(complaint => 
            complaint.assignedTo === vendorName
        );
    } else {
        // Only include complaints assigned to any vendor
        filteredComplaints = filteredComplaints.filter(complaint => 
            complaint.assignedTo && vendors.some(v => v.name === complaint.assignedTo)
        );
    }
    
    // Calculate vendor performance metrics
    const vendorMetrics = {};
    
    vendors.forEach(vendor => {
        vendorMetrics[vendor.name] = {
            name: vendor.name,
            totalAssigned: 0,
            resolved: 0,
            onTime: 0,
            late: 0,
            open: 0,
            inProgress: 0,
            avgResolutionTime: 0,
            totalResolutionTime: 0,
            resolvedComplaints: [],
            byPriority: {
                critical: { count: 0, resolved: 0, onTime: 0 },
                high: { count: 0, resolved: 0, onTime: 0 },
                medium: { count: 0, resolved: 0, onTime: 0 },
                low: { count: 0, resolved: 0, onTime: 0 }
            },
            byDivision: {}
        };
    });
    
    filteredComplaints.forEach(complaint => {
        const vendor = complaint.assignedTo;
        
        if (vendorMetrics[vendor]) {
            vendorMetrics[vendor].totalAssigned++;
            
            if (complaint.status === 'Resolved') {
                vendorMetrics[vendor].resolved++;
                
                // Check on-time resolution
                if (complaint.resolutionMetrics && complaint.resolutionMetrics.resolvedOnTime) {
                    vendorMetrics[vendor].onTime++;
                } else if (complaint.resolutionMetrics) {
                    vendorMetrics[vendor].late++;
                }
                
                // Calculate resolution time
                if (complaint.resolutionMetrics && complaint.resolutionMetrics.timeDifference) {
                    const resolutionTimeHours = Math.abs(complaint.resolutionMetrics.timeDifference) / (1000 * 60 * 60);
                    vendorMetrics[vendor].totalResolutionTime += resolutionTimeHours;
                    vendorMetrics[vendor].resolvedComplaints.push(complaint);
                }
            } else if (complaint.status === 'In Progress') {
                vendorMetrics[vendor].inProgress++;
            } else {
                vendorMetrics[vendor].open++;
            }
            
            // Group by priority
            const priority = (complaint.slaPriority || 'medium').toLowerCase();
            if (vendorMetrics[vendor].byPriority[priority]) {
                vendorMetrics[vendor].byPriority[priority].count++;
                
                if (complaint.status === 'Resolved') {
                    vendorMetrics[vendor].byPriority[priority].resolved++;
                    
                    if (complaint.resolutionMetrics && complaint.resolutionMetrics.resolvedOnTime) {
                        vendorMetrics[vendor].byPriority[priority].onTime++;
                    }
                }
            }
            
            // Group by division
            const division = complaint.division || 'Unassigned';
            if (!vendorMetrics[vendor].byDivision[division]) {
                vendorMetrics[vendor].byDivision[division] = {
                    count: 0,
                    resolved: 0,
                    onTime: 0
                };
            }
            
            vendorMetrics[vendor].byDivision[division].count++;
            
            if (complaint.status === 'Resolved') {
                vendorMetrics[vendor].byDivision[division].resolved++;
                
                if (complaint.resolutionMetrics && complaint.resolutionMetrics.resolvedOnTime) {
                    vendorMetrics[vendor].byDivision[division].onTime++;
                }
            }
        }
    });
    
    // Calculate average resolution time
    Object.keys(vendorMetrics).forEach(vendor => {
        if (vendorMetrics[vendor].resolved > 0) {
            vendorMetrics[vendor].avgResolutionTime = 
                vendorMetrics[vendor].totalResolutionTime / vendorMetrics[vendor].resolved;
        }
    });
    
    // Format for Excel export
    const mainSheet = {
        name: 'Vendor Performance Summary',
        data: Object.values(vendorMetrics)
            .filter(vendor => vendor.totalAssigned > 0) // Only include vendors with assigned complaints
            .map(vendor => {
                const resolutionRate = vendor.totalAssigned > 0 
                    ? Math.round((vendor.resolved / vendor.totalAssigned) * 100) 
                    : 0;
                    
                const onTimeRate = vendor.resolved > 0 
                    ? Math.round((vendor.onTime / vendor.resolved) * 100) 
                    : 0;
                    
                // Format avg resolution time
                let avgTimeFormatted = 'N/A';
                if (vendor.resolved > 0) {
                    if (vendor.avgResolutionTime < 24) {
                        avgTimeFormatted = `${vendor.avgResolutionTime.toFixed(1)} hours`;
                    } else {
                        avgTimeFormatted = `${(vendor.avgResolutionTime / 24).toFixed(1)} days`;
                    }
                }
                
                return {
                    'Vendor': vendor.name,
                    'Total Assigned': vendor.totalAssigned,
                    'Resolved': vendor.resolved,
                    'Resolved On-Time': vendor.onTime,
                    'Resolved Late': vendor.late,
                    'In Progress': vendor.inProgress,
                    'Open': vendor.open,
                    'Resolution Rate': `${resolutionRate}%`,
                    'SLA Compliance Rate': `${onTimeRate}%`,
                    'Average Resolution Time': avgTimeFormatted
                };
            })
    };
    
    // Create secondary sheets
    const sheets = [mainSheet];
    
    // Detailed vendor performance sheet - only if a single vendor is selected
    if (vendorName !== 'all' && vendorMetrics[vendorName]?.totalAssigned > 0) {
        const vendor = vendorMetrics[vendorName];
        
        // By priority sheet
        const prioritySheet = {
            name: 'Performance by Priority',
            data: Object.entries(vendor.byPriority)
                .filter(([_, data]) => data.count > 0)
                .map(([priority, data]) => {
                    const resolutionRate = data.count > 0 
                        ? Math.round((data.resolved / data.count) * 100) 
                        : 0;
                        
                    const onTimeRate = data.resolved > 0 
                        ? Math.round((data.onTime / data.resolved) * 100) 
                        : 0;
                        
                    return {
                        'Priority': priority.charAt(0).toUpperCase() + priority.slice(1),
                        'Total Assigned': data.count,
                        'Resolved': data.resolved,
                        'Resolved On-Time': data.onTime,
                        'Resolution Rate': `${resolutionRate}%`,
                        'SLA Compliance Rate': `${onTimeRate}%`
                    };
                })
        };
        
        sheets.push(prioritySheet);
        
        // By division sheet
        const divisionSheet = {
            name: 'Performance by Division',
            data: Object.entries(vendor.byDivision)
                .filter(([_, data]) => data.count > 0)
                .map(([division, data]) => {
                    const resolutionRate = data.count > 0 
                        ? Math.round((data.resolved / data.count) * 100) 
                        : 0;
                        
                    const onTimeRate = data.resolved > 0 
                        ? Math.round((data.onTime / data.resolved) * 100) 
                        : 0;
                        return {
                        'Division': division,
                        'Total Assigned': data.count,
                        'Resolved': data.resolved,
                        'Resolved On-Time': data.onTime,
                        'Resolution Rate': `${resolutionRate}%`,
                        'SLA Compliance Rate': `${onTimeRate}%`
                    };
                })
        };
        
        sheets.push(divisionSheet);
        
        // Detailed complaint list sheet
        const complaintsSheet = {
            name: 'Complaint Details',
            data: filteredComplaints.filter(c => c.assignedTo === vendorName).map(c => ({
                'Tracking ID': c.trackingId,
                'Charger ID': c.chargerID,
                'Division': c.division || 'Unassigned',
                'Type': c.type,
                'Status': c.status,
                'Priority': c.slaPriority || 'None',
                'Created Date': new Date(c.createdDate).toLocaleString(),
                'Last Updated': new Date(c.lastUpdated).toLocaleString(),
                'Expected Resolution': c.expectedResolutionDate ? new Date(c.expectedResolutionDate).toLocaleString() : 'N/A',
                'Resolved On-Time': c.resolutionMetrics ? (c.resolutionMetrics.resolvedOnTime ? 'Yes' : 'No') : 'N/A',
                'Resolution Time': c.resolutionMetrics ? c.resolutionMetrics.formattedDifference : 'N/A'
            }))
        };
        
        sheets.push(complaintsSheet);
    }
    
    return sheets;
}

// Setup Bulk Charger Upload
function setupBulkChargerUpload() {
    // Bulk Upload Button
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', showBulkUploadModal);
    }
    
    // Download Template Button
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadChargerTemplate);
    }
    
    // Close Bulk Upload Modal
    const closeBulkUploadModal = document.getElementById('closeBulkUploadModal');
    const cancelBulkUploadBtn = document.getElementById('cancelBulkUploadBtn');
    
    if (closeBulkUploadModal) {
        closeBulkUploadModal.addEventListener('click', () => {
            document.getElementById('bulkUploadModal').classList.remove('active');
        });
    }
    
    if (cancelBulkUploadBtn) {
        cancelBulkUploadBtn.addEventListener('click', () => {
            document.getElementById('bulkUploadModal').classList.remove('active');
        });
    }
    
    // File input change handler
    const fileInput = document.getElementById('chargerExcelFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Process Bulk Upload Button
    const processBulkUploadBtn = document.getElementById('processBulkUploadBtn');
    if (processBulkUploadBtn) {
        processBulkUploadBtn.addEventListener('click', processBulkUpload);
    }
}

// Show Bulk Upload Modal
function showBulkUploadModal() {
    // Reset the form
    resetBulkUploadForm();
    
    // Show modal
    document.getElementById('bulkUploadModal').classList.add('active');
}

// Reset Bulk Upload Form
function resetBulkUploadForm() {
    // Reset file input
    const fileInput = document.getElementById('chargerExcelFile');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Reset file name display
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (fileNameDisplay) {
        fileNameDisplay.textContent = 'Choose Excel File';
    }
    
    // Hide progress and validation
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('validationResults').style.display = 'none';
    
    // Disable process button
    document.getElementById('processBulkUploadBtn').disabled = true;
}

// Handle File Select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Display file name
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (fileNameDisplay) {
        fileNameDisplay.textContent = file.name;
    }
    
    // Show processing
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('progressFill').style.width = '30%';
    document.getElementById('progressText').textContent = 'Validating file...';
    
    // Validate file
    if (!validateFileExtension(file)) {
        showToast('error', 'Invalid File', 'Please select an Excel file (.xlsx or .xls)');
        resetBulkUploadForm();
        return;
    }
    
    // Process file
    processExcelFile(file);
}

// Validate File Extension
function validateFileExtension(file) {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    
    return validExtensions.some(ext => fileName.endsWith(ext));
}

// Process Excel File
function processExcelFile(file) {
    // Load SheetJS if not already loaded
    if (typeof XLSX === 'undefined') {
        // Show loading message
        document.getElementById('progressText').textContent = 'Loading Excel processor...';
        
        // Load SheetJS library
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() {
            // Call process file again after library is loaded
            processExcelFile(file);
        };
        document.head.appendChild(script);
        return;
    }
    
    // Update progress
    document.getElementById('progressFill').style.width = '50%';
    document.getElementById('progressText').textContent = 'Reading file contents...';
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Parse workbook
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            
            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Update progress
            document.getElementById('progressFill').style.width = '80%';
            document.getElementById('progressText').textContent = 'Validating charger data...';
            
            // Validate charger data
            validateChargerData(jsonData);
        } catch (error) {
            console.error('Error processing Excel file:', error);
            showToast('error', 'Processing Error', 'Could not process the Excel file. Please check the file format.');
            resetBulkUploadForm();
        }
    };
    
    reader.onerror = function() {
        showToast('error', 'File Error', 'Could not read the file. Please try again.');
        resetBulkUploadForm();
    };
    
    reader.readAsArrayBuffer(file);
}

// Validate Charger Data
function validateChargerData(data) {
    // Check if data is empty
    if (!data || data.length < 2) {
        showToast('error', 'Invalid Data', 'The Excel file does not contain valid charger data.');
        resetBulkUploadForm();
        return;
    }
    
    // Get headers (first row)
    const headers = data[0];
    
    // Check required headers
    const requiredHeaders = [
        'Charge Point ID',
        'Serial Number',
        'Location Name',
        'Make',
        'Model',
        'Division',
        'Charger Type',
        'Address',
        'Status'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
        showToast('error', 'Invalid Template', `Missing required headers: ${missingHeaders.join(', ')}`);
        resetBulkUploadForm();
        return;
    }
    
    // Get existing chargers for validation
    const existingChargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    const existingCPIDs = existingChargers.map(c => c.id);
    const existingSerialNumbers = existingChargers.map(c => c.serialNumber);
    
    // Get divisions for validation
    const divisions = JSON.parse(localStorage.getItem('divisions') || '[]');
    const divisionNames = divisions.map(d => d.name);
    
    // Valid charger types
    const validTypes = ['AC Type 2', 'DC Fast Charger', 'CCS Combo', 'CHAdeMO'];
    
    // Valid statuses
    const validStatuses = ['active', 'inactive', 'maintenance', 'Active', 'Inactive', 'Under Maintenance'];
    
    // Validate each row
    const validRows = [];
    const errorRows = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || row.every(cell => !cell)) {
            continue;
        }
        
        // Create charger object from row
        const charger = {};
        let hasError = false;
        let errorMessage = '';
        
        // Map columns to charger properties
        headers.forEach((header, index) => {
            if (index < row.length) {
                charger[header] = row[index];
            }
        });
        
        // Validate required fields
        requiredHeaders.forEach(header => {
            if (!charger[header]) {
                hasError = true;
                errorMessage += `Missing ${header}. `;
            }
        });
        
        // Validate Charge Point ID (must be unique)
        if (charger['Charge Point ID'] && existingCPIDs.includes(charger['Charge Point ID'])) {
            hasError = true;
            errorMessage += 'Charge Point ID already exists. ';
        }
        
        // Validate Serial Number (must be unique if provided)
        if (charger['Serial Number'] && existingSerialNumbers.includes(charger['Serial Number'])) {
            hasError = true;
            errorMessage += 'Serial Number already exists. ';
        }
        
        // Validate Division (must exist)
        if (charger['Division'] && !divisionNames.includes(charger['Division'])) {
            hasError = true;
            errorMessage += 'Division does not exist. ';
        }
        
        // Validate Charger Type (must be valid)
        if (charger['Charger Type'] && !validTypes.includes(charger['Charger Type'])) {
            hasError = true;
            errorMessage += 'Invalid Charger Type. ';
        }
        
        // Validate Status (must be valid)
        if (charger['Status'] && !validStatuses.includes(charger['Status'])) {
            hasError = true;
            errorMessage += 'Invalid Status. ';
        }
        
        // Add to appropriate list
        if (hasError) {
            errorRows.push({
                rowNumber: i + 1,
                data: charger,
                error: errorMessage.trim()
            });
        } else {
            validRows.push({
                rowNumber: i + 1,
                data: charger
            });
        }
    }
    
    // Update progress
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressText').textContent = 'Validation complete';
    
    // Store validation results for processing
    window.bulkUploadData = {
        validRows,
        errorRows,
        headers
    };
    
    // Display validation results
    displayValidationResults(validRows, errorRows);
    
    // Enable/disable process button
    document.getElementById('processBulkUploadBtn').disabled = validRows.length === 0;
}

// Display Validation Results
function displayValidationResults(validRows, errorRows) {
    // Update count displays
    document.getElementById('validCount').textContent = validRows.length;
    document.getElementById('errorCount').textContent = errorRows.length;
    
    // Show validation results section
    document.getElementById('validationResults').style.display = 'block';
    
    // Create validation details
    const validationDetails = document.getElementById('validationDetails');
    validationDetails.innerHTML = '';
    
    // Add error rows first
    errorRows.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.className = 'validation-row error';
        
        rowElement.innerHTML = `
            <div class="row-number">Row ${row.rowNumber}</div>
            <div class="error-icon"><i class="fas fa-times-circle"></i></div>
            <div class="row-message">
                <strong>${row.data['Charge Point ID'] || 'Unknown CPID'}</strong> - ${row.error}
            </div>
        `;
        
        validationDetails.appendChild(rowElement);
    });
    
    // Add valid rows
    validRows.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.className = 'validation-row valid';
        
        rowElement.innerHTML = `
            <div class="row-number">Row ${row.rowNumber}</div>
            <div class="valid-icon"><i class="fas fa-check-circle"></i></div>
            <div class="row-message">
                <strong>${row.data['Charge Point ID']}</strong> - ${row.data['Location Name']} (${row.data['Division']})
            </div>
        `;
        
        validationDetails.appendChild(rowElement);
    });
}

// Process Bulk Upload
function processBulkUpload() {
    // Check if we have valid data
    if (!window.bulkUploadData || window.bulkUploadData.validRows.length === 0) {
        showToast('error', 'No Valid Data', 'There are no valid chargers to upload.');
        return;
    }
    
    // Show progress
    document.getElementById('progressFill').style.width = '50%';
    document.getElementById('progressText').textContent = 'Processing chargers...';
    
    // Get existing chargers
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Process valid chargers
    const { validRows } = window.bulkUploadData;
    const newChargers = [];
    
    validRows.forEach(row => {
        const chargerData = row.data;
        
        // Create new charger object
        const newCharger = {
            id: chargerData['Charge Point ID'],
            serialNumber: chargerData['Serial Number'],
            location: chargerData['Location Name'],
            make: chargerData['Make'],
            model: chargerData['Model'],
            division: chargerData['Division'],
            type: chargerData['Charger Type'],
            address: chargerData['Address'],
            status: chargerData['Status'].toLowerCase(),
            commissionDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        // Add to new chargers list
        newChargers.push(newCharger);
    });
    
    // Update chargers in localStorage
    const updatedChargers = [...chargers, ...newChargers];
    localStorage.setItem('chargers', JSON.stringify(updatedChargers));
    
    // Update division charger counts
    updateBulkDivisionCounts(newChargers);
    
    // Show success
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressText').textContent = 'Upload complete!';
    
    showToast('success', 'Upload Complete', `Successfully added ${newChargers.length} chargers.`);
    
    // Close modal after a delay
    setTimeout(() => {
        document.getElementById('bulkUploadModal').classList.remove('active');
        
        // Refresh chargers table
        loadFilteredChargers();
        
        // Update dashboard stats
        updateDashboardStats();
    }, 2000);
}

// Update Division Charger Counts after Bulk Upload
function updateBulkDivisionCounts(newChargers) {
    // Group by division
    const divisionCounts = {};
    
    newChargers.forEach(charger => {
        const division = charger.division;
        if (!divisionCounts[division]) {
            divisionCounts[division] = 0;
        }
        divisionCounts[division]++;
    });
    
    // Update division counts
    const divisions = JSON.parse(localStorage.getItem('divisions') || '[]');
    
    divisions.forEach(division => {
        if (divisionCounts[division.name]) {
            // Make sure totalChargers is initialized
            if (typeof division.totalChargers !== 'number') {
                division.totalChargers = 0;
            }
            
            // Update counter
            division.totalChargers += divisionCounts[division.name];
        }
    });
    
    // Save updated divisions
    localStorage.setItem('divisions', JSON.stringify(divisions));
}

// Download Charger Template
function downloadChargerTemplate() {
    // Load SheetJS if not already loaded
    if (typeof XLSX === 'undefined') {
        // Show loading toast
        showToast('info', 'Preparing Template', 'Loading Excel export functionality...');
        
        // Load SheetJS library
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() {
            // Call download template again after library is loaded
            downloadChargerTemplate();
        };
        document.head.appendChild(script);
        return;
    }
    
    // Show loading toast
    showToast('info', 'Preparing Template', 'Generating Excel template...');
    
    // Get divisions for dropdown
    const divisions = JSON.parse(localStorage.getItem('divisions') || '[]')
        .filter(d => d.status === 'active')
        .map(d => d.name);
    
    // Create template headers
    const headers = [
        'Charge Point ID',
        'Serial Number',
        'Location Name',
        'Make',
        'Model',
        'Division',
        'Charger Type',
        'Address',
        'Status'
    ];
    
    // Create template data with some example rows
    const templateData = [
        headers,
        ['CP001', 'SN12345', 'Main Street Parking', 'ABB', 'Terra 54', divisions[0] || 'Division 1', 'DC Fast Charger', '123 Main St, City', 'Active'],
        ['CP002', 'SN67890', 'City Hall', 'ChargePoint', 'CP4000', divisions[0] || 'Division 1', 'AC Type 2', '456 Civic Center, City', 'Active'],
        ['', '', '', '', '', '', '', '', '']
    ];
    
    // Create instructions sheet data
    const instructionsData = [
        ['Charger Bulk Upload Template - Instructions'],
        [''],
        ['This template is used to commission multiple chargers at once. Please follow these guidelines:'],
        [''],
        ['1. Do not modify the header row or column order.'],
        ['2. Each row represents one charger.'],
        ['3. All fields are required.'],
        [''],
        ['Field Guidelines:'],
        [''],
        ['Charge Point ID: Must be unique for each charger.'],
        ['Serial Number: Must be unique for each charger.'],
        ['Location Name: Descriptive name for the charger location.'],
        ['Make: Manufacturer of the charger.'],
        ['Model: Model number or name of the charger.'],
        ['Division: Must be one of the existing divisions in the system:'],
        ['']
    ];
    
    // Add divisions list
    divisions.forEach(division => {
        instructionsData.push([`  - ${division}`]);
    });
    
    instructionsData.push(
        [''],
        ['Charger Type: Must be one of the following:'],
        ['  - AC Type 2'],
        ['  - DC Fast Charger'],
        ['  - CCS Combo'],
        ['  - CHAdeMO'],
        [''],
        ['Status: Must be one of the following:'],
        ['  - Active'],
        ['  - Inactive'],
        ['  - Under Maintenance']
    );
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add instructions sheet
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    // Add template sheet
    const wsTemplate = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Chargers');
    
    // Save file
    XLSX.writeFile(wb, 'Charger_Upload_Template.xlsx');
    
    // Show success toast
    showToast('success', 'Template Ready', 'Charger upload template has been downloaded');
}

// Add these functions to the admin dashboard initialization
function initializeAdminEnhancements() {
    // Add reports section
    setupReportsSection();
    
    // Add bulk charger upload
    setupBulkChargerUpload();
    
    // Add export button to all complaints table
    addExportToComplaintsTable();
}

// Add export button to all complaints table
function addExportToComplaintsTable() {
    // Create export button
    const filterContainer = document.querySelector('#allComplaintsSection .filter-container');
    
    if (filterContainer) {
        // Check if button already exists
        if (!document.getElementById('exportComplaintsBtn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'exportComplaintsBtn';
            exportBtn.className = 'btn btn-sm';
            exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Export to Excel';
            
            // Add Excel green color from CSS
            exportBtn.style.backgroundColor = '#217346';
            exportBtn.style.color = 'white';
            
            // Add event listener
            exportBtn.addEventListener('click', () => {
                exportToExcel('all_complaints');
            });
            
            // Add to container
            filterContainer.appendChild(exportBtn);
        }
    }
}

// Modify the original setupAdminDashboard function to include our enhancements
// We'll use monkey patching to add our initialization to the end of the original function
const originalSetupAdminDashboard = setupAdminDashboard;
setupAdminDashboard = function() {
    // Call the original function first
    originalSetupAdminDashboard();
    
    // Then call our enhancements
    initializeAdminEnhancements();
};
                        