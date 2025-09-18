#!/usr/bin/env python3
"""
Test script for the threaded processing integration.
This can be used to test the threaded processing independently.
"""

import os
import sys
import time
from pathlib import Path

# Add current directory to path
sys.path.append('.')

from threaded_processing import run_threaded_processing

def test_threaded_processing():
    """Test the threaded processing with callbacks"""
    
    # Test video path
    video_path = 'cctv videos/IPdome_5G_LAB_5G_LAB_20250626140444_20250626150248_791139962.mp4'
    
    # Check if video exists
    if not os.path.exists(video_path):
        print(f"Error: Test video not found at {video_path}")
        print("Please make sure you have a test video available.")
        return
    
    # API key for clothing detection
    api_key = "AIzaSyC3ra5uVmLqBcaWsmc-huISLY8Q34cQ--k"
    
    # Test with stop callback that stops after 100 frames
    stop_after_frames = 100
    frame_count = 0
    
    def stop_callback():
        """Test stop callback - stops after specified frames"""
        return frame_count >= stop_after_frames
    
    def progress_callback(current_frame, total_frames):
        """Test progress callback"""
        global frame_count
        frame_count = current_frame
        
        if current_frame % 50 == 0:  # Print every 50 frames
            progress = (current_frame / total_frames * 100) if total_frames > 0 else 0
            print(f"Progress: Frame {current_frame}/{total_frames} ({progress:.1f}%)")
    
    print("Starting threaded processing test...")
    print(f"Will automatically stop after {stop_after_frames} frames")
    print("-" * 50)
    
    try:
        # Run threaded processing with callbacks
        stats = run_threaded_processing(
            video_path=video_path,
            api_key=api_key,
            device=None,
            stop_callback=stop_callback,
            progress_callback=progress_callback
        )
        
        print("\n" + "=" * 50)
        print("TEST RESULTS")
        print("=" * 50)
        print(f"Processed frames: {stats['processed_frames']}")
        print(f"Time taken: {stats['time_seconds']:.2f} seconds")
        print(f"Stopped early: {'Yes' if frame_count >= stop_after_frames else 'No'}")
        print("=" * 50)
        
        # Check if JSON files were created
        video_name = Path(video_path).stem
        detection_path = Path("detection_images") / video_name / "student"
        
        if detection_path.exists():
            json_files = list(detection_path.glob("**/*_clothing.json"))
            print(f"JSON files created: {len(json_files)}")
            for json_file in json_files:
                print(f"  - {json_file}")
        else:
            print("No detection results found")
        
        print("\nTest completed successfully!")
        
    except KeyboardInterrupt:
        print("\nTest interrupted by user (Ctrl+C)")
        print("This demonstrates the graceful shutdown capability.")
    except Exception as e:
        print(f"\nTest failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_threaded_processing()
