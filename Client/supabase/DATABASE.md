# Hope Inc. ERP - Database Security & Access Architecture

## Overview
This document outlines the database security framework, access control policies, and migration structure implemented within the Supabase (PostgreSQL) database for the ERP system.

---

## Migration Architecture & Scripts

### 1. `20261104000000_secure_erp_access.sql`
* **Purpose:** Establishes baseline Row Level Security (RLS) policies across core database tables.
* **Key Mechanisms:**
  * Enables RLS on sensitive ERP tables to prevent unauthorized public exposure.
  * Restricts read operations (`SELECT`) strictly to authenticated session users.
  * Maps database session claims to user authentication tokens.

### 2. `20261104010000_admin_only_erp_writes.sql`
* **Purpose:** Removes anonymous access and applies a temporary admin-only write policy.
* **Key Mechanisms:**
  * Restricts modification operations to active administrators while the initial database security policies are deployed.

### 3. `20261121000000_restore_permission_based_erp_writes.sql`
* **Purpose:** Restores HopeWeb's per-action access model for the core ERP tables.
* **Key Mechanisms:**
  * Lets active users read, add, edit, or soft-delete records only when their profile has the matching permission.
  * Keeps admin and superadmin full access and continues to enforce these rules in PostgreSQL RLS.

---

## Access Control Matrix

| Role | Read Access (`SELECT`) | Write Access (`INSERT`, `UPDATE`, `DELETE`) |
| :--- | :--- | :--- |
| **Anonymous / Public** | Blocked (`FALSE`) | Blocked (`FALSE`) |
| **Active User** | Allowed only for assigned modules and reports | Allowed only for individually assigned actions; deletes are soft deletes |
| **Administrator / Superadmin** | Allowed across ERP modules | Allowed across ERP modules; deletes are soft deletes |

---

## Security Best Practices Enforced
- **Principle of Least Privilege:** User actions are limited by their assigned permissions, enforced in the database.
- **Token-Based Verification:** Supabase JWT claims validate requests securely at the database query level.
