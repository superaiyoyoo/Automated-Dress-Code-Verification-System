// Detection Visualization Report Functionality

// Generate Detection Visualization Report (PDF)
function generateDetectionVisualizationReport() {
    console.log('Generating detection visualization report...');
    
    // Get filtered data or all data
    let dataToUse = window.allStudentReports || [];
    if (window.filterManager && window.filterManager.filteredData) {
        dataToUse = window.filterManager.filteredData;
    }
    
    if (dataToUse.length === 0) {
        alert('No data found to generate visualization report.');
        return;
    }
    
    // Show loading state
    const btn = document.getElementById('detectionVisualizationBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
    btn.disabled = true;
    
    // Generate PDF report
    generateDetectionVisualizationPDF(dataToUse)
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
            console.error('Error generating detection visualization report:', error);
            
            // Show error state
            btn.innerHTML = '<i class="fas fa-times me-2"></i>Error';
            alert(`Error generating Detection Visualization report: ${error.message || 'An unexpected error occurred'}. Please try again.`);
            
            // Restore original state after delay
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 3000);
        });
}

// Generate Detection Visualization PDF Report
function generateDetectionVisualizationPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank', 'width=1200,height=800');
            
            if (!printWindow) {
                throw new Error('Popup blocked. Please enable popups for this site and try again.');
            }
            
            // Generate HTML content for the PDF
            const htmlContent = generateDetectionVisualizationHTML(data);
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then print
            printWindow.onload = function() {
                setTimeout(() => {
                    try {
                        printWindow.print();
                        // Keep window open for user to view report even if they cancel print
                        resolve();
                    } catch (printError) {
                        // Even if print fails, keep window open for viewing
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

// Generate HTML content for detection visualization report
function generateDetectionVisualizationHTML(data) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    // Calculate statistics for all charts
    const stats = calculateVisualizationStats(data);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Detection Visualization Report</title>
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
                    border-bottom: 3px solid #1a73e8;
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
                    background: linear-gradient(90deg, #1a73e8, #1557b0);
                    border-radius: 2px;
                }
                
                .header h1 { 
                    color: #1a73e8; 
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
                    background: linear-gradient(135deg, #f0f8ff 0%, #e3f2fd 100%);
                    padding: 30px; 
                    border-radius: 12px; 
                    margin-bottom: 40px;
                    border: 1px solid #bbdefb;
                    box-shadow: 0 4px 6px rgba(26, 115, 232, 0.1);
                }
                
                .summary h3 { 
                    color: #1565c0; 
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
                    border-top: 3px solid #1a73e8;
                    transition: transform 0.2s ease;
                }
                
                .stat:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                
                .stat .number { 
                    font-size: 2.2rem; 
                    font-weight: 700; 
                    color: #1a73e8;
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
                
                .chart-section { 
                    margin: 40px 0;
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    border: 1px solid #e9ecef;
                }
                
                .chart-title { 
                    font-size: 1.3rem; 
                    font-weight: 600; 
                    margin-bottom: 20px; 
                    color: #2c3e50;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                    display: flex;
                    align-items: center;
                }
                
                .chart-title::before {
                    content: '';
                    width: 4px;
                    height: 20px;
                    background: #1a73e8;
                    margin-right: 12px;
                    border-radius: 2px;
                }
                
                .chart-data { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin-bottom: 15px;
                    border: 1px solid #e9ecef;
                }
                
                .chart-item { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    margin: 12px 0; 
                    padding: 10px 0; 
                    border-bottom: 1px solid #dee2e6;
                    transition: background-color 0.2s ease;
                }
                
                .chart-item:last-child { 
                    border-bottom: none; 
                }
                
                .chart-item:hover {
                    background-color: rgba(26, 115, 232, 0.05);
                    border-radius: 4px;
                    padding: 10px;
                    margin: 12px -10px;
                }
                
                .chart-label { 
                    font-weight: 500;
                    color: #495057;
                }
                
                .chart-value { 
                    color: #1a73e8; 
                    font-weight: 600;
                    padding: 4px 8px;
                    background: rgba(26, 115, 232, 0.1);
                    border-radius: 4px;
                }
                
                .violation-value { 
                    color: #dc3545; 
                    font-weight: 600;
                    background: rgba(220, 53, 69, 0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                
                .success-value {
                    color: #28a745;
                    font-weight: 600;
                    background: rgba(40, 167, 69, 0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                
                .warning-value {
                    color: #ffc107;
                    font-weight: 600;
                    background: rgba(255, 193, 7, 0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                
                .hourly-grid {
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
                    gap: 15px; 
                    margin-top: 20px;
                }
                
                .hourly-item {
                    text-align: center; 
                    padding: 15px; 
                    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                    border-radius: 8px;
                    border: 1px solid #90caf9;
                    transition: transform 0.2s ease;
                }
                
                .hourly-item:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 8px rgba(26, 115, 232, 0.2);
                }
                
                .hourly-time {
                    font-weight: 600; 
                    font-size: 0.9rem;
                    color: #1565c0;
                    margin-bottom: 5px;
                }
                
                .hourly-count {
                    color: #1a73e8; 
                    font-size: 1.3rem;
                    font-weight: 700;
                }
                
                .combinations-list {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .combination-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 15px;
                    margin: 8px 0;
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }
                
                .combination-item:hover {
                    background: #f8f9fa;
                    transform: translateX(5px);
                    border-color: #1a73e8;
                }
                
                .combination-text {
                    font-weight: 500;
                    color: #495057;
                }
                
                .combination-stats {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .combination-count {
                    background: #1a73e8;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                
                .combination-percent {
                    color: #6c757d;
                    font-size: 0.9rem;
                    font-weight: 500;
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
                    color: #1a73e8;
                    font-size: 1rem;
                }
                
                .page-break { 
                    page-break-before: always; 
                }
                
                @media print {
                    body { padding: 20px; }
                    .header h1 { font-size: 2rem; }
                    .stat .number { font-size: 1.8rem; }
                    .chart-section { break-inside: avoid; }
                    .hourly-grid { grid-template-columns: repeat(6, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📈 Detection Visualization Report</h1>
                <p class="subtitle">Smart Campus Clothing Verification System</p>
                <p class="timestamp">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="summary">
                <h3>Executive Dashboard</h3>
                <div class="stats">
                    <div class="stat">
                        <span class="number">${stats.totalDetections}</span>
                        <span class="label">Total Detections</span>
                    </div>
                    <div class="stat">
                        <span class="number">${stats.violations}</span>
                        <span class="label">Violations</span>
                    </div>
                    <div class="stat">
                        <span class="number">${stats.pendingReviews}</span>
                        <span class="label">Pending Reviews</span>
                    </div>
                    <div class="stat">
                        <span class="number">${stats.violationRate}%</span>
                        <span class="label">Violation Rate</span>
                    </div>
                    <div class="stat">
                        <span class="number">${stats.verified}</span>
                        <span class="label">Verified</span>
                    </div>
                    <div class="stat">
                        <span class="number">${stats.rejected}</span>
                        <span class="label">Rejected</span>
                    </div>
                </div>
            </div>
            
            <div class="chart-section">
                <div class="chart-title">👕 Clothing Distribution Analysis</div>
                <div class="chart-data">
                    <div class="chart-item">
                        <span class="chart-label">Long Sleeve Top</span>
                        <span class="success-value">${stats.clothingDistribution.longSleeve} (${stats.clothingDistribution.longSleevePercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Short Sleeve Top</span>
                        <span class="success-value">${stats.clothingDistribution.shortSleeve} (${stats.clothingDistribution.shortSleevePercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Sleeveless</span>
                        <span class="violation-value">${stats.clothingDistribution.sleeveless} (${stats.clothingDistribution.sleevelessPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Trousers</span>
                        <span class="success-value">${stats.clothingDistribution.trousers} (${stats.clothingDistribution.trousersPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Long Skirt</span>
                        <span class="success-value">${stats.clothingDistribution.longSkirt} (${stats.clothingDistribution.longSkirtPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Short Skirt</span>
                        <span class="violation-value">${stats.clothingDistribution.shortSkirt} (${stats.clothingDistribution.shortSkirtPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Shorts</span>
                        <span class="violation-value">${stats.clothingDistribution.shorts} (${stats.clothingDistribution.shortsPercent}%)</span>
                    </div>
                </div>
            </div>
            
            <div class="chart-section">
                <div class="chart-title">⚖️ Compliance Analysis</div>
                <div class="chart-data">
                    <div class="chart-item">
                        <span class="chart-label">Policy Violations</span>
                        <span class="violation-value">${stats.violations} (${stats.violationRate}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Compliant Detections</span>
                        <span class="success-value">${stats.noViolations} (${stats.noViolationRate}%)</span>
                    </div>
                </div>
            </div>
            
            <div class="chart-section">
                <div class="chart-title">📋 Review Status Overview</div>
                <div class="chart-data">
                    <div class="chart-item">
                        <span class="chart-label">Pending Review</span>
                        <span class="warning-value">${stats.pendingReviews} (${stats.pendingPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Verified</span>
                        <span class="success-value">${stats.verified} (${stats.verifiedPercent}%)</span>
                    </div>
                    <div class="chart-item">
                        <span class="chart-label">Rejected</span>
                        <span class="chart-value">${stats.rejected} (${stats.rejectedPercent}%)</span>
                    </div>
                </div>
            </div>
            
            <div class="chart-section">
                <div class="chart-title">👔 Top Clothing Combinations</div>
                <div class="combinations-list">
                    ${stats.topCombinations.map((combo, index) => `
                        <div class="combination-item">
                            <span class="combination-text">${combo.combination}</span>
                            <div class="combination-stats">
                                <span class="combination-count">${combo.count}</span>
                                <span class="combination-percent">${combo.percentage}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="chart-section">
                <div class="chart-title">🕐 Hourly Detection Patterns</div>
                <div class="hourly-grid">
                    ${stats.hourlyData.map((hour, index) => `
                        <div class="hourly-item">
                            <div class="hourly-time">${index.toString().padStart(2, '0')}:00</div>
                            <div class="hourly-count">${hour}</div>
                        </div>
                    `).join('')}
                </div>
            
            <div class="footer">
                <p><span class="logo">📊 Smart Campus Clothing Verification System</span></p>
                <p>Advanced analytics and visualization dashboard for comprehensive monitoring.</p>
                <p>All charts and statistics are based on filtered data and real-time analysis.</p>
            </div>
        </body>
        </html>
    `;
}

// Calculate statistics for visualization report
function calculateVisualizationStats(data) {
    const totalDetections = data.length;
    
    // Calculate clothing distribution
    const clothingCounts = {
        longSleeve: 0,
        shortSleeve: 0,
        sleeveless: 0,
        trousers: 0,
        longSkirt: 0,
        shortSkirt: 0,
        shorts: 0
    };
    
    let violations = 0;
    let noViolations = 0;
    let pendingReviews = 0;
    let verified = 0;
    let rejected = 0;
    
    const combinations = {};
    const hourlyData = new Array(24).fill(0);
    
    data.forEach(item => {
        const top = (item.top_clothing || '').toLowerCase();
        const bottom = (item.bottom_clothing || '').toLowerCase();
        
        // Count clothing types
        if (top.includes('long sleeve')) clothingCounts.longSleeve++;
        else if (top.includes('short sleeve')) clothingCounts.shortSleeve++;
        else if (top === 'sleeveless') clothingCounts.sleeveless++;
        
        if (bottom === 'trousers') clothingCounts.trousers++;
        else if (bottom.includes('long skirt')) clothingCounts.longSkirt++;
        else if (bottom.includes('shorts skirt')) clothingCounts.shortSkirt++;
        else if (bottom === 'shorts') clothingCounts.shorts++;
        
        // Count violations
        const isTopViolation = top === 'sleeveless';
        const isBottomViolation = bottom === 'shorts' || bottom === 'shorts skirt';
        
        if (isTopViolation || isBottomViolation) {
            violations++;
        } else {
            noViolations++;
        }
        
        // Count review status
        if (item.rejected === true) {
            rejected++;
        } else if (item.reviewed === true) {
            verified++;
        } else {
            pendingReviews++;
        }
        
        // Count combinations
        const combination = `${item.top_clothing || 'Unknown'} + ${item.bottom_clothing || 'Unknown'}`;
        combinations[combination] = (combinations[combination] || 0) + 1;
        
        // Count hourly data
        if (item.first_seen_time) {
            const date = new Date(item.first_seen_time);
            const hour = date.getHours();
            hourlyData[hour]++;
        }
    });
    
    // Calculate percentages
    const clothingDistribution = {
        longSleeve: clothingCounts.longSleeve,
        longSleevePercent: totalDetections > 0 ? ((clothingCounts.longSleeve / totalDetections) * 100).toFixed(1) : 0,
        shortSleeve: clothingCounts.shortSleeve,
        shortSleevePercent: totalDetections > 0 ? ((clothingCounts.shortSleeve / totalDetections) * 100).toFixed(1) : 0,
        sleeveless: clothingCounts.sleeveless,
        sleevelessPercent: totalDetections > 0 ? ((clothingCounts.sleeveless / totalDetections) * 100).toFixed(1) : 0,
        trousers: clothingCounts.trousers,
        trousersPercent: totalDetections > 0 ? ((clothingCounts.trousers / totalDetections) * 100).toFixed(1) : 0,
        longSkirt: clothingCounts.longSkirt,
        longSkirtPercent: totalDetections > 0 ? ((clothingCounts.longSkirt / totalDetections) * 100).toFixed(1) : 0,
        shortSkirt: clothingCounts.shortSkirt,
        shortSkirtPercent: totalDetections > 0 ? ((clothingCounts.shortSkirt / totalDetections) * 100).toFixed(1) : 0,
        shorts: clothingCounts.shorts,
        shortsPercent: totalDetections > 0 ? ((clothingCounts.shorts / totalDetections) * 100).toFixed(1) : 0
    };
    
    const violationRate = totalDetections > 0 ? ((violations / totalDetections) * 100).toFixed(1) : 0;
    const noViolationRate = totalDetections > 0 ? ((noViolations / totalDetections) * 100).toFixed(1) : 0;
    
    const pendingPercent = totalDetections > 0 ? ((pendingReviews / totalDetections) * 100).toFixed(1) : 0;
    const verifiedPercent = totalDetections > 0 ? ((verified / totalDetections) * 100).toFixed(1) : 0;
    const rejectedPercent = totalDetections > 0 ? ((rejected / totalDetections) * 100).toFixed(1) : 0;
    
    // Get top combinations
    const topCombinations = Object.entries(combinations)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([combination, count]) => ({
            combination,
            count,
            percentage: totalDetections > 0 ? ((count / totalDetections) * 100).toFixed(1) : 0
        }));
    
    return {
        totalDetections,
        violations,
        noViolations,
        violationRate,
        noViolationRate,
        pendingReviews,
        verified,
        rejected,
        pendingPercent,
        verifiedPercent,
        rejectedPercent,
        clothingDistribution,
        topCombinations,
        hourlyData
    };
}
