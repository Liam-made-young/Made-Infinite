#!/usr/bin/env python3
"""
Improved Stem Processor for MADE INFINITE
Supports multiple models: Demucs v4, Spleeter, and hybrid approaches
"""

import sys
import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

def log_message(message):
    """Log messages to stderr so they don't interfere with JSON output"""
    print(f"🐍 {message}", file=sys.stderr, flush=True)

def check_dependencies():
    """Check if required dependencies are installed"""
    dependencies = {
        'demucs': 'demucs --help',
        'spleeter': 'spleeter --help'
    }
    
    available = {}
    for name, check_cmd in dependencies.items():
        try:
            result = subprocess.run(check_cmd.split(), 
                                  capture_output=True, 
                                  text=True, 
                                  timeout=10)
            available[name] = result.returncode == 0
            log_message(f"✅ {name} available: {available[name]}")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            available[name] = False
            log_message(f"❌ {name} not available")
    
    return available

def process_with_demucs_v4(input_file, output_dir):
    """Process stems using Demucs v4 with high quality settings"""
    log_message("🎵 Processing with Demucs v4 (high quality)")
    
    try:
        # Use htdemucs_ft model for best quality
        cmd = [
            'python3', '-m', 'demucs.separate',
            '-n', 'htdemucs',  # Use basic htdemucs model (more reliable)
            '-d', 'cpu',  # Use CPU for stability
            '--mp3',            # Output as MP3 for smaller files
            '--mp3-bitrate', '320',  # High quality MP3
            '-o', str(output_dir),
            str(input_file)
        ]
        
        log_message(f"🔧 Running: {' '.join(cmd)}")
        
        # Run with real-time output for better progress tracking
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        stdout_lines = []
        stderr_lines = []
        
        # Read output in real-time
        import select
        import time
        
        timeout = 600  # 10 minutes
        start_time = time.time()
        
        while process.poll() is None:
            if time.time() - start_time > timeout:
                process.kill()
                raise Exception("Process timed out after 10 minutes")
            
            # Read available output
            if process.stderr:
                line = process.stderr.readline()
                if line:
                    stderr_lines.append(line.strip())
                    log_message(f"🔄 Demucs: {line.strip()}")
            
            if process.stdout:
                line = process.stdout.readline()  
                if line:
                    stdout_lines.append(line.strip())
                    log_message(f"📊 Demucs: {line.strip()}")
            
            time.sleep(0.1)
        
        # Get final return code
        return_code = process.returncode
        
        # Create result object
        class Result:
            def __init__(self, returncode, stdout_lines, stderr_lines):
                self.returncode = returncode
                self.stdout = '\n'.join(stdout_lines)
                self.stderr = '\n'.join(stderr_lines)
        
        result = Result(return_code, stdout_lines, stderr_lines)
        
        if result.returncode != 0:
            log_message(f"❌ Demucs stderr: {result.stderr}")
            log_message(f"❌ Demucs stdout: {result.stdout}")
            raise Exception(f"Demucs failed with code {result.returncode}: {result.stderr}")
        
        log_message("✅ Demucs processing completed")
        log_message(f"📄 Demucs stdout: {result.stdout}")
        return True
        
    except Exception as e:
        log_message(f"❌ Demucs v4 failed: {str(e)}")
        return False

def process_with_spleeter(input_file, output_dir):
    """Process stems using Spleeter as fallback"""
    log_message("🎵 Processing with Spleeter (fallback)")
    
    try:
        cmd = [
            'spleeter', 'separate',
            '-p', 'spleeter:4stems-16kHz',  # 4 stems model
            '-o', str(output_dir),
            str(input_file)
        ]
        
        log_message(f"🔧 Running: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            raise Exception(f"Spleeter failed: {result.stderr}")
        
        log_message("✅ Spleeter processing completed")
        return True
        
    except Exception as e:
        log_message(f"❌ Spleeter failed: {str(e)}")
        return False

def find_output_files(output_dir, file_stem):
    """Find the generated stem files"""
    stems = {}
    
    # Look for Demucs output structure
    demucs_dir = output_dir / 'htdemucs' / file_stem
    if demucs_dir.exists():
        log_message(f"🔍 Found Demucs output in: {demucs_dir}")
        stem_mapping = {
            'vocals.mp3': 'vocals',
            'drums.mp3': 'drums', 
            'bass.mp3': 'bass',
            'other.mp3': 'other'
        }
        
        for filename, stem_type in stem_mapping.items():
            stem_file = demucs_dir / filename
            if stem_file.exists():
                stems[stem_type] = str(stem_file)
                log_message(f"✅ Found {stem_type}: {stem_file}")
    
    # Look for Spleeter output structure
    spleeter_dir = output_dir / file_stem
    if spleeter_dir.exists() and not stems:
        log_message(f"🔍 Found Spleeter output in: {spleeter_dir}")
        stem_mapping = {
            'vocals.wav': 'vocals',
            'drums.wav': 'drums',
            'bass.wav': 'bass', 
            'other.wav': 'other'
        }
        
        for filename, stem_type in stem_mapping.items():
            stem_file = spleeter_dir / filename
            if stem_file.exists():
                stems[stem_type] = str(stem_file)
                log_message(f"✅ Found {stem_type}: {stem_file}")
    
    return stems

def main():
    if len(sys.argv) != 3:
        print("Usage: python stem-processor-improved.py <input_file> <output_dir>")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    
    log_message(f"🎵 Starting improved stem processing")
    log_message(f"📁 Input: {input_file}")
    log_message(f"📁 Output: {output_dir}")
    
    # Check if input file exists
    if not input_file.exists():
        result = {
            "success": False,
            "error": f"Input file not found: {input_file}"
        }
        print("FINAL_RESULT:" + json.dumps(result, indent=2))
        sys.exit(1)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Check available dependencies
    available = check_dependencies()
    
    if not any(available.values()):
        result = {
            "success": False,
            "error": "No stem separation tools available (tried Demucs, Spleeter)"
        }
        print("FINAL_RESULT:" + json.dumps(result, indent=2))
        sys.exit(1)
    
    # Try processing with best available model
    success = False
    file_stem = input_file.stem
    
    # Try Demucs v4 first (best quality)
    if available.get('demucs', False):
        success = process_with_demucs_v4(input_file, output_dir)
    
    # Fall back to Spleeter if Demucs fails
    if not success and available.get('spleeter', False):
        log_message("🔄 Falling back to Spleeter")
        success = process_with_spleeter(input_file, output_dir)
    
    if not success:
        result = {
            "success": False,
            "error": "All stem separation methods failed"
        }
        print("FINAL_RESULT:" + json.dumps(result, indent=2))
        sys.exit(1)
    
    # Find the generated files
    stems = find_output_files(output_dir, file_stem)
    
    if not stems:
        result = {
            "success": False,
            "error": "No stem files found after processing"
        }
        print("FINAL_RESULT:" + json.dumps(result, indent=2))
        sys.exit(1)
    
    # Return success result
    result = {
        "success": True,
        "model_used": "demucs_v4" if available.get('demucs') and success else "spleeter",
        "stems": stems,
        "total_stems": len(stems)
    }
    
    log_message(f"✅ Processing complete! Generated {len(stems)} stems")
    print("FINAL_RESULT:" + json.dumps(result, indent=2))

if __name__ == "__main__":
    main() 