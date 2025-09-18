// Reporting Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing reporting dashboard...');
    
    // Wait for filter manager to be ready and initialized, then load data
    const initReporting = () => {
        // Check if filter manager is ready and has loaded its data
        if (window.filterManager && window.filterManager.currentData) {
            console.log('Filter manager ready with data, checking for active filters...');
            
            // If there are active filters, the filter manager will handle all updates
            if (window.hasActiveFilters && window.hasActiveFilters()) {
                console.log('Active filters detected, letting filter manager handle data display');
                // Filter manager will handle all chart and table updates
                // Just initialize event listeners
                initializeModalEventListeners();
                initializeExportEventListeners();
                return;
            }
        }
        
        // No active filters, load data normally
        console.log('No active filters, loading data normally');
        loadDataNormally();
    };
    
    const loadDataNormally = () => {
        // Load clothing distribution data
        fetchClothingDistribution();
        
        // Load review status data  
        fetchReviewStatusData();
        
        // Load student clothing reports
        fetchStudentClothingReports();
        
    // Add event listeners for modal buttons
    initializeModalEventListeners();
    
    // Add event listeners for export buttons
    initializeExportEventListeners();
    
    // Add event listeners for quick reports
    initializeQuickReportsEventListeners();
        
        // Update export filter indicator
        updateExportFilterIndicator();
    };
    
    // Check if filter manager is ready
    if (window.filterManager) {
        // Wait a bit more for filter manager to finish initialization
        setTimeout(initReporting, 200);
    } else {
        // Wait for filter manager to initialize
        setTimeout(initReporting, 300);
    }
});

// Initialize export buttons event listeners
function initializeExportEventListeners() {
    // Refresh report button
    const refreshReportBtn = document.getElementById('refreshReportBtn');
    if (refreshReportBtn) {
        refreshReportBtn.addEventListener('click', function() {
            refreshAllReportData();
        });
    }
    
    // Header export button
    const exportReportBtn = document.querySelector('.d-flex.gap-2 .btn.btn-primary');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            showExportOptions();
        });
    }
    
    // CSV export button
    const csvBtn = document.getElementById('csvExportBtn');
    if (csvBtn) {
        csvBtn.addEventListener('click', function() {
            const includeImages = document.getElementById('includeImages').checked;
            exportToCSV(includeImages);
        });
    }
    
    // PDF export button
    const pdfBtn = document.getElementById('pdfExportBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function() {
            const includeImages = document.getElementById('includeImages').checked;
            exportToPDF(includeImages);
        });
    }
    
    // JSON export button
    const jsonBtn = document.getElementById('jsonExportBtn');
    if (jsonBtn) {
        jsonBtn.addEventListener('click', function() {
            const includeImages = document.getElementById('includeImages').checked;
            exportToJSON(includeImages);
        });
    }
    
    // Generate export button
    const generateExportBtn = document.getElementById('generateExportBtn');
    if (generateExportBtn) {
        generateExportBtn.addEventListener('click', function() {
            generateExport();
        });
    }
}

// Show export options (can open export modal or directly trigger export)
function showExportOptions() {
    generateExport();
}

// Refresh all report data
function refreshAllReportData() {
    console.log('Refreshing all report data...');
    
    // Show loading state on refresh button
    const refreshBtn = document.getElementById('refreshReportBtn');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Refreshing...';
    refreshBtn.disabled = true;
    
    // Check if filters are active
    const hasActiveFilters = window.hasActiveFilters && window.hasActiveFilters();
    
    if (hasActiveFilters) {
        console.log('Refreshing with active filters - will refresh server data then re-apply filters');
        
        // First refresh the student reports (this updates the base data)
        fetch('/api/student-clothing-reports')
            .then(response => response.json())
            .then(data => {
                console.log('Refreshed student clothing reports:', data);
                // Update the global data that filter manager uses
                window.allStudentReports = data;
                
                // Update filter manager's current data
                if (window.filterManager) {
                    window.filterManager.currentData = data;
                    // Re-apply current filters to the refreshed data
                    window.filterManager.applyFilters();
                }
                
                // After updating the base data, re-apply filters to update all charts
                // Don't call individual fetch functions as they would bypass filters
                if (window.filterManager) {
                    window.filterManager.updateChartsAndReports();
                }
                
                console.log('All report data refreshed and filters re-applied successfully');
                
                // Show success feedback
                refreshBtn.innerHTML = '<i class="fas fa-check text-success me-1"></i>Refreshed';
                setTimeout(() => {
                    refreshBtn.innerHTML = originalHTML;
                    refreshBtn.disabled = false;
                }, 1000);
            })
            .catch(error => {
                console.error('Error refreshing student reports:', error);
                showRefreshError(refreshBtn, originalHTML);
            });
    } else {
        // No active filters, refresh normally
        Promise.all([
            fetchClothingDistribution(true),
            fetchReviewStatusData(true), 
            fetchStudentClothingReports()
        ]).then(() => {
            console.log('All report data refreshed successfully');
            
            // Show success feedback
            refreshBtn.innerHTML = '<i class="fas fa-check text-success me-1"></i>Refreshed';
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 1000);
            
        }).catch(error => {
            console.error('Error refreshing report data:', error);
            showRefreshError(refreshBtn, originalHTML);
        });
    }
}

// Helper function to show refresh error
function showRefreshError(refreshBtn, originalHTML) {
    refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i>Error';
    setTimeout(() => {
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
    }, 2000);
}

// Generate export based on selected format
function generateExport() {
    const csvSelected = document.getElementById('exportCSV').checked;
    const pdfSelected = document.getElementById('exportPDF').checked;
    const jsonSelected = document.getElementById('exportJSON').checked;
    const includeImages = document.getElementById('includeImages').checked;
    
    if (csvSelected) {
        exportToCSV(includeImages);
    } else if (pdfSelected) {
        exportToPDF(includeImages);
    } else if (jsonSelected) {
        exportToJSON(includeImages);
    }
}

// Export to CSV
function exportToCSV(includeImages) {
    // Check if there are active filters and use filtered data
    if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData) {
            console.log('Exporting filtered data to CSV:', filteredData.length, 'items');
            generateCSVFromData(filteredData, includeImages);
            return;
        }
    }
    
    // Fallback to all data if no filters are active
    console.log('Exporting all data to CSV (no filters active)');
    fetch('/api/student-clothing-reports')
        .then(response => response.json())
        .then(data => {
            generateCSVFromData(data, includeImages);
        })
        .catch(error => {
            console.error('Error exporting to CSV:', error);
            alert('Error generating CSV export');
        });
}

// Helper function to generate CSV from data
function generateCSVFromData(data, includeImages) {
    const currentFilters = window.getCurrentFilters ? window.getCurrentFilters() : null;
    const hasActiveFilters = window.hasActiveFilters ? window.hasActiveFilters() : false;
    
    // Add filter info to filename if filters are active
    let filename = 'clothing_detection_report';
    if (hasActiveFilters) {
        filename += '_filtered';
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        filename += `_${timestamp}`;
    }
    filename += '.csv';
    
    let csvContent = 'Person ID,Detection Date & Time,Top Clothing,Bottom Clothing,Description,Similarity,Status,Review Time\n';
    
    // Add filter info as comments at the top
    if (hasActiveFilters && currentFilters) {
        csvContent = '# Smart Campus Clothing Verification System - Filtered Report\n';
        csvContent += `# Generated: ${new Date().toLocaleString()}\n`;
        csvContent += `# Total Records: ${data.length}\n`;
        csvContent += '# Active Filters:\n';
        
        if (currentFilters.dateRange) {
            const start = new Date(currentFilters.dateRange.start).toLocaleDateString();
            const end = new Date(currentFilters.dateRange.end).toLocaleDateString();
            csvContent += `# - Date Range: ${start} to ${end}\n`;
        }
        if (currentFilters.reviewStatus !== 'all') {
            csvContent += `# - Review Status: ${currentFilters.reviewStatus}\n`;
        }
        if (currentFilters.violationType !== 'all') {
            csvContent += `# - Violation Type: ${currentFilters.violationType}\n`;
        }
        if (currentFilters.videoSource !== 'all') {
            csvContent += `# - Video Source: ${currentFilters.videoSource}\n`;
        }
        csvContent += '#\n';
        csvContent += 'Person ID,Detection Date & Time,Top Clothing,Bottom Clothing,Description,Similarity,Status,Review Time\n';
    }
    
    data.forEach(person => {
        const status = (person.reviewed && !person.rejected) ? 'Verified' : 
                      (person.reviewed && person.rejected) ? 'Rejected' : 'Pending Review';
        
        const topClothing = person.top_clothing || '-';
        const bottomClothing = person.bottom_clothing || '-';
        const similarity = person.similarity_score || 0;
        const description = (person.description || '').replace(/"/g, '""');
        const detectionTime = person.first_seen_time || '';
        const reviewTime = person.review_time || '';
        
        csvContent += `"${person.person_id}","${detectionTime}","${topClothing}","${bottomClothing}","${description}","${similarity.toFixed(1)}%","${status}","${reviewTime}"\n`;
    });
    
    downloadFile(csvContent, filename, 'text/csv');
}

// Export to PDF
function exportToPDF(includeImages) {
    // Check if there are active filters and use filtered data
    if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData) {
            console.log('Exporting filtered data to PDF:', filteredData.length, 'items');
            generatePDFFromData(filteredData, includeImages);
            return;
        }
    }
    
    // Fallback to all data if no filters are active
    console.log('Exporting all data to PDF (no filters active)');
    fetch('/api/student-clothing-reports')
        .then(response => response.json())
        .then(data => {
            generatePDFFromData(data, includeImages);
        })
        .catch(error => {
            console.error('Error exporting to PDF:', error);
            alert('Error generating PDF export');
        });
}

// Helper function to generate PDF from data
function generatePDFFromData(data, includeImages) {
    const currentFilters = window.getCurrentFilters ? window.getCurrentFilters() : null;
    const hasActiveFilters = window.hasActiveFilters ? window.hasActiveFilters() : false;
    
    // Use the same format as Dashboard Export Report for consistency
    generateStandardPDFReport(data, includeImages, hasActiveFilters, currentFilters);
}

// Generate unified PDF report format (used by both Export Options and Dashboard Export)
function generateStandardPDFReport(data, includeImages = true, hasActiveFilters = false, currentFilters = null) {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    
    if (!printWindow) {
        alert('Popup blocked. Please enable popups for this site and try again.');
        return;
    }
    
    const htmlContent = generateStandardPDFHTML(data, includeImages, hasActiveFilters, currentFilters);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = function() {
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (printError) {
                // Even if print fails, keep window open for viewing
                console.log('Print dialog opened successfully');
            }
        }, 500);
    };
}

// Generate standardized HTML content for PDF reports
function generateStandardPDFHTML(data, includeImages = true, hasActiveFilters = false, currentFilters = null) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    // Calculate statistics
    const totalRecords = data.length;
    const violations = data.filter(item => {
        const top = (item.top_clothing || '').toLowerCase();
        const bottom = (item.bottom_clothing || '').toLowerCase();
        return top === 'sleeveless' || bottom === 'shorts' || bottom === 'shorts skirt';
    });
    const pending = data.filter(item => !item.reviewed && !item.rejected);
    const verified = data.filter(item => item.reviewed === true);
    const rejected = data.filter(item => item.rejected === true);
    
    // Utility to pick best evidence image
    function pickEvidenceImage(item) {
        const candidates = [
            item.first_frame_image, item.last_frame_image, item.image_path, 
            item.image_url, item.snapshot_url, item.crop_path,
            item.thumb_url, item.person_image, item.evidence_image
        ].filter(Boolean);
        console.log('Reporting PDF Export - pickEvidenceImage debug:', {
            person_id: item.person_id,
            first_frame_image: item.first_frame_image,
            last_frame_image: item.last_frame_image,
            candidates: candidates,
            selected: candidates[0] || null
        });
        return candidates[0] || null;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student Clothing Report${hasActiveFilters ? ' (Filtered)' : ''}</title>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body { 
                    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #2c3e50; 
                    background: #ffffff;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 40px 30px;
                }
                
                .header { 
                    text-align: center; 
                    margin-bottom: 40px; 
                    padding: 30px 0;
                    border-bottom: 3px solid #17a2b8;
                    position: relative;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60px;
                    height: 4px;
                    background: linear-gradient(90deg, #17a2b8, #138496);
                    border-radius: 2px;
                }
                
                .header h1 { 
                    color: #17a2b8; 
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 10px;
                    letter-spacing: -0.02em;
                }
                
                .header .subtitle { 
                    color: #6c757d; 
                    font-size: 1.1rem;
                    font-weight: 500;
                    margin-bottom: 8px;
                }
                
                .header .timestamp { 
                    color: #868e96; 
                    font-size: 0.95rem;
                    font-weight: 400;
                }
                
                .summary { 
                    background: linear-gradient(135deg, #e8f4fd 0%, #d4edda 100%);
                    padding: 30px; 
                    border-radius: 12px; 
                    margin-bottom: 40px;
                    border: 1px solid #b8daff;
                    box-shadow: 0 4px 6px rgba(23, 162, 184, 0.1);
                }
                
                .summary h3 { 
                    color: #0c5460; 
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                }
                
                .summary h3::before {
                    content: '📊';
                    margin-right: 10px;
                    font-size: 1.2rem;
                }
                
                .stats { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px; 
                    margin: 25px 0; 
                }
                
                .stat { 
                    text-align: center; 
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border-top: 3px solid #17a2b8;
                }
                
                .stat .number { 
                    font-size: 2.2rem; 
                    font-weight: 700; 
                    color: #17a2b8;
                    display: block;
                    margin-bottom: 5px;
                }
                
                .stat .label { 
                    color: #6c757d; 
                    font-size: 0.9rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .filter-info {
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                    border: 1px solid #ffc107;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                }
                
                .filter-info h4 {
                    color: #856404;
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                }
                
                .filter-info h4::before {
                    content: '🔍';
                    margin-right: 8px;
                }
                
                .filter-item {
                    color: #856404;
                    font-size: 0.9rem;
                    margin: 5px 0;
                    padding-left: 20px;
                }
                
                .section-title {
                    font-size: 1.3rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 40px 0 20px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .data-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                
                .data-table th { 
                    background: linear-gradient(135deg, #17a2b8, #138496);
                    color: white;
                    padding: 15px 12px;
                    text-align: left;
                    font-weight: 700;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .data-table td { 
                    padding: 15px 12px; 
                    border-bottom: 1px solid #e9ecef;
                    font-size: 0.9rem;
                    vertical-align: top;
                }
                
                .data-table tr:nth-child(even) { 
                    background-color: #f8f9fa; 
                }
                
                .data-table tr:hover { 
                    background-color: #e8f4fd;
                    transition: background-color 0.2s ease;
                }
                
                .violation-text { 
                    color: #dc3545; 
                    font-weight: 700;
                }
                
                .person-id {
                    font-family: 'Courier New', monospace;
                    background: #f8f9fa;
                    padding: 4px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                }
                
                .datetime {
                    font-size: 0.85rem;
                    color: #6c757d;
                }
                
                .similarity-score {
                    font-weight: 600;
                    color: #28a745;
                }
                
                .evidence-image {
                    width: 140px;
                    height: 140px;
                    object-fit: contain;
                    border-radius: 4px;
                    border: 2px solid #dee2e6;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    background: #fff;
                }
                
                .evidence-image:hover {
                    transform: scale(1.1);
                    border-color: #17a2b8;
                }
                
                .no-image {
                    color: #6c757d;
                    font-style: italic;
                    font-size: 0.85rem;
                }
                
                .footer { 
                    margin-top: 50px; 
                    text-align: center; 
                    color: #6c757d; 
                    font-size: 0.9rem;
                    padding: 20px 0;
                    border-top: 1px solid #e9ecef;
                }
                
                .footer .logo {
                    font-weight: 600;
                    color: #17a2b8;
                }
                
                @media print {
                    body { padding: 20px; }
                    .evidence-image { width: 100px; height: 100px; object-fit: contain; }
                    .header h1 { font-size: 2rem; }
                    .stat .number { font-size: 1.8rem; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 Student Clothing Report</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            ${hasActiveFilters && currentFilters ? `
            <div class="filter-info">
                <h4>Active Filters Applied</h4>
                ${currentFilters.dateRange !== 'all' && currentFilters.dateRange ? `<div class="filter-item">• Date Range: ${currentFilters.dateRange}</div>` : ''}
                ${currentFilters.reviewStatus !== 'all' ? `<div class="filter-item">• Review Status: ${currentFilters.reviewStatus}</div>` : ''}
                ${currentFilters.violationType !== 'all' ? `<div class="filter-item">• Violation Type: ${currentFilters.violationType}</div>` : ''}
                ${currentFilters.videoSource !== 'all' ? `<div class="filter-item">• Video Source: ${currentFilters.videoSource}</div>` : ''}
            </div>
            ` : ''}
            
            <div class="summary">
                <h3>Report Summary</h3>
                <div class="stats">
                    <div class="stat">
                        <span class="number">${totalRecords}</span>
                        <span class="label">Total Records</span>
                    </div>
                    <div class="stat">
                        <span class="number">${violations.length}</span>
                        <span class="label">Violations</span>
                    </div>
                    <div class="stat">
                        <span class="number">${pending.length}</span>
                        <span class="label">Pending</span>
                    </div>
                    <div class="stat">
                        <span class="number">${verified.length}</span>
                        <span class="label">Verified</span>
                    </div>
                    <div class="stat">
                        <span class="number">${rejected.length}</span>
                        <span class="label">Rejected</span>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">📋 Detection Records</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Person ID</th>
                        ${includeImages ? '<th>Evidence</th>' : ''}
                        <th>Date & Time</th>
                        <th>Top Clothing</th>
                        <th>Bottom Clothing</th>
                        <th>Description</th>
                        <th>Confidence</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((item, index) => {
                        const formattedDate = item.first_seen_time ? 
                            new Date(item.first_seen_time).toLocaleDateString('en-US', { 
                                month: 'short', day: '2-digit', year: 'numeric' 
                            }) : 'N/A';
                        const formattedTime = item.first_seen_time ? 
                            new Date(item.first_seen_time).toLocaleTimeString('en-US', { 
                                hour: '2-digit', minute: '2-digit' 
                            }) : 'N/A';
                        
                        const isTopViolation = (item.top_clothing || '').toLowerCase() === 'sleeveless';
                        const isBottomViolation = ['shorts', 'shorts skirt'].includes((item.bottom_clothing || '').toLowerCase());
                        
                        const imagePath = pickEvidenceImage(item);
                        
                        return `
                        <tr>
                            <td><span class="person-id">${item.person_id || 'N/A'}</span></td>
                            ${includeImages ? `
                            <td>
                                ${imagePath ? 
                                    `<img src="${imagePath}" alt="Evidence" class="evidence-image" 
                                         onclick="window.open('${imagePath}', '_blank')" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                     <span class="no-image" style="display:none;">Image not available</span>` :
                                    '<span class="no-image">No image available</span>'
                                }
                            </td>
                            ` : ''}
                            <td class="datetime">${formattedDate}<br>${formattedTime}</td>
                            <td ${isTopViolation ? 'class="violation-text"' : ''}>${item.top_clothing || 'N/A'}</td>
                            <td ${isBottomViolation ? 'class="violation-text"' : ''}>${item.bottom_clothing || 'N/A'}</td>
                            <td>${item.description || 'Detection record'}</td>
                            <td class="similarity-score">${item.similarity_score ? item.similarity_score.toFixed(1) + '%' : 'N/A'}</td>
                            <td>
                                ${item.reviewed === true ? 
                                    '<span style="color: #28a745; font-weight: 600;">✓ Verified</span>' : 
                                    item.rejected === true ?
                                    '<span style="color: #6c757d; font-weight: 600;">✗ Rejected</span>' :
                                    '<span style="color: #ffc107; font-weight: 600;">⏳ Pending</span>'
                                }
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p><span class="logo">Smart Campus Clothing Verification System</span></p>
                <p>This report was automatically generated and includes ${includeImages ? 'evidence images' : 'summary data'}.</p>
                <p>${hasActiveFilters ? 'Data filtered according to the criteria shown above.' : 'Complete dataset included in this report.'}</p>
            </div>
        </body>
        </html>
    `;
}

// Export to JSON
function exportToJSON(includeImages) {
    // Check if there are active filters and use filtered data
    if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData) {
            console.log('Exporting filtered data to JSON:', filteredData.length, 'items');
            generateJSONFromData(filteredData, includeImages);
            return;
        }
    }
    
    // Fallback to all data if no filters are active
    console.log('Exporting all data to JSON (no filters active)');
    fetch('/api/student-clothing-reports')
        .then(response => response.json())
        .then(data => {
            generateJSONFromData(data, includeImages);
        })
        .catch(error => {
            console.error('Error exporting to JSON:', error);
            alert('Error generating JSON export');
        });
}

// Helper function to generate JSON from data
function generateJSONFromData(data, includeImages) {
    const currentFilters = window.getCurrentFilters ? window.getCurrentFilters() : null;
    const hasActiveFilters = window.hasActiveFilters ? window.hasActiveFilters() : false;
    
    // Add filter info to filename if filters are active
    let filename = 'clothing_detection_report';
    if (hasActiveFilters) {
        filename += '_filtered';
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        filename += `_${timestamp}`;
    }
    filename += '.json';
    
    const exportData = {
        generated_at: new Date().toISOString(),
        report_type: hasActiveFilters ? 'filtered' : 'complete',
        total_records: data.length,
        include_images: includeImages,
        active_filters: hasActiveFilters ? currentFilters : null,
        filter_summary: hasActiveFilters ? {
            date_range: currentFilters?.dateRange ? {
                start: currentFilters.dateRange.start,
                end: currentFilters.dateRange.end
            } : null,
            review_status: currentFilters?.reviewStatus !== 'all' ? currentFilters.reviewStatus : null,
            violation_type: currentFilters?.violationType !== 'all' ? currentFilters.violationType : null,
            video_source: currentFilters?.videoSource !== 'all' ? currentFilters.videoSource : null
        } : null,
        reports: includeImages ? data : data.map(person => {
            // If includeImages is false, remove image fields
            if (!includeImages) {
                const { first_frame_image, last_frame_image, ...personWithoutImages } = person;
                return personWithoutImages;
            }
            return person;
        })
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
}

// Download file helper function
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Initialize modal event listeners
function initializeModalEventListeners() {
    // Check if modal elements exist
    const modalVerifyBtn = document.getElementById('modalVerifyBtn');
    const modalRejectBtn = document.getElementById('modalRejectBtn');
    
    if (modalVerifyBtn) {
        modalVerifyBtn.addEventListener('click', function() {
            const personId = this.getAttribute('data-person-id');
            if (personId) {
                verifyPersonFromModal(personId);
            }
        });
    }
    
    if (modalRejectBtn) {
        modalRejectBtn.addEventListener('click', function() {
            const personId = this.getAttribute('data-person-id');
            if (personId) {
                rejectPersonFromModal(personId);
            }
        });
    }
}

// Fetch clothing distribution data from the backend
function fetchClothingDistribution(forceServerData = false) {
    console.log('Fetching clothing distribution data...', forceServerData ? '(forced from server)' : '');
    
    // Check if there are active filters and use filtered data (unless forced to use server data)
    if (!forceServerData && window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData && filteredData.length > 0) {
            console.log('Using filtered data for clothing distribution:', filteredData.length, 'items');
            const distributionData = calculateClothingDistributionFromData(filteredData);
            
            // Update summary statistics
            updateSummaryStatistics(distributionData);
            
            // Render charts with filtered data
            renderTopClothingChart(filterTopClothing(distributionData.top_clothing_distribution));
            renderBottomClothingChart(filterBottomClothing(distributionData.bottom_clothing_distribution));
            return;
        }
    }
    
    // Fallback to server data if no filters or filtered data or forced
    fetch('/api/clothing-distribution')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received clothing data:', data);
            
            // Update summary statistics
            updateSummaryStatistics(data);
            
            // Render top clothing chart (only showing tops)
            renderTopClothingChart(filterTopClothing(data.top_clothing_distribution));
            
            // Render bottom clothing chart (only showing bottoms)
            renderBottomClothingChart(filterBottomClothing(data.bottom_clothing_distribution));
        })
        .catch(error => {
            console.error('Error fetching clothing distribution data:', error);
        });
}

// Calculate clothing distribution from filtered data
function calculateClothingDistributionFromData(data) {
    const topDistribution = {};
    const bottomDistribution = {};
    const totalPeople = data.length;

    data.forEach(item => {
        const topClothing = item.top_clothing || 'unknown';
        const bottomClothing = item.bottom_clothing || 'unknown';

        // Count top clothing
        if (!topDistribution[topClothing]) {
            topDistribution[topClothing] = { quantity: 0, percentage: 0 };
        }
        topDistribution[topClothing].quantity++;

        // Count bottom clothing
        if (!bottomDistribution[bottomClothing]) {
            bottomDistribution[bottomClothing] = { quantity: 0, percentage: 0 };
        }
        bottomDistribution[bottomClothing].quantity++;
    });

    // Calculate percentages
    Object.values(topDistribution).forEach(item => {
        item.percentage = totalPeople > 0 ? ((item.quantity / totalPeople) * 100).toFixed(1) : 0;
    });

    Object.values(bottomDistribution).forEach(item => {
        item.percentage = totalPeople > 0 ? ((item.quantity / totalPeople) * 100).toFixed(1) : 0;
    });

    return {
        total_people: totalPeople,
        top_clothing_distribution: topDistribution,
        bottom_clothing_distribution: bottomDistribution
    };
}

// Filter top clothing categories
function filterTopClothing(clothingData) {
    const topCategories = ["long sleeve top", "short sleeve top", "sleeveless"];
    const filteredData = {};
    
    topCategories.forEach(category => {
        if (clothingData[category]) {
            filteredData[category] = clothingData[category];
        } else {
            filteredData[category] = { quantity: 0, percentage: 0 };
        }
    });
    
    return filteredData;
}

// Filter bottom clothing categories
function filterBottomClothing(clothingData) {
    const bottomCategories = ["shorts", "shorts skirt", "long skirt", "trousers"];
    const filteredData = {};
    
    bottomCategories.forEach(category => {
        // Check for exact match first, then try variations
        if (clothingData[category]) {
            filteredData[category] = clothingData[category];
        } else if (clothingData[category.replace(' ', '_')]) {
            // Try with underscore (e.g., "shorts_skirt")
            filteredData[category] = clothingData[category.replace(' ', '_')];
        } else if (clothingData[category.replace(' ', '')]) {
            // Try without space (e.g., "shortskirt")
            filteredData[category] = clothingData[category.replace(' ', '')];
        } else {
            filteredData[category] = { quantity: 0, percentage: 0 };
        }
    });
    
    return filteredData;
}

// Update summary statistics
function updateSummaryStatistics(data) {
    // If data is from calculateClothingDistributionFromData (filtered), it will have total_people
    // If data is from server, it will have the full structure
    
    // Check if we should use filtered data instead of the passed data
    if (data.total_people !== undefined && window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData && filteredData.length >= 0) {
            console.log('Using filtered data for summary statistics:', filteredData.length, 'items');
            updateSummaryStatisticsFromFilteredData(filteredData);
            return;
        }
    }
    
    // Use the passed data (either server data or calculated distribution data)
    if (data.total_people !== undefined) {
        // This is calculated distribution data from filtered data
        updateSummaryStatisticsFromServerData(data);
    } else {
        // This is server data with the full structure
        updateSummaryStatisticsFromServerData(data);
    }
}

// Update summary statistics from server data
function updateSummaryStatisticsFromServerData(data) {
    // Calculate total detections from all categories in clothing_summary.json
    const topClothing = data.top_clothing_distribution || {};
    const bottomClothing = data.bottom_clothing_distribution || {};
    
    let totalDetections = data.total_people || 0;
    document.getElementById('totalDetectionsCount').textContent = totalDetections;
    
    // Calculate violations (shorts, shorts skirt, sleeveless)
    let violations = 0;
    
    // Check for sleeveless in top clothing
    if (topClothing['sleeveless'] && topClothing['sleeveless'].quantity) {
        violations += topClothing['sleeveless'].quantity;
    }
    
    // Check for shorts and shorts skirt in bottom clothing
    if (bottomClothing['shorts'] && bottomClothing['shorts'].quantity) {
        violations += bottomClothing['shorts'].quantity;
    }

    if (bottomClothing['shorts skirt'] && bottomClothing['shorts skirt'].quantity) {
        violations += bottomClothing['shorts skirt'].quantity;
    }

    document.getElementById('violationsFoundCount').textContent = violations;

    // Calculate violation rate
    const violationRate = totalDetections > 0 ? Math.round((violations / totalDetections) * 100) : 0;
    document.getElementById('violationRatePercent').textContent = `${violationRate}%`;
}

// Update summary statistics from filtered data
function updateSummaryStatisticsFromFilteredData(filteredData) {
    const totalDetections = filteredData.length;
    document.getElementById('totalDetectionsCount').textContent = totalDetections;
    
    // Calculate violations from filtered data
    let violations = 0;
    
    filteredData.forEach(item => {
        const topClothing = item.top_clothing || '';
        const bottomClothing = item.bottom_clothing || '';
        
        // Check for violations
        if (topClothing === 'sleeveless' || 
            bottomClothing === 'shorts' || 
            bottomClothing === 'shorts skirt') {
            violations++;
        }
    });
    
    document.getElementById('violationsFoundCount').textContent = violations;
    
    // Calculate violation rate
    const violationRate = totalDetections > 0 ? Math.round((violations / totalDetections) * 100) : 0;
    document.getElementById('violationRatePercent').textContent = `${violationRate}%`;
    
    console.log('Updated summary statistics from filtered data:', {
        totalDetections,
        violations,
        violationRate: violationRate + '%'
    });
}

// Fetch pending review count
function fetchReviewStatusData(forceServerData = false) {
    console.log('Fetching review status data...', forceServerData ? '(forced from server)' : '');
    
    // Check if there are active filters and use filtered data (unless forced to use server data)
    if (!forceServerData && window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData && filteredData.length >= 0) {
            console.log('Using filtered data for review status:', filteredData.length, 'items');
            const statusData = calculateReviewStatusFromData(filteredData);
            document.getElementById('pendingReviewCount').textContent = statusData.pending || 0;
            renderReviewStatusChart(statusData);
            return;
        }
    }
    
    // Fallback to server data if no filters or filtered data or forced
    fetch('/api/review-status')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received review status data:', data);
            document.getElementById('pendingReviewCount').textContent = data.pending_count || 0;
            renderReviewStatusChart(data);
        })
        .catch(error => {
            console.error('Error fetching review status data:', error);
            document.getElementById('pendingReviewCount').textContent = 0;
            renderReviewStatusChart({ pending: 0, verified: 0, rejected: 0 });
        });
}

// Calculate review status from filtered data
function calculateReviewStatusFromData(data) {
    const statusData = {
        pending: 0,
        verified: 0,
        rejected: 0,
        pending_count: 0
    };

    data.forEach(item => {
        const isReviewed = item.reviewed;
        const isRejected = item.rejected;

        if (isRejected) {
            statusData.rejected++;
        } else if (isReviewed) {
            statusData.verified++;
        } else {
            statusData.pending++;
        }
    });

    statusData.pending_count = statusData.pending;
    return statusData;
}

// Render review status chart
function renderReviewStatusChart(statusData) {
    const reviewStatusCtx = document.getElementById('reviewStatusChart');
    if (!reviewStatusCtx) {
        console.error('Review status chart canvas not found');
        return;
    }
    
    const pending = statusData.pending || 0;
    const verified = statusData.verified || 0;
    const rejected = statusData.rejected || 0;
    const total = pending + verified + rejected;
    
    // Calculate percentages
    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const verifiedPercent = total > 0 ? Math.round((verified / total) * 100) : 0;
    const rejectedPercent = total > 0 ? Math.round((rejected / total) * 100) : 0;
    
    // Update status list
    const reviewStatusList = document.getElementById('reviewStatusList');
    if (reviewStatusList) {
        reviewStatusList.innerHTML = '';
    }
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(reviewStatusCtx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Show "No data" message if no data
    if (total === 0) {
        new Chart(reviewStatusCtx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'Verified', 'Rejected'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#FBBC05', '#34A853', '#EA4335'],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: false }
                },
                scales: { 
                    x: { grid: { display: false } }, 
                    y: { beginAtZero: true, max: 1, ticks: { stepSize: 1 } } 
                }
            }
        });
        return;
    }
    
    // Render chart as vertical bar chart with counts; tooltip shows count + percent
    new Chart(reviewStatusCtx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Verified', 'Rejected'],
            datasets: [{
                data: [pending, verified, rejected],
                backgroundColor: ['#FBBC05', '#34A853', '#EA4335'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x', // Make it vertical
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.1)',
                        drawBorder: false
                    },
                    ticks: { stepSize: 1 }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: {
                        family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                        size: 14
                    },
                    bodyFont: {
                        family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                        size: 14
                    },
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const pct = (((value) * 100) / (total)).toFixed(1);
                            return `${context.label}: ${value} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render top clothing chart
function renderTopClothingChart(topClothingData) {
    const topClothingCtx = document.getElementById('topClothingChart');
    if (!topClothingCtx) {
        console.error('Top clothing chart canvas not found');
        return;
    }
    
    const labels = [];
    const data = [];
    const topColorMap = {
        'long sleeve top': '#4285F4',
        'short sleeve top': '#34A853',
        'sleeveless': '#EA4335'
    };
    
    const topClothingList = document.getElementById('topClothingList');
    if (topClothingList) topClothingList.innerHTML = '';
    
    const allTopCategories = ['long sleeve top', 'short sleeve top', 'sleeveless'];
    const hasData = Object.keys(topClothingData).length > 0;
    
    allTopCategories.forEach(category => {
        const info = topClothingData[category] || { quantity: 0, percentage: 0 };
        labels.push(category);
        data.push(info.quantity);
    });
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(topClothingCtx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Show "No data" message if no data
    if (!hasData || data.every(val => val === 0)) {
        new Chart(topClothingCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: labels.map(label => topColorMap[label.toLowerCase()] || '#e0e0e0'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: false }
                },
                scales: { 
                    x: { beginAtZero: true, max: 1, ticks: { stepSize: 1 } }, 
                    y: { grid: { display: false } } 
                }
            }
        });
        return;
    }
    
    // Render chart as horizontal bar
    new Chart(topClothingCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(label => topColorMap[label.toLowerCase()] || '#9e9e9e'),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context){ const total = data.reduce((a,b)=>a+b,0)||1; const qty=context.raw||0; const pct=((qty*100)/total).toFixed(1); return `${context.label}: ${qty} (${pct}%)`; } } } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
        }
    });
}

// Render bottom clothing chart
function renderBottomClothingChart(bottomClothingData) {
    const bottomClothingCtx = document.getElementById('bottomClothingChart');
    if (!bottomClothingCtx) {
        console.error('Bottom clothing chart canvas not found');
        return;
    }
    
    const bottomClothingList = document.getElementById('bottomClothingList');
    if (bottomClothingList) bottomClothingList.innerHTML = '';

    const labels = [];
    const data = [];
    const bottomColorMap = {
        'trousers': '#4285F4',
        'long skirt': '#34A853',
        'shorts skirt': '#FBBC05',
        'shorts': '#EA4335'
    };
    
    const allBottomCategories = ['trousers', 'long skirt', 'shorts skirt', 'shorts'];
    const hasData = Object.keys(bottomClothingData).length > 0;
    
    allBottomCategories.forEach(category => {
        const info = bottomClothingData[category] || { quantity: 0, percentage: 0 };
        labels.push(category);
        data.push(info.quantity);
    });

    const existingChart = Chart.getChart(bottomClothingCtx);
    if (existingChart) existingChart.destroy();

    // Show "No data" message if no data
    if (!hasData || data.every(val => val === 0)) {
        new Chart(bottomClothingCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: labels.map(label => bottomColorMap[label.toLowerCase()] || '#e0e0e0'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: false }
                },
                scales: { 
                    x: { beginAtZero: true, max: 1, ticks: { stepSize: 1 } }, 
                    y: { grid: { display: false } } 
                }
            }
        });
        return;
    }

    new Chart(bottomClothingCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(label => bottomColorMap[label.toLowerCase()] || '#9e9e9e'),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    titleFont: {
                        family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                        size: 14
                    },
                    bodyFont: {
                        family: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                        size: 14
                    },
                    callbacks: { 
                        label: function(context) { 
                            const total = data.reduce((a, b) => a + b, 0) || 1;
                            const qty = context.raw || 0; 
                            const pct = ((qty * 100) / total).toFixed(1); 
                            return `${context.label}: ${qty} (${pct}%)`; 
                        } 
                    } 
                } 
            },
            scales: { 
                x: { beginAtZero: true, ticks: { stepSize: 1 } }, 
                y: { grid: { display: false } } 
            }
        }
    });
}

// Fetch student clothing reports
function fetchStudentClothingReports() {
    console.log('Fetching student clothing reports...');
    fetch('/api/student-clothing-reports')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received student clothing reports:', data);
            // Store data globally for filter manager
            window.allStudentReports = data;
            renderStudentClothingTable(data);
        })
        .catch(error => {
            console.error('Error fetching student clothing reports:', error);
            window.allStudentReports = [];
            renderStudentClothingTable([]);
        });
}

// Render student clothing table
function renderStudentClothingTable(reports) {
    const tableBody = document.querySelector('table.table tbody');
    if (!tableBody) {
        console.error('Student clothing table body not found');
        return;
    }
    
    console.log('Rendering student table with', reports.length, 'reports');
    
    // Clear previous content
    tableBody.innerHTML = '';
    
    if (reports.length === 0) {
        // Check if filters are applied to show appropriate message
        const isFiltered = window.filterManager && 
            (window.filterManager.filters.dateRange || 
             window.filterManager.filters.videoSource !== 'all' ||
             window.filterManager.filters.reviewStatus !== 'all' ||
             window.filterManager.filters.violationType !== 'all');
             
        const message = isFiltered ? 
            'No student clothing records match the current filter criteria' : 
            'No student clothing records found';
            
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <i class="fas fa-search me-2"></i>${message}
                    ${isFiltered ? '<br><small class="text-muted">Try adjusting your filters</small>' : ''}
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows
    reports.forEach(report => {
        const personId = report.person_id || '';
        // Use the full date and time string
        const fullTimeStr = report.first_seen_time || '';
        // Format date if needed, but keep full information
        let formattedDateTime = fullTimeStr;
        
        const topClothing = report.top_clothing || 'Unknown';
        const bottomClothing = report.bottom_clothing || 'Unknown';
        const description = report.description || '';
        const similarity = report.similarity_score || 0;
        
        // Determine the status based on reviewed and rejected properties
        let status = 'Pending';
        let statusBadgeClass = 'status-pending';
        
        if (report.reviewed === true) {
            if (report.rejected === true) {
                status = 'Rejected';
                statusBadgeClass = 'status-rejected';
            } else {
                status = 'Verified';
                statusBadgeClass = 'status-verified';
            }
        }
        
        // Check for violation in clothing types
        const isTopViolation = topClothing.toLowerCase() === 'sleeveless';
        const isBottomViolation = bottomClothing.toLowerCase() === 'shorts' || bottomClothing.toLowerCase() === 'shorts skirt';
        
        // Choose best image to display (prefer full body images)
        let bestImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjhmOWZhIi8+CjxwYXRoIGQ9Ik0yMCAyMEM5IDIwIDIgOCAyIDE0QzIgMjcgOSAzOCAyMCAzOEMzMSAzOCAzOCAyNyAzOCAxNEMzOCA4IDMxIDIwIDIwIDIwWiIgZmlsbD0iIzY2NiIvPgo8L3N2Zz4K';
        
        // Prioritize last_frame image first
        if (report.last_frame_image) {
            bestImage = report.last_frame_image;
        } else if (report.first_frame_image) {
            bestImage = report.first_frame_image;
        }
        
        // Create table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="align-middle"><strong>${personId}</strong></td>
            <td class="align-middle">
                <img src="${bestImage}" alt="Student" class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover;">
            </td>
            <td class="align-middle">${formattedDateTime}</td>
            <td class="align-middle">${isTopViolation ? 
                `<span class="text-danger fw-bold">${topClothing}</span>` : topClothing}</td>
            <td class="align-middle">${isBottomViolation ? 
                `<span class="text-danger fw-bold">${bottomClothing}</span>` : bottomClothing}</td>
            <td class="align-middle">${description}</td>
            <td class="align-middle"><span class="badge bg-${similarity >= 90 ? 'success' : similarity >= 70 ? 'warning' : 'danger'}">${similarity.toFixed(1)}%</span></td>
            <td class="align-middle"><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td class="align-middle">
                <button class="btn btn-sm btn-outline-primary view-details" data-person-id="${personId}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success verify-action" data-person-id="${personId}" title="Verify">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger reject-action" data-person-id="${personId}" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    addTableActionEventListeners();
}

// Add event listeners for table action buttons
function addTableActionEventListeners() {
    // View details button
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const personId = this.getAttribute('data-person-id');
            showPersonDetails(personId);
        });
    });
    
    // Verify action button
    document.querySelectorAll('.verify-action').forEach(button => {
        button.addEventListener('click', function() {
            const personId = this.getAttribute('data-person-id');
            verifyPerson(personId);
        });
    });
    
    // Reject action button
    document.querySelectorAll('.reject-action').forEach(button => {
        button.addEventListener('click', function() {
            const personId = this.getAttribute('data-person-id');
            rejectPerson(personId);
        });
    });
}

// Show person details modal
function showPersonDetails(personId) {
    console.log(`Showing details for person ID: ${personId}`);
    
    // Fetch person details from API
    fetch(`/api/person-details/${personId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Person details received:', data);
            
            // Update modal with person data
            const modalImageContainer = document.getElementById('modalImageContainer');
            const modalVerifyBtn = document.getElementById('modalVerifyBtn');
            const modalRejectBtn = document.getElementById('modalRejectBtn');
            
            if (modalImageContainer) {
                // Determine best image to show (prefer last frame, then first frame)
                let imageUrl = null;
                if (data.last_frame_image) {
                    imageUrl = data.last_frame_image;
                } else if (data.first_frame_image) {
                    imageUrl = data.first_frame_image;
                }
                
                if (imageUrl) {
                    modalImageContainer.innerHTML = `
                        <div class="text-center">
                            <img src="${imageUrl}" class="img-fluid mb-3" style="max-width: 100%; max-height: 300px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" alt="Student Detection Image">
                            <div class="row g-2">
                                <div class="col-6">
                                    <div class="card border-0 bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted d-block">Person ID</small>
                                            <strong class="text-dark">${personId}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card border-0 bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted d-block">Similarity</small>
                                            <strong class="text-dark">${data.similarity_score ? data.similarity_score.toFixed(1) + '%' : 'Unknown'}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card border-0 bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted d-block">Top Clothing</small>
                                            <strong class="text-dark">${data.top_clothing || 'Unknown'}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card border-0 bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted d-block">Bottom Clothing</small>
                                            <strong class="text-dark">${data.bottom_clothing || 'Unknown'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>
                                    ${data.first_seen_time || 'Unknown'}
                                </small>
                            </div>
                        </div>
                    `;
                } else {
                    modalImageContainer.innerHTML = `
                        <div class="text-center py-3">
                            <i class="fas fa-image text-muted" style="font-size: 2rem;"></i>
                            <h6 class="mt-2 mb-1">No Image Available</h6>
                            <small class="text-muted">Person ID: ${personId}</small>
                        </div>
                    `;
                }
            }
            
            // Set person ID on modal buttons
            if (modalVerifyBtn) {
                modalVerifyBtn.setAttribute('data-person-id', personId);
            }
            if (modalRejectBtn) {
                modalRejectBtn.setAttribute('data-person-id', personId);
            }
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('personDetailsModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error fetching person details:', error);
            alert('Error loading person details. Please try again.');
        });
}

// Helper function to immediately update person status in UI
function updatePersonStatusInUI(personId, newStatus) {
    // Find the table row for this person
    const table = document.querySelector('table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    for (const row of rows) {
        const personIdCell = row.cells[0]; // Person ID is first column
        if (personIdCell && personIdCell.textContent.trim() === personId) {
            // Update the status cell (8th column, index 7)
            const statusCell = row.cells[7];
            if (statusCell) {
                let statusText, statusClass;
                switch(newStatus) {
                    case 'verified':
                        statusText = 'Verified';
                        statusClass = 'status-verified';
                        break;
                    case 'rejected':
                        statusText = 'Rejected';
                        statusClass = 'status-rejected';
                        break;
                    default:
                        statusText = 'Pending Review';
                        statusClass = 'status-pending';
                }
                
                statusCell.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
                
                // Update action buttons (last column)
                const actionsCell = row.cells[row.cells.length - 1];
                if (actionsCell) {
                    updateActionButtonsForStatus(actionsCell, personId, newStatus);
                }
            }
            break;
        }
    }
}

// Helper function to update action buttons based on status
function updateActionButtonsForStatus(actionsCell, personId, status) {
    let buttonsHTML = '';
    
    if (status === 'pending') {
        buttonsHTML = `
            <button class="btn btn-sm btn-success me-1 verify-action" data-person-id="${personId}" title="Verify">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-danger me-1 reject-action" data-person-id="${personId}" title="Reject">
                <i class="fas fa-times"></i>
            </button>
        `;
    } else if (status === 'verified') {
        buttonsHTML = `
            <button class="btn btn-sm btn-danger me-1 reject-action" data-person-id="${personId}" title="Reject">
                <i class="fas fa-times"></i>
            </button>
        `;
    } else if (status === 'rejected') {
        buttonsHTML = `
            <button class="btn btn-sm btn-success me-1 verify-action" data-person-id="${personId}" title="Verify">
                <i class="fas fa-check"></i>
            </button>
        `;
    }
    
    // Always add view details button
    buttonsHTML += `
        <button class="btn btn-sm btn-primary view-details" data-person-id="${personId}" title="View Details">
            <i class="fas fa-eye"></i>
        </button>
    `;
    
    actionsCell.innerHTML = buttonsHTML;
    
    // Add event listeners for the new buttons
    addEventListenersToButtons(actionsCell, personId);
}

// Helper function to add event listeners to dynamically created buttons
function addEventListenersToButtons(actionsCell, personId) {
    // View details button
    const viewDetailsBtn = actionsCell.querySelector('.view-details');
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', function() {
            showPersonDetails(personId);
        });
    }
    
    // Verify action button
    const verifyBtn = actionsCell.querySelector('.verify-action');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            verifyPerson(personId);
        });
    }
    
    // Reject action button
    const rejectBtn = actionsCell.querySelector('.reject-action');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            rejectPerson(personId);
        });
    }
}

function verifyPerson(personId) {
    console.log(`Verifying person ID: ${personId}`);
    
    // Immediately update UI status to verified
    updatePersonStatusInUI(personId, 'verified');
    
    fetch(`/api/verify-person/${personId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Verification successful:', data);
        // Only refresh review status data, not the entire table to avoid button refresh
        fetchReviewStatusData();
        // Update dashboard stats immediately if on dashboard page
        if (typeof loadAndRenderDashboardStats === 'function') {
            loadAndRenderDashboardStats();
        }
        // Update filter manager data if it exists
        if (window.filterManager && window.filterManager.updateDataAfterAction) {
            window.filterManager.updateDataAfterAction(personId, 'verified');
        }
    })
    .catch(error => {
        console.error('Error verifying person:', error);
        // Revert status on error
        updatePersonStatusInUI(personId, 'pending');
        alert('Error verifying person. Please try again.');
    });
}

// Reject person
function rejectPerson(personId) {
    console.log(`Rejecting person ID: ${personId}`);
    
    // Immediately update UI status to rejected
    updatePersonStatusInUI(personId, 'rejected');
    
    fetch(`/api/reject-person/${personId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Rejection successful:', data);
        // Only refresh review status data, not the entire table to avoid button refresh
        fetchReviewStatusData();
        // Update dashboard stats immediately if on dashboard page
        if (typeof loadAndRenderDashboardStats === 'function') {
            loadAndRenderDashboardStats();
        }
        // Update filter manager data if it exists
        if (window.filterManager && window.filterManager.updateDataAfterAction) {
            window.filterManager.updateDataAfterAction(personId, 'rejected');
        }
    })
    .catch(error => {
        console.error('Error rejecting person:', error);
        // Revert status on error
        updatePersonStatusInUI(personId, 'pending');
        alert('Error rejecting person. Please try again.');
    });
}

// Verify person from modal
function verifyPersonFromModal(personId) {
    console.log(`Verifying person from modal: ${personId}`);
    
    // Immediately update UI status to verified
    updatePersonStatusInUI(personId, 'verified');
    
    fetch(`/api/verify-person/${personId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Verification successful:', data);
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('personDetailsModal'));
        if (modal) {
            modal.hide();
        }
        
        // Only refresh review status data, not the entire table to avoid button refresh
        fetchReviewStatusData();
        // Update dashboard stats immediately if on dashboard page
        if (typeof loadAndRenderDashboardStats === 'function') {
            loadAndRenderDashboardStats();
        }
        // Update filter manager data if it exists
        if (window.filterManager && window.filterManager.updateDataAfterAction) {
            window.filterManager.updateDataAfterAction(personId, 'verified');
        }
    })
    .catch(error => {
        console.error('Error verifying person:', error);
        // Revert status on error
        updatePersonStatusInUI(personId, 'pending');
        alert('Error verifying person. Please try again.');
    });
}

// Reject person from modal
function rejectPersonFromModal(personId) {
    console.log(`Rejecting person from modal: ${personId}`);
    
    // Immediately update UI status to rejected
    updatePersonStatusInUI(personId, 'rejected');
    
    fetch(`/api/reject-person/${personId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Rejection successful:', data);
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('personDetailsModal'));
        if (modal) {
            modal.hide();
        }
        
        // Only refresh review status data, not the entire table to avoid button refresh
        fetchReviewStatusData();
        // Update dashboard stats immediately if on dashboard page
        if (typeof loadAndRenderDashboardStats === 'function') {
            loadAndRenderDashboardStats();
        }
        // Update filter manager data if it exists
        if (window.filterManager && window.filterManager.updateDataAfterAction) {
            window.filterManager.updateDataAfterAction(personId, 'rejected');
        }
    })
    .catch(error => {
        console.error('Error rejecting person:', error);
        // Revert status on error
        updatePersonStatusInUI(personId, 'pending');
        alert('Error rejecting person. Please try again.');
    });
}