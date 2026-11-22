# Hope, Inc. ERP — Roles, Statuses & Permissions Guide

## Account Status Lifecycle (`public.app_profiles`)
Every registered user profile is governed by `app_profiles_status_check`:
- **`active`**: Full access based on assigned role and permissions.
- **`pending`**: Awaiting administrator review before accessing ERP modules.
- **`blocked`**: Temporarily restricted from signing in or modifying records.
- **`disapproved`**: Registration rejected by an administrator.

## System Roles (`app_profiles_role_check`)
| Role | Access Level | Administrative Capabilities |
| :--- | :--- | :--- |
| **`user`** | Standard ERP access | Permitted read/write actions based on assigned `permissions` array. |
| **`admin`** | Elevated ERP access | Full module write access, user status management, and record restoration. |
| **`superadmin`** | Root system access | All `admin` privileges plus role elevation and protected superadmin safeguards (`protect_last_superadmin`). |

## Module Write Permissions
Write actions in `Client/src/App.jsx` are gated by `ERP_WRITE_PERMISSIONS`:
- **Customers:** `customers.add`, `customers.edit`, `customers.delete`
- **Products & Pricing:** `products.add`, `products.edit`, `products.delete`, `products.priceAdd`, `products.priceEdit`, `products.priceDelete`
- **HR & Organization:** `hr.empAdd`, `hr.empEdit`, `hr.empDelete`, `hr.jobAdd`, `hr.jobEdit`, `hr.jobDelete`, `hr.deptAdd`, `hr.deptEdit`, `hr.deptDelete`, `hr.jhAdd`, `hr.jhEdit`, `hr.jhDelete`
- **Sales:** `sales.add`, `sales.edit`, `sales.delete`, `sales.detailAdd`, `sales.detailEdit`, `sales.detailDelete`

Permanent deletion uses these same delete rights, but also requires the matching delete permission for every selected related record. Legacy payment records have no delete permission in the app and block permanent deletion of their linked sale.
