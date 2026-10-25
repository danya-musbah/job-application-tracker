-- Job Application Tracker - Database Schema (SQLite)
-- Enforced via node:sqlite in backend/database/init.js

PRAGMA foreign_keys = ON;

-- ========================================================================
-- USERS
-- ========================================================================
CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    default_status      TEXT NOT NULL DEFAULT 'Applied',
    default_currency    TEXT NOT NULL DEFAULT 'USD',
    items_per_page      INTEGER NOT NULL DEFAULT 20,
    reminder_days       INTEGER NOT NULL DEFAULT 7,
    theme               TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================================================
-- JOB SOURCES (built-ins seeded per-user + custom)
-- ========================================================================
CREATE TABLE IF NOT EXISTS job_sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_custom   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_job_sources_user ON job_sources(user_id);

-- ========================================================================
-- APPLICATIONS
-- ========================================================================
CREATE TABLE IF NOT EXISTS applications (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        TEXT NOT NULL,
    job_title           TEXT NOT NULL,
    job_url             TEXT,
    location            TEXT,
    location_type       TEXT NOT NULL DEFAULT 'onsite' CHECK (location_type IN ('remote','hybrid','onsite')),
    employment_type      TEXT NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time','part-time','contract','internship','temporary')),
    salary_min          REAL,
    salary_max          REAL,
    currency            TEXT NOT NULL DEFAULT 'USD',
    application_date    TEXT NOT NULL,
    job_source          TEXT,
    status              TEXT NOT NULL DEFAULT 'Wishlist' CHECK (status IN
                          ('Wishlist','Preparing','Applied','Screening','Interview',
                           'Technical Interview','Final Interview','Offer','Accepted',
                           'Rejected','Withdrawn')),
    priority            TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
    contact_person      TEXT,
    contact_email       TEXT,
    notes               TEXT,
    resume_version      TEXT,
    cover_letter_version TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(application_date);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_name);
CREATE INDEX IF NOT EXISTS idx_applications_title ON applications(job_title);

-- ========================================================================
-- TAGS  (many-to-many with applications)
-- ========================================================================
CREATE TABLE IF NOT EXISTS tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

CREATE TABLE IF NOT EXISTS application_tags (
    application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (application_id, tag_id)
);

-- ========================================================================
-- APPLICATION EVENTS (timeline)
-- ========================================================================
CREATE TABLE IF NOT EXISTS application_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    description     TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_application ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON application_events(user_id);

-- ========================================================================
-- INTERVIEWS
-- ========================================================================
CREATE TABLE IF NOT EXISTS interviews (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id      INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type      TEXT NOT NULL CHECK (interview_type IN
                          ('Phone Screen','HR Interview','Technical Interview',
                           'Coding Interview','Behavioral Interview','Final Interview')),
    interview_date      TEXT NOT NULL,
    interview_time      TEXT,
    interviewer         TEXT,
    location_or_url     TEXT,
    notes               TEXT,
    prep_notes          TEXT,
    result              TEXT NOT NULL DEFAULT 'Pending' CHECK (result IN
                          ('Pending','Passed','Failed','Cancelled','Rescheduled')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);

-- ========================================================================
-- FOLLOW-UPS
-- ========================================================================
CREATE TABLE IF NOT EXISTS followups (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followup_date   TEXT NOT NULL,
    followup_type   TEXT NOT NULL DEFAULT 'General',
    notes           TEXT,
    completed       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_followups_application ON followups(application_id);
CREATE INDEX IF NOT EXISTS idx_followups_user ON followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(followup_date);

-- ========================================================================
-- NOTIFICATIONS
-- ========================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                    TEXT NOT NULL,
    message                 TEXT NOT NULL,
    related_application_id  INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    is_read                 INTEGER NOT NULL DEFAULT 0,
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
