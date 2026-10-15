import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  Download,
  Database,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { validateAndParseCsv, fetchPreloadedDemoCsv, CsvParseResult } from '../../services/csvService';
import { useOperations } from '../../context/OperationsContext';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { importCsvData, showToast } = useOperations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleProcessCsvText = (text: string, name: string) => {
    setFileName(name);
    const result = validateAndParseCsv(text);
    setParseResult(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast('error', 'Invalid File Type', 'Please upload a comma-separated values (.csv) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = async () => {
    try {
      setIsLoadingDemo(true);
      const demoCsvText = await fetchPreloadedDemoCsv();
      handleProcessCsvText(demoCsvText, 'port_operations_demo.csv (Preloaded 60-Record Dataset)');
      showToast('info', 'Demo Dataset Loaded', 'Loaded 60 realistic correlated operational records.');
    } catch (err: any) {
      showToast('error', 'Failed to Load Demo', err.message || 'Could not fetch demo dataset.');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleApplyImport = () => {
    if (!parseResult || !parseResult.isValid || parseResult.vessels.length === 0) {
      showToast('error', 'Cannot Ingest', 'Please fix validation errors before importing data.');
      return;
    }

    importCsvData(parseResult.vessels, parseResult.berths);
    onClose();
  };

  const handleDownloadDemo = () => {
    window.open('/port_operations_demo.csv', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface rounded-3xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Port Operations CSV Ingestion</h2>
              <p className="text-xs text-text-muted">
                Import marine terminal telemetry, berth queues, and container moves into live predictive models.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-main">Quick Options:</span>
              <button
                onClick={handleLoadDemo}
                disabled={isLoadingDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDemo ? 'animate-spin' : ''}`} />
                <span>Load Preloaded Demo CSV (60 Records)</span>
              </button>
            </div>

            <button
              onClick={handleDownloadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-text-caption" />
              <span>Download Schema CSV Template</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-brand-teal bg-brand-teal/5 ring-4 ring-brand-teal/10'
                : 'border-border-subtle hover:border-brand-teal/60 hover:bg-surface-subtle/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-brand-teal shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-text-main">
                {fileName ? fileName : 'Click or drag and drop your operations CSV file here'}
              </p>
              <p className="text-xs text-text-muted">
                Requires standard 31-column schema (record_id, vessel_id, arrival_time, berth_id, etc.)
              </p>
            </div>
          </div>

          {/* Validation Result Box */}
          {parseResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-teal" />
                  Validation Summary
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    parseResult.isValid
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                  }`}
                >
                  {parseResult.isValid
                    ? `✓ Valid Schema (${parseResult.validRows} Records Ready)`
                    : `✕ Validation Failed (${parseResult.errors.length} Errors)`}
                </span>
              </div>

              {/* Error messages if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Schema Validation Errors ({parseResult.errors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-rose-700 max-h-36 overflow-y-auto">
                    {parseResult.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>
                        {err.row ? `Row ${err.row}: ` : ''}
                        {err.message}
                      </li>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <li className="font-semibold pt-1">
                        ...and {parseResult.errors.length - 10} more errors.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Operational Warnings / ETD Transparent Fallbacks ({parseResult.warnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 max-h-28 overflow-y-auto">
                    {parseResult.warnings.slice(0, 5).map((w, idx) => (
                      <li key={idx}>{w.message}</li>
                    ))}
                    {parseResult.warnings.length > 5 && (
                      <li className="font-semibold pt-1">
                        ...and {parseResult.warnings.length - 5} more warnings handled automatically.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Data Preview Table */}
              {parseResult.vessels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Parsed Dataset Preview (Showing first 5 of {parseResult.vessels.length} vessels):</span>
                    <span>All records include verified estimated ETD & turnaround duration</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface-subtle">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface/80 border-b border-border-subtle text-text-muted uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Vessel</th>
                          <th className="py-2.5 px-3">Arrival</th>
                          <th className="py-2.5 px-3">ETD</th>
                          <th className="py-2.5 px-3">Berth</th>
                          <th className="py-2.5 px-3">Cargo (TEU)</th>
                          <th className="py-2.5 px-3">Wait Hours</th>
                          <th className="py-2.5 px-3">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {parseResult.vessels.slice(0, 5).map(v => (
                          <tr key={v.id} className="hover:bg-surface/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-text-main">{v.name}</td>
                            <td className="py-2.5 px-3 text-text-muted">
                              {new Date(v.eta).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3">
                              {v.isEstimatedEtd ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20" title={v.etdRationale}>
                                  Est. {v.estimatedEtd ? new Date(v.estimatedEtd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                  Act. {new Date(v.etd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-text-main">{v.assignedBerth}</td>
                            <td className="py-2.5 px-3 text-text-muted">{v.teuCapacity.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-text-main">{v.predictedWaitHours}h</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  v.demurrageRisk === 'High'
                                    ? 'bg-rose-500/10 text-rose-700'
                                    : v.demurrageRisk === 'Medium'
                                    ? 'bg-amber-500/10 text-amber-700'
                                    : 'bg-emerald-500/10 text-emerald-700'
                                }`}
                              >
                                {v.demurrageRisk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface-subtle/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApplyImport}
            disabled={!parseResult || !parseResult.isValid || parseResult.vessels.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-md shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Import {parseResult?.validRows || 0} Records into Active Telemetry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
