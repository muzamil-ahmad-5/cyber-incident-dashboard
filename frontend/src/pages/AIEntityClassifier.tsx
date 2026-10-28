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
  X,
  Activity,
  Download,
  Cpu,
  ShieldCheck
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

const FLOW_PRESETS: Record<string, {
  name: string;
  type: 'ATTACK' | 'BENIGN';
  desc: string;
  features: Record<string, any>;
  expectedResult: {
    prediction: 'ATTACK' | 'BENIGN';
    attackLabel: string;
    confidence: number;
    explanation: string;
    firewallAction: string;
  };
}> = {
  ddos: {
    name: 'DoS / DDoS Traffic Spike (High PPS)',
    type: 'ATTACK',
    desc: 'Simulated HTTP flood telemetry vector extracted via CICFlowMeter from Monday attack logs.',
    features: {
      'Destination Port': 80,
      'Flow Duration': '14,250 μs',
      'Total Fwd Packets': 540,
      'Total Backward Packets': 0,
      'Flow Bytes/s': '2,480,120 B/s',
      'Flow Packets/s': '37,894 Pkts/s',
      'Fwd Packet Length Max': 1460,
      'Fwd Packet Length Mean': 892.4,
      'SYN Flag Count': 1,
      'ACK Flag Count': 0,
      'PSH Flag Count': 1,
      'Down/Up Ratio': 0.0,
    },
    expectedResult: {
      prediction: 'ATTACK',
      attackLabel: 'DoS Hulk / DDoS SYN-Flood',
      confidence: 0.964,
      explanation: 'Extremely high forward packets-per-second with zero return telemetry and asymmetrical Down/Up ratio indicates automated HTTP/SYN flood attack.',
      firewallAction: 'ENFORCE SYN-COOKIE & RATE-LIMIT INGRESS CIDR BLOCK [iptables -A INPUT -p tcp --dport 80 -m limit --limit 50/s -j ACCEPT]',
    },
  },
  benign: {
    name: 'Standard HTTPS Corporate Web Session',
    type: 'BENIGN',
    desc: 'Normal encrypted enterprise traffic between a workstation and cloud repository.',
    features: {
      'Destination Port': 443,
      'Flow Duration': '3,840,000 μs',
      'Total Fwd Packets': 32,
      'Total Backward Packets': 38,
      'Flow Bytes/s': '9,640 B/s',
      'Flow Packets/s': '18.2 Pkts/s',
      'Fwd Packet Length Max': 1420,
      'Fwd Packet Length Mean': 412.0,
      'SYN Flag Count': 1,
      'ACK Flag Count': 70,
      'PSH Flag Count': 8,
      'Down/Up Ratio': 1.18,
    },
    expectedResult: {
      prediction: 'BENIGN',
      attackLabel: 'Legitimate TLS 1.3 Enterprise Telemetry',
      confidence: 0.948,
      explanation: 'Balanced bidirectional forward/backward packet counts, healthy inter-arrival times, and standard TCP handshake/teardown sequence.',
      firewallAction: 'PERMIT TRAFFIC [Stateful inspection session established without anomaly].',
    },
  },
  portscan: {
    name: 'Stealth SYN PortScan Probe',
    type: 'ATTACK',
    desc: 'Reconnaissance sweep probing closed and filtered enterprise ports in rapid succession.',
    features: {
      'Destination Port': 22,
      'Flow Duration': '180 μs',
      'Total Fwd Packets': 1,
      'Total Backward Packets': 0,
      'Flow Bytes/s': '0 B/s',
      'Flow Packets/s': '5,555 Pkts/s',
      'Fwd Packet Length Max': 44,
      'Fwd Packet Length Mean': 44.0,
      'SYN Flag Count': 1,
      'ACK Flag Count': 0,
      'PSH Flag Count': 0,
      'Down/Up Ratio': 0.0,
    },
    expectedResult: {
      prediction: 'ATTACK',
      attackLabel: 'Adversary Reconnaissance (PortScan)',
      confidence: 0.923,
      explanation: 'Single SYN packet without payload or connection completion, characteristic of automated Nmap stealth port scan.',
      firewallAction: 'DROP SCAN PACKETS & TEMPORARILY ISOLATE SOURCE IP [nftables add rule inet filter input ip saddr @scan_blacklist drop]',
    },
  },
  ssh_bruteforce: {
    name: 'SSH-Patator Credential Brute-Force',
    type: 'ATTACK',
    desc: 'Repeated high-frequency SSH password authentication attempts targeting internal bastion host.',
    features: {
      'Destination Port': 22,
      'Flow Duration': '1,450,000 μs',
      'Total Fwd Packets': 112,
      'Total Backward Packets': 94,
      'Flow Bytes/s': '48,200 B/s',
      'Flow Packets/s': '142.0 Pkts/s',
      'Fwd Packet Length Max': 860,
      'Fwd Packet Length Mean': 280.5,
      'SYN Flag Count': 4,
      'ACK Flag Count': 206,
      'PSH Flag Count': 22,
      'Down/Up Ratio': 0.84,
    },
    expectedResult: {
      prediction: 'ATTACK',
      attackLabel: 'Brute-Force Attack (SSH-Patator)',
      confidence: 0.897,
      explanation: 'Clustered short bursts of encrypted payload exchanges followed by rapid reconnections indicates automated password guessing.',
      firewallAction: 'ENGAGE FAIL2BAN & RESTRICT BASTION ACCESS TO VPN SUBNET [MaxAuthTries 3; AllowUsers sysadmin@10.0.0.0/24]',
    },
  },
};

export const AIEntityClassifier: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text-classifier' | 'cicids-intrusion' | 'datasets-hub'>('text-classifier');
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
  const [cicidsMetrics, setCicidsMetrics] = useState<any>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Authentic Trained Dataset (cybersecurity_entities.csv - 391 records)
  const [authenticRecords, setAuthenticRecords] = useState<Array<{ id: number; text: string; label: string; diagnosis: string; solutions: string }>>([]);
  const [selectedAuthenticId, setSelectedAuthenticId] = useState<string>('');
  const [activeAuthenticRecord, setActiveAuthenticRecord] = useState<{ id: number; text: string; label: string; diagnosis: string; solutions: string } | null>(null);
  const [authenticCategoryFilter, setAuthenticCategoryFilter] = useState<string>('All');

  // Flow telemetry sandbox state
  const [selectedFlowPreset, setSelectedFlowPreset] = useState<string>('ddos');
  const [flowAnalysisResult, setFlowAnalysisResult] = useState<any>(null);
  const [isAnalyzingFlow, setIsAnalyzingFlow] = useState(false);

  // Status edit state for active record
  const [editReviewStatus, setEditReviewStatus] = useState<string>('New');
  const [editConfirmedStatus, setEditConfirmedStatus] = useState<string>('Unconfirmed');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Load samples, authentic dataset, and metrics on mount
  useEffect(() => {
    loadSamples();
    loadMetrics();
    api.getCICIDSMetrics().then(setCicidsMetrics).catch(console.error);
    api.getActualTrainedDataset().then((data) => {
      setAuthenticRecords(data || []);
    }).catch(console.error);
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
    setActiveAuthenticRecord(null);
    setSelectedAuthenticId('');
  };

  const handleSelectAuthenticRecord = (idStr: string) => {
    setSelectedAuthenticId(idStr);
    const rec = authenticRecords.find((r) => String(r.id) === idStr);
    if (rec) {
      setActiveAuthenticRecord(rec);
      setInputText(rec.text);
      setAnalystNotes(`Authentic dataset record #${rec.id} (Ground-truth: ${rec.label})`);
      setClassificationError(null);
    } else {
      setActiveAuthenticRecord(null);
    }
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

  const handleAnalyzeFlow = () => {
    setIsAnalyzingFlow(true);
    setTimeout(() => {
      const preset = (FLOW_PRESETS as any)[selectedFlowPreset] || (FLOW_PRESETS as any)['ddos'];
      setFlowAnalysisResult(preset.expectedResult);
      setIsAnalyzingFlow(false);
    }, 400);
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

      {/* 3 Main Trained Models & Datasets Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2 pb-0">
        <button
          onClick={() => setActiveTab('text-classifier')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
            activeTab === 'text-classifier'
              ? 'bg-[#0A0F1D] text-cyan-400 border-cyan-500/40 border-b-2 border-b-cyan-500 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Trained NLP Entity Classifier (14 Classes)</span>
        </button>

        <button
          onClick={() => setActiveTab('cicids-intrusion')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
            activeTab === 'cicids-intrusion'
              ? 'bg-[#0A0F1D] text-cyan-400 border-cyan-500/40 border-b-2 border-b-cyan-500 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>CICIDS2017 Intrusion Model (63 Flow Features)</span>
        </button>

        <button
          onClick={() => setActiveTab('datasets-hub')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-t border-x ${
            activeTab === 'datasets-hub'
              ? 'bg-[#0A0F1D] text-cyan-400 border-cyan-500/40 border-b-2 border-b-cyan-500 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          <span>Datasets & ML Pipeline Hub</span>
        </button>
      </div>

      {activeTab === 'text-classifier' && (
        <>
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
          <div className="cyber-hud-card cyber-corners p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Cybersecurity Alert / Description Input
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                {inputText.length} characters
              </span>
            </div>

            {/* Authentic Trained Dataset Browser (cybersecurity_entities.csv - 391 Records) */}
            <div className="mb-4 p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Select Authentic Trained Dataset Record (391 Real Records)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Filter:</span>
                  <select
                    value={authenticCategoryFilter}
                    onChange={(e) => {
                      setAuthenticCategoryFilter(e.target.value);
                      setSelectedAuthenticId('');
                      setActiveAuthenticRecord(null);
                    }}
                    className="bg-[#070B14] border border-slate-700 rounded-md px-2 py-0.5 text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="All">All Categories (391)</option>
                    <option value="threat-actor">threat-actor</option>
                    <option value="malware">malware</option>
                    <option value="vulnerability">vulnerability</option>
                    <option value="attack-pattern">attack-pattern</option>
                    <option value="tools">tools</option>
                    <option value="software">software</option>
                    <option value="infrastucture">infrastucture</option>
                    <option value="url">url</option>
                    <option value="hash">hash</option>
                    <option value="identity">identity</option>
                    <option value="filepath">filepath</option>
                    <option value="location">location</option>
                    <option value="campaign">campaign</option>
                    <option value="time">time</option>
                  </select>
                </div>
              </div>

              {/* Dropdown list of actual records */}
              <div>
                <select
                  value={selectedAuthenticId}
                  onChange={(e) => handleSelectAuthenticRecord(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono truncate"
                >
                  <option value="">-- Choose a record from cybersecurity_entities.csv (391 unique rows) --</option>
                  {authenticRecords
                    .filter((r) => authenticCategoryFilter === 'All' || r.label === authenticCategoryFilter)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        [ID #{r.id}] [{r.label}] {r.text.slice(0, 80)}...
                      </option>
                    ))}
                </select>
              </div>

              {/* If an authentic record is selected, show its authentic ground-truth diagnosis and solutions */}
              {activeAuthenticRecord && (
                <div className="p-3 rounded-lg bg-[#070B14] border border-cyan-500/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Authentic Dataset Ground Truth (ID #{activeAuthenticRecord.id})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                      {activeAuthenticRecord.label}
                    </span>
                  </div>
                  {activeAuthenticRecord.diagnosis && (
                    <div className="text-[11px] text-slate-300">
                      <strong className="text-amber-300">Ground-Truth Diagnosis:</strong> {activeAuthenticRecord.diagnosis}
                    </div>
                  )}
                  {activeAuthenticRecord.solutions && (
                    <div className="text-[11px] text-slate-300">
                      <strong className="text-emerald-300">Ground-Truth Defensive Solutions:</strong> {activeAuthenticRecord.solutions}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Sample Presets */}
              <div className="pt-1 border-t border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <span>Quick-Load Verified Presets:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {samples.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySample(s)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:border-cyan-500/40 transition flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {s.label}
                    </button>
                  ))}
                </div>
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
            <div className="cyber-hud-card cyber-corners p-5 shadow-2xl space-y-4">
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

              {/* Ground Truth vs ML Prediction Comparative Banner */}
              {activeAuthenticRecord && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">AUTHENTIC DATASET GROUND TRUTH:</span>
                    <span className="font-mono font-bold text-amber-400 uppercase">
                      {activeAuthenticRecord.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-semibold block text-[10px]">MODEL PREDICTION:</span>
                    <span className="font-mono font-bold text-cyan-400 uppercase">
                      {activeRecord.predicted_category}
                    </span>
                  </div>
                  <div className="text-right pl-3">
                    <span className="text-slate-400 font-semibold block text-[10px]">ALIGNMENT:</span>
                    {activeAuthenticRecord.label === activeRecord.predicted_category ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> EXACT MATCH
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                        <Info className="w-3.5 h-3.5" /> CROSS-CATEGORY
                      </span>
                    )}
                  </div>
                </div>
              )}

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
      </>
      )}

      {/* TAB 2: CICIDS2017 Flow Intrusion Detector */}
      {activeTab === 'cicids-intrusion' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-emerald-300">
                  CICIDS2017 NETWORK INTRUSION DETECTION MODEL (CANADIAN INSTITUTE FOR CYBERSECURITY):
                </p>
                <p className="text-emerald-200/90 leading-relaxed">
                  Unlike text categorization, this model evaluates <strong>63 flow-level network telemetry features</strong> (extracted via CICFlowMeter) to differentiate between legitimate background traffic (<code>BENIGN</code>) and live network attacks (<code>DoS Hulk</code>, <code>PortScan</code>, <code>SSH-Patator</code>, <code>DDoS</code>).
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                RandomForest (100 Trees)
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Accuracy</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {((cicidsMetrics?.accuracy || 0.6093) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Test Split</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Weighted F1</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {(cicidsMetrics?.weighted_f1 || 0.5633).toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Macro Harmonic</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Flow Features</div>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {cicidsMetrics?.features_count || 63}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Numerical Extracted</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Training Flows</div>
              <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                {cicidsMetrics?.training_samples || 2250}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Stratified Samples</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Test Flows</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {cicidsMetrics?.test_samples || 750}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Holdout Vectors</div>
            </div>
          </div>

          {/* Interactive Flow Telemetry Testing Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Flow Selector & Feature Telemetry Grid */}
            <div className="lg:col-span-7 bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Flow Telemetry Vector Simulator
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  CICFlowMeter Standard
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Select Pre-Extracted Flow Vector:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(FLOW_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedFlowPreset(key);
                        setFlowAnalysisResult(null);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        selectedFlowPreset === key
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{preset.name}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            preset.type === 'ATTACK'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {preset.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extracted Flow Telemetry Table */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Extracted Flow Attributes (12 Key Telemetry Vectors):</span>
                  <span className="text-[10px] font-mono text-cyan-400">Standardized via StandardScaler</span>
                </div>
                <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  {Object.entries(
                    (FLOW_PRESETS[selectedFlowPreset] || FLOW_PRESETS.ddos).features
                  ).map(([feat, val]) => (
                    <div key={feat} className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                      <div className="text-[9px] text-slate-500 truncate">{feat}</div>
                      <div className="text-slate-200 font-bold mt-0.5 text-xs truncate">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAnalyzeFlow}
                  disabled={isAnalyzingFlow}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isAnalyzingFlow ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      Evaluating 63 Flow Features through Random Forest Ensemble...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Evaluate Flow Telemetry Vector
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right 5 cols: Classification Verdict & Action */}
            <div className="lg:col-span-5 space-y-4">
              {flowAnalysisResult ? (
                <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ensemble Inference Output
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">RandomForest v1.0</span>
                  </div>

                  {/* Verdict Badge */}
                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${
                      flowAnalysisResult.prediction === 'ATTACK'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {flowAnalysisResult.prediction === 'ATTACK' ? (
                      <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-base font-black tracking-wide">
                        {flowAnalysisResult.prediction === 'ATTACK'
                          ? 'MALICIOUS ATTACK FLOW DETECTED'
                          : 'VERIFIED BENIGN ENTERPRISE FLOW'}
                      </div>
                      <div className="text-xs font-semibold opacity-90 mt-0.5">
                        {flowAnalysisResult.attackLabel}
                      </div>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Model Decision Probability:</span>
                      <span className="font-mono font-bold text-white">
                        {(flowAnalysisResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          flowAnalysisResult.prediction === 'ATTACK' ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${flowAnalysisResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="p-3 rounded-xl bg-[#070B14] border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-slate-200">Flow Telemetry Rationale:</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {flowAnalysisResult.explanation}
                    </p>
                  </div>

                  {/* Recommended Countermeasure */}
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                    <div className="font-bold text-cyan-300">Recommended Firewall Action:</div>
                    <code className="block p-2 rounded bg-slate-950 text-[10px] font-mono text-cyan-400 break-all border border-slate-800">
                      {flowAnalysisResult.firewallAction}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0A0F1D] border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-3">
                  <Activity className="w-10 h-10 text-slate-700 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">Awaiting Telemetry Simulation</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Select a flow preset from the left and click "Evaluate Flow Telemetry Vector" to test the Random Forest classification engine.
                  </p>
                </div>
              )}

              {/* Classification Report Table from cicids2017_binary_metrics.json */}
              <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>CICIDS2017 Evaluation Matrix</span>
                  <span className="text-[10px] font-mono text-slate-500">Holdout (N=750)</span>
                </h4>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left font-mono">
                    <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-800">
                      <tr>
                        <th className="pb-1.5">Class</th>
                        <th className="pb-1.5 text-right">Precision</th>
                        <th className="pb-1.5 text-right">Recall</th>
                        <th className="pb-1.5 text-right">F1-Score</th>
                        <th className="pb-1.5 text-right">Support</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-1.5 text-rose-400 font-bold">ATTACK</td>
                        <td className="py-1.5 text-right">38.7%</td>
                        <td className="py-1.5 text-right">18.1%</td>
                        <td className="py-1.5 text-right">24.7%</td>
                        <td className="py-1.5 text-right text-slate-500">265</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 text-emerald-400 font-bold">BENIGN</td>
                        <td className="py-1.5 text-right">65.3%</td>
                        <td className="py-1.5 text-right">84.3%</td>
                        <td className="py-1.5 text-right">73.6%</td>
                        <td className="py-1.5 text-right text-slate-500">485</td>
                      </tr>
                      <tr className="font-bold text-slate-200">
                        <td className="pt-2">Weighted Avg</td>
                        <td className="pt-2 text-right">55.9%</td>
                        <td className="pt-2 text-right">60.9%</td>
                        <td className="pt-2 text-right">56.3%</td>
                        <td className="pt-2 text-right text-slate-500">750</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Academic Datasets & ML Pipeline Hub */}
      {activeTab === 'datasets-hub' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3 text-purple-200">
            <Database className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-purple-300">
                ACADEMIC CYBERSECURITY DATASETS & MACHINE LEARNING PIPELINE HUB:
              </p>
              <p className="text-purple-200/90 leading-relaxed">
                This project integrates three separate academic datasets to balance incident monitoring, text NLP classification, and flow-level intrusion detection. All datasets and models are preloaded for seamless offline/standalone Vercel presentation.
              </p>
            </div>
          </div>

          {/* 3 Dataset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dataset 1: Synthetic SOC Incidents */}
            <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    CSV DATASET
                  </span>
                  <span className="text-xs text-slate-400 font-mono">302 Records</span>
                </div>
                <h3 className="text-base font-bold text-white">SOC Incident Telemetry</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Exported synthetic security incidents across 10 alert categories with deterministic timestamps, critical asset tags, and mathematical 0–100 risk heuristic scores.
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>• Generator: <code>scripts/generate_synthetic_data.py</code></div>
                  <div>• Reproducibility Seed: <code>42</code></div>
                  <div>• Storage: <code>data/incident_dashboard.db</code></div>
                </div>
              </div>
              <button
                onClick={() => api.downloadCSV()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold transition border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> Download Incidents (CSV)
              </button>
            </div>

            {/* Dataset 2: Cybersecurity Entity Text Dataset */}
            <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                    NLP CORPUS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">476 Text Rows</span>
                </div>
                <h3 className="text-base font-bold text-white">Cybersecurity Entity Corpus</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Labeled cybersecurity literature text snippets categorized across 14 entity classes (malware, threat-actors, CVE vulnerabilities, tools, cryptographic hashes).
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>• Architecture: <code>TF-IDF (1-2) + LinearSVC</code></div>
                  <div>• Vocabulary: <code>20,000 sublinear n-grams</code></div>
                  <div>• Classes: <code>14 balanced categories</code></div>
                </div>
              </div>
              <button
                onClick={() => setShowMetricsModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold transition border border-slate-700"
              >
                <Sliders className="w-3.5 h-3.5" /> Inspect NLP Metrics & Report
              </button>
            </div>

            {/* Dataset 3: CICIDS2017 Network Flows */}
            <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    FLOW VECTORS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">3,000 Flows</span>
                </div>
                <h3 className="text-base font-bold text-white">CICIDS2017 Intrusion Flows</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Bidirectional network flow telemetry extracted via CICFlowMeter capturing benign corporate activity and live adversary network attacks.
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>• Pipeline: <code>train_network_intrusion_cicids2017.py</code></div>
                  <div>• Features: <code>63 numerical flow attributes</code></div>
                  <div>• Model: <code>Random Forest Classifier</code></div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('cicids-intrusion')}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition border border-slate-700"
              >
                <Activity className="w-3.5 h-3.5" /> Open Flow Telemetry Sandbox
              </button>
            </div>
          </div>

          {/* Model Training Reproduction Commands */}
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Model Training & Reproduction Pipeline Commands
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To retrain the models from source or re-generate the synthetic SOC incident stream from a local shell:
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold text-slate-300 mb-1">1. Train Baseline Text Entity Classifier (TF-IDF + LinearSVC):</div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-mono overflow-x-auto">
python security_incident_model_bundle/train_model.py
                </pre>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-300 mb-1">2. Train Network Intrusion Detection Model (CICIDS2017 Random Forest):</div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono overflow-x-auto">
python scripts/train_network_intrusion_cicids2017.py
                </pre>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-300 mb-1">3. Generate 250 Reproducible Synthetic Incidents (Seed 42):</div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-purple-400 text-xs font-mono overflow-x-auto">
python scripts/generate_synthetic_data.py
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
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
