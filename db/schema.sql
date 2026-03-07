-- D1 Schema for EV Overlay
-- Cloudflare Edge-Native Architecture

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Initial version
INSERT OR IGNORE INTO schema_version (version, description) VALUES (1, 'Initial schema');

-- ============================================
-- Core Tables
-- ============================================

-- Charging stations (source of truth)
CREATE TABLE IF NOT EXISTS charging_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  operator TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  status TEXT DEFAULT 'operational',
  usage_type TEXT,
  is_operational BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME,

  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180)
);

-- Station connectors
CREATE TABLE IF NOT EXISTS station_connectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  connector_type TEXT NOT NULL,
  power_kw REAL,
  voltage INTEGER,
  amperage INTEGER,
  status TEXT DEFAULT 'available',
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

-- Ingestion jobs tracking
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  status TEXT DEFAULT 'running',
  source TEXT DEFAULT 'openchargemap',
  params_json TEXT,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- Station snapshots for audit trail (references R2)
CREATE TABLE IF NOT EXISTS station_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  snapshot_r2_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (job_id) REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

-- Rate limit audit log
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_key TEXT NOT NULL,
  request_count INTEGER,
  window_start DATETIME,
  limited BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes
-- ============================================

-- Charging stations indexes
CREATE INDEX IF NOT EXISTS idx_stations_location ON charging_stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stations_external ON charging_stations(external_id);
CREATE INDEX IF NOT EXISTS idx_stations_updated ON charging_stations(updated_at);
CREATE INDEX IF NOT EXISTS idx_stations_status ON charging_stations(status);

-- Station connectors indexes
CREATE INDEX IF NOT EXISTS idx_connectors_station ON station_connectors(station_id);
CREATE INDEX IF NOT EXISTS idx_connectors_type ON station_connectors(connector_type);

-- Ingestion jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_time ON ingestion_jobs(started_at);

-- Station snapshots indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_job ON station_snapshots(job_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_station ON station_snapshots(station_id);

-- Rate limit log indexes
CREATE INDEX IF NOT EXISTS idx_ratelog_client ON rate_limit_log(client_key, window_start);

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp for charging_stations
CREATE TRIGGER IF NOT EXISTS trigger_stations_updated
AFTER UPDATE ON charging_stations
BEGIN
  UPDATE charging_stations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-update updated_at timestamp for station_connectors
CREATE TRIGGER IF NOT EXISTS trigger_connectors_updated
AFTER UPDATE ON station_connectors
BEGIN
  UPDATE station_connectors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
