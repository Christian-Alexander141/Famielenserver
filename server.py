from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import shutil
import subprocess
import platform
from pathlib import Path
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Konfiguration
UPLOAD_FOLDER = Path('familienserver/public/uploads')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB Max

# Erlaube alle Dateitypen für Familiennutzung
ALLOWED_EXTENSIONS = set()  # Leer = alle erlaubt

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() or True  # Immer true = alle Dateien erlaubt


# System Monitoring Funktionen

def get_cpu_usage():
    """Get CPU usage percentage"""
    if platform.system() == "Windows":
        try:
            output = subprocess.check_output(
                ['wmic', 'cpu', 'get', 'loadpercentage'], 
                stderr=subprocess.DEVNULL
            ).decode()
            lines = output.strip().splitlines()
            for line in lines:
                if line.strip().isdigit():
                    return float(line.strip())
        except:
            return 0.0
    else:
        # Linux: /proc/stat
        try:
            with open('/proc/stat', 'r') as f:
                line = f.readline()
            fields = [float(column) for column in line.strip().split()[1:]]
            idle, total = fields[3], sum(fields)
            
            import time
            time.sleep(0.1)
            
            with open('/proc/stat', 'r') as f:
                line2 = f.readline()
            fields2 = [float(column) for column in line2.strip().split()[1:]]
            idle2, total2 = fields2[3], sum(fields2)

            idle_delta = idle2 - idle
            total_delta = total2 - total
            cpu_percent = 100.0 * (1.0 - idle_delta / total_delta)
            return round(cpu_percent, 2)
        except:
            return 0.0


def get_ram_usage():
    """Get RAM usage percentage"""
    if platform.system() == "Windows":
        try:
            output = subprocess.check_output(
                ['wmic', 'OS', 'get', 'FreePhysicalMemory,TotalVisibleMemorySize', '/Value'],
                stderr=subprocess.DEVNULL
            ).decode()
            lines = output.strip().splitlines()
            mem_info = {}
            for line in lines:
                if '=' in line:
                    key, val = line.split('=')
                    mem_info[key.strip()] = int(val.strip())
            total = mem_info.get("TotalVisibleMemorySize", 1)
            free = mem_info.get("FreePhysicalMemory", 0)
            used_percent = (1 - free / total) * 100
            return round(used_percent, 2)
        except:
            return 0.0
    else:
        # Linux: /proc/meminfo
        try:
            meminfo = {}
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    parts = line.split(':')
                    key = parts[0]
                    value = int(parts[1].strip().split()[0])
                    meminfo[key] = value
            total = meminfo.get('MemTotal', 1)
            free = meminfo.get('MemFree', 0) + meminfo.get('Buffers', 0) + meminfo.get('Cached', 0)
            used = total - free
            return round(used / total * 100, 2)
        except:
            return 0.0


def get_disk_usage():
    """Get disk usage percentage"""
    try:
        total, used, free = shutil.disk_usage('/')
        return round(used / total * 100, 2)
    except:
        return 0.0


# API Routes

@app.route('/api/systeminfo')
def systeminfo():
    """Get system resource usage"""
    return jsonify({
        'cpu': get_cpu_usage(),
        'ram_used': get_ram_usage(),
        'disk_used': get_disk_usage()
    })


@app.route('/api/files')
def list_files():
    """List all uploaded files"""
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    
    if not upload_dir.exists():
        return jsonify([])
    
    files = []
    for item in upload_dir.rglob('*'):
        if item.is_file():
            # Relative path from upload folder
            rel_path = item.relative_to(upload_dir)
            files.append({
                'name': str(rel_path),
                'path': str(rel_path),
                'size': item.stat().st_size,
                'is_directory': False
            })
    
    # Sort by name
    files.sort(key=lambda x: x['name'])
    return jsonify(files)


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    if 'file' not in request.files:
        return jsonify({'error': 'Keine Datei gefunden'}), 400
    
    files = request.files.getlist('file')
    results = []
    
    for file in files:
        if file.filename == '':
            continue
        
        try:
            # Use webkitRelativePath if available (directory upload)
            file_path = file.filename
            if hasattr(file, 'webkitRelativePath') and file.webkitRelativePath:
                file_path = file.webkitRelativePath
            
            # Create directory structure if needed
            upload_path = Path(app.config['UPLOAD_FOLDER']) / file_path
            upload_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file.save(str(upload_path))
            results.append({'success': True, 'filename': file_path})
        except Exception as e:
            results.append({'success': False, 'filename': file.filename, 'error': str(e)})
    
    return jsonify({'results': results})


@app.route('/api/download/<path:filename>')
def download_file(filename):
    """Download a file"""
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    file_path = upload_dir / filename
    
    if not file_path.exists():
        return jsonify({'error': 'Datei nicht gefunden'}), 404
    
    if file_path.is_dir():
        return jsonify({'error': 'Ist ein Verzeichnis'}), 400
    
    return send_from_directory(str(upload_dir), filename, as_attachment=True)


@app.route('/api/delete/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a file"""
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    file_path = upload_dir / filename
    
    if not file_path.exists():
        return jsonify({'error': 'Datei nicht gefunden'}), 404
    
    try:
        if file_path.is_dir():
            shutil.rmtree(str(file_path))
        else:
            file_path.unlink()
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Chatbot API (für zukünftige Integration)
@app.route('/api/chat', methods=['POST'])
def chat():
    """Chatbot endpoint for searching files"""
    data = request.get_json()
    query = data.get('query', '').lower()
    
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    
    if not upload_dir.exists():
        return jsonify({'results': [], 'message': 'Keine Dateien verfügbar'})
    
    # Suche nach Dateien
    matches = []
    for item in upload_dir.rglob('*'):
        if item.is_file():
            filename = item.name.lower()
            if query in filename:
                rel_path = item.relative_to(upload_dir)
                matches.append({
                    'name': item.name,
                    'path': str(rel_path),
                    'size': item.stat().st_size,
                    'download_url': f'/api/download/{rel_path}'
                })
    
    return jsonify({
        'results': matches,
        'query': query,
        'count': len(matches)
    })


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Familienserver Backend')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to listen on')
    args = parser.parse_args()
    
    app.run(host=args.host, port=args.port, debug=True)
