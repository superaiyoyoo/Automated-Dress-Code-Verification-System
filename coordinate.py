import cv2
import numpy as np
import os
import importlib
import sys

def resize_image_for_display(image, max_width=1200, max_height=800):
    """
    Resize image for display while maintaining aspect ratio
    
    Args:
        image: Input image
        max_width: Maximum width for display
        max_height: Maximum height for display
        
    Returns:
        Resized image and scale factor
    """
    height, width = image.shape[:2]
    
    # Calculate scale factor to fit within max dimensions
    scale_x = max_width / width
    scale_y = max_height / height
    scale = min(scale_x, scale_y, 1.0)  # Don't upscale, only downscale
    
    if scale < 1.0:
        new_width = int(width * scale)
        new_height = int(height * scale)
        resized_image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
        return resized_image, scale
    
    return image, 1.0

def extract_frames_safely(video_path, output_folder="temp_frames", num_frames=1):
    """
    Extract frames from a video safely, working around potential codec issues
    
    Args:
        video_path: Path to the video file
        output_folder: Folder to save extracted frames
        num_frames: Number of frames to extract
        
    Returns:
        Path to the extracted frame or None if extraction failed
    """
    import subprocess
    import cv2
    
    os.makedirs(output_folder, exist_ok=True)
    
    # Skip FFmpeg and use OpenCV directly
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            # Try with DirectShow backend (Windows)
            cap = cv2.VideoCapture(video_path, cv2.CAP_DSHOW)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                frame_path = os.path.join(output_folder, "frame_opencv.jpg")
                cv2.imwrite(frame_path, frame)
                cap.release()
                return frame_path
    except Exception as e:
        print(f"OpenCV extraction failed: {e}")
    
    return None

# Global variables to store points for area creation
points = []
area_data = {
    'entry': {},
    'cropping': {}
}
drawing_mode = False 
current_area_type = 'entry'  # 'entry' or 'cropping'
display_scale = 1.0  # Scale factor for display resize

# This function is used to get the coordinates on the image
def captureEvent(event, x, y, flags, params):
    global points, img, original_img, drawing_mode, display_scale, current_area_type
    
    if event == cv2.EVENT_LBUTTONDOWN:
        # Convert display coordinates to original image coordinates
        orig_x = int(x / display_scale)
        orig_y = int(y / display_scale)
        print(f"({orig_x},{orig_y})")
        
        # Draw a small circle at the clicked point for visual reference (on display image)
        cv2.circle(img, (x, y), int(3 * display_scale), (0, 255, 255), -1)
        
        # Add point to current collection (using original coordinates)
        if drawing_mode:
            points.append((orig_x, orig_y))
            
            # If we have more than 1 point, draw a line from the previous point (on display image)
            if len(points) > 1:
                prev_display_x = int(points[-2][0] * display_scale)
                prev_display_y = int(points[-2][1] * display_scale)
                curr_display_x = int(points[-1][0] * display_scale)
                curr_display_y = int(points[-1][1] * display_scale)
                cv2.line(img, (prev_display_x, prev_display_y), (curr_display_x, curr_display_y), (0, 255, 255), max(1, int(2 * display_scale)))
            
            # If this is the first point, draw a small text to indicate it
            if len(points) == 1:
                cv2.putText(img, "Start", (x+int(5*display_scale), y+int(5*display_scale)), 
                           cv2.FONT_HERSHEY_SIMPLEX, max(0.3, 0.5*display_scale), (0, 255, 255), max(1, int(display_scale)))
        
        cv2.imshow("Define Zones", img)
    
    # Right-click to complete the polygon
    elif event == cv2.EVENT_RBUTTONDOWN and drawing_mode:
        if len(points) > 2:  # Need at least 3 points for a valid polygon
            # Convert original coordinates to display coordinates for drawing
            display_points = [(int(p[0] * display_scale), int(p[1] * display_scale)) for p in points]
            
            # Close the polygon by connecting the last point to the first (on display image)
            cv2.line(img, display_points[-1], display_points[0], (0, 255, 255), max(1, int(2 * display_scale)))
            
            # Generate a unique ID for the area
            area_count = len(area_data[current_area_type]) + 1
            area_id = f"{current_area_type}{area_count}"
            
            # Store the polygon for the current area type
            area_data[current_area_type][area_id] = {
                'name': area_id,
                'polygon': points.copy()  # Store original coordinates
            }
            
            # Draw the filled polygon with transparency (on display image)
            if current_area_type == 'entry':
                color = (0, 255, 0)  # Green for entry
                label = f"Entry Zone {area_count}"
            else:  # cropping
                color = (255, 0, 0)  # Blue for cropping
                label = f"Cropping Zone {area_count}"
                
            overlay = img.copy()
            cv2.fillPoly(overlay, [np.array(display_points)], color)
            cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
            cv2.polylines(img, [np.array(display_points)], True, color, max(1, int(2 * display_scale)))
            
            # Calculate centroid for text placement (using display coordinates)
            M = cv2.moments(np.array(display_points))
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
            else:
                cx, cy = display_points[0]
            
            cv2.putText(img, label, (cx, cy), 
                       cv2.FONT_HERSHEY_SIMPLEX, max(0.3, 0.7*display_scale), color, max(1, int(2*display_scale)))
            
            print(f"{current_area_type.capitalize()} zone {area_id} created with {len(points)} points")
            
            # Reset for next area
            drawing_mode = False
            print(f"{current_area_type.capitalize()} zone defined. Press 'e' for entry zone, 'o' for cropping zone, 's' to save, or 'q' to quit.")
            
            # Reset points for the next polygon
            points = []
            
            cv2.imshow("Define Zones", img)

def draw_polygon_from_points(img, points, color, label, scale=1.0):
    """Draw a polygon on the image from a list of points"""
    if len(points) < 3:
        return img
    
    # Convert original coordinates to display coordinates
    display_points = [(int(p[0] * scale), int(p[1] * scale)) for p in points]
    
    # Convert points to numpy array
    polygon_points = np.array(display_points, np.int32)
    polygon_points = polygon_points.reshape((-1, 1, 2))
    
    # Draw filled polygon with transparency
    overlay = img.copy()
    cv2.fillPoly(overlay, [polygon_points], color)
    cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
    cv2.polylines(img, [polygon_points], True, color, max(1, int(2 * scale)))
    
    # Calculate centroid for text placement
    M = cv2.moments(polygon_points)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
    else:
        cx, cy = display_points[0]
    
    cv2.putText(img, label, (cx, cy), 
               cv2.FONT_HERSHEY_SIMPLEX, max(0.3, 0.7*scale), color, max(1, int(2*scale)))
    
    return img

def draw_existing_areas(img, scale=1.0):
    """Draw existing areas from config.py on the image"""
    global area_data
    
    # Import config dynamically to get the latest version
    try:
        import config
        importlib.reload(config)
        
        # Clear area_data before loading from config
        area_data = {
            'entry': {},
            'cropping': {}
        }
        
        # Draw entry areas
        if hasattr(config, 'areas') and "entry" in config.areas:
            for area_id, area_info in config.areas["entry"].items():
                polygon = area_info["polygon"]
                name = area_info["name"]
                img = draw_polygon_from_points(img, polygon, (0, 255, 0), f"Entry: {name}", scale)
                # Add to our area data
                area_data["entry"][area_id] = {
                    'name': name,
                    'polygon': polygon
                }
        
        # Draw cropping areas
        if hasattr(config, 'areas') and "cropping" in config.areas:
            for area_id, area_info in config.areas["cropping"].items():
                polygon = area_info["polygon"]
                name = area_info["name"]
                img = draw_polygon_from_points(img, polygon, (255, 0, 0), f"Cropping: {name}", scale)
                # Add to our area data
                area_data["cropping"][area_id] = {
                    'name': name,
                    'polygon': polygon
                }
                
    except Exception as e:
        print(f"Warning: Could not draw existing areas: {e}")
    
    return img

def write_config_file():
    """Write the areas to a new config.py file"""
    # First, read the existing config file to preserve other settings
    try:
        with open("config.py", "r") as f:
            content = f.read()
        
        # Extract the header part (before areas definition)
        if "areas = {" in content:
            header_content = content.split("areas = {")[0].strip()
        else:
            header_content = content.strip()
            
        # Check if the content has real-time optimization parameters
        optimization_params = ""
        if "# REAL-TIME OPTIMIZATION PARAMETERS" in content:
            try:
                optimization_part = content.split("# =============================================================================\n# REAL-TIME OPTIMIZATION PARAMETERS")[1]
                optimization_params = "\n# =============================================================================\n# REAL-TIME OPTIMIZATION PARAMETERS" + optimization_part
            except:
                print("Warning: Could not extract optimization parameters")
                
        # Make sure the header ends with a newline
        if not header_content.endswith("\n"):
            header_content += "\n"
        if not header_content.endswith("\n\n"):
            header_content += "\n"
            
    except Exception as e:
        print(f"Warning: Could not read existing config file: {e}")
        header_content = '''"""Configuration settings for the pose tracking system."""

import os

# Paths
OUTPUT_PATH = "tracking_output"
os.makedirs(OUTPUT_PATH, exist_ok=True)

# Video output settings
VIDEO_SAVE_PATH = os.path.join(OUTPUT_PATH, "tracked_output.mp4")

# Model settings
POSE_MODEL_PATH = "yolov8s-pose.pt"  # Path to the pose model
CONF_THRESHOLD = 0.50  # Confidence threshold for detections
IOU_THRESHOLD = 0.50  # IoU threshold for NMS

# Visualization settings
SHOW_POSE_KEYPOINTS = True  # Set to True to show pose keypoints
SHOW_ENTRY_EXIT_ZONES = True  # Set to True to show entry/exit zones in the video output

# Colors for visualization
BBOX_COLOR = (255, 0, 255)  # Magenta for bounding boxes
SKELETON_COLOR = (0, 255, 0)  # Green for skeleton lines
KEYPOINT_COLOR = (0, 255, 255)  # Yellow for keypoints

'''
    
    # Now write the updated file
    with open("config.py", "w") as f:
        # Write header
        f.write(header_content)
        
        # Write the areas dictionary
        f.write("# Define areas as dictionaries for flexible configuration\n")
        f.write("areas = {\n")
        
        # Entry areas
        f.write("    # Entry areas\n")
        f.write("    \"entry\": {\n")
        if 'entry' in area_data and area_data['entry']:
            for i, (area_id, area_info) in enumerate(area_data['entry'].items()):
                f.write(f"        \"{area_id}\": {{\n")
                f.write(f"            \"name\": \"{area_info['name']}\",\n")
                f.write(f"            \"polygon\": {area_info['polygon']}\n")
                f.write("        }")
                if i < len(area_data['entry']) - 1:
                    f.write(",\n")
                else:
                    f.write("\n")
        f.write("    },\n")
        
        # Cropping areas
        f.write("    # Cropping areas\n")
        f.write("    \"cropping\": {\n")
        if 'cropping' in area_data and area_data['cropping']:
            for i, (area_id, area_info) in enumerate(area_data['cropping'].items()):
                f.write(f"        \"{area_id}\": {{\n")
                f.write(f"            \"name\": \"{area_info['name']}\",\n")
                f.write(f"            \"polygon\": {area_info['polygon']}\n")
                f.write("        }")
                if i < len(area_data['cropping']) - 1:
                    f.write(",\n")
                else:
                    f.write("\n")
        f.write("    }\n")
        
        f.write("}\n\n")
        
        # Write backward compatibility variables
        f.write("# For backwards compatibility - extract the single entry area\n")
        f.write("entry_area = areas[\"entry\"][\"entry1\"][\"polygon\"] if \"entry\" in areas and \"entry1\" in areas[\"entry\"] else []\n")
        f.write("\n# Legacy compatibility (deprecated)\n")
        f.write("area1 = entry_area  # Entry area\n")
        f.write("area2 = []  # No exit area\n")
        f.write("\n# Uppercase versions for current imports\n")
        f.write("AREA1 = area1\n")
        f.write("AREA2 = area2\n")
        
        # Add optimization parameters if they exist
        if optimization_params:
            f.write(optimization_params)

def save_zone_image(img, video_path):
    """Save the current image with drawn zones for frontend display"""
    try:
        # Create zone_images folder if it doesn't exist
        zone_images_folder = "zone_images"
        os.makedirs(zone_images_folder, exist_ok=True)
        
        # Generate filename based on video name
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        zone_image_filename = f"{video_name}_zones.jpg"
        zone_image_path = os.path.join(zone_images_folder, zone_image_filename)
        
        # Save the image with zones
        success = cv2.imwrite(zone_image_path, img)
        
        if success:
            print(f"Zone image saved successfully: {zone_image_path}")
            return zone_image_path
        else:
            print(f"Failed to save zone image: {zone_image_path}")
            return None
            
    except Exception as e:
        print(f"Error saving zone image: {e}")
        return None

def main():
    global img, original_img, points, drawing_mode, area_data, display_scale, current_area_type
    
    # Check if video path is provided
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
    else:
        video_path = "cctv videos/test_video_1.mp4"
        print(f"No video path provided, using default: {video_path}")
    
    # Extract a frame from the video for zone definition
    frame_path = extract_frames_safely(video_path)
    if not frame_path:
        print(f"Error: Could not extract frame from {video_path}")
        return
    
    # Load the extracted frame
    original_img = cv2.imread(frame_path)
    if original_img is None:
        print(f"Error: Could not load frame {frame_path}")
        return
    
    # Resize for display while maintaining aspect ratio
    img, display_scale = resize_image_for_display(original_img)
    print(f"Display scale: {display_scale:.2f} (Original: {original_img.shape[1]}x{original_img.shape[0]} -> Display: {img.shape[1]}x{img.shape[0]})")
    
    # Set up the window and mouse callback
    cv2.namedWindow("Define Zones")
    cv2.setMouseCallback("Define Zones", captureEvent)
    
    # Reset the image and draw existing areas
    img, _ = resize_image_for_display(original_img)
    img = draw_existing_areas(img, display_scale)
    
    # Instructions
    print("=== Zone Definition Tool ===")
    print("Press 'e' to define an entry zone")
    print("Press 'o' to define a cropping zone")
    print("Press 'c' to clear all zones")
    print("Press 'r' to reset to original image")
    print("Press 's' to save zones and exit")
    print("Press 'q' to quit without saving")
    print("Left-click to add points, right-click to complete the zone")
    
    # Main loop
    while True:
        cv2.imshow("Define Zones", img)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('e'):  # Entry zone
            if not drawing_mode:
                drawing_mode = True
                current_area_type = 'entry'
                points = []
                print(f"Define entry zone. Left-click to add points, right-click to complete.")
                
        elif key == ord('o'):  # Cropping zone
            if not drawing_mode:
                drawing_mode = True
                current_area_type = 'cropping'
                points = []
                print(f"Define cropping zone. Left-click to add points, right-click to complete.")
        
        elif key == ord('c'):  # Clear all zones
            img, _ = resize_image_for_display(original_img)
            area_data = {'entry': {}, 'cropping': {}}
            points = []
            drawing_mode = False
            print("All zones cleared.")
        
        elif key == ord('r'):  # Reset to original image but keep zones
            img, _ = resize_image_for_display(original_img)
            points = []
            drawing_mode = False
            
            # Redraw existing areas
            for area_type in area_data:
                for area_id, area_info in area_data[area_type].items():
                    polygon = area_info['polygon']
                    if len(polygon) < 3:
                        continue
                    
                    if area_type == 'entry':
                        color = (0, 255, 0)  # Green for entry
                        label = f"Entry: {area_info['name']}"
                    else:  # cropping
                        color = (255, 0, 0)  # Blue for cropping
                        label = f"Cropping: {area_info['name']}"
                    
                    img = draw_polygon_from_points(img, polygon, color, label, display_scale)
            
            print("Image reset, zones preserved.")
        
        elif key == ord('s'):  # Save and exit
            write_config_file()
            
            # Save the current image with drawn zones
            zone_image_path = save_zone_image(img, video_path)
            if zone_image_path:
                print(f"Zone image saved to: {zone_image_path}")
            
            print("All zones saved to config.py")
            break
        
        elif key == ord('q'):  # Quit without saving
            print("Exiting without saving.")
            break
    
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main() 