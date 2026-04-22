'use client';

import { useEffect, useState } from 'react';
import ThemeToggle from './components/ThemeToggle';

const API_BASE = 'https://smarthublite.vercel.app';

interface DeviceStatus {
  device_id: string;
  data: {
    relay: string;
    voltage: string;
    current: string;
    power: string;
    energy: string;
  };
  timestamp: string;
  status: string;
}

interface Schedule {
  time: string;
  action: 'on' | 'off';
  enabled: boolean;
  id: string;
}

export default function SmartPlugDashboard() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [commanding, setCommanding] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newScheduleAction, setNewScheduleAction] = useState<'on' | 'off'>('on');

  // Load schedules from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('smart_plug_schedules');
    if (saved) {
      setSchedules(JSON.parse(saved));
    }
  }, []);

  // Save schedules to localStorage
  useEffect(() => {
    localStorage.setItem('smart_plug_schedules', JSON.stringify(schedules));
  }, [schedules]);

  // Fetch device status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/device/status?device_id=smart_plug`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send command
  const sendCommand = async (action: string) => {
    setCommanding(true);
    try {
      await fetch(`${API_BASE}/api/device/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'smart_plug',
          command: { action }
        })
      });
      setTimeout(fetchStatus, 600);
    } catch (err) {
      console.error('Command failed:', err);
    } finally {
      setCommanding(false);
    }
  };

  // Schedule checker with IST timezone
  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const currentTime = `${String(istTime.getUTCHours()).padStart(2, '0')}:${String(istTime.getUTCMinutes()).padStart(2, '0')}`;
      
      schedules.forEach(schedule => {
        if (schedule.enabled && schedule.time === currentTime) {
          sendCommand(schedule.action);
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkSchedules, 30000);
    // Also check immediately
    checkSchedules();

    return () => clearInterval(interval);
  }, [schedules]);

  // Auto-refresh status
  useEffect(() => {
    let mounted = true;
    
    // Set a timeout to force exit loading state if fetch takes too long
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);
    
    const loadStatus = async () => {
      if (mounted) {
        await fetchStatus();
      }
    };
    
    loadStatus();
    const interval = setInterval(() => {
      if (mounted) {
        fetchStatus();
      }
    }, 2000);
    
    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      clearInterval(interval);
    };
  }, []);

  const addSchedule = () => {
    if (!newScheduleTime) return;
    const newSchedule: Schedule = {
      time: newScheduleTime,
      action: newScheduleAction,
      enabled: true,
      id: Date.now().toString()
    };
    setSchedules([...schedules, newSchedule]);
    setNewScheduleTime('');
  };

  const toggleSchedule = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="pulse-ring"></div>
        <div className="loading-text">INITIALIZING SYSTEM</div>
      </div>
    );
  }

  const isOnline = status?.status === 'online';
  const relayOn = status?.data?.relay === 'ON';
  
  // Calculate gauge angles (0-180 degrees)
  const voltageAngle = ((parseFloat(status?.data?.voltage || '0') - 200) / 50) * 180;
  const currentAngle = (parseFloat(status?.data?.current || '0') / 5) * 180;
  const powerAngle = (parseFloat(status?.data?.power || '0') / 1000) * 180;

  return (
    <div className="dashboard">
      <div className="hex-bg"></div>
      
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-hex"></div>
            <div>
              <h1 className="logo-title">SMARTHUB</h1>
              <div className="logo-subtitle">CONTROL INTERFACE</div>
            </div>
          </div>
          <div className="header-right">
            <ThemeToggle />
            <div className="status-badge">
              <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
              <span>{isOnline ? 'SYSTEM ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Primary Control */}
        <section className="control-panel">
          <div className="panel-header">
            <span className="panel-label">PRIMARY CONTROL</span>
            <div className="panel-line"></div>
          </div>

          {/* Device Status Info */}
          <div className="device-status-info">
            <div className="status-grid">
              <div className="status-item">
                <div className="status-item-label">DEVICE STATUS</div>
                <div className={`status-item-value ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? '● ONLINE' : '○ OFFLINE'}
                </div>
              </div>
              <div className="status-item">
                <div className="status-item-label">RELAY STATE</div>
                <div className={`status-item-value ${relayOn ? 'on' : 'off'}`}>
                  {relayOn ? '⚡ ON' : '⭘ OFF'}
                </div>
              </div>
            </div>
            <div className="status-timestamp">
              <div className="status-item-label">LAST SEEN</div>
              <div className="status-item-value">
                {status?.timestamp ? new Date(status.timestamp).toLocaleString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  hour12: true,
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : 'N/A'}
              </div>
            </div>
            {!isOnline && status?.data && (
              <div className="last-known-state">
                <div className="last-known-header">⚠ LAST KNOWN STATE</div>
                <div className="last-known-grid">
                  <div className="last-known-item">
                    <span className="lk-label">V:</span>
                    <span className="lk-value">{status.data.voltage}V</span>
                  </div>
                  <div className="last-known-item">
                    <span className="lk-label">A:</span>
                    <span className="lk-value">{status.data.current}A</span>
                  </div>
                  <div className="last-known-item">
                    <span className="lk-label">W:</span>
                    <span className="lk-value">{status.data.power}W</span>
                  </div>
                  <div className="last-known-item">
                    <span className="lk-label">Wh:</span>
                    <span className="lk-value">{status.data.energy}Wh</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            className={`power-toggle ${relayOn ? 'active' : ''}`}
            onClick={() => sendCommand('toggle')}
            disabled={commanding || !isOnline}
          >
            <div className="toggle-inner">
              <div className="toggle-icon"></div>
              <div className="toggle-state">{relayOn ? 'ACTIVE' : 'STANDBY'}</div>
              <div className="toggle-label">RELAY CONTROL</div>
            </div>
            {relayOn && <div className="power-pulse"></div>}
          </button>
          <div className="quick-actions">
            <button onClick={() => sendCommand('on')} disabled={commanding || !isOnline}>FORCE ON</button>
            <button onClick={() => sendCommand('off')} disabled={commanding || !isOnline}>FORCE OFF</button>
          </div>
        </section>

        {/* Metrics Grid with Gauges */}
        <section className="metrics-grid">
          <div className="metric-card voltage">
            <div className="metric-header">
              <span className="metric-icon">⚡</span>
              <span className="metric-label">VOLTAGE</span>
            </div>
            <div className="gauge-container">
              <svg className="gauge" viewBox="0 0 200 120">
                <path
                  className="gauge-arc"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="12"
                />
                <path
                  className="gauge-arc-active"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#4a90e2"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (voltageAngle / 180) * 251.2}
                />
                <line
                  className="gauge-needle"
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#4a90e2"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ transform: `rotate(${voltageAngle - 90}deg)`, transformOrigin: '100px 100px' }}
                />
                <circle cx="100" cy="100" r="8" fill="#4a90e2" />
                <text x="20" y="115" fill="var(--text-secondary)" fontSize="10">200V</text>
                <text x="165" y="115" fill="var(--text-secondary)" fontSize="10">250V</text>
              </svg>
            </div>
            <div className="metric-value">{status?.data?.voltage || '0'}</div>
            <div className="metric-unit">VOLTS</div>
          </div>

          <div className="metric-card current">
            <div className="metric-header">
              <span className="metric-icon">〰</span>
              <span className="metric-label">CURRENT</span>
            </div>
            <div className="gauge-container">
              <svg className="gauge" viewBox="0 0 200 120">
                <path
                  className="gauge-arc"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="12"
                />
                <path
                  className="gauge-arc-active"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#e24a90"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (currentAngle / 180) * 251.2}
                />
                <line
                  className="gauge-needle"
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#e24a90"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ transform: `rotate(${currentAngle - 90}deg)`, transformOrigin: '100px 100px' }}
                />
                <circle cx="100" cy="100" r="8" fill="#e24a90" />
                <text x="30" y="115" fill="var(--text-secondary)" fontSize="10">0A</text>
                <text x="170" y="115" fill="var(--text-secondary)" fontSize="10">5A</text>
              </svg>
            </div>
            <div className="metric-value">{status?.data?.current || '0'}</div>
            <div className="metric-unit">AMPERES</div>
          </div>

          <div className="metric-card power">
            <div className="metric-header">
              <span className="metric-icon">◈</span>
              <span className="metric-label">POWER</span>
            </div>
            <div className="gauge-container">
              <svg className="gauge" viewBox="0 0 200 120">
                <path
                  className="gauge-arc"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="12"
                />
                <path
                  className="gauge-arc-active"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#90e24a"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (powerAngle / 180) * 251.2}
                />
                <line
                  className="gauge-needle"
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#90e24a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ transform: `rotate(${powerAngle - 90}deg)`, transformOrigin: '100px 100px' }}
                />
                <circle cx="100" cy="100" r="8" fill="#90e24a" />
                <text x="30" y="115" fill="var(--text-secondary)" fontSize="10">0W</text>
                <text x="150" y="115" fill="var(--text-secondary)" fontSize="10">1000W</text>
              </svg>
            </div>
            <div className="metric-value">{status?.data?.power || '0'}</div>
            <div className="metric-unit">WATTS</div>
          </div>

          <div className="metric-card energy">
            <div className="metric-header">
              <span className="metric-icon">◉</span>
              <span className="metric-label">ENERGY</span>
            </div>
            <div className="metric-value large">{status?.data?.energy || '0'}</div>
            <div className="metric-unit">WATT-HOURS</div>
            <div className="metric-note">Resets on power cycle</div>
            <div className="energy-bars">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`energy-bar ${parseFloat(status?.data?.energy || '0') > i ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Scheduler */}
        <section className="scheduler-panel">
          <div className="panel-header">
            <span className="panel-label">AUTOMATED SCHEDULING</span>
            <div className="panel-line"></div>
          </div>
          
          <div className="schedule-info">
            <div className="current-time">
              IST TIME: {new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().substr(11, 5)}
            </div>
          </div>
          
          <div className="schedule-creator">
            <input 
              type="time" 
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
              className="time-input"
              placeholder="HH:MM (IST)"
            />
            <select 
              value={newScheduleAction}
              onChange={(e) => setNewScheduleAction(e.target.value as 'on' | 'off')}
              className="action-select"
            >
              <option value="on">⚡ POWER ON</option>
              <option value="off">⭘ POWER OFF</option>
            </select>
            <button onClick={addSchedule} className="add-schedule-btn">+ ADD SCHEDULE</button>
          </div>

          <div className="schedule-list">
            {schedules.length === 0 ? (
              <div className="no-schedules">No automated schedules configured</div>
            ) : (
              schedules.map(schedule => (
                <div key={schedule.id} className={`schedule-item ${!schedule.enabled ? 'disabled' : ''}`}>
                  <div className="schedule-time">{schedule.time}</div>
                  <div className="schedule-action">{schedule.action.toUpperCase()}</div>
                  <div className="schedule-controls">
                    <button onClick={() => toggleSchedule(schedule.id)} className="toggle-btn">
                      {schedule.enabled ? '●' : '○'}
                    </button>
                    <button onClick={() => deleteSchedule(schedule.id)} className="delete-btn">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <div className="footer-info">
          <span>DEVICE ID: smart_plug</span>
          <span>•</span>
          <span>LAST UPDATE: {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</span>
          <span>•</span>
          <a href="/history" className="history-link">VIEW HISTORY →</a>
        </div>
      </footer>
    </div>
  );
}
