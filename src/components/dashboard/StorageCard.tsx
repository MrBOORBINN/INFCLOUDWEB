import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Info,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Archive,
  File as FileIcon,
  Trash2,
  PieChart,
  ChevronRight,
} from 'lucide-react';
import { formatBytes, getFileCategory } from '../../lib/utils';
import { NavigationTab, FileCategory, FileItem } from '../../types';

interface StorageBreakdown {
  images: number;
  videos: number;
  documents: number;
  audio: number;
  archives: number;
  other: number;
  trash: number;
}

interface StorageCardProps {
  totalUsedBytes: number;
  maxQuotaBytes: number;
  breakdown: StorageBreakdown;
  setActiveTab: (tab: NavigationTab) => void;
  files?: FileItem[];
  packagesCount?: number;
  onSelectCategory?: (category: FileCategory) => void;
}

export const StorageCard: React.FC<StorageCardProps> = ({
  totalUsedBytes,
  maxQuotaBytes,
  breakdown,
  setActiveTab,
  files = [],
  packagesCount = 0,
  onSelectCategory,
}) => {
  const [useBinary, setUseBinary] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredCategoryKey, setHoveredCategoryKey] = useState<string | null>(null);

  const remainingBytes = Math.max(0, maxQuotaBytes - totalUsedBytes);
  const usedPercent = Math.min(100, (totalUsedBytes / maxQuotaBytes) * 100);

  // Calculate file counts per category
  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = {
      images: 0,
      videos: 0,
      documents: 0,
      audio: 0,
      archives: 0,
      other: 0,
      trash: 0,
    };

    files.forEach((f) => {
      if (f.isTrashed) {
        counts.trash += 1;
      } else {
        const cat = getFileCategory(f.mimeType, f.name);
        if (counts[cat] !== undefined) {
          counts[cat] += 1;
        } else {
          counts.other += 1;
        }
      }
    });

    return counts;
  }, [files]);

  const getPercentOfUsed = (bytes: number) => {
    if (totalUsedBytes === 0) return 0;
    return (bytes / totalUsedBytes) * 100;
  };

  const getPercentOfQuota = (bytes: number) => {
    if (maxQuotaBytes === 0) return 0;
    return (bytes / maxQuotaBytes) * 100;
  };

  // Category definitions with authoritative color mapping and icons
  const categories = useMemo(() => [
    {
      key: 'images',
      category: 'images' as FileCategory,
      name: 'Photos & Images',
      shortName: 'Photos',
      bytes: breakdown.images,
      count: fileCounts.images,
      bgClass: 'bg-sky-400',
      borderClass: 'border-sky-400/40',
      textClass: 'text-sky-400',
      glowClass: 'shadow-sky-500/20',
      color: '#38bdf8',
      icon: ImageIcon,
    },
    {
      key: 'videos',
      category: 'videos' as FileCategory,
      name: 'High-Definition Videos',
      shortName: 'Videos',
      bytes: breakdown.videos,
      count: fileCounts.videos,
      bgClass: 'bg-indigo-500',
      borderClass: 'border-indigo-500/40',
      textClass: 'text-indigo-400',
      glowClass: 'shadow-indigo-500/20',
      color: '#6366f1',
      icon: Video,
    },
    {
      key: 'documents',
      category: 'documents' as FileCategory,
      name: 'Documents & PDFs',
      shortName: 'Documents',
      bytes: breakdown.documents,
      count: fileCounts.documents,
      bgClass: 'bg-emerald-400',
      borderClass: 'border-emerald-400/40',
      textClass: 'text-emerald-400',
      glowClass: 'shadow-emerald-500/20',
      color: '#34d399',
      icon: FileText,
    },
    {
      key: 'audio',
      category: 'audio' as FileCategory,
      name: 'Audio & Music Tracks',
      shortName: 'Audio',
      bytes: breakdown.audio,
      count: fileCounts.audio,
      bgClass: 'bg-amber-400',
      borderClass: 'border-amber-400/40',
      textClass: 'text-amber-400',
      glowClass: 'shadow-amber-500/20',
      color: '#fbbf24',
      icon: Music,
    },
    {
      key: 'archives',
      category: 'archives' as FileCategory,
      name: 'ZIP & Compressed Archives',
      shortName: 'Archives',
      bytes: breakdown.archives,
      count: fileCounts.archives,
      bgClass: 'bg-purple-400',
      borderClass: 'border-purple-400/40',
      textClass: 'text-purple-400',
      glowClass: 'shadow-purple-500/20',
      color: '#c084fc',
      icon: Archive,
    },
    {
      key: 'other',
      category: 'other' as FileCategory,
      name: 'Other Binaries & Code',
      shortName: 'Other',
      bytes: breakdown.other,
      count: fileCounts.other,
      bgClass: 'bg-zinc-400',
      borderClass: 'border-zinc-400/40',
      textClass: 'text-zinc-300',
      glowClass: 'shadow-zinc-500/20',
      color: '#a1a1aa',
      icon: FileIcon,
    },
    {
      key: 'trash',
      category: 'all' as FileCategory,
      name: 'Recycle Bin Retained',
      shortName: 'Recycle Bin',
      bytes: breakdown.trash,
      count: fileCounts.trash,
      bgClass: 'bg-rose-500',
      borderClass: 'border-rose-500/40',
      textClass: 'text-rose-400',
      glowClass: 'shadow-rose-500/20',
      color: '#f43f5e',
      icon: Trash2,
    },
  ], [breakdown, fileCounts]);

  // Active segments in the progress bar (only categories with > 0 bytes)
  const activeSegments = categories.filter((c) => c.bytes > 0);

  // Category currently selected/hovered for tooltip
  const activeTooltipCat = categories.find((c) => c.key === hoveredCategoryKey);

  const handleCategoryClick = (cat: typeof categories[0]) => {
    if (cat.key === 'trash') {
      setActiveTab('trash');
    } else if (cat.key === 'images') {
      setActiveTab('photos');
    } else if (cat.key === 'videos') {
      setActiveTab('videos');
    } else {
      if (onSelectCategory) {
        onSelectCategory(cat.category);
      }
      setActiveTab('files');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 md:p-7 shadow-2xl backdrop-blur-xl">
      {/* Background soft ambient gradient */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Quota Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-400 tracking-wider uppercase flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Target Capacity Tier</span>
            </span>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-zinc-500 hover:text-zinc-300 transition"
              title="Storage Calculation Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-baseline gap-3 mt-1.5">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {formatBytes(totalUsedBytes, useBinary)}
            </h2>
            <span className="text-xs md:text-sm text-zinc-400 font-medium">
              of {formatBytes(maxQuotaBytes, useBinary)} target capacity
            </span>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 font-semibold text-[11px]">
              {files.length} {files.length === 1 ? 'File' : 'Files'} Stored
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 font-semibold text-[11px]">
              {packagesCount} {packagesCount === 1 ? 'Package' : 'Packages'}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
              {formatBytes(remainingBytes, useBinary)} Remaining
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-[11px]">
              {usedPercent.toFixed(2)}% Used
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Decimal GB vs Binary GiB Selector */}
          <div className="flex items-center bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-1 text-xs">
            <button
              onClick={() => setUseBinary(false)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                !useBinary ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Decimal GB
            </button>
            <button
              onClick={() => setUseBinary(true)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                useBinary ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Binary GiB
            </button>
          </div>

          <button
            onClick={() => setActiveTab('cleanup')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-xs font-semibold text-zinc-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Cleanup</span>
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mb-5 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-2">
          <p className="font-semibold text-white">Authoritative Quota & Network Architecture</p>
          <p>
            INFCLOUD is provisioned with a target capacity of <strong className="text-white">988 GB (988,000,000,000 bytes)</strong>,
            which translates to <strong className="text-white">920.15 GiB</strong> under binary byte conversion.
          </p>
          <p className="text-zinc-400 text-[11px]">
            File transfers over your network or Wi-Fi are streamed with real-time Transferred MB (TMB) calculation and stored directly on the dedicated INFCLOUD high-speed server node with automatic cloud fallback.
          </p>
        </div>
      )}

      {/* Dynamic Hover/Tap Tooltip Display Area */}
      <div className="min-h-[52px] mb-2 flex items-center justify-between">
        {activeTooltipCat ? (
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 px-3.5 rounded-2xl bg-zinc-950/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-zinc-950"
                style={{ backgroundColor: activeTooltipCat.color, boxShadow: `0 0 10px ${activeTooltipCat.color}80` }}
              />
              <activeTooltipCat.icon className="w-4 h-4 text-zinc-300" />
              <span className="font-bold text-white text-xs md:text-sm">
                {activeTooltipCat.name}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 font-medium">
                {activeTooltipCat.count} {activeTooltipCat.count === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-white text-sm">
                  {formatBytes(activeTooltipCat.bytes, useBinary)}
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  ({activeTooltipCat.bytes.toLocaleString()} bytes)
                </span>
              </div>
              <span className="hidden md:inline text-zinc-600">·</span>
              <span className="font-semibold text-sky-400 font-mono text-xs">
                {getPercentOfUsed(activeTooltipCat.bytes).toFixed(1)}% of used
              </span>
              <span className="text-zinc-500 text-[11px] hidden lg:inline">
                ({getPercentOfQuota(activeTooltipCat.bytes).toFixed(3)}% of total tier)
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <PieChart className="w-4 h-4 text-sky-400/70 shrink-0" />
            <span>
              Hover or tap any category segment or legend item to view detailed storage consumption statistics.
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Usage Bar with Hover Tooltips */}
      <div className="relative w-full h-5 bg-zinc-950/90 rounded-full overflow-hidden border border-zinc-800/80 mb-5 p-0.5 select-none shadow-inner">
        <div className="flex h-full w-full rounded-full overflow-hidden">
          {activeSegments.length === 0 ? (
            <div className="h-full w-full bg-zinc-800/40 flex items-center justify-center text-[10px] text-zinc-500">
              No files uploaded yet
            </div>
          ) : (
            activeSegments.map((seg) => {
              const isHovered = hoveredCategoryKey === seg.key;
              const widthPercent = getPercentOfUsed(seg.bytes);

              return (
                <div
                  key={seg.key}
                  style={{ width: `${widthPercent}%` }}
                  className={`${seg.bgClass} h-full transition-all duration-200 cursor-pointer relative group ${
                    isHovered ? 'brightness-125 scale-y-125 z-10 shadow-lg' : 'hover:brightness-110'
                  }`}
                  onMouseEnter={() => setHoveredCategoryKey(seg.key)}
                  onMouseLeave={() => setHoveredCategoryKey(null)}
                  onClick={() => {
                    setHoveredCategoryKey(seg.key);
                    handleCategoryClick(seg);
                  }}
                  title={`${seg.name}: ${formatBytes(seg.bytes, useBinary)} (${widthPercent.toFixed(1)}%)`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Enhanced Category Legend Mapping Colors to File Categories */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300">
            Category Breakdown & Color Key
          </span>
          <span className="text-[11px] text-zinc-500">
            Click any category to filter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {categories.map((cat) => {
            const isHovered = hoveredCategoryKey === cat.key;
            const percent = getPercentOfUsed(cat.bytes);
            const Icon = cat.icon;

            return (
              <div
                key={cat.key}
                onMouseEnter={() => setHoveredCategoryKey(cat.key)}
                onMouseLeave={() => setHoveredCategoryKey(null)}
                onClick={() => handleCategoryClick(cat)}
                className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isHovered
                    ? `bg-zinc-800/90 ${cat.borderClass} ${cat.glowClass} shadow-lg scale-[1.02]`
                    : 'bg-zinc-950/50 border-zinc-800/70 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* Distinctive color indicator mapped to category */}
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 transition-transform ${
                      isHovered ? 'scale-125 ring-2 ring-white/40' : ''
                    }`}
                    style={{ backgroundColor: cat.color }}
                  />

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {cat.shortName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                      <span className="font-mono font-medium text-white">
                        {formatBytes(cat.bytes, useBinary)}
                      </span>
                      <span>·</span>
                      <span>{cat.count} {cat.count === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className={`text-[11px] font-mono font-bold ${isHovered ? cat.textClass : 'text-zinc-400'}`}>
                    {totalUsedBytes > 0 ? `${percent.toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Storage Stats */}
      <div className="mt-5 pt-4 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Available capacity:</span>
          <strong className="text-white font-mono">{formatBytes(remainingBytes, useBinary)}</strong>
          <span className="text-zinc-500">free</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{usedPercent.toFixed(2)}% consumed</span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Real-time Storage Active</span>
          </span>
        </div>
      </div>
    </div>
  );
};
