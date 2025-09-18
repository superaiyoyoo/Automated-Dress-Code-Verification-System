// Main JavaScript for SCCVS Dashboard

// Sidebar Toggle Functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    
    if (window.innerWidth <= 991.98) {
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('show');
        }
    }
});

// Initialize dashboard charts
function initDashboardCharts() {
    // Load clothing distribution data and create chart
    loadClothingDistribution();
    
    // Load detection trends data and create chart
    loadDetectionTrends();
    
    // Load violation distribution data and create chart
    loadViolationDistribution();
    
    // Load combination clothing data and create chart
    loadCombinationClothing();
    
    // Wire dashboard refresh feedback
    initDashboardRefresh();
}

// Load and create clothing distribution chart
async function loadClothingDistribution() {
    try {
        // Check if there are active filters and use filtered data
        if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
            const filteredData = window.getFilteredData();
            if (filteredData) {
                console.log('Using filtered data for clothing distribution chart:', filteredData.length, 'items');
                createClothingDistributionFromData(filteredData);
                return;
            }
        }
        
        // Fallback to server data if no filters or filtered data
        const response = await fetch('/processed_data/clothing_summary.json');
        const data = await response.json();
        
        const clothingCtx = document.getElementById('clothingChart');
        if (clothingCtx) {
            // Get top and bottom clothing data from the summary
            const topClothing = data.top_clothing_distribution || {};
            const bottomClothing = data.bottom_clothing_distribution || {};
            
            // Map to our chart structure
            const clothingData = {
                'Long Sleeve': topClothing['long sleeve top']?.quantity || 0,
                'Short Sleeve': topClothing['short sleeve top']?.quantity || 0,
                'Sleeveless': topClothing['sleeveless']?.quantity || 0,
                'Trousers': bottomClothing['trousers']?.quantity || 0,
                'Long Skirt': bottomClothing['long skirt']?.quantity || 0,
                'Short Skirt': bottomClothing['shorts skirt']?.quantity || 0,
                'Shorts': bottomClothing['shorts']?.quantity || 0
            };
            
            const labels = Object.keys(clothingData);
            const chartData = Object.values(clothingData);
            
            // Color scheme to match violations (red) and non-violations (green/blue)
            const colors = [
                '#1a73e8',    // Long sleeve top - Dark Blue
                '#4285F4',    // Short sleeve top - Blue
                '#ea4335',    // Sleeveless - Red (violation)
                '#34A853',    // Trousers - Green
                '#fbbc05',    // Long skirt - Yellow
                '#ff6d01',    // Short skirt - Orange (violation)
                '#d93025'     // Shorts - Dark Red (violation)
            ];
            
            createClothingDistributionChart(clothingCtx, labels, chartData, colors);
        }
    } catch (error) {
        console.error('Error loading clothing distribution data:', error);
        // Fallback to sample data
        createFallbackClothingChart();
    }
}

// Create clothing distribution chart from filtered data
function createClothingDistributionFromData(data) {
    const clothingCtx = document.getElementById('clothingChart');
    if (!clothingCtx) return;
    
    // Count clothing types from filtered data
    const clothingCounts = {
        'Long Sleeve': 0,
        'Short Sleeve': 0,
        'Sleeveless': 0,
        'Trousers': 0,
        'Long Skirt': 0,
        'Short Skirt': 0,
        'Shorts': 0
    };
    
    data.forEach(item => {
        const topClothing = (item.top_clothing || '').toLowerCase();
        const bottomClothing = (item.bottom_clothing || '').toLowerCase();
        
        // Map top clothing
        if (topClothing === 'long sleeve top') clothingCounts['Long Sleeve']++;
        else if (topClothing === 'short sleeve top') clothingCounts['Short Sleeve']++;
        else if (topClothing === 'sleeveless') clothingCounts['Sleeveless']++;
        
        // Map bottom clothing
        if (bottomClothing === 'trousers') clothingCounts['Trousers']++;
        else if (bottomClothing === 'long skirt') clothingCounts['Long Skirt']++;
        else if (bottomClothing === 'shorts skirt') clothingCounts['Short Skirt']++;
        else if (bottomClothing === 'shorts') clothingCounts['Shorts']++;
    });
    
    const labels = Object.keys(clothingCounts);
    const chartData = Object.values(clothingCounts);
    const colors = [
        '#1a73e8',    // Long sleeve top - Dark Blue
        '#4285F4',    // Short sleeve top - Blue
        '#ea4335',    // Sleeveless - Red (violation)
        '#34A853',    // Trousers - Green
        '#fbbc05',    // Long skirt - Yellow
        '#ff6d01',    // Short skirt - Orange (violation)
        '#d93025'     // Shorts - Dark Red (violation)
    ];
    
    createClothingDistributionChart(clothingCtx, labels, chartData, colors);
}

// Helper function to create the clothing distribution chart
function createClothingDistributionChart(ctx, labels, data, colors) {
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11
                        },
                        filter: function(legendItem, chartData) {
                            // Only show items with data > 0
                            return chartData.datasets[0].data[legendItem.index] > 0;
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : '0';
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderRadius: 8
                }
            }
        }
    });
}

function createFallbackClothingChart() {
    const clothingCtx = document.getElementById('clothingChart');
    if (clothingCtx) {
        // Show all 7 categories with sample data
        const labels = [
            'Long Sleeve',
            'Short Sleeve', 
            'Sleeveless',
            'Trousers',
            'Long Skirt',
            'Short Skirt', 
            'Shorts'
        ];
        
        const data = [0, 4, 0, 3, 0, 0, 1]; // Based on actual data: 4 short sleeve tops, 3 trousers, 1 shorts
        
        const colors = [
            '#1a73e8',    // Long sleeve top - Dark Blue
            '#4285F4',    // Short sleeve top - Blue
            '#ea4335',    // Sleeveless - Red (violation)
            '#34A853',    // Trousers - Green
            '#fbbc05',    // Long skirt - Yellow
            '#ff6d01',    // Short skirt - Orange (violation)
            '#d93025'     // Shorts - Dark Red (violation)
        ];
        
        new Chart(clothingCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 11
                            },
                            filter: function(legendItem, chartData) {
                                // Only show items with data > 0
                                return chartData.datasets[0].data[legendItem.index] > 0;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed * 100) / total).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                elements: {
                    arc: {
                        borderRadius: 8
                    }
                }
            }
        });
    }
}

// Load and create detection trends chart
async function loadDetectionTrends() {
    try {
        // Check if there are active filters and use filtered data
        if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
            const filteredData = window.getFilteredData();
            if (filteredData) {
                console.log('Using filtered data for detection trends chart:', filteredData.length, 'items');
                createDetectionTrendsFromData(filteredData);
                return;
            }
        }
        
        // Fallback to loading detection files if no filters
        const detectionFiles = await loadDetectionFiles();
        const trendCtx = document.getElementById('trendChart');
        
        if (trendCtx) {
            if (detectionFiles.length > 0) {
                createDetectionTrendsFromData(detectionFiles);
            } else {
                // Show empty chart instead of fallback data
                createFallbackTrendChart();
            }
        }
    } catch (error) {
        console.error('Error loading detection trends data:', error);
        createFallbackTrendChart();
    }
}

// Create detection trends chart from data (filtered or unfiltered)
function createDetectionTrendsFromData(data) {
    const trendCtx = document.getElementById('trendChart');
    if (!trendCtx) return;
    
    // If no data, show empty state
    if (data.length === 0) {
        createFallbackTrendChart();
        return;
    }
    
    // Process time intervals (10-minute intervals from 0-60 minutes)
    const timeIntervals = ['0-10min', '10-20min', '20-30min', '30-40min', '40-50min', '50-60min'];
    const violatedCounts = [0, 0, 0, 0, 0, 0];
    const nonViolatedCounts = [0, 0, 0, 0, 0, 0];
    
    console.log('Processing detection trends for', data.length, 'detections');
    
    // Analyze detection data using actual first_seen_time
    data.forEach(detection => {
        if (detection.first_seen_time) {
            // Parse the time format "2025-06-26 14:04:45.039"
            const timeStr = detection.first_seen_time.replace(' ', 'T'); // Convert to ISO format
            const time = new Date(timeStr);
            const minutes = time.getMinutes();
            const seconds = time.getSeconds();
            
            // Calculate total seconds from start of hour for more precise intervals
            const totalSeconds = minutes * 60 + seconds;
            const intervalIndex = Math.floor(totalSeconds / 600); // 600 seconds = 10 minutes
            
            console.log(`Person ${detection.person_id}: time=${detection.first_seen_time}, interval=${intervalIndex}, violation=${detection.violation}`);
            
            if (intervalIndex >= 0 && intervalIndex < 6) {
                if (detection.violation) {
                    violatedCounts[intervalIndex]++;
                } else {
                    nonViolatedCounts[intervalIndex]++;
                }
            }
        }
    });
    
    console.log('Violation counts by interval:', violatedCounts);
    console.log('Non-violation counts by interval:', nonViolatedCounts);
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(trendCtx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: timeIntervals,
            datasets: [{
                label: 'Violations Detected',
                data: violatedCounts,
                borderColor: '#EA4335',
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#EA4335',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: 'Non-Violations',
                data: nonViolatedCounts,
                borderColor: '#34A853',
                backgroundColor: 'rgba(52, 168, 83, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#34A853',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
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
}

function createFallbackTrendChart() {
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        // Check if chart already exists and destroy it
        const existingChart = Chart.getChart(trendCtx);
        if (existingChart) {
            existingChart.destroy();
        }

        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['0-10min', '10-20min', '20-30min', '30-40min', '40-50min', '50-60min'],
                datasets: [{
                    label: 'Violations Detected',
                    data: [0, 0, 0, 0, 0, 0], // Empty data
                    borderColor: '#EA4335',
                    backgroundColor: 'rgba(234, 67, 53, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#EA4335',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }, {
                    label: 'Non-Violations',
                    data: [0, 0, 0, 0, 0, 0], // Empty data
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#34A853',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
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
    }
}

// Load and create violation distribution chart
async function loadViolationDistribution() {
    try {
        // Check if there are active filters and use filtered data
        if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
            const filteredData = window.getFilteredData();
            if (filteredData) {
                console.log('Using filtered data for violation distribution chart:', filteredData.length, 'items');
                createViolationDistributionFromData(filteredData);
                return;
            }
        }
        
        // Try to load from violation summary first
        try {
            const response = await fetch('/processed_data/violation_summary.json');
            if (response.ok) {
                const violationData = await response.json();
                if (violationData.total_detections > 0) {
                    createViolationDistributionFromSummary(violationData);
                    return;
                }
            }
        } catch (summaryError) {
            console.log('Violation summary not available, loading from detection files');
        }
        
        // Fallback to loading detection files if no summary
        const detectionFiles = await loadDetectionFiles();
        const violationCtx = document.getElementById('violationChart');
        
        if (violationCtx) {
            if (detectionFiles.length > 0) {
                createViolationDistributionFromData(detectionFiles);
            } else {
                // Show empty chart instead of fallback data
                createFallbackViolationChart();
            }
        }
    } catch (error) {
        console.error('Error loading violation distribution data:', error);
        createFallbackViolationChart();
    }
}

// Create violation chart from violation summary data
function createViolationDistributionFromSummary(violationSummary) {
    const violationCtx = document.getElementById('violationChart');
    if (!violationCtx) return;
    
    const distribution = violationSummary.violation_distribution;
    const labels = [];
    const data = [];
    const colors = [];
    
    const colorMap = {
        'sleeveless_tops': '#EA4335',
        'shorts': '#FBBC05', 
        'short_skirts': '#FF6B35',
        'no_violations': '#34A853'
    };
    
    const labelMap = {
        'sleeveless_tops': 'Sleeveless Tops',
        'shorts': 'Shorts',
        'short_skirts': 'Short Skirts', 
        'no_violations': 'No Violations'
    };
    
    // Only include categories with data
    Object.keys(distribution).forEach(key => {
        if (distribution[key] > 0) {
            labels.push(labelMap[key]);
            data.push(distribution[key]);
            colors.push(colorMap[key]);
        }
    });
    
    // If no data, show fallback
    if (data.length === 0) {
        createFallbackViolationChart();
        return;
    }
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(violationCtx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(violationCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#666',
                        font: {
                            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#333',
                    borderWidth: 1
                }
            }
        }
    });
}

// Create violation distribution chart from data (filtered or unfiltered)
function createViolationDistributionFromData(data) {
    const violationCtx = document.getElementById('violationChart');
    if (!violationCtx) return;
    
    // Count violation types from actual clothing data
    const violationCounts = {
        'Sleeveless Tops': 0,
        'Shorts': 0,
        'Short Skirts': 0,
        'No Violations': 0
    };
    
    data.forEach(detection => {
        let hasViolation = false;
        
        // Check for sleeveless violation
        if (detection.top_clothing && detection.top_clothing.toLowerCase() === 'sleeveless') {
            violationCounts['Sleeveless Tops']++;
            hasViolation = true;
        }
        
        // Check for shorts violation
        if (detection.bottom_clothing && detection.bottom_clothing.toLowerCase() === 'shorts') {
            violationCounts['Shorts']++;
            hasViolation = true;
        }
        
        // Check for short skirt violation  
        if (detection.bottom_clothing && detection.bottom_clothing.toLowerCase() === 'shorts skirt') {
            violationCounts['Short Skirts']++;
            hasViolation = true;
        }
        
        // If no violations found
        if (!hasViolation) {
            violationCounts['No Violations']++;
        }
    });
    
    // If no data at all, show empty state
    if (data.length === 0) {
        createFallbackViolationChart();
        return;
    }
    
    const labels = Object.keys(violationCounts);
    const chartData = Object.values(violationCounts);
    const colors = ['#EA4335', '#FBBC05', '#FF6B35', '#34A853'];
    
    // Filter out zero values for cleaner display
    const filteredData = [];
    const filteredLabels = [];
    const filteredColors = [];
    
    chartData.forEach((value, index) => {
        if (value > 0) {
            filteredData.push(value);
            filteredLabels.push(labels[index]);
            filteredColors.push(colors[index]);
        }
    });
    
    // If no violations at all, show just "No Violations"
    if (filteredData.length === 0 || (filteredData.length === 1 && filteredLabels[0] === 'No Violations')) {
        filteredData.push(violationCounts['No Violations'] || 1);
        filteredLabels.splice(0, filteredLabels.length, 'No Violations');
        filteredColors.splice(0, filteredColors.length, '#34A853');
    }
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(violationCtx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(violationCtx, {
        type: 'doughnut',
        data: {
            labels: filteredLabels,
            datasets: [{
                data: filteredData,
                backgroundColor: filteredColors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : '0';
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderRadius: 8
                }
            }
        }
    });
}

function createFallbackViolationChart() {
    const violationCtx = document.getElementById('violationChart');
    if (violationCtx) {
        new Chart(violationCtx, {
            type: 'doughnut',
            data: {
                labels: ['No Data Available'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e9ecef'],
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#666',
                            font: {
                                family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }
}

// Helper function to load detection files from individual person JSON files
async function loadDetectionFiles() {
    try {
        // Get the detection directories first
        const dirResponse = await fetch('/api/detection-files');
        if (!dirResponse.ok) {
            console.warn('Could not load detection directories, no data available');
            return [];
        }
        
        const directories = await dirResponse.json();
        const detectionFiles = [];
        
        // Get the first (and likely only) video directory
        const videoDirNames = Object.keys(directories);
        if (videoDirNames.length === 0) {
            console.warn('No detection directories found, no data available');
            return [];
        }
        
        const videoDir = videoDirNames[0];
        console.log('Loading detection files from:', videoDir);
        
        // Get list of person files dynamically
        const personFilesResponse = await fetch(`/api/person-files/${videoDir}`);
        if (!personFilesResponse.ok) {
            console.warn('Could not load person files list, no data available');
            return [];
        }
        
        const personFiles = await personFilesResponse.json();
        console.log('Found person files:', personFiles);
        
        // Load each person detection file
        for (const personFile of personFiles) {
            try {
                const personResponse = await fetch(`/detection_images/${personFile.file_path}`);
                
                if (personResponse.ok) {
                    const personData = await personResponse.json();
                    console.log(`Loaded data for person ${personFile.person_id}:`, personData);
                    detectionFiles.push(personData);
                } else {
                    console.warn(`Could not load data for person ${personFile.person_id}`);
                }
            } catch (err) {
                console.warn(`Error loading person ${personFile.person_id}:`, err);
            }
        }
        
        if (detectionFiles.length === 0) {
            console.warn('No person files loaded, no data available');
            return [];
        }
        
        console.log('Successfully loaded detection files:', detectionFiles);
        return detectionFiles;
    } catch (error) {
        console.error('Error loading detection files:', error);
        return [];
    }
}

// Load and create combination clothing chart
async function loadCombinationClothing() {
    try {
        // Check if there are active filters and use filtered data
        if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
            const filteredData = window.getFilteredData();
            if (filteredData) {
                console.log('Using filtered data for combination clothing chart:', filteredData.length, 'items');
                createCombinationClothingFromData(filteredData);
                return;
            }
        }
        
        // Fallback to server data if no filters
        const response = await fetch('/processed_data/clothing_summary.json');
        const data = await response.json();
        
        const combinationCtx = document.getElementById('combinationChart');
        if (combinationCtx) {
            // Get combinations from most_common_combinations
            const combinations = data.most_common_combinations || {};
            const combinationLabels = Object.keys(combinations);
            const combinationQuantities = Object.values(combinations).map(combo => Number(combo.quantity) || 0);
            const combinationData = combinationQuantities.slice();
            const combinationPercentages = Object.values(combinations).map(combo => {
                if (typeof combo.percentage === 'number') return combo.percentage;
                const total = combinationQuantities.reduce((a,b)=>a+b,0) || 1;
                return ((Number(combo.quantity) || 0) * 100) / total;
            });
            
            createCombinationClothingChart(combinationCtx, combinationLabels, combinationData, combinationQuantities, combinationPercentages);
        }
    } catch (error) {
        console.error('Error loading combination clothing data:', error);
        createFallbackCombinationChart();
    }
}

// Create combination clothing chart from filtered data
function createCombinationClothingFromData(data) {
    const combinationCtx = document.getElementById('combinationChart');
    if (!combinationCtx) return;
    
    // Count clothing combinations from filtered data
    const combinations = {};
    
    data.forEach(item => {
        const topClothing = item.top_clothing || 'unknown';
        const bottomClothing = item.bottom_clothing || 'unknown';
        const combination = `${topClothing} + ${bottomClothing}`;
        
        combinations[combination] = (combinations[combination] || 0) + 1;
    });
    
    // Sort by quantity and take top 8
    const sortedCombinations = Object.entries(combinations)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    const combinationLabels = sortedCombinations.map(([label]) => label);
    const combinationData = sortedCombinations.map(([,count]) => count);
    const total = combinationData.reduce((a, b) => a + b, 0);
    const combinationPercentages = combinationData.map(count => total > 0 ? (count * 100) / total : 0);
    
    createCombinationClothingChart(combinationCtx, combinationLabels, combinationData, combinationData, combinationPercentages);
}

// Helper function to create combination clothing chart
function createCombinationClothingChart(ctx, labels, data, quantities, percentages) {
    // Color scheme for combinations
    const combinationColors = [
        '#4285F4', '#34A853', '#EA4335', '#FBBC05', 
        '#FF6B35', '#9C27B0', '#00BCD4', '#FF9800'
    ];
    
    // Check if chart already exists and destroy it
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: data,
                backgroundColor: combinationColors.slice(0, labels.length),
                borderColor: combinationColors.slice(0, labels.length),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const qty = quantities[idx] ?? 0;
                            const pct = (percentages[idx] ?? 0).toFixed(1);
                            return `${context.label}: ${qty} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function createFallbackCombinationChart() {
    const combinationCtx = document.getElementById('combinationChart');
    if (combinationCtx) {
        new Chart(combinationCtx, {
            type: 'bar',
            data: {
                labels: ['Short Sleeve Top + Trousers', 'Short Sleeve Top + Shorts'],
                datasets: [{
                    label: 'Count',
                    data: [3, 1],
                    backgroundColor: ['#4285F4', '#EA4335'],
                    borderColor: ['#4285F4', '#EA4335'],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                            }
                    },
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
}

// Generate fallback detection data
function generateFallbackDetectionData() {
    return [
        {
            person_id: '1',
            top_clothing: 'short sleeve top',
            bottom_clothing: 'shorts',
            violation: true,
            violation_categories: ['shorts'],
            first_seen_time: '2025-06-26T14:04:45.039Z',
            reviewed: true,
            rejected: false
        },
        {
            person_id: '3',
            top_clothing: 'short sleeve top',
            bottom_clothing: 'trousers',
            violation: false,
            violation_categories: [],
            first_seen_time: '2025-06-26T14:06:12.150Z',
            reviewed: true,
            rejected: false
        },
        {
            person_id: '5',
            top_clothing: 'short sleeve top',
            bottom_clothing: 'trousers',
            violation: false,
            violation_categories: [],
            first_seen_time: '2025-06-26T14:07:45.320Z',
            reviewed: true,
            rejected: false
        },
        {
            person_id: '11',
            top_clothing: 'short sleeve top',
            bottom_clothing: 'trousers',
            violation: false,
            violation_categories: [],
            first_seen_time: '2025-06-26T14:08:30.480Z',
            reviewed: false,
            rejected: false
        }
    ];
}

// File Upload Drag and Drop
function initFileUpload() {
    const uploadArea = document.querySelector('.file-upload-area');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadArea.classList.add('dragover');
    }

    function unhighlight() {
        uploadArea.classList.remove('dragover');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        ([...files]).forEach(uploadFile);
    }

    function uploadFile(file) {
        console.log('File uploaded:', file.name);
        // Add upload logic here
    }
}

// Zone Drawing Canvas (placeholder)
function initZoneDrawing() {
    const canvas = document.getElementById('zoneCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentPath = [];

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        currentPath = [{
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }];
    }

    function draw(e) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        currentPath.push({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        redrawCanvas();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (currentPath.length > 1) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            
            ctx.strokeStyle = '#4285F4';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Initialize tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Update real-time stats (placeholder)
function updateRealTimeStats() {
    // This would connect to WebSocket or poll API for real-time updates
    console.log('Updating real-time stats...');
}

// Dashboard refresh button feedback similar to reporting page
function initDashboardRefresh() {
    const refreshBtn = document.getElementById('refreshDashboard');
    if (!refreshBtn) return;
    
    refreshBtn.addEventListener('click', async function() {
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
        refreshBtn.disabled = true;
        
        // Check if filters are active
        const hasActiveFilters = window.hasActiveFilters && window.hasActiveFilters();
        
        try {
            if (hasActiveFilters) {
                console.log('Refreshing dashboard with active filters - will refresh server data then re-apply filters');
                
                // First refresh the student reports (this updates the base data for filter manager)
                const response = await fetch('/api/student-clothing-reports');
                const data = await response.json();
                
                // Update filter manager's current data
                if (window.filterManager) {
                    window.filterManager.currentData = data;
                    console.log('Updated filter manager base data with', data.length, 'items');
                    
                    // Re-apply current filters to update filteredData
                    window.filterManager.applyFilters();
                    console.log('Re-applied filters, now have', window.filterManager.filteredData.length, 'filtered items');
                }
                
                // Now refresh all dashboard components - they will use the filtered data
                await Promise.all([
                    loadClothingDistribution(),
                    loadDetectionTrends(),
                    loadViolationDistribution(),
                    loadCombinationClothing(),
                    loadAndRenderDashboardStats()
                ]);
                
                console.log('Dashboard refreshed with filters maintained');
            } else {
                console.log('Refreshing dashboard without filters - normal refresh');
                
                // Helper to ensure functions never reject
                const safe = async (fn) => {
                    try { await fn(); } catch (e) { console.warn('Refresh step failed (continuing):', e); }
                };

                await Promise.all([
                    safe(loadClothingDistribution),
                    safe(loadDetectionTrends),
                    safe(loadViolationDistribution),
                    safe(loadCombinationClothing),
                    safe(loadAndRenderDashboardStats)
                ]);
            }
            
            // Show success feedback
            refreshBtn.innerHTML = '<i class="fas fa-check text-success me-2"></i>Refreshed';
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 1000);
            
        } catch (e) {
            console.error('Dashboard refresh error', e);
            refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-2"></i>Error';
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 2000);
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we should wait for filter manager
    const initDashboard = async () => {
        // Wait for filter manager to be ready and have data loaded
        if (window.filterManager) {
            console.log('Filter manager detected, waiting for data to be loaded...');
            
            // Wait for filter manager to load data
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            while (attempts < maxAttempts) {
                if (window.filterManager.currentData && window.filterManager.currentData.length > 0) {
                    console.log('Filter manager data loaded, initializing dashboard...');
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.hasActiveFilters && window.hasActiveFilters()) {
                console.log('Active filters detected on dashboard, initializing with filtered data');
                // Show filter indicator
                showActiveFiltersIndicator();
            } else {
                console.log('No active filters detected, initializing dashboard normally');
                hideActiveFiltersIndicator();
            }
        } else {
            console.log('No filter manager detected, initializing dashboard normally');
            hideActiveFiltersIndicator();
        }
        
        // Initialize dashboard components
        initDashboardCharts();
        initFileUpload();
        initZoneDrawing();
        initTooltips();
        initDashboardStats();
        // Update stats every 30 seconds
        setInterval(updateRealTimeStats, 30000);
    };
    
    // Initialize clear filters button
    initClearFiltersButton();
    
    // Start initialization
    initDashboard();
});

// Show active filters indicator
function showActiveFiltersIndicator() {
    const indicator = document.getElementById('activeFiltersIndicator');
    if (indicator) {
        indicator.style.display = 'block';
    }
}

// Hide active filters indicator
function hideActiveFiltersIndicator() {
    const indicator = document.getElementById('activeFiltersIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Initialize clear filters button
function initClearFiltersButton() {
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (window.filterManager) {
                console.log('Clearing all filters from dashboard');
                window.filterManager.resetFilters();
                window.filterManager.updateChartsAndReports();
                hideActiveFiltersIndicator();
                
                // Refresh dashboard to show unfiltered data
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        });
    }
}

// Export functions for use in other scripts
window.SCCVS = {
    toggleSidebar,
    initDashboardCharts,
    initFileUpload,
    initZoneDrawing,
    updateRealTimeStats
};

// Dashboard stats: fetch and populate Total, Pending, Verified, Rejected
async function initDashboardStats() {
    try {
        await loadAndRenderDashboardStats();
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadAndRenderDashboardStats);
        }
    } catch (e) {
        console.error('Failed to init dashboard stats', e);
    }
}

async function loadAndRenderDashboardStats() {
    try {
        // Check if there are active filters and filtered data available
        if (window.hasActiveFilters && window.hasActiveFilters() && window.getFilteredData) {
            const filteredData = window.getFilteredData();
            if (filteredData) {
                console.log('Using filtered data for dashboard stats:', filteredData.length, 'items');
                const stats = calculateStatsFromData(filteredData);
                renderDashboardStats(stats);
                return;
            }
        }
        
        // Fallback to server data if no filters or filtered data
        const res = await fetch('/api/dashboard-stats');
        const stats = await res.json();
        renderDashboardStats(stats);
    } catch (e) {
        console.error('Error fetching dashboard stats', e);
    }
}

function calculateStatsFromData(data) {
    const stats = {
        total_detections: data.length,
        pending: 0,
        verified: 0,
        rejected: 0
    };
    
    data.forEach(item => {
        const isReviewed = item.reviewed;
        const isRejected = item.rejected;
        
        if (isRejected) {
            stats.rejected++;
        } else if (isReviewed) {
            stats.verified++;
        } else {
            stats.pending++;
        }
    });
    
    return stats;
}

function renderDashboardStats(stats) {
    const el = (id) => document.getElementById(id);
    if (el('statTotalDetections')) el('statTotalDetections').textContent = stats.total_detections ?? 0;
    if (el('statPending')) el('statPending').textContent = stats.pending ?? 0;
    if (el('statVerified')) el('statVerified').textContent = stats.verified ?? 0;
    if (el('statRejected')) el('statRejected').textContent = stats.rejected ?? 0;
}

