# S1-TST-03 — User Management staging cases
| ID | Role | Action | Expected |
|---|---|---|---|
| UM-01 | Superadmin | Add user | Record created with correct status |
| UM-02 | Superadmin | Edit user | Saved changes persist |
| UM-03 | Superadmin | Block/unblock user | Blocked cannot access workspace; unblocked recovers |
| UM-04 | Admin | Approve pending User | User can log in after approval |
| UM-05 | Superadmin | Designate Admin | Role changes; access effective |
| UM-06 | Admin | List accounts | Superadmin account absent |
| UM-07 | Admin | Direct API edit to Superadmin | Server rejects request |
| UM-08 | Superadmin | Demote/remove final active Superadmin | DB transaction rejects request |
| UM-09 | Superadmin | Concurrent attempts to remove last two Superadmins | At least one remains active |
| UM-10 | Normal User | Direct API user-management mutation | Server rejects request |

Never run removal/blocking against actual team owners. Automated file only checks read-only role UI; above requires isolated staging and verified RLS.
