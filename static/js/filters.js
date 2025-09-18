// Advanced Filter Functionality for Analytics Dashboard

class FilterManager {
    constructor() {
        this.filters = {
            dateRange: null,
            videoSource: 'all',
            reviewStatus: 'all',
            violationType: 'all'
        };
        this.currentData = null;
        this.filteredData = null;
        this.storageKey = 'clothingDetection_filters';
        this.init();
    }

    init() {
        this.loadFiltersFromStorage();
        this.initializeDatePicker();
        this.loadVideoSources();
        this.initializeEventListeners();
        this.loadInitialData();
        // Restore UI state from loaded filters
        this.restoreUIFromFilters();
    }

    // Date Picker Implementation
    initializeDatePicker() {
        this.currentDate = new Date();
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.isSelectingRange = false;

        const datePickerInput = document.getElementById('dateRangePicker');
        const datePickerDropdown = document.getElementById('datePickerDropdown');

        if (!datePickerInput || !datePickerDropdown) return;

        // Toggle date picker
        datePickerInput.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Date picker input clicked');
            this.toggleDatePicker();
        });

        // Also make the calendar icon clickable
        const datePickerIcon = document.querySelector('.date-picker-icon');
        if (datePickerIcon) {
            datePickerIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Date picker icon clicked');
                this.toggleDatePicker();
            });
        }

        // Close date picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!datePickerDropdown.contains(e.target) && !datePickerInput.contains(e.target)) {
                this.hideDatePicker();
            }
        });

        // Reposition date picker on window resize
        window.addEventListener('resize', () => {
            if (datePickerDropdown.style.display !== 'none') {
                this.showDatePicker();
            }
        });

        // Initialize calendar
        this.renderCalendar();
    }

    toggleDatePicker() {
        const dropdown = document.getElementById('datePickerDropdown');
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            this.showDatePicker();
        } else {
            this.hideDatePicker();
        }
    }

    showDatePicker() {
        const dropdown = document.getElementById('datePickerDropdown');
        const input = document.getElementById('dateRangePicker');
        
        // Position the dropdown relative to the input field
        if (input && dropdown) {
            const rect = input.getBoundingClientRect();
            const dropdownWidth = Math.max(280, rect.width);
            const dropdownHeight = 350; // Approximate height of calendar
            
            let top = rect.bottom + 5;
            let left = rect.left;
            
            // Ensure dropdown doesn't go off screen
            if (left + dropdownWidth > window.innerWidth) {
                left = window.innerWidth - dropdownWidth - 10;
            }
            if (left < 10) left = 10;
            
            if (top + dropdownHeight > window.innerHeight) {
                top = rect.top - dropdownHeight - 5;
                if (top < 0) top = rect.bottom + 5;
            }
            
            dropdown.style.position = 'fixed';
            dropdown.style.top = top + 'px';
            dropdown.style.left = left + 'px';
            dropdown.style.width = dropdownWidth + 'px';
            dropdown.style.display = 'block';
            dropdown.style.zIndex = '99999';
            
            console.log('Calendar positioned at:', { top, left, width: dropdownWidth });
        }
        
        this.renderCalendar();
    }

    hideDatePicker() {
        const dropdown = document.getElementById('datePickerDropdown');
        dropdown.style.display = 'none';
    }

    renderCalendar() {
        const currentMonthYear = document.getElementById('currentMonthYear');
        const datePickerDays = document.getElementById('datePickerDays');
        
        if (!currentMonthYear || !datePickerDays) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        currentMonthYear.textContent = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Clear previous days
        datePickerDays.innerHTML = '';

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'date-picker-day other-month';
            emptyDay.textContent = '';
            datePickerDays.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'date-picker-day';
            dayElement.textContent = day;
            
            const currentDay = new Date(year, month, day);
            
            // Check if this day is selected
            if (this.selectedStartDate && this.isSameDate(currentDay, this.selectedStartDate)) {
                dayElement.classList.add('range-start');
            } else if (this.selectedEndDate && this.isSameDate(currentDay, this.selectedEndDate)) {
                dayElement.classList.add('range-end');
            } else if (this.isDateInRange(currentDay)) {
                dayElement.classList.add('in-range');
            }

            // Add click event listener with proper event handling
            dayElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Day clicked:', day, currentDay);
                this.selectDate(currentDay);
            });
            
            // Ensure the element is clickable
            dayElement.style.pointerEvents = 'auto';
            dayElement.style.cursor = 'pointer';
            dayElement.style.userSelect = 'none';
            dayElement.style.webkitUserSelect = 'none';
            dayElement.style.mozUserSelect = 'none';
            dayElement.style.msUserSelect = 'none';
            
            datePickerDays.appendChild(dayElement);
        }

        // Add navigation event listeners
        this.initializeNavigation();
    }

    initializeNavigation() {
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        const clearDateRange = document.getElementById('clearDateRange');
        const applyDateRange = document.getElementById('applyDateRange');

        // Remove existing event listeners to prevent duplicates
        if (prevMonth) {
            prevMonth.replaceWith(prevMonth.cloneNode(true));
            document.getElementById('prevMonth').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextMonth) {
            nextMonth.replaceWith(nextMonth.cloneNode(true));
            document.getElementById('nextMonth').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        if (clearDateRange) {
            clearDateRange.replaceWith(clearDateRange.cloneNode(true));
            document.getElementById('clearDateRange').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearDateRange();
            });
        }

        if (applyDateRange) {
            applyDateRange.replaceWith(applyDateRange.cloneNode(true));
            document.getElementById('applyDateRange').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.applyDateRange();
            });
        }
    }

    selectDate(date) {
        console.log('Date selected:', date);
        
        if (!this.selectedStartDate || (this.selectedStartDate && this.selectedEndDate)) {
            // Start new selection
            this.selectedStartDate = new Date(date);
            this.selectedEndDate = null;
            this.isSelectingRange = true;
            console.log('Starting new date selection:', this.selectedStartDate);
        } else {
            // Complete range selection
            if (date < this.selectedStartDate) {
                this.selectedEndDate = new Date(this.selectedStartDate);
                this.selectedStartDate = new Date(date);
            } else {
                this.selectedEndDate = new Date(date);
            }
            this.isSelectingRange = false;
            console.log('Completed date range:', this.selectedStartDate, 'to', this.selectedEndDate);
        }
        
        this.updateDateInput();
        this.renderCalendar();
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    isDateInRange(date) {
        if (!this.selectedStartDate || !this.selectedEndDate) return false;
        return date >= this.selectedStartDate && date <= this.selectedEndDate;
    }

    updateDateInput() {
        const datePickerInput = document.getElementById('dateRangePicker');
        if (!datePickerInput) return;

        if (this.selectedStartDate && this.selectedEndDate) {
            const startStr = this.selectedStartDate.toLocaleDateString();
            const endStr = this.selectedEndDate.toLocaleDateString();
            datePickerInput.value = `${startStr} - ${endStr}`;
            // Don't apply filters immediately, wait for Apply button
            this.filters.dateRange = {
                start: this.selectedStartDate,
                end: this.selectedEndDate
            };
            this.saveFiltersToStorage();
        } else if (this.selectedStartDate) {
            datePickerInput.value = this.selectedStartDate.toLocaleDateString();
            // Don't apply filters immediately, wait for Apply button
            this.filters.dateRange = {
                start: this.selectedStartDate,
                end: this.selectedStartDate
            };
            this.saveFiltersToStorage();
        } else {
            datePickerInput.value = '';
            this.filters.dateRange = null;
            this.saveFiltersToStorage();
        }
        // Note: We don't call applyFilters() here anymore
    }

    clearDateRange() {
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.isSelectingRange = false;
        this.filters.dateRange = null;
        this.updateDateInput();
        this.renderCalendar();
        this.saveFiltersToStorage();
    }

    applyDateRange() {
        this.hideDatePicker();
        // Don't apply filters automatically, let user click main Apply button
        console.log('Date range selected, click Apply to filter');
    }

    // Load Video Sources
    async loadVideoSources() {
        try {
            const response = await fetch('/api/uploaded-videos');
            const videos = await response.json();
            
            const videoFilter = document.getElementById('videoFilter');
            if (!videoFilter) return;

            // Clear existing options except "All Videos"
            videoFilter.innerHTML = '<option value="all">All Videos</option>';

            // Add video options
            videos.forEach(video => {
                const option = document.createElement('option');
                option.value = video.filename;
                option.textContent = video.filename;
                videoFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading video sources:', error);
        }
    }

    // Initialize Event Listeners
    initializeEventListeners() {
        // Video filter change
        const videoFilter = document.getElementById('videoFilter');
        if (videoFilter) {
            videoFilter.addEventListener('change', (e) => {
                this.filters.videoSource = e.target.value;
                this.saveFiltersToStorage();
            });
        }

        // Review status filter change
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.reviewStatus = e.target.value;
                this.saveFiltersToStorage();
            });
        }

        // Violation type filter change
        const violationFilter = document.getElementById('violationFilter');
        if (violationFilter) {
            violationFilter.addEventListener('change', (e) => {
                this.filters.violationType = e.target.value;
                this.saveFiltersToStorage();
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                // Update filter values from UI before applying
                this.syncFiltersFromUI();
                this.applyFilters();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }

    // Sync filters from UI elements
    syncFiltersFromUI() {
        const videoFilter = document.getElementById('videoFilter');
        if (videoFilter) {
            this.filters.videoSource = videoFilter.value;
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            this.filters.reviewStatus = statusFilter.value;
        }

        const violationFilter = document.getElementById('violationFilter');
        if (violationFilter) {
            this.filters.violationType = violationFilter.value;
        }
        
        // Date range is already synced in updateDateInput(), but make sure it's current
        const datePickerInput = document.getElementById('dateRangePicker');
        if (datePickerInput && datePickerInput.value) {
            if (this.selectedStartDate && this.selectedEndDate) {
                this.filters.dateRange = {
                    start: this.selectedStartDate,
                    end: this.selectedEndDate
                };
            } else if (this.selectedStartDate) {
                this.filters.dateRange = {
                    start: this.selectedStartDate,
                    end: this.selectedStartDate
                };
            }
        } else {
            this.filters.dateRange = null;
        }
        
        console.log('Synced filters from UI:', this.filters);
    }

    // Load Initial Data
    async loadInitialData() {
        try {
            // Wait for the reporting.js to load the data
            if (window.allStudentReports) {
                this.currentData = window.allStudentReports;
                this.filteredData = [...this.currentData];
                
                // Apply saved filters if any exist
                if (this.hasActiveFilters()) {
                    this.applyFilters();
                } else {
                    this.updateChartsAndReports();
                }
            } else {
                // If data not loaded yet, check if we're on dashboard page and load data directly
                if (window.location.pathname === '/' || window.location.pathname.includes('index')) {
                    console.log('Dashboard page detected, loading student reports data directly...');
                    await this.loadStudentReportsData();
                } else {
                    // If data not loaded yet, wait a bit and try again
                    setTimeout(() => this.loadInitialData(), 100);
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Load student reports data directly from API
    async loadStudentReportsData() {
        try {
            console.log('Fetching student clothing reports for dashboard...');
            const response = await fetch('/api/student-clothing-reports');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            
            console.log('Received student clothing reports for dashboard:', data);
            // Store data globally for consistency
            window.allStudentReports = data;
            this.currentData = data;
            this.filteredData = [...data];
            
            // Apply saved filters if any exist
            if (this.hasActiveFilters()) {
                console.log('Applying saved filters to loaded data...');
                this.applyFilters();
            } else {
                console.log('No active filters, using all data');
                this.updateChartsAndReports();
            }
        } catch (error) {
            console.error('Error loading student reports data:', error);
            // Set empty data to prevent infinite retries
            window.allStudentReports = [];
            this.currentData = [];
            this.filteredData = [];
        }
    }

    // Apply Filters
    applyFilters() {
        console.log('Applying filters:', this.filters);
        
        if (!this.currentData) {
            console.warn('No data available to filter');
            return;
        }

        this.filteredData = this.currentData.filter(item => {
            // Date range filter
            if (this.filters.dateRange) {
                const itemDateStr = item.first_seen_time;
                if (itemDateStr) {
                    // Parse the date string - handle different formats
                    let itemDate;
                    if (itemDateStr.includes('-')) {
                        // Format like "2024-12-13" or "2024-12-13 10:30:00"
                        itemDate = new Date(itemDateStr);
                    } else {
                        // Try to parse other formats
                        itemDate = new Date(itemDateStr);
                    }
                    
                    // Set to start of day for comparison
                    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                    const startDateOnly = new Date(this.filters.dateRange.start.getFullYear(), this.filters.dateRange.start.getMonth(), this.filters.dateRange.start.getDate());
                    const endDateOnly = new Date(this.filters.dateRange.end.getFullYear(), this.filters.dateRange.end.getMonth(), this.filters.dateRange.end.getDate());
                    
                    console.log('Date comparison:', {
                        itemDate: itemDateOnly,
                        startDate: startDateOnly,
                        endDate: endDateOnly,
                        personId: item.person_id
                    });
                    
                    if (itemDateOnly < startDateOnly || itemDateOnly > endDateOnly) {
                        console.log('Item filtered out by date:', item.person_id, itemDateOnly);
                        return false;
                    }
                } else {
                    console.log('Item has no date, filtering out:', item.person_id);
                    return false;
                }
            }

            // Video source filter
            if (this.filters.videoSource !== 'all') {
                // Implement video source filtering based on your data structure
                // This would need the video filename/path stored in the item data
                console.log('Video filter not yet implemented for:', this.filters.videoSource);
            }

            // Review status filter
            if (this.filters.reviewStatus !== 'all') {
                const isReviewed = item.reviewed === true;
                const isRejected = item.rejected === true;
                
                console.log('Review status check:', {
                    filter: this.filters.reviewStatus,
                    isReviewed,
                    isRejected,
                    personId: item.person_id
                });
                
                if (this.filters.reviewStatus === 'pending' && isReviewed) {
                    console.log('Item filtered out - not pending:', item.person_id);
                    return false;
                } else if (this.filters.reviewStatus === 'verified' && (!isReviewed || isRejected)) {
                    console.log('Item filtered out - not verified:', item.person_id);
                    return false;
                } else if (this.filters.reviewStatus === 'rejected' && !isRejected) {
                    console.log('Item filtered out - not rejected:', item.person_id);
                    return false;
                }
            }

            // Violation type filter
            if (this.filters.violationType !== 'all') {
                const topClothing = (item.top_clothing || '').toLowerCase();
                const bottomClothing = (item.bottom_clothing || '').toLowerCase();
                
                console.log('Violation filter check:', {
                    filter: this.filters.violationType,
                    topClothing,
                    bottomClothing,
                    personId: item.person_id
                });
                
                if (this.filters.violationType === 'sleeveless' && topClothing !== 'sleeveless') {
                    console.log('Item filtered out - not sleeveless:', item.person_id);
                    return false;
                } else if (this.filters.violationType === 'shorts' && bottomClothing !== 'shorts') {
                    console.log('Item filtered out - not shorts:', item.person_id);
                    return false;
                } else if (this.filters.violationType === 'shorts skirt' && bottomClothing !== 'shorts skirt') {
                    console.log('Item filtered out - not shorts skirt:', item.person_id);
                    return false;
                } else if (this.filters.violationType === 'no violations') {
                    const hasViolation = topClothing === 'sleeveless' || 
                                       bottomClothing === 'shorts' || 
                                       bottomClothing === 'shorts skirt';
                    if (hasViolation) {
                        console.log('Item filtered out - has violation:', item.person_id);
                        return false;
                    }
                }
            }

            return true;
        });

        console.log('Filtered data count:', this.filteredData.length);
        console.log('Filtered data:', this.filteredData);
        
        this.updateChartsAndReports();
        this.saveFiltersToStorage();
    }

    // Reset Filters
    resetFilters() {
        this.filters = {
            dateRange: null,
            videoSource: 'all',
            reviewStatus: 'all',
            violationType: 'all'
        };

        // Reset UI elements
        const datePickerInput = document.getElementById('dateRangePicker');
        if (datePickerInput) datePickerInput.value = '';

        const videoFilter = document.getElementById('videoFilter');
        if (videoFilter) videoFilter.value = 'all';

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) statusFilter.value = 'all';

        const violationFilter = document.getElementById('violationFilter');
        if (violationFilter) violationFilter.value = 'all';

        // Clear date selection
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.isSelectingRange = false;

        // Reset data and update display
        this.filteredData = this.currentData ? [...this.currentData] : [];
        this.updateChartsAndReports();
        
        // Clear filters from storage
        this.clearFiltersFromStorage();
        
        // When filters are reset, restore original data from server
        if (typeof loadAndRenderDashboardStats === 'function') {
            loadAndRenderDashboardStats();
        }
        
        // Force refresh of reporting page data from server
        if (typeof fetchClothingDistribution === 'function') {
            fetchClothingDistribution(true); // Force server data
        }
        if (typeof fetchReviewStatusData === 'function') {
            fetchReviewStatusData(true); // Force server data
        }
    }

    // Update Charts and Reports
    updateChartsAndReports() {
        // Update student clothing table
        this.updateStudentClothingTable();
        
        // Update charts with filtered data
        this.updateChartsWithFilteredData();
        
        // Update summary statistics
        this.updateSummaryStatistics();
        
        // Update dashboard stats if available
        this.updateDashboardStats();
        
        // Update dashboard charts if available
        this.updateDashboardCharts();
        
        // Update export filter indicator if available
        this.updateExportFilterIndicator();
    }

    updateStudentClothingTable() {
        // Use the existing renderStudentClothingTable function with filtered data
        console.log('Updating student table with filtered data:', this.filteredData.length, 'items');
        if (typeof renderStudentClothingTable === 'function') {
            renderStudentClothingTable(this.filteredData);
        } else {
            console.error('renderStudentClothingTable function not found');
        }
    }

    updateChartsWithFilteredData() {
        console.log('Updating charts with filtered data:', this.filteredData.length, 'items');
        
        // If no filtered data, show empty charts
        if (this.filteredData.length === 0) {
            console.log('No filtered data - showing empty charts');
            
            // Update charts with empty data but keep default appearance
            if (typeof renderTopClothingChart === 'function') {
                const emptyTopData = {
                    'long sleeve top': { quantity: 0, percentage: 0 },
                    'short sleeve top': { quantity: 0, percentage: 0 },
                    'sleeveless': { quantity: 0, percentage: 0 }
                };
                renderTopClothingChart(emptyTopData);
            }
            
            if (typeof renderBottomClothingChart === 'function') {
                const emptyBottomData = {
                    'trousers': { quantity: 0, percentage: 0 },
                    'long skirt': { quantity: 0, percentage: 0 },
                    'shorts skirt': { quantity: 0, percentage: 0 },
                    'shorts': { quantity: 0, percentage: 0 }
                };
                renderBottomClothingChart(emptyBottomData);
            }

            if (typeof renderReviewStatusChart === 'function') {
                renderReviewStatusChart({ pending: 0, verified: 0, rejected: 0 });
            }
            
            return;
        }
        
        // Calculate clothing distribution from filtered data
        const clothingDistribution = this.calculateClothingDistribution();
        console.log('Clothing distribution calculated:', clothingDistribution);
        
        // Update charts
        if (typeof renderTopClothingChart === 'function') {
            const topData = this.filterTopClothing(clothingDistribution.top);
            console.log('Updating top clothing chart with:', topData);
            renderTopClothingChart(topData);
        }
        
        if (typeof renderBottomClothingChart === 'function') {
            const bottomData = this.filterBottomClothing(clothingDistribution.bottom);
            console.log('Updating bottom clothing chart with:', bottomData);
            renderBottomClothingChart(bottomData);
        }

        // Update review status chart
        const reviewStatus = this.calculateReviewStatus();
        console.log('Updating review status chart with:', reviewStatus);
        if (typeof renderReviewStatusChart === 'function') {
            renderReviewStatusChart(reviewStatus);
        }

        // Update clothing distribution data for other charts
        if (typeof fetchClothingDistribution === 'function') {
            // Create a mock data structure that matches the expected format
            const mockClothingData = {
                total_people: this.filteredData.length,
                top_clothing_distribution: clothingDistribution.top,
                bottom_clothing_distribution: clothingDistribution.bottom
            };
            
            // Update summary statistics
            if (typeof updateSummaryStatistics === 'function') {
                updateSummaryStatistics(mockClothingData);
            }
        }
    }

    calculateClothingDistribution() {
        const topDistribution = {};
        const bottomDistribution = {};

        this.filteredData.forEach(item => {
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
        const totalItems = this.filteredData.length || 1;
        Object.values(topDistribution).forEach(item => {
            item.percentage = (item.quantity / totalItems) * 100;
        });
        Object.values(bottomDistribution).forEach(item => {
            item.percentage = (item.quantity / totalItems) * 100;
        });

        return { top: topDistribution, bottom: bottomDistribution };
    }

    calculateReviewStatus() {
        let pending = 0;
        let verified = 0;
        let rejected = 0;

        this.filteredData.forEach(item => {
            const isReviewed = item.reviewed === true;
            const isRejected = item.rejected === true;

            if (isRejected) {
                rejected++;
            } else if (isReviewed) {
                verified++;
            } else {
                pending++;
            }
        });

        return { pending, verified, rejected };
    }

    updateSummaryStatistics() {
        const totalDetections = this.filteredData.length;
        const violations = this.filteredData.filter(item => {
            const topClothing = (item.top_clothing || '').toLowerCase();
            const bottomClothing = (item.bottom_clothing || '').toLowerCase();
            return topClothing === 'sleeveless' || 
                   bottomClothing === 'shorts' || 
                   bottomClothing === 'shorts skirt';
        }).length;

        const violationRate = totalDetections > 0 ? Math.round((violations / totalDetections) * 100) : 0;

        console.log('Summary statistics:', {
            totalDetections,
            violations,
            violationRate
        });

        // Update DOM elements
        const totalDetectionsEl = document.getElementById('totalDetectionsCount');
        if (totalDetectionsEl) {
            totalDetectionsEl.textContent = totalDetections;
            console.log('Updated total detections:', totalDetections);
        }

        const violationsEl = document.getElementById('violationsFoundCount');
        if (violationsEl) {
            violationsEl.textContent = violations;
            console.log('Updated violations count:', violations);
        }

        const violationRateEl = document.getElementById('violationRatePercent');
        if (violationRateEl) {
            violationRateEl.textContent = `${violationRate}%`;
            console.log('Updated violation rate:', violationRate + '%');
        }

        const pendingEl = document.getElementById('pendingReviewCount');
        if (pendingEl) {
            const reviewStatus = this.calculateReviewStatus();
            pendingEl.textContent = reviewStatus.pending;
            console.log('Updated pending review count:', reviewStatus.pending);
        }
    }

    // Helper methods for filtering clothing categories
    filterTopClothing(clothingData) {
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

    filterBottomClothing(clothingData) {
        const bottomCategories = ["shorts", "shorts skirt", "long skirt", "trousers"];
        const filteredData = {};
        
        bottomCategories.forEach(category => {
            if (clothingData[category]) {
                filteredData[category] = clothingData[category];
            } else {
                filteredData[category] = { quantity: 0, percentage: 0 };
            }
        });
        
        return filteredData;
    }

    // Update dashboard stats based on filtered data
    updateDashboardStats() {
        if (!this.filteredData || this.filteredData.length === 0) {
            // If no filtered data, show zeros
            this.renderDashboardStats({
                total_detections: 0,
                pending: 0,
                verified: 0,
                rejected: 0
            });
            return;
        }

        // Calculate stats from filtered data
        const reviewStatus = this.calculateReviewStatus();
        const stats = {
            total_detections: this.filteredData.length,
            pending: reviewStatus.pending,
            verified: reviewStatus.verified,
            rejected: reviewStatus.rejected
        };

        this.renderDashboardStats(stats);
    }

    // Render dashboard stats to the UI
    renderDashboardStats(stats) {
        console.log('Updating dashboard stats with filtered data:', stats);
        
        const statTotalDetections = document.getElementById('statTotalDetections');
        if (statTotalDetections) {
            statTotalDetections.textContent = stats.total_detections ?? 0;
        }

        const statPending = document.getElementById('statPending');
        if (statPending) {
            statPending.textContent = stats.pending ?? 0;
        }

        const statVerified = document.getElementById('statVerified');
        if (statVerified) {
            statVerified.textContent = stats.verified ?? 0;
        }

        const statRejected = document.getElementById('statRejected');
        if (statRejected) {
            statRejected.textContent = stats.rejected ?? 0;
        }
    }

    // Update dashboard charts with filtered data
    updateDashboardCharts() {
        console.log('Updating dashboard charts with filtered data:', this.filteredData.length, 'items');
        
        // Only update dashboard charts if we're on a page with dashboard charts
        const clothingChart = document.getElementById('clothingChart');
        const trendChart = document.getElementById('trendChart');
        const violationChart = document.getElementById('violationChart');
        const combinationChart = document.getElementById('combinationChart');
        
        // If none of the dashboard chart elements exist, skip
        if (!clothingChart && !trendChart && !violationChart && !combinationChart) {
            console.log('No dashboard chart elements found, skipping dashboard chart updates');
            return;
        }
        
        // Update clothing distribution chart
        if (typeof createClothingDistributionFromData === 'function') {
            createClothingDistributionFromData(this.filteredData);
        } else if (typeof loadClothingDistribution === 'function') {
            loadClothingDistribution();
        }
        
        // Update detection trends chart
        if (typeof createDetectionTrendsFromData === 'function') {
            createDetectionTrendsFromData(this.filteredData);
        } else if (typeof loadDetectionTrends === 'function') {
            loadDetectionTrends();
        }
        
        // Update violation distribution chart
        if (typeof createViolationDistributionFromData === 'function') {
            createViolationDistributionFromData(this.filteredData);
        } else if (typeof loadViolationDistribution === 'function') {
            loadViolationDistribution();
        }
        
        // Update combination clothing chart
        if (typeof createCombinationClothingFromData === 'function') {
            createCombinationClothingFromData(this.filteredData);
        } else if (typeof loadCombinationClothing === 'function') {
            loadCombinationClothing();
        }
        
        console.log('Dashboard charts updated with filtered data');
    }

    // Update export filter indicator
    updateExportFilterIndicator() {
        const indicator = document.getElementById('exportFilterIndicator');
        const recordCount = document.getElementById('filteredRecordCount');
        const buttonText = document.getElementById('exportButtonText');
        
        if (!indicator || !recordCount || !buttonText) {
            // Elements don't exist on this page
            return;
        }
        
        const hasActiveFilters = this.hasActiveFilters();
        
        if (hasActiveFilters && this.filteredData) {
            // Show indicator with filtered record count
            indicator.style.display = 'block';
            recordCount.textContent = `${this.filteredData.length} records`;
            buttonText.textContent = 'Export Filtered Data';
        } else {
            // Hide indicator
            indicator.style.display = 'none';
            buttonText.textContent = 'Generate Export';
        }
    }

    // Persistent Storage Methods
    saveFiltersToStorage() {
        try {
            const filterState = {
                filters: this.filters,
                selectedStartDate: this.selectedStartDate,
                selectedEndDate: this.selectedEndDate,
                dateRangeText: this.getDateRangeText()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(filterState));
            console.log('Filters saved to storage:', filterState);
        } catch (error) {
            console.error('Error saving filters to storage:', error);
        }
    }

    loadFiltersFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const filterState = JSON.parse(saved);
                this.filters = { ...this.filters, ...filterState.filters };
                
                // Restore date selection
                if (filterState.selectedStartDate) {
                    this.selectedStartDate = new Date(filterState.selectedStartDate);
                }
                if (filterState.selectedEndDate) {
                    this.selectedEndDate = new Date(filterState.selectedEndDate);
                }
                
                console.log('Filters loaded from storage:', filterState);
                return true;
            }
        } catch (error) {
            console.error('Error loading filters from storage:', error);
        }
        return false;
    }

    restoreUIFromFilters() {
        // Restore date picker
        const datePickerInput = document.getElementById('dateRangePicker');
        if (datePickerInput && (this.selectedStartDate || this.selectedEndDate)) {
            datePickerInput.value = this.getDateRangeText();
        }

        // Restore dropdown selections (only if elements exist on current page)
        const videoFilter = document.getElementById('videoFilter');
        if (videoFilter) videoFilter.value = this.filters.videoSource;

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) statusFilter.value = this.filters.reviewStatus;

        const violationFilter = document.getElementById('violationFilter');
        if (violationFilter) violationFilter.value = this.filters.violationType;

        console.log('UI restored from filters:', this.filters);
        
        // If we have active filters and are on a page that supports filtering,
        // ensure the filter state is properly applied
        if (this.hasActiveFilters() && this.currentData) {
            console.log('Active filters detected, applying to current data');
            this.applyFilters();
        }
    }

    getDateRangeText() {
        if (this.selectedStartDate && this.selectedEndDate) {
            return `${this.selectedStartDate.toLocaleDateString()} - ${this.selectedEndDate.toLocaleDateString()}`;
        } else if (this.selectedStartDate) {
            return `${this.selectedStartDate.toLocaleDateString()} - Select end date`;
        }
        return '';
    }

    hasActiveFilters() {
        return this.filters.dateRange !== null ||
               this.filters.videoSource !== 'all' ||
               this.filters.reviewStatus !== 'all' ||
               this.filters.violationType !== 'all';
    }

    updateDataAfterAction(personId, action) {
        // Update the current data to reflect the action
        if (this.currentData) {
            const person = this.currentData.find(p => p.person_id === personId);
            if (person) {
                if (action === 'verified') {
                    person.reviewed = true;
                    person.rejected = false;
                } else if (action === 'rejected') {
                    person.reviewed = true;
                    person.rejected = true;
                }
                
                // Re-apply filters to update filtered data
                if (this.hasActiveFilters()) {
                    this.applyFilters();
                } else {
                    this.filteredData = [...this.currentData];
                    this.updateChartsAndReports();
                }
            }
        }
    }

    clearFiltersFromStorage() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('Filters cleared from storage');
        } catch (error) {
            console.error('Error clearing filters from storage:', error);
        }
    }
}

// Initialize filter manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.filterManager = new FilterManager();
});

// Global API for other pages to access filtered data
window.getFilteredData = function() {
    if (window.filterManager && window.filterManager.filteredData) {
        return window.filterManager.filteredData;
    }
    return null;
};

window.hasActiveFilters = function() {
    if (window.filterManager) {
        return window.filterManager.hasActiveFilters();
    }
    return false;
};

window.getCurrentFilters = function() {
    if (window.filterManager) {
        return window.filterManager.filters;
    }
    return null;
};
