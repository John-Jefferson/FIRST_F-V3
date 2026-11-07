# Hope Inc. ERP - Database Security & Access Architecture

## Overview
This document outlines the database security framework, access control policies, and migration structure implemented within the Supabase (PostgreSQL) database for the ERP system, corresponding to core security migrations (`secure_erp_access` and `admin_only_erp_writes`).

---

## Migration Architecture & Scripts

### 1. `20261104000000_secure_erp_access.sql`
* **Purpose:** Establishes baseline Row Level Security (RLS) policies across core database tables.
* **Key Mechanisms:**
  * Enables RLS on sensitive ERP tables to prevent unauthorized public exposure.
  * Restricts read operations (`SELECT`) strictly to authenticated session users.
  * Maps database session claims to user authentication tokens.

### 2. `20261104010000_admin_only_erp_writes.sql`
* **Purpose:** Enforces role-based write protection for administrative actions.
* **Key Mechanisms:**
  * Restricts modification operations (`INSERT`, `UPDATE`, `DELETE`) exclusively to users assigned an administrator role.
  * Implements validation checks via custom PostgreSQL security policies to block unauthorized data tampering from standard staff profiles.

---

## Access Control Matrix

| Role | Read Access (`SELECT`) | Write Access (`INSERT`, `UPDATE`, `DELETE`) |
| :--- | :--- | :--- |
| **Anonymous / Public** | Blocked (`FALSE`) | Blocked (`FALSE`) |
| **Authenticated Staff** | Allowed | Restricted / Read-Only |
| **Administrator** | Allowed | Allowed |

---

## Security Best Practices Enforced
- **Principle of Least Privilege:** Standard users can inspect data but cannot alter system-wide records.
- **Token-Based Verification:** Supabase JWT claims validate requests securely at the database query level.
