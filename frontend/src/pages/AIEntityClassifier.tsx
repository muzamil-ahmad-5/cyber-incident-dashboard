import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Send,
  Layers,
  ArrowRight,
  Info,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  Database,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface ClassificationRecord {
  id: number;
  record_id: string;
  submitted_text: string;
  predicted_category: string;
  confidence_score: number;
  prevention_guidance: string;
  review_status: 'New' | 'Under Investigation' | 'Resolved' | 'False Positive';
  analyst_confirmed_status: 'Unconfirmed' | 'Confirmed Incident' | 'Benign Activity' | 'Inconclusive';
  analyst_notes: string;
  reviewer: string;
  model_disclaimer: string;
  created_at: string;
  updated_at: string;
}

interface SampleRecord {
  label: string;
  category: string;
  text: string;
  context: string;
}

interface ModelMetrics {
  task: string;
  warning: string;
  dataset_rows_original?: number;
  unique_text_rows_used?: number;
  number_of_classes?: number;
  classes?: string[];
  train_rows?: number;
  test_rows?: number;
  accuracy?: number;
  classification_report?: any;
}

export const AIEntityClassifier: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [analystNotes, setAnalystNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('Analyst');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  // Active or selected result
  const [activeRecord, setActiveRecord] = useState<ClassificationRecord | null>(null);

  // History & filtering
  const [records, setRecords] = useState<ClassificationRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState('All');
  const [confirmedFilter, setConfirmedFilter] = useState('All');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Samples & Metrics
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Status edit state for active record
  const [editReviewStatus, setEditReviewStatus] = useState<string>('New');
  const [editConfirmedStatus, setEditConfirmedStatus] = useState<string>('Unconfirmed');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Load samples and metrics on mount
  useEffect(() => {
    loadSamples();
    loadMetrics();
  }, []);

  // Reload records when filters or page changes
  useEffect(() => {
    loadRecords();
  }, [currentPage, reviewFilter, confirmedFilter]);

  const loadSamples = async () => {
    try {
      const data = await api.getMLSamples();
      setSamples(data || []);
    } catch (err) {
      console.error('Failed to load sample records:', err);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await api.getMLMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load model metrics:', err);
    }
  };

  const loadRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const res = await api.listMLRecords({
        page: currentPage,
        page_size: 10,
        search: searchQuery || undefined,
        review_status: reviewFilter !== 'All' ? reviewFilter : undefined,
        confirmed_status: confirmedFilter !== 'All' ? confirmedFilter : undefined,
      });
      setRecords(res.items || []);
      setTotalRecords(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRecords();
  };

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsClassifying(true);
    setClassificationError(null);
    try {
      const newRecord = await api.classifyText(inputText, analystNotes, reviewerName);
      setActiveRecord(newRecord);
      setEditReviewStatus(newRecord.review_status);
      setEditConfirmedStatus(newRecord.analyst_confirmed_status);
      setEditNotes(newRecord.analyst_notes || '');
      // Refresh list
      loadRecords();
    } catch (err: any) {
      setClassificationError(err.message || 'Classification request failed.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleApplySample = (sample: SampleRecord) => {
    setInputText(sample.text);
    setAnalystNotes(`Context: ${sample.context}`);
    setClassificationError(null);
  };

  const handleUpdateRecordStatus = async () => {
    if (!activeRecord) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateMLRecordStatus(activeRecord.record_id, {
        review_status: editReviewStatus,
        analyst_confirmed_status: editConfirmedStatus,
        analyst_notes: editNotes,
        reviewer: reviewerName,
      });
      setActiveRecord(updated);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      loadRecords();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'malware':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'vulnerability':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'threat-actor':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'attack-pattern':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'tools':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'url':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  const getReviewStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'Under Investigation':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'False Positive':
        return 'bg-slate-700/40 text-slate-400 border-slate-600/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const getConfirmedStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Confirmed Incident':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Benign Activity':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Inconclusive':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Unconfirmed':
      default:
        return 'bg-slate-800/80 text-slate-400 border-slate-700/60';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                AI Entity Classifier & Prevention Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                  TF-IDF + LinearSVC
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Baseline cybersecurity text entity classification with curated prevention guidance and analyst verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMetricsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition shadow-sm hover:border-slate-600"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            Model Metrics & Report
          </button>
        </div>
      </div>

      {/* Critical Limitation Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-300">
            CRITICAL DATA & MODEL LIMITATION (ACADEMIC SOC NOTICE):
          </p>
          <p className="text-amber-200/90 leading-relaxed">
            The trained model classifies <strong>cybersecurity text entities</strong> (e.g. <code>malware</code>, <code>vulnerability</code>, <code>threat-actor</code>) from unstructured alert strings. It does <strong>NOT</strong> detect network intrusions or distinguish benign vs. malicious traffic. <strong>No automated destructive responses (e.g. blocking IPs, isolating assets, or locking accounts) are permitted based solely on ML predictions.</strong> Human analyst triage and confirmation are strictly mandatory.
          </p>
        </div>
      </div>

      {/* Main 2-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text Input & Classify Form */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Cybersecurity Alert / Description Input
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                {inputText.length} characters
              </span>
            </div>

            {/* Quick Safe Samples Pills */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Load Verified Sample Records:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {samples.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySample(s)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40 transition flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleClassify} className="space-y-4">
              <div>
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste raw security incident text, threat report snippet, or alert description here..."
                  className="w-full bg-[#070B14] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition resize-none font-mono leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Analyst Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    placeholder="e.g. Found on perimeter proxy log"
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Analyst Name
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="SOC Analyst"
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {classificationError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {classificationError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setAnalystNotes('');
                    setClassificationError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800/50 transition"
                >
                  Clear Form
                </button>

                <button
                  type="submit"
                  disabled={isClassifying || !inputText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClassifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Classifying Text...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Classify Text & Store
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Prediction Results & Curated Guidance */}
        <div className="lg:col-span-6 space-y-5">
          {activeRecord ? (
            <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              {/* Result Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {activeRecord.record_id}
                  </span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(activeRecord.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-semibold uppercase border ${getCategoryBadgeClass(
                      activeRecord.predicted_category
                    )}`}
                  >
                    {activeRecord.predicted_category}
                  </span>
                </div>
              </div>

              {/* Submitted Text Snippet */}
              <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto">
                <span className="text-slate-500 font-bold block mb-1">SUBMITTED TEXT:</span>
                "{activeRecord.submitted_text}"
              </div>

              {/* Curated Rule-Based Prevention Guidance */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    Curated Defensive Prevention Guidance
                  </div>
                  <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Rule-Based Knowledge Base
                  </span>
                </div>

                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto pr-1">
                  {activeRecord.prevention_guidance}
                </div>
              </div>

              {/* Human Analyst Review & Confirmation Section */}
              <div className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Analyst Review & Ground-Truth Confirmation
                  </div>
                  {updateSuccess && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Saved to SQLite
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  Strictly separate the ML model's text prediction from your confirmed incident diagnosis.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Review Progress Status
                    </label>
                    <select
                      value={editReviewStatus}
                      onChange={(e) => setEditReviewStatus(e.target.value)}
                      className="w-full bg-[#0A0F1D] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="New">New</option>
                      <option value="Under Investigation">Under Investigation</option>
                      <option value="Resolved">Resolved</option>
                      <option value="False Positive">False Positive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Analyst-Confirmed Status
                    </label>
                    <select
                      value={editConfirmedStatus}
                      onChange={(e) => setEditConfirmedStatus(e.target.value)}
                      className="w-full bg-[#0A0F1D] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="Unconfirmed">Unconfirmed</option>
                      <option value="Confirmed Incident">Confirmed Incident</option>
                      <option value="Benign Activity">Benign Activity</option>
                      <option value="Inconclusive">Inconclusive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Analyst Investigative Notes & Findings
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Document forensic indicators, triage verification, or justification..."
                    className="w-full bg-[#0A0F1D] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleUpdateRecordStatus}
                    disabled={isUpdatingStatus}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Analyst Review
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0A0F1D] border border-dashed border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-3">
              <BrainCircuit className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="text-sm font-semibold text-slate-400">No Classification Active</div>
              <p className="text-xs max-w-sm mx-auto text-slate-500 leading-relaxed">
                Submit an alert description from the left or select a previous record from the table below to inspect its predicted entity category and defensive playbooks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submissions & Classification Audit Table */}
      <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              SQLite Classification Records & Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent records of submitted texts, model predictions, review progress, and analyst confirmation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search text or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#070B14] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 w-44 sm:w-52"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </form>

            {/* Filter by Review Status */}
            <select
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Review Statuses</option>
              <option value="New">New</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Resolved">Resolved</option>
              <option value="False Positive">False Positive</option>
            </select>

            {/* Filter by Confirmed Status */}
            <select
              value={confirmedFilter}
              onChange={(e) => {
                setConfirmedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#070B14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Confirmed States</option>
              <option value="Unconfirmed">Unconfirmed</option>
              <option value="Confirmed Incident">Confirmed Incident</option>
              <option value="Benign Activity">Benign Activity</option>
              <option value="Inconclusive">Inconclusive</option>
            </select>

            <button
              onClick={() => {
                setCurrentPage(1);
                loadRecords();
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-700/80"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Predicted Entity</th>
                <th className="py-2.5 px-3">Submitted Text Preview</th>
                <th className="py-2.5 px-3">Review Status</th>
                <th className="py-2.5 px-3">Analyst Confirmed</th>
                <th className="py-2.5 px-3">Reviewer</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading records from SQLite...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No classification records found matching the current filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-800/30 transition cursor-pointer ${
                      activeRecord?.id === r.id ? 'bg-cyan-500/5 border-l-2 border-l-cyan-400' : ''
                    }`}
                    onClick={() => {
                      setActiveRecord(r);
                      setEditReviewStatus(r.review_status);
                      setEditConfirmedStatus(r.analyst_confirmed_status);
                      setEditNotes(r.analyst_notes || '');
                    }}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {r.record_id}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase border ${getCategoryBadgeClass(
                          r.predicted_category
                        )}`}
                      >
                        {r.predicted_category}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-300" title={r.submitted_text}>
                      {r.submitted_text}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getReviewStatusBadgeClass(
                          r.review_status
                        )}`}
                      >
                        {r.review_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getConfirmedStatusBadgeClass(
                          r.analyst_confirmed_status
                        )}`}
                      >
                        {r.analyst_confirmed_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {r.reviewer || 'Analyst'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRecord(r);
                          setEditReviewStatus(r.review_status);
                          setEditConfirmedStatus(r.analyst_confirmed_status);
                          setEditNotes(r.analyst_notes || '');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] flex items-center gap-1 ml-auto"
                      >
                        View & Triage <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing {records.length} of {totalRecords} classification records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
            >
              Previous
            </button>
            <span className="font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Model Performance & Evaluation Metrics Modal */}
      {showMetricsModal && metrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Baseline Text Classifier Metrics & Architecture
                </h3>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {(Number(metrics.accuracy || 0) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Classes</div>
                  <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                    {metrics.number_of_classes || metrics.classes?.length || 14}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Train Rows</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {metrics.train_rows || 311}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Test Rows</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {metrics.test_rows || 78}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white mb-1.5">Entity Categories Trained (14):</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(metrics.classes || []).map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <p className="font-bold text-amber-300 mb-1">
                  Why is this a text entity classifier and not an attack detector?
                </p>
                <p className="text-amber-200/90 leading-relaxed text-[11px]">
                  The source dataset (<code>cybersecurity_entities.csv</code>) labels mentions of entities in security blogs and advisories (e.g., naming an actor like APT37 or a malware like Gh0stRat). It does not contain benign baseline server traffic or packet flows. Therefore, it categorizes text but cannot confirm whether network activity is malicious.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                <p className="font-bold text-cyan-300 mb-1">
                  Next Phase Pipeline: CICIDS2017 Network Intrusion Detection
                </p>
                <p className="text-cyan-200/90 leading-relaxed text-[11px]">
                  A dedicated network flow pipeline has been prepared in <code>scripts/train_network_intrusion_cicids2017.py</code>. It models 78 bidirectional flow telemetry features (packet size variance, inter-arrival times, TCP flags) to accurately differentiate true <code>BENIGN</code> network traffic from attacks (DDoS, PortScan, Brute Force).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowMetricsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIEntityClassifier;
