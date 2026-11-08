import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase.js';

const PERMISSIONS = [
  'customers.view', 'customers.add', 'customers.edit', 'customers.delete',
  'products.view', 'products.add', 'products.edit', 'products.delete',
  'products.priceAdd', 'products.priceEdit', 'products.priceDelete',
  'hr.view', 'hr.jobAdd', 'hr.jobEdit', 'hr.jobDelete', 'hr.deptAdd', 'hr.deptEdit',
  'hr.deptDelete', 'hr.empAdd', 'hr.empEdit', 'hr.empDelete', 'hr.jhView', 'hr.jhAdd',
  'hr.jhEdit', 'hr.jhDelete',
  'sales.view', 'sales.add', 'sales.edit', 'sales.delete',
  'sales.detailView', 'sales.detailAdd', 'sales.detailEdit', 'sales.detailDelete',
  'payments.view', 'payments.add', 'payments.edit', 'payments.delete',
  'reports.view', 'reports.topCustomers', 'reports.productMaster', 'reports.topProducts',
  'reports.activeEmployees', 'reports.allEmployees', 'reports.empJobHistory', 'reports.topSales',
];
const EMPTY_DATA = {
  customers: [], products: [], prices: [], employees: [], jobs: [], departments: [],
  jobHistory: [], sales: [], saleDetails: [], payments: [],
};
const ERP_TABLES = {
  customers: { name: 'customer', keys: ['custno'] },
  products: { name: 'product', keys: ['prodcode'] },
  prices: { name: 'pricehist', keys: ['effdate', 'prodcode'] },
  employees: { name: 'employee', keys: ['empno'] },
  jobs: { name: 'job', keys: ['jobcode'] },
  departments: { name: 'department', keys: ['deptcode'] },
  jobHistory: { name: 'jobhistory', keys: ['empno', 'jobcode', 'effdate'] },
  sales: { name: 'sales', keys: ['transno'] },
  saleDetails: { name: 'salesdetail', keys: ['transno', 'prodcode'] },
  payments: { name: 'payment', keys: ['orno'] },
};
const DATABASE_FIELD_NAMES = {
  empno: 'empNo', lastname: 'lastName', firstname: 'firstName', birthdate: 'birthDate',
  hiredate: 'hireDate', sepdate: 'sepDate', deptcode: 'deptCode', jobcode: 'jobCode',
  effdate: 'effDate', custno: 'custNo', custname: 'custName', payterm: 'payterms',
  prodcode: 'prodCode', unitprice: 'unitPrice', transno: 'transNo', salesdate: 'salesDate',
  paydate: 'payDate', orno: 'orNo', is_deleted: 'isDeleted',
};
function fromDatabaseRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [DATABASE_FIELD_NAMES[key] || key, value]));
}

async function fetchAllRows(table) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from(table.name).select('*');
    for (const key of table.keys) query = query.order(key, { ascending: true });
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load ${table.name}: ${error.message}`);
    rows.push(...data.map(fromDatabaseRow));
    if (data.length < pageSize) return rows;
  }
}

async function fetchErpData() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('ERP data connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Client/.env.local, then restart Vite.');
  }
  const entries = await Promise.all(Object.entries(ERP_TABLES).map(async ([collection, table]) => [
    collection,
    await fetchAllRows(table),
  ]));
  return Object.fromEntries(entries);
}

function profileFromDatabase(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    status: row.status,
    perms: Array.isArray(row.permissions) ? row.permissions : [],
  };
}

function toDatabaseRow(row, collection) {
  const overrides = collection === 'employees' ? { firstName: 'firstname', lastName: 'lastname' } : {};
  const databaseFields = Object.fromEntries(Object.entries(DATABASE_FIELD_NAMES).map(([column, field]) => [field, column]));
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [overrides[key] || databaseFields[key] || key, value]));
}

async function loadWorkspace(userId) {
  const { data: profileRow, error: profileError } = await supabase
    .from('app_profiles').select('*').eq('id', userId).single();
  if (profileError) throw new Error(`Could not load your account profile: ${profileError.message}. Apply the Supabase security migration first.`);
  const user = profileFromDatabase(profileRow);
  if (user.status !== 'active') return { user, users: [user], data: EMPTY_DATA };

  const entries = await Promise.all(Object.entries(ERP_TABLES).map(async ([collection, table]) => [
    collection,
    await fetchAllRows(table),
  ]));
  let users = [user];
  if (isAdmin(user)) {
    const { data: profiles, error } = await supabase.from('app_profiles').select('*').order('created_at');
    if (error) throw new Error(`Could not load user accounts: ${error.message}`);
    users = profiles.map(profileFromDatabase);
  }
  return { user, users, data: Object.fromEntries(entries) };
}
async function register({ email, password, firstName, lastName }) {
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: window.location.origin,
    },
  });

  return error ? { error: error.message } : {};
}
const MODULES = [
  { id: 'dashboard', label: 'Overview', initials: 'OV' },
  { id: 'customers', label: 'Customers', initials: 'CU', permission: 'customers.view' },
  { id: 'products', label: 'Products', initials: 'PR', permission: 'products.view' },
  { id: 'hr', label: 'Human resources', initials: 'HR', permission: 'hr.view' },
  { id: 'sales', label: 'Sales', initials: 'SA', permission: 'sales.view' },
  { id: 'payments', label: 'Payments', initials: 'PM', permission: 'payments.view' },
  { id: 'reports', label: 'Reports', initials: 'RE', permission: 'reports.view' },
  { id: 'users', label: 'Users', initials: 'US', adminOnly: true },
];

function isAdmin(user) {
  return user?.role === 'superadmin' || user?.role === 'admin';
}

function hasPermission(user, permission, users) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const savedUser = users.find((entry) => entry.email.toLowerCase() === user.email.toLowerCase());
  return Boolean(savedUser?.perms?.includes(permission));
}

function Brand({ compact = false }) {
  return (
    <a className={`brand${compact ? ' brand-compact' : ''}`} href="#home" aria-label="Hope ERP home">
      <span className="brand-mark" aria-hidden="true">H</span>
      <span>Hope, Inc. ERP</span>
    </a>
  );
}

function Alert({ message }) {
  if (!message) return null;
  return <div className={`alert alert-${message.type}`} role="status">{message.text}</div>;
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
function RegisterModal({ onClose, onRegister }) {
  const [message, setMessage] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const result = await onRegister({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({
          type: 'success',
          text: 'Check your email to confirm your account. An administrator must approve your access before you can use the workspace.',
        });

        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'The request could not be completed.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create account"
      subtitle="Create your Hope, Inc. ERP account"
      onClose={onClose}
    >
      <form className="modal-body" onSubmit={submit}>
        <Alert message={message} />

        <div className="role-note">
          New accounts are created as <strong>User</strong> and remain pending
          until approved.
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="regFirstName">First name</label>
            <input
              id="regFirstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="regLastName">Last name</label>
            <input
              id="regLastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="regEmail">Email address</label>
          <input
            id="regEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="regPassword">Password</label>
          <input
            id="regPassword"
            type="password"
            minLength="8"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button
          className="button button-primary button-full"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Please wait…' : 'Create account'}
        </button>
      </form>
    </Modal>
  );
}
function CustomerModal({ customer, error, onClose, onSave }) {
  const [form, setForm] = useState({
    custNo: customer?.custNo || '',
    custName: customer?.custName || '',
    address: customer?.address || '',
    payterms: customer?.payterms || '',
  });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <Modal
      title={customer ? 'Edit customer' : 'Add customer'}
      subtitle={customer ? 'Update customer details' : 'Enter customer details'}
      onClose={onClose}
    >
      <form className="modal-body" onSubmit={submit}>
        <Alert message={error ? { type: 'error', text: error } : null} />
        <div className="form-group">
          <label htmlFor="custNo">Customer number</label>
          <input id="custNo" name="custNo" value={form.custNo} onChange={update} readOnly={Boolean(customer)} required />
        </div>
        <div className="form-group">
          <label htmlFor="custName">Company name</label>
          <input id="custName" name="custName" value={form.custName} onChange={update} autoFocus required />
        </div>
        <div className="form-group">
          <label htmlFor="custAddress">Address</label>
          <input id="custAddress" name="address" value={form.address} onChange={update} required />
        </div>
        <div className="form-group">
          <label htmlFor="custPayterms">Payment terms</label>
          <input id="custPayterms" name="payterms" value={form.payterms} onChange={update} placeholder="e.g. Net 30" required />
        </div>
        <div className="modal-actions">
          <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit">{customer ? 'Update customer' : 'Save customer'}</button>
        </div>
      </form>
    </Modal>
  );
}

function LandingPage({ openAuth }) {
  const features = [
    { initials: 'CU', title: 'Customer management', description: 'Track customer relationships, addresses, and payment terms in one place.' },
    { initials: 'PR', title: 'Product management', description: 'Maintain your product catalog, units, and pricing history.' },
    { initials: 'HR', title: 'Human resources', description: 'Manage employees, positions, departments, and employment history.' },
    { initials: 'SA', title: 'Sales management', description: 'Process sales transactions, orders, line items, and reports.' },
  ];

  return (
    <div className="landing-page" id="home">
      <header className="landing-header">
        <Brand />
        <div className="header-actions">
          <button className="button button-ghost" onClick={() => openAuth('login')}>Sign in</button>
          <button className="button button-primary" onClick={() => openAuth('register')}>Get started</button>
        </div>
      </header>
      <div className="local-demo-warning" role="note">Supabase Auth and database policies protect company records. New accounts need email confirmation and administrator approval.</div>

      <main>
        <section className="hero section-container">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Enterprise resource planning</span>
            <h1>One platform.<br /><span>Every part of your business.</span></h1>
            <p>Bring customer management, products, people, and sales together in a clear, connected workspace.</p>
            <div className="hero-actions">
              <button className="button button-primary button-large" onClick={() => openAuth('login')}>Sign in to your workspace <span aria-hidden="true">→</span></button>
              <button className="button button-outline button-large" onClick={() => openAuth('register')}>Create an account</button>
            </div>
            <p className="hero-caption">A practical workspace for the way your team works.</p>
          </div>
          <div className="preview-card" aria-label="Preview of the ERP dashboard">
            <div className="preview-topbar">
              <div className="preview-controls"><span /><span /><span /></div>
              <span>HOPE / WORKSPACE</span>
              <span className="preview-avatar">H</span>
            </div>
            <div className="preview-content">
              <div className="preview-heading"><div><span className="preview-kicker">CONNECTED OPERATIONS</span><strong>Your business overview</strong></div><span className="preview-badge">SECURE ACCESS</span></div>
              <div className="preview-stats">
                <div><span>Account roles</span><strong>Managed</strong><small>Protected admin access</small></div>
                <div><span>ERP records</span><strong>Connected</strong><small>Supabase tables</small></div>
              </div>
              <div className="preview-list">
                <div className="preview-list-heading"><strong>Workspace modules</strong><span>One source of truth</span></div>
                <div><span className="preview-initial">PR</span><span>Products &amp; pricing<small>Effective-dated price history</small></span><i>Connected</i></div>
                <div><span className="preview-initial preview-initial-alt">HR</span><span>People &amp; departments<small>Employee job history</small></span><i>Connected</i></div>
                <div><span className="preview-initial preview-initial-third">SA</span><span>Sales &amp; payments<small>Transactions and receipts</small></span><i>Connected</i></div>
              </div>
            </div>
            <div className="preview-footer"><span className="status-dot" /> All systems ready <span>Secure workspace</span></div>
          </div>
        </section>

        <section className="features-section">
          <div className="section-container">
            <div className="section-heading">
              <span className="section-kicker">CONNECTED OPERATIONS</span>
              <h2>The essentials, working together.</h2>
              <p>Keep daily work organized across the teams that move your business forward.</p>
            </div>
            <div className="feature-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <span className="feature-icon">{feature.initials}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <span className="feature-arrow" aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand compact />
        <span>© 2026 Hope, Inc. ERP · All rights reserved.</span>
      </footer>
    </div>
  );
}

function Overview({ user, users, data, onNavigate }) {
  const message = {
    superadmin: 'You have full access to every module and account.',
    admin: 'You can manage most modules and user rights, except Superadmin accounts.',
    user: 'You can use the modules an admin has assigned to you.',
  }[user.role];

  return (
    <>
      <section className="welcome-panel">
        <div>
          <span className="section-kicker">YOUR WORKSPACE</span>
          <h2>Welcome back, {user.firstName || 'User'}.</h2>
          <p>{message}</p>
        </div>
        <span className="welcome-mark" aria-hidden="true">H</span>
      </section>
      <div className="stats-grid">
        {hasPermission(user, 'customers.view', users) && <article className="stat-card"><span className="stat-label">Active customers</span><strong>{data.customers.filter((customer) => !customer.isDeleted).length}</strong><span className="stat-foot"><span className="status-dot" /> Live database records</span></article>}
        {hasPermission(user, 'products.view', users) && <article className="stat-card"><span className="stat-label">Active products</span><strong>{data.products.filter((product) => !product.isDeleted).length}</strong><span className="stat-foot">Product catalog</span></article>}
        {hasPermission(user, 'hr.view', users) && <article className="stat-card"><span className="stat-label">Active employees</span><strong>{data.employees.filter((employee) => !employee.isDeleted && !employee.sepDate).length}</strong><span className="stat-foot">No separation date</span></article>}
        {hasPermission(user, 'sales.view', users) && <article className="stat-card"><span className="stat-label">Sales transactions</span><strong>{data.sales.filter((sale) => !sale.isDeleted).length}</strong><span className="stat-foot">Active transactions</span></article>}
        <article className="stat-card"><span className="stat-label">Your role</span><strong className="stat-role">{user.role}</strong><span className="stat-foot">Managed access</span></article>
      </div>
      <section className="content-panel">
        <div className="panel-heading"><div><h3>Quick access</h3><p>Jump into a workspace module.</p></div></div>
        <div className="quick-access-grid">
          {MODULES.filter((module) => (!module.adminOnly || isAdmin(user))
            && (!module.permission || hasPermission(user, module.permission, users)))
            .map((module) => (
              <button className="quick-access-card" key={module.id} onClick={() => onNavigate(module.id)}>
                <span className="feature-icon">{module.initials}</span>
                <span><strong>{module.label}</strong><small>Open module <span aria-hidden="true">→</span></small></span>
              </button>
            ))}
        </div>
      </section>
    </>
  );
}

function CustomersPage({ user, users, customers, onSave, onChangeState }) {
  const admin = isAdmin(user);
  const canAdd = admin;
  const canEdit = admin;
  const canDelete = admin;
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (!admin || filter === 'active') result = result.filter((customer) => !customer.isDeleted);
    else if (filter === 'inactive') result = result.filter((customer) => customer.isDeleted);
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((customer) =>
        [customer.custNo, customer.custName, customer.address, customer.payterms]
          .some((value) => String(value || '').toLowerCase().includes(query)),
      );
    }
    return result;
  }, [admin, customers, filter, search]);

  async function save(form) {
    const result = await onSave(form, editing?.custNo);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setError('');
  }

  function openForm(customer = null) {
    setEditing(customer || {});
    setError('');
  }

  return (
    <section className="content-panel customers-panel">
      <div className="module-toolbar">
        <div>
          <span className="section-kicker">DIRECTORY</span>
          <h2>Customers</h2>
          <p>Manage customer records and payment terms.</p>
        </div>
        <div className="toolbar-actions">
          <label className="search-field">
            <span className="sr-only">Search customers</span>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" />
          </label>
          {canAdd && <button className="button button-primary" onClick={() => openForm()}>＋ Add customer</button>}
        </div>
      </div>

      <div className="table-controls">
        <div className="filter-tabs" role="tablist" aria-label="Customer status">
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')} role="tab" aria-selected={filter === 'active'}>
            Active <span>{customers.filter((customer) => !customer.isDeleted).length}</span>
          </button>
          {admin && (
            <>
              <button className={filter === 'inactive' ? 'active' : ''} onClick={() => setFilter('inactive')} role="tab" aria-selected={filter === 'inactive'}>
                Inactive <span>{customers.filter((customer) => customer.isDeleted).length}</span>
              </button>
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')} role="tab" aria-selected={filter === 'all'}>
                All <span>{customers.length}</span>
              </button>
            </>
          )}
        </div>
        <span className="result-count">{filteredCustomers.length} {filteredCustomers.length === 1 ? 'record' : 'records'}</span>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer no.</th>
              <th>Company name</th>
              <th>Address</th>
              <th>Payment terms</th>
              {admin && <th>Status</th>}
              {admin && <th>Last updated</th>}
              {(canEdit || canDelete || admin) && <th><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr className={customer.isDeleted ? 'deleted-row' : ''} key={customer.custNo}>
                <td><span className="customer-number">{customer.custNo}</span></td>
                <td className="company-cell">{customer.custName}</td>
                <td>{customer.address}</td>
                <td>{customer.payterms}</td>
                {admin && <td><span className={`status-badge ${customer.isDeleted ? 'status-inactive' : 'status-active'}`}>{customer.isDeleted ? 'Inactive' : 'Active'}</span></td>}
                {admin && <td className="stamp-cell">{customer.stamp}</td>}
                {(canEdit || canDelete || admin) && (
                  <td>
                    <div className="row-actions">
                      {customer.isDeleted
                        ? admin && <button className="table-action" onClick={() => onChangeState(customer.custNo, false, 'RESTORED')}>Restore</button>
                        : canEdit && <button className="table-action" onClick={() => openForm(customer)}>Edit</button>}
                      {!customer.isDeleted && canDelete && (
                        <button
                          className="table-action table-action-danger"
                          onClick={() => {
                            if (window.confirm('Mark this customer as inactive? An admin can restore it later.')) {
                              onChangeState(customer.custNo, true, 'DELETED');
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr><td className="empty-state" colSpan={admin ? 7 : canEdit || canDelete ? 5 : 4}>No customers match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <CustomerModal
          customer={editing.custNo ? editing : null}
          error={error}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </section>
  );
}

const COLLECTIONS = {
  products: {
    label: 'Products', singular: 'product', permission: 'products',
    key: ['prodCode'], fields: [
      { key: 'prodCode', label: 'Product code' }, { key: 'description', label: 'Description' },
      { key: 'unit', label: 'Unit' },
    ],
  },
  prices: {
    label: 'Price history', singular: 'price', permission: 'products',
    key: ['prodCode', 'effDate'], fields: [
      { key: 'prodCode', label: 'Product', type: 'select', source: 'products', sourceKey: 'prodCode', sourceLabel: 'description' },
      { key: 'effDate', label: 'Effective date', type: 'date' }, { key: 'unitPrice', label: 'Unit price', type: 'number' },
    ],
  },
  employees: {
    label: 'Employees', singular: 'employee', permission: 'hr.emp',
    key: ['empNo'], fields: [
      { key: 'empNo', label: 'Employee no.' }, { key: 'firstName', label: 'First name' },
      { key: 'lastName', label: 'Last name' }, { key: 'gender', label: 'Gender' },
      { key: 'birthDate', label: 'Birth date', type: 'date' }, { key: 'hireDate', label: 'Hire date', type: 'date' },
      { key: 'sepDate', label: 'Separation date', type: 'date', optional: true },
    ],
  },
  jobs: {
    label: 'Jobs', singular: 'job', permission: 'hr.job',
    key: ['jobCode'], fields: [{ key: 'jobCode', label: 'Job code' }, { key: 'jobDesc', label: 'Job title' }],
  },
  departments: {
    label: 'Departments', singular: 'department', permission: 'hr.dept',
    key: ['deptCode'], fields: [{ key: 'deptCode', label: 'Department code' }, { key: 'deptName', label: 'Department name' }],
  },
  jobHistory: {
    label: 'Job history', singular: 'job history record', permission: 'hr.jh',
    key: ['empNo', 'jobCode', 'effDate'], fields: [
      { key: 'empNo', label: 'Employee', type: 'select', source: 'employees', sourceKey: 'empNo', sourceLabel: 'firstName' },
      { key: 'jobCode', label: 'Job', type: 'select', source: 'jobs', sourceKey: 'jobCode', sourceLabel: 'jobDesc' },
      { key: 'deptCode', label: 'Department', type: 'select', source: 'departments', sourceKey: 'deptCode', sourceLabel: 'deptName' },
      { key: 'effDate', label: 'Effective date', type: 'date' }, { key: 'salary', label: 'Salary', type: 'number' },
    ],
  },
  sales: {
    label: 'Transactions', singular: 'sale', permission: 'sales',
    key: ['transNo'], fields: [
      { key: 'transNo', label: 'Transaction no.' }, { key: 'salesDate', label: 'Sales date', type: 'date' },
      { key: 'custNo', label: 'Customer', type: 'select', source: 'customers', sourceKey: 'custNo', sourceLabel: 'custName' },
      { key: 'empNo', label: 'Sales employee', type: 'select', source: 'employees', sourceKey: 'empNo', sourceLabel: 'firstName' },
    ],
  },
  saleDetails: {
    label: 'Sale items', singular: 'sale item', permission: 'sales.detail',
    key: ['transNo', 'prodCode'], fields: [
      { key: 'transNo', label: 'Transaction', type: 'select', source: 'sales', sourceKey: 'transNo', sourceLabel: 'transNo' },
      { key: 'prodCode', label: 'Product', type: 'select', source: 'products', sourceKey: 'prodCode', sourceLabel: 'description' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
    ],
  },
  payments: {
    label: 'Payments', singular: 'payment', permission: 'payments',
    key: ['orNo'], fields: [
      { key: 'orNo', label: 'Receipt no.' }, { key: 'payDate', label: 'Payment date', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'transNo', label: 'Sale transaction', type: 'select', source: 'sales', sourceKey: 'transNo', sourceLabel: 'transNo' },
    ],
  },
};

const SECTION_TABS = {
  products: ['products', 'prices'],
  hr: ['employees', 'jobs', 'departments', 'jobHistory'],
  sales: ['sales', 'saleDetails'],
  payments: ['payments'],
};

function recordKey(record, collection) {
  return COLLECTIONS[collection].key.map((key) => record[key]).join('|');
}

function RecordModal({ collection, record, data, customers, error, onClose, onSave }) {
  const config = COLLECTIONS[collection];
  const [form, setForm] = useState(() => Object.fromEntries(
    config.fields.map((field) => [field.key, record?.[field.key] ?? '']),
  ));
  const [message, setMessage] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const sources = { ...data, customers };

  async function submit(event) {
    event.preventDefault();
    const result = await onSave(collection, form, record ? recordKey(record, collection) : null);
    if (result.error) setMessage(result.error);
    else onClose();
  }

  return (
    <Modal title={`${record ? 'Edit' : 'Add'} ${config.singular}`} subtitle="Keep your workspace records up to date." onClose={onClose} wide>
      <form className="modal-body" onSubmit={submit}>
        <Alert message={message || error ? { type: 'error', text: message || error } : null} />
        <div className="record-form-grid">
          {config.fields.map((field) => {
            const options = field.source ? (sources[field.source] || []).filter((item) => !item.isDeleted) : [];
            const fieldOptions = field.type === 'select' && record?.[field.key] && !options.some((item) => item[field.sourceKey] === record[field.key])
              ? [{ [field.sourceKey]: record[field.key], [field.sourceLabel]: record[field.key] }, ...options]
              : options;
            return (
              <div className="form-group" key={field.key}>
                <label htmlFor={`record-${field.key}`}>{field.label}</label>
                {field.type === 'select' ? (
                  <select id={`record-${field.key}`} name={field.key} value={form[field.key]} onChange={update} required>
                            <option value="">Select {field.label.toLowerCase()}</option>
                    {fieldOptions.map((option) => (
                      <option key={option[field.sourceKey]} value={option[field.sourceKey]}>
                        {option[field.sourceKey]} — {option[field.sourceLabel]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`record-${field.key}`}
                    name={field.key}
                    type={field.type || 'text'}
                    min={field.type === 'number' ? '0' : undefined}
                    step={field.type === 'number' ? 'any' : undefined}
                    readOnly={Boolean(record && config.key.includes(field.key))}
                    value={form[field.key]}
                    onChange={update}
                    required={!field.optional}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit">{record ? 'Save changes' : 'Add record'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RecordsPage({ section, user, users, data, customers, onSave, onChangeState }) {
  const [collection, setCollection] = useState(SECTION_TABS[section][0]);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const config = COLLECTIONS[collection];
  const actionPermissions = {
    products: { add: 'products.add', edit: 'products.edit', delete: 'products.delete' },
    prices: { add: 'products.priceAdd', edit: 'products.priceEdit', delete: 'products.priceDelete' },
    employees: { add: 'hr.empAdd', edit: 'hr.empEdit', delete: 'hr.empDelete' },
    jobs: { add: 'hr.jobAdd', edit: 'hr.jobEdit', delete: 'hr.jobDelete' },
    departments: { add: 'hr.deptAdd', edit: 'hr.deptEdit', delete: 'hr.deptDelete' },
    jobHistory: { add: 'hr.jhAdd', edit: 'hr.jhEdit', delete: 'hr.jhDelete' },
    sales: { add: 'sales.add', edit: 'sales.edit', delete: 'sales.delete' },
    saleDetails: { add: 'sales.detailAdd', edit: 'sales.detailEdit', delete: 'sales.detailDelete' },
    payments: { add: 'payments.add', edit: 'payments.edit', delete: 'payments.delete' },
  }[collection];
  const canAdd = isAdmin(user);
  const canEdit = isAdmin(user);
  const canDelete = isAdmin(user);
  const records = data[collection] || [];
  const filtered = records.filter((record) => {
    if (!isAdmin(user) && record.isDeleted) return false;
    if (filter === 'active' && record.isDeleted) return false;
    if (filter === 'inactive' && !record.isDeleted) return false;
    const query = search.trim().toLowerCase();
    return !query || config.fields.some((field) => String(record[field.key] ?? '').toLowerCase().includes(query));
  });

  async function save(form) {
    const result = await onSave(collection, form, editing ? recordKey(editing, collection) : null);
    if (result.error) setError(result.error);
    else { setEditing(null); setModalOpen(false); setError(''); }
  }

  return (
    <>
      <section className="content-panel records-panel">
        <div className="module-toolbar">
          <div><span className="section-kicker">WORKSPACE MODULE</span><h2>{config.label}</h2><p>Search, maintain, and review {config.label.toLowerCase()}.</p></div>
          <div className="toolbar-actions">
            <label className="search-field"><span className="sr-only">Search records</span><span className="search-icon" aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.label.toLowerCase()}`} />
            </label>
            {canAdd && <button className="button button-primary" onClick={() => { setEditing(null); setModalOpen(true); setError(''); }}>＋ Add {config.singular}</button>}
          </div>
        </div>
        <div className="module-tabs" role="tablist" aria-label={`${section} records`}>
          {SECTION_TABS[section].filter((tab) => tab !== 'jobHistory' || hasPermission(user, 'hr.jhView', users))
            .filter((tab) => tab !== 'saleDetails' || hasPermission(user, 'sales.detailView', users))
            .map((tab) => <button key={tab} role="tab" aria-selected={collection === tab} className={collection === tab ? 'active' : ''} onClick={() => { setCollection(tab); setFilter('active'); setSearch(''); setEditing(null); }}>{COLLECTIONS[tab].label}</button>)}
        </div>
        <div className="table-controls">
          <div className="filter-tabs" role="tablist" aria-label="Record status">
            <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active <span>{records.filter((record) => !record.isDeleted).length}</span></button>
            {isAdmin(user) && <><button className={filter === 'inactive' ? 'active' : ''} onClick={() => setFilter('inactive')}>Inactive <span>{records.filter((record) => record.isDeleted).length}</span></button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <span>{records.length}</span></button></>}
          </div>
          <span className="result-count">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span>
        </div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr>{config.fields.map((field) => <th key={field.key}>{field.label}</th>)}{isAdmin(user) && <th>Status</th>}{(canEdit || canDelete || isAdmin(user)) && <th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.map((record) => (
              <tr className={record.isDeleted ? 'deleted-row' : ''} key={recordKey(record, collection)}>
                {config.fields.map((field) => <td key={field.key}>{field.type === 'number' ? Number(record[field.key]).toLocaleString() : record[field.key] || '—'}</td>)}
                {isAdmin(user) && <td><span className={`status-badge ${record.isDeleted ? 'status-inactive' : 'status-active'}`}>{record.isDeleted ? 'Inactive' : 'Active'}</span></td>}
                {(canEdit || canDelete || isAdmin(user)) && <td><div className="row-actions">
                  {record.isDeleted ? isAdmin(user) && <button className="table-action" onClick={() => onChangeState(collection, recordKey(record, collection), false)}>Restore</button>
                    : canEdit && <button className="table-action" onClick={() => { setEditing(record); setModalOpen(true); setError(''); }}>Edit</button>}
                  {!record.isDeleted && canDelete && <button className="table-action table-action-danger" onClick={() => window.confirm(`Mark this ${config.singular} inactive?`) && onChangeState(collection, recordKey(record, collection), true)}>Delete</button>}
                </div></td>}
              </tr>
            ))}
            {!filtered.length && <tr><td className="empty-state" colSpan={config.fields.length + (isAdmin(user) ? 2 : canEdit || canDelete ? 1 : 0)}>No records match your filters.</td></tr>}
          </tbody>
        </table></div>
      </section>
      {modalOpen && <RecordModal collection={collection} record={editing} data={data} customers={customers} error={error} onClose={() => { setEditing(null); setModalOpen(false); }} onSave={save} />}
    </>
  );
}

const REPORTS = [
  { id: 'topCustomers', label: 'Top Customers', permission: 'reports.topCustomers' },
  { id: 'productMaster', label: 'Product Master List', permission: 'reports.productMaster' },
  { id: 'topProducts', label: 'Top Products', permission: 'reports.topProducts' },
  { id: 'activeEmployees', label: 'Active Employees', permission: 'reports.activeEmployees' },
  { id: 'allEmployees', label: 'All Employees', permission: 'reports.allEmployees' },
  { id: 'empJobHistory', label: 'Employee Job History', permission: 'reports.empJobHistory' },
  { id: 'topSales', label: 'Top Sales', permission: 'reports.topSales' },
];

function ReportsPage({ user, users, data, customers }) {
  const availableReports = REPORTS.filter((report) => hasPermission(user, report.permission, users));
  const [reportId, setReportId] = useState(availableReports[0]?.id || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [topN, setTopN] = useState('10');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const report = availableReports.find((item) => item.id === reportId) || availableReports[0];
  const activeSales = data.sales.filter((sale) => !sale.isDeleted && sale.salesDate >= (from || '') && sale.salesDate <= (to || '9999-12-31'));
  const lineValue = (sale, detail) => {
    const prices = data.prices.filter((price) => price.prodCode === detail.prodCode && !price.isDeleted && price.effDate <= sale.salesDate).sort((a, b) => b.effDate.localeCompare(a.effDate));
    return Number(detail.quantity) * Number(prices[0]?.unitPrice || 0);
  };
  const saleValue = (sale) => data.saleDetails.filter((detail) => detail.transNo === sale.transNo && !detail.isDeleted).reduce((sum, detail) => sum + lineValue(sale, detail), 0);
  let rows = [];
  let headers = [];
  if (report?.id === 'topCustomers') {
    headers = ['Rank', 'Customer no.', 'Customer', 'Transactions', 'Sales total'];
    rows = customers.filter((customer) => !customer.isDeleted).map((customer) => {
      const sales = activeSales.filter((sale) => sale.custNo === customer.custNo);
      return [customer.custNo, customer.custName, sales.length, sales.reduce((sum, sale) => sum + saleValue(sale), 0)];
    }).filter((row) => row[2] > 0).sort((a, b) => b[3] - a[3]).slice(0, Number(topN) || 10)
      .map((row, index) => [index + 1, ...row]);
  } else if (report?.id === 'productMaster') {
    headers = ['Product code', 'Description', 'Unit', 'Latest unit price'];
    rows = data.products.filter((product) => !product.isDeleted).map((product) => {
      const price = data.prices.filter((item) => item.prodCode === product.prodCode && !item.isDeleted).sort((a, b) => b.effDate.localeCompare(a.effDate))[0];
      return [product.prodCode, product.description, product.unit, price?.unitPrice ?? 0];
    });
  } else if (report?.id === 'topProducts') {
    headers = ['Rank', 'Product code', 'Description', 'Units sold', 'Sales total'];
    rows = data.products.filter((product) => !product.isDeleted).map((product) => {
      const details = data.saleDetails.filter((detail) => detail.prodCode === product.prodCode && !detail.isDeleted && activeSales.some((sale) => sale.transNo === detail.transNo));
      const total = details.reduce((sum, detail) => sum + Number(detail.quantity), 0);
      return [product.prodCode, product.description, total, details.reduce((sum, detail) => {
        const sale = activeSales.find((item) => item.transNo === detail.transNo);
        return sum + (sale ? lineValue(sale, detail) : 0);
      }, 0)];
    }).sort((a, b) => b[3] - a[3]).slice(0, Number(topN) || 10)
      .map((row, index) => [index + 1, ...row]);
  } else if (report?.id === 'activeEmployees' || report?.id === 'allEmployees') {
    headers = ['Employee no.', 'Name', 'Gender', 'Hire date', 'Separation date', 'Status'];
    rows = data.employees.filter((employee) => !employee.isDeleted && (report.id === 'allEmployees' || !employee.sepDate))
      .map((employee) => [employee.empNo, `${employee.firstName} ${employee.lastName}`, employee.gender, employee.hireDate, employee.sepDate || '—', employee.sepDate ? 'Separated' : 'Active']);
  } else if (report?.id === 'empJobHistory') {
    headers = ['Employee', 'Job', 'Department', 'Effective date', 'Salary'];
    rows = data.jobHistory.filter((item) => !item.isDeleted && item.empNo === selectedEmployee)
      .sort((a, b) => b.effDate.localeCompare(a.effDate))
      .map((item) => [`${item.empNo} · ${data.employees.find((employee) => employee.empNo === item.empNo)?.lastName || ''}`, data.jobs.find((job) => job.jobCode === item.jobCode)?.jobDesc || item.jobCode, data.departments.find((department) => department.deptCode === item.deptCode)?.deptName || item.deptCode, item.effDate, item.salary]);
  } else if (report?.id === 'topSales') {
    headers = ['Rank', 'Transaction', 'Date', 'Customer', 'Sales employee', 'Total'];
    rows = activeSales.map((sale) => [sale.transNo, sale.salesDate, customers.find((customer) => customer.custNo === sale.custNo)?.custName || sale.custNo, data.employees.find((employee) => employee.empNo === sale.empNo)?.lastName || sale.empNo, saleValue(sale)])
      .sort((a, b) => b[4] - a[4]).slice(0, Number(topN) || 10).map((row, index) => [index + 1, ...row]);
  }

  useEffect(() => {
    if (!availableReports.some((item) => item.id === reportId)) setReportId(availableReports[0]?.id || '');
  }, [availableReports, reportId]);

  if (!availableReports.length) return <section className="content-panel empty-report">No reports are assigned to your account.</section>;

  return (
    <section className="content-panel reports-panel">
      <div className="module-toolbar"><div><span className="section-kicker">BUSINESS INTELLIGENCE</span><h2>Reports</h2><p>Explore operational performance and export a print-ready report.</p></div>
        <div className="report-actions"><button className="button button-outline" onClick={() => window.print()}>Print / Save PDF</button></div>
      </div>
      <div className="module-tabs report-tabs" role="tablist" aria-label="Available reports">
        {availableReports.map((item) => <button key={item.id} role="tab" aria-selected={report?.id === item.id} className={report?.id === item.id ? 'active' : ''} onClick={() => setReportId(item.id)}>{item.label}</button>)}
      </div>
      {['topCustomers', 'topProducts', 'topSales'].includes(report?.id) && <div className="report-filters">
        <label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label>Top <input type="number" min="1" max="100" value={topN} onChange={(event) => setTopN(event.target.value)} /></label>
      </div>}
      {report?.id === 'empJobHistory' && <div className="report-filters"><label>Employee
        <select value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)}>
          <option value="">Select an employee</option>
          {data.employees.filter((employee) => !employee.isDeleted).map((employee) => <option key={employee.empNo} value={employee.empNo}>{employee.empNo} — {employee.firstName} {employee.lastName}</option>)}
        </select>
      </label></div>}
      <div className="report-title"><span className="section-kicker">HOPE, INC. ERP</span><h3>{report?.label}</h3><p>Generated {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date())}</p></div>
      <div className="table-scroll"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${report.id}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{typeof cell === 'number' && ['Sales total', 'Latest unit price', 'Total', 'Salary'].includes(headers[cellIndex]) ? `$${cell.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : cell}</td>)}</tr>)}
          {!rows.length && <tr><td className="empty-state" colSpan={headers.length}>{report?.id === 'empJobHistory' && !selectedEmployee ? 'Select an employee to view job history.' : 'No records found for this report.'}</td></tr>}
        </tbody>
      </table></div>
    </section>
  );
}

function UserManagement({ user, users, onSave, onDelete, onStatus, onPermissions }) {
  const isSuper = user.role === 'superadmin';
  const [editing, setEditing] = useState(null);
  const [rightsUser, setRightsUser] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'user' });
  const [rights, setRights] = useState([]);
  const visible = users.filter((entry) => (isSuper || entry.role !== 'superadmin') &&
    `${entry.firstName} ${entry.lastName} ${entry.email}`.toLowerCase().includes(search.toLowerCase()));

  function openForm(entry = null) {
    setEditing(entry?.email ?? '');
    setForm(entry ? { ...entry, password: '' } : { firstName: '', lastName: '', email: '', password: '', role: 'user' });
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    const result = await onSave(form, editing || null);
    if (result.error) setError(result.error);
    else setEditing(null);
  }

  async function removeAccount(entry) {
    if (entry.email.toLowerCase() === user.email.toLowerCase()) {
      setError('You cannot remove your own account.');
      return;
    }
    if (!window.confirm(`Permanently remove ${entry.firstName} ${entry.lastName} (${entry.email}) from Hope, Inc. ERP?`)) return;
    const result = await onDelete(entry.email);
    if (result?.error) setError(result.error);
  }

  function togglePermission(permission) {
    setRights((current) => current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission]);
  }

  return (
    <>
      <section className="content-panel users-panel">
        <div className="module-toolbar"><div><span className="section-kicker">ACCESS CONTROL</span><h2>User management</h2><p>{isSuper ? 'Manage every account, assign roles, and configure permissions.' : 'Manage User accounts. Superadmin accounts are hidden and protected.'} Accounts and roles are secured in Supabase.</p></div>
          <div className="toolbar-actions"><label className="search-field"><span className="sr-only">Search users</span><span className="search-icon" aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /></label><button className="button button-primary" onClick={() => openForm()}>＋ Add user</button></div>
        </div>
        <Alert message={error && editing === null ? { type: 'error', text: error } : null} />
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{visible.map((entry) => {
            const manageable = isSuper || entry.role === 'user';
            const self = entry.email.toLowerCase() === user.email.toLowerCase();
            return <tr key={entry.email}>
              <td className="company-cell">{entry.firstName} {entry.lastName}</td><td>{entry.email}</td>
              <td><span className={`role-badge role-${entry.role}`}>{entry.role}</span></td>
              <td><span className={`status-badge ${entry.status === 'active' ? 'status-active' : 'status-inactive'}`}>{entry.status || 'active'}</span></td>
              <td><div className="row-actions">
                {manageable && entry.status === 'pending' && <><button className="table-action" onClick={() => onStatus(entry.email, 'active')}>Approve</button><button className="table-action table-action-danger" onClick={() => onStatus(entry.email, 'disapproved')}>Disapprove</button></>}
                {manageable && entry.status === 'active' && !self && <button className="table-action table-action-danger" onClick={() => onStatus(entry.email, 'blocked')}>Block</button>}
                {manageable && entry.status === 'blocked' && <button className="table-action" onClick={() => onStatus(entry.email, 'active')}>Unblock</button>}
                {manageable && <button className="table-action" onClick={() => openForm(entry)}>Edit</button>}
                {manageable && entry.role === 'user' && <button className="table-action" onClick={() => { setRightsUser(entry); setRights([...(entry.perms || [])]); }}>Rights</button>}
                {manageable && !self && <button className="table-action table-action-danger" onClick={() => removeAccount(entry)}>Delete</button>}
              </div></td>
            </tr>;
          })}
          {!visible.length && <tr><td className="empty-state" colSpan="5">No users match your search.</td></tr>}</tbody>
        </table></div>
      </section>
      {editing !== null && <Modal title={editing ? 'Edit account' : 'Add account'} subtitle={editing ? "Update this user's profile and access level." : 'Create a Supabase Auth account with an active profile.'} onClose={() => setEditing(null)}>
        <form className="modal-body" onSubmit={submit}><Alert message={error ? { type: 'error', text: error } : null} />
          <div className="form-row"><div className="form-group"><label htmlFor="user-first">First name</label><input id="user-first" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /></div>
            <div className="form-group"><label htmlFor="user-last">Last name</label><input id="user-last" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /></div></div>
          <div className="form-group"><label htmlFor="user-email">Email</label><input id="user-email" type="email" value={form.email} readOnly={Boolean(editing)} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
          {!editing && <div className="form-group"><label htmlFor="user-password">Temporary password</label><input id="user-password" type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><small className="form-help">At least 8 characters. Share it securely with the new user.</small></div>}
          {isSuper && <div className="form-group"><label htmlFor="user-role">Role</label><select id="user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="user">User</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></div>}
          <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" type="submit">Save account</button></div>
        </form>
      </Modal>}
      {rightsUser && <Modal title={`Permissions · ${rightsUser.firstName}`} subtitle="Choose the modules and actions this user can access." onClose={() => setRightsUser(null)} wide>
        <div className="rights-grid">{['customers', 'products', 'hr', 'sales', 'payments', 'reports'].map((group) => {
          const permissions = PERMISSIONS.filter((permission) => permission.startsWith(`${group}.`));
          return <fieldset key={group}><legend>{group === 'hr' ? 'Human resources' : group[0].toUpperCase() + group.slice(1)}</legend>
            {permissions.map((permission) => <label key={permission}><input type="checkbox" checked={rights.includes(permission)} onChange={() => togglePermission(permission)} /><span>{permission.split('.').slice(1).join(' · ').replace(/([A-Z])/g, ' $1')}</span></label>)}
          </fieldset>;
        })}</div>
        <div className="modal-actions rights-actions"><button className="button button-outline" onClick={() => setRightsUser(null)}>Cancel</button><button className="button button-primary" onClick={() => { onPermissions(rightsUser.email, rights); setRightsUser(null); }}>Save permissions</button></div>
      </Modal>}
    </>
  );
}

function Dashboard({ user, users, customers, data, dataError, dataLoading, onReloadData, appError, clearError, onLogout, onCustomerSave, onCustomerState, onRecordSave, onRecordState, onUserSave, onUserDelete, onUserStatus, onUserPermissions }) {
  const [activePage, setActivePage] = useState('dashboard');
  const visibleModules = MODULES.filter((module) => {
    if (module.adminOnly) return isAdmin(user);
    return !module.permission || hasPermission(user, module.permission, users);
  });
  const currentPage = visibleModules.find((module) => module.id === activePage) || visibleModules[0];
  const name = `${user.firstName || 'User'} ${user.lastName || ''}`.trim();

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact />
        <nav className="dashboard-nav" aria-label="Main navigation">
          {visibleModules.map((module) => <button className={currentPage.id === module.id ? 'nav-item active' : 'nav-item'} key={module.id} onClick={() => setActivePage(module.id)}><span className="nav-initials">{module.initials}</span>{module.label}</button>)}
        </nav>
        <div className="account-area"><div className="account-user"><span className="account-avatar">{name.charAt(0).toUpperCase()}</span><span className="account-copy"><strong>{name}</strong><small>{user.role}</small></span><span className={`role-badge role-${user.role}`}>{user.role}</span></div>
          <button className="button button-ghost logout-button" onClick={onLogout}>Sign out</button></div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading"><div><span className="section-kicker">HOPE, INC. ERP / WORKSPACE</span><h1>{currentPage.label}</h1></div><span className="page-date">{new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date())}</span></div>
        <div className="local-demo-warning" role="note">
          Supabase Auth secures your session. Database RLS controls access: only active admins and superadmins can add, edit, or soft-delete ERP records.
          <button className="button button-outline" onClick={onReloadData} disabled={dataLoading}>{dataLoading ? 'Loading…' : 'Refresh ERP data'}</button>
        </div>
        {dataError && <div className="app-notice"><Alert message={{ type: 'error', text: dataError }} /></div>}
        {appError && <div className="app-notice"><Alert message={{ type: 'error', text: appError }} /><button className="icon-button" onClick={clearError} aria-label="Dismiss error">×</button></div>}
        {currentPage.id === 'dashboard' && <Overview user={user} users={users} data={data} onNavigate={setActivePage} />}
        {currentPage.id === 'customers' && <CustomersPage user={user} users={users} customers={customers} onSave={onCustomerSave} onChangeState={onCustomerState} />}
        {['products', 'hr', 'sales', 'payments'].includes(currentPage.id) && <RecordsPage key={currentPage.id} section={currentPage.id} user={user} users={users} data={data} customers={customers} onSave={onRecordSave} onChangeState={onRecordState} />}
        {currentPage.id === 'reports' && <ReportsPage user={user} users={users} data={data} customers={customers} />}
        {currentPage.id === 'users' && <UserManagement user={user} users={users} onSave={onUserSave} onDelete={onUserDelete} onStatus={onUserStatus} onPermissions={onUserPermissions} />}
        <footer className="dashboard-footer"><Brand compact /><span>© 2026 Hope, Inc. ERP · All rights reserved.</span></footer>
      </main>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [authMode, setAuthMode] = useState(null);
  const [appError, setAppError] = useState('');
  const [data, setData] = useState(EMPTY_DATA);
  const [dataError, setDataError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const customers = data.customers;
  const [loading, setLoading] = useState(Boolean(supabaseConfigured));

  useEffect(() => {
    let active = true;
    if (!supabaseConfigured || !supabase) {
      setAppError('Supabase is not configured. Add the project URL and publishable key to Client/.env.local, then restart Vite.');
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return;
      if (error) setAppError(`Could not restore sign-in: ${error.message}`);
      setAuthUser(sessionData.session?.user || null);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setAppError(`Could not connect to Supabase Auth: ${error.message}`);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthUser(session?.user || null);
      setAppError('');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function reloadWorkspace() {
    if (!authUser || !supabase) return;
    setDataLoading(true);
    setLoading(true);
    setDataError('');
    try {
      const workspace = await loadWorkspace(authUser.id);
      setCurrentUser(workspace.user);
      setUsers(workspace.users);
      setData(workspace.data);
      if (workspace.user.status !== 'active') {
        setData(EMPTY_DATA);
        setDataError(workspace.user.status === 'blocked'
          ? 'This account is blocked. Contact an administrator.'
          : workspace.user.status === 'disapproved'
            ? 'This account request was not approved.'
            : 'Your email is confirmed. An administrator must approve your account before you can enter.');
      }
    } catch (error) {
      setCurrentUser(null);
      setUsers([]);
      setData(EMPTY_DATA);
      setDataError(error.message || 'Could not load your Hope workspace.');
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authUser) {
      setCurrentUser(null);
      setUsers([]);
      setData(EMPTY_DATA);
      setDataError('');
      setDataLoading(false);
      setLoading(false);
      return;
    }
    reloadWorkspace();
  }, [authUser]);

  async function saveRecord(collection, record, keyFields, editKey = null) {
    if (!isAdmin(currentUser)) return { error: 'Only admins and superadmins can change ERP data.' };
    const cleaned = Object.fromEntries(Object.entries(record).filter(([key]) => !['isDeleted', 'stamp'].includes(key)));
    let query = supabase.from(ERP_TABLES[collection].name);
    if (editKey) {
      query = query.update(toDatabaseRow(cleaned, collection));
      editKey.split('|').forEach((value, index) => {
        const key = keyFields[index];
        const databaseKey = Object.entries(DATABASE_FIELD_NAMES).find(([, field]) => field === key)?.[0] || key;
        query = query.eq(databaseKey, value);
      });
    } else {
      query = query.insert(toDatabaseRow(cleaned, collection));
    }
    const { data: saved, error } = await query.select('*').maybeSingle();
    if (error) return { error: error.message };
    if (!saved) return { error: 'No record was changed. Check the record key and your admin role.' };
    try { await reloadWorkspace(); } catch (error) {
      return { error: `The change was saved, but the workspace could not refresh: ${error.message}` };
    }
    return {};
  }

  async function saveCustomer(form, editNo) {
    const record = {
      custNo: form.custNo.trim(),
      custName: form.custName.trim(),
      address: form.address.trim(),
      payterms: form.payterms.trim(),
    };
    if (Object.values(record).some((value) => !value)) return { error: 'Fill in every field.' };
    return saveRecord('customers', record, ['custNo'], editNo || null);
  }

  async function saveModuleRecord(collection, form, editKey) {
    const config = COLLECTIONS[collection];
    const record = Object.fromEntries(config.fields.map((field) => [
      field.key,
      field.type === 'number' ? Number(form[field.key]) : String(form[field.key] ?? '').trim(),
    ]));
    if (config.fields.some((field) => !field.optional && (
      record[field.key] === '' || record[field.key] === null
      || (field.type === 'number' && (!Number.isFinite(record[field.key]) || record[field.key] <= 0))
    ))) return { error: 'Complete every required field with a valid value.' };
    return saveRecord(collection, record, config.key, editKey);
  }

  async function changeRecordState(collection, key, isDeleted) {
    if (!isAdmin(currentUser)) return setAppError('Only admins and superadmins can change ERP data.');
    const config = collection === 'customers' ? { key: ['custNo'] } : COLLECTIONS[collection];
    let query = supabase.from(ERP_TABLES[collection].name).update({ is_deleted: isDeleted });
    key.split('|').forEach((value, index) => {
      const field = config.key[index];
      const databaseKey = Object.entries(DATABASE_FIELD_NAMES).find(([, appField]) => appField === field)?.[0] || field;
      query = query.eq(databaseKey, value);
    });
    const { error } = await query;
    if (error) return setAppError(`Could not update record: ${error.message}`);
    await reloadWorkspace();
  }

  async function saveUser(form, editEmail) {
    if (!isAdmin(currentUser)) return { error: 'Only administrators can manage accounts.' };
    if (!editEmail) {
      const email = form.email.trim().toLowerCase();
      if (!email || !form.firstName.trim() || !form.lastName.trim() || form.password.length < 8) {
        return { error: 'Enter the account name, a valid email, and a password of at least 8 characters.' };
      }
      const { error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'create',
          email,
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.role,
        },
      });
      if (error) return { error: error.message };
      try { await reloadWorkspace(); } catch (error) { return { error: error.message }; }
      return {};
    }
    const target = users.find((entry) => entry.email.toLowerCase() === editEmail.toLowerCase());
    if (!target) return { error: 'This account no longer exists. Refresh and try again.' };
    if (currentUser.role !== 'superadmin' && target.role !== 'user') return { error: 'Admins can only manage User accounts.' };
    const update = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      ...(currentUser.role === 'superadmin' ? { role: form.role } : {}),
    };
    const { error } = await supabase.from('app_profiles').update(update).eq('id', target.id);
    if (error) return { error: error.message };
    try { await reloadWorkspace(); } catch (error) { return { error: error.message }; }
    return {};
  }

  async function deleteUser(email) {
    const target = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!target) return { error: 'This account no longer exists.' };
    const { error } = await supabase.functions.invoke('manage-user', { body: { action: 'delete', userId: target.id } });
    if (error) return { error: error.message };
    try { await reloadWorkspace(); } catch (error) { return { error: error.message }; }
    return {};
  }

  async function changeUserStatus(email, status) {
    const target = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!target || !isAdmin(currentUser) || (currentUser.role !== 'superadmin' && target.role !== 'user')) {
      return setAppError('You are not allowed to change this account status.');
    }
    if (email.toLowerCase() === currentUser.email.toLowerCase()) return setAppError('You cannot change your own account status.');
    const { error } = await supabase.from('app_profiles').update({ status }).eq('id', target.id);
    if (error) return setAppError(`Could not update account status: ${error.message}`);
    try { await reloadWorkspace(); } catch (error) { setAppError(error.message); }
  }

  async function changeUserPermissions(email, perms) {
    const target = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!target || !isAdmin(currentUser) || target.role !== 'user') {
      return setAppError('Only administrators can change permissions for User accounts.');
    }
    const { error } = await supabase.from('app_profiles').update({ permissions: perms }).eq('id', target.id);
    if (error) return setAppError(`Could not update user permissions: ${error.message}`);
    try { await reloadWorkspace(); } catch (error) { setAppError(error.message); }
  }

  return (
    <>
      {currentUser?.status === 'active' && data ? (
        <Dashboard
          user={currentUser}
          users={users}
          customers={customers}
          data={data}
          dataError={dataError}
          dataLoading={dataLoading}
          onReloadData={reloadWorkspace}
          appError={appError}
          clearError={() => setAppError('')}
          onLogout={signOut}
          onCustomerSave={saveCustomer}
          onCustomerState={(custNo, isDeleted) => changeRecordState('customers', custNo, isDeleted)}
          onRecordSave={saveModuleRecord}
          onRecordState={changeRecordState}
          onUserSave={saveUser}
          onUserDelete={deleteUser}
          onUserStatus={changeUserStatus}
          onUserPermissions={changeUserPermissions}
        />
      ) : (
        <>
          <LandingPage openAuth={setAuthMode} />
          {authMode === 'register' && supabaseConfigured && (
  <RegisterModal
    onClose={() => setAuthMode(null)}
    onRegister={register}
  />
)}
          {loading && <div className="storage-warning" role="status">Connecting to your Hope database…</div>}
          {(appError || dataError) && <div className="connection-error" role="alert">
            <Alert message={{ type: 'error', text: appError || dataError }} />
            {authUser && <button className="button button-outline" onClick={signOut}>Sign out</button>}
          </div>}
        </>
      )}
</>
  );
}
