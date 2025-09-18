import os
import json
from collections import Counter
from pathlib import Path

def load_clothing_data(folder_path):
    """
    Load all clothing detection JSON files from the folder
    
    Args:
        folder_path: Path to the folder containing JSON files
        
    Returns:
        List of dictionaries containing clothing data
    """
    clothing_data = []
    
    # Recursively find all *_clothing.json files in the folder structure
    for json_file in Path(folder_path).glob("**/*_clothing.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                clothing_data.append(data)
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return clothing_data

def analyze_clothing_data(clothing_data):
    """
    Analyze clothing data and generate statistics with quantities and percentages
    
    Args:
        clothing_data: List of clothing data dictionaries
        
    Returns:
        Dictionary with analysis results including quantities and percentages
    """
    if not clothing_data:
        return {}
    
    # Count clothing types
    top_clothing = Counter([item.get('top_clothing', 'unknown') for item in clothing_data])
    bottom_clothing = Counter([item.get('bottom_clothing', 'unknown') for item in clothing_data])
    
    # Count combinations
    combinations = Counter()
    for item in clothing_data:
        top = item.get('top_clothing', 'unknown')
        bottom = item.get('bottom_clothing', 'unknown')
        combinations[f"{top} + {bottom}"] += 1
    
    # Calculate statistics
    total_people = len(clothing_data)
    unknown_top = top_clothing.get('unknown', 0)
    unknown_bottom = bottom_clothing.get('unknown', 0)
    
    # Create top clothing distribution with quantities and percentages
    top_distribution = {}
    for clothing_type, count in top_clothing.items():
        percentage = (count / total_people) * 100 if total_people > 0 else 0
        top_distribution[clothing_type] = {
            "quantity": count,
            "percentage": round(percentage, 2)
        }
    
    # Create bottom clothing distribution with quantities and percentages
    bottom_distribution = {}
    for clothing_type, count in bottom_clothing.items():
        percentage = (count / total_people) * 100 if total_people > 0 else 0
        bottom_distribution[clothing_type] = {
            "quantity": count,
            "percentage": round(percentage, 2)
        }
    
    # Create combinations distribution with quantities and percentages
    combinations_distribution = {}
    for combo, count in combinations.most_common():
        percentage = (count / total_people) * 100 if total_people > 0 else 0
        combinations_distribution[combo] = {
            "quantity": count,
            "percentage": round(percentage, 2)
        }
    
    analysis = {
        'total_people': total_people,
        'top_clothing_distribution': top_distribution,
        'bottom_clothing_distribution': bottom_distribution,
        'most_common_combinations': combinations_distribution,
        'unknown_detections': {
            'unknown_top': unknown_top,
            'unknown_top_percentage': round((unknown_top / total_people) * 100, 2) if total_people > 0 else 0,
            'unknown_bottom': unknown_bottom,
            'unknown_bottom_percentage': round((unknown_bottom / total_people) * 100, 2) if total_people > 0 else 0
        }
    }
    
    return analysis

def print_analysis(analysis):
    """
    Print formatted analysis results
    
    Args:
        analysis: Analysis dictionary
    """
    print("=" * 60)
    print("CLOTHING DETECTION ANALYSIS")
    print("=" * 60)
    
    print(f"\nTotal People Analyzed: {analysis['total_people']}")
    
    print("\n" + "-" * 40)
    print("TOP CLOTHING DISTRIBUTION")
    print("-" * 40)
    for clothing_type, data in sorted(analysis['top_clothing_distribution'].items(), 
                                     key=lambda x: x[1]['quantity'], reverse=True):
        print(f"{clothing_type:20} : {data['quantity']:3} ({data['percentage']:5.1f}%)")
    
    print("\n" + "-" * 40)
    print("BOTTOM CLOTHING DISTRIBUTION")
    print("-" * 40)
    for clothing_type, data in sorted(analysis['bottom_clothing_distribution'].items(), 
                                     key=lambda x: x[1]['quantity'], reverse=True):
        print(f"{clothing_type:20} : {data['quantity']:3} ({data['percentage']:5.1f}%)")
    
    print("\n" + "-" * 40)
    print("MOST COMMON COMBINATIONS")
    print("-" * 40)
    for combination, data in sorted(analysis['most_common_combinations'].items(), 
                                   key=lambda x: x[1]['quantity'], reverse=True)[:5]:
        print(f"{combination:35} : {data['quantity']:3} ({data['percentage']:5.1f}%)")
    
    print("\n" + "-" * 40)
    print("UNKNOWN DETECTIONS")
    print("-" * 40)
    unknown_stats = analysis['unknown_detections']
    print(f"Unknown Top Clothing    : {unknown_stats['unknown_top']:3} ({unknown_stats['unknown_top_percentage']:5.1f}%)")
    print(f"Unknown Bottom Clothing : {unknown_stats['unknown_bottom']:3} ({unknown_stats['unknown_bottom_percentage']:5.1f}%)")

def generate_clothing_summary(detection_images_path="detection_images", output_path="processed_data"):
    """
    Generate clothing summary with quantities and percentages
    
    Args:
        detection_images_path: Path to detection_images folder
        output_path: Path to save the summary JSON file
        
    Returns:
        Path to the saved summary file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_path, exist_ok=True)
    
    print("Loading clothing detection data...")
    clothing_data = load_clothing_data(detection_images_path)
    
    if not clothing_data:
        print("No clothing data found!")
        return None
    
    print(f"Loaded data for {len(clothing_data)} people")
    
    # Analyze the data
    analysis = analyze_clothing_data(clothing_data)
    
    # Print analysis
    print_analysis(analysis)
    
    # Save analysis to JSON
    summary_file = os.path.join(output_path, "clothing_summary.json")
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    
    print(f"\nClothing summary saved to: {summary_file}")
    return summary_file

if __name__ == "__main__":
    generate_clothing_summary()
