#!/usr/bin/env python3
"""
Stem separation processor for MADE INFINITE
Uses Demucs for better compatibility and performance
"""

import sys
import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

def log_message(message, level="INFO"):
    """Log messages with JSON format for Node.js integration"""
    print(json.dumps({
        "level": level,
        "message": message,
        "timestamp": str(os.times())
    }), flush=True)

def separate_stems_demucs(input_file, output_dir):
    """
    Separate audio stems using Demucs
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Run demucs separation
        log_message(f"Starting stem separation with Demucs for: {input_file}")
        
        # Use demucs command line interface
        cmd = [
            "python3", "-m", "demucs.separate",
            "--name", "htdemucs",  # Use the default high-quality model
            "--out", output_dir,
            input_file
        ]
        
        log_message(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        
        if result.returncode != 0:
            raise Exception(f"Demucs failed: {result.stderr}")
        
        log_message("Demucs separation completed successfully")
        
        # Find the output files
        # Demucs creates a subdirectory with the model name and then the track name
        input_name = Path(input_file).stem
        demucs_output_dir = os.path.join(output_dir, "htdemucs", input_name)
        
        if not os.path.exists(demucs_output_dir):
            raise Exception(f"Expected output directory not found: {demucs_output_dir}")
        
        # List the separated stems
        stem_files = []
        for file in os.listdir(demucs_output_dir):
            if file.endswith('.wav'):
                stem_path = os.path.join(demucs_output_dir, file)
                stem_files.append({
                    "name": file.replace('.wav', ''),
                    "path": stem_path,
                    "size": os.path.getsize(stem_path)
                })
        
        log_message(f"Found {len(stem_files)} stem files")
        
        return {
            "success": True,
            "stems": stem_files,
            "output_dir": demucs_output_dir
        }
        
    except Exception as e:
        log_message(f"Error in stem separation: {str(e)}", "ERROR")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Main function"""
    if len(sys.argv) != 3:
        print(json.dumps({
            "success": False,
            "error": "Invalid arguments",
            "message": "Usage: python stem-processor.py <input_file> <output_dir>"
        }))
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    # Validate input file exists
    if not os.path.exists(input_file):
        print(json.dumps({
            "success": False,
            "error": "Input file not found",
            "message": f"File does not exist: {input_file}"
        }))
        sys.exit(1)
    
    # Check if demucs is available
    try:
        import demucs
        log_message("Demucs is available")
    except ImportError:
        print(json.dumps({
            "success": False,
            "error": "Demucs not installed",
            "message": "Please install demucs: pip install demucs"
        }))
        sys.exit(1)
    
    # Perform stem separation
    result = separate_stems_demucs(input_file, output_dir)
    
    # Output final result as single line for easier parsing
    print("FINAL_RESULT:" + json.dumps(result))
    
    if result["success"]:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main() 