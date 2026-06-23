--
-- PostgreSQL database dump
--

\restrict COXa6LWGmc3SewZZFTkoJ3xE0MNPyMt5ChIbygXd5ubqUIbfkcpfc07TfvnbxRx

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    type text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    message text NOT NULL,
    device_id integer,
    acknowledged_by text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_id_seq OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    username text,
    action text NOT NULL,
    entity_type text,
    entity_id integer,
    old_value text,
    new_value text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: device_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_history (
    id integer NOT NULL,
    device_id integer NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    old_vlan text,
    new_vlan text,
    performed_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_history OWNER TO postgres;

--
-- Name: device_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_history_id_seq OWNER TO postgres;

--
-- Name: device_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_history_id_seq OWNED BY public.device_history.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    mac_address text NOT NULL,
    ip_address text,
    hostname text,
    username text,
    vendor text,
    operating_system text,
    department text,
    switch_name text,
    switch_port text,
    vlan_id integer,
    site_id integer,
    status text DEFAULT 'DISCOVERED'::text NOT NULL,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    approved_by text,
    notes text,
    radius_synced boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: discovery_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discovery_jobs (
    id integer NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source_id integer,
    source_name text,
    devices_found integer DEFAULT 0 NOT NULL,
    devices_new integer DEFAULT 0 NOT NULL,
    devices_updated integer DEFAULT 0 NOT NULL,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    triggered_by text
);


ALTER TABLE public.discovery_jobs OWNER TO postgres;

--
-- Name: discovery_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discovery_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discovery_jobs_id_seq OWNER TO postgres;

--
-- Name: discovery_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discovery_jobs_id_seq OWNED BY public.discovery_jobs.id;


--
-- Name: discovery_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discovery_sources (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    host text NOT NULL,
    port integer,
    username text,
    password text,
    community text,
    enabled boolean DEFAULT true NOT NULL,
    last_run_at timestamp with time zone,
    last_run_status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    snmp_version text DEFAULT 'v2c'::text,
    snmp_auth_protocol text,
    snmp_priv_protocol text,
    snmp_auth_key text,
    snmp_priv_key text,
    snmp_context_name text,
    last_error text,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    base_dn text,
    last_highest_usn text,
    private_key text
);


ALTER TABLE public.discovery_sources OWNER TO postgres;

--
-- Name: discovery_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discovery_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discovery_sources_id_seq OWNER TO postgres;

--
-- Name: discovery_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discovery_sources_id_seq OWNED BY public.discovery_sources.id;


--
-- Name: integration_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_logs (
    id integer NOT NULL,
    job_id integer,
    source_id integer,
    level text DEFAULT 'info'::text NOT NULL,
    message text NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integration_logs OWNER TO postgres;

--
-- Name: integration_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integration_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integration_logs_id_seq OWNER TO postgres;

--
-- Name: integration_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integration_logs_id_seq OWNED BY public.integration_logs.id;


--
-- Name: nac_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nac_policies (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    condition text NOT NULL,
    action text NOT NULL,
    priority integer DEFAULT 10 NOT NULL,
    vlan_id integer,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.nac_policies OWNER TO postgres;

--
-- Name: nac_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nac_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.nac_policies_id_seq OWNER TO postgres;

--
-- Name: nac_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nac_policies_id_seq OWNED BY public.nac_policies.id;


--
-- Name: radius_clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radius_clients (
    id integer NOT NULL,
    name text NOT NULL,
    ip_address text NOT NULL,
    secret text NOT NULL,
    nas_type text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.radius_clients OWNER TO postgres;

--
-- Name: radius_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radius_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.radius_clients_id_seq OWNER TO postgres;

--
-- Name: radius_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radius_clients_id_seq OWNED BY public.radius_clients.id;


--
-- Name: radius_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radius_groups (
    id integer NOT NULL,
    name text NOT NULL,
    vlan_id integer,
    attribute text,
    value text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.radius_groups OWNER TO postgres;

--
-- Name: radius_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radius_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.radius_groups_id_seq OWNER TO postgres;

--
-- Name: radius_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radius_groups_id_seq OWNED BY public.radius_groups.id;


--
-- Name: sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sites (
    id integer NOT NULL,
    name text NOT NULL,
    code text,
    address text,
    city text,
    country text,
    parent_id integer,
    type text DEFAULT 'site'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sites OWNER TO postgres;

--
-- Name: sites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sites_id_seq OWNER TO postgres;

--
-- Name: sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sites_id_seq OWNED BY public.sites.id;


--
-- Name: switches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.switches (
    id integer NOT NULL,
    name text NOT NULL,
    ip_address text NOT NULL,
    model text,
    location text,
    site_id integer,
    snmp_version text DEFAULT 'v2c'::text NOT NULL,
    snmp_community text,
    snmp_username text,
    snmp_auth_password text,
    snmp_priv_password text,
    status text DEFAULT 'unknown'::text NOT NULL,
    last_polled timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.switches OWNER TO postgres;

--
-- Name: switches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.switches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.switches_id_seq OWNER TO postgres;

--
-- Name: switches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.switches_id_seq OWNED BY public.switches.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'read_only'::text NOT NULL,
    full_name text,
    active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vlans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vlans (
    id integer NOT NULL,
    vlan_id integer NOT NULL,
    name text NOT NULL,
    description text,
    type text,
    is_quarantine boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vlans OWNER TO postgres;

--
-- Name: vlans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vlans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vlans_id_seq OWNER TO postgres;

--
-- Name: vlans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vlans_id_seq OWNED BY public.vlans.id;


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: device_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history ALTER COLUMN id SET DEFAULT nextval('public.device_history_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: discovery_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discovery_jobs ALTER COLUMN id SET DEFAULT nextval('public.discovery_jobs_id_seq'::regclass);


--
-- Name: discovery_sources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discovery_sources ALTER COLUMN id SET DEFAULT nextval('public.discovery_sources_id_seq'::regclass);


--
-- Name: integration_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_logs ALTER COLUMN id SET DEFAULT nextval('public.integration_logs_id_seq'::regclass);


--
-- Name: nac_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nac_policies ALTER COLUMN id SET DEFAULT nextval('public.nac_policies_id_seq'::regclass);


--
-- Name: radius_clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radius_clients ALTER COLUMN id SET DEFAULT nextval('public.radius_clients_id_seq'::regclass);


--
-- Name: radius_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radius_groups ALTER COLUMN id SET DEFAULT nextval('public.radius_groups_id_seq'::regclass);


--
-- Name: sites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites ALTER COLUMN id SET DEFAULT nextval('public.sites_id_seq'::regclass);


--
-- Name: switches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.switches ALTER COLUMN id SET DEFAULT nextval('public.switches_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vlans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vlans ALTER COLUMN id SET DEFAULT nextval('public.vlans_id_seq'::regclass);


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, type, severity, status, message, device_id, acknowledged_by, resolved_at, created_at, updated_at) FROM stdin;
6	discovery_complete	info	resolved	Scheduled discovery completed: 47 devices scanned	\N	\N	2026-06-21 22:12:52.129+00	2026-06-21 22:12:52.130214+00	2026-06-21 22:12:52.130214+00
3	radius_sync_failed	warning	resolved	FreeRADIUS sync failed: connection timeout	\N	netadmin	2026-06-23 14:39:23.048+00	2026-06-21 22:12:52.130214+00	2026-06-23 14:39:23.048+00
1	rogue_device	critical	resolved	Rogue device detected on SW-HQ-ACCESS-01 port Gi0/20	7	admin	2026-06-23 14:39:30.946+00	2026-06-21 22:12:52.130214+00	2026-06-23 14:39:30.946+00
2	pending_approval	warning	resolved	2 devices pending approval for more than 24 hours	\N	admin	2026-06-23 14:39:31.704+00	2026-06-21 22:12:52.130214+00	2026-06-23 14:39:31.704+00
4	snmp_unreachable	warning	resolved	Switch SW-CHI-ACCESS-01 is unreachable via SNMP	\N	admin	2026-06-23 14:39:32.831+00	2026-06-21 22:12:52.130214+00	2026-06-23 14:39:32.831+00
5	compliance_drop	info	resolved	Compliance rate dropped below 85% in the last 24 hours	\N	admin	2026-06-23 14:39:33.486+00	2026-06-21 22:12:52.130214+00	2026-06-23 14:39:33.487+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, created_at) FROM stdin;
1	\N	admin	approve_device	device	1	PENDING	APPROVED	10.0.1.50	2026-06-21 22:12:52.13669+00
2	\N	netadmin	quarantine_device	device	7	APPROVED	QUARANTINED	10.0.1.51	2026-06-21 22:12:52.13669+00
3	\N	admin	sync_radius	radius	\N	\N	synced 8 devices	10.0.1.50	2026-06-21 22:12:52.13669+00
4	\N	admin	create_user	user	\N	\N	helpdesk1	10.0.1.50	2026-06-21 22:12:52.13669+00
5	\N	netadmin	create_vlan	vlan	6	\N	QUARANTINE (999)	10.0.1.51	2026-06-21 22:12:52.13669+00
6	\N	system	quarantine_device	device	1	APPROVED	QUARANTINED	\N	2026-06-23 14:41:01.318444+00
\.


--
-- Data for Name: device_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_history (id, device_id, action, old_status, new_status, old_vlan, new_vlan, performed_by, notes, created_at) FROM stdin;
1	1	discovered	\N	DISCOVERED	\N	\N	system	First seen via SNMP poll	2026-06-21 22:12:52.093158+00
2	1	approve	DISCOVERED	APPROVED	\N	\N	admin	\N	2026-06-21 22:12:52.093158+00
3	7	quarantine	APPROVED	QUARANTINED	\N	\N	netadmin	Suspicious traffic detected	2026-06-21 22:12:52.093158+00
4	1	quarantine	APPROVED	QUARANTINED	\N	\N	admin	RADIUS quarantine failed: relation "radcheck" does not exist	2026-06-23 14:41:01.313515+00
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devices (id, mac_address, ip_address, hostname, username, vendor, operating_system, department, switch_name, switch_port, vlan_id, site_id, status, first_seen, last_seen, approved_at, approved_by, notes, radius_synced, created_at, updated_at) FROM stdin;
2	AA:BB:CC:01:02:04	10.0.1.101	WKSTN-NYC-002	mjones	HP	Windows 11	Finance	SW-HQ-ACCESS-01	Gi0/2	1	1	APPROVED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	admin	\N	t	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
3	AA:BB:CC:01:02:05	10.0.1.102	LAPTOP-NYC-005	abrown	Apple	macOS 14	Marketing	SW-HQ-ACCESS-01	Gi0/3	1	1	APPROVED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	netadmin	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
4	DD:EE:FF:01:02:03	10.0.2.50	SRV-WEB-01	\N	Dell	Ubuntu 22.04 LTS	IT	SW-HQ-CORE-01	Gi1/0/1	2	1	APPROVED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	admin	\N	t	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
5	11:22:33:44:55:66	10.0.1.200	\N	\N	Zebra Technologies	Android 12	Warehouse	SW-HQ-ACCESS-01	Gi0/10	\N	1	PENDING	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	\N	\N	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
6	AA:11:BB:22:CC:33	10.0.1.201	\N	\N	Unknown	\N	\N	SW-HQ-ACCESS-01	Gi0/11	\N	1	PENDING	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	\N	\N	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
7	FF:EE:DD:CC:BB:AA	10.0.1.210	rogue-device	\N	Raspberry Pi Foundation	\N	\N	SW-HQ-ACCESS-01	Gi0/20	6	1	QUARANTINED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	\N	\N	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
8	DE:AD:BE:EF:01:01	10.0.1.220	\N	\N	Cisco	Cisco IOS	IT	SW-HQ-ACCESS-01	Gi0/22	\N	1	REJECTED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	\N	\N	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
9	00:11:22:33:44:55	10.2.1.50	CHI-LAPTOP-001	dwilson	Lenovo	Windows 10	Sales	SW-CHI-ACCESS-01	Gi0/1	1	3	APPROVED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	netadmin	\N	f	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
10	00:1A:2B:3C:4D:5E	10.0.1.240	\N	\N	Polycom	Polycom OS	Executive	SW-HQ-ACCESS-01	Gi0/24	4	1	APPROVED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	admin	\N	t	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00
1	AA:BB:CC:01:02:03	10.0.1.100	WKSTN-NYC-001	jsmith	Dell	Windows 11	Engineering	SW-HQ-ACCESS-01	Gi0/1	1	1	QUARANTINED	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.083704+00	2026-06-21 22:12:52.079+00	admin	\N	f	2026-06-21 22:12:52.083704+00	2026-06-23 14:41:01.296+00
\.


--
-- Data for Name: discovery_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discovery_jobs (id, type, status, source_id, source_name, devices_found, devices_new, devices_updated, error_message, started_at, completed_at, created_at, triggered_by) FROM stdin;
1	snmp	completed	1	HQ SNMP v2c	47	3	44	\N	2026-06-21 21:12:52.104+00	2026-06-21 21:13:42.104+00	2026-06-21 22:12:52.105538+00	\N
2	dhcp_windows	completed	2	Corp DHCP Server	82	1	81	\N	2026-06-21 20:12:52.104+00	2026-06-21 20:14:32.104+00	2026-06-21 22:12:52.105538+00	\N
3	active_directory	completed	3	Active Directory	63	0	63	\N	2026-06-20 22:12:52.104+00	2026-06-20 22:13:42.104+00	2026-06-21 22:12:52.105538+00	\N
4	snmp	failed	1	HQ SNMP v2c	0	0	0	SNMP timeout after 5 retries	2026-06-19 22:12:52.104+00	\N	2026-06-21 22:12:52.105538+00	\N
5	snmp	failed	\N	\N	0	0	0	No source specified. Select a configured discovery source to run a real poll.	2026-06-22 07:18:26.867+00	2026-06-22 07:18:26.912+00	2026-06-22 07:18:26.868518+00	\N
6	snmp	failed	\N	\N	0	0	0	No source specified. Select a configured discovery source to run a real poll.	2026-06-22 07:18:28.114+00	2026-06-22 07:18:28.119+00	2026-06-22 07:18:28.11516+00	\N
7	snmp	failed	\N	\N	0	0	0	No source specified. Select a configured discovery source to run a real poll.	2026-06-22 07:18:29.446+00	2026-06-22 07:18:29.451+00	2026-06-22 07:18:29.447301+00	\N
8	snmp	failed	\N	\N	0	0	0	No source specified. Select a configured discovery source to run a real poll.	2026-06-22 07:18:31.664+00	2026-06-22 07:18:31.668+00	2026-06-22 07:18:31.665209+00	\N
9	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:34.34+00	2026-06-23 14:45:34.498+00	2026-06-23 14:40:34.296016+00	\N
10	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:35.253+00	2026-06-23 14:45:35.321+00	2026-06-23 14:40:35.250129+00	\N
11	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:35.896+00	2026-06-23 14:45:35.951+00	2026-06-23 14:40:35.893041+00	\N
12	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:36.502+00	2026-06-23 14:45:36.574+00	2026-06-23 14:40:36.498365+00	\N
13	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:37.032+00	2026-06-23 14:45:37.092+00	2026-06-23 14:40:37.028563+00	\N
14	snmp	completed	1	HQ SNMP v2c	0	0	0	\N	2026-06-23 14:40:37.539+00	2026-06-23 14:45:37.599+00	2026-06-23 14:40:37.53271+00	\N
\.


--
-- Data for Name: discovery_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discovery_sources (id, name, type, host, port, username, password, community, enabled, last_run_at, last_run_status, created_at, updated_at, snmp_version, snmp_auth_protocol, snmp_priv_protocol, snmp_auth_key, snmp_priv_key, snmp_context_name, last_error, consecutive_failures, base_dn, last_highest_usn, private_key) FROM stdin;
2	Corp DHCP Server	dhcp_windows	10.0.0.10	\N	dhcp-reader	\N	\N	t	2026-06-21 22:12:52.098+00	success	2026-06-21 22:12:52.098797+00	2026-06-21 22:12:52.098797+00	v2c	\N	\N	\N	\N	\N	\N	0	\N	\N	\N
3	Active Directory	active_directory	10.0.0.5	\N	svc-nac	\N	\N	t	2026-06-21 22:12:52.098+00	success	2026-06-21 22:12:52.098797+00	2026-06-21 22:12:52.098797+00	v2c	\N	\N	\N	\N	\N	\N	0	\N	\N	\N
1	HQ SNMP v2c	snmp	10.0.0.1	\N	\N	\N	public	t	2026-06-23 14:45:37.603+00	success	2026-06-21 22:12:52.098797+00	2026-06-23 14:45:37.603+00	v2c	\N	\N	\N	\N	\N	\N	0	\N	\N	\N
\.


--
-- Data for Name: integration_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.integration_logs (id, job_id, source_id, level, message, details, created_at) FROM stdin;
1	9	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:34.345154+00
2	9	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:34.353043+00
3	10	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:35.257074+00
4	10	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:35.259756+00
5	11	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:35.90046+00
6	11	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:35.903038+00
7	12	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:36.508482+00
8	12	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:36.510789+00
9	13	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:37.035783+00
10	13	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:37.038381+00
11	14	1	info	SNMP discovery started for HQ SNMP v2c (10.0.0.1)	\N	2026-06-23 14:40:37.542802+00
12	14	1	info	Poll attempt 1/3	\N	2026-06-23 14:40:37.545087+00
13	9	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:34.459214+00
14	9	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:34.475387+00
15	9	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:34.483951+00
16	9	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:34.486784+00
17	9	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:34.48944+00
18	9	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300082,"interfaceCount":0}	2026-06-23 14:45:34.492307+00
19	9	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:34.496466+00
20	10	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:35.290996+00
21	10	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:35.295738+00
22	10	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:35.299165+00
23	10	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:35.306583+00
24	10	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:35.309769+00
25	10	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300028,"interfaceCount":0}	2026-06-23 14:45:35.312844+00
26	10	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:35.318004+00
27	11	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:35.932033+00
28	11	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:35.935203+00
29	11	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:35.937657+00
30	11	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:35.940562+00
31	11	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:35.942723+00
32	11	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300026,"interfaceCount":0}	2026-06-23 14:45:35.945259+00
33	11	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:35.948149+00
34	12	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:36.550257+00
35	12	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:36.555223+00
36	12	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:36.559291+00
37	12	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:36.562535+00
38	12	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:36.565412+00
39	12	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300034,"interfaceCount":0}	2026-06-23 14:45:36.567932+00
40	12	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:36.570939+00
41	13	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:37.06544+00
42	13	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:37.068963+00
43	13	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:37.072331+00
44	13	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:37.075247+00
45	13	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:37.080219+00
46	13	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300023,"interfaceCount":0}	2026-06-23 14:45:37.082695+00
47	13	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:37.089046+00
48	14	1	warn	SNMP warning: ARP walk failed: Request timed out	\N	2026-06-23 14:45:37.57135+00
49	14	1	warn	SNMP warning: MAC table walk failed: Request timed out	\N	2026-06-23 14:45:37.577485+00
50	14	1	warn	SNMP warning: Port-to-ifIndex walk failed: Request timed out	\N	2026-06-23 14:45:37.582035+00
51	14	1	warn	SNMP warning: Interface walk failed: Request timed out	\N	2026-06-23 14:45:37.586848+00
52	14	1	warn	SNMP warning: PVID walk failed: Request timed out	\N	2026-06-23 14:45:37.590264+00
53	14	1	info	Poll complete: 0 devices found, 5 warnings	{"durationMs":300023,"interfaceCount":0}	2026-06-23 14:45:37.594124+00
54	14	1	info	Correlation complete: 0 new, 0 updated	\N	2026-06-23 14:45:37.596593+00
\.


--
-- Data for Name: nac_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nac_policies (id, name, description, condition, action, priority, vlan_id, enabled, created_at, updated_at) FROM stdin;
1	Auto-approve Known Vendor Devices	Automatically approve devices from known corporate vendors	known_device	approve	1	\N	t	2026-06-21 22:12:52.12369+00	2026-06-21 22:12:52.12369+00
2	Quarantine Unknown Devices	Quarantine any unknown device immediately	unknown_device	quarantine	5	6	t	2026-06-21 22:12:52.12369+00	2026-06-21 22:12:52.12369+00
3	Deny Rejected Devices	Block access to all previously rejected devices	rejected_device	deny_access	2	\N	t	2026-06-21 22:12:52.12369+00	2026-06-21 22:12:52.12369+00
4	Alert on Duplicate MAC	Alert when the same MAC is seen on multiple ports	duplicate_mac	alert	3	\N	t	2026-06-21 22:12:52.12369+00	2026-06-21 22:12:52.12369+00
5	Quarantine on Port Change	Quarantine device if moved to unexpected port	port_change	quarantine	4	6	f	2026-06-21 22:12:52.12369+00	2026-06-21 22:12:52.12369+00
\.


--
-- Data for Name: radius_clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radius_clients (id, name, ip_address, secret, nas_type, description, created_at, updated_at) FROM stdin;
1	SW-HQ-CORE-01	10.0.0.1	radius-secret-2024	cisco	HQ Core Switch	2026-06-21 22:12:52.112527+00	2026-06-21 22:12:52.112527+00
2	SW-HQ-ACCESS-01	10.0.1.1	radius-secret-2024	cisco	HQ Access Switch Floor 2	2026-06-21 22:12:52.112527+00	2026-06-21 22:12:52.112527+00
3	WLC-HQ-01	10.0.0.20	wlc-radius-secret	cisco-wlc	Wireless LAN Controller	2026-06-21 22:12:52.112527+00	2026-06-21 22:12:52.112527+00
\.


--
-- Data for Name: radius_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radius_groups (id, name, vlan_id, attribute, value, description, created_at, updated_at) FROM stdin;
1	corp-users	1	Tunnel-Private-Group-ID	10	Corporate user workstations	2026-06-21 22:12:52.118125+00	2026-06-21 22:12:52.118125+00
2	corp-servers	2	Tunnel-Private-Group-ID	20	Production server VLAN	2026-06-21 22:12:52.118125+00	2026-06-21 22:12:52.118125+00
3	guest-access	5	Tunnel-Private-Group-ID	100	Guest network access	2026-06-21 22:12:52.118125+00	2026-06-21 22:12:52.118125+00
4	quarantine	6	Tunnel-Private-Group-ID	999	Quarantine VLAN	2026-06-21 22:12:52.118125+00	2026-06-21 22:12:52.118125+00
\.


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sites (id, name, code, address, city, country, parent_id, type, created_at, updated_at) FROM stdin;
1	HQ - New York	NY-HQ	1 Corporate Plaza	New York	US	\N	site	2026-06-21 22:12:52.049825+00	2026-06-21 22:12:52.049825+00
2	DC - Newark	NJ-DC	500 Data Center Dr	Newark	US	\N	site	2026-06-21 22:12:52.049825+00	2026-06-21 22:12:52.049825+00
3	Branch - Chicago	IL-BR	200 N Michigan Ave	Chicago	US	\N	branch	2026-06-21 22:12:52.049825+00	2026-06-21 22:12:52.049825+00
\.


--
-- Data for Name: switches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.switches (id, name, ip_address, model, location, site_id, snmp_version, snmp_community, snmp_username, snmp_auth_password, snmp_priv_password, status, last_polled, created_at, updated_at) FROM stdin;
1	SW-HQ-CORE-01	10.0.0.1	Cisco Catalyst 9300	Server Room A	1	v2c	public	\N	\N	\N	online	2026-06-21 22:12:52.07+00	2026-06-21 22:12:52.073698+00	2026-06-21 22:12:52.073698+00
2	SW-HQ-ACCESS-01	10.0.1.1	Cisco Catalyst 2960X	Floor 2 IDF	1	v2c	public	\N	\N	\N	online	2026-06-21 22:12:52.07+00	2026-06-21 22:12:52.073698+00	2026-06-21 22:12:52.073698+00
3	SW-DC-CORE-01	10.1.0.1	Cisco Nexus 9000	DC Main Row	2	v3	\N	\N	\N	\N	online	2026-06-21 22:12:52.07+00	2026-06-21 22:12:52.073698+00	2026-06-21 22:12:52.073698+00
4	SW-CHI-ACCESS-01	10.2.1.1	Cisco Catalyst 2960S	Chicago Branch MDF	3	v2c	public	\N	\N	\N	unknown	\N	2026-06-21 22:12:52.073698+00	2026-06-21 22:12:52.073698+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, full_name, active, last_login_at, created_at, updated_at) FROM stdin;
1	admin	admin@corp.local	5f394440c040c77a397237607b51c94a8a14a32fd2b58ee53e6e21ecc2d3d5b9	super_admin	System Administrator	t	\N	2026-06-21 22:12:52.039579+00	2026-06-21 22:12:52.039579+00
2	netadmin	netadmin@corp.local	f82d5ce23d660910e2de4aeaaf3a0dcd149be09f9975f6c8a2351f7f11692606	network_admin	Network Admin	t	\N	2026-06-21 22:12:52.039579+00	2026-06-21 22:12:52.039579+00
3	helpdesk1	helpdesk@corp.local	e444ca0882db05924e030af2c81789e48b72155902408785f5384272083c17d2	helpdesk	Help Desk Technician	t	\N	2026-06-21 22:12:52.039579+00	2026-06-21 22:12:52.039579+00
4	auditor	auditor@corp.local	8153dcf15ddff632b36e5cad7775d6748f78fdb76dec8f6229e3d8b3934aed1b	auditor	Security Auditor	t	\N	2026-06-21 22:12:52.039579+00	2026-06-21 22:12:52.039579+00
\.


--
-- Data for Name: vlans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vlans (id, vlan_id, name, description, type, is_quarantine, created_at, updated_at) FROM stdin;
1	10	CORP-USERS	Corporate user workstations	production	f	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
2	20	CORP-SERVERS	Production servers	production	f	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
3	30	PRINTERS	Printers and MFPs	production	f	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
4	40	VOIP	Voice over IP phones	production	f	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
5	100	GUEST	Guest wireless network	guest	f	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
6	999	QUARANTINE	Quarantine - restricted access	quarantine	t	2026-06-21 22:12:52.0593+00	2026-06-21 22:12:52.0593+00
\.


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 6, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 6, true);


--
-- Name: device_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_history_id_seq', 4, true);


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devices_id_seq', 10, true);


--
-- Name: discovery_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discovery_jobs_id_seq', 14, true);


--
-- Name: discovery_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discovery_sources_id_seq', 3, true);


--
-- Name: integration_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.integration_logs_id_seq', 54, true);


--
-- Name: nac_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nac_policies_id_seq', 5, true);


--
-- Name: radius_clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radius_clients_id_seq', 3, true);


--
-- Name: radius_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radius_groups_id_seq', 4, true);


--
-- Name: sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sites_id_seq', 3, true);


--
-- Name: switches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.switches_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: vlans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vlans_id_seq', 6, true);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: device_history device_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history
    ADD CONSTRAINT device_history_pkey PRIMARY KEY (id);


--
-- Name: devices devices_mac_address_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_mac_address_unique UNIQUE (mac_address);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: discovery_jobs discovery_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discovery_jobs
    ADD CONSTRAINT discovery_jobs_pkey PRIMARY KEY (id);


--
-- Name: discovery_sources discovery_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discovery_sources
    ADD CONSTRAINT discovery_sources_pkey PRIMARY KEY (id);


--
-- Name: integration_logs integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);


--
-- Name: nac_policies nac_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nac_policies
    ADD CONSTRAINT nac_policies_pkey PRIMARY KEY (id);


--
-- Name: radius_clients radius_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radius_clients
    ADD CONSTRAINT radius_clients_pkey PRIMARY KEY (id);


--
-- Name: radius_groups radius_groups_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radius_groups
    ADD CONSTRAINT radius_groups_name_unique UNIQUE (name);


--
-- Name: radius_groups radius_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radius_groups
    ADD CONSTRAINT radius_groups_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: switches switches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.switches
    ADD CONSTRAINT switches_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vlans vlans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vlans
    ADD CONSTRAINT vlans_pkey PRIMARY KEY (id);


--
-- Name: vlans vlans_vlan_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vlans
    ADD CONSTRAINT vlans_vlan_id_unique UNIQUE (vlan_id);


--
-- PostgreSQL database dump complete
--

\unrestrict COXa6LWGmc3SewZZFTkoJ3xE0MNPyMt5ChIbygXd5ubqUIbfkcpfc07TfvnbxRx

