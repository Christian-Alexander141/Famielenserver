import os
import shutil
import subprocess
import platform

# beckend


def get_cpu_usage():
    if platform.system() == "Windows":
        try:
            output = subprocess.check_output(
                ['wmic', 'cpu', 'get', 'loadpercentage'], stderr=subprocess.DEVNULL
            ).decode()
            lines = output.strip().splitlines()
            for line in lines:
                if line.strip().isdigit():
                    return float(line.strip())
        except:
            return 0.0
    else:
        # Linux: /proc/stat
        with open('/proc/stat', 'r') as f:
            line = f.readline()
        fields = [float(column) for column in line.strip().split()[1:]]
        idle, total = fields[3], sum(fields)
        # Sleep kurz, um Delta zu berechnen
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

def get_ram_usage():
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

def get_disk_usage():
    total, used, free = shutil.disk_usage('/')
    return round(used / total * 100, 2)

@app.route('/systeminfo')
def systeminfo():
    return jsonify({
        'cpu': get_cpu_usage(),
        'ram_used': get_ram_usage(),
        'disk_used': get_disk_usage()
    })
