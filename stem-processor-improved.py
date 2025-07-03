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
        'demucs': 'demucs --help'
        # Spleeter disabled due to compatibility issues
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
    
    # Force disable Spleeter
    available['spleeter'] = False
    log_message("❌ Spleeter force-disabled (compatibility issues)")
    
    return available

def process_with_demucs_v4(input_file, output_dir):
    """Process stems using Demucs v4 with Cloud Run-optimized settings"""
    log_message("🎵 Processing with Demucs v4 (Cloud Run optimized)")
    
    try:
        # Use memory-efficient settings for Cloud Run (8GB RAM, 2 CPU)
        cmd = [
            'python3', '-m', 'demucs.separate',
            '-n', 'htdemucs',  # Basic model 
            '-d', 'cpu',       # Use CPU (Cloud Run has 2 CPU cores)
            '--mp3',           # Output as MP3 for smaller files
            '--mp3-bitrate', '192',  # Good quality vs size balance
            '--segment', '7',   # Max segment for htdemucs is 7.8, use 7 to be safe
            '--overlap', '0.2', # Better quality with more overlap
            '-j', '2',         # Use both CPU cores
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

def process_with_demucs_light(input_file, output_dir):
    """Process stems using Demucs with ultra-light settings for low memory"""
    log_message("🎵 Processing with Demucs (ultra-light mode)")
    
    try:
        # Minimal memory settings for Cloud Run
        cmd = [
            'python3', '-m', 'demucs.separate',
            '-n', 'mdx_extra',    # Lighter model
            '-d', 'cpu',          # Use CPU
            '--mp3',              # Output as MP3
            '--mp3-bitrate', '128', # Lower bitrate
            '--segment', '5',     # Very small chunks
            '--overlap', '0.05',  # Minimal overlap
            '-j', '1',            # Single job
            # Remove --no-split as it conflicts with --segment
            '-o', str(output_dir),
            str(input_file)
        ]
        
        log_message(f"🔧 Running (light): {' '.join(cmd)}")
        
        # Simplified execution for light mode
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout for light mode
        )
        
        if result.returncode != 0:
            log_message(f"❌ Demucs light stderr: {result.stderr}")
            log_message(f"❌ Demucs light stdout: {result.stdout}")
            raise Exception(f"Demucs light failed with code {result.returncode}: {result.stderr}")
        
        log_message("✅ Demucs light processing completed")
        return True
        
    except Exception as e:
        log_message(f"❌ Demucs light failed: {str(e)}")
        return False

def process_with_spleeter(input_file, output_dir):
    """Spleeter disabled due to numpy/tensorflow compatibility issues"""
    log_message("❌ Spleeter disabled (incompatible with current environment)")
    return False

def find_output_files(output_dir, file_stem):
    """Find the generated stem files"""
    stems = {}
    
    # Look for Demucs output structure (multiple possible model directories)
    possible_dirs = [
        output_dir / 'htdemucs' / file_stem,
        output_dir / 'mdx_extra' / file_stem,
        output_dir / file_stem  # Fallback
    ]
    
    demucs_dir = None
    for dir_path in possible_dirs:
        if dir_path.exists():
            demucs_dir = dir_path
            break
    
    if demucs_dir:
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
    
    # Try Demucs v4 first (Cloud Run optimized)
    if available.get('demucs', False):
        success = process_with_demucs_v4(input_file, output_dir)
        
        # If Demucs fails, try with even lighter settings
        if not success:
            log_message("🔄 Trying Demucs with ultra-light settings")
            success = process_with_demucs_light(input_file, output_dir)
    
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