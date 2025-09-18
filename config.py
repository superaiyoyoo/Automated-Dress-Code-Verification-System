"""Configuration settings for the pose tracking system."""

import os
import pathlib

# Paths
OUTPUT_PATH = "tracking_output"
os.makedirs(OUTPUT_PATH, exist_ok=True)

# CSV data output settings
PROCESSED_DATA_PATH = "processed_data"
os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
MOVEMENT_DATA_CSV = os.path.join(PROCESSED_DATA_PATH, "movement_data.csv")
CROWD_DATA_CSV = os.path.join(PROCESSED_DATA_PATH, "crowd_data.csv")

# Student detection image settings
DETECTION_IMAGES_PATH = "detection_images"
os.makedirs(DETECTION_IMAGES_PATH, exist_ok=True)

# Function to create video-specific folders
def create_video_folders(video_path):
    video_name = pathlib.Path(video_path).stem  # Get video name without extension
    video_folder = os.path.join(DETECTION_IMAGES_PATH, video_name)
    student_folder = os.path.join(video_folder, "student")
    
    # Create the folder structure (only video folder and student subfolder)
    os.makedirs(video_folder, exist_ok=True)
    os.makedirs(student_folder, exist_ok=True)
    
    return video_folder, student_folder

# Function to create person-specific folders
def create_person_folder(video_path, person_id):
    video_name = pathlib.Path(video_path).stem
    video_folder = os.path.join(DETECTION_IMAGES_PATH, video_name)
    student_folder = os.path.join(video_folder, "student")
    person_folder = os.path.join(student_folder, f"person_id{person_id}")
    
    # Create the person-specific folder
    os.makedirs(person_folder, exist_ok=True)
    
    return person_folder

# Clothing detection settings
CLOTHING_MODEL_PATH = "best (2).pt"  # Path to the clothing detection model
TOP_CROPS_PER_STUDENT = 1  # Number of top crops to keep per student (reduced to 1)
CLOTHING_CONF_THRESHOLD = 0.25  # Confidence threshold for clothing detection
CLOTHING_IOU_THRESHOLD = 0.45   # IOU threshold for clothing detection
SAVE_ONLY_TOP_BOTTOM = True  # Only save top and bottom clothing detections
SAVE_DETECTION_TEXT = False  # Don't save detection text files

# Dynamic cropping settings
ENABLE_DYNAMIC_CROPPING = True  # Enable the new dynamic cropping system
CROPPING_QUALITY_THRESHOLD = 0.7
MAX_CROPS_PER_PERSON = 20  # Maximum temporary crops before selecting the best
CROP_PADDING_RATIO = 0.1
MIN_KEYPOINTS_FULL_BODY = 12
MIN_KEYPOINTS_PARTIAL_BODY = 8
STRAIGHTNESS_TOLERANCE = 20  # Angle tolerance for straight line detection (degrees)
MIN_ANKLE_DISTANCE_RATIO = 0.15  # Minimum distance between ankles relative to body height

# Data recording settings
NEW_DESIRED_FRAME = 5  # Record data every N frames (5 = record at 1/5 of original FPS)
SAVE_VIDEO = True  # Set to True to save output video

# Video output settings
VIDEO_SAVE_PATH = os.path.join(OUTPUT_PATH, "tracked_output.mp4")

# Model settings
POSE_MODEL_PATH = "yolov8l.pt"  # Path to the person detection model
POSE_ANALYSIS_MODEL_PATH = "yolov8s-pose.pt"  # Path to the pose analysis model (for keypoints)
CONF_THRESHOLD = 0.50  # Confidence threshold for detections (reduced to 10%)
IOU_THRESHOLD = 0.0005
PERSON_DETECTION_CONF = 0.1
KEYPOINT_CONFIDENCE_THRESHOLD = 0.5
OVERLAP_THRESHOLD = 0.1
ASSIGN_NEW_ID_AFTER_OVERLAP = True

# Cropping settings
SAVE_FIRST_LAST_ONLY = True
SAVE_FULL_BODY_PRIORITY = True

# Strict cropping conditions
MIN_CONFIDENCE_FOR_CROPPING = 0.1  # Minimum confidence required for cropping
MIN_TRACKING_FRAMES_FOR_CROPPING = 5
REQUIRE_GOOD_POSE_FOR_CROPPING = True
STRICT_CROPPING_AREA_CHECK = True

# Visualization settings
SHOW_POSE_KEYPOINTS = False  # Set to True to show pose keypoints
SHOW_ENTRY_EXIT_ZONES = False  # Set to True to show entry/exit zones in the video output
SHOW_CROPPING_ZONES = False  # Set to True to show cropping zones in the video output
SHOW_TRACKING_INFO = True  # Set to True to show tracking IDs and confidence
SHOW_PERFORMANCE_METRICS = False  # Set to True to show FPS and frame count on output
SHOW_DETECTION_OVERLAY = True  # Set to True to show semi-transparent overlay on detection zones

# Colors for visualization
BBOX_COLOR = (255, 0, 255)  # Magenta for bounding boxes
SKELETON_COLOR = (0, 255, 0)  # Green for skeleton lines
KEYPOINT_COLOR = (0, 255, 255)  # Yellow for keypoints
ENTRY_ZONE_COLOR = (0, 255, 0)  # Green for entry zones
CROPPING_ZONE_COLOR = (255, 0, 0)  # Red for cropping zones
OVERLAY_OPACITY = 0.3  # Opacity for zone overlays (0.0 to 1.0)

# Improved motion analysis parameters
MOTION_ANGLE_THRESHOLD = 15  # Degrees tolerance for backward motion detection (-45° ± threshold)
BACKWARD_MOTION_ANGLE_MIN = -90  # Minimum angle (degrees) for backward motion (any upward movement)
BACKWARD_MOTION_ANGLE_MAX = -2   # Maximum angle (degrees) for backward motion (exclude purely horizontal)
MIN_MOTION_MAGNITUDE = 5   # Minimum pixel movement to consider for direction analysis (lowered for more sensitivity)
HIP_KEYPOINT_INDICES = [11, 12]  # Left hip, right hip keypoint indices

# Define areas as dictionaries for flexible configuration

# Define areas as dictionaries for flexible configuration

# Define areas as dictionaries for flexible configuration

# Define areas as dictionaries for flexible configuration
areas = {
    # Entry areas
    "entry": {
        "entry1": {
            "name": "entry1",
            "polygon": [(1314, 8), (1307, 622), (1653, 708), (1888, 763), (2163, 874), (2240, 876), (2553, 949), (2551, 1429), (2, 1433), (0, 6), (1307, 2)]
        }
    },
    # Cropping areas
    "cropping": {
        "cropping1": {
            "name": "cropping1",
            "polygon": [(1316, 4), (1303, 620), (1484, 659), (1491, 787), (1414, 817), (1384, 682), (1207, 757), (1205, 934), (1064, 989), (1045, 853), (942, 893), (844, 866), (844, 733), (185, 951), (194, 1053), (8, 1109), (4, 8), (1307, 6)]
        },
        "cropping2": {
            "name": "cropping2",
            "polygon": [(1971, 2), (2338, 4), (2368, 2), (2397, 6), (2378, 748), (1860, 1280), (1371, 1115), (2037, 661), (2016, 8)]
        }
    }
}

# For backwards compatibility - extract the single entry area
entry_area = areas["entry"]["entry1"]["polygon"] if "entry" in areas and "entry1" in areas["entry"] else []

# Legacy compatibility (deprecated)
area1 = entry_area  # Entry area
area2 = []  # No exit area

# Uppercase versions for current imports
AREA1 = area1
AREA2 = area2

# =============================================================================
# REAL-TIME OPTIMIZATION PARAMETERS
# =============================================================================

# Frame Processing Optimization
PROCESS_EVERY_N_FRAMES = 5
MAX_PROCESSING_FPS = 20
REAL_TIME_MODE = True
SKIP_FRAMES_NO_DETECTIONS = True
DETECTION_CHECK_INTERVAL = 5
FAST_DETECTION_MODE = True
FAST_DETECTION_CONF = 0.4

# AI Model Optimization
USE_SMALLER_MODEL = False       # Use yolov8n-pose.pt instead of yolov8s-pose.pt
REDUCED_INPUT_SIZE = None       # Reduce input resolution (None = original size)

# Display Optimization
SKIP_DISPLAY_FRAMES = 1         # Display every Nth frame (1 = show all)
ENABLE_ASYNC_DISPLAY = True

# Pause/Resume behavior tuning
# Resume after this many consecutive non-overlap frames
RESUME_AFTER_NON_OVERLAP_FRAMES = 3
# Force-crop safeguard: treat as paused but still send to cropping; if paused longer than this, we still crop
MAX_PAUSE_FRAMES = 30

# External ID management (never reuse IDs once retired)
DO_NOT_REUSE_EXTERNAL_IDS = True
TRACK_RETIRE_FRAMES = 20

# Memory Management
MAX_QUEUE_SIZE = 15             # Smaller queues for multi-threaded version
CLEAR_UNUSED_DATA_INTERVAL = 100  # Clear old data every N frames

# Performance Monitoring
SHOW_PERFORMANCE_STATS = True   # Show detailed performance statistics
PERFORMANCE_LOG_INTERVAL = 30   # Log performance every N frames