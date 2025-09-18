"""
Standalone script to update JSON files with accurate video timestamps.
"""

import os
import sys
import glob
from video_timing import update_json_with_timestamps

def main():
    """
    Update JSON files with accurate video timestamps.
    """
    # Check for video path argument
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
    else:
        # Look for videos in the default directory
        video_files = glob.glob("cctv videos/*.mp4")
        if not video_files:
            print("No video files found in 'cctv videos' directory.")
            print("Usage: python update_timestamps.py [video_path]")
            return
        video_path = video_files[0]
        print(f"Using default video: {video_path}")
    
    # Make sure the video file exists
    if not os.path.isfile(video_path):
        print(f"Error: Video file not found: {video_path}")
        print("Usage: python update_timestamps.py [video_path]")
        return
    
    # Update timestamps
    print(f"Updating timestamps for video: {video_path}")
    update_count = update_json_with_timestamps(video_path)
    
    if update_count > 0:
        print(f"\nSuccessfully updated {update_count} JSON files with accurate timestamps.")
    else:
        print("\nNo JSON files were updated. Check that the video name matches the detection_images folder structure.")
        
if __name__ == "__main__":
    main()
