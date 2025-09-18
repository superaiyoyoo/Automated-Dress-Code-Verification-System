"""
Multithreaded processing module for clothing detection system.

This module implements a multithreaded architecture that divides the processing pipeline
into separate threads to improve performance:

1. FrameReaderThread: Reads frames from the video
2. DetectionThread: Processes frames for person detection and tracking
3. CroppingThread: Crops and saves person images
4. APIThread: Processes images through Gemini API
5. ResultThread: Processes API results and updates files

Communication between threads is handled using thread-safe queues.
"""

import cv2
import numpy as np
import os
import time
import threading
import queue
from pathlib import Path
import json
import torch
from ultralytics import YOLO
from collections import deque
import config
from detection import PersonDetector
from cropping import initialize_cropper, SimpleCropper
from clothing_detection import ClothingDetector
from video_timing import update_json_with_timestamps

# Set maximum queue sizes to prevent memory issues
MAX_FRAME_QUEUE_SIZE = 30
MAX_DETECTION_QUEUE_SIZE = 20
MAX_CROP_QUEUE_SIZE = 50
MAX_RESULT_QUEUE_SIZE = 100

# Global flags for thread control
stop_event = threading.Event()
video_ended = threading.Event()
cropping_ended = threading.Event()
detection_ended = threading.Event()

class FrameReaderThread(threading.Thread):
    """Thread for reading frames from video."""
    
    def __init__(self, video_path, frame_queue, process_every_n=config.PROCESS_EVERY_N_FRAMES, stop_callback=None, progress_callback=None):
        """Initialize frame reader thread."""
        threading.Thread.__init__(self, name="FrameReader")
        self.video_path = video_path
        self.frame_queue = frame_queue
        self.process_every_n = process_every_n
        self.daemon = True
        self.total_frames = 0
        self.stop_callback = stop_callback
        self.progress_callback = progress_callback
    
    def run(self):
        """Run frame reading thread."""
        print(f"{self.name}: Starting frame reader thread")
        try:
            # Open video
            cap = cv2.VideoCapture(self.video_path)
            if not cap.isOpened():
                print(f"Error: Could not open video {self.video_path}")
                video_ended.set()
                return
            
            # Get total frame count for progress tracking
            total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_count = 0
            
            # Read frames from video
            while not stop_event.is_set():
                # Check stop callback if provided
                if self.stop_callback and self.stop_callback():
                    print(f"{self.name}: Stop signal received from callback")
                    stop_event.set()
                    break
                
                ret, frame = cap.read()
                if not ret:
                    print(f"{self.name}: End of video reached")
                    break
                
                frame_count += 1
                self.total_frames = frame_count
                
                # Call progress callback if provided
                if self.progress_callback:
                    self.progress_callback(frame_count, total_video_frames)
                
                # Process every Nth frame for performance
                if frame_count % self.process_every_n != 0:
                    continue
                
                # Add frame to queue, with timeout to allow for clean shutdown
                try:
                    # Use a timeout to prevent blocking forever if stop event is set
                    self.frame_queue.put({
                        'frame': frame,
                        'frame_count': frame_count
                    }, timeout=1)
                    
                    # Print occasional status update
                    if frame_count % (self.process_every_n * 100) == 0:
                        print(f"{self.name}: Processed frame {frame_count}, queue size: {self.frame_queue.qsize()}")
                except queue.Full:
                    # If queue is full, wait briefly
                    time.sleep(0.1)
            
            # Signal that all frames have been read
            video_ended.set()
            
            # Release video capture
            cap.release()
            print(f"{self.name}: Finished reading {frame_count} frames")
            
        except Exception as e:
            print(f"{self.name}: Error: {str(e)}")
            video_ended.set()

class DetectionThread(threading.Thread):
    """Thread for person detection and tracking."""
    
    def __init__(self, frame_queue, detection_queue, device=None):
        """Initialize detection thread."""
        threading.Thread.__init__(self, name="Detection")
        self.frame_queue = frame_queue
        self.detection_queue = detection_queue
        self.device = device if device is not None else torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.daemon = True
        self.frames_processed = 0
        self.fps_stats = deque(maxlen=30)
        self.last_fps_report = time.time()
    
    def run(self):
        """Run detection thread."""
        print(f"{self.name}: Starting detection thread using {self.device}")
        try:
            # Initialize detector and models
            detector = PersonDetector(model_path=config.POSE_MODEL_PATH, device=self.device)
            pose_model = YOLO(config.POSE_ANALYSIS_MODEL_PATH)
            pose_model.to(self.device)
            
            # Get entry and cropping zones from config
            entry_zone = config.areas["entry"]["entry1"]["polygon"] if "entry" in config.areas and "entry1" in config.areas["entry"] else []
            
            # Extract cropping zones from config
            cropping_zones = []
            if "cropping" in config.areas:
                for zone_key, zone_data in config.areas["cropping"].items():
                    if "polygon" in zone_data and len(zone_data["polygon"]) >= 3:
                        cropping_zones.append(zone_data["polygon"])
            
            while not (stop_event.is_set() or (video_ended.is_set() and self.frame_queue.empty())):
                try:
                    # Get frame from queue with timeout
                    frame_data = self.frame_queue.get(timeout=1)
                    frame = frame_data['frame']
                    frame_count = frame_data['frame_count']
                    
                    # Record start time for FPS calculation
                    start_time = time.time()
                    
                    # Detect and track people
                    processed_frame, entry_detections, people_in_zones = detector.detect_and_track(frame, entry_zone, cropping_zones)
                    
                    # Run pose analysis for people in entry zone
                    if len(entry_detections) > 0:
                        pose_results = pose_model(frame, verbose=False, device=self.device)
                        
                        # Process each detection
                        for detection in entry_detections:
                            person_id = detection['id']
                            bbox = detection['bbox']
                            
                            # Extract keypoints from pose model for this person
                            keypoints = []
                            
                            # Find the corresponding detection in pose_results
                            try:
                                if len(pose_results) > 0:
                                    for pose_det in pose_results:
                                        if hasattr(pose_det, 'keypoints') and pose_det.keypoints is not None:
                                            # Get all keypoints
                                            all_kpts = pose_det.keypoints.data
                                            
                                            # Find the keypoints that match this person's bbox
                                            for kpts in all_kpts:
                                                # Calculate bounding box of keypoints
                                                valid_kpts = kpts[kpts[:, 2] > 0]
                                                if len(valid_kpts) > 0:
                                                    kpts_x1 = valid_kpts[:, 0].min().item()
                                                    kpts_y1 = valid_kpts[:, 1].min().item()
                                                    kpts_x2 = valid_kpts[:, 0].max().item()
                                                    kpts_y2 = valid_kpts[:, 1].max().item()
                                                    
                                                    # Check if keypoints bbox overlaps with person bbox
                                                    x1, y1, x2, y2 = bbox
                                                    if (kpts_x1 < x2 and kpts_x2 > x1 and 
                                                        kpts_y1 < y2 and kpts_y2 > y1):
                                                        keypoints = kpts.cpu().numpy()
                                                        break
                                                        
                                if len(keypoints) == 0:
                                    # If no keypoints found, create empty keypoints array
                                    keypoints = np.zeros((17, 3))
                            except Exception as e:
                                print(f"{self.name}: Error extracting keypoints for person {person_id}: {e}")
                                # Create empty keypoints array
                                keypoints = np.zeros((17, 3))
                            
                            # Add detection with keypoints to queue
                            try:
                                self.detection_queue.put({
                                    'frame': frame.copy(),  # Copy the frame for thread safety
                                    'frame_count': frame_count,
                                    'person_id': person_id,
                                    'bbox': bbox,
                                    'keypoints': keypoints.copy() if keypoints is not None else None
                                }, timeout=0.5)
                            except queue.Full:
                                # If queue is full, log and continue
                                print(f"{self.name}: Detection queue full, skipping detection")
                    
                    # Calculate and report FPS periodically
                    self.frames_processed += 1
                    processing_time = time.time() - start_time
                    self.fps_stats.append(processing_time)
                    
                    if time.time() - self.last_fps_report > 5.0:  # Report every 5 seconds
                        avg_time = sum(self.fps_stats) / len(self.fps_stats) if self.fps_stats else 0
                        fps = 1.0 / avg_time if avg_time > 0 else 0
                        print(f"{self.name}: Processing at {fps:.2f} FPS, detection queue: {self.detection_queue.qsize()}")
                        self.last_fps_report = time.time()
                    
                    # Mark the frame as processed
                    self.frame_queue.task_done()
                    
                except queue.Empty:
                    # No frame available, just continue
                    continue
                except Exception as e:
                    print(f"{self.name}: Error processing frame: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            # Signal that detection has ended
            print(f"{self.name}: Detection thread finished, processed {self.frames_processed} frames")
            detection_ended.set()
            
        except Exception as e:
            print(f"{self.name}: Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()
            detection_ended.set()

class CroppingThread(threading.Thread):
    """Thread for cropping and saving person images."""
    
    def __init__(self, detection_queue, crop_queue, video_path):
        """Initialize cropping thread."""
        threading.Thread.__init__(self, name="Cropping")
        self.detection_queue = detection_queue
        self.crop_queue = crop_queue
        self.video_path = video_path
        self.daemon = True
        self.crops_processed = 0
    
    def run(self):
        """Run cropping thread."""
        print(f"{self.name}: Starting cropping thread")
        try:
            # Initialize cropper
            cropper = SimpleCropper(self.video_path)
            
            while not (stop_event.is_set() or (detection_ended.is_set() and self.detection_queue.empty())):
                try:
                    # Get detection from queue with timeout
                    detection = self.detection_queue.get(timeout=1)
                    
                    frame = detection['frame']
                    frame_count = detection['frame_count']
                    person_id = detection['person_id']
                    bbox = detection['bbox']
                    keypoints = detection['keypoints']
                    
                    # Process the person (crop and save)
                    processed = cropper.process_person(frame, person_id, bbox, keypoints, frame_count)
                    
                    # If processing succeeded, get the paths to the saved images
                    if processed:
                        self.crops_processed += 1
                        
                        # Find the saved images and add them to the crop queue
                        person_folder = config.create_person_folder(self.video_path, person_id)
                        for img_file in os.listdir(person_folder):
                            if img_file.endswith('.jpg'):
                                img_path = os.path.join(person_folder, img_file)
                                
                                # Only process newly created images
                                file_mtime = os.path.getmtime(img_path)
                                if time.time() - file_mtime < 5:  # If file was created within the last 5 seconds
                                    # Check if this is a first or last frame
                                    if 'first_frame' in img_file or 'last_frame' in img_file:
                                        try:
                                            self.crop_queue.put({
                                                'person_id': person_id,
                                                'image_path': img_path,
                                                'frame_count': frame_count,
                                                'is_first': 'first_frame' in img_file,
                                                'is_last': 'last_frame' in img_file
                                            }, timeout=0.5)
                                        except queue.Full:
                                            print(f"{self.name}: Crop queue full, skipping image: {img_path}")
                    else:
                        print(f"{self.name}: Failed to process person ID {person_id} at frame {frame_count}")
                    
                    # Mark the detection as processed
                    self.detection_queue.task_done()
                    
                    # Periodically report status
                    if self.crops_processed % 10 == 0:
                        print(f"{self.name}: Processed {self.crops_processed} crops, crop queue size: {self.crop_queue.qsize()}")
                    
                except queue.Empty:
                    # No detection available, just continue
                    continue
                except Exception as e:
                    print(f"{self.name}: Error processing detection: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            # Save last seen images before ending
            print(f"{self.name}: Saving last seen images")
            cropper.save_last_seen_images()
            
            # Signal that cropping has ended
            print(f"{self.name}: Cropping thread finished, processed {self.crops_processed} crops")
            cropping_ended.set()
            
        except Exception as e:
            print(f"{self.name}: Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()
            cropping_ended.set()

class APIThread(threading.Thread):
    """Thread for processing images through Gemini API."""
    
    def __init__(self, crop_queue, result_queue, api_key):
        """Initialize API thread."""
        threading.Thread.__init__(self, name="API")
        self.crop_queue = crop_queue
        self.result_queue = result_queue
        self.api_key = api_key
        self.daemon = True
        self.images_processed = 0
        self.person_data = {}  # Store first/last frame data by person_id
    
    def run(self):
        """Run API thread."""
        print(f"{self.name}: Starting API thread")
        try:
            # Initialize clothing detector
            clothing_detector = ClothingDetector(self.api_key)
            
            while not (stop_event.is_set() or (cropping_ended.is_set() and self.crop_queue.empty())):
                try:
                    # Get crop from queue with timeout
                    crop_data = self.crop_queue.get(timeout=1)
                    
                    person_id = crop_data['person_id']
                    image_path = crop_data['image_path']
                    is_first = crop_data['is_first']
                    is_last = crop_data['is_last']
                    frame_count = crop_data['frame_count']
                    
                    # Store by person_id to ensure we have both first and last frame before processing
                    if person_id not in self.person_data:
                        self.person_data[person_id] = {'first': None, 'last': None}
                    
                    # Store the image data
                    if is_first:
                        print(f"{self.name}: Processing first frame for person {person_id}")
                        clothing_data = clothing_detector.detect_clothing(image_path)
                        self.person_data[person_id]['first'] = {
                            'image_path': image_path,
                            'frame_count': frame_count,
                            'clothing_data': clothing_data
                        }
                    elif is_last:
                        print(f"{self.name}: Processing last frame for person {person_id}")
                        clothing_data = clothing_detector.detect_clothing(image_path)
                        self.person_data[person_id]['last'] = {
                            'image_path': image_path,
                            'frame_count': frame_count,
                            'clothing_data': clothing_data
                        }
                    
                    # Check if we have both first and last frame for this person
                    person_entry = self.person_data[person_id]
                    if person_entry['first'] is not None and person_entry['last'] is not None:
                        # Calculate similarity between first and last frame
                        similarity = clothing_detector.calculate_clothing_similarity(
                            person_entry['first']['clothing_data'],
                            person_entry['last']['clothing_data']
                        )
                        print(f"{self.name}: Clothing similarity for person {person_id}: {similarity:.1f}%")
                        
                        # If similarity is above threshold, send to result queue
                        if similarity >= 60:
                            # Prepare clothing data from first frame
                            result_data = person_entry['first']['clothing_data'].copy()
                            result_data['person_id'] = person_id
                            result_data['similarity_score'] = similarity
                            result_data['last_frame_top'] = person_entry['last']['clothing_data'].get('top_clothing', 'unknown')
                            result_data['last_frame_bottom'] = person_entry['last']['clothing_data'].get('bottom_clothing', 'unknown')
                            
                            # Determine violation based on first-frame clothing
                            v = clothing_detector._determine_violation(
                                result_data.get('top_clothing', ''),
                                result_data.get('bottom_clothing', '')
                            )
                            result_data['violation'] = v['violation']
                            result_data['violation_categories'] = v['categories']
                            result_data['first_frame_count'] = person_entry['first']['frame_count']
                            result_data['last_frame_count'] = person_entry['last']['frame_count']
                            
                            # Add to result queue
                            try:
                                self.result_queue.put({
                                    'person_id': person_id,
                                    'clothing_data': result_data,
                                    'video_path': os.path.dirname(os.path.dirname(os.path.dirname(image_path))),
                                    'first_image': person_entry['first']['image_path'],
                                    'last_image': person_entry['last']['image_path']
                                }, timeout=0.5)
                                print(f"{self.name}: Added person {person_id} to result queue")
                            except queue.Full:
                                print(f"{self.name}: Result queue full, skipping person {person_id}")
                        else:
                            print(f"{self.name}: Similarity too low ({similarity:.1f}% < 60%), skipping person {person_id}")
                        
                        # Remove from person_data to free memory
                        del self.person_data[person_id]
                    
                    # Mark the crop as processed
                    self.crop_queue.task_done()
                    self.images_processed += 1
                    
                except queue.Empty:
                    # No crop available, just continue
                    continue
                except Exception as e:
                    print(f"{self.name}: Error processing crop: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            # Process any remaining items in person_data
            print(f"{self.name}: Processing {len(self.person_data)} remaining items")
            for person_id, person_entry in list(self.person_data.items()):
                if person_entry['first'] is not None and person_entry['last'] is not None:
                    # Similar processing as above
                    try:
                        clothing_detector = ClothingDetector(self.api_key)
                        similarity = clothing_detector.calculate_clothing_similarity(
                            person_entry['first']['clothing_data'],
                            person_entry['last']['clothing_data']
                        )
                        
                        if similarity >= 60:
                            result_data = person_entry['first']['clothing_data'].copy()
                            result_data['person_id'] = person_id
                            result_data['similarity_score'] = similarity
                            result_data['last_frame_top'] = person_entry['last']['clothing_data'].get('top_clothing', 'unknown')
                            result_data['last_frame_bottom'] = person_entry['last']['clothing_data'].get('bottom_clothing', 'unknown')
                            
                            v = clothing_detector._determine_violation(
                                result_data.get('top_clothing', ''),
                                result_data.get('bottom_clothing', '')
                            )
                            result_data['violation'] = v['violation']
                            result_data['violation_categories'] = v['categories']
                            result_data['first_frame_count'] = person_entry['first']['frame_count']
                            result_data['last_frame_count'] = person_entry['last']['frame_count']
                            
                            self.result_queue.put({
                                'person_id': person_id,
                                'clothing_data': result_data,
                                'video_path': os.path.dirname(os.path.dirname(os.path.dirname(person_entry['first']['image_path']))),
                                'first_image': person_entry['first']['image_path'],
                                'last_image': person_entry['last']['image_path']
                            }, timeout=0.5)
                            print(f"{self.name}: Processed remaining item for person {person_id}")
                    except Exception as e:
                        print(f"{self.name}: Error processing remaining item for person {person_id}: {str(e)}")
            
            # Also process any remaining person that only has one frame
            # This ensures we get data even if only first OR last frame was detected
            print(f"{self.name}: Checking for people with only one frame...")
            # Construct detection path from video path
            video_name = Path(self.video_path).stem
            detection_path = Path("detection_images") / video_name
            
            if detection_path and detection_path.exists():
                # Look for student folder directly
                student_folder = detection_path / "student"
                if student_folder.exists():
                    for person_folder in student_folder.iterdir():
                        if person_folder.is_dir() and person_folder.name.startswith('person_id'):
                            person_id_full = person_folder.name
                            person_id = person_id_full.replace('person_id', '')
                            
                            # Check if JSON already exists
                            json_path = person_folder / f"{person_id_full}_clothing.json"
                            if json_path.exists():
                                continue
                                
                            # Check what frames are available
                            first_frame = None
                            last_frame = None
                            
                            for img_file in person_folder.iterdir():
                                if img_file.is_file() and img_file.suffix == '.jpg':
                                    if 'first_frame' in img_file.name:
                                        first_frame = img_file
                                    elif 'last_frame' in img_file.name:
                                        last_frame = img_file
                            
                            # Process if we have at least one frame
                            if first_frame or last_frame:
                                try:
                                    clothing_detector = ClothingDetector(self.api_key)
                                    
                                    if first_frame and last_frame:
                                        # Both frames available - full processing
                                        first_data = clothing_detector.detect_clothing(str(first_frame))
                                        last_data = clothing_detector.detect_clothing(str(last_frame))
                                        similarity = clothing_detector.calculate_clothing_similarity(first_data, last_data)
                                        
                                        if similarity >= 60:
                                            result_data = first_data.copy()
                                            result_data['person_id'] = person_id
                                            result_data['similarity_score'] = similarity
                                            result_data['last_frame_top'] = last_data.get('top_clothing', 'unknown')
                                            result_data['last_frame_bottom'] = last_data.get('bottom_clothing', 'unknown')
                                            
                                            v = clothing_detector._determine_violation(
                                                result_data.get('top_clothing', ''),
                                                result_data.get('bottom_clothing', '')
                                            )
                                            result_data['violation'] = v['violation']
                                            result_data['violation_categories'] = v['categories']
                                            
                                            # Save JSON directly
                                            with open(json_path, 'w', encoding='utf-8') as f:
                                                json.dump(result_data, f, indent=2, ensure_ascii=False)
                                            print(f"{self.name}: Saved both-frame data for person {person_id}")
                                            
                                    elif first_frame:
                                        # Only first frame - use it as the clothing data
                                        clothing_data = clothing_detector.detect_clothing(str(first_frame))
                                        clothing_data['person_id'] = person_id
                                        clothing_data['similarity_score'] = 0.0  # No comparison possible
                                        clothing_data['last_frame_top'] = 'unknown'
                                        clothing_data['last_frame_bottom'] = 'unknown'
                                        
                                        v = clothing_detector._determine_violation(
                                            clothing_data.get('top_clothing', ''),
                                            clothing_data.get('bottom_clothing', '')
                                        )
                                        clothing_data['violation'] = v['violation']
                                        clothing_data['violation_categories'] = v['categories']
                                        
                                        # Save JSON directly
                                        with open(json_path, 'w', encoding='utf-8') as f:
                                            json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                                        print(f"{self.name}: Saved first-frame-only data for person {person_id}")
                                        
                                    elif last_frame:
                                        # Only last frame - use it as the clothing data
                                        clothing_data = clothing_detector.detect_clothing(str(last_frame))
                                        clothing_data['person_id'] = person_id
                                        clothing_data['similarity_score'] = 0.0  # No comparison possible
                                        clothing_data['last_frame_top'] = clothing_data.get('top_clothing', 'unknown')
                                        clothing_data['last_frame_bottom'] = clothing_data.get('bottom_clothing', 'unknown')
                                        
                                        v = clothing_detector._determine_violation(
                                            clothing_data.get('top_clothing', ''),
                                            clothing_data.get('bottom_clothing', '')
                                        )
                                        clothing_data['violation'] = v['violation']
                                        clothing_data['violation_categories'] = v['categories']
                                        
                                        # Save JSON directly
                                        with open(json_path, 'w', encoding='utf-8') as f:
                                            json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                                        print(f"{self.name}: Saved last-frame-only data for person {person_id}")
                                        
                                except Exception as e:
                                    print(f"{self.name}: Error processing single-frame person {person_id}: {str(e)}")
            
            # Signal that API processing has ended
            print(f"{self.name}: API thread finished, processed {self.images_processed} images")
            
        except Exception as e:
            print(f"{self.name}: Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()

class ResultThread(threading.Thread):
    """Thread for processing API results and updating files."""
    
    def __init__(self, result_queue, video_path):
        """Initialize result thread."""
        threading.Thread.__init__(self, name="Result")
        self.result_queue = result_queue
        self.video_path = video_path
        self.daemon = True
        self.results_processed = 0
    
    def run(self):
        """Run result thread."""
        print(f"{self.name}: Starting result thread")
        try:
            # Dictionary to store video folders that need timestamp updates
            videos_to_update = set()
            
            while not (stop_event.is_set() or (cropping_ended.is_set() and self.result_queue.empty())):
                try:
                    # Get result from queue with timeout
                    result_data = self.result_queue.get(timeout=1)
                    
                    person_id = result_data['person_id']
                    clothing_data = result_data['clothing_data']
                    video_path = result_data['video_path']
                    
                    # Create person folder path
                    person_folder = os.path.join(video_path, 'student', f"person_id{person_id}")
                    
                    # Create JSON file path
                    json_path = os.path.join(person_folder, f"person_id{person_id}_clothing.json")
                    
                    # Save clothing data to JSON file
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                    
                    print(f"{self.name}: Saved clothing data for person {person_id} to {json_path}")
                    
                    # Add video to update list
                    videos_to_update.add(self.video_path)
                    
                    # Mark the result as processed
                    self.result_queue.task_done()
                    self.results_processed += 1
                    
                except queue.Empty:
                    # No result available, just continue
                    continue
                except Exception as e:
                    print(f"{self.name}: Error processing result: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            # Update timestamps for all videos
            print(f"{self.name}: Updating timestamps for {len(videos_to_update)} videos")
            for video_path in videos_to_update:
                try:
                    update_json_with_timestamps(video_path)
                except Exception as e:
                    print(f"{self.name}: Error updating timestamps for {video_path}: {str(e)}")
            
            # Signal that result processing has ended
            print(f"{self.name}: Result thread finished, processed {self.results_processed} results")
            
        except Exception as e:
            print(f"{self.name}: Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()

def run_threaded_processing(video_path, api_key, device=None, stop_callback=None, progress_callback=None):
    """
    Run the full processing pipeline with multiple threads.
    
    Args:
        video_path: Path to the video file
        api_key: Gemini API key for clothing detection
        device: Device to use for detection (cuda or cpu)
        stop_callback: Function that returns True if processing should stop
        progress_callback: Function to call with progress updates (frame_count, total_frames)
    """
    # Reset global flags
    stop_event.clear()
    video_ended.clear()
    cropping_ended.clear()
    detection_ended.clear()
    
    # Create thread-safe queues
    frame_queue = queue.Queue(maxsize=MAX_FRAME_QUEUE_SIZE)
    detection_queue = queue.Queue(maxsize=MAX_DETECTION_QUEUE_SIZE)
    crop_queue = queue.Queue(maxsize=MAX_CROP_QUEUE_SIZE)
    result_queue = queue.Queue(maxsize=MAX_RESULT_QUEUE_SIZE)
    
    # Create output directories if they don't exist
    os.makedirs(config.OUTPUT_PATH, exist_ok=True)
    
    # Create video-specific folders
    video_folder, student_folder = config.create_video_folders(video_path)
    
    # Use CUDA if available
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Create and start threads
    threads = []
    
    # Frame reader thread
    frame_thread = FrameReaderThread(video_path, frame_queue, config.PROCESS_EVERY_N_FRAMES, stop_callback, progress_callback)
    threads.append(frame_thread)
    frame_thread.start()
    
    # Detection thread
    detection_thread = DetectionThread(frame_queue, detection_queue, device)
    threads.append(detection_thread)
    detection_thread.start()
    
    # Cropping thread
    cropping_thread = CroppingThread(detection_queue, crop_queue, video_path)
    threads.append(cropping_thread)
    cropping_thread.start()
    
    # API thread
    api_thread = APIThread(crop_queue, result_queue, api_key)
    threads.append(api_thread)
    api_thread.start()
    
    # Result thread
    result_thread = ResultThread(result_queue, video_path)
    threads.append(result_thread)
    result_thread.start()
    
    try:
        # Wait for all threads to finish
        start_time = time.time()
        
        # First wait for video to end
        print("Waiting for video processing to complete...")
        while not video_ended.is_set() and not stop_event.is_set():
            time.sleep(1)
        
        # Then wait for detection to finish
        if not stop_event.is_set():
            print("Video ended. Waiting for detection to complete...")
            while not detection_ended.is_set() and not stop_event.is_set():
                if not frame_queue.empty():
                    print(f"Waiting for frame queue to empty: {frame_queue.qsize()} items remaining")
                time.sleep(1)
        
        # Then wait for cropping to finish
        if not stop_event.is_set():
            print("Detection ended. Waiting for cropping to complete...")
            while not cropping_ended.is_set() and not stop_event.is_set():
                if not detection_queue.empty():
                    print(f"Waiting for detection queue to empty: {detection_queue.qsize()} items remaining")
                time.sleep(1)
        
        # Finally wait for result processing to finish
        if not stop_event.is_set():
            print("Cropping ended. Waiting for results to complete...")
            while not result_queue.empty() and not stop_event.is_set():
                print(f"Waiting for result queue to empty: {result_queue.qsize()} items remaining")
                time.sleep(1)
        
        total_time = time.time() - start_time
        print(f"Processing complete in {total_time:.2f} seconds")
        
        # Wait for all threads to fully finish
        print("Waiting for all threads to finish...")
        for thread in threads:
            if thread.is_alive():
                thread.join(timeout=5)  # Give threads 5 seconds to finish gracefully
        
    except KeyboardInterrupt:
        print("Keyboard interrupt received. Stopping threads...")
        stop_event.set()
        
        # Give threads time to finish gracefully
        print("Waiting for threads to stop...")
        for thread in threads:
            if thread.is_alive():
                thread.join(timeout=3)
    
    # Process any remaining detection images that weren't processed by the threads
    print("\n🔄 Final processing: Checking for any remaining unprocessed images...")
    try:
        from clothing_detection import ClothingDetector
        clothing_detector = ClothingDetector(api_key)
        
        # Get video name and detection path
        video_name = Path(video_path).stem
        detection_images_path = Path("detection_images") / video_name / "student"
        
        if detection_images_path.exists():
            remaining_processed = 0
            for person_folder in detection_images_path.iterdir():
                if person_folder.is_dir() and person_folder.name.startswith('person_id'):
                    person_id_full = person_folder.name
                    person_id = person_id_full.replace('person_id', '')
                    
                    # Check if JSON already exists
                    json_path = person_folder / f"{person_id_full}_clothing.json"
                    if json_path.exists():
                        continue
                    
                    # Check what frames are available
                    first_frame = None
                    last_frame = None
                    
                    for img_file in person_folder.iterdir():
                        if img_file.is_file() and img_file.suffix == '.jpg':
                            if 'first_frame' in img_file.name:
                                first_frame = img_file
                            elif 'last_frame' in img_file.name:
                                last_frame = img_file
                    
                    # Process if we have at least one frame
                    if first_frame or last_frame:
                        try:
                            if first_frame and last_frame:
                                # Both frames available - full processing
                                first_data = clothing_detector.detect_clothing(str(first_frame))
                                last_data = clothing_detector.detect_clothing(str(last_frame))
                                similarity = clothing_detector.calculate_clothing_similarity(first_data, last_data)
                                
                                if similarity >= 60:
                                    result_data = first_data.copy()
                                    result_data['person_id'] = person_id
                                    result_data['similarity_score'] = similarity
                                    result_data['last_frame_top'] = last_data.get('top_clothing', 'unknown')
                                    result_data['last_frame_bottom'] = last_data.get('bottom_clothing', 'unknown')
                                    
                                    v = clothing_detector._determine_violation(
                                        result_data.get('top_clothing', ''),
                                        result_data.get('bottom_clothing', '')
                                    )
                                    result_data['violation'] = v['violation']
                                    result_data['violation_categories'] = v['categories']
                                    
                                    # Save JSON directly
                                    with open(json_path, 'w', encoding='utf-8') as f:
                                        json.dump(result_data, f, indent=2, ensure_ascii=False)
                                    print(f"✅ Final processing: Saved both-frame data for person {person_id}")
                                    remaining_processed += 1
                                    
                            elif first_frame:
                                # Only first frame - use it as the clothing data
                                clothing_data = clothing_detector.detect_clothing(str(first_frame))
                                clothing_data['person_id'] = person_id
                                clothing_data['similarity_score'] = 0.0
                                clothing_data['last_frame_top'] = 'unknown'
                                clothing_data['last_frame_bottom'] = 'unknown'
                                
                                v = clothing_detector._determine_violation(
                                    clothing_data.get('top_clothing', ''),
                                    clothing_data.get('bottom_clothing', '')
                                )
                                clothing_data['violation'] = v['violation']
                                clothing_data['violation_categories'] = v['categories']
                                
                                # Save JSON directly
                                with open(json_path, 'w', encoding='utf-8') as f:
                                    json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                                print(f"✅ Final processing: Saved first-frame-only data for person {person_id}")
                                remaining_processed += 1
                                
                            elif last_frame:
                                # Only last frame - use it as the clothing data
                                clothing_data = clothing_detector.detect_clothing(str(last_frame))
                                clothing_data['person_id'] = person_id
                                clothing_data['similarity_score'] = 0.0
                                clothing_data['last_frame_top'] = clothing_data.get('top_clothing', 'unknown')
                                clothing_data['last_frame_bottom'] = clothing_data.get('bottom_clothing', 'unknown')
                                
                                v = clothing_detector._determine_violation(
                                    clothing_data.get('top_clothing', ''),
                                    clothing_data.get('bottom_clothing', '')
                                )
                                clothing_data['violation'] = v['violation']
                                clothing_data['violation_categories'] = v['categories']
                                
                                # Save JSON directly
                                with open(json_path, 'w', encoding='utf-8') as f:
                                    json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                                print(f"✅ Final processing: Saved last-frame-only data for person {person_id}")
                                remaining_processed += 1
                                
                        except Exception as e:
                            print(f"❌ Final processing error for person {person_id}: {str(e)}")
            
            print(f"📊 Final processing completed: {remaining_processed} additional persons processed")
    
    except Exception as e:
        print(f"❌ Error in final processing: {str(e)}")
    
    # Update JSON files with accurate video timestamps
    print("\n🕒 Updating JSON files with accurate video timestamps...")
    try:
        from video_timing import update_json_with_timestamps
        update_json_with_timestamps(video_path)
        print("✅ Timestamps updated successfully")
    except Exception as e:
        print(f"❌ Error updating timestamps: {str(e)}")
    
    # Generate clothing summary with quantities and percentages
    print("\n📊 Generating clothing summary with quantities and percentages...")
    try:
        from clothing_summary_generator import generate_clothing_summary
        summary_file = generate_clothing_summary("detection_images", "processed_data")
        if summary_file:
            print(f"✅ Clothing summary generated and saved to {summary_file}")
        else:
            print("⚠️ Clothing summary generation returned no file")
    except Exception as e:
        print(f"❌ Error generating clothing summary: {str(e)}")
    
    print("\n🎉 THREADED PROCESSING COMPLETE!")
    
    # Return processing stats
    return {
        "processed_frames": frame_thread.total_frames if hasattr(frame_thread, 'total_frames') else 0,
        "time_seconds": time.time() - start_time
    }

if __name__ == "__main__":
    # Example usage
    video_path = 'cctv videos/IPdome_5G_LAB_5G_LAB_20250626140444_20250626150248_791139962.mp4'
    api_key = "AIzaSyC3ra5uVmLqBcaWsmc-huISLY8Q34cQ--k"
    
    stats = run_threaded_processing(video_path, api_key)
    print(f"Processed {stats['processed_frames']} frames in {stats['time_seconds']:.2f} seconds")
