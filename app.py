from flask import Flask, render_template, request, jsonify, send_file, Response
import os
import cv2
import json
import time
import threading
import queue
import uuid
import sys
import shutil
import zipfile
import importlib
import re
from pathlib import Path
from werkzeug.utils import secure_filename
import tempfile
import base64
from datetime import datetime, timedelta
from flask_socketio import SocketIO, emit
import config  # Import the config module

app = Flask(__name__)
app.config['SECRET_KEY'] = 'smartcampus-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Upload queue and processing threads
upload_queue = queue.Queue()
upload_status = {}  # Track upload status by ID

# Configuration
UPLOAD_FOLDER = 'uploaded_videos'
FRAMES_FOLDER = 'temp_frames'
ZONES_FOLDER = 'zone_configs'
ZONE_IMAGES_FOLDER = 'zone_images'

# Create necessary directories
for folder in [UPLOAD_FOLDER, FRAMES_FOLDER, ZONES_FOLDER, ZONE_IMAGES_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Serve temp_frames images
@app.route('/api/temp-frames/<filename>')
def serve_temp_frame(filename):
    try:
        full_path = os.path.join(FRAMES_FOLDER, filename)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            # Determine mimetype by extension
            lower = filename.lower()
            if lower.endswith('.jpg'):
                return send_file(full_path, mimetype='image/jpg')
            return send_file(full_path, mimetype='image/jpeg')
        return jsonify({'error': 'Temp frame not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video-management')
def video_management():
    return render_template('video_management.html')

@app.route('/detection-settings')
def detection_settings():
    return render_template('detection_settings.html')

@app.route('/informative')
def informative():
    return render_template('informative.html')

@app.route('/reporting')
def reporting():
    return render_template('reporting.html')

# API routes for serving JSON data
@app.route('/processed_data/<filename>')
def serve_processed_data(filename):
    """Serve processed data JSON files"""
    try:
        file_path = os.path.join('processed_data', filename)
        if os.path.exists(file_path):
            return send_file(file_path, mimetype='application/json')
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detection_images/<path:filepath>')
def serve_detection_files(filepath):
    """Serve detection files (images and JSON)"""
    try:
        file_path = os.path.join('detection_images', filepath)
        if os.path.exists(file_path):
            # Determine mimetype based on file extension
            if filepath.lower().endswith('.json'):
                return send_file(file_path, mimetype='application/json')
            elif filepath.lower().endswith(('.jpg', '.jpeg')):
                return send_file(file_path, mimetype='image/jpeg')
            elif filepath.lower().endswith('.png'):
                return send_file(file_path, mimetype='image/png')
            else:
                # Let Flask determine the mimetype automatically
                return send_file(file_path)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Settings Management API Endpoints
@app.route('/api/settings/detection', methods=['GET'])
def get_detection_settings():
    """Get current detection settings from config"""
    try:
        # Reload config module to get latest values
        importlib.reload(config)
        
        settings = {
            # Detection Thresholds
            'personConfidence': config.PERSON_DETECTION_CONF,
            'keypointConfidence': config.KEYPOINT_CONFIDENCE_THRESHOLD,
            'fastDetectionConf': config.FAST_DETECTION_CONF,
            'iouThreshold': config.IOU_THRESHOLD,
            'overlapThreshold': config.OVERLAP_THRESHOLD,
            
            # Tracking Settings
            'minTrackingFrames': config.MIN_TRACKING_FRAMES_FOR_CROPPING,
            'resumeFrames': config.RESUME_AFTER_NON_OVERLAP_FRAMES,
            'maxPauseFrames': config.MAX_PAUSE_FRAMES,
            'retireFrames': config.TRACK_RETIRE_FRAMES,
            'noReuseIds': config.DO_NOT_REUSE_EXTERNAL_IDS,
            'newIdAfterOverlap': config.ASSIGN_NEW_ID_AFTER_OVERLAP,
            
            # Performance Settings
            'processEveryN': config.PROCESS_EVERY_N_FRAMES,
            'maxProcessingFPS': config.MAX_PROCESSING_FPS,
            'detectionCheckInterval': config.DETECTION_CHECK_INTERVAL,
            'realTimeMode': config.REAL_TIME_MODE,
            'skipNoDetections': config.SKIP_FRAMES_NO_DETECTIONS,
            'fastDetectionMode': config.FAST_DETECTION_MODE,
            'asyncDisplay': config.ENABLE_ASYNC_DISPLAY,
            
            # Cropping Settings
            'minKeypointsFull': config.MIN_KEYPOINTS_FULL_BODY,
            'minKeypointsPartial': config.MIN_KEYPOINTS_PARTIAL_BODY,
            'croppingQuality': config.CROPPING_QUALITY_THRESHOLD,
            'cropPadding': config.CROP_PADDING_RATIO,
            'requireGoodPose': config.REQUIRE_GOOD_POSE_FOR_CROPPING,
            'strictCroppingArea': config.STRICT_CROPPING_AREA_CHECK,
            'saveFirstLastOnly': config.SAVE_FIRST_LAST_ONLY,
            'saveFullBodyPriority': config.SAVE_FULL_BODY_PRIORITY
        }
        
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/detection', methods=['POST'])
def save_detection_settings():
    """Save detection settings to config file"""
    try:
        settings = request.get_json()
        if not settings:
            return jsonify({'error': 'No settings provided'}), 400
        
        # Read current config file
        config_path = 'config.py'
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        # Update config values
        updates = {
            'PERSON_DETECTION_CONF': settings.get('personConfidence'),
            'KEYPOINT_CONFIDENCE_THRESHOLD': settings.get('keypointConfidence'),
            'FAST_DETECTION_CONF': settings.get('fastDetectionConf'),
            'IOU_THRESHOLD': settings.get('iouThreshold'),
            'OVERLAP_THRESHOLD': settings.get('overlapThreshold'),
            'MIN_TRACKING_FRAMES_FOR_CROPPING': settings.get('minTrackingFrames'),
            'RESUME_AFTER_NON_OVERLAP_FRAMES': settings.get('resumeFrames'),
            'MAX_PAUSE_FRAMES': settings.get('maxPauseFrames'),
            'TRACK_RETIRE_FRAMES': settings.get('retireFrames'),
            'DO_NOT_REUSE_EXTERNAL_IDS': settings.get('noReuseIds'),
            'ASSIGN_NEW_ID_AFTER_OVERLAP': settings.get('newIdAfterOverlap'),
            'PROCESS_EVERY_N_FRAMES': settings.get('processEveryN'),
            'MAX_PROCESSING_FPS': settings.get('maxProcessingFPS'),
            'DETECTION_CHECK_INTERVAL': settings.get('detectionCheckInterval'),
            'REAL_TIME_MODE': settings.get('realTimeMode'),
            'SKIP_FRAMES_NO_DETECTIONS': settings.get('skipNoDetections'),
            'FAST_DETECTION_MODE': settings.get('fastDetectionMode'),
            'ENABLE_ASYNC_DISPLAY': settings.get('asyncDisplay'),
            'MIN_KEYPOINTS_FULL_BODY': settings.get('minKeypointsFull'),
            'MIN_KEYPOINTS_PARTIAL_BODY': settings.get('minKeypointsPartial'),
            'CROPPING_QUALITY_THRESHOLD': settings.get('croppingQuality'),
            'CROP_PADDING_RATIO': settings.get('cropPadding'),
            'REQUIRE_GOOD_POSE_FOR_CROPPING': settings.get('requireGoodPose'),
            'STRICT_CROPPING_AREA_CHECK': settings.get('strictCroppingArea'),
            'SAVE_FIRST_LAST_ONLY': settings.get('saveFirstLastOnly'),
            'SAVE_FULL_BODY_PRIORITY': settings.get('saveFullBodyPriority')
        }
        
        # Update config file content
        for var_name, new_value in updates.items():
            if new_value is not None:
                # Find and replace the variable assignment
                pattern = rf'^{var_name}\s*=.*$'
                if isinstance(new_value, bool):
                    replacement = f'{var_name} = {new_value}'
                elif isinstance(new_value, (int, float)):
                    replacement = f'{var_name} = {new_value}'
                else:
                    replacement = f'{var_name} = "{new_value}"'
                
                config_content = re.sub(pattern, replacement, config_content, flags=re.MULTILINE)
        
        # Write updated config back to file
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        # Reload the config module to apply changes
        importlib.reload(config)
        
        return jsonify({'success': True, 'message': 'Settings saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/detection/reset', methods=['POST'])
def reset_detection_settings():
    """Reset detection settings to defaults"""
    try:
        # Default values based on the original config
        defaults = {
            'PERSON_DETECTION_CONF': 0.10,
            'KEYPOINT_CONFIDENCE_THRESHOLD': 0.5,
            'FAST_DETECTION_CONF': 0.4,
            'IOU_THRESHOLD': 0.0005,
            'OVERLAP_THRESHOLD': 0.1,
            'MIN_TRACKING_FRAMES_FOR_CROPPING': 5,
            'RESUME_AFTER_NON_OVERLAP_FRAMES': 3,
            'MAX_PAUSE_FRAMES': 30,
            'TRACK_RETIRE_FRAMES': 20,
            'DO_NOT_REUSE_EXTERNAL_IDS': True,
            'ASSIGN_NEW_ID_AFTER_OVERLAP': True,
            'PROCESS_EVERY_N_FRAMES': 5,
            'MAX_PROCESSING_FPS': 20,
            'DETECTION_CHECK_INTERVAL': 5,
            'REAL_TIME_MODE': True,
            'SKIP_FRAMES_NO_DETECTIONS': True,
            'FAST_DETECTION_MODE': True,
            'ENABLE_ASYNC_DISPLAY': True,
            'MIN_KEYPOINTS_FULL_BODY': 12,
            'MIN_KEYPOINTS_PARTIAL_BODY': 8,
            'CROPPING_QUALITY_THRESHOLD': 0.7,
            'CROP_PADDING_RATIO': 0.1,
            'REQUIRE_GOOD_POSE_FOR_CROPPING': True,
            'STRICT_CROPPING_AREA_CHECK': True,
            'SAVE_FIRST_LAST_ONLY': True,
            'SAVE_FULL_BODY_PRIORITY': True
        }
        
        # Read current config file
        config_path = 'config.py'
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        # Update config file content with defaults
        for var_name, default_value in defaults.items():
            pattern = rf'^{var_name}\s*=.*$'
            if isinstance(default_value, bool):
                replacement = f'{var_name} = {default_value}'
            elif isinstance(default_value, (int, float)):
                replacement = f'{var_name} = {default_value}'
            else:
                replacement = f'{var_name} = "{default_value}"'
            
            config_content = re.sub(pattern, replacement, config_content, flags=re.MULTILINE)
        
        # Write updated config back to file
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        # Reload the config module to apply changes
        importlib.reload(config)
        
        return jsonify({'success': True, 'message': 'Settings reset to defaults successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/detection-files')
def get_detection_files():
    """Get list of available detection directories"""
    try:
        detection_dirs = {}
        detection_path = Path('detection_images')
        if detection_path.exists():
            for video_dir in detection_path.iterdir():
                if video_dir.is_dir():
                    detection_dirs[video_dir.name] = str(video_dir)
        return jsonify(detection_dirs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/person-files/<video_dir>')
def get_person_files(video_dir):
    """Get list of person files for a specific video directory"""
    try:
        person_files = []
        video_path = Path('detection_images') / video_dir / 'student'
        if video_path.exists():
            for person_dir in video_path.iterdir():
                if person_dir.is_dir() and person_dir.name.startswith('person_id'):
                    person_id = person_dir.name.replace('person_id', '')
                    json_file = person_dir / f'person_id{person_id}_clothing.json'
                    if json_file.exists():
                        person_files.append({
                            'person_id': person_id,
                            'file_path': f'{video_dir}/student/person_id{person_id}/person_id{person_id}_clothing.json'
                        })
        return jsonify(person_files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    """Compute and return dashboard statistics, and persist to processed_data/dashboard_stats.json"""
    try:
        detection_path = Path('detection_images')
        total_detections = 0
        pending = 0
        verified = 0
        rejected = 0

        if detection_path.exists():
            for video_dir in detection_path.iterdir():
                if not video_dir.is_dir():
                    continue
                student_dir = video_dir / 'student'
                if not student_dir.exists():
                    continue
                for person_dir in student_dir.iterdir():
                    if not person_dir.is_dir() or not person_dir.name.startswith('person_id'):
                        continue
                    person_id = person_dir.name.replace('person_id', '')
                    json_file = person_dir / f'person_id{person_id}_clothing.json'
                    if not json_file.exists():
                        continue
                    try:
                        with open(json_file, 'r') as f:
                            data = json.load(f)
                        total_detections += 1
                        is_reviewed = bool(data.get('reviewed'))
                        is_rejected = bool(data.get('rejected'))
                        if is_rejected:
                            rejected += 1
                        elif is_reviewed:
                            verified += 1
                        else:
                            pending += 1
                    except Exception:
                        # Skip malformed files
                        continue

        stats = {
            'total_detections': total_detections,
            'pending': pending,
            'verified': verified,
            'rejected': rejected
        }

        # Persist to processed_data for reuse
        processed_dir = Path('processed_data')
        processed_dir.mkdir(exist_ok=True)
        with open(processed_dir / 'dashboard_stats.json', 'w') as f:
            json.dump(stats, f, indent=2)

        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper functions
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_video_info(video_path):
    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        
        if fps > 0:
            duration_seconds = frame_count / fps
            duration = f"{int(duration_seconds // 60):02d}:{int(duration_seconds % 60):02d}"
        else:
            duration = "Unknown"
        
        cap.release()
        
        return {
            'duration': duration,
            'fps': fps,
            'frame_count': frame_count
        }
    except:
        return {'duration': 'Unknown', 'fps': 0, 'frame_count': 0}

def get_file_size(file_path):
    try:
        size_bytes = os.path.getsize(file_path)
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024**2:
            return f"{size_bytes/1024:.1f} KB"
        elif size_bytes < 1024**3:
            return f"{size_bytes/1024**2:.1f} MB"
        else:
            return f"{size_bytes/1024**3:.1f} GB"
    except:
        return "Unknown"

# API endpoints for clothing dashboard
@app.route('/api/clothing-distribution', methods=['GET'])
def get_clothing_distribution():
    """Get clothing distribution data from clothing_summary.json"""
    try:
        clothing_summary_path = os.path.join('processed_data', 'clothing_summary.json')
        if not os.path.exists(clothing_summary_path):
            return jsonify({
                'error': 'Clothing summary file not found',
                'total_people': 0,
                'top_clothing_distribution': {},
                'bottom_clothing_distribution': {}
            })
        
        # Read clothing summary data
        with open(clothing_summary_path, 'r', encoding='utf-8') as f:
            clothing_data = json.load(f)
            
        # Ensure all required categories are present even if empty
        clothing_categories = [
            "long sleeve top",
            "short sleeve top", 
            "shorts",
            "shorts skirt",
            "long skirt",
            "sleeveless",
            "trousers"
        ]
        
        # Ensure all categories exist in top distribution
        if 'top_clothing_distribution' not in clothing_data:
            clothing_data['top_clothing_distribution'] = {}
            
        for category in clothing_categories:
            if category not in clothing_data['top_clothing_distribution']:
                clothing_data['top_clothing_distribution'][category] = {
                    'quantity': 0,
                    'percentage': 0.0
                }
        
        # Ensure all categories exist in bottom distribution
        if 'bottom_clothing_distribution' not in clothing_data:
            clothing_data['bottom_clothing_distribution'] = {}
            
        for category in clothing_categories:
            if category not in clothing_data['bottom_clothing_distribution']:
                clothing_data['bottom_clothing_distribution'][category] = {
                    'quantity': 0,
                    'percentage': 0.0
                }
        
        return jsonify(clothing_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/uploaded-videos', methods=['GET'])
def get_uploaded_videos():
    """Get list of uploaded videos from uploaded_videos folder"""
    try:
        uploaded_videos_path = Path('uploaded_videos')
        videos = []
        
        if uploaded_videos_path.exists():
            for video_file in uploaded_videos_path.glob('*.mp4'):
                videos.append({
                    'filename': video_file.name,
                    'size': get_file_size(str(video_file)),
                    'path': str(video_file)
                })
        
        return jsonify(videos)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/review-status', methods=['GET'])
def get_review_status():
    """Get review status counts"""
    try:
        # Path to detection images folder
        detection_path = Path('detection_images')
        pending_count = 0
        verified_count = 0
        rejected_count = 0
        
        # Iterate through person JSON files in detection_images
        if detection_path.exists():
            for clothing_json in detection_path.glob('**/*_clothing.json'):
                try:
                    # Check review status
                    with open(clothing_json, 'r', encoding='utf-8') as f:
                        person_data = json.load(f)
                        
                    # Count based on status
                    if person_data.get('reviewed', False) and person_data.get('rejected', False):
                        rejected_count += 1
                    elif person_data.get('reviewed', False):
                        verified_count += 1
                    else:
                        pending_count += 1
                except Exception as inner_e:
                    print(f"Error checking review status: {inner_e}")
                    continue
        
        return jsonify({
            'pending': pending_count,
            'verified': verified_count,
            'rejected': rejected_count,
            'pending_count': pending_count  # For backward compatibility
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/student-clothing-reports', methods=['GET'])
def get_student_clothing_reports():
    """Get student clothing reports from person_id JSON files"""
    try:
        # Path to detection images folder
        detection_path = Path('detection_images')
        reports = []
        
        # Iterate through person JSON files in detection_images
        if detection_path.exists():
            for clothing_json in detection_path.glob('**/*_clothing.json'):
                try:
                    # Load person data
                    with open(clothing_json, 'r', encoding='utf-8') as f:
                        person_data = json.load(f)
                    
                    # Find associated images for this person
                    person_folder = clothing_json.parent
                    first_frame_image = None
                    last_frame_image = None
                    
                    for image_file in person_folder.glob('*.jpg'):
                        if 'first_frame' in image_file.name:
                            # Convert file path to URL
                            first_frame_path = str(image_file).replace('\\', '/')
                            first_frame_parts = first_frame_path.split('detection_images/')
                            if len(first_frame_parts) > 1:
                                first_frame_image = f"/detection_images/{first_frame_parts[1]}"
                        elif 'last_frame' in image_file.name:
                            # Convert file path to URL
                            last_frame_path = str(image_file).replace('\\', '/')
                            last_frame_parts = last_frame_path.split('detection_images/')
                            if len(last_frame_parts) > 1:
                                last_frame_image = f"/detection_images/{last_frame_parts[1]}"
                    
                    # Add image paths to person data
                    person_data['first_frame_image'] = first_frame_image
                    person_data['last_frame_image'] = last_frame_image
                    
                    reports.append(person_data)
                except Exception as inner_e:
                    print(f"Error loading person data: {inner_e}")
                    continue
        
        return jsonify(reports)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/person-details/<person_id>', methods=['GET'])
def get_person_details(person_id):
    """Get detailed information for a specific person"""
    try:
        # Path to detection images folder
        detection_path = Path('detection_images')
        
        # Find the person's JSON file
        for clothing_json in detection_path.glob('**/*_clothing.json'):
            try:
                # Check if this is the correct person
                with open(clothing_json, 'r', encoding='utf-8') as f:
                    person_data = json.load(f)
                
                if person_data.get('person_id') == person_id:
                    # Find associated images for this person
                    person_folder = clothing_json.parent
                    first_frame_image = None
                    last_frame_image = None
                    
                    for image_file in person_folder.glob('*.jpg'):
                        if 'first_frame' in image_file.name:
                            # Convert file path to URL
                            first_frame_path = str(image_file).replace('\\', '/')
                            first_frame_parts = first_frame_path.split('detection_images/')
                            if len(first_frame_parts) > 1:
                                first_frame_image = f"/detection_images/{first_frame_parts[1]}"
                        elif 'last_frame' in image_file.name:
                            # Convert file path to URL
                            last_frame_path = str(image_file).replace('\\', '/')
                            last_frame_parts = last_frame_path.split('detection_images/')
                            if len(last_frame_parts) > 1:
                                last_frame_image = f"/detection_images/{last_frame_parts[1]}"
                    
                    # Add image paths to person data
                    person_data['first_frame_image'] = first_frame_image
                    person_data['last_frame_image'] = last_frame_image
                    
                    return jsonify(person_data)
            except Exception as inner_e:
                print(f"Error checking person data: {inner_e}")
                continue
        
        return jsonify({'error': 'Person not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-person/<person_id>', methods=['POST'])
def verify_person(person_id):
    """Mark a person as verified"""
    try:
        # Path to detection images folder
        detection_path = Path('detection_images')
        person_file = None
        
        # Find the person's JSON file
        for clothing_json in detection_path.glob('**/*_clothing.json'):
            try:
                # Check if this is the correct person
                with open(clothing_json, 'r', encoding='utf-8') as f:
                    person_data = json.load(f)
                
                if person_data.get('person_id') == person_id:
                    person_file = clothing_json
                    break
            except Exception as inner_e:
                print(f"Error checking person ID: {inner_e}")
                continue
        
        if not person_file:
            return jsonify({'error': 'Person not found'}), 404
        
        # Update the person's status
        with open(person_file, 'r', encoding='utf-8') as f:
            person_data = json.load(f)
        
        person_data['reviewed'] = True
        person_data['rejected'] = False
        person_data['review_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        # Save the updated data
        with open(person_file, 'w', encoding='utf-8') as f:
            json.dump(person_data, f, indent=2, ensure_ascii=False)
        
        return jsonify({
            'success': True,
            'message': f'Person {person_id} has been verified'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reject-person/<person_id>', methods=['POST'])
def reject_person(person_id):
    """Mark a person as rejected"""
    try:
        # Path to detection images folder
        detection_path = Path('detection_images')
        person_file = None
        
        # Find the person's JSON file
        for clothing_json in detection_path.glob('**/*_clothing.json'):
            try:
                # Check if this is the correct person
                with open(clothing_json, 'r', encoding='utf-8') as f:
                    person_data = json.load(f)
                
                if person_data.get('person_id') == person_id:
                    person_file = clothing_json
                    break
            except Exception as inner_e:
                print(f"Error checking person ID: {inner_e}")
                continue
        
        if not person_file:
            return jsonify({'error': 'Person not found'}), 404
        
        # Update the person's status
        with open(person_file, 'r', encoding='utf-8') as f:
            person_data = json.load(f)
        
        person_data['reviewed'] = True
        person_data['rejected'] = True
        person_data['review_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        # Save the updated data
        with open(person_file, 'w', encoding='utf-8') as f:
            json.dump(person_data, f, indent=2, ensure_ascii=False)
        
        return jsonify({
            'success': True,
            'message': f'Person {person_id} has been rejected'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add endpoint to serve detection images
@app.route('/detection_images/<path:image_path>')
def serve_detection_image(image_path):
    """Serve detection images for the frontend"""
    try:
        # Construct the full path
        full_path = os.path.join('detection_images', image_path)
        
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return send_file(full_path, mimetype='image/jpeg')
        else:
            return jsonify({'error': 'Image not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add endpoint to serve zone images
@app.route('/api/zone-image/<filename>')
def serve_zone_image(filename):
    """Serve zone images for the frontend"""
    try:
        # Construct the full path
        full_path = os.path.join(ZONE_IMAGES_FOLDER, filename)
        
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return send_file(full_path, mimetype='image/jpeg')
        else:
            return jsonify({'error': 'Zone image not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Video processing functionality using threaded processing
import subprocess
import signal
from threading import Thread
import psutil

# Global dictionary to track processing tasks
processing_tasks = {}

def run_threaded_video_processing(video_path, video_id):
    """Run threaded video processing"""
    try:
        # Emit processing started
        socketio.emit('video_status_changed', {
            'video_id': video_id,
            'status': 'processing',
            'message': 'Processing started'
        })
        
        # Import threaded processing
        import sys
        sys.path.append('.')
        
        from threaded_processing import run_threaded_processing
        import torch
        import cv2
        import os
        
        # Set up CUDA device if available
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Store processing info
        processing_tasks[video_id] = {
            'process': None,
            'status': 'processing',
            'progress': 0,
            'can_pause': True
        }
        
        # Update video metadata with processing status
        try:
            video_file_path = Path(video_path)
            metadata_file = video_file_path.with_suffix('.mp4.json')
            
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                metadata['status'] = 'processing'
                
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
        except Exception as e:
            print(f"Error updating metadata for processing start: {str(e)}")
        
        # Get video properties for progress tracking
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if cap.isOpened() else 0
        cap.release()
        
        # API key for clothing detection
        api_key = "AIzaSyC3ra5uVmLqBcaWsmc-huISLY8Q34cQ--k"
        
        # Create callbacks for the threaded processing
        def stop_callback():
            """Check if processing should stop"""
            return video_id in processing_tasks and processing_tasks[video_id]['status'] == 'stopped'
        
        def progress_callback(frame_count, total_frames):
            """Handle progress updates"""
            if video_id in processing_tasks:
                progress = int((frame_count / total_frames) * 100) if total_frames > 0 else 0
                processing_tasks[video_id]['progress'] = progress
                
                # Emit progress every 100 frames
                if frame_count % 100 == 0:
                    socketio.emit('processing_progress', {
                        'video_id': video_id,
                        'progress': progress,
                        'frame': frame_count,
                        'total_frames': total_frames
                    })
        
        # Run the threaded processing with callbacks
        start_time = time.time()
        stats = run_threaded_processing(video_path, api_key, device, stop_callback, progress_callback)
        total_processing_time = stats.get('time_seconds', time.time() - start_time)
        
        # Update video metadata with processing information
        video_file_path = Path(video_path)
        metadata_file = video_file_path.with_suffix('.mp4.json')
        
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                # Update with processing completion info
                metadata['processing_time'] = total_processing_time
                metadata['completion_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
                metadata['processing_date'] = time.strftime('%Y-%m-%d')
                
                # Mark as completed regardless of whether stopped or naturally finished
                metadata['status'] = 'completed'
                
                # Save updated metadata
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
                    
            except Exception as e:
                print(f"Error updating metadata file: {str(e)}")
        
        # Check if processing was stopped
        if video_id in processing_tasks and processing_tasks[video_id]['status'] == 'stopped':
            socketio.emit('video_status_changed', {
                'video_id': video_id,
                'status': 'completed',
                'message': 'Processing stopped by user - results saved'
            })
        else:
            # Mark as completed
            if video_id in processing_tasks:
                processing_tasks[video_id]['status'] = 'completed'
                processing_tasks[video_id]['progress'] = 100
            
            # Emit completion
            socketio.emit('video_status_changed', {
                'video_id': video_id,
                'status': 'completed',
                'message': 'Processing completed successfully'
            })
        
        # Clean up
        if video_id in processing_tasks:
            del processing_tasks[video_id]
            
    except Exception as e:
        print(f"Error processing video {video_id}: {str(e)}")
        
        # Update video metadata with failure status
        try:
            video_file_path = Path(video_path)
            metadata_file = video_file_path.with_suffix('.mp4.json')
            
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                metadata['status'] = 'failed'
                metadata['error'] = str(e)
                
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
        except Exception as meta_error:
            print(f"Error updating metadata for failed processing: {str(meta_error)}")
        
        # Mark as failed
        if video_id in processing_tasks:
            processing_tasks[video_id]['status'] = 'failed'
            processing_tasks[video_id]['error'] = str(e)
        
        socketio.emit('video_status_changed', {
            'video_id': video_id,
            'status': 'failed',
            'message': f'Processing failed: {str(e)}'
        })

@app.route('/api/videos/<video_id>/start-processing', methods=['POST'])
def start_video_processing(video_id):
    """Start processing a video using threaded processing"""
    try:
        # Check if video exists
        video_file = Path(UPLOAD_FOLDER) / f"{video_id}.mp4"
        if not video_file.exists():
            return jsonify({'error': 'Video not found'}), 404
        
        # Check if already processing
        if video_id in processing_tasks and processing_tasks[video_id]['status'] == 'processing':
            return jsonify({'error': 'Video is already being processed'}), 400
        
        # Immediately emit processing status to update UI
        socketio.emit('video_status_changed', {
            'video_id': video_id,
            'status': 'processing',
            'message': 'Processing starting...'
        })
        
        # Start processing in a separate thread
        processing_thread = Thread(
            target=run_threaded_video_processing,
            args=(str(video_file), video_id),
            daemon=True
        )
        processing_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Video processing started with threaded pipeline',
            'video_id': video_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/pause-processing', methods=['POST'])
def pause_video_processing(video_id):
    """Pause video processing"""
    try:
        if video_id not in processing_tasks:
            return jsonify({'error': 'No processing task found for this video'}), 404
        
        if processing_tasks[video_id]['status'] != 'processing':
            return jsonify({'error': 'Video is not currently being processed'}), 400
        
        processing_tasks[video_id]['status'] = 'paused'
        
        return jsonify({
            'success': True,
            'message': 'Video processing paused',
            'video_id': video_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/resume-processing', methods=['POST'])
def resume_video_processing(video_id):
    """Resume video processing"""
    try:
        if video_id not in processing_tasks:
            return jsonify({'error': 'No processing task found for this video'}), 404
        
        if processing_tasks[video_id]['status'] != 'paused':
            return jsonify({'error': 'Video is not currently paused'}), 400
        
        processing_tasks[video_id]['status'] = 'processing'
        
        return jsonify({
            'success': True,
            'message': 'Video processing resumed',
            'video_id': video_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/stop-processing', methods=['POST'])
def stop_video_processing(video_id):
    """Stop video processing (similar to Ctrl+C)"""
    try:
        if video_id not in processing_tasks:
            return jsonify({'error': 'No processing task found for this video'}), 404
        
        # Set status to stopped - this will be checked by the processing function
        processing_tasks[video_id]['status'] = 'stopped'
        
        return jsonify({
            'success': True,
            'message': 'Video processing stopped - results up to this point will be saved',
            'video_id': video_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/processing-status', methods=['GET'])
def get_processing_status(video_id):
    """Get processing status for a video"""
    try:
        if video_id not in processing_tasks:
            return jsonify({
                'video_id': video_id,
                'status': 'not_processing',
                'progress': 0
            })
        
        task = processing_tasks[video_id]
        return jsonify({
            'video_id': video_id,
            'status': task['status'],
            'progress': task['progress'],
            'error': task.get('error', None)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Video management API endpoints
@app.route('/api/videos', methods=['GET'])
def get_videos():
    """Get list of uploaded videos with their status"""
    try:
        videos = []
        upload_folder = Path(UPLOAD_FOLDER)
        
        if upload_folder.exists():
            for video_file in upload_folder.glob('*.mp4'):
                try:
                    # Get video info
                    video_info = get_video_info(str(video_file))
                    file_size = get_file_size(str(video_file))
                    
                    # Check for JSON metadata file
                    json_file = video_file.with_suffix('.mp4.json')
                    metadata = {}
                    if json_file.exists():
                        with open(json_file, 'r') as f:
                            metadata = json.load(f)
                    
                    # Check if video has been processed
                    video_name = video_file.stem
                    detection_folder = Path('detection_images') / video_name
                    has_detections = detection_folder.exists() and any(detection_folder.glob('**/*.json'))
                    
                    # Check processing status from metadata first, then fall back to in-memory tasks
                    video_id = video_file.stem
                    if video_id in processing_tasks:
                        status = processing_tasks[video_id]['status']
                    elif metadata.get('status'):
                        status = metadata['status']
                    elif has_detections:
                        status = 'completed'
                    else:
                        status = 'pending'
                    
                    # Count violations and detections
                    violations_count = 0
                    detections_count = 0
                    if has_detections:
                        for json_file in detection_folder.glob('**/*_clothing.json'):
                            try:
                                with open(json_file, 'r', encoding='utf-8') as f:
                                    data = json.load(f)
                                detections_count += 1
                                if data.get('violation', False):
                                    violations_count += 1
                            except:
                                continue
                    
                    videos.append({
                        'id': video_file.stem,
                        'name': metadata.get('original_name', video_file.name),  # Use original filename
                        'custom_name': metadata.get('custom_name', ''),
                        'description': metadata.get('description', ''),
                        'size': file_size,
                        'duration': video_info.get('duration', '-'),
                        'upload_time': metadata.get('upload_time', '-'),
                        'status': status,
                        'location': metadata.get('location', '5G Lab'),
                        'detections': detections_count,
                        'violations': violations_count,
                        'first_frame': None  # You can implement thumbnail logic here
                    })
                except Exception as e:
                    print(f"Error processing video {video_file}: {e}")
                    continue
        
        return jsonify(videos)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/details', methods=['GET'])
def get_video_details(video_id):
    """Get detailed information about a specific video"""
    try:
        upload_folder = Path(UPLOAD_FOLDER)
        video_file = upload_folder / f"{video_id}.mp4"
        
        if not video_file.exists():
            return jsonify({'error': 'Video not found'}), 404
        
        # Get basic video info
        video_info = get_video_info(str(video_file))
        file_size = get_file_size(str(video_file))
        
        # Check for JSON metadata file
        json_file = video_file.with_suffix('.mp4.json')
        metadata = {}
        if json_file.exists():
            with open(json_file, 'r') as f:
                metadata = json.load(f)
        
        # Check if video has been processed
        video_name = video_file.stem
        detection_folder = Path('detection_images') / video_name
        has_detections = detection_folder.exists() and any(detection_folder.glob('**/*.json'))
        
        # Check processing status from metadata first, then fall back to in-memory tasks
        if video_id in processing_tasks:
            status = processing_tasks[video_id]['status']
        elif metadata.get('status'):
            status = metadata['status']
        elif has_detections:
            status = 'completed'
        else:
            status = 'pending'
        
        # Count violations and detections
        violations_count = 0
        detections_count = 0
        if has_detections:
            for json_file in detection_folder.glob('**/*_clothing.json'):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    detections_count += 1
                    if data.get('violation', False):
                        violations_count += 1
                except:
                    continue
        
        # Get processing time information from metadata
        processing_time = metadata.get('processing_time')
        completion_time = metadata.get('completion_time')
        processing_date = metadata.get('processing_date')
        
        # Look for thumbnail/first frame
        first_frame = None
        if has_detections:
            # Try to find the first detection image as thumbnail
            for img_file in detection_folder.glob('**/*.jpg'):
                first_frame = f"/detection_images/{img_file.relative_to(Path('detection_images'))}"
                break
        
        # Format processing time for display
        processing_time_display = "-"
        if processing_time is not None:
            if processing_time < 60:
                processing_time_display = f"{processing_time:.1f} seconds"
            else:
                minutes = int(processing_time // 60)
                seconds = processing_time % 60
                processing_time_display = f"{minutes}m {seconds:.1f}s"
        
        # Format completion time for display
        completion_time_display = "-"
        if completion_time:
            try:
                # Try to parse and format the completion time
                completion_dt = datetime.strptime(completion_time, '%Y-%m-%d %H:%M:%S')
                completion_time_display = completion_dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                completion_time_display = completion_time
        
        video_details = {
            'id': video_id,
            'name': metadata.get('original_name', video_file.name),  # Use original filename
            'custom_name': metadata.get('custom_name', ''),
            'original_name': metadata.get('original_name', video_file.name),
            'description': metadata.get('description', ''),
            'size': file_size,
            'duration': video_info.get('duration', '-'),
            'upload_time': metadata.get('upload_time', '-'),
            'status': status,
            'location': metadata.get('location', '5G Lab'),
            'detections': detections_count,
            'violations': violations_count,
            'first_frame': first_frame,
            'processing_time': processing_time,
            'processing_time_display': processing_time_display,
            'completion_time': completion_time,
            'completion_time_display': completion_time_display,
            'processing_date': processing_date
        }
        
        return jsonify(video_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-video', methods=['POST'])
def upload_video():
    """Handle video upload"""
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            # Generate unique filename with timestamp
            timestamp = str(int(time.time()))
            original_filename = secure_filename(file.filename)
            filename = f"{timestamp}_{original_filename}"
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            # Save the file
            file.save(file_path)
            
            # Save metadata
            metadata = {
                'original_name': original_filename,
                'upload_time': time.strftime('%Y-%m-%d %H:%M:%S'),
                'location': request.form.get('location', '5G Lab'),
                'description': request.form.get('description', ''),
                'custom_name': request.form.get('custom_name', ''),
                'status': 'pending',
                'processing_time': None,
                'completion_time': None,
                'processing_date': None
            }
            
            metadata_path = file_path + '.json'
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            upload_id = str(uuid.uuid4())
            return jsonify({
                'success': True,
                'message': 'Video uploaded successfully',
                'upload_id': upload_id,
                'filename': filename
            })
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-video/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    """Delete a video and its associated files"""
    try:
        # Find and delete video file
        video_file = Path(UPLOAD_FOLDER) / f"{video_id}.mp4"
        metadata_file = Path(UPLOAD_FOLDER) / f"{video_id}.mp4.json"
        
        deleted_files = []
        
        if video_file.exists():
            video_file.unlink()
            deleted_files.append(str(video_file))
        
        if metadata_file.exists():
            metadata_file.unlink()
            deleted_files.append(str(metadata_file))
        
        # Delete associated detection results
        detection_folder = Path('detection_images') / video_id.replace('_', '/')
        if detection_folder.exists():
            shutil.rmtree(detection_folder)
            deleted_files.append(str(detection_folder))
        
        if deleted_files:
            return jsonify({
                'success': True,
                'message': f'Video and associated files deleted successfully',
                'deleted_files': deleted_files
            })
        else:
            return jsonify({'error': 'Video not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>/download', methods=['GET'])
def download_video_results(video_id):
    """Download video processing results as ZIP"""
    try:
        # Check if results exist
        detection_folder = Path('detection_images') / video_id
        if not detection_folder.exists():
            return jsonify({'error': 'No results available for this video'}), 404
        
        # Create a temporary ZIP file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            with zipfile.ZipFile(tmp_file.name, 'w') as zip_file:
                # Add all files from detection folder
                for file_path in detection_folder.rglob('*'):
                    if file_path.is_file():
                        arcname = str(file_path.relative_to(detection_folder.parent))
                        zip_file.write(file_path, arcname)
            
            return send_file(tmp_file.name, as_attachment=True, download_name=f'{video_id}_results.zip')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Start the server with SocketIO
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)