"""
Video timing utilities for extracting timestamps from filenames and calculating accurate frame timestamps.
"""

import os
import re
import cv2
import json
from datetime import datetime
from pathlib import Path
import glob

def extract_timestamps_from_filename(video_filename):
    """
    Extract start and end timestamps from a video filename.
    
    Expected format: XXXXXX_YYYYMMDDHHMMSS_YYYYMMDDHHMMSS_XXXXXXXX.mp4
    
    Args:
        video_filename: Path or filename of the video
        
    Returns:
        tuple: (start_datetime, end_datetime) as datetime objects
    """
    # Extract just the filename if a full path is provided
    filename = os.path.basename(video_filename)
    
    # Use regex to extract timestamp parts
    # Looking for pattern like: IPdome_5G_LAB_5G_LAB_20250626140444_20250626150248_791139962.mp4
    pattern = r'.*?(\d{14})_(\d{14}).*?\.mp4$'
    match = re.search(pattern, filename)
    
    if not match:
        raise ValueError(f"Could not extract timestamps from filename: {filename}")
    
    start_str, end_str = match.groups()
    
    try:
        # Parse YYYYMMDDHHMMSS format to datetime objects
        start_time = datetime.strptime(start_str, '%Y%m%d%H%M%S')
        end_time = datetime.strptime(end_str, '%Y%m%d%H%M%S')
        return start_time, end_time
    except ValueError as e:
        raise ValueError(f"Invalid timestamp format in filename {filename}: {e}")

def calculate_video_fps(video_path):
    """
    Calculate accurate FPS based on video frame count and extracted timestamps.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        tuple: (fps, total_frames, duration_seconds)
    """
    # Open video with OpenCV to get frame count
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
    
    # Get frame count and OpenCV's estimate of FPS
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    opencv_fps = cap.get(cv2.CAP_PROP_FPS)
    
    # Release video capture
    cap.release()
    
    # Extract timestamps from filename
    start_time, end_time = extract_timestamps_from_filename(video_path)
    
    # Calculate duration in seconds
    duration_seconds = (end_time - start_time).total_seconds()
    
    if duration_seconds <= 0:
        # Fallback to OpenCV's FPS if timestamp calculation fails
        print(f"Warning: Invalid duration from timestamps. Using OpenCV FPS: {opencv_fps}")
        return opencv_fps, total_frames, total_frames / opencv_fps
    
    # Calculate FPS based on frame count and duration
    calculated_fps = total_frames / duration_seconds
    
    return calculated_fps, total_frames, duration_seconds

def calculate_frame_timestamp(start_time, frame_index, fps):
    """
    Calculate timestamp for a specific frame based on video start time and FPS.
    
    Args:
        start_time: datetime object representing video start time
        frame_index: index of the frame (0-based)
        fps: frames per second
        
    Returns:
        datetime: timestamp for the specified frame
    """
    # Calculate seconds from start
    seconds_from_start = frame_index / fps
    
    # Add seconds to start time
    frame_timestamp = start_time.timestamp() + seconds_from_start
    
    return datetime.fromtimestamp(frame_timestamp)

def extract_frame_index(filename):
    """
    Extract frame index from image filename.
    
    Expected format: *_frame_XXX_*.jpg where XXX is the frame number
    
    Args:
        filename: Path or filename of the image
        
    Returns:
        int: frame index, or None if not found
    """
    # Extract just the filename if a full path is provided
    basename = os.path.basename(filename)
    
    # Use regex to extract frame index
    pattern = r'.*_frame_(\d+)_.*'
    match = re.search(pattern, basename)
    
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def update_json_with_timestamps(video_path):
    """
    Update all person JSON files in detection_images with accurate timestamps.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        int: Number of JSON files updated
    """
    # Calculate video timing information
    try:
        fps, total_frames, duration = calculate_video_fps(video_path)
        start_time, end_time = extract_timestamps_from_filename(video_path)
        print(f"Video timing: FPS={fps:.2f}, Frames={total_frames}, Duration={duration:.2f}s")
        print(f"Video start time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Video end time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    except Exception as e:
        print(f"Error calculating video timing: {e}")
        return 0
    
    # Get video filename without extension
    video_name = Path(video_path).stem
    
    # Find all JSON files in the detection_images folder for this video
    json_pattern = os.path.join("detection_images", video_name, "**", "*_clothing.json")
    json_files = glob.glob(json_pattern, recursive=True)
    
    updated_count = 0
    
    for json_file in json_files:
        # Get person folder path
        person_folder = os.path.dirname(json_file)
        
        # Load existing JSON
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                person_data = json.load(f)
        except Exception as e:
            print(f"Error loading JSON file {json_file}: {e}")
            continue
        
        # Find first and last frame images
        first_frame_file = None
        last_frame_file = None
        
        image_files = [f for f in os.listdir(person_folder) if f.endswith('.jpg')]
        for img_file in image_files:
            if 'first_frame' in img_file:
                first_frame_file = os.path.join(person_folder, img_file)
            elif 'last_frame' in img_file:
                last_frame_file = os.path.join(person_folder, img_file)
        
        if not first_frame_file or not last_frame_file:
            print(f"Missing frame files for {json_file}")
            continue
            
        # Extract frame indices
        first_frame_index = extract_frame_index(first_frame_file)
        last_frame_index = extract_frame_index(last_frame_file)
        
        if first_frame_index is None or last_frame_index is None:
            print(f"Could not extract frame indices for {json_file}")
            continue
            
        # Calculate timestamps
        first_frame_timestamp = calculate_frame_timestamp(start_time, first_frame_index, fps)
        last_frame_timestamp = calculate_frame_timestamp(start_time, last_frame_index, fps)
        
        # Update JSON with timestamps
        person_data['first_seen_time'] = first_frame_timestamp.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        person_data['last_seen_time'] = last_frame_timestamp.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        person_data['first_frame_index'] = first_frame_index
        person_data['last_frame_index'] = last_frame_index
        person_data['video_fps'] = round(fps, 2)
        person_data['duration_in_video'] = round((last_frame_index - first_frame_index) / fps, 2)
        
        # Save updated JSON
        try:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(person_data, f, indent=2, ensure_ascii=False)
            updated_count += 1
            print(f"Updated timestamps for {os.path.basename(json_file)}")
        except Exception as e:
            print(f"Error saving JSON file {json_file}: {e}")
    
    print(f"Updated {updated_count} JSON files with accurate timestamps")
    return updated_count

if __name__ == "__main__":
    # Example usage when run directly
    video_path = "cctv videos/IPdome_5G_LAB_5G_LAB_20250626140444_20250626150248_791139962.mp4"
    update_json_with_timestamps(video_path)
