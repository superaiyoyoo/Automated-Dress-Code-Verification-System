// Quick Reports Functionality for Analytics Dashboard

// Initialize quick reports event listeners
function initializeQuickReportsEventListeners() {
    console.log('Initializing quick reports event listeners...');
    
    // Violations Summary Report button
    const violationsSummaryBtn = document.getElementById('violationsSummaryBtn');
    if (violationsSummaryBtn) {
        violationsSummaryBtn.addEventListener('click', function() {
            generateViolationsSummaryReport();
        });
        console.log('Violations summary report button initialized');
    }
    
    // Pending Review Queue button
    const pendingReviewBtn = document.getElementById('pendingReviewBtn');
    if (pendingReviewBtn) {
        pendingReviewBtn.addEventListener('click', function() {
            generatePendingReviewReport();
        });
        console.log('Pending review report button initialized');
    }
    
    // Detection Visualization button
    const detectionVisualizationBtn = document.getElementById('detectionVisualizationBtn');
    if (detectionVisualizationBtn) {
        detectionVisualizationBtn.addEventListener('click', function() {
            generateDetectionVisualizationReport();
        });
        console.log('Detection visualization report button initialized');
    }
    
    // Chart Visualization button
    const chartVisualizationBtn = document.getElementById('chartVisualizationBtn');
    if (chartVisualizationBtn) {
        chartVisualizationBtn.addEventListener('click', function() {
            generateChartVisualizationReport();
        });
        console.log('Chart visualization report button initialized');
    }
    
    // Export Report button (dashboard)
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            generateDashboardExportReport();
        });
        console.log('Dashboard export report button initialized');
    }
}

// Enhanced button state management
function setButtonState(buttonId, state, text, icon = '') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.disabled = state === 'loading' || state === 'disabled';
    
    let iconHtml = '';
    let textClass = '';
    
    switch(state) {
        case 'loading':
            iconHtml = '<i class="fas fa-spinner fa-spin me-2"></i>';
            textClass = 'text-muted';
            break;
        case 'success':
            iconHtml = '<i class="fas fa-check text-success me-2"></i>';
            textClass = 'text-success';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times text-danger me-2"></i>';
            textClass = 'text-danger';
            break;
        case 'normal':
        default:
            iconHtml = icon ? `<i class="${icon} me-2"></i>` : '';
            textClass = '';
            break;
    }
    
    btn.innerHTML = `${iconHtml}<span class="${textClass}">${text}</span>`;
}

// Enhanced error handling
function handleReportError(buttonId, originalText, originalIcon, error, reportType) {
    console.error(`Error generating ${reportType} report:`, error);
    
    // Show error state
    setButtonState(buttonId, 'error', 'Error');
    
    // Show user-friendly error message
    const errorMessage = error.message || 'An unexpected error occurred';
    alert(`Error generating ${reportType} report: ${errorMessage}. Please try again.`);
    
    // Restore original state after delay
    setTimeout(() => {
        setButtonState(buttonId, 'normal', originalText, originalIcon);
    }, 3000);
}

// Enhanced success handling
function handleReportSuccess(buttonId, originalText, originalIcon, reportType) {
    console.log(`${reportType} report generated successfully`);
    
    // Show success state
    setButtonState(buttonId, 'success', 'Generated');
    
    // Restore original state after delay
    setTimeout(() => {
        setButtonState(buttonId, 'normal', originalText, originalIcon);
    }, 2000);
}

// Generate Dashboard Export Report (PDF with images)
function generateDashboardExportReport() {
    console.log('Generating dashboard export report...');
    
    // Get filtered data or all data
    let dataToUse = window.allStudentReports || [];
    if (window.filterManager && window.filterManager.filteredData) {
        dataToUse = window.filterManager.filteredData;
        console.log('Using filtered data for dashboard export:', dataToUse.length, 'records');
    }
    
    if (dataToUse.length === 0) {
        alert('No data found to export. Please ensure there are detection records available.');
        return;
    }
    
    // Show loading state
    const btn = document.getElementById('exportReportBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
    btn.disabled = true;
    
    // Generate PDF report with images (same as violations summary but with all data)
    generateDashboardExportPDF(dataToUse)
        .then(() => {
            // Show success state
            btn.innerHTML = '<i class="fas fa-check me-2"></i>Generated';
            
            // Restore original state after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 2000);
        })
        .catch(error => {
            console.error('Error generating Dashboard Export report:', error);
            
            // Show error state
            btn.innerHTML = '<i class="fas fa-times me-2"></i>Error';
            alert(`Error generating Dashboard Export report: ${error.message || 'An unexpected error occurred'}. Please try again.`);
            
            // Restore original state after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 3000);
        });
}

// Generate Dashboard Export PDF Report
function generateDashboardExportPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Creating dashboard export PDF window...');
            
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            
            if (!printWindow) {
                throw new Error('Popup blocked. Please enable popups for this site and try again.');
            }
            
            // Generate HTML content for the PDF (similar to violations but includes all data)
            const htmlContent = generateDashboardExportHTML(data);
            
            if (!htmlContent) {
                throw new Error('Failed to generate export content.');
            }
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = function() {
                setTimeout(() => {
                    try {
                        // Add print event listeners to the print window
                        let printStarted = false;
                        let printCompleted = false;
                        
                        // Listen for before print event
                        printWindow.addEventListener('beforeprint', function() {
                            printStarted = true;
                            console.log('Print dialog opened');
                        });
                        
                        // Listen for after print event
                        printWindow.addEventListener('afterprint', function() {
                            printCompleted = true;
                            console.log('Print dialog closed');
                            
                            // Small delay to ensure the print dialog has fully closed
                            setTimeout(() => {
                                resolve();
                            }, 100);
                        });
                        
                        // Start the print process
                        printWindow.print();
                        
                        // Fallback: If no print events are detected within 1 second, assume cancelled
                        setTimeout(() => {
                            if (!printStarted && !printCompleted) {
                                console.log('Print dialog appears to have been cancelled immediately');
                                resolve();
                            }
                        }, 1000);
                        
                    } catch (printError) {
                        console.log('Print error or cancellation detected');
                        resolve();
                    }
                }, 500);
            };
            
            // Handle case where window fails to load - keep window open
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    resolve(); // Allow viewing without timeout error
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Generate HTML content for dashboard export report
function generateDashboardExportHTML(data) {
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
        console.log('Dashboard Export - pickEvidenceImage debug:', {
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
            <title>Student Clothing Report Export</title>
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
                <h1>📋 Student Clothing Report Export</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
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
            
            <h3 class="section-title">📋 Complete Detection Records</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Person ID</th>
                        <th>Evidence</th>
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
                            <td>
                                ${imagePath ? 
                                    `<img src="${imagePath}" alt="Evidence" class="evidence-image" 
                                         onclick="window.open('${imagePath}', '_blank')" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                     <span class="no-image" style="display:none;">Image not available</span>` :
                                    '<span class="no-image">No image available</span>'
                                }
                            </td>
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
                <p>This report was automatically generated from the analytics dashboard.</p>
                <p>All data includes evidence images and filtering applied at time of export.</p>
            </div>
        </body>
        </html>
    `;
}

// Generate Detection Visualization Report (PDF)
function generateDetectionVisualizationReport() {
    console.log('Generating detection visualization report...');
    
    const btn = document.getElementById('detectionVisualizationBtn');
    
    if (!btn) return;
    
    // Store original button content
    const originalHTML = btn.innerHTML;
    
    // Get filtered data or all data
    let dataToUse = window.allStudentReports || [];
    if (window.filterManager && window.filterManager.filteredData) {
        dataToUse = window.filterManager.filteredData;
        console.log('Using filtered data for detection visualization:', dataToUse.length, 'records');
    }
    
    if (dataToUse.length === 0) {
        alert('No data found to visualize. Please ensure there are detection records available.');
        return;
    }
    
    // Show loading state by temporarily reducing opacity
    btn.style.opacity = '0.7';
    btn.disabled = true;
    
    // Generate PDF report with detection visualization
    generateChartVisualizationPDF(dataToUse)  // Reuse the chart visualization function
        .then(() => {
            // Restore original appearance immediately
            btn.style.opacity = '1';
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        })
        .catch(error => {
            console.error('Error generating Detection Visualization report:', error);
            
            // Show error briefly then restore
            const errorMessage = error.message || 'An unexpected error occurred';
            alert(`Error generating Detection Visualization report: ${errorMessage}. Please try again.`);
            
            // Restore original appearance
            btn.style.opacity = '1';
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        });
}

// Generate Chart Visualization Report (PDF)
function generateChartVisualizationReport() {
    console.log('Generating chart visualization report...');
    
    const btn = document.getElementById('chartVisualizationBtn');
    
    if (!btn) return;
    
    // Store original button content
    const originalHTML = btn.innerHTML;
    
    // Get filtered data or all data
    let dataToUse = window.allStudentReports || [];
    if (window.filterManager && window.filterManager.filteredData) {
        dataToUse = window.filterManager.filteredData;
    }
    
    if (dataToUse.length === 0) {
        alert('No data found to generate chart visualization report.');
        return;
    }
    
    // Show loading state by temporarily reducing opacity
    btn.style.opacity = '0.7';
    btn.disabled = true;
    
    // Generate PDF report with charts
    generateChartVisualizationPDF(dataToUse)
        .then(() => {
            // Restore original appearance immediately
            btn.style.opacity = '1';
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        })
        .catch(error => {
            console.error('Error generating Chart Visualization report:', error);
            
            // Show error briefly then restore
            const errorMessage = error.message || 'An unexpected error occurred';
            alert(`Error generating Chart Visualization report: ${errorMessage}. Please try again.`);
            
            // Restore original appearance
            btn.style.opacity = '1';
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        });
}

// Generate Chart Visualization PDF Report
function generateChartVisualizationPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }
            
            // Generate HTML content with charts
            const htmlContent = generateChartVisualizationHTML(data);
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content and charts to load
            printWindow.onload = function() {
                // Give extra time for chart rendering
                setTimeout(() => {
                    try {
                        // Add print event listeners to the print window
                        let printStarted = false;
                        let printCompleted = false;
                        
                        // Listen for before print event
                        printWindow.addEventListener('beforeprint', function() {
                            printStarted = true;
                            console.log('Print dialog opened');
                        });
                        
                        // Listen for after print event
                        printWindow.addEventListener('afterprint', function() {
                            printCompleted = true;
                            console.log('Print dialog closed');
                            
                            // Small delay to ensure the print dialog has fully closed
                            setTimeout(() => {
                                resolve();
                            }, 100);
                        });
                        
                        // Start the print process
                        printWindow.print();
                        
                        // Fallback: If no print events are detected within 1 second, assume cancelled
                        setTimeout(() => {
                            if (!printStarted && !printCompleted) {
                                console.log('Print dialog appears to have been cancelled immediately');
                                resolve();
                            }
                        }, 1000);
                        
                    } catch (printError) {
                        console.log('Print error or cancellation detected');
                        resolve();
                    }
                }, 2000);
            };
            
            // Timeout fallback - don't close window, just resolve
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    resolve(); // Allow viewing without timeout error
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Generate Violations Summary Report (PDF)
function generateViolationsSummaryReport() {
    console.log('Generating violations summary report...');
    
    const buttonId = 'violationsSummaryBtn';
    const btn = document.getElementById(buttonId);
    
    if (!btn) return;
    
    // Store original button content
    const originalHTML = btn.innerHTML;
    
    try {
        // Get filtered data or all data
        let dataToUse = window.allStudentReports || [];
        if (window.filterManager && window.filterManager.filteredData) {
            dataToUse = window.filterManager.filteredData;
            console.log('Using filtered data:', dataToUse.length, 'records');
        } else {
            console.log('Using all data:', dataToUse.length, 'records');
        }
        
        // Filter for violations only
        const violations = dataToUse.filter(report => {
            const topClothing = (report.top_clothing || '').toLowerCase();
            const bottomClothing = (report.bottom_clothing || '').toLowerCase();
            
            return topClothing === 'sleeveless' || 
                   bottomClothing === 'shorts' || 
                   bottomClothing === 'shorts skirt';
        });
        
        if (violations.length === 0) {
            alert('No violations found in the current data set.');
            return;
        }
        
        console.log('Found', violations.length, 'violations to include in report');
        
        // Show loading state by temporarily adding a loading indicator
        btn.style.opacity = '0.7';
        btn.disabled = true;
        
        // Generate PDF report
        generateViolationsPDF(violations)
            .then(() => {
                // Restore original appearance immediately
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            })
            .catch(error => {
                console.error('Error generating Violations Summary report:', error);
                
                // Show error briefly then restore
                const errorMessage = error.message || 'An unexpected error occurred';
                alert(`Error generating Violations Summary report: ${errorMessage}. Please try again.`);
                
                // Restore original appearance
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            });
            
    } catch (error) {
        console.error('Error in generateViolationsSummaryReport:', error);
        
        // Restore original appearance
        btn.style.opacity = '1';
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        
        const errorMessage = error.message || 'An unexpected error occurred';
        alert(`Error generating Violations Summary report: ${errorMessage}. Please try again.`);
    }
}

// Generate Pending Review Report (PDF)
function generatePendingReviewReport() {
    console.log('Generating pending review report...');
    
    const buttonId = 'pendingReviewBtn';
    const btn = document.getElementById(buttonId);
    
    if (!btn) return;
    
    // Store original button content
    const originalHTML = btn.innerHTML;
    
    try {
        // Get filtered data or all data
        let dataToUse = window.allStudentReports || [];
        if (window.filterManager && window.filterManager.filteredData) {
            dataToUse = window.filterManager.filteredData;
            console.log('Using filtered data:', dataToUse.length, 'records');
        } else {
            console.log('Using all data:', dataToUse.length, 'records');
        }
        
        // Filter for pending reviews only
        const pendingReviews = dataToUse.filter(report => {
            return !report.reviewed || report.reviewed === false;
        });
        
        if (pendingReviews.length === 0) {
            alert('No pending reviews found in the current data set.');
            return;
        }
        
        console.log('Found', pendingReviews.length, 'pending reviews to include in report');
        
        // Show loading state by temporarily adding a loading indicator
        btn.style.opacity = '0.7';
        btn.disabled = true;
        
        // Generate PDF report
        generatePendingReviewPDF(pendingReviews)
            .then(() => {
                // Restore original appearance immediately
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            })
            .catch(error => {
                console.error('Error generating Pending Review report:', error);
                
                // Show error briefly then restore
                const errorMessage = error.message || 'An unexpected error occurred';
                alert(`Error generating Pending Review report: ${errorMessage}. Please try again.`);
                
                // Restore original appearance
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            });
            
    } catch (error) {
        console.error('Error in generatePendingReviewReport:', error);
        
        // Restore original appearance
        btn.style.opacity = '1';
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        
        const errorMessage = error.message || 'An unexpected error occurred';
        alert(`Error generating Pending Review report: ${errorMessage}. Please try again.`);
    }
}

// Generate Violations PDF Report with enhanced error handling
function generateViolationsPDF(violations) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Creating violations PDF window...');
            
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            
            if (!printWindow) {
                throw new Error('Popup blocked. Please enable popups for this site and try again.');
            }
            
            // Generate HTML content for the PDF
            const htmlContent = generateViolationsHTML(violations);
            
            if (!htmlContent) {
                throw new Error('Failed to generate report content.');
            }
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = function() {
                setTimeout(() => {
                    try {
                        // Add print event listeners to the print window
                        let printStarted = false;
                        let printCompleted = false;
                        
                        // Listen for before print event
                        printWindow.addEventListener('beforeprint', function() {
                            printStarted = true;
                            console.log('Print dialog opened');
                        });
                        
                        // Listen for after print event
                        printWindow.addEventListener('afterprint', function() {
                            printCompleted = true;
                            console.log('Print dialog closed');
                            
                            // Small delay to ensure the print dialog has fully closed
                            setTimeout(() => {
                                resolve();
                            }, 100);
                        });
                        
                        // Start the print process
                        printWindow.print();
                        
                        // Fallback: If no print events are detected within 1 second, assume cancelled
                        setTimeout(() => {
                            if (!printStarted && !printCompleted) {
                                console.log('Print dialog appears to have been cancelled immediately');
                                resolve();
                            }
                        }, 1000);
                        
                    } catch (printError) {
                        console.log('Print error or cancellation detected');
                        resolve();
                    }
                }, 500);
            };
            
            // Handle case where window fails to load
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    resolve();
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Generate Pending Review PDF Report with enhanced error handling
function generatePendingReviewPDF(pendingReviews) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Creating pending review PDF window...');
            
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            
            if (!printWindow) {
                throw new Error('Popup blocked. Please enable popups for this site and try again.');
            }
            
            // Generate HTML content for the PDF
            const htmlContent = generatePendingReviewHTML(pendingReviews);
            
            if (!htmlContent) {
                throw new Error('Failed to generate report content.');
            }
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = function() {
                setTimeout(() => {
                    try {
                        // Add print event listeners to the print window
                        let printStarted = false;
                        let printCompleted = false;
                        
                        // Listen for before print event
                        printWindow.addEventListener('beforeprint', function() {
                            printStarted = true;
                            console.log('Print dialog opened');
                        });
                        
                        // Listen for after print event
                        printWindow.addEventListener('afterprint', function() {
                            printCompleted = true;
                            console.log('Print dialog closed');
                            
                            // Small delay to ensure the print dialog has fully closed
                            setTimeout(() => {
                                resolve();
                            }, 100);
                        });
                        
                        // Start the print process
                        printWindow.print();
                        
                        // Fallback: If no print events are detected within 1 second, assume cancelled
                        setTimeout(() => {
                            if (!printStarted && !printCompleted) {
                                console.log('Print dialog appears to have been cancelled immediately');
                                resolve();
                            }
                        }, 1000);
                        
                    } catch (printError) {
                        console.log('Print error or cancellation detected');
                        resolve();
                    }
                }, 500);
            };
            
            // Handle case where window fails to load
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    resolve();
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Generate HTML content for violations report
function generateViolationsHTML(violations) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    // Calculate statistics
    const totalViolations = violations.length;
    const topViolations = violations.filter(v => (v.top_clothing || '').toLowerCase() === 'sleeveless').length;
    const bottomViolations = violations.filter(v => {
        const bottom = (v.bottom_clothing || '').toLowerCase();
        return bottom === 'shorts' || bottom === 'shorts skirt';
    }).length;
    
    // Calculate additional statistics
    const reviewedViolations = violations.filter(v => v.reviewed === true).length;
    const pendingViolations = totalViolations - reviewedViolations;
    const violationRate = totalViolations > 0 ? ((totalViolations / (window.allStudentReports?.length || totalViolations)) * 100).toFixed(1) : 0;
    
    // Utility to pick best evidence image
    function pickEvidenceImage(item) {
        const candidates = [
            item.first_frame_image, item.last_frame_image, item.image_path, 
            item.image_url, item.snapshot_url, item.crop_path,
            item.thumb_url, item.person_image, item.evidence_image
        ].filter(Boolean);
        return candidates[0] || null;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Violations Summary Report</title>
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
                    border-bottom: 3px solid #dc3545;
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
                    background: linear-gradient(90deg, #dc3545, #c82333);
                    border-radius: 2px;
                }
                
                .header h1 { 
                    color: #dc3545; 
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
                    background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
                    padding: 30px; 
                    border-radius: 12px; 
                    margin-bottom: 40px;
                    border: 1px solid #feb2b2;
                    box-shadow: 0 4px 6px rgba(220, 53, 69, 0.1);
                }
                
                .summary h3 { 
                    color: #c53030; 
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                }
                
                .summary h3::before {
                    content: '⚠️';
                    margin-right: 10px;
                    font-size: 1.2rem;
                }
                
                .stats { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px; 
                    margin: 25px 0; 
                }
                
                .stat { 
                    text-align: center; 
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border-top: 3px solid #dc3545;
                }
                
                .stat .number { 
                    font-size: 2.2rem; 
                    font-weight: 700; 
                    color: #dc3545;
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
                
                .section-title {
                    font-size: 1.3rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 40px 0 20px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .violations-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                
                .violations-table th { 
                    background: linear-gradient(135deg, #ffc107, #e0a800);
                    color: #2c3e50; /* Same dark color as other reports */
                    padding: 15px 12px;
                    text-align: left;
                    font-weight: 700; /* Make headers bold */
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .violations-table td { 
                    padding: 15px 12px; 
                    border-bottom: 1px solid #e9ecef;
                    font-size: 0.9rem;
                    vertical-align: top;
                }
                
                .violations-table tr:nth-child(even) { 
                    background-color: #f8f9fa; 
                }
                
                .violations-table tr:hover { 
                    background-color: #fff5f5;
                    transition: background-color 0.2s ease;
                }
                
                .violation-text { 
                    color: #dc3545; 
                    font-weight: 700; /* Red and bold only; no field padding/background */
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
                    object-fit: contain; /* See the full detection image */
                    border-radius: 4px;
                    border: 2px solid #dee2e6;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    background: #fff;
                }
                
                .evidence-image:hover {
                    transform: scale(1.1);
                    border-color: #dc3545;
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
                    color: #dc3545;
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
                <h1>🚨 Violations Summary Report</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="summary">
                <h3>Executive Summary</h3>
                <div class="stats">
                    <div class="stat">
                        <span class="number">${totalViolations}</span>
                        <span class="label">Total Violations</span>
                    </div>
                    <div class="stat">
                        <span class="number">${topViolations}</span>
                        <span class="label">Top Violations</span>
                    </div>
                    <div class="stat">
                        <span class="number">${bottomViolations}</span>
                        <span class="label">Bottom Violations</span>
                    </div>
                    <div class="stat">
                        <span class="number">${violationRate}%</span>
                        <span class="label">Violation Rate</span>
                    </div>
                    <div class="stat">
                        <span class="number">${pendingViolations}</span>
                        <span class="label">Pending Review</span>
                    </div>
                </div>
            </div>
            
            <h3 class="section-title">📋 Detailed Violations</h3>
            <table class="violations-table">
                <thead>
                    <tr>
                        <th>Person ID</th>
                        <th>Evidence</th>
                        <th>Date & Time</th>
                        <th>Top Clothing</th>
                        <th>Bottom Clothing</th>
                        <th>Description</th>
                        <th>Confidence</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${violations.map((violation, index) => {
                        const formattedDate = violation.first_seen_time ? 
                            new Date(violation.first_seen_time).toLocaleDateString('en-US', { 
                                month: 'short', day: '2-digit', year: 'numeric' 
                            }) : 'N/A';
                        const formattedTime = violation.first_seen_time ? 
                            new Date(violation.first_seen_time).toLocaleTimeString('en-US', { 
                                hour: '2-digit', minute: '2-digit' 
                            }) : 'N/A';
                        
                        const isTopViolation = (violation.top_clothing || '').toLowerCase() === 'sleeveless';
                        const isBottomViolation = ['shorts', 'shorts skirt'].includes((violation.bottom_clothing || '').toLowerCase());
                        
                        // Evidence image with robust fallback
                        const imagePath = pickEvidenceImage(violation);
                        
                        return `
                        <tr>
                            <td><span class="person-id">${violation.person_id || 'N/A'}</span></td>
                            <td>
                                ${imagePath ? 
                                    `<img src="${imagePath}" alt="Evidence" class="evidence-image" 
                                         onclick="window.open('${imagePath}', '_blank')" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                     <span class="no-image" style="display:none;">Image not available</span>` :
                                    '<span class="no-image">No image available</span>'
                                }
                            </td>
                            <td class="datetime">${formattedDate}<br>${formattedTime}</td>
                            <td ${isTopViolation ? 'class="violation-text"' : ''}>${violation.top_clothing || 'N/A'}</td>
                            <td ${isBottomViolation ? 'class="violation-text"' : ''}>${violation.bottom_clothing || 'N/A'}</td>
                            <td>${violation.description || 'Clothing violation detected'}</td>
                            <td class="similarity-score">${violation.similarity_score ? violation.similarity_score.toFixed(1) + '%' : 'N/A'}</td>
                            <td>
                                ${violation.reviewed === true ? 
                                    '<span style="color: #28a745; font-weight: 600;">✓ Verified</span>' : 
                                    violation.rejected === true ?
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
                <p>This report was automatically generated with evidence-based violation detection.</p>
                <p>For questions or concerns, please contact the campus administration.</p>
            </div>
        </body>
        </html>
    `;
}

// Generate HTML content for pending review report
function generatePendingReviewHTML(pendingReviews) {
        const currentDate = new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        const currentTime = new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        // Helper to compute simple priority if not present
        function computeSimplePriority(item) {
            const top = (item.top_clothing || '').toLowerCase();
            const bottom = (item.bottom_clothing || '').toLowerCase();
            const sim = Number(item.similarity_score || 0);
            const isViolation = top === 'sleeveless' || bottom === 'shorts' || bottom === 'shorts skirt';
            if (isViolation) return 'high';
            if (sim >= 70) return 'medium';
            return 'regular';
        }

        // Normalize list and compute priority buckets + avg confidence
        const normalized = (pendingReviews || []).map(r => ({
            ...r,
            priorityLevel: (r.priorityLevel || computeSimplePriority(r)).toLowerCase()
        }));

        const totalPending = normalized.length;
        const counts = { high: 0, medium: 0, regular: 0 };
        let confSum = 0, confCount = 0;
        normalized.forEach(r => {
            counts[r.priorityLevel] = (counts[r.priorityLevel] || 0) + 1;
            const c = Number(r.similarity_score);
            if (!Number.isNaN(c)) { confSum += c; confCount++; }
        });
        const avgConfidence = totalPending > 0 ? (confSum / (confCount || 1)).toFixed(1) : 0;

        // Utility to pick best evidence image
        function pickEvidenceImage(item) {
            const candidates = [
                item.first_frame_image, item.last_frame_image, item.image_path, 
                item.image_url, item.snapshot_url, item.crop_path,
                item.thumb_url, item.person_image, item.evidence_image
            ].filter(Boolean);
            return candidates[0] || null;
        }

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pending Review Queue Report</title>
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
                    border-bottom: 3px solid #ffc107;
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
                    background: linear-gradient(90deg, #ffc107, #e0a800);
                    border-radius: 2px;
                }
                
                .header h1 { 
                    color: #ffc107; 
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
                    background: linear-gradient(135deg, #fffbf0 0%, #fff3cd 100%);
                    padding: 30px; 
                    border-radius: 12px; 
                    margin-bottom: 40px;
                    border: 1px solid #ffeaa7;
                    box-shadow: 0 4px 6px rgba(255, 193, 7, 0.1);
                }
                
                .summary h3 { 
                    color: #856404; 
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                }
                
                .summary h3::before {
                    content: '⏳';
                    margin-right: 10px;
                    font-size: 1.2rem;
                }
                
                .stats { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 20px; 
                    margin: 25px 0; 
                }
                
                .stat { 
                    text-align: center; 
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border-top: 3px solid #ffc107;
                }
                
                .stat .number { 
                    font-size: 2.2rem; 
                    font-weight: 700; 
                    color: #ffc107;
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
                
                .section-title {
                    font-size: 1.3rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 40px 0 20px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .priority-notice {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-left: 4px solid #ffc107;
                    padding: 15px 20px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                }
                
                .priority-notice h4 {
                    color: #856404;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                
                .priority-notice p {
                    color: #6c4f00;
                    margin: 0;
                    font-size: 0.95rem;
                }
                
                .pending-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                
                .pending-table th { 
                    background: linear-gradient(135deg, #ffc107, #e0a800);
                    color: #2c3e50;
                    padding: 15px 12px;
                    text-align: left;
                    font-weight: 700; /* Make headers bold */
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .pending-table td { 
                    padding: 15px 12px; 
                    border-bottom: 1px solid #e9ecef;
                    font-size: 0.9rem;
                    vertical-align: top;
                }
                
                .pending-table tr:nth-child(even) { 
                    background-color: #f8f9fa; 
                }
                
                .pending-table tr:hover { 
                    background-color: #fffbf0;
                    transition: background-color 0.2s ease;
                }
                
                .potential-violation { 
                    color: #dc3545; 
                    font-weight: 600;
                    background: #fff5f5;
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid #feb2b2;
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
                
                .confidence-score {
                    font-weight: 600;
                }
                
                .confidence-high { color: #28a745; }
                .confidence-medium { color: #ffc107; }
                .confidence-low { color: #dc3545; }
                
                .evidence-image {
                    width: 140px;
                    height: 140px;
                    object-fit: contain; /* See the full detection image */
                    border-radius: 4px;
                    border: 2px solid #dee2e6;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    background: #fff;
                }
                
                .evidence-image:hover {
                    transform: scale(1.1);
                    border-color: #ffc107;
                }
                
                .no-image {
                    color: #6c757d;
                    font-style: italic;
                    font-size: 0.85rem;
                }
                
                .priority-indicator {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                
                .priority-high { background-color: #dc3545; }
                .priority-medium { background-color: #ffc107; }
                .priority-low { background-color: #28a745; }
                
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
                    color: #ffc107;
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
                <h1>⏳ Pending Review Queue Report</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="summary">
                <h3>Review Queue Summary</h3>
                <div class="stats">
                    <div class="stat">
                        <span class="number">${totalPending}</span>
                        <span class="label">Total Pending</span>
                    </div>
                    <div class="stat">
                        <span class="number">${counts.high}</span>
                        <span class="label">High Priority</span>
                    </div>
                    <div class="stat">
                        <span class="number">${counts.medium}</span>
                        <span class="label">Medium Priority</span>
                    </div>
                    <div class="stat">
                        <span class="number">${counts.regular}</span>
                        <span class="label">Regular</span>
                    </div>
                    <div class="stat">
                        <span class="number">${avgConfidence}%</span>
                        <span class="label">Avg Confidence</span>
                    </div>
                </div>
            </div>
            
            ${counts.high > 0 ? `
            <div class="priority-notice">
                <h4>🚨 Priority Review Required</h4>
                <p>${counts.high} high-priority items require immediate attention and manual verification.</p>
            </div>
            ` : ''}
            
            <h3 class="section-title">📋 Pending Review Queue</h3>
            <table class="pending-table">
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Person ID</th>
                        <th>Evidence</th>
                        <th>Date & Time</th>
                        <th>Top Clothing</th>
                        <th>Bottom Clothing</th>
                        <th>Description</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${normalized.map((review, index) => {
                        const formattedDate = review.first_seen_time ? 
                            new Date(review.first_seen_time).toLocaleDateString('en-US', { 
                                month: 'short', day: '2-digit', year: 'numeric' 
                            }) : 'N/A';
                        const formattedTime = review.first_seen_time ? 
                            new Date(review.first_seen_time).toLocaleTimeString('en-US', { 
                                hour: '2-digit', minute: '2-digit' 
                            }) : 'N/A';
                        
                        const topClothing = (review.top_clothing || '').toLowerCase();
                        const bottomClothing = (review.bottom_clothing || '').toLowerCase();
                        const isPotentialViolation = topClothing === 'sleeveless' || 
                                                   bottomClothing === 'shorts' || 
                                                   bottomClothing === 'shorts skirt';
                        
                        const confidence = Number(review.similarity_score || 0);
                        const confidenceClass = confidence >= 80 ? 'confidence-high' : 
                                              confidence >= 60 ? 'confidence-medium' : 'confidence-low';
                        
                        const priorityClass = review.priorityLevel === 'high' ? 'priority-high' : 
                                              review.priorityLevel === 'medium' ? 'priority-medium' : 'priority-low';
                        
                        // Evidence image with fallback
                        const imagePath = pickEvidenceImage(review);
                        
                        return `
                        <tr>
                            <td>
                                <span class="priority-indicator ${priorityClass}"></span>
                                ${review.priorityLevel === 'high' ? 'High' : review.priorityLevel === 'medium' ? 'Medium' : 'Low'}
                            </td>
                            <td><span class="person-id">${review.person_id || 'N/A'}</span></td>
                            <td>
                                ${imagePath ? 
                                    `<img src="${imagePath}" alt="Evidence" class="evidence-image" 
                                         onclick="window.open('${imagePath}', '_blank')" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                     <span class="no-image" style="display:none;">Image not available</span>` :
                                    '<span class="no-image">No image available</span>'
                                }
                            </td>
                            <td class="datetime">${formattedDate}<br>${formattedTime}</td>
                            <td ${isPotentialViolation && topClothing === 'sleeveless' ? 'class="potential-violation"' : ''}>${review.top_clothing || 'N/A'}</td>
                            <td ${isPotentialViolation && (bottomClothing === 'shorts' || bottomClothing === 'shorts skirt') ? 'class="potential-violation"' : ''}>${review.bottom_clothing || 'N/A'}</td>
                            <td>${review.description || 'Requires manual verification'}</td>
                            <td class="confidence-score ${confidenceClass}">${confidence.toFixed(1)}%</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p><span class="logo">Smart Campus Clothing Verification System</span></p>
                <p>This report contains items awaiting manual review and verification.</p>
                <p>Please prioritize items marked as high priority for immediate attention.</p>
            </div>
        </body>
        </html>
    `;
}

// Generate HTML content for chart visualization report
function generateChartVisualizationHTML(data) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    // Calculate all chart data
    const chartData = calculateAllChartData(data);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Chart Visualization Report</title>
            <meta charset="UTF-8">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body { 
                    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #2c3e50; 
                    background: #ffffff;
                    max-width: 1400px;
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
                
                .chart-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                    gap: 30px;
                    margin-bottom: 40px;
                }
                
                .chart-card {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    border: 1px solid #e9ecef;
                    page-break-inside: avoid;
                }
                
                .chart-title {
                    font-size: 1.3rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    color: #2c3e50;
                    text-align: center;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .chart-container {
                    position: relative;
                    height: 400px;
                    width: 100%;
                }
                
                .chart-container canvas {
                    max-height: 400px !important;
                }
                
                .page-break { 
                    page-break-before: always; 
                }
                
                .footer { 
                    margin-top: 50px; 
                    text-align: center; 
                    color: #6c757d; 
                    font-size: 0.9rem;
                    padding: 25px 0;
                    border-top: 1px solid #e9ecef;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .footer .logo {
                    font-weight: 600;
                    color: #17a2b8;
                    font-size: 1rem;
                }
                
                @media print {
                    body { padding: 20px; }
                    .header h1 { font-size: 2rem; }
                    .chart-grid { grid-template-columns: 1fr 1fr; }
                    .chart-container { height: 350px; }
                    .page-break { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Chart Visualization Report</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="chart-grid">
                <div class="chart-card">
                    <h3 class="chart-title">Top Clothing Distribution</h3>
                    <div class="chart-container">
                        <canvas id="topChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Bottom Clothing Distribution</h3>
                    <div class="chart-container">
                        <canvas id="bottomChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Review Status Distribution</h3>
                    <div class="chart-container">
                        <canvas id="reviewChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Overall Clothing Distribution</h3>
                    <div class="chart-container">
                        <canvas id="clothingChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Detection Trends Over Time</h3>
                    <div class="chart-container">
                        <canvas id="trendsChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Violation Distribution</h3>
                    <div class="chart-container">
                        <canvas id="violationChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Clothing Combination Distribution</h3>
                    <div class="chart-container">
                        <canvas id="combinationChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p><span class="logo">📊 Smart Campus Clothing Verification System</span></p>
                <p>Comprehensive chart visualization dashboard for data analysis and reporting.</p>
                <p>All charts are based on filtered data and real-time analysis.</p>
            </div>
            
            <script>
                // Chart data from server
                const chartData = ${JSON.stringify(chartData)};
                
                // Create all charts
                document.addEventListener('DOMContentLoaded', function() {
                    createTopClothingChart();
                    createBottomClothingChart();
                    createReviewStatusChart();
                    createClothingDistributionChart();
                    createDetectionTrendsChart();
                    createViolationDistributionChart();
                    createCombinationChart();
                });
                
                function createTopClothingChart() {
                    const ctx = document.getElementById('topChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: chartData.topClothing.labels,
                            datasets: [{
                                data: chartData.topClothing.data,
                                backgroundColor: ['#28a745', '#17a2b8', '#dc3545', '#ffc107'],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' },
                                title: { display: false }
                            }
                        }
                    });
                }
                
                function createBottomClothingChart() {
                    const ctx = document.getElementById('bottomChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: chartData.bottomClothing.labels,
                            datasets: [{
                                data: chartData.bottomClothing.data,
                                backgroundColor: ['#28a745', '#17a2b8', '#dc3545', '#ffc107', '#6f42c1'],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' },
                                title: { display: false }
                            }
                        }
                    });
                }
                
                function createReviewStatusChart() {
                    const ctx = document.getElementById('reviewChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: chartData.reviewStatus.labels,
                            datasets: [{
                                data: chartData.reviewStatus.data,
                                backgroundColor: ['#ffc107', '#28a745', '#6c757d'],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' },
                                title: { display: false }
                            }
                        }
                    });
                }
                
                function createClothingDistributionChart() {
                    const ctx = document.getElementById('clothingChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: chartData.clothingDistribution.labels,
                            datasets: [{
                                label: 'Count',
                                data: chartData.clothingDistribution.data,
                                backgroundColor: '#17a2b8',
                                borderColor: '#138496',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                }
                
                function createDetectionTrendsChart() {
                    const ctx = document.getElementById('trendsChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: chartData.detectionTrends.labels,
                            datasets: [{
                                label: 'Detections',
                                data: chartData.detectionTrends.data,
                                borderColor: '#28a745',
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                }
                
                function createViolationDistributionChart() {
                    const ctx = document.getElementById('violationChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: chartData.violationDistribution.labels,
                            datasets: [{
                                data: chartData.violationDistribution.data,
                                backgroundColor: ['#28a745', '#dc3545'],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' },
                                title: { display: false }
                            }
                        }
                    });
                }
                
                function createCombinationChart() {
                    const ctx = document.getElementById('combinationChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: chartData.combinations.labels,
                            datasets: [{
                                label: 'Count',
                                data: chartData.combinations.data,
                                backgroundColor: '#6f42c1',
                                borderColor: '#5a2d91',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true },
                                x: { 
                                    ticks: { 
                                        maxRotation: 45,
                                        minRotation: 45 
                                    }
                                }
                            }
                        }
                    });
                }
            </script>
        </body>
        </html>
    `;
}

// Calculate all chart data for visualization
function calculateAllChartData(data) {
    const chartData = {
        topClothing: { labels: [], data: [] },
        bottomClothing: { labels: [], data: [] },
        reviewStatus: { labels: [], data: [] },
        clothingDistribution: { labels: [], data: [] },
        detectionTrends: { labels: [], data: [] },
        violationDistribution: { labels: [], data: [] },
        combinations: { labels: [], data: [] }
    };
    
    // Top Clothing Distribution
    const topCounts = {};
    data.forEach(item => {
        const top = item.top_clothing || 'Unknown';
        topCounts[top] = (topCounts[top] || 0) + 1;
    });
    chartData.topClothing.labels = Object.keys(topCounts);
    chartData.topClothing.data = Object.values(topCounts);
    
    // Bottom Clothing Distribution
    const bottomCounts = {};
    data.forEach(item => {
        const bottom = item.bottom_clothing || 'Unknown';
        bottomCounts[bottom] = (bottomCounts[bottom] || 0) + 1;
    });
    chartData.bottomClothing.labels = Object.keys(bottomCounts);
    chartData.bottomClothing.data = Object.values(bottomCounts);
    
    // Review Status Distribution
    const statusCounts = { 'Pending': 0, 'Verified': 0, 'Rejected': 0 };
    data.forEach(item => {
        if (item.rejected === true) statusCounts['Rejected']++;
        else if (item.reviewed === true) statusCounts['Verified']++;
        else statusCounts['Pending']++;
    });
    chartData.reviewStatus.labels = Object.keys(statusCounts);
    chartData.reviewStatus.data = Object.values(statusCounts);
    
    // Overall Clothing Distribution (combined)
    const allClothing = {...topCounts, ...bottomCounts};
    chartData.clothingDistribution.labels = Object.keys(allClothing);
    chartData.clothingDistribution.data = Object.values(allClothing);
    
    // Detection Trends (by hour)
    const hourCounts = new Array(24).fill(0);
    data.forEach(item => {
        if (item.first_seen_time) {
            const hour = new Date(item.first_seen_time).getHours();
            hourCounts[hour]++;
        }
    });
    chartData.detectionTrends.labels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    chartData.detectionTrends.data = hourCounts;
    
    // Violation Distribution
    let violations = 0, noViolations = 0;
    data.forEach(item => {
        const top = (item.top_clothing || '').toLowerCase();
        const bottom = (item.bottom_clothing || '').toLowerCase();
        const isViolation = top === 'sleeveless' || bottom === 'shorts' || bottom === 'shorts skirt';
        if (isViolation) violations++;
        else noViolations++;
    });
    chartData.violationDistribution.labels = ['Compliant', 'Violations'];
    chartData.violationDistribution.data = [noViolations, violations];
    
    // Clothing Combinations (top 10)
    const comboCounts = {};
    data.forEach(item => {
        const combo = `${item.top_clothing || 'Unknown'} + ${item.bottom_clothing || 'Unknown'}`;
        comboCounts[combo] = (comboCounts[combo] || 0) + 1;
    });
    const sortedCombos = Object.entries(comboCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    chartData.combinations.labels = sortedCombos.map(([combo]) => combo);
    chartData.combinations.data = sortedCombos.map(([,count]) => count);
    
    return chartData;
}
