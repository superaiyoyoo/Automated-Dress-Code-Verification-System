"""
Main entry point for the multithreaded clothing detection system.
"""

import os
import time
import argparse
import torch
import cv2
import config
from threaded_processing import run_threaded_processing

def main(args):
    """
    Run the multithreaded clothing detection system.
    """
    # Create output directories if they don't exist
    os.makedirs(config.OUTPUT_PATH, exist_ok=True)
    
    # Use CUDA if available
    device = torch.device('cuda' if torch.cuda.is_available() and not args.cpu_only else 'cpu')
    print(f"Using device: {device}")
    if torch.cuda.is_available() and not args.cpu_only:
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Load video
    video_path = args.video_path
    
    print(f"Starting multithreaded processing for video: {video_path}")
    print(f"Number of threads available: {os.cpu_count()}")
    print("-" * 50)
    
    # Validate video path
    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        return
    
    # Run the threaded processing pipeline
    start_time = time.time()
    stats = run_threaded_processing(video_path, args.api_key, device)
    total_time = time.time() - start_time
    
    # Print summary statistics
    print("\n" + "=" * 50)
    print("PROCESSING SUMMARY")
    print("=" * 50)
    print(f"Video: {video_path}")
    print(f"Total frames: {stats['processed_frames']}")
    print(f"Processing time: {total_time:.2f} seconds")
    if total_time > 0:
        print(f"Average processing rate: {stats['processed_frames'] / total_time:.2f} frames/second")
    print("=" * 50)
    print("Processing complete!")

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Multithreaded clothing detection system")
    parser.add_argument("--video_path", type=str, default='cctv videos/IPdome_5G_LAB_5G_LAB_20250626140444_20250626150248_791139962.mp4', 
                      help="Path to the video file")
    parser.add_argument("--api_key", type=str, default="AIzaSyC3ra5uVmLqBcaWsmc-huISLY8Q34cQ--k", 
                      help="Gemini API key for clothing detection")
    parser.add_argument("--cpu_only", action="store_true", 
                      help="Force CPU-only processing even if CUDA is available")
    
    args = parser.parse_args()
    
    try:
        main(args)
    except KeyboardInterrupt:
        print("\nDetected keyboard interrupt. Exiting gracefully...")
        # Release any OpenCV windows
        cv2.destroyAllWindows()
