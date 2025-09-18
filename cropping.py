"""
Simplified dynamic cropping system based on keypoints analysis.
Only saves first and last seen images for each person.
"""

import cv2
import numpy as np
import os
import time
from collections import defaultdict
import config
from scipy.spatial import distance

# Keypoint indices for pose analysis
KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
]

# Keypoint groups for analysis
HEAD_KEYPOINTS = [0, 1, 2, 3, 4]  # nose, eyes, ears
UPPER_BODY_KEYPOINTS = [5, 6, 7, 8, 9, 10]  # shoulders, elbows, wrists
TORSO_KEYPOINTS = [5, 6, 11, 12]  # shoulders, hips
LOWER_BODY_KEYPOINTS = [11, 12, 13, 14, 15, 16]  # hips, knees, ankles
ANKLE_KEYPOINTS = [15, 16]  # left_ankle, right_ankle
KNEE_KEYPOINTS = [13, 14]   # left_knee, right_knee
HIP_KEYPOINTS = [11, 12]    # left_hip, right_hip

class SimpleCropper:
    """Simplified cropping system that only saves first and last seen images"""
    
    def __init__(self, video_path):
        self.video_path = video_path
        self.person_first_seen = {}  # Track when each person was first seen
        self.person_last_seen = {}   # Track when each person was last seen
        self.person_first_saved = {}  # Track if first image was saved
        self.person_last_frame = {}  # Store last frame for each person
        self.person_last_bbox = {}   # Store last bbox for each person
        self.person_last_keypoints = {}  # Store last keypoints for each person
        
        # Add new attributes for identity verification
        self.person_first_features = {}  # Store features of first frame
        self.person_first_images = {}    # Store first frame images
        self.identity_threshold = 0.85   # Minimum similarity score to confirm same identity
        
    def is_point_in_polygon(self, point, polygon):
        """Check if a point is inside a polygon"""
        if not polygon:
            return False
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside

    def is_in_cropping_area(self, bbox, keypoints):
        """Check if person is in the defined cropping area"""
        # If no cropping areas are defined, always return True to crop all people
        if "cropping" not in config.areas or not config.areas["cropping"]:
            return True
            
        # Check multiple points of the bounding box, not just the center
        x1, y1, x2, y2 = bbox
        
        # Check center point
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        
        # Check bottom center (feet) point
        feet_x = center_x
        feet_y = y2
        
        # Points to check
        points_to_check = [
            (center_x, center_y),  # Center
            (feet_x, feet_y),     # Bottom center (feet)
            (x1, y1),             # Top left
            (x2, y1),             # Top right
            (x1, y2),             # Bottom left
            (x2, y2)              # Bottom right
        ]
        
        # Check against all cropping areas
        for area_id, area_info in config.areas["cropping"].items():
            crop_polygon = area_info["polygon"]
            if not crop_polygon:
                continue
                
            if config.STRICT_CROPPING_AREA_CHECK:
                # STRICT: Require center point AND feet to be in cropping area
                center_in = self.is_point_in_polygon((center_x, center_y), crop_polygon)
                feet_in = self.is_point_in_polygon((feet_x, feet_y), crop_polygon)
                if center_in and feet_in:
                    return True
            else:
                # LENIENT: If any point is in the polygon, consider it in the cropping area
                for point in points_to_check:
                    if self.is_point_in_polygon(point, crop_polygon):
                        return True
                
        return False
    
    def get_valid_keypoints(self, keypoints):
        """Get keypoints with confidence above threshold"""
        if keypoints is None or len(keypoints) == 0:
            return []
            
        valid_keypoints = []
        try:
            for i, (x, y, conf) in enumerate(keypoints):
                if conf > config.KEYPOINT_CONFIDENCE_THRESHOLD:
                    valid_keypoints.append((i, x, y, conf))
        except Exception as e:
            print(f"Error processing keypoints: {e}")
            print(f"Keypoints data: {keypoints}")
            return []
            
        return valid_keypoints
    
    def determine_pose_type(self, keypoints):
        """Determine if pose is full body, partial body, or insufficient"""
        # Handle empty keypoints
        if keypoints is None or len(keypoints) == 0:
            print("Warning: Empty keypoints provided, using partial_body_hips as fallback")
            return 'partial_body_hips'
            
        valid_kp = self.get_valid_keypoints(keypoints)
        valid_indices = [kp[0] for kp in valid_kp]
        
        # Check for specific keypoints
        has_ankles = any(idx in ANKLE_KEYPOINTS for idx in valid_indices)
        has_knees = any(idx in KNEE_KEYPOINTS for idx in valid_indices)
        has_hips = any(idx in HIP_KEYPOINTS for idx in valid_indices)
        
        # Full body: has ankles
        if has_ankles:
            return 'full_body'
        # Partial body: has knees but no ankles
        elif has_knees:
            return 'partial_body_knees'
        # Partial body: has hips but no knees or ankles
        elif has_hips:
            return 'partial_body_hips'
        # Insufficient - but still return partial body as fallback
        else:
            print("Warning: Insufficient keypoints, using partial_body_hips as fallback")
            return 'partial_body_hips'
    
    def add_padding_to_bbox(self, bbox, img_shape, padding_ratio=config.CROP_PADDING_RATIO):
        """Add padding around bounding box"""
        x1, y1, x2, y2 = bbox
        h, w = img_shape[:2]
        
        # Calculate padding
        bbox_w = x2 - x1
        bbox_h = y2 - y1
        pad_x = int(bbox_w * padding_ratio)
        pad_y = int(bbox_h * padding_ratio)
        
        # Apply padding while staying within image bounds
        new_x1 = max(0, x1 - pad_x)
        new_y1 = max(0, y1 - pad_y)
        new_x2 = min(w, x2 + pad_x)
        new_y2 = min(h, y2 + pad_y)
        
        return (new_x1, new_y1, new_x2, new_y2)
    
    def extract_person_features(self, frame, bbox, keypoints):
        """Extract features to represent a person's appearance"""
        # Extract crop
        padded_bbox = self.add_padding_to_bbox(bbox, frame.shape)
        x1, y1, x2, y2 = padded_bbox
        crop = frame[y1:y2, x1:x2]
        
        if crop.size == 0:
            return None
            
        # Resize for consistent feature extraction
        resized = cv2.resize(crop, (64, 128))
        
        # Simple color histogram features
        features = []
        
        # Extract color histograms (simple but effective)
        for channel in range(3):  # BGR channels
            hist = cv2.calcHist([resized], [channel], None, [32], [0, 256])
            hist = cv2.normalize(hist, hist).flatten()
            features.extend(hist)
            
        # Add keypoint-based features if available
        valid_keypoints = self.get_valid_keypoints(keypoints)
        if len(valid_keypoints) >= 5:  # Need at least 5 keypoints
            # Normalize keypoint positions relative to bounding box
            width = x2 - x1
            height = y2 - y1
            for _, x, y, conf in valid_keypoints:
                # Add normalized positions
                norm_x = (x - x1) / width if width > 0 else 0
                norm_y = (y - y1) / height if height > 0 else 0
                features.extend([norm_x, norm_y, conf])
                
        return np.array(features)
    
    def calculate_feature_similarity(self, features1, features2):
        """Calculate similarity between two feature vectors"""
        if features1 is None or features2 is None:
            return 0.0
            
        # Make sure features are the same length
        min_length = min(len(features1), len(features2))
        features1 = features1[:min_length]
        features2 = features2[:min_length]
        
        # Cosine similarity
        dot_product = np.dot(features1, features2)
        norm1 = np.linalg.norm(features1)
        norm2 = np.linalg.norm(features2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return dot_product / (norm1 * norm2)
    
    def process_person(self, frame, person_id, bbox, keypoints, frame_count):
        """Process a person for cropping - save first and last seen images"""
        # Check if person is in cropping area
        if not self.is_in_cropping_area(bbox, keypoints):
            print(f"Person {person_id} is not in any cropping area - skipping processing")
            return False

        # Determine pose type
        pose_type = self.determine_pose_type(keypoints)

        # STRICT POSE REQUIREMENTS: Apply stricter pose validation if enabled
        if config.REQUIRE_GOOD_POSE_FOR_CROPPING:
            # Only allow full_body or partial_body_knees, not partial_body_hips
            if pose_type == 'insufficient' or pose_type == 'partial_body_hips':
                print(f"Person {person_id} has insufficient pose quality ({pose_type}) for strict cropping - skipping")
                return False
        else:
            # Original fallback behavior for backward compatibility
            if pose_type == 'insufficient':
                # Use partial_body_hips as fallback, which has lower keypoint requirements
                print(f"Person {person_id} has insufficient pose - using partial_body_hips fallback")
                pose_type = 'partial_body_hips'

        # Extract features for this person
        current_features = self.extract_person_features(frame, bbox, keypoints)
        
        # Update first seen frame if this is the first time seeing this person
        if person_id not in self.person_first_seen:
            self.person_first_seen[person_id] = frame_count
            self.person_first_saved[person_id] = False
            self.person_first_features[person_id] = current_features
            
            # Store a copy of the first frame and data
            self.person_first_images[person_id] = {
                'frame': frame.copy(),
                'bbox': bbox,
                'keypoints': keypoints.copy() if keypoints is not None else None,
                'frame_count': frame_count,
                'pose_type': pose_type
            }
        
        # Update last seen frame ONLY if identity matches the first features
        can_update_last = False
        if person_id in self.person_first_features:
            similarity = self.calculate_feature_similarity(
                self.person_first_features[person_id],
                current_features
            )
            if similarity >= self.identity_threshold:
                can_update_last = True
            else:
                print(f"Identity mismatch for person {person_id} during tracking (sim: {similarity:.2f} < {self.identity_threshold:.2f}) - not updating last state")

        if can_update_last or person_id not in self.person_last_seen:
            self.person_last_seen[person_id] = frame_count
            self.person_last_frame[person_id] = frame.copy()
            self.person_last_bbox[person_id] = bbox
            self.person_last_keypoints[person_id] = keypoints
        
        # Save first image if not already saved
        if not self.person_first_saved[person_id]:
            self.save_crop(frame, person_id, bbox, pose_type, frame_count, "first")
            self.person_first_saved[person_id] = True

        return True
    
    def save_crop(self, frame, person_id, bbox, pose_type, frame_count, image_type):
        """Save a crop with specified type (first or last)"""
        try:
            if frame is None:
                print(f"Error: Cannot save crop for person {person_id} - frame is None")
                return
                
            if bbox is None:
                print(f"Error: Cannot save crop for person {person_id} - bbox is None")
                return
                
            # Add padding to bbox
            padded_bbox = self.add_padding_to_bbox(bbox, frame.shape)
            x1, y1, x2, y2 = padded_bbox
            
            # Ensure valid bbox coordinates
            if x1 >= x2 or y1 >= y2 or x1 < 0 or y1 < 0 or x2 > frame.shape[1] or y2 > frame.shape[0]:
                print(f"Error: Invalid bbox for person {person_id}: {padded_bbox}, original: {bbox}, frame shape: {frame.shape}")
                # Try to correct the coordinates
                x1 = max(0, min(x1, frame.shape[1]-1))
                y1 = max(0, min(y1, frame.shape[0]-1))
                x2 = max(x1+1, min(x2, frame.shape[1]))
                y2 = max(y1+1, min(y2, frame.shape[0]))

            # Crop the image
            cropped_img = frame[y1:y2, x1:x2]

            if cropped_img.size == 0:
                print(f"Error: Empty crop for person {person_id} with bbox {padded_bbox}")
                return

            # Create person directory
            person_folder = config.create_person_folder(self.video_path, person_id)

            # Add quality score (placeholder - always reasonable value)
            quality_score = 0.8
            
            # Save the crop
            timestamp = int(time.time() * 1000)  # milliseconds
            filename = f"{pose_type}_{image_type}_frame_{frame_count}_q{quality_score:.2f}_{timestamp}.jpg"
            filepath = os.path.join(person_folder, filename)

            # Save the cropped image
            success = cv2.imwrite(filepath, cropped_img)
            if success:
                print(f"Saved {image_type} crop for person {person_id}: {filename} (pose: {pose_type})")
            else:
                print(f"Failed to save crop for person {person_id}")
                
        except Exception as e:
            print(f"Error saving crop for person {person_id}: {e}")
            import traceback
            traceback.print_exc()
    
    def save_last_seen_images(self):
        """Save the last seen images for all tracked people"""
        for person_id, frame_count in self.person_last_seen.items():
            if person_id in self.person_last_frame and person_id in self.person_first_features:
                frame = self.person_last_frame[person_id]
                bbox = self.person_last_bbox[person_id]
                keypoints = self.person_last_keypoints[person_id]
                
                # Don't skip insufficient poses - use a fallback type instead
                pose_type = self.determine_pose_type(keypoints)
                if pose_type == 'insufficient':
                    # Use partial_body_hips as fallback
                    pose_type = 'partial_body_hips'
                    
                # Extract features from last frame
                last_features = self.extract_person_features(frame, bbox, keypoints)
                
                # Compare with first frame features
                similarity = self.calculate_feature_similarity(
                    self.person_first_features[person_id], 
                    last_features
                )
                
                # Always save something for every tracked ID
                # If similarity is high enough, save the last frame
                if similarity >= self.identity_threshold:
                    self.save_crop(frame, person_id, bbox, pose_type, frame_count, "last")
                    print(f"Identity verified for person {person_id} (similarity: {similarity:.2f})")
                else:
                    # If similarity is too low, use the first frame data instead
                    print(f"Identity mismatch for person {person_id} (similarity: {similarity:.2f})")
                    print(f"Using first frame data instead for consistency")
                    
                    # Get the first frame data
                    first_data = self.person_first_images[person_id]
                    
                    # Use fallback pose type if needed
                    if first_data['pose_type'] == 'insufficient':
                        first_data['pose_type'] = 'partial_body_hips'
                        
                    # Save the first frame as both first and last
                    self.save_crop(
                        first_data['frame'], 
                        person_id, 
                        first_data['bbox'], 
                        first_data['pose_type'], 
                        first_data['frame_count'], 
                        "last"  # Save as "last" even though it's the first frame
                    )
        
        # Clear data
        self.person_last_frame.clear()
        self.person_last_bbox.clear()
        self.person_last_keypoints.clear()
        print(f"Saved last crops for {len(self.person_last_seen)} tracked people")

# Create a global cropper instance
simple_cropper = None

def initialize_cropper(video_path):
    """Initialize the cropper with the video path"""
    global simple_cropper
    simple_cropper = SimpleCropper(video_path)
    return simple_cropper