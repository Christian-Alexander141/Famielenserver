"use client";

import { useEffect, useRef } from "react";
import { Chart, DoughnutController, ArcElement, CategoryScale, LinearScale } from "chart.js";

// Register Chart.js components
Chart.register(DoughnutController, ArcElement, CategoryScale, LinearScale);

interface SystemInfo {
  cpu: number;
  ram_used: number;
  disk_used: number;
  cpu_temp?: number; // Optional CPU temperature (for Raspberry Pi)
}

interface SystemMonitorProps {
  systemInfo: SystemInfo;
}

export default function SystemMonitor({ systemInfo }: SystemMonitorProps) {
  const cpuChartRef = useRef<HTMLCanvasElement>(null);
  const ramChartRef = useRef<HTMLCanvasElement>(null);
  const diskChartRef = useRef<HTMLCanvasElement>(null);
  const cpuChartInstance = useRef<any>(null);
  const ramChartInstance = useRef<any>(null);
  const diskChartInstance = useRef<any>(null);

  // Create or update charts
  useEffect(() => {
    const createOrUpdateChart = (
      ref: React.RefObject<HTMLCanvasElement | null>,
      chartRef: React.MutableRefObject<any>,
      label: string,
      value: number,
      color: string
    ) => {
      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;

      // Destroy existing chart if it exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: [label, "Frei"],
          datasets: [
            {
              data: [value, 100 - value],
              backgroundColor: [color, "#3a3a3c"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.label}: ${context.parsed}%`;
                },
              },
            },
          },
          animation: {
            animateScale: true,
            animateRotate: true,
          },
        },
      });
    };

    // Create charts with current system info
    createOrUpdateChart(cpuChartRef, cpuChartInstance, "CPU", systemInfo.cpu, "#ff375f");
    createOrUpdateChart(ramChartRef, ramChartInstance, "RAM", systemInfo.ram_used, "#32d74b");
    createOrUpdateChart(diskChartRef, diskChartInstance, "Speicher", systemInfo.disk_used, "#ffd60a");

    // Cleanup on unmount
    return () => {
      [cpuChartInstance.current, ramChartInstance.current, diskChartInstance.current].forEach(
        (chart) => {
          if (chart) {
            chart.destroy();
          }
        }
      );
    };
  }, []);

  // Update charts when systemInfo changes
  useEffect(() => {
    const updateChartData = (
      chartRef: React.MutableRefObject<any>,
      value: number
    ) => {
      if (chartRef.current) {
        chartRef.current.data.datasets[0].data[0] = value;
        chartRef.current.data.datasets[0].data[1] = 100 - value;
        chartRef.current.update();
      }
    };

    updateChartData(cpuChartInstance, systemInfo.cpu);
    updateChartData(ramChartInstance, systemInfo.ram_used);
    updateChartData(diskChartInstance, systemInfo.disk_used);
  }, [systemInfo]);

  // Get temperature color based on value
  const getTempColor = (temp: number | undefined) => {
    if (temp === undefined) return "text-gray-500";
    if (temp < 50) return "text-blue-500";
    if (temp < 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div>
      <div className="chart-row">
        <div className="chart-container">
          <canvas ref={cpuChartRef} className="w-32 h-32" />
          <p className="mt-2 text-sm">
            CPU: {systemInfo.cpu.toFixed(1)}%
            {systemInfo.cpu_temp && (
              <span className={`ml-2 ${getTempColor(systemInfo.cpu_temp)}`}>
                ({systemInfo.cpu_temp}°C)
              </span>
            )}
          </p>
        </div>
        <div className="chart-container">
          <canvas ref={ramChartRef} className="w-32 h-32" />
          <p className="mt-2 text-sm">RAM: {systemInfo.ram_used.toFixed(1)}%</p>
        </div>
        <div className="chart-container">
          <canvas ref={diskChartRef} className="w-32 h-32" />
          <p className="mt-2 text-sm">Speicher: {systemInfo.disk_used.toFixed(1)}%</p>
        </div>
      </div>
      
      {/* Raspberry Pi Info */}
      {systemInfo.cpu_temp !== undefined && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          ⚡ Raspberry Pi - CPU-Temperatur wird angezeigt
        </div>
      )}
    </div>
  );
}
