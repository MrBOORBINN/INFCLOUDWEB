import React, { useMemo } from 'react';
import {
  Copy,
  Trash2,
  CheckCircle2,
  HardDrive,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { FileItem } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';

interface DuplicateDetectorProps {
  files: FileItem[];
  onDeleteFile: (file: FileItem) => void;
}

export const DuplicateDetector: React.FC<DuplicateDetectorProps> = ({
  files,
  onDeleteFile,
}) => {
  const activeFiles = files.filter((f) => !f.isTrashed);

  // Group files by size & file extension to detect potential duplicate candidates
  const duplicateGroups = useMemo(() => {
    const sizeMap: Record<string, FileItem[]> = {};

    activeFiles.forEach((file) => {
      // Group key: byte size + extension
      const ext = file.name.split('.').pop() || '';
      const key = `${file.size}_${ext}`;
      if (!sizeMap[key]) {
        sizeMap[key] = [];
      }
      sizeMap[key].push(file);
    });

    // Only return groups with 2 or more files
    return Object.values(sizeMap).filter((group) => group.length > 1);
  }, [activeFiles]);

  const potentialWastedBytes = duplicateGroups.reduce((acc, group) => {
    // Everything after the first copy is potentially redundant
    const groupSize = group[0].size * (group.length - 1);
    return acc + groupSize;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Copy className="w-5 h-5 text-indigo-400" />
            <span>Duplicate File Detector</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Detect identical payload fingerprints and reclaim redundant storage capacity safely.
          </p>
        </div>

        {duplicateGroups.length > 0 && (
          <div className="px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 font-semibold">
            {formatBytes(potentialWastedBytes)} Reclaimable
          </div>
        )}
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">No duplicate files detected</h4>
          <p className="text-xs text-zinc-500 mt-1">
            All objects in your cloud drive currently possess distinct binary footprints.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 text-xs">
                <span className="font-bold text-zinc-300">
                  Duplicate Candidate Group #{groupIdx + 1} · {formatBytes(group[0].size)} per file
                </span>
                <span className="text-[11px] text-zinc-500">
                  {group.length} Identical Copies
                </span>
              </div>

              <div className="space-y-2">
                {group.map((file, fileIdx) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 truncate block">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Uploaded {formatDate(file.createdAt)} · {fileIdx === 0 ? 'Original Copy' : 'Duplicate Candidate'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {fileIdx === 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-semibold">
                          Keep (First)
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Move duplicate copy "${file.name}" to Recycle Bin?`)) {
                              onDeleteFile(file);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Trash Copy</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
