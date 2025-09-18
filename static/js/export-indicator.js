// This function updates export filter indicator - added separately to avoid replacement conflicts
function updateExportFilterIndicator() {
    const indicator = document.getElementById('exportFilterIndicator');
    const recordCount = document.getElementById('filteredRecordCount');
    const buttonText = document.getElementById('exportButtonText');
    
    if (!indicator || !recordCount || !buttonText) return;
    
    const hasActiveFilters = window.hasActiveFilters && window.hasActiveFilters();
    
    if (hasActiveFilters && window.getFilteredData) {
        const filteredData = window.getFilteredData();
        if (filteredData) {
            // Show indicator with filtered record count
            indicator.style.display = 'block';
            recordCount.textContent = `${filteredData.length} records`;
            buttonText.textContent = 'Export Filtered Data';
        } else {
            indicator.style.display = 'none';
            buttonText.textContent = 'Generate Export';
        }
    } else {
        // Hide indicator
        indicator.style.display = 'none';
        buttonText.textContent = 'Generate Export';
    }
}

// Call this function when the page loads to set initial state
document.addEventListener('DOMContentLoaded', function() {
    // Delay to ensure filter manager is initialized
    setTimeout(updateExportFilterIndicator, 300);
});