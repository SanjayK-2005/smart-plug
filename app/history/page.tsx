'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = 'https://smarthublite.vercel.app';

interface HistoryData {
  data: {
    relay?: string;
    voltage?: string;
    current?: string;
    power?: string;
    energy?: string;
  };
  timestamp: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/device/history?device_id=smart_plug&page=${currentPage}&limit=${LIMIT}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (mounted) {
          setHistory(Array.isArray(data) ? data : []);
          setHasMore(Array.isArray(data) && data.length === LIMIT);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 10000);

    fetchHistory();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
    };
  }, [currentPage]);

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'on') return item.data.relay === 'ON';
    if (filter === 'off') return item.data.relay === 'OFF';
    return true;
  });

  const currentItems = filteredHistory;
  const startIndex = (currentPage - 1) * LIMIT;

  // Calculate statistics
  const stats = {
    totalRecords: history.length,
    avgVoltage: history.length ? (history.reduce((sum, item) => sum + parseFloat(item.data.voltage || '0'), 0) / history.length).toFixed(2) : '0',
    avgPower: history.length ? (history.reduce((sum, item) => sum + parseFloat(item.data.power || '0'), 0) / history.length).toFixed(2) : '0',
    maxPower: history.length ? Math.max(...history.map(item => parseFloat(item.data.power || '0'))).toFixed(2) : '0',
    onCount: history.filter(item => item.data.relay === 'ON').length,
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="pulse-ring"></div>
        <div className="loading-text">LOADING HISTORY</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="hex-bg"></div>
      
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-hex"></div>
            <div>
              <h1 className="logo-title">HISTORY</h1>
              <div className="logo-subtitle">DATA ARCHIVE</div>
            </div>
          </div>
          <div className="header-right">
            <ThemeToggle />
            <Link href="/" className="back-button">
              ← BACK TO DASHBOARD
            </Link>
          </div>
        </div>
      </header>

      <main className="history-main">
        {/* Statistics Cards */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">TOTAL RECORDS</div>
            <div className="stat-value">{stats.totalRecords}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">AVG VOLTAGE</div>
            <div className="stat-value">{stats.avgVoltage}V</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">AVG POWER</div>
            <div className="stat-value">{stats.avgPower}W</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">PEAK POWER</div>
            <div className="stat-value">{stats.maxPower}W</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ON TIME</div>
            <div className="stat-value">{((stats.onCount / stats.totalRecords) * 100).toFixed(1)}%</div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="filter-section">
          <div className="filter-header">
            <div>
              <div className="filter-label">FILTER BY STATUS:</div>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  ALL ({history.length})
                </button>
                <button 
                  className={`filter-btn ${filter === 'on' ? 'active' : ''}`}
                  onClick={() => setFilter('on')}
                >
                  ON ({history.filter(h => h.data.relay === 'ON').length})
                </button>
                <button 
                  className={`filter-btn ${filter === 'off' ? 'active' : ''}`}
                  onClick={() => setFilter('off')}
                >
                  OFF ({history.filter(h => h.data.relay === 'OFF').length})
                </button>
              </div>
            </div>
            <div className="pagination-info">
              Page {currentPage} · Showing {filteredHistory.length} records
            </div>
          </div>
        </section>

        {/* History Table */}
        <section className="history-table-section">
          <div className="table-header">
            <div className="table-cell">TIMESTAMP (IST)</div>
            <div className="table-cell">STATUS</div>
            <div className="table-cell">VOLTAGE</div>
            <div className="table-cell">CURRENT</div>
            <div className="table-cell">POWER</div>
            <div className="table-cell">ENERGY</div>
          </div>
          <div className="table-body">
            {currentItems.length === 0 ? (
              <div className="no-data">No records found</div>
            ) : (
              currentItems.map((item, index) => {
                const istDate = new Date(new Date(item.timestamp).getTime() + 5.5 * 60 * 60 * 1000);
                return (
                  <div key={`${item.timestamp}-${index}`} className="table-row">
                    <div className="table-cell timestamp">
                      {istDate.toISOString().replace('T', ' ').substr(0, 19)}
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${item.data.relay === 'ON' ? 'on' : 'off'}`}>
                        {item.data.relay || 'N/A'}
                      </span>
                    </div>
                    <div className="table-cell">{item.data.voltage || '0'}V</div>
                    <div className="table-cell">{item.data.current || '0'}A</div>
                    <div className="table-cell">{item.data.power || '0'}W</div>
                    <div className="table-cell">{item.data.energy || '0'}Wh</div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pagination Controls */}
        <section className="pagination-section">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || loading}
          >
            ⟨⟨ First
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            ⟨ Prev
          </button>
          <span className="pagination-btn active">{currentPage}</span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!hasMore || loading}
          >
            Next ⟩
          </button>
        </section>

        {/* Power Chart Visualization */}
        <section className="chart-section">
          <div className="chart-header">POWER CONSUMPTION TIMELINE</div>
          <div className="chart-container">
            {filteredHistory.slice(0, 50).reverse().map((item, index) => {
              const power = parseFloat(item.data.power || '0');
              const height = Math.max((power / 100) * 100, 2);
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                    title={`${power}W at ${new Date(item.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                  >
                    <div className="chart-bar-glow"></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chart-label">Last 50 readings (newest on right)</div>
        </section>
      </main>
    </div>
  );
}
