import React, { useState } from 'react';
import { CategoryCount, SeverityCount, PriorityCount, TrendPoint, AssetImpact, AgingBucket } from '../types/incident';

// 1. Horizontal Category Bar Chart
export const CategoryBarChart: React.FC<{ data: CategoryCount[] }> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-slate-500 text-sm">No incident category data available.</div>;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 7).map((item, idx) => {
        const widthPct = Math.round((item.count / maxVal) * 100);
        const isHovered = hoveredIdx === idx;
        return (
          <div
            key={item.category}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="group cursor-default"
          >
            <div className="flex justify-between items-center text-xs mb-1">
              <span className={`font-medium transition-colors ${isHovered ? 'text-cyan-400' : 'text-slate-300'}`}>
                {item.category}
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {item.count} <span className="text-slate-600">({item.percentage}%)</span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHovered ? 'bg-cyan-400' : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                }`}
                style={{ width: `${Math.max(4, widthPct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 2. SVG Donut Chart for Severity Distribution
export const SeverityDonutChart: React.FC<{ data: SeverityCount[] }> = ({ data }) => {
  const [activeSegment, setActiveSegment] = useState<SeverityCount | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-slate-500 text-sm">No severity data available.</div>;
  }

  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  const colors: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#3b82f6',
  };

  let cumulativeAngle = 0;
  const radius = 60;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#1e293b" strokeWidth={strokeWidth} />
          {total > 0 && data.map((item) => {
            const fraction = item.count / total;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -(cumulativeAngle * circumference);
            cumulativeAngle += fraction;
            const color = colors[item.severity] || '#64748b';

            return (
              <circle
                key={item.severity}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                onMouseEnter={() => setActiveSegment(item)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}
        </svg>
        <div className="absolute text-center select-none pointer-events-none">
          <div className="text-2xl font-bold font-mono text-white">
            {activeSegment ? activeSegment.count : total}
          </div>
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {activeSegment ? activeSegment.severity : 'Total'}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 w-full">
        {data.map((item) => {
          const color = colors[item.severity] || '#64748b';
          return (
            <div
              key={item.severity}
              onMouseEnter={() => setActiveSegment(item)}
              onMouseLeave={() => setActiveSegment(null)}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-850/40 hover:bg-slate-800/80 transition-colors cursor-default border border-transparent hover:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-slate-300">{item.severity}</span>
              </div>
              <div className="text-xs font-mono font-semibold text-white">
                {item.count} <span className="text-slate-500 text-[11px]">({item.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. SVG Timeline / Area Trend Chart
export const TrendLineChart: React.FC<{ data: TrendPoint[] }> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-slate-500 text-sm">No trend data available for current selection.</div>;
  }

  // Take the most recent 14 points if list is long
  const points = data.slice(-14);
  const maxVal = Math.max(...points.map(p => p.count), 5);
  const height = 140;
  const width = 500;
  const paddingX = 25;
  const paddingY = 20;

  const dx = (width - paddingX * 2) / Math.max(1, points.length - 1);

  // Generate SVG coordinates
  const coords = points.map((p, i) => {
    const x = paddingX + i * dx;
    const y = height - paddingY - (p.count / maxVal) * (height - paddingY * 2);
    return { x, y, point: p };
  });

  const polylineStr = coords.map(c => `${c.x},${c.y}`).join(' ');
  const areaPathStr = `M ${coords[0].x},${height - paddingY} ` +
    coords.map(c => `L ${c.x},${c.y}`).join(' ') +
    ` L ${coords[coords.length - 1].x},${height - paddingY} Z`;

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#334155" />

          {/* Area fill */}
          <path d={areaPathStr} fill="url(#trendGradient)" />

          {/* Line stroke */}
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineStr}
          />

          {/* Data Points */}
          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={hoveredPoint?.date === c.point.date ? 5 : 3.5}
              fill={hoveredPoint?.date === c.point.date ? '#22d3ee' : '#0e7490'}
              stroke="#082f49"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint(c.point)}
            />
          ))}
        </svg>

        {/* Hover details badge */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700 rounded-lg p-2 text-xs shadow-xl backdrop-blur-sm">
            <div className="text-slate-400 font-mono text-[10px]">{hoveredPoint.date}</div>
            <div className="text-cyan-400 font-bold">{hoveredPoint.count} Incidents</div>
            <div className="text-red-400 text-[11px]">{hoveredPoint.critical_count} Critical • {hoveredPoint.high_count} High</div>
          </div>
        )}
      </div>

      {/* Date labels */}
      <div className="flex justify-between px-4 text-[10px] text-slate-500 font-mono mt-1">
        <span>{points[0]?.date}</span>
        <span>{points[Math.floor(points.length / 2)]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
};

// 4. Priority Tier Distribution Bars
export const PriorityDonutChart: React.FC<{ data: PriorityCount[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-blue-500',
  };

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.priority} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300 tracking-wider text-[11px]">{item.priority}</span>
            <span className="font-mono text-slate-400 text-xs">
              {item.count} <span className="text-slate-600">({item.percentage}%)</span>
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${priorityColors[item.priority] || 'bg-slate-500'}`}
              style={{ width: `${Math.max(3, item.percentage)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
