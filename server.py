from flask import Flask, request, jsonify, send_from_directory, send_file, Response
import os
import shutil
import subprocess
import platform
import time
import zipfile
import io
from pathlib import Path
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)

# CORS für alle Origins aktivieren (für Entwicklung)
CORS(app, resources={r"/*": {"origins": "*"}})

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


def sanitize_path(path):
    """Sicherstellen, dass der Pfad innerhalb des Upload-Ordners bleibt"""
    base = Path(app.config['UPLOAD_FOLDER']).resolve()
    target = (base / Path(path)).resolve()
    
    # Prüfe, ob der Zielpfad innerhalb des Basis-Pfades liegt
    if not str(target).startswith(str(base)):
        raise ValueError(f"Pfad außerhalb des Upload-Ordners: {path}")
    
    return target


# System Monitoring Funktionen - optimiert für Raspberry Pi

def get_cpu_usage():
    """Get CPU usage percentage - optimiert für Raspberry Pi und Linux"""
    try:
        with open('/proc/stat', 'r') as f:
            line = f.readline()
        fields = [float(column) for column in line.strip().split()[1:]]
        idle, total = fields[3], sum(fields)
        
        time.sleep(0.1)
        
        with open('/proc/stat', 'r') as f:
            line2 = f.readline()
        fields2 = [float(column) for column in line2.strip().split()[1:]]
        idle2, total2 = fields2[3], sum(fields2)

        idle_delta = idle2 - idle
        total_delta = total2 - total
        
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
        if platform.machine() in ['armv6l', 'armv7l', 'aarch64']:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
                return round(temp, 1)
    except:
        pass
    return None


def get_directory_tree(path):
    """Get directory tree structure"""
    base_path = Path(app.config['UPLOAD_FOLDER'])
    full_path = sanitize_path(path)
    
    if not full_path.exists():
        return []
    
    items = []
    for item in full_path.iterdir():
        rel_path = item.relative_to(base_path)
        if item.is_dir():
            items.append({
                'name': item.name,
                'path': str(rel_path),
                'type': 'directory',
                'size': 0,
                'children': []
            })
        else:
            items.append({
                'name': item.name,
                'path': str(rel_path),
                'type': 'file',
                'size': item.stat().st_size,
                'extension': item.suffix.lower() if item.suffix else ''
            })
    
    # Sort directories first, then files
    items.sort(key=lambda x: (x['type'] != 'directory', x['name']))
    return items


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
    
    if cpu_temp is not None:
        result['cpu_temp'] = cpu_temp
    
    return jsonify(result)


@app.route('/api/files')
def list_files():
    """List all uploaded files and directories"""
    upload_dir = Path(app.config['UPLOAD_FOLDER'])
    
    if not upload_dir.exists():
        return jsonify([])
    
    items = []
    for item in upload_dir.iterdir():
        rel_path = item.relative_to(upload_dir)
        if item.is_dir():
            items.append({
                'name': item.name,
                'path': str(rel_path),
                'type': 'directory',
                'size': 0,
                'extension': ''
            })
        else:
            items.append({
                'name': item.name,
                'path': str(rel_path),
                'type': 'file',
                'size': item.stat().st_size,
                'extension': item.suffix.lower() if item.suffix else ''
            })
    
    # Sort directories first, then files
    items.sort(key=lambda x: (x['type'] != 'directory', x['name']))
    return jsonify(items)


@app.route('/api/files/<path:path>')
def list_files_in_directory(path):
    """List files in a specific directory"""
    try:
        items = get_directory_tree(path)
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


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
            file_path = file.filename
            if hasattr(file, 'webkitRelativePath') and file.webkitRelativePath:
                file_path = file.webkitRelativePath
            
            upload_path = Path(app.config['UPLOAD_FOLDER']) / file_path
            upload_path.parent.mkdir(parents=True, exist_ok=True)
            
            file.save(str(upload_path))
            results.append({'success': True, 'filename': file_path, 'size': os.path.getsize(str(upload_path))})
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
        return jsonify({'error': 'Ist ein Verzeichnis. Verwende /api/download-zip für Ordner'}), 400
    
    return send_from_directory(str(upload_dir), filename, as_attachment=True)


@app.route('/api/download-zip/<path:path>')
def download_zip(path):
    """Download a directory as ZIP file"""
    try:
        base_path = Path(app.config['UPLOAD_FOLDER'])
        source_path = sanitize_path(path)
        
        if not source_path.exists():
            return jsonify({'error': 'Pfad nicht gefunden'}), 404
        
        if not source_path.is_dir():
            return jsonify({'error': 'Ist keine Datei. Verwende /api/download für einzelne Dateien'}), 400
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        
        # Get relative path for ZIP
        rel_path = source_path.relative_to(base_path)
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(source_path):
                for file in files:
                    file_path = Path(root) / file
                    # Create relative path for ZIP
                    arcname = file_path.relative_to(base_path)
                    zipf.write(str(file_path), str(arcname))
        
        zip_buffer.seek(0)
        
        # Return ZIP file
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"{rel_path.name}.zip"
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mkdir/<path:path>', methods=['POST'])
def create_directory(path):
    """Create a new directory"""
    try:
        base_path = Path(app.config['UPLOAD_FOLDER'])
        new_dir = sanitize_path(path)
        
        if new_dir.exists():
            return jsonify({'error': 'Ordner existiert bereits'}), 400
        
        new_dir.mkdir(parents=True, exist_ok=True)
        return jsonify({'success': True, 'path': str(new_dir.relative_to(base_path))})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/move', methods=['POST'])
def move_item():
    """Move or rename a file or directory"""
    data = request.get_json()
    source = data.get('source')
    destination = data.get('destination')
    
    if not source or not destination:
        return jsonify({'error': 'Quelle und Ziel sind erforderlich'}), 400
    
    try:
        base_path = Path(app.config['UPLOAD_FOLDER'])
        source_path = sanitize_path(source)
        dest_path = sanitize_path(destination)
        
        if not source_path.exists():
            return jsonify({'error': 'Quellpfad nicht gefunden'}), 404
        
        # If destination is a directory, move into it
        if dest_path.is_dir():
            dest_path = dest_path / source_path.name
        
        # Check if destination already exists
        if dest_path.exists():
            return jsonify({'error': 'Ziel existiert bereits'}), 400
        
        # Move the item
        shutil.move(str(source_path), str(dest_path))
        
        return jsonify({
            'success': True,
            'source': source,
            'destination': str(dest_path.relative_to(base_path))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete/<path:path>', methods=['DELETE'])
def delete_item(path):
    """Delete a file or directory"""
    try:
        base_path = Path(app.config['UPLOAD_FOLDER'])
        item_path = sanitize_path(path)
        
        if not item_path.exists():
            return jsonify({'error': 'Pfad nicht gefunden'}), 404
        
        if item_path.is_dir():
            shutil.rmtree(str(item_path))
        else:
            item_path.unlink()
        
        return jsonify({'success': True, 'path': path})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
    print("CORS enabled for all origins (development mode)")
    print("Optimized for Raspberry Pi")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    app.run(host=args.host, port=args.port, debug=True)
