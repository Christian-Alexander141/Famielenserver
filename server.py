from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import shutil
import subprocess
import platform
import time
from pathlib import Path
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Konfiguration
UPLOAD_FOLDER = Path('familienserver/public/uploads')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB Max (für Raspberry Pi optimiert)

# Erlaube alle Dateitypen für Familiennutzung
ALLOWED_EXTENSIONS = set()  # Leer = alle erlaubt

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() or True  # Immer true = alle Dateien erlaubt


# System Monitoring Funktionen - optimiert für Raspberry Pi

def get_cpu_usage():
    """Get CPU usage percentage - optimiert für Raspberry Pi und Linux"""
    try:
        # Linux: /proc/stat (funktioniert auf allen Linux-Systemen inkl. Raspberry Pi)
        with open('/proc/stat', 'r') as f:
            line = f.readline()
        fields = [float(column) for column in line.strip().split()[1:]]
        idle, total = fields[3], sum(fields)
        
        # Kurze Pause für Delta-Berechnung
        time.sleep(0.1)
        
        with open('/proc/stat', 'r') as f:
            line2 = f.readline()
        fields2 = [float(column) for column in line2.strip().split()[1:]]
        idle2, total2 = fields2[3], sum(fields2)

        idle_delta = idle2 - idle
        total_delta = total2 - total
        
        # Vermeide Division durch Null
        if total_delta <= 0:
            return 0.0
            
        cpu_percent = 100.0 * (1.0 - idle_delta / total_delta)
        return round(min(max(cpu_percent, 0.0), 100.0), 2)
    except Exception as e:
        print(f"Fehler bei CPU-Messung: {e}")
        return 0.0


def get_ram_usage():
    """Get RAM usage percentage - optimiert für Raspberry Pi"""
    try:
        # Linux: /proc/meminfo (funktioniert auf allen Linux-Systemen)
        meminfo = {}
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                parts = line.split(':')
                key = parts[0].strip()
                value = int(parts[1].strip().split()[0])
                meminfo[key] = value
        
        total = meminfo.get('MemTotal', 1)
        free = meminfo.get('MemFree', 0) + meminfo.get('Buffers', 0) + meminfo.get('Cached', 0)
        used = total - free
        
        if total <= 0:
            return 0.0
            
        return round(min(max(used / total * 100, 0.0), 100.0), 2)
    except Exception as e:
        print(f"Fehler bei RAM-Messung: {e}")
        return 0.0


def get_disk_usage():
    """Get disk usage percentage - optimiert für Raspberry Pi"""
    try:
        # Prüfe Root-Partition
        total, used, free = shutil.disk_usage('/')
        if total <= 0:
            return 0.0
        return round(min(max(used / total * 100, 0.0), 100.0), 2)
    except Exception as e:
        print(f"Fehler bei Disk-Messung: {e}")
        return 0.0


def get_cpu_temperature():
    """Get CPU temperature for Raspberry Pi (falls verfügbar)"""
    try:
        # Nur auf Raspberry Pi
        if platform.machine() in ['armv6l', 'armv7l', 'aarch64']:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
                return round(temp, 1)
    except:
        pass
    return None


# API Routes

@app.route('/api/systeminfo')
def systeminfo():
    """Get system resource usage"""
    cpu_temp = get_cpu_temperature()
    
    result = {
        'cpu': get_cpu_usage(),
        'ram_used': get_ram_usage(),
        'disk_used': get_disk_usage()
    }
    
    # CPU-Temperatur nur hinzufügen, wenn verfügbar (Raspberry Pi)
    if cpu_temp is not None:
        result['cpu_temp'] = cpu_temp
    
    return jsonify(result)


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
            # Get file extension for icon
            ext = item.suffix.lower() if item.suffix else ''
            files.append({
                'name': item.name,
                'path': str(rel_path),
                'size': item.stat().st_size,
                'extension': ext,
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
            results.append({'success': True, 'filename': file_path, 'size': len(file.read())})
            # Reset file pointer for potential re-read
            file.seek(0)
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


# Chatbot API - Regelbasiert (kein LLM, komplett lokal)
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Regelbasierter Chatbot für Dateisuche
    Funktioniert komplett lokal ohne externe Abhängigkeiten
    """
    data = request.get_json()
    query = data.get('query', '').lower().strip()
    
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    
    if not upload_dir.exists():
        return jsonify({'results': [], 'message': 'Keine Dateien verfügbar'})
    
    # Regelbasierte Suche
    matches = []
    
    # Alle Dateien durchsuchen
    all_files = []
    for item in upload_dir.rglob('*'):
        if item.is_file():
            rel_path = item.relative_to(upload_dir)
            all_files.append({
                'name': item.name,
                'path': str(rel_path),
                'size': item.stat().st_size,
                'extension': item.suffix.lower() if item.suffix else ''
            })
    
    # Regel 1: Einfache Textsuche in Dateinamen
    if query:
        for file in all_files:
            if query in file['name'].lower():
                matches.append({
                    'name': file['name'],
                    'path': file['path'],
                    'size': file['size'],
                    'download_url': f'/api/download/{file["path"]}'
                })
    
    # Regel 2: Suche nach Dateitypen
    file_type_search = {
        'pdf': ['.pdf'],
        'bilder': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
        'dokumente': ['.pdf', '.doc', '.docx', '.txt', '.odt', '.rtf'],
        'tabellen': ['.xls', '.xlsx', '.csv', '.ods'],
        'präsentationen': ['.ppt', '.pptx', '.odp'],
        'archive': ['.zip', '.rar', '.7z', '.tar', '.gz'],
        'videos': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
        'musik': ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
    }
    
    for search_term, extensions in file_type_search.items():
        if search_term in query:
            for file in all_files:
                if file['extension'] in extensions and file not in matches:
                    matches.append({
                        'name': file['name'],
                        'path': file['path'],
                        'size': file['size'],
                        'download_url': f'/api/download/{file["path"]}'
                    })
    
    # Regel 3: Suche nach Datum (z.B. "2024", "januar")
    month_names = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 
                   'juli', 'august', 'september', 'oktober', 'november', 'dezember']
    for month in month_names:
        if month in query:
            for file in all_files:
                if month in file['name'].lower() and file not in matches:
                    matches.append({
                        'name': file['name'],
                        'path': file['path'],
                        'size': file['size'],
                        'download_url': f'/api/download/{file["path"]}'
                    })
    
    # Doppelte Ergebnisse entfernen
    unique_matches = []
    seen_paths = set()
    for match in matches:
        if match['path'] not in seen_paths:
            seen_paths.add(match['path'])
            unique_matches.append(match)
    
    return jsonify({
        'results': unique_matches,
        'query': query,
        'count': len(unique_matches),
        'hint': get_search_hint(query, all_files)
    })


def get_search_hint(query, all_files):
    """Generiere hilfreiche Hinweise für die Suche"""
    if not query:
        return "Versuchen Sie z.B.: 'Urlaub', 'PDFs', '2024' oder 'Bilder'"
    
    # Zähle Dateitypen
    extensions = {}
    for file in all_files:
        ext = file['extension']
        if ext:
            extensions[ext] = extensions.get(ext, 0) + 1
    
    if extensions:
        most_common = max(extensions.items(), key=lambda x: x[1])
        return f"Tipp: Es gibt {most_common[1]} {most_common[0]}-Dateien"
    
    return ""


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Familienserver Backend - optimiert für Raspberry Pi')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to listen on')
    args = parser.parse_args()
    
    print(f"Starting Familienserver Backend on {args.host}:{args.port}")
    print("Optimized for Raspberry Pi")
    app.run(host=args.host, port=args.port, debug=True)
