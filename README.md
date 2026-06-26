# Automated-Dress-Code-Verification-System
<img width="1082" height="501" alt="Dashboard" src="https://github.com/user-attachments/assets/de86af4f-7a2a-4bba-a6f6-330b952c0cfc" />

Figure 1 illustrates the system's main dashboard, which provides an overview of the
clothing detection process. It includes a Refresh button to update data and a + New
Processing button to upload and analyze new videos. There are also four cards displaying
key statistics, including Total Detections, Pending, Verified, and Rejected, which show
the count of detections in different statuses. Additionally, two charts below show the
Clothing Distribution, which highlights the types of detected clothing, and Detection
Trends, which tracks violations over time. The sidebar on the left also provides access to
other modules such as Video Management, Detection Settings, System Overview, and
Reporting

<img width="1072" height="476" alt="Distribution Charts and System Status Indicator" src="https://github.com/user-attachments/assets/ce3509f3-295a-413c-b27a-61a09c4accd5" />

Figure 2 displays various charts and system status indicators. It includes a bar chart
illustrating the distribution of various clothing combinations, a doughnut chart visualizing
the proportion of rule violations versus non-violations, and an overview of the system's
operational status. The “View All” button, which is located at the top-right corner of the
clothing combination distribution card, navigates the user to a detailed view of the
detection results, linking them to the reporting page for the specific clothing report
session. Additionally, it reports the current status of the system's Graphics Processing
Unit (GPU), indicates the readiness of the deployed Artificial Intelligence (AI) models,
shows the remaining available storage capacity, and confirms the connection status of the
Application Programming Interface (API).

<img width="1071" height="400" alt="Video Upload" src="https://github.com/user-attachments/assets/80b08b63-913e-4409-a13b-2013d378338b" />

Figure 3 displays the Video Management page, which provides an interface for users
to upload and manage their videos. It features a large drag-and-drop area for uploading
video files directly from the file explorer and includes an “Upload Settings” section
where users can pre-fill default information for their uploads. Besides, the top right “+
Upload Video” button opens a pop-up card, as in Figure 4.19, that guides users through a
more detailed upload process.

<img width="1073" height="491" alt="Pop-up Card" src="https://github.com/user-attachments/assets/5e166338-7f3e-4c87-a2d4-ef754b9cd66f" />

Figure 4 shows the pop-up card for uploading a new video. It allows the user to select
a video file from their computer and provides fields to enter detailed information such as
the video name, location, and description. The interface includes a “Cancel” button to close the window and cancel the upload, as well as an “Upload Video” button to confirm
and upload the file with the provided details.

<img width="1060" height="465" alt="Zone Display" src="https://github.com/user-attachments/assets/b2c08e71-8671-4aca-b8cb-9d1ab0092ee3" />

Figure 5 shows a screen for setting up special detection zones on a video feed. Two
colored areas are drawn over the video, including the green “Entry Zone” and the blue
“Cropping Zone”. The purpose of the green zone is to first detect and track people when
they enter the monitored space. After a person is detected, the blue zone is used to
perform a detailed analysis of their clothing. The boxes drawn around the students
indicate that the system is actively identifying people, while information panels on the
right side of the screen explain the function of each zone.

<img width="1032" height="447" alt="Video Status" src="https://github.com/user-attachments/assets/6364aea0-115c-4197-9da4-8d93bf5a320c" />

Figure 6 shows the “Video Library” section of the system. It lists several videos with
details such as their name, duration, upload time, location, and current status, such as
uploading, completed, processing, or pending. The status is indicated by color codes,
light blue means the video is still uploading, green indicates that the video has finished
processing and the results have been generated, orange means the video is currently being
processed, and grey indicates that the video has been uploaded but processing has not yet
started. For each video, there are also columns showing the number of detections and
violations found. On the right side of each video entry, there are action buttons to start,
pause, and resume processing, as well as to download the results and delete the video
along with its associated results.

<img width="1085" height="492" alt="Detection Settings" src="https://github.com/user-attachments/assets/1ba3c9ea-5278-4576-b121-ce26f6a216a8" />

Figure 7 shows the “Detection Settings” page, where users can adjust how the system
detects things. This page lets users set different confidence levels using sliders. These
include person detection confidence, keypoint confidence, and fast detection mode
confidence on the left side. On the right, there are “IoU Thresholds” such as
non-maximum suppression (NMS) IoU and person overlap threshold, which help refine
detection accuracy and handle overlapping detections. Users can also "Reset to Defaults"
or "Save Settings" for these configurations.

<img width="1077" height="437" alt="Tracking Settings" src="https://github.com/user-attachments/assets/503c0b74-5b88-489d-9db9-0ce3d1936743" />

Figure 8 shows the “Tracking Settings” page, which is used to control how the system
follows people and manages their unique identities in a video. The “Tracking Parameters”
section lets users define rules such as the minimum number of frames a person must be
tracked before their image is cropped for analysis and the number of frames to wait
before resuming a lost track or pausing it. The “ID Management” section provides
options for how tracking IDs are handled, allowing users to prevent the reuse of old IDs,
assign a new ID if a person's path overlaps with another, and set how long the system
waits before a missing person's track is retired.

<img width="1072" height="482" alt="Performance Optimization" src="https://github.com/user-attachments/assets/fa72d257-f55f-49af-b941-0b56480ae208" />

Figure 9 shows the “Performance Optimization” settings, which are used to make the
system run faster and more efficiently. Under the “Frame Processing” section, users can
configure the system to only process a certain number of frames, such as one every five
frames, to save processing power. It also allows setting a target for the maximum
processing speed (FPS) and how often the system should check for people within the
detection zones. The “Optimization Flags” section provides several on/off toggles for
additional speed improvements, such as enabling real-time optimizations, skipping
frames entirely when no people are present in key areas, and using a faster but less
detailed detection mode for initial checks.

<img width="1075" height="480" alt="Frame Processing Diagram" src="https://github.com/user-attachments/assets/0653fadb-0ab0-4b2c-9f21-5604b6266587" />

Figure 10 illustrates the frame processing diagram, showing how the system efficiently
analyzes video. Many frames shown in blue are skipped to save processing power. Every
fifth frame, marked in green, serves as a detection check interval to see if a person is
present. If no one is detected in the zones, the system skips cropping and clothing
classification. When someone appears, full processing starts immediately on the next
processed frame. The red frame, called the Target Max Frame, sets a speed limit to ensure
the system does not process more than a certain number of frames per second, such as
twenty, preventing the CPU or GPU from becoming overloaded. The Close button allows
the user to exit this diagram view.

<img width="1051" height="472" alt="Cropping and Quality Settings" src="https://github.com/user-attachments/assets/c883d2c1-1f28-40f7-970d-778e93747270" />

Figure 11 shows the “Cropping & Quality Settings” page, which is used to control how
the system saves images of detected people and sets the quality standards for them. The
“Pose Requirements” section allows users to define the minimum number of body
keypoints needed to register a full or partial body detection, and it includes options to
only crop images that have a high-quality pose. The “Image Quality” section lets users
set a minimum quality score for saved images, add extra padding around the person in the
crop, and enable options to save only the first and last seen images to conserve storage
space or to prioritize saving full-body images over partial ones.

<img width="1046" height="463" alt="AI Model Configuration" src="https://github.com/user-attachments/assets/54182232-9e56-4932-bd95-e3fde82c8996" />

Figure 12 shows the “System Overview” page, which provides information on the
system's status and the AI models it uses. The page indicates that the system is
operational and utilizes Google Gemini AI for its advanced clothing classification tasks.
Under the “AI Model Configuration” section, it specifies that Person Detection is handled
by the YOLOv8 Large model for high accuracy, while Pose Analysis uses the YOLOv8s
Pose model for real-time keypoint detection. The processing device is set to auto
detection, which means the system automatically optimizes its performance by choosing
to run on either the available GPU or CPU.

<img width="1067" height="471" alt="Clothing Recognition" src="https://github.com/user-attachments/assets/ead7d20d-b238-4b8f-a9d5-0cefbaef2289" />

Figure 13 shows the “Clothing Recognition” page, which defines the rules for the
AI-powered violation detection system. On the left side, under “Recognized Categories”,
it lists different clothing items for the upper and lower body. Items highlighted in green
represent non-violated clothing, while items highlighted in red represent violated
clothing. On the right side, the “Dress Code Violations” section provides more detailed
examples and descriptions of what is considered a violation, such as defining short skirts
as those above knee length.

<img width="1076" height="447" alt="System Capabilities" src="https://github.com/user-attachments/assets/d5abf611-176e-40c0-b56b-72a6ad635642" />

Figure 14 describes the main capabilities of the system. It highlights the system's ability
to perform video processing with minimal latency, ensuring quick analysis. A key feature
is multi-zone detection, which allows for configurable detection areas and entry points
tailored to specific environments. The system is built on AI-powered analysis, utilizing
advanced machine learning algorithms for accurate detection and classification. This
culminates in a clothing surveillance system that can operate automatically without the
need for direct manual enforcement.

<img width="1078" height="503" alt="Reporting Page" src="https://github.com/user-attachments/assets/96e7f3ca-6424-4164-ad85-6a3e245dddf3" />

Figure 15 shows the Analytics Dashboard, which offers a detailed overview of system
reports and visualizations. At the top, a filter section allows users to select a specific date
range, video source, review status, or violation type to generate a desired report; the
“Apply” button confirms the choices, while “Reset” returns to the default settings. The
“Export Report” button on the top right is used to export the customized student clothing
report in PDF format. Below the filters, summary cards display key metrics that change
based on the filters, including the count of total detections, violations found, pending
reviews, and the overall violation rate. The bottom of the dashboard contains
visualization charts for top clothing distribution, bottom clothing distribution, and review
status to allow users to easily understand the trends and data.

<img width="1072" height="466" alt="Student Clothing Report" src="https://github.com/user-attachments/assets/6bc7a958-f5a1-4503-9684-62f5531eb97f" />

Figure 16 shows the “Student Clothing Report” which presents detection results in a
detailed table. At the top, the Refresh button is used to update the report, while the CSV,
PDF, and JSON buttons allow users to download the report in these respective file
formats. The table lists each detection with a person ID, an image, a timestamp, classified
clothing, a description, and its current status. For each entry, there are three action
buttons: a blue button to view details, a green button to verify the detection result, and a
red button to reject it. Clicking on the blue button will pop up a details box.

<img width="1080" height="495" alt="Student Detection Details" src="https://github.com/user-attachments/assets/41868fdf-1d10-468f-a76f-f2ab9b7ffebd" />

Figure 17 shows the "Student Detection Details" pop-up, which is used to inspect a
specific detection event more closely. It displays a large, cropped image of the detected
person, highlighted with a bounding box for easy identification. Below the image, it
presents key information such as the person's unique ID, a similarity score, the classified
top and bottom clothing, and the precise timestamp of the event. At the bottom of the
pop-up, there are action buttons that allow the user to close the window, reject the
detection if it is incorrect, or verify the detection if it is accurate.

<img width="1072" height="487" alt="Report Generation" src="https://github.com/user-attachments/assets/73d5cb3e-edfe-40e8-890a-bc9ace77fc28" />

Figure 18 shows the reporting page, which is divided into two main sections for
generating reports. On the left, the “Quick Reports” section allows a user to instantly
generate predefined PDF reports, including a violations summary, a pending review list, a
detection visual report, and a chart visualization summary. On the right, the “Export
Options” section allows for more customized downloads. Here, the user can choose to
export data in CSV, PDF, or JSON format, and they can also select whether to include
evidence images in the export. The generated report will reflect the filter options that the
user has selected on the main dashboard.
