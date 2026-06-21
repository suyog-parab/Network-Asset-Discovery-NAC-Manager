# Cisco Catalyst 2960X Configuration Guide

Last updated: 2026-06-21

---

## Overview

This guide covers the Cisco IOS configuration required on Catalyst 2960X switches to work with NAC Manager. The switch handles:

- **MAB** (MAC Authentication Bypass) — sends device MAC to FreeRADIUS for policy decision
- **RADIUS accounting** — reports session start/stop so NAC Manager tracks active devices
- **CoA** (Change of Authorization) — accepts VLAN reassignment from NAC Manager without disconnection

---

## Global Configuration

```
! =============================================
! RADIUS Server Definition
! =============================================
aaa new-model
aaa authentication dot1x default group radius
aaa authorization network default group radius
aaa accounting dot1x default start-stop group radius

radius server NAC-PRIMARY
 address ipv4 192.168.1.100 auth-port 1812 acct-port 1813
 key <RADIUS_SECRET>
 timeout 5
 retransmit 3

! =============================================
! Dynamic Authorization (CoA from NAC Manager)
! =============================================
aaa server radius dynamic-author
 client 192.168.1.100 server-key <RADIUS_SECRET>
 port 3799
 auth-type all

! =============================================
! 802.1X Global Settings
! =============================================
dot1x system-auth-control
dot1x critical eapol

! =============================================
! SNMP Configuration for NAC Manager polling
! =============================================
snmp-server community <COMMUNITY_STRING> RO
snmp-server community <COMMUNITY_WRITE_STRING> RW

! For SNMPv3 (recommended):
snmp-server group NACGroup v3 priv
snmp-server user nacuser NACGroup v3 auth sha <AUTH_PASSWORD> priv aes 128 <PRIV_PASSWORD>

! =============================================
! VLAN Definitions (must match NAC Manager)
! =============================================
vlan 10
 name Production
vlan 20
 name Corporate-IT
vlan 999
 name Quarantine

! =============================================
! Authentication Failure / Quarantine VLAN
! =============================================
ip device tracking
```

---

## Per-Port Configuration (Access Ports)

```
interface GigabitEthernet1/0/1
 description [NAC] User Access Port
 switchport mode access
 switchport access vlan 999          ! Default to quarantine until authenticated
 switchport nonegotiate
 ip access-group ACL-PRE-AUTH in     ! Optional: restrict pre-auth traffic
 authentication event fail action next-method
 authentication event server dead action reinitialize vlan 999
 authentication event server dead action authorize voice
 authentication event server alive action reinitialize
 authentication host-mode multi-auth
 authentication order mab dot1x
 authentication priority dot1x mab
 authentication port-control auto
 authentication periodic
 authentication timer reauthenticate server
 authentication violation restrict
 mab
 dot1x pae authenticator
 dot1x timeout tx-period 10
 spanning-tree portfast
 spanning-tree bpduguard enable
```

---

## Trunk Ports (Do NOT enable MAB on trunk ports)

```
interface GigabitEthernet1/0/48
 description [UPLINK] Core Switch
 switchport mode trunk
 switchport trunk allowed vlan 10,20,999
 no authentication port-control
 spanning-tree guard root
```

---

## Verification Commands

```
! Verify RADIUS server connectivity
show radius server-group all
test aaa group radius server 192.168.1.100 testuser testpass new-code

! View authenticated sessions on all ports
show authentication sessions

! View sessions on a specific port
show authentication sessions interface GigabitEthernet1/0/1 details

! Check MAB status
show mab all

! Check current VLAN assignment on a port
show interfaces GigabitEthernet1/0/1 switchport | include Access Mode VLAN

! View RADIUS accounting activity
debug radius accounting

! Manually reauthenticate a port (triggers new MAB/dot1x)
authentication restart interface GigabitEthernet1/0/1

! Clear authenticated session (triggers re-auth)
clear authentication sessions interface GigabitEthernet1/0/1
```

---

## SNMP OIDs Used by NAC Manager

| OID | Purpose |
|---|---|
| `1.3.6.1.2.1.3.1.1.2` | ARP table: IP → MAC |
| `1.3.6.1.2.1.17.7.1.2.2.1.2` | MAC table: MAC → port |
| `1.3.6.1.2.1.2.2.1.2` | Interface description |
| `1.3.6.1.2.1.2.2.1.8` | Interface operational status |
| `1.3.6.1.2.1.17.7.1.4.2.1.3` | VLAN name |
| `1.3.6.1.4.1.9.9.23.1.2.1.1` | CDP neighbor table |
| `1.3.6.1.2.1.17.7.1.4.5.1.1` | dot1qPvid (port VLAN — for VLAN write) |

---

## Troubleshooting

```
! Enable RADIUS debug (disable immediately after — high log volume)
debug radius
debug dot1x all

! Check if CoA packets are being received
debug radius dynamic-author

! Common issues:
! - "No response from RADIUS server" → Check firewall, UDP 1812 open to NAC Manager
! - "MAB not authenticating" → Check radcheck table has the MAC in correct format
! - "CoA rejected" → Check dynamic-author config, server-key matches RADIUS_SECRET
! - "Wrong VLAN after auth" → Check radreply table has correct Tunnel-Private-Group-ID
```
