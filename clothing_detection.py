import os
import json
import base64
import requests
from pathlib import Path
import time
from difflib import SequenceMatcher
from collections import deque
import hashlib
import random

class ClothingDetector:
    def __init__(self, api_key):
        """
        Initialize the clothing detector with Gemini API
        
        Args:
            api_key: Gemini API key
        """
        self.api_key = api_key
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
        self.clothing_types = [
            "long sleeve top",
            "short sleeve top", 
            "shorts",
            "shorts skirt",
            "long skirt",
            "sleeveless",
            "trousers"
        ]
        # Throttling and quota handling
        self.max_requests_per_minute = 15
        self.request_timestamps = deque()
        self.daily_quota_exceeded = False
        # Simple persistent cache to avoid re-calling API for same image
        self.cache_path = Path("processed_data") / "clothing_cache.json"
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache = {}
        try:
            if self.cache_path.exists():
                with open(self.cache_path, 'r', encoding='utf-8') as f:
                    self.cache = json.load(f)
        except Exception:
            self.cache = {}
        
    def encode_image_to_base64(self, image_path):
        """
        Encode image to base64 for API request
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Base64 encoded image string
        """
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    def create_prompt(self):
        """
        Create the prompt for clothing detection
        
        Returns:
            Formatted prompt string
        """
        clothing_types_str = ", ".join(self.clothing_types)
        
        prompt = f"""
        Analyze this person's clothing and provide the following information in JSON format:
        
        1. Top clothing type (choose from: {clothing_types_str})
        2. Bottom clothing type (choose from: {clothing_types_str})
        3. A short description of how the person looks (include colors, style, etc.)
        
        If you cannot determine a clothing type, use "unknown" for that field.
        
        Return ONLY a valid JSON object with these exact keys:
        {{
            "top_clothing": "clothing_type",
            "bottom_clothing": "clothing_type", 
            "description": "short description of person's appearance"
        }}
        
        Do not include any other text, just the JSON object.
        """
        return prompt
    
    def detect_clothing(self, image_path):
        """
        Detect clothing in an image using Gemini API
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with clothing detection results
        """
        try:
            if self.daily_quota_exceeded:
                return {
                    "top_clothing": "unknown",
                    "bottom_clothing": "unknown",
                    "description": "Skipped due to daily quota exceeded"
                }

            # Cache lookup
            image_hash = self._compute_image_hash(image_path)
            if image_hash in self.cache:
                return self.cache[image_hash]

            # Encode image
            base64_image = self.encode_image_to_base64(image_path)
            
            # Prepare request payload
            payload = {
                "contents": [{
                    "parts": [
                        {"text": self.create_prompt()},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }]
            }
            
            # Make API request
            headers = {
                "Content-Type": "application/json"
            }
            
            # Perform request with throttling and retries
            result_json = self._post_with_retries(headers, payload)
            if result_json is None:
                return {
                    "top_clothing": "unknown",
                    "bottom_clothing": "unknown",
                    "description": "API request failed after retries"
                }
            
            if isinstance(result_json, dict) and 'candidates' in result_json:
                result = result_json
                if 'candidates' in result and len(result['candidates']) > 0:
                    content = result['candidates'][0]['content']
                    if 'parts' in content and len(content['parts']) > 0:
                        text_response = content['parts'][0]['text']
                        
                        # Try to parse JSON response
                        try:
                            # Clean the response text to extract JSON
                            text_response = text_response.strip()
                            if text_response.startswith('```json'):
                                text_response = text_response[7:]
                            if text_response.endswith('```'):
                                text_response = text_response[:-3]
                            
                            clothing_data = json.loads(text_response.strip())
                            # Save to cache
                            self.cache[image_hash] = clothing_data
                            self._persist_cache()
                            return clothing_data
                        except json.JSONDecodeError as e:
                            print(f"Failed to parse JSON response: {e}")
                            print(f"Response text: {text_response}")
                            return {
                                "top_clothing": "unknown",
                                "bottom_clothing": "unknown",
                                "description": "Failed to parse API response"
                            }
                else:
                    print("No candidates in API response")
                    return {
                        "top_clothing": "unknown",
                        "bottom_clothing": "unknown", 
                        "description": "No API response candidates"
                    }
                
        except Exception as e:
            print(f"Error in clothing detection: {e}")
            return {
                "top_clothing": "unknown",
                "bottom_clothing": "unknown",
                "description": f"Error: {str(e)}"
            }

    def _compute_image_hash(self, image_path: str) -> str:
        hasher = hashlib.sha1()
        with open(image_path, 'rb') as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                hasher.update(chunk)
        return hasher.hexdigest()

    def _persist_cache(self) -> None:
        try:
            with open(self.cache_path, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def _throttle_before_request(self) -> None:
        now = time.time()
        # Remove timestamps older than 60 seconds
        while self.request_timestamps and now - self.request_timestamps[0] > 60:
            self.request_timestamps.popleft()
        if len(self.request_timestamps) >= self.max_requests_per_minute:
            sleep_for = 60 - (now - self.request_timestamps[0])
            if sleep_for > 0:
                sleep_for += random.uniform(0, 0.5)
                print(f"Throttling: sleeping {sleep_for:.1f}s to respect RPM limit...")
                time.sleep(sleep_for)

    def _post_with_retries(self, headers, payload, max_retries: int = 5):
        retry = 0
        while retry <= max_retries:
            self._throttle_before_request()
            response = requests.post(
                f"{self.api_url}?key={self.api_key}",
                headers=headers,
                json=payload
            )
            self.request_timestamps.append(time.time())

            if response.status_code == 200:
                return response.json()
            if response.status_code == 429:
                try:
                    data = response.json()
                except Exception:
                    data = {}
                # Detect daily quota exceeded
                if isinstance(data, dict):
                    details = data.get('error', {}).get('details', [])
                    for d in details:
                        if d.get('@type', '').endswith('QuotaFailure'):
                            for v in d.get('violations', []):
                                quota_id = v.get('quotaId', '')
                                if 'GenerateRequestsPerDay' in quota_id:
                                    print("Daily quota exceeded. Halting further API calls.")
                                    self.daily_quota_exceeded = True
                                    return None
                    # Respect server-provided retry info
                    retry_delay = None
                    for d in details:
                        if d.get('@type', '').endswith('RetryInfo'):
                            retry_delay_str = d.get('retryDelay')
                            if isinstance(retry_delay_str, str) and retry_delay_str.endswith('s'):
                                try:
                                    retry_delay = float(retry_delay_str[:-1])
                                except Exception:
                                    retry_delay = None
                    if retry_delay is None:
                        # Check Retry-After header
                        ra = response.headers.get('Retry-After')
                        if ra:
                            try:
                                retry_delay = float(ra)
                            except Exception:
                                retry_delay = None
                    if retry_delay is None:
                        retry_delay = min(60, 2 ** retry)  # exponential backoff capped at 60s
                    jitter = random.uniform(0, 0.5)
                    wait_s = retry_delay + jitter
                    print(f"429 received. Backing off {wait_s:.1f}s (retry {retry+1}/{max_retries})...")
                    time.sleep(wait_s)
                    retry += 1
                    continue
            # Other errors
            print(f"API request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
        return None
    
    def calculate_clothing_similarity(self, first_frame_data, last_frame_data):
        """
        Calculate similarity between first frame and last frame clothing.

        Returns a percentage between 0 and 100.
        """
        first_top = first_frame_data.get('top_clothing', 'unknown')
        first_bottom = first_frame_data.get('bottom_clothing', 'unknown')
        first_desc = first_frame_data.get('description', '')

        last_top = last_frame_data.get('top_clothing', 'unknown')
        last_bottom = last_frame_data.get('bottom_clothing', 'unknown')
        last_desc = last_frame_data.get('description', '')

        top_similarity = 1.0 if first_top == last_top else 0.0
        bottom_similarity = 1.0 if first_bottom == last_bottom else 0.0
        desc_similarity = SequenceMatcher(None, first_desc.lower(), last_desc.lower()).ratio()

        total_similarity = (top_similarity * 0.3 + bottom_similarity * 0.3 + desc_similarity * 0.4) * 100
        return total_similarity

    def _determine_violation(self, top_clothing: str, bottom_clothing: str):
        """
        Determine if the clothing constitutes a violation based on rules:
        - shorts (bottom)
        - shorts skirt (bottom)
        - sleeveless (top) — accepts variants like 'sleeveless', 'sleeveless top', 'sleeveless t'
        Returns: { 'violation': bool, 'categories': List[str] }
        """
        violation_terms = {
            'shorts': 'shorts',
            'shorts skirt': 'shorts skirt',
            'sleeveless': 'sleeveless',
            'sleeveless top': 'sleeveless',
            'sleeveless t': 'sleeveless'
        }
        categories = []
        t = (top_clothing or '').strip().lower()
        b = (bottom_clothing or '').strip().lower()

        # Top checks (sleeveless variants)
        for key, normalized in violation_terms.items():
            if key in ('sleeveless', 'sleeveless top', 'sleeveless t') and t == key:
                if normalized not in categories:
                    categories.append(normalized)
        # Bottom checks (shorts, shorts skirt)
        for key, normalized in violation_terms.items():
            if key in ('shorts', 'shorts skirt') and b == key:
                if normalized not in categories:
                    categories.append(normalized)

        return {
            'violation': len(categories) > 0,
            'categories': categories
        }
    
    def process_detection_images(self, detection_images_path, output_folder):
        """
        Process all detection images and create clothing detection JSON files.
        Only saves results if first frame and last frame clothing are similar (>= 60%).
        Saves JSON inside each person's folder under detection_images.

        Args:
            detection_images_path: Path to detection_images folder
            output_folder: Path kept for compatibility (not used for saving)
        """
        os.makedirs(output_folder, exist_ok=True)

        detection_path = Path(detection_images_path)

        total_processed = 0
        total_saved = 0
        total_rejected = 0

        # Look for video folders (like test_video_1)
        for video_folder in detection_path.iterdir():
            if video_folder.is_dir():
                # Look for category folders (like student)
                for category_folder in video_folder.iterdir():
                    if category_folder.is_dir():
                        # Look for person folders (like person_id3)
                        for person_folder in category_folder.iterdir():
                            if person_folder.is_dir() and person_folder.name.startswith('person_id'):
                                person_id = person_folder.name
                                total_processed += 1
                                print(f"Processing {person_id}...")

                                # Find first and last frame images
                                first_frame_image = None
                                last_frame_image = None
                                for image_file in person_folder.iterdir():
                                    if image_file.is_file() and image_file.suffix == '.jpg':
                                        if 'first_frame' in image_file.name:
                                            first_frame_image = image_file
                                        elif 'last_frame' in image_file.name:
                                            last_frame_image = image_file

                                # Skip if we already saved a JSON (idempotent runs)
                                existing_json = person_folder / f"{person_id}_clothing.json"
                                if existing_json.exists():
                                    print(f"  Skipping {person_id}: result already exists at {existing_json}")
                                    total_saved += 1
                                    continue

                                if first_frame_image and last_frame_image:
                                    print(f"  Found first frame: {first_frame_image.name}")
                                    print(f"  Found last frame: {last_frame_image.name}")

                                    # Detect clothing for both frames
                                    print("  Analyzing first frame...")
                                    first_frame_data = self.detect_clothing(str(first_frame_image))
                                    time.sleep(1)
                                    print("  Analyzing last frame...")
                                    last_frame_data = self.detect_clothing(str(last_frame_image))
                                    time.sleep(1)

                                    similarity = self.calculate_clothing_similarity(first_frame_data, last_frame_data)
                                    print(f"  Clothing similarity: {similarity:.1f}%")

                                    if similarity >= 60:
                                        print(f"  ✓ Similarity threshold met ({similarity:.1f}% >= 60%)")
                                        clothing_data = first_frame_data.copy()
                                        clothing_data["person_id"] = person_id
                                        clothing_data["similarity_score"] = similarity
                                        clothing_data["last_frame_top"] = last_frame_data.get('top_clothing', 'unknown')
                                        clothing_data["last_frame_bottom"] = last_frame_data.get('bottom_clothing', 'unknown')

                                        # Violation categorization based on first-frame clothing
                                        v = self._determine_violation(
                                            clothing_data.get('top_clothing', ''),
                                            clothing_data.get('bottom_clothing', '')
                                        )
                                        clothing_data['violation'] = v['violation']
                                        clothing_data['violation_categories'] = v['categories']

                                        # Save to the person's folder
                                        output_file = os.path.join(str(person_folder), f"{person_id}_clothing.json")
                                        with open(output_file, 'w', encoding='utf-8') as f:
                                            json.dump(clothing_data, f, indent=2, ensure_ascii=False)
                                        print(f"  ✓ Saved clothing data to: {output_file}")
                                        print(f"  Top: {clothing_data.get('top_clothing', 'unknown')}")
                                        print(f"  Bottom: {clothing_data.get('bottom_clothing', 'unknown')}")
                                        total_saved += 1
                                    else:
                                        print(f"  ✗ Similarity too low ({similarity:.1f}% < 60%) - Skipping save")
                                        print(f"    First frame: {first_frame_data.get('top_clothing', 'unknown')} + {first_frame_data.get('bottom_clothing', 'unknown')}")
                                        print(f"    Last frame: {last_frame_data.get('top_clothing', 'unknown')} + {last_frame_data.get('bottom_clothing', 'unknown')}")
                                        total_rejected += 1
                                else:
                                    print(f"  ✗ Missing first or last frame image for {person_id}")
                                    if not first_frame_image:
                                        print("    Missing first frame image")
                                    if not last_frame_image:
                                        print("    Missing last frame image")
                                    total_rejected += 1
                            else:
                                print(f"Skipping non-person folder: {person_folder.name}")

        print("\n" + "=" * 60)
        print("PROCESSING SUMMARY")
        print("=" * 60)
        print(f"Total people processed: {total_processed}")
        print(f"Results saved: {total_saved}")
        print(f"Results rejected: {total_rejected}")
        print(f"Success rate: {(total_saved/total_processed*100):.1f}%" if total_processed > 0 else "Success rate: 0%")

def main():
    """
    Main function to run clothing detection
    """
    # Gemini API key
    api_key = "AIzaSyC3ra5uVmLqBcaWsmc-huISLY8Q34cQ--k"
    
    # Initialize clothing detector
    detector = ClothingDetector(api_key)
    
    # Paths
    detection_images_path = "detection_images"
    output_folder = "clothing_detection_results"
    
    print("Starting clothing detection with similarity validation...")
    print(f"Processing images from: {detection_images_path}")
    print(f"Output folder: {output_folder}")
    print("Similarity threshold: 60%")
    print("-" * 50)
    
    # Process all detection images
    detector.process_detection_images(detection_images_path, output_folder)
    
    print("-" * 50)
    print("Clothing detection completed!")

if __name__ == "__main__":
    main()