-- NAC Manager PostgreSQL Initialization
-- This file runs once on first container start.
-- The application schema is managed by Drizzle ORM migrations.
-- This file only sets up extensions and FreeRADIUS tables.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================
-- FreeRADIUS SQL Schema (rlm_sql PostgreSQL)
-- Standard FreeRADIUS 3.2.x table definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS radcheck (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '==',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radcheck_username ON radcheck(username);

CREATE TABLE IF NOT EXISTS radreply (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radreply_username ON radreply(username);

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id          BIGSERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '==',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radgroupcheck_groupname ON radgroupcheck(groupname);

CREATE TABLE IF NOT EXISTS radgroupreply (
    id          BIGSERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    priority    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radgroupreply_groupname ON radgroupreply(groupname);

CREATE TABLE IF NOT EXISTS radusergroup (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    priority    INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_radusergroup_username ON radusergroup(username);

CREATE TABLE IF NOT EXISTS radacct (
    radacctid           BIGSERIAL PRIMARY KEY,
    acctsessionid       VARCHAR(64)  NOT NULL DEFAULT '',
    acctuniqueid        VARCHAR(32)  NOT NULL DEFAULT '' UNIQUE,
    username            VARCHAR(64)  NOT NULL DEFAULT '',
    groupname           VARCHAR(64)  NOT NULL DEFAULT '',
    realm               VARCHAR(64)  DEFAULT '',
    nasipaddress        INET         NOT NULL,
    nasportid           VARCHAR(15)  DEFAULT NULL,
    nasporttype         VARCHAR(32)  DEFAULT NULL,
    acctstarttime       TIMESTAMPTZ  DEFAULT NULL,
    acctupdatetime      TIMESTAMPTZ  DEFAULT NULL,
    acctstoptime        TIMESTAMPTZ  DEFAULT NULL,
    acctinterval        INTEGER      DEFAULT NULL,
    acctsessiontime     INTEGER      DEFAULT NULL,
    acctauthentic       VARCHAR(32)  DEFAULT NULL,
    connectinfo_start   VARCHAR(50)  DEFAULT NULL,
    connectinfo_stop    VARCHAR(50)  DEFAULT NULL,
    acctinputoctets     BIGINT       DEFAULT NULL,
    acctoutputoctets    BIGINT       DEFAULT NULL,
    calledstationid     VARCHAR(50)  NOT NULL DEFAULT '',
    callingstationid    VARCHAR(50)  NOT NULL DEFAULT '',
    acctterminatecause  VARCHAR(32)  NOT NULL DEFAULT '',
    servicetype         VARCHAR(32)  DEFAULT NULL,
    framedprotocol      VARCHAR(32)  DEFAULT NULL,
    framedipaddress     INET         DEFAULT NULL,
    framedipv6address   INET         DEFAULT NULL,
    framedipv6prefix    INET         DEFAULT NULL,
    framedinterfaceid   VARCHAR(44)  DEFAULT NULL,
    delegatedipv6prefix INET         DEFAULT NULL,
    class               VARCHAR(64)  DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_radacct_username     ON radacct(username);
CREATE INDEX IF NOT EXISTS idx_radacct_nasipaddress ON radacct(nasipaddress);
CREATE INDEX IF NOT EXISTS idx_radacct_acctstarttime ON radacct(acctstarttime);
CREATE INDEX IF NOT EXISTS idx_radacct_acctstoptime ON radacct(acctstoptime);
CREATE INDEX IF NOT EXISTS idx_radacct_callingstationid ON radacct(callingstationid);

CREATE TABLE IF NOT EXISTS radpostauth (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL DEFAULT '',
    pass        VARCHAR(64)  NOT NULL DEFAULT '',
    reply       VARCHAR(32)  NOT NULL DEFAULT '',
    calledstationid  VARCHAR(50) NOT NULL DEFAULT '',
    callingstationid VARCHAR(50) NOT NULL DEFAULT '',
    authdate    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    class       VARCHAR(64)  DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_radpostauth_username ON radpostauth(username);

CREATE TABLE IF NOT EXISTS nas (
    id          BIGSERIAL PRIMARY KEY,
    nasname     VARCHAR(128) NOT NULL,
    shortname   VARCHAR(32)  DEFAULT NULL,
    type        VARCHAR(30)  DEFAULT 'other',
    ports       INTEGER      DEFAULT NULL,
    secret      VARCHAR(60)  NOT NULL DEFAULT 'secret',
    server      VARCHAR(64)  DEFAULT NULL,
    community   VARCHAR(50)  DEFAULT NULL,
    description VARCHAR(200) DEFAULT 'RADIUS Client'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nas_nasname ON nas(nasname);
