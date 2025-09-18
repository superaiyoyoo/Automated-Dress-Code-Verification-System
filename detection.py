import cv2
import numpy as np
import torch
from ultralytics import YOLO
import os
import time
from shapely.geometry import Point, Polygon, box
import config
from collections import defaultdict

class PersonDetector:
    def __init__(self, model_path='yolov8l.pt', device=None):
        """
        Initialize the person detector with YOLOv8 model
        
        Args:
            model_path: Path to the YOLOv8 model
            device: Device to run the model on ('cuda' or 'cpu')
        """
        self.device = device if device is not None else torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"PersonDetector using device: {self.device}")
        
        # Initialize the model and move it to the specified device
        self.model = YOLO(model_path)
        self.model.to(self.device)
        
        self.conf_threshold = config.PERSON_DETECTION_CONF  # Use config value
        self.tracked_people = {}
        self.paused_tracks = {}  # Store paused tracks due to overlap
        self.iou_threshold = config.OVERLAP_THRESHOLD  # Use overlap threshold from config
        self.last_fps_update = time.time()
        self.frame_times = []
        self.current_fps = 0
        # Pause state tracking for confidence-aware pausing and auto-resume
        # Structure: {track_id: {"paused": bool, "pause_frames": int, "non_overlap_frames": int}}
        self.pause_state = defaultdict(lambda: {"paused": False, "pause_frames": 0, "non_overlap_frames": 0})
        # External ID management
        self.external_id_counter = 1
        self.internal_to_external = {}
        self.internal_last_seen = {}
        self.frame_index = 0
    
    def is_point_in_polygon(self, point, polygon):
        """
        Check if a point is inside a polygon using Shapely
        
        Args:
            point: Tuple (x, y) representing the point
            polygon: List of tuples [(x1, y1), (x2, y2), ...] representing polygon vertices
            
        Returns:
            Boolean indicating if point is in polygon
        """
        if not polygon or len(polygon) < 3:
            return False
        
        point_obj = Point(point)
        polygon_obj = Polygon(polygon)
        return polygon_obj.contains(point_obj)
    
    def calculate_iou(self, box1, box2):
        """
        Calculate IoU between two bounding boxes
        
        Args:
            box1: First bounding box (x1, y1, x2, y2)
            box2: Second bounding box (x1, y1, x2, y2)
            
        Returns:
            IoU value between 0 and 1
        """
        # Create shapely boxes
        box1_shapely = box(box1[0], box1[1], box1[2], box1[3])
        box2_shapely = box(box2[0], box2[1], box2[2], box2[3])
        
        # Calculate intersection and union areas
        if box1_shapely.intersects(box2_shapely):
            intersection_area = box1_shapely.intersection(box2_shapely).area
            union_area = box1_shapely.area + box2_shapely.area - intersection_area
            return intersection_area / union_area
        return 0.0
    
    def check_box_overlaps(self, current_box, all_boxes):
        """
        Check if a box overlaps with any other box
        
        Args:
            current_box: Box to check (x1, y1, x2, y2)
            all_boxes: List of all boxes to check against
            
        Returns:
            Boolean indicating if there's an overlap
        """
        for box in all_boxes:
            # Skip comparing with itself
            if np.array_equal(current_box, box):
                continue
                
            # Calculate IoU
            iou = self.calculate_iou(current_box, box)
            
            # If IoU is above threshold, there's an overlap
            if iou > self.iou_threshold:
                return True
                
        return False
    
    def detect_and_track(self, frame, entry_zone, cropping_zones=None):
        """
        Detect and track people in the frame, focusing on entry zone
        
        Args:
            frame: Input video frame
            entry_zone: List of points defining the entry zone polygon
            cropping_zones: List of polygons defining cropping zones
            
        Returns:
            frame: Processed frame with detections
            detections: List of detection objects in entry zone
            in_cropping_zone: Boolean indicating if any person is in a cropping zone
        """
        # Frame counter for retirement logic
        self.frame_index += 1
        active_internal_ids = set()

        # Calculate FPS
        current_time = time.time()
        self.frame_times.append(current_time)
        
        # Keep only the last 30 frames for FPS calculation
        if len(self.frame_times) > 30:
            self.frame_times.pop(0)
            
        # Update FPS every second
        if current_time - self.last_fps_update > 1.0 and len(self.frame_times) > 1:
            self.current_fps = len(self.frame_times) / (self.frame_times[-1] - self.frame_times[0])
            self.last_fps_update = current_time
        
        # Run YOLOv8 detection with tracking using BoTSORT on GPU
        results = self.model.track(frame, persist=True, tracker="botsort.yaml", classes=0, device=self.device)  # class 0 is person in COCO dataset
        
        # Draw entry zone if enabled
        if config.SHOW_ENTRY_EXIT_ZONES and entry_zone and len(entry_zone) >= 3:
            overlay = frame.copy()
            pts = np.array(entry_zone, np.int32)
            pts = pts.reshape((-1, 1, 2))
            
            if config.SHOW_DETECTION_OVERLAY:
                cv2.fillPoly(overlay, [pts], config.ENTRY_ZONE_COLOR)
                cv2.addWeighted(overlay, config.OVERLAY_OPACITY, frame, 1 - config.OVERLAY_OPACITY, 0, frame)
                
            cv2.polylines(frame, [pts], True, config.ENTRY_ZONE_COLOR, 2)
            cv2.putText(frame, "Entry Zone", (entry_zone[0][0], entry_zone[0][1] - 10),
                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, config.ENTRY_ZONE_COLOR, 2)
                      
        # Draw cropping zones if enabled
        if config.SHOW_CROPPING_ZONES and cropping_zones:
            for i, zone in enumerate(cropping_zones):
                if zone and len(zone) >= 3:
                    overlay = frame.copy()
                    pts = np.array(zone, np.int32)
                    pts = pts.reshape((-1, 1, 2))
                    
                    if config.SHOW_DETECTION_OVERLAY:
                        cv2.fillPoly(overlay, [pts], config.CROPPING_ZONE_COLOR)
                        cv2.addWeighted(overlay, config.OVERLAY_OPACITY, frame, 1 - config.OVERLAY_OPACITY, 0, frame)
                        
                    cv2.polylines(frame, [pts], True, config.CROPPING_ZONE_COLOR, 2)
                    cv2.putText(frame, f"Cropping Zone {i+1}", (zone[0][0], zone[0][1] - 10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, config.CROPPING_ZONE_COLOR, 2)
        
        entry_zone_detections = []
        in_cropping_zone = False
        
        # Process detections
        if len(results) > 0 and hasattr(results[0], 'boxes'):
            boxes = results[0].boxes
            
            # Extract all bounding boxes for overlap checking
            all_boxes = []
            for box in boxes:
                if hasattr(box, 'xyxy'):
                    all_boxes.append(box.xyxy[0].cpu().numpy().astype(int))
            
            # Get all active track IDs
            active_track_ids = set()
            if hasattr(boxes, 'id') and boxes.id is not None:
                for id_tensor in boxes.id:
                    if id_tensor is not None:
                        active_track_ids.add(int(id_tensor.item()))
            
            # Build a list of detection infos for confidence-aware overlap decisions
            detection_infos = []
            if hasattr(boxes, 'conf'):
                for idx, box in enumerate(boxes):
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    this_conf = float(box.conf[0]) if hasattr(box, 'conf') else 0.0
                    this_id = int(box.id.item()) if hasattr(box, 'id') and box.id is not None else None
                    detection_infos.append({
                        'bbox': (x1, y1, x2, y2),
                        'conf': this_conf,
                        'id': this_id
                    })
                
            # Check if any person is in a cropping zone
            if cropping_zones:
                for box in boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    
                    # Calculate feet position (bottom center of bounding box)
                    feet_x = (x1 + x2) // 2
                    feet_y = y2
                    feet_point = (feet_x, feet_y)
                    
                    # Check if person is in any cropping zone
                    for zone in cropping_zones:
                        if self.is_point_in_polygon(feet_point, zone):
                            in_cropping_zone = True
                            break
                    
                    if in_cropping_zone:
                        break
            
            # Process current detections
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                bbox = (x1, y1, x2, y2)
                
                # Calculate bottom center point (feet position)
                feet_x = (x1 + x2) // 2
                feet_y = y2
                feet_point = (feet_x, feet_y)
                
                # Check confidence
                conf = float(box.conf[0])
                
                # Only process high confidence detections
                if conf < self.conf_threshold:
                    continue
                
                # Check if the person is in the entry zone
                in_entry_zone = self.is_point_in_polygon(feet_point, entry_zone)
                
                # Only process people in entry zone
                if in_entry_zone:
                    # Get tracker ID if available
                    if hasattr(box, 'id') and box.id is not None:
                        track_id = int(box.id.item())
                        active_internal_ids.add(track_id)
                        self.internal_last_seen[track_id] = self.frame_index
                        # Map internal -> external ID
                        if config.DO_NOT_REUSE_EXTERNAL_IDS:
                            if track_id not in self.internal_to_external:
                                self.internal_to_external[track_id] = self.external_id_counter
                                self.external_id_counter += 1
                            external_id = self.internal_to_external[track_id]
                        else:
                            external_id = track_id
                        
                        # Confidence-aware overlap: pause only if overlapping a higher-confidence box
                        overlaps_higher_conf = False
                        for other in detection_infos:
                            other_id = other['id']
                            if other_id is None or other_id == track_id:
                                continue
                            iou = self.calculate_iou(bbox, other['bbox'])
                            if iou > self.iou_threshold and other['conf'] > conf:
                                overlaps_higher_conf = True
                                break

                        if overlaps_higher_conf:
                            # Update pause state counters
                            state = self.pause_state[track_id]
                            state['paused'] = True
                            state['pause_frames'] += 1
                            state['non_overlap_frames'] = 0

                            # Visual: red box and paused label
                            box_color = (0, 0, 255)
                            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                            cv2.putText(frame, f"ID:{external_id} PAUSED", (x1, y1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)

                            # NO CROPPING WHILE PAUSED - stricter conditions
                            # Skip both tracking updates and cropping while paused
                            continue
                        
                        # No overlap, proceed with normal tracking
                        # Update (possible) resume counters
                        state = self.pause_state[track_id]
                        if state['paused']:
                            state['non_overlap_frames'] += 1
                            if state['non_overlap_frames'] >= config.RESUME_AFTER_NON_OVERLAP_FRAMES:
                                # Auto-resume
                                state['paused'] = False
                                state['pause_frames'] = 0
                                state['non_overlap_frames'] = 0

                        # Add to tracked people
                        if track_id not in self.tracked_people:
                            self.tracked_people[track_id] = {
                                'frames_tracked': 0,
                                'last_position': bbox,
                                'image_saved': False
                            }
                        
                        self.tracked_people[track_id]['frames_tracked'] += 1
                        self.tracked_people[track_id]['last_position'] = bbox
                        
                        # Color based on tracking status
                        box_color = (0, 255, 0)  # Green for entry zone
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                        
                        # Draw feet point
                        cv2.circle(frame, feet_point, 5, (0, 0, 255), -1)
                        
                        # Add label with ID and confidence
                        label = f"ID:{external_id} {conf:.2f}"
                        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                        
                        # STRICT CROPPING CONDITIONS: Apply all requirements before adding to entry_zone_detections
                        frames_tracked = self.tracked_people[track_id]['frames_tracked']
                        
                        # Check all strict cropping conditions
                        meets_confidence = conf >= config.MIN_CONFIDENCE_FOR_CROPPING
                        meets_tracking_frames = frames_tracked >= config.MIN_TRACKING_FRAMES_FOR_CROPPING
                        not_paused = not self.pause_state[track_id]['paused']
                        
                        if meets_confidence and meets_tracking_frames and not_paused:
                            # Add to entry zone detections only when ALL conditions are met
                            entry_zone_detections.append({
                                'id': external_id,
                                'bbox': bbox,
                                'conf': conf,
                                'frames_tracked': frames_tracked,
                                'image_saved': self.tracked_people[track_id]['image_saved']
                            })
                        else:
                            # Log why cropping was skipped
                            reasons = []
                            if not meets_confidence:
                                reasons.append(f"low confidence ({conf:.2f} < {config.MIN_CONFIDENCE_FOR_CROPPING})")
                            if not meets_tracking_frames:
                                reasons.append(f"insufficient tracking frames ({frames_tracked} < {config.MIN_TRACKING_FRAMES_FOR_CROPPING})")
                            if not not_paused:
                                reasons.append("person is paused")
                            
                            print(f"Skipping cropping for ID {external_id}: {', '.join(reasons)}")
        
        # Add performance metrics if enabled
        if config.SHOW_PERFORMANCE_METRICS:
            cv2.putText(frame, f"FPS: {self.current_fps:.1f}", (10, 30), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            
            # Add cropping zone status
            status_text = "In Cropping Zone" if in_cropping_zone else "Outside Cropping Zone"
            status_color = (0, 255, 0) if in_cropping_zone else (0, 0, 255)
            cv2.putText(frame, status_text, (10, 60), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
            
            # Add overlap threshold info
            cv2.putText(frame, f"Overlap Threshold: {self.iou_threshold:.5f}", (10, 90),
                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        # Retire internal IDs that have been missing for too long (do not reuse external IDs)
        if config.DO_NOT_REUSE_EXTERNAL_IDS:
            for internal_id in list(self.internal_to_external.keys()):
                if internal_id not in active_internal_ids:
                    last_seen = self.internal_last_seen.get(internal_id, self.frame_index)
                    if self.frame_index - last_seen > config.TRACK_RETIRE_FRAMES:
                        # Retire internal mapping; external ID stays consumed and never reused
                        del self.internal_to_external[internal_id]

        return frame, entry_zone_detections, in_cropping_zone
    
    def get_person_crop(self, frame, detection):
        """
        Crop a detected person from the frame
        
        Args:
            frame: Input video frame
            detection: Detection object with bbox
            
        Returns:
            Cropped image of the person
        """
        x1, y1, x2, y2 = detection['bbox']
        return frame[y1:y2, x1:x2]
    
    def mark_as_saved(self, track_id):
        """
        Mark a tracked person as having their image saved
        
        Args:
            track_id: ID of the tracked person
        """
        if track_id in self.tracked_people:
            self.tracked_people[track_id]['image_saved'] = True
            
    def check_people_in_zones(self, frame, cropping_zones):
        """
        Quick check if there are any people in the cropping zones
        Uses a faster detection mode with lower confidence threshold
        
        Args:
            frame: Input video frame
            cropping_zones: List of polygons defining cropping zones
            
        Returns:
            Boolean indicating if any person is in a cropping zone
        """
        if not cropping_zones:
            return True  # If no cropping zones defined, always process
            
        # Run detection with lower confidence for speed on GPU
        results = self.model.predict(frame, conf=config.FAST_DETECTION_CONF, classes=0, verbose=False, device=self.device)
        
        if len(results) > 0 and hasattr(results[0], 'boxes'):
            boxes = results[0].boxes
            
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                
                # Calculate feet position (bottom center of bounding box)
                feet_x = (x1 + x2) // 2
                feet_y = y2
                feet_point = (feet_x, feet_y)
                
                # Check if person is in any cropping zone
                for zone in cropping_zones:
                    if self.is_point_in_polygon(feet_point, zone):
                        return True
        
        return False