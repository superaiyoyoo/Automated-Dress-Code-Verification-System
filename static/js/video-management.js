// Video Management JavaScript with Threaded Processing Integration

class VideoManager {
    constructor() {
        this.draggedFiles = [];
        this.initializeEventListeners();
        this.initializeStyles();
    }
    
    initializeStyles() {
        // Add custom CSS for the processing UI and table improvements
        const styleId = 'video-manager-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                #fileUploadArea.processing {
                    position: relative;
                    pointer-events: none;
                }
                
                #fileUploadArea.processing::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(240, 240, 240, 0.7);
                    z-index: 1;
                }
                
                .processing-message .spinner-border {
                    width: 3rem;
                    height: 3rem;
                }
                
                .progress-text {
                    font-size: 1rem;
                }
                
                /* Video library table improvements */
                #videoLibraryTable {
                    font-size: 0.875rem;
                }
                
                #videoLibraryTable thead th {
                    border-bottom: 2px solid #dee2e6;
                    background-color: #f8f9fa !important;
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                #videoLibraryTable tbody tr {
                    border-bottom: 1px solid #dee2e6;
                }
                
                #videoLibraryTable tbody tr:hover {
                    background-color: #f8f9fa;
                }
                
                #videoLibraryTable td {
                    vertical-align: middle;
                    padding: 0.75rem;
                }
                
                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.375rem;
                    font-weight: 500;
                }
                
                .btn-group .btn {
                    padding: 0.25rem 0.5rem;
                }
                
                /* Responsive table adjustments */
                @media (max-width: 768px) {
                    #videoLibraryTable {
                        font-size: 0.75rem;
                    }
                    
                    #videoLibraryTable td {
                        padding: 0.5rem;
                    }
                    
                    .btn-group .btn {
                        padding: 0.2rem 0.4rem;
                    }
                }
                
                /* Professional Modal Enhancements */
                .modal-content {
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .modal-header {
                    padding: 1.5rem 1.5rem 1rem 1.5rem;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .modal-footer {
                    padding: 1rem 1.5rem 1.5rem 1.5rem;
                    background-color: #f8f9fa;
                }
                
                /* Error Modal Specific Styles */
                #errorModal .modal-content {
                    border: none;
                    box-shadow: 0 10px 40px rgba(220, 53, 69, 0.15);
                }
                
                #errorModal .modal-header {
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                    border: none;
                }
                
                #errorModal .rounded-circle {
                    animation: pulse-error 2s infinite;
                }
                
                @keyframes pulse-error {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                /* Success Modal Specific Styles */
                #successModal .modal-content {
                    border: none;
                    box-shadow: 0 10px 40px rgba(40, 167, 69, 0.15);
                }
                
                #successModal .modal-header {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    border: none;
                }
                
                #successModal .rounded-circle {
                    animation: pulse-success 2s infinite;
                }
                
                @keyframes pulse-success {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                /* Confirmation Modal Specific Styles */
                #confirmationModal .modal-content {
                    border: none;
                    box-shadow: 0 10px 40px rgba(255, 193, 7, 0.15);
                }
                
                #confirmationModal .modal-header {
                    background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
                    border: none;
                }
                
                #confirmationModal .rounded-circle {
                    animation: pulse-warning 2s infinite;
                }
                
                @keyframes pulse-warning {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                /* Modal text wrapping and overflow handling */
                .modal-body h6, .modal-body p {
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    hyphens: auto;
                }
                
                .modal-body {
                    max-width: 100%;
                    overflow-x: hidden;
                }
                
                .modal-dialog {
                    max-width: 500px;
                    margin: 1.75rem auto;
                }
                
                /* Ensure long filenames wrap properly */
                #confirmationModalSubtitle, #confirmationModalMessage, 
                #errorModalSubtitle, #errorModalMessage,
                #successModalSubtitle, #successModalMessage {
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    white-space: pre-wrap;
                    max-width: 100%;
                }
                
                /* Modal Animation Enhancements */
                .modal.fade .modal-dialog {
                    transform: scale(0.8) translateY(-50px);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .modal.show .modal-dialog {
                    transform: scale(1) translateY(0);
                }
                
                /* Alert enhancements */
                .alert {
                    border-radius: 8px;
                    border: none;
                }
                
                .border-start {
                    border-left-width: 4px !important;
                }
                
                /* Button hover effects */
                .modal .btn {
                    transition: all 0.2s ease;
                    border-radius: 6px;
                }
                
                .modal .btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
            `;
            document.head.appendChild(style);
        }
    }

    initializeEventListeners() {
        // File upload handlers
        this.initFileUpload();
        
        // Modal upload handler
        this.initModalUpload();
        
        // Refresh button handler
        this.initRefreshButton();
    }

    initFileUpload() {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'video/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
        uploadArea.addEventListener('click', () => {
            // Check if upload is disabled
            if (uploadArea.style.pointerEvents === 'none') {
                return;
            }
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    }

    initModalUpload() {
        // Get the upload button in the modal
        const modalUploadButton = document.querySelector('#uploadModal .btn-primary');
        if (modalUploadButton) {
            modalUploadButton.addEventListener('click', () => this.handleModalUpload());
        }
    }

    initRefreshButton() {
        // Get the refresh button and add click event listener
        const refreshButton = document.getElementById('refreshVideosBtn');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshVideoLibrary());
        }
    }

    async refreshVideoLibrary() {
        const refreshBtn = document.getElementById('refreshVideosBtn');
        if (!refreshBtn) return;

        // Add loading state to button
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;

        try {
            // Call the existing updateVideoLibrary method
            await this.updateVideoLibrary();
            
            // Show success feedback
            refreshBtn.innerHTML = '<i class="fas fa-check text-success"></i>';
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 1000);
            
        } catch (error) {
            console.error('Error refreshing video library:', error);
            
            // Show error feedback
            refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i>';
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 2000);
        }
    }

    async handleModalUpload() {
        // Check if any videos are currently processing
        try {
            const response = await fetch('/api/videos');
            const videos = await response.json();
            const hasProcessing = videos.some(v => v.status === 'processing');
            
            if (hasProcessing) {
                this.showErrorModal(
                    'Upload Temporarily Unavailable',
                    'Another video is currently being processed',
                    'Please wait for the current video processing to complete before uploading new videos. This ensures optimal system performance.',
                    'You can monitor the processing progress in the video library below.'
                );
                return;
            }
        } catch (error) {
            console.error('Error checking video status:', error);
        }
        
        const fileInput = document.getElementById('videoFile');
        const videoName = document.getElementById('videoName').value;
        const videoLocation = document.getElementById('videoLocation').value;
        const videoDescription = document.getElementById('videoDescription').value;
        
        if (!fileInput.files.length) {
            this.showErrorModal(
                'No File Selected',
                'Please select a video file to upload',
                'You need to choose a video file before you can proceed with the upload.',
                'Click "Choose File" and select a video file (MP4, AVI, MOV formats supported).'
            );
            return;
        }
        
        const file = fileInput.files[0];
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
        if (modal) {
            modal.hide();
        }
        
        // Create form data with custom fields
        const formData = new FormData();
        formData.append('video', file);
        formData.append('location', videoLocation || '5G Lab');
        formData.append('description', videoDescription || '');
        if (videoName) {
            formData.append('custom_name', videoName);
        }
        
        // Upload the video
        await this.uploadVideoWithFormData(formData, file.name);
        
        // Reset the form
        document.getElementById('videoFile').value = '';
        document.getElementById('videoName').value = '';
        document.getElementById('videoLocation').value = '5G Lab';
        document.getElementById('videoDescription').value = '';
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        // Check if upload is disabled
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea && uploadArea.style.pointerEvents === 'none') {
            return;
        }
        
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    async handleFiles(files) {
        // Check if any videos are currently processing
        try {
            const response = await fetch('/api/videos');
            const videos = await response.json();
            const hasProcessing = videos.some(v => v.status === 'processing');
            
            if (hasProcessing) {
                this.showErrorModal(
                    'Upload Temporarily Unavailable',
                    'Another video is currently being processed',
                    'Please wait for the current video processing to complete before uploading new videos. This ensures optimal system performance.',
                    'You can monitor the processing progress in the video library below.'
                );
                return;
            }
        } catch (error) {
            console.error('Error checking video status:', error);
        }
        
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            if (file.type.startsWith('video/')) {
                await this.uploadVideo(file);
            }
        }
        
        // Automatically refresh video library after upload
        this.updateVideoLibrary();
    }

    async uploadVideoWithFormData(formData, filename) {
        // Create progress indicator
        const progressContainer = this.createProgressIndicator(filename);
        
        try {
            const xhr = new XMLHttpRequest();
            
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        this.updateProgress(progressContainer, percent, `Uploading... ${percent}%`);
                    }
                });

                xhr.addEventListener('load', () => {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                xhr.open('POST', '/api/upload-video');
                xhr.send(formData);
            });
            
            const result = await uploadPromise;
            
            if (result.success) {
                this.updateProgress(progressContainer, 100, 'Upload completed successfully!');
                
                if (result.upload_id) {
                    progressContainer.dataset.uploadId = result.upload_id;
                    this.setupProgressTracking(result.upload_id, progressContainer);
                }
                
                // Immediately refresh video library
                this.updateVideoLibrary();
            } else {
                this.updateProgress(progressContainer, 0, result.error || 'Upload failed', true);
            }
        } catch (error) {
            this.updateProgress(progressContainer, 0, error.message, true);
        }
    }

    async uploadVideo(file) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('location', document.getElementById('defaultLocation')?.value || '5G Lab');
        formData.append('description', document.getElementById('defaultDescription')?.value || '');

        // Create progress indicator
        const progressContainer = this.createProgressIndicator(file.name);
        
        // Track the upload with an AbortController to enable cancellation
        const abortController = new AbortController();
        progressContainer.dataset.abortController = abortController;
        
        try {
            // Start the upload with fetch API that supports progress tracking
            const xhr = new XMLHttpRequest();
            
            // Create a promise to handle the XHR request
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        this.updateProgress(progressContainer, percent, `Uploading... ${percent}%`);
                    }
                });

                xhr.addEventListener('load', () => {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                // Store XHR for potential cancellation
                progressContainer.dataset.xhr = xhr;

                xhr.open('POST', '/api/upload-video');
                xhr.send(formData);
            });
            
            // Wait for upload to complete
            const result = await uploadPromise;
            
            if (result.success) {
                this.updateProgress(progressContainer, 100, 'Upload completed successfully!');
                
                // Set up progress tracking for processing
                if (result.upload_id) {
                    progressContainer.dataset.uploadId = result.upload_id;
                    this.setupProgressTracking(result.upload_id, progressContainer);
                }
                
                // Immediately refresh video library
                this.updateVideoLibrary();
            } else {
                this.updateProgress(progressContainer, 0, result.error || 'Upload failed', true);
            }
        } catch (error) {
            // Don't update progress if it was cancelled (will be handled by cancel button)
            if (error.message !== 'Upload cancelled') {
                this.updateProgress(progressContainer, 0, error.message, true);
            }
            throw error;
        }
    }
    
    setupProgressTracking(uploadId, progressContainer) {
        // Connect to WebSocket if not already connected
        if (!window.socket) {
            window.socket = io();
        }
        
        // Start checking progress
        window.socket.emit('check_upload_progress', { upload_id: uploadId });
        
        // Clear any existing interval
        if (progressContainer.dataset.progressInterval) {
            clearInterval(parseInt(progressContainer.dataset.progressInterval));
        }
        
        // Set up periodic progress checks
        const progressInterval = setInterval(() => {
            window.socket.emit('check_upload_progress', { upload_id: uploadId });
        }, 2000);
        
        // Store interval ID for cleanup
        progressContainer.dataset.progressInterval = progressInterval;
    }

    createProgressIndicator(filename) {
        // We no longer need to create a separate progress indicator
        // Just update the upload area to show processing status
        const uploadArea = document.getElementById('fileUploadArea');
        
        if (uploadArea) {
            // Mark the upload area as processing
            uploadArea.classList.add('processing');
            
            // Create or update the processing message
            let processingMessage = uploadArea.querySelector('.processing-message');
            if (!processingMessage) {
                processingMessage = document.createElement('div');
                processingMessage.className = 'processing-message';
                processingMessage.innerHTML = `
                    <div class="text-center">
                        <div class="d-flex justify-content-end mb-1">
                            <button class="btn btn-sm btn-outline-danger cancel-upload">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="spinner-border text-primary mb-2" role="status">
                            <span class="visually-hidden">Processing...</span>
                        </div>
                        <div class="current-file fw-bold mb-1">${filename}</div>
                        <div class="progress-text">Uploading... 0%</div>
                    </div>
                `;
                processingMessage.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255,255,255,0.95);
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 5;
                    width: 80%;
                    text-align: center;
                `;
                uploadArea.style.position = 'relative';
                uploadArea.appendChild(processingMessage);
                
                // Add cancel button functionality
                const cancelBtn = processingMessage.querySelector('.cancel-upload');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => this.cancelUpload(mockContainer));
                }
            } else {
                // Update existing message with new file
                const currentFileEl = processingMessage.querySelector('.current-file');
                if (currentFileEl) {
                    currentFileEl.textContent = filename;
                }
                const progressTextEl = processingMessage.querySelector('.progress-text');
                if (progressTextEl) {
                    progressTextEl.textContent = 'Uploading... 0%';
                }
            }
        }
        
        // Create a mock progress container to maintain compatibility with existing code
        const mockContainer = document.createElement('div');
        mockContainer.dataset.filename = filename;
        
        return mockContainer;
    }
    
    cancelUpload(progressContainer) {
        // Cancel XHR if it exists (during initial upload)
        if (progressContainer.dataset.xhr) {
            progressContainer.dataset.xhr.abort();
        }
        
        // Cancel WebSocket tracking if upload ID exists (during processing)
        if (progressContainer.dataset.uploadId) {
            window.socket?.emit('cancel_upload', { upload_id: progressContainer.dataset.uploadId });
        }
        
        // Clear any progress tracking interval
        if (progressContainer.dataset.progressInterval) {
            clearInterval(parseInt(progressContainer.dataset.progressInterval));
            delete progressContainer.dataset.progressInterval;
        }
        
        // Update UI to show error and then reset the upload area
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            const processingMessage = uploadArea.querySelector('.processing-message');
            if (processingMessage) {
                const progressTextEl = processingMessage.querySelector('.progress-text');
                if (progressTextEl) {
                    progressTextEl.textContent = 'Upload cancelled';
                    progressTextEl.className = 'progress-text text-danger';
                    
                    // Change spinner to error
                    const spinner = processingMessage.querySelector('.spinner-border');
                    if (spinner) {
                        spinner.className = 'spinner-border text-danger mb-2';
                    }
                }
            }
            
            // Reset upload area after a delay
            setTimeout(() => {
                uploadArea.classList.remove('processing');
                const processingMessage = uploadArea.querySelector('.processing-message');
                if (processingMessage) {
                    processingMessage.remove();
                }
            }, 3000);
        }
    }

    updateProgress(container, percent, message = null, isError = false) {
        // Ensure percent is a valid number between 0-100
        percent = Math.min(Math.max(0, parseInt(percent) || 0), 100);
        
        // Update the upload area instead of the progress container
        const uploadArea = document.getElementById('fileUploadArea');
        if (!uploadArea) return;
        
        const processingMessage = uploadArea.querySelector('.processing-message');
        if (processingMessage) {
            const progressTextEl = processingMessage.querySelector('.progress-text');
            if (progressTextEl) {
                if (message) {
                    progressTextEl.textContent = message;
                } else {
                    progressTextEl.textContent = `Processing... ${percent}%`;
                }
                
                // Apply appropriate styling based on state
                if (isError) {
                    progressTextEl.className = 'progress-text text-danger';
                    // Change spinner color for error
                    const spinner = processingMessage.querySelector('.spinner-border');
                    if (spinner) {
                        spinner.className = 'spinner-border text-danger mb-2';
                    }
                } else if (percent === 100) {
                    progressTextEl.className = 'progress-text text-success';
                    // Change spinner color for completion
                    const spinner = processingMessage.querySelector('.spinner-border');
                    if (spinner) {
                        spinner.className = 'spinner-border text-success mb-2';
                    }
                }
            }
        }
        
        // Handle completion (successful or error)
        if ((percent === 100 && !isError && !container.dataset.uploadId) || isError) {
            // Remove processing state after a delay
            setTimeout(() => {
                if (uploadArea) {
                    uploadArea.classList.remove('processing');
                    const processingMessage = uploadArea.querySelector('.processing-message');
                    if (processingMessage) {
                        processingMessage.remove();
                    }
                }
            }, isError ? 3000 : 2000);
        }
    }

    async updateVideoLibrary() {
        try {
            const response = await fetch('/api/videos');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const videos = await response.json();
            
            const tbody = document.querySelector('#videoLibraryTable tbody');
            if (!tbody) return;
            
            // Check if any videos are processing and update upload controls
            const hasProcessing = videos.some(v => v.status === 'processing');
            this.updateUploadControls(hasProcessing);
            
            if (videos.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted py-5">
                            <div class="d-flex flex-column align-items-center">
                                <i class="fas fa-video fs-2 mb-3 text-secondary"></i>
                                <h6 class="mb-2">No videos uploaded yet</h6>
                                <p class="mb-0 small">Upload your first video to get started</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = videos.map(video => {
                // Format file size better
                const formatSize = (sizeStr) => {
                    if (!sizeStr || sizeStr === 'Unknown size') return 'Unknown';
                    return sizeStr;
                };
                
                // Format date better
                const formatDate = (dateStr) => {
                    if (!dateStr || dateStr === '-') return '-';
                    try {
                        const date = new Date(dateStr);
                        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    } catch {
                        return dateStr;
                    }
                };
                
                // Determine status badge class and icon
                const getStatusDisplay = (status) => {
                    switch(status) {
                        case 'completed':
                            return { class: 'status-verified', icon: 'fas fa-check-circle text-success', text: 'Completed' };
                        case 'processing':
                            return { class: 'status-pending', icon: 'fas fa-spinner fa-spin text-warning', text: 'Processing' };
                        case 'paused':
                            return { class: 'status-pending', icon: 'fas fa-pause text-warning', text: 'Paused' };
                        case 'stopped':
                            return { class: 'status-pending', icon: 'fas fa-stop text-warning', text: 'Stopped' };
                        case 'failed':
                            return { class: 'status-rejected', icon: 'fas fa-exclamation-circle text-danger', text: 'Failed' };
                        default:
                            return { class: 'status-pending', icon: 'fas fa-clock text-secondary', text: 'Pending' };
                    }
                };
                
                const statusInfo = getStatusDisplay(video.status);
                
                return `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="me-3 flex-shrink-0" style="width: 50px; height: 35px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                    ${video.first_frame ? 
                                        `<img src="${video.first_frame}" style="width: 100%; height: 100%; object-fit: cover;" alt="Video thumbnail">` :
                                        `<i class="fas fa-play-circle text-primary" style="font-size: 18px;"></i>`
                                    }
                                </div>
                                <div class="min-w-0 flex-grow-1">
                                    <div class="fw-bold text-truncate" style="max-width: 250px;" title="${video.custom_name || video.name}">
                                        <span class="clickable-video-name" onclick="videoManager.showVideoDetails('${video.id}')" title="Click to view details">${video.custom_name || video.name}</span>
                                    </div>
                                    <small class="text-muted">${video.description ? video.description.substring(0, 50) + (video.description.length > 50 ? '...' : '') : formatSize(video.size)}</small>
                                </div>
                            </div>
                        </td>
                        <td class="text-nowrap">${video.duration || '-'}</td>
                        <td class="text-nowrap small">${formatDate(video.upload_time)}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <i class="${statusInfo.icon} me-2" style="font-size: 14px;"></i>
                                <span class="status-badge ${statusInfo.class} small">${statusInfo.text}</span>
                            </div>
                        </td>
                        <td class="text-nowrap">${video.location || '5G Lab'}</td>
                        <td class="text-center">
                            <span class="badge bg-primary">${video.detections || 0}</span>
                        </td>
                        <td class="text-center">
                            <span class="badge bg-danger">${video.violations || 0}</span>
                        </td>
                        <td class="text-nowrap">
                            <div class="d-flex gap-1" role="group">
                                ${video.status === 'pending' ? 
                                    `<button class="btn btn-sm btn-success" title="Start Processing (Threaded)" onclick="videoManager.startProcessing('${video.id}')">
                                        <i class="fas fa-play"></i>
                                    </button>` : ''
                                }
                                ${video.status === 'processing' ? 
                                    `<button class="btn btn-sm btn-warning" title="Pause Processing" onclick="videoManager.pauseProcessing('${video.id}')">
                                        <i class="fas fa-pause"></i>
                                    </button>` : ''
                                }
                                ${video.status === 'paused' ? 
                                    `<button class="btn btn-sm btn-info me-1" title="Resume Processing" onclick="videoManager.resumeProcessing('${video.id}')">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" title="Stop Processing (Save Results)" onclick="videoManager.stopProcessing('${video.id}')">
                                        <i class="fas fa-stop"></i>
                                    </button>` : ''
                                }
                                ${(video.status === 'completed' || video.status === 'stopped' || video.status === 'failed') ? 
                                    `<button class="btn btn-sm btn-outline-danger" title="Delete Video" onclick="videoManager.deleteVideo('${video.id}', '${video.custom_name || video.name}')">
                                        <i class="fas fa-trash"></i>
                                    </button>` : 
                                    `<button class="btn btn-sm btn-outline-danger" title="Delete Video" onclick="videoManager.deleteVideo('${video.id}', '${video.custom_name || video.name}')" ${video.status === 'processing' || video.status === 'paused' ? 'disabled' : ''}>
                                        <i class="fas fa-trash"></i>
                                    </button>`
                                }
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading video library:', error);
            const tbody = document.querySelector('#videoLibraryTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-danger py-4">
                            <div class="d-flex flex-column align-items-center">
                                <i class="fas fa-exclamation-triangle fs-2 mb-3"></i>
                                <h6 class="mb-2">Error Loading Videos</h6>
                                <p class="mb-0 small">Failed to load video library. Please refresh the page.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    updateUploadControls(hasProcessing) {
        const uploadArea = document.getElementById('fileUploadArea');
        const modalUploadButton = document.querySelector('button[data-bs-target="#uploadModal"]');
        const modalUploadSubmitButton = document.querySelector('#uploadModal .btn-primary');
        
        // If we already have an active upload (processing message exists), 
        // don't override it with disabled state
        if (uploadArea && uploadArea.querySelector('.processing-message')) {
            // Just disable the modal buttons
            if (modalUploadButton) {
                modalUploadButton.disabled = true;
                modalUploadButton.title = 'Upload disabled while videos are processing';
            }
            
            if (modalUploadSubmitButton) {
                modalUploadSubmitButton.disabled = true;
            }
            return;
        }
        
        if (hasProcessing) {
            // Disable upload area
            if (uploadArea) {
                uploadArea.style.pointerEvents = 'none';
                uploadArea.style.opacity = '0.5';
                uploadArea.title = 'Upload disabled while videos are processing';
                
                // Add a disabled message overlay
                let disabledMessage = uploadArea.querySelector('.upload-disabled-message');
                if (!disabledMessage) {
                    disabledMessage = document.createElement('div');
                    disabledMessage.className = 'upload-disabled-message';
                    disabledMessage.innerHTML = '<i class="fas fa-clock"></i><br>Waiting for video processing to complete...';
                    disabledMessage.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #666;
                        font-size: 14px;
                        text-align: center;
                        z-index: 10;
                        background: rgba(255,255,255,0.9);
                        padding: 10px;
                        border-radius: 5px;
                    `;
                    uploadArea.style.position = 'relative';
                    uploadArea.appendChild(disabledMessage);
                }
            }
            
            // Disable modal trigger button
            if (modalUploadButton) {
                modalUploadButton.disabled = true;
                modalUploadButton.title = 'Upload disabled while videos are processing';
            }
            
            // Disable modal submit button
            if (modalUploadSubmitButton) {
                modalUploadSubmitButton.disabled = true;
            }
        } else {
            // Enable upload area
            if (uploadArea) {
                uploadArea.style.pointerEvents = 'auto';
                uploadArea.style.opacity = '1';
                uploadArea.title = 'Click or drag files to upload';
                
                // Remove disabled message overlay
                const disabledMessage = uploadArea.querySelector('.upload-disabled-message');
                if (disabledMessage) {
                    disabledMessage.remove();
                }
            }
            
            // Enable modal trigger button
            if (modalUploadButton) {
                modalUploadButton.disabled = false;
                modalUploadButton.title = 'Upload Video';
            }
            
            // Enable modal submit button
            if (modalUploadSubmitButton) {
                modalUploadSubmitButton.disabled = false;
            }
        }
    }
    
    // Helper method to immediately update video status in UI
    updateVideoStatusInUI(videoId, newStatus) {
        // Find the table row for this video
        const tableBody = document.querySelector('#videoLibraryTable tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        for (const row of rows) {
            // Check if this row contains buttons with the matching video ID
            const buttons = row.querySelectorAll('button[onclick*="' + videoId + '"]');
            if (buttons.length > 0) {
                // Update the status cell (4th column, index 3)
                const statusCell = row.cells[3];
                if (statusCell) {
                    const statusInfo = this.getStatusDisplay(newStatus);
                    statusCell.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="${statusInfo.icon} me-2" style="font-size: 14px;"></i>
                            <span class="status-badge ${statusInfo.class} small">${statusInfo.text}</span>
                        </div>
                    `;
                    
                    // Update the action buttons (8th column, index 7)
                    const actionsCell = row.cells[7];
                    if (actionsCell) {
                        this.updateActionButtons(actionsCell, videoId, newStatus);
                    }
                }
                break;
            }
        }
    }
    
    getStatusDisplay(status) {
        switch(status) {
            case 'completed':
                return { class: 'status-verified', icon: 'fas fa-check-circle text-success', text: 'Completed' };
            case 'processing':
                return { class: 'status-pending', icon: 'fas fa-spinner fa-spin text-warning', text: 'Processing' };
            case 'paused':
                return { class: 'status-pending', icon: 'fas fa-pause text-warning', text: 'Paused' };
            case 'stopped':
                return { class: 'status-pending', icon: 'fas fa-stop text-warning', text: 'Stopped' };
            case 'failed':
                return { class: 'status-rejected', icon: 'fas fa-exclamation-circle text-danger', text: 'Failed' };
            default:
                return { class: 'status-pending', icon: 'fas fa-clock text-secondary', text: 'Pending' };
        }
    }
    
    updateActionButtons(actionsCell, videoId, status) {
        let buttonsHTML = '';
        
        // Generate appropriate buttons based on status
        switch(status) {
            case 'pending':
                buttonsHTML = `
                    <button class="btn btn-sm btn-success" title="Start Processing (Threaded)" onclick="videoManager.startProcessing('${videoId}')">
                        <i class="fas fa-play"></i>
                    </button>
                `;
                break;
            case 'processing':
                buttonsHTML = `
                    <button class="btn btn-sm btn-warning" title="Pause Processing" onclick="videoManager.pauseProcessing('${videoId}')">
                        <i class="fas fa-pause"></i>
                    </button>
                `;
                break;
            case 'paused':
                buttonsHTML = `
                    <button class="btn btn-sm btn-info me-1" title="Resume Processing" onclick="videoManager.resumeProcessing('${videoId}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" title="Stop Processing (Save Results)" onclick="videoManager.stopProcessing('${videoId}')">
                        <i class="fas fa-stop"></i>
                    </button>
                `;
                break;
            case 'completed':
            case 'stopped':
            case 'failed':
                // For completed videos, only show delete button
                buttonsHTML = `
                    <button class="btn btn-sm btn-outline-danger" title="Delete Video" onclick="videoManager.deleteVideo('${videoId}', 'video')">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                break;
        }
        
        // Add delete button for non-completed videos (disabled during processing/paused)
        if (status !== 'completed' && status !== 'stopped' && status !== 'failed') {
            const deleteDisabled = (status === 'processing' || status === 'paused') ? 'disabled' : '';
            buttonsHTML += `
                <button class="btn btn-sm btn-outline-danger" title="Delete Video" onclick="videoManager.deleteVideo('${videoId}', 'video')" ${deleteDisabled}>
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        // Update the actions cell with new buttons
        actionsCell.innerHTML = `
            <div class="d-flex gap-1" role="group">
                ${buttonsHTML}
            </div>
        `;
    }
    
    // Processing control methods for threaded processing
    async startProcessing(videoId) {
        // Find and disable the start processing button immediately
        const startButton = document.querySelector(`button.start-processing-btn[data-video-id="${videoId}"]`);
        if (startButton) {
            startButton.disabled = true;
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            startButton.title = 'Starting...';
        }
        
        // Immediately update the UI to show processing status
        this.updateVideoStatusInUI(videoId, 'processing');
        
        try {
            const response = await fetch(`/api/videos/${videoId}/start-processing`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Threaded processing started for video:', videoId);
                // Don't refresh library immediately to avoid overriding the UI state
                // The WebSocket event will handle status updates
                console.log('Processing started successfully, waiting for WebSocket confirmation');
            } else {
                // Revert status on error
                this.updateVideoStatusInUI(videoId, 'pending');
                this.handleGenericError('Start Processing', new Error(result.error || 'Failed to start processing'));
            }
        } catch (error) {
            console.error('Error starting processing:', error);
            // Revert status on error
            this.updateVideoStatusInUI(videoId, 'pending');
            this.handleGenericError('Start Processing', error);
        }
    }
    
    async pauseProcessing(videoId) {
        // Immediately update the UI to show paused status
        this.updateVideoStatusInUI(videoId, 'paused');
        
        try {
            const response = await fetch(`/api/videos/${videoId}/pause-processing`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Processing paused for video:', videoId);
                // Status already updated in UI, just refresh to sync with server
                this.updateVideoLibrary();
            } else {
                // Revert status on error
                this.updateVideoStatusInUI(videoId, 'processing');
                this.handleGenericError('Pause Processing', new Error(result.error || 'Failed to pause processing'));
            }
        } catch (error) {
            console.error('Error pausing processing:', error);
            // Revert status on error
            this.updateVideoStatusInUI(videoId, 'processing');
            this.handleGenericError('Pause Processing', error);
        }
    }
    
    async resumeProcessing(videoId) {
        // Immediately update the UI to show processing status
        this.updateVideoStatusInUI(videoId, 'processing');
        
        try {
            const response = await fetch(`/api/videos/${videoId}/resume-processing`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Processing resumed for video:', videoId);
                // Status already updated in UI, just refresh to sync with server
                this.updateVideoLibrary();
            } else {
                // Revert status on error
                this.updateVideoStatusInUI(videoId, 'paused');
                this.handleGenericError('Resume Processing', new Error(result.error || 'Failed to resume processing'));
            }
        } catch (error) {
            console.error('Error resuming processing:', error);
            // Revert status on error
            this.updateVideoStatusInUI(videoId, 'paused');
            this.handleGenericError('Resume Processing', error);
        }
    }
    
    async stopProcessing(videoId) {
        // Show professional confirmation modal for stopping processing
        this.showConfirmationModal(
            'Stop Processing',
            'Stop video processing?',
            'This will immediately stop the video processing. Any results generated up to this point will be saved, but the processing will not continue.',
            'Processing cannot be resumed from where it stopped. You would need to restart from the beginning.',
            'Stop Processing',
            async () => {
                // Proceed with stopping processing
                await this.performStopProcessing(videoId);
            }
        );
    }

    async performStopProcessing(videoId) {
        try {
            const response = await fetch(`/api/videos/${videoId}/stop-processing`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Processing stopped for video:', videoId);
                this.showSuccessModal(
                    'Processing Stopped',
                    'Video processing has been stopped',
                    'The processing has been stopped. Any results generated up to this point have been saved.'
                );
                // Refresh the video library to show updated status
                this.updateVideoLibrary();
            } else {
                this.handleGenericError('Stop Processing', new Error(result.error || 'Failed to stop processing'));
            }
        } catch (error) {
            console.error('Error stopping processing:', error);
            this.handleGenericError('Stop Processing', error);
        }
    }
    
    async downloadVideo(videoId, videoName) {
        try {
            // First check if results are available
            const response = await fetch(`/api/videos/${videoId}/download`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${videoName}_results.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Show success message
                this.showSuccessModal(
                    'Download Complete',
                    'Results successfully downloaded',
                    `The processing results for "${videoName}" have been downloaded to your device.`
                );
            } else {
                const errorResult = await response.json();
                if (response.status === 404) {
                    this.showErrorModal(
                        'Results Not Available',
                        'Processing results not found',
                        `No processing results are available for "${videoName}". The video may not have been processed yet.`,
                        'Please ensure the video has been processed successfully before attempting to download results.'
                    );
                } else {
                    this.handleGenericError('Download Results', new Error(errorResult.error || 'Download failed'));
                }
            }
        } catch (error) {
            console.error('Error downloading video results:', error);
            this.handleGenericError('Download Results', error);
        }
    }
    
    async deleteVideo(videoId, videoName) {
        // Truncate very long video names for the subtitle, but show full name in message
        const displayName = videoName.length > 50 ? videoName.substring(0, 47) + '...' : videoName;
        
        // Show professional confirmation modal instead of simple confirm
        this.showConfirmationModal(
            'Delete Video',
            `Delete "${displayName}"?`,
            `This video "${videoName}" will be permanently removed from the system along with all associated data, processing results, and metadata.`,
            'This action cannot be undone. All files will be permanently deleted.',
            'Delete Permanently',
            async () => {
                // Proceed with deletion
                await this.performDeleteVideo(videoId, videoName);
            }
        );
    }

    async performDeleteVideo(videoId, videoName) {
        try {
            console.log('Deleting video with ID:', videoId);
            
            const response = await fetch(`/api/delete-video/${videoId}`, {
                method: 'DELETE'
            });
            
            console.log('Delete response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Delete result:', result);
                
                if (result.success) {
                    // Show success message
                    this.showSuccessModal(
                        'Video Deleted',
                        'Video successfully removed',
                        `"${videoName}" has been permanently deleted from the system.`
                    );
                    
                    // Immediately refresh video library
                    await this.updateVideoLibrary();
                    console.log('Video deleted successfully');
                } else {
                    // Handle specific error cases
                    if (result.error && (result.error.includes('WinError 32') || result.error.includes('being used by another process'))) {
                        this.handleFileInUseError(videoName, new Error(result.error));
                    } else {
                        this.handleGenericError('Delete Video', new Error(result.error || 'Unknown error occurred'));
                    }
                }
            } else {
                const errorResult = await response.json();
                console.error('Delete failed:', errorResult);
                
                // Handle HTTP error responses
                if (response.status === 404) {
                    this.handleGenericError('Delete Video', new Error('Video not found'));
                } else if (response.status === 403) {
                    this.handleGenericError('Delete Video', new Error('Access denied'));
                } else if (response.status === 500) {
                    this.handleGenericError('Delete Video', new Error('Internal server error'));
                } else {
                    this.handleGenericError('Delete Video', new Error(errorResult.error || 'Server error'));
                }
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            
            // Handle network or other errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showErrorModal(
                    'Connection Error',
                    'Unable to connect to server',
                    'There was a problem connecting to the server. Please check your internet connection.',
                    'Verify your network connection and try again.'
                );
            } else {
                this.handleGenericError('Delete Video', error);
            }
        }
    }

    capitalizeFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Professional modal methods
    showErrorModal(title, subtitle, message, suggestion = null, actionCallback = null) {
        const modal = document.getElementById('errorModal');
        if (!modal) return;

        // Set content
        document.getElementById('errorModalTitle').textContent = title;
        document.getElementById('errorModalSubtitle').textContent = subtitle;
        document.getElementById('errorModalMessage').textContent = message;
        
        // Handle suggestion
        const suggestionElement = document.getElementById('errorModalSuggestion');
        const suggestionText = document.getElementById('errorSuggestionText');
        if (suggestion) {
            suggestionText.textContent = suggestion;
            suggestionElement.style.display = 'block';
        } else {
            suggestionElement.style.display = 'none';
        }

        // Handle action button
        const actionBtn = document.getElementById('errorModalActionBtn');
        if (actionCallback && typeof actionCallback === 'function') {
            actionBtn.style.display = 'inline-block';
            actionBtn.onclick = () => {
                bootstrap.Modal.getInstance(modal).hide();
                actionCallback();
            };
        } else {
            actionBtn.style.display = 'none';
        }

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    showSuccessModal(title, subtitle, message) {
        const modal = document.getElementById('successModal');
        if (!modal) return;

        // Set content
        document.getElementById('successModalTitle').textContent = title;
        document.getElementById('successModalSubtitle').textContent = subtitle;
        document.getElementById('successModalMessage').textContent = message;

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    showConfirmationModal(title, subtitle, message, warning, actionText, actionCallback) {
        const modal = document.getElementById('confirmationModal');
        if (!modal) return;

        // Set content
        document.getElementById('confirmationModalTitle').textContent = title;
        document.getElementById('confirmationModalSubtitle').textContent = subtitle;
        document.getElementById('confirmationModalMessage').textContent = message;
        
        // Handle warning
        const warningElement = document.getElementById('confirmationModalWarning');
        const warningText = document.getElementById('confirmationWarningText');
        if (warning) {
            warningText.textContent = warning;
            warningElement.style.display = 'block';
        } else {
            warningElement.style.display = 'none';
        }

        // Set action button text and callback
        const actionBtn = document.getElementById('confirmationModalActionBtn');
        if (actionText) {
            const icon = actionBtn.querySelector('i');
            const textNode = actionBtn.childNodes[actionBtn.childNodes.length - 1];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = actionText;
            }
        }
        
        // Set up action callback
        actionBtn.onclick = () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            if (actionCallback && typeof actionCallback === 'function') {
                actionCallback();
            }
        };

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    // Video Details Modal Methods
    async showVideoDetails(videoId) {
        try {
            // Show loading state
            this.showVideoDetailsLoading();
            
            // Fetch detailed video information
            const response = await fetch(`/api/videos/${videoId}/details`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const videoDetails = await response.json();
            
            // Populate the modal with video details
            this.populateVideoDetailsModal(videoDetails);
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('videoDetailsModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error fetching video details:', error);
            this.handleGenericError('Load Video Details', error);
        }
    }

    showVideoDetailsLoading() {
        const modal = document.getElementById('videoDetailsModal');
        if (!modal) return;

        // Set loading title
        document.getElementById('videoDetailsModalTitle').textContent = 'Loading...';
        
        // Reset all fields to loading state
        const loadingText = 'Loading...';
        document.getElementById('modalVideoName').textContent = loadingText;
        document.getElementById('modalCustomName').textContent = loadingText;
        document.getElementById('modalDescription').textContent = loadingText;
        document.getElementById('modalDuration').textContent = loadingText;
        document.getElementById('modalFileSize').textContent = loadingText;
        document.getElementById('modalLocation').textContent = loadingText;
        document.getElementById('modalProcessingTime').textContent = loadingText;
        document.getElementById('modalCompletionTime').textContent = loadingText;
        document.getElementById('modalUploadTime').textContent = loadingText;
        
        // Reset badges
        document.getElementById('modalDetections').textContent = '0';
        document.getElementById('modalViolations').textContent = '0';
        
        // Reset status
        const statusElement = document.getElementById('modalStatus');
        statusElement.className = 'video-status-badge status-pending';
        statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading</span>';
        
        // Hide thumbnail
        document.getElementById('modalVideoThumbnail').style.display = 'none';
        document.getElementById('modalNoThumbnail').style.display = 'flex';
        
        // Hide download button
        document.getElementById('modalDownloadBtn').style.display = 'none';
    }

    populateVideoDetailsModal(videoDetails) {
        // Set modal title
        document.getElementById('videoDetailsModalTitle').textContent = 'Video Information';
        
        // Basic information
        document.getElementById('modalVideoName').textContent = videoDetails.name || 'Unknown Video';
        document.getElementById('modalCustomName').textContent = videoDetails.custom_name || 'No custom name set';
        document.getElementById('modalDescription').textContent = videoDetails.description || 'No description provided';
        document.getElementById('modalDuration').textContent = videoDetails.duration || 'Unknown';
        document.getElementById('modalFileSize').textContent = videoDetails.size || 'Unknown';
        document.getElementById('modalLocation').textContent = videoDetails.location || 'Unknown Location';
        
        // Processing information
        document.getElementById('modalProcessingTime').textContent = videoDetails.processing_time_display || 'Not processed';
        document.getElementById('modalCompletionTime').textContent = videoDetails.completion_time_display || 'Not completed';
        document.getElementById('modalUploadTime').textContent = videoDetails.upload_time || 'Unknown';
        
        // Detection results
        document.getElementById('modalDetections').textContent = videoDetails.detections || 0;
        document.getElementById('modalViolations').textContent = videoDetails.violations || 0;
        
        // Status with appropriate styling
        this.updateModalStatus(videoDetails.status);
        
        // Thumbnail/Preview
        if (videoDetails.first_frame) {
            const thumbnail = document.getElementById('modalVideoThumbnail');
            thumbnail.src = videoDetails.first_frame;
            thumbnail.style.display = 'block';
            document.getElementById('modalNoThumbnail').style.display = 'none';
        } else {
            document.getElementById('modalVideoThumbnail').style.display = 'none';
            document.getElementById('modalNoThumbnail').style.display = 'flex';
        }
        
        // Download button (show if completed)
        const downloadBtn = document.getElementById('modalDownloadBtn');
        if (videoDetails.status === 'completed') {
            downloadBtn.style.display = 'inline-block';
            downloadBtn.onclick = () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('videoDetailsModal'));
                modal.hide();
                this.downloadVideo(videoDetails.id, videoDetails.name);
            };
        } else {
            downloadBtn.style.display = 'none';
        }
    }

    updateModalStatus(status) {
        const statusElement = document.getElementById('modalStatus');
        
        // Remove existing classes
        statusElement.className = 'video-status-badge';
        
        let statusClass, icon, text;
        
        switch(status) {
            case 'completed':
                statusClass = 'status-completed';
                icon = 'fas fa-check-circle';
                text = 'Completed';
                break;
            case 'processing':
                statusClass = 'status-processing';
                icon = 'fas fa-spinner fa-spin';
                text = 'Processing';
                break;
            case 'paused':
                statusClass = 'status-processing';
                icon = 'fas fa-pause';
                text = 'Paused';
                break;
            case 'failed':
                statusClass = 'status-failed';
                icon = 'fas fa-exclamation-triangle';
                text = 'Failed';
                break;
            default:
                statusClass = 'status-pending';
                icon = 'fas fa-clock';
                text = 'Pending';
        }
        
        statusElement.className += ` ${statusClass}`;
        statusElement.innerHTML = `<i class="${icon}"></i><span>${text}</span>`;
    }

    getStatusClass(status) {
        switch(status) {
            case 'completed':
                return 'completed';
            case 'processing':
                return 'processing';
            case 'paused':
                return 'processing';
            case 'failed':
                return 'failed';
            default:
                return 'pending';
        }
    }

    // Enhanced error handling for specific scenarios
    handleFileInUseError(videoName, error) {
        this.showErrorModal(
            'Unable to Delete Video',
            'File is currently in use',
            `The video "${videoName}" cannot be deleted because it's currently being used by another process. This typically happens when the video is being processed or is open in another application.`,
            'Please wait for any ongoing processing to complete, close any applications that might be using this file, and try again in a few moments.',
            () => {
                // Retry callback
                setTimeout(() => {
                    this.updateVideoLibrary();
                }, 2000);
            }
        );
    }

    handleGenericError(operation, error) {
        let title, subtitle, message, suggestion;
        
        if (error.message.includes('WinError 32') || error.message.includes('being used by another process')) {
            title = 'File Access Error';
            subtitle = 'Resource is currently in use';
            message = 'The requested file cannot be accessed because it\'s currently being used by another process.';
            suggestion = 'Please wait for any ongoing operations to complete and try again.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            title = 'Resource Not Found';
            subtitle = 'The requested item could not be located';
            message = 'The file or resource you\'re trying to access may have been moved or deleted.';
            suggestion = 'Please refresh the page and try again. If the issue persists, the file may no longer exist.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            title = 'Access Denied';
            subtitle = 'Insufficient permissions';
            message = 'You don\'t have the necessary permissions to perform this action.';
            suggestion = 'Please contact your system administrator for assistance.';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            title = 'Server Error';
            subtitle = 'An internal server error occurred';
            message = 'The server encountered an unexpected error while processing your request.';
            suggestion = 'Please try again later. If the problem persists, contact technical support.';
        } else {
            title = `${operation} Failed`;
            subtitle = 'An unexpected error occurred';
            message = error.message || 'An unknown error occurred while processing your request.';
            suggestion = 'Please try again. If the issue persists, contact technical support.';
        }

        this.showErrorModal(title, subtitle, message, suggestion);
    }
}

// Initialize video manager when document is ready
let videoManager;
document.addEventListener('DOMContentLoaded', function() {
    videoManager = new VideoManager();
    
    // Load video library on page load
    videoManager.updateVideoLibrary();
    
    // Set up auto-refresh every 30 seconds, but be smart about it
    setInterval(() => {
        // Only refresh if no videos are transitioning states
        const processingButtons = document.querySelectorAll('button.start-processing-btn[disabled]');
        if (processingButtons.length === 0) {
            videoManager.updateVideoLibrary();
        }
    }, 30000);
    
    // Set up WebSocket for progress updates
    if (typeof io !== 'undefined') {
        window.socket = io();
        
        window.socket.on('upload_progress', (data) => {
            const progressContainer = document.querySelector(`[data-upload-id="${data.upload_id}"]`);
            if (progressContainer) {
                // Ensure progress is a number and clamped between 0-100
                const progress = Math.min(Math.max(0, parseInt(data.progress) || 0), 100);
                
                videoManager.updateProgress(progressContainer, progress, data.message);
                
                if (progress === 100) {
                    // Clear interval if set
                    const intervalId = progressContainer.dataset.progressInterval;
                    if (intervalId) {
                        clearInterval(parseInt(intervalId));
                        delete progressContainer.dataset.progressInterval;
                    }
                    
                    // Immediately refresh video library when upload completes
                    videoManager.updateVideoLibrary();
                }
            }
        });
        
        // Listen for video processing progress updates (threaded processing)
        window.socket.on('processing_progress', (data) => {
            console.log('Threaded processing progress:', data);
            
            // Update duration display with current/total format
            if (data.video_id && data.frame && data.total_frames) {
                // Calculate current duration based on progress
                const progress_percent = data.progress || 0;
                
                // Find the video row
                const row = document.querySelector(`tr[data-video-id="${data.video_id}"]`);
                if (row) {
                    const durationCell = row.querySelector(`#duration-${data.video_id}`);
                    if (durationCell) {
                        // We'll need the total duration from the video data
                        // For now, just show frame progress
                        durationCell.innerHTML = `
                            <div class="small">
                                <div>Frame ${data.frame} / ${data.total_frames}</div>
                                <div class="progress mt-1" style="height: 4px;">
                                    <div class="progress-bar bg-warning" role="progressbar" 
                                         style="width: ${progress_percent}%" 
                                         aria-valuenow="${progress_percent}" aria-valuemin="0" aria-valuemax="100">
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
            }
        });
        
        // Listen for status changes (processing -> completed)
        window.socket.on('video_status_changed', (data) => {
            console.log('Video status changed:', data);
            
            // Update the specific video status immediately
            if (data.video_id && data.status) {
                videoManager.updateVideoStatusInUI(data.video_id, data.status);
                
                // If processing completed, refresh the full library to get updated data
                if (data.status === 'completed' || data.status === 'failed') {
                    setTimeout(() => {
                        videoManager.updateVideoLibrary();
                    }, 1000);
                }
            } else {
                // Fallback to full refresh
                videoManager.updateVideoLibrary();
            }
        });
        
        // Also listen for when videos are processed and thumbnails are ready
        window.socket.on('video_processed', (data) => {
            console.log('Video processed:', data);
            videoManager.updateVideoLibrary();
        });
        
        // Refresh video library when new video is uploaded
        window.socket.on('video_uploaded', (data) => {
            console.log('Video uploaded:', data);
            videoManager.updateVideoLibrary();
        });
        
        // Refresh video library when a video is deleted
        window.socket.on('video_deleted', (data) => {
            console.log('Video deleted:', data);
            videoManager.updateVideoLibrary();
        });
    }
});