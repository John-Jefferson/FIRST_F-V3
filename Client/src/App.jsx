import { useEffect, useMemo, useState } from 'react';

const SAMPLE_USER_PERMS = ['customers.view', 'customers.add', 'customers.edit'];
const USERS_KEY = 'hope2_users';
const CUSTOMERS_KEY = 'hope2_customers';

const DEFAULT_USERS = [
  { email: 'superadmin@hope.com', firstName: 'Sarah', lastName: 'Chen', role: 'superadmin', status: 'active' },
  { email: 'ceo@hope.com', firstName: 'Michael', lastName: 'Reyes', role: 'superadmin', status: 'active' },
  { email: 'admin@hope.com', firstName: 'Lisa', lastName: 'Park', role: 'admin', status: 'active' },
  { email: 'manager@hope.com', firstName: 'David', lastName: 'Kim', role: 'admin', status: 'active' },
  { email: 'user@hope.com', firstName: 'Alex', lastName: 'Rivera', role: 'user', status: 'active', perms: SAMPLE_USER_PERMS },
];

const DEFAULT_CUSTOMERS = [
  { custNo: 'C-001', custName: 'Acme Corporation', address: '123 Main St, Metro City', payterms: 'Net 30', isDeleted: false, stamp: 'CREATED system 2026-10-01 9:00 AM' },
  { custNo: 'C-002', custName: 'Globex Industries', address: '456 Oak Ave, Harbor Town', payterms: 'Net 45', isDeleted: false, stamp: 'CREATED system 2026-10-02 10:15 AM' },
  { custNo: 'C-003', custName: 'Initech LLC', address: '789 Pine Rd, Silicon Valley', payterms: 'COD', isDeleted: false, stamp: 'EDITED user1 2026-10-13 1:01 PM' },
  { custNo: 'C-004', custName: 'Umbrella Corp', address: '1 Raccoon City Blvd', payterms: 'Prepaid', isDeleted: true, stamp: 'DELETED user2 2026-10-13 1:01 PM' },
  { custNo: 'C-005', custName: 'Stark Enterprises', address: '200 Park Avenue, New York', payterms: 'Net 15', isDeleted: false, stamp: 'EDITED user1 2026-10-13 1:01 PM' },
];

const MODULES = [
  { id: 'dashboard', label: 'Overview', initials: 'OV' },
  { id: 'customers', label: 'Customers', initials: 'CU' },
  { id: 'products', label: 'Products', initials: 'PR', adminOnly: true },
  { id: 'hr', label: 'Human resources', initials: 'HR', adminOnly: true },
  { id: 'sales', label: 'Sales', initials: 'SA', adminOnly: true },
  { id: 'reports', label: 'Reports', initials: 'RE', adminOnly: true },
  { id: 'users', label: 'Users', initials: 'US', adminOnly: true },
];

function readStorage(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key} from local storage. Using the demo data.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to local storage. Changes will last for this session only.`, error);
    return false;
  }
}

function makeStamp(action, user) {
  const date = new Date();
  const hours = date.getHours();
  const time = `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  const who = (user?.firstName || 'user').toLowerCase().replace(/\s+/g, '');
  return `${action} ${who} ${date.toISOString().slice(0, 10)} ${time}`;
}

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

  function submit(event) {
    event.preventDefault();
    onSave(form);
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

function AuthModal({ mode, onClose, onModeChange, onLogin, onRegister, onReset }) {
  const [message, setMessage] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const content = {
    login: { title: 'Welcome back', subtitle: 'Sign in to your account' },
    register: { title: 'Create account', subtitle: 'Join Hope, Inc. ERP' },
    reset: { title: 'Reset password', subtitle: 'We will send a reset link if the account exists.' },
  }[mode];

  function submit(event) {
    event.preventDefault();
    setMessage(null);

    if (mode === 'login') {
      const result = onLogin(email.trim());
      if (result.error) setMessage({ type: 'error', text: result.error });
      else onClose();
      return;
    }

    if (mode === 'register') {
      const result = onRegister({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() });
      if (result.error) setMessage({ type: 'error', text: result.error });
      else {
        setMessage({ type: 'success', text: 'Request sent. An admin must approve it before you can sign in.' });
        setEmail('');
        setFirstName('');
        setLastName('');
      }
      return;
    }

    onReset(email.trim());
    setMessage({ type: 'success', text: `If an account exists for ${email.trim()}, a reset link has been sent.` });
    setEmail('');
  }

  return (
    <Modal title={content.title} subtitle={content.subtitle} onClose={onClose}>
      <form className="modal-body" onSubmit={submit}>
        {mode === 'login' && (
          <div className="demo-hint">
            <strong>Demo access</strong>
            <span>superadmin@hope.com · admin@hope.com · user@hope.com</span>
            <span>Demo only: any password works. Sign-in is not connected to a server.</span>
          </div>
        )}
        <Alert message={message} />
        {mode === 'register' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="regFirstName">First name</label>
              <input id="regFirstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus required />
            </div>
            <div className="form-group">
              <label htmlFor="regLastName">Last name</label>
              <input id="regLastName" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
            </div>
          </div>
        )}
        <div className="form-group">
          <label htmlFor={`${mode}-email`}>Email address</label>
          <input
            id={`${mode}-email`}
            type="email"
            autoFocus={mode !== 'register'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {mode === 'login' && (
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
        )}
        <button className="button button-primary button-full" type="submit">
          {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
        </button>
        <div className="form-footer">
          {mode === 'login' && (
            <>
              <button className="text-button" type="button" onClick={() => onModeChange('reset')}>Forgot password?</button>
              <p>New to Hope ERP? <button className="text-button" type="button" onClick={() => onModeChange('register')}>Create an account</button></p>
            </>
          )}
          {mode === 'register' && (
            <p>Already have an account? <button className="text-button" type="button" onClick={() => onModeChange('login')}>Sign in</button></p>
          )}
          {mode === 'reset' && (
            <p>Remembered it? <button className="text-button" type="button" onClick={() => onModeChange('login')}>Back to sign in</button></p>
          )}
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
              <span className="preview-avatar">S</span>
            </div>
            <div className="preview-content">
              <div className="preview-heading"><div><span className="preview-kicker">MONDAY, OCTOBER 26</span><strong>Good morning, Sarah</strong></div><span className="preview-badge">SUPERADMIN</span></div>
              <div className="preview-stats">
                <div><span>Active customers</span><strong>24</strong><small>↗ 12% this month</small></div>
                <div><span>Open orders</span><strong>08</strong><small>Across 4 customers</small></div>
              </div>
              <div className="preview-list">
                <div className="preview-list-heading"><strong>Recent customers</strong><span>View all →</span></div>
                <div><span className="preview-initial">A</span><span>Acme Corporation<small>Net 30 · Metro City</small></span><i>Active</i></div>
                <div><span className="preview-initial preview-initial-alt">G</span><span>Globex Industries<small>Net 45 · Harbor Town</small></span><i>Active</i></div>
                <div><span className="preview-initial preview-initial-third">I</span><span>Initech LLC<small>COD · Silicon Valley</small></span><i>Active</i></div>
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

function Overview({ user, customers, users, onNavigate }) {
  const activeCount = customers.filter((customer) => !customer.isDeleted).length;
  const inactiveCount = customers.length - activeCount;
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
        <article className="stat-card"><span className="stat-label">Active customers</span><strong>{activeCount}</strong><span className="stat-foot"><span className="status-dot" /> Currently active</span></article>
        <article className="stat-card"><span className="stat-label">Inactive customers</span><strong>{inactiveCount}</strong><span className="stat-foot">Available to restore</span></article>
        <article className="stat-card"><span className="stat-label">Your role</span><strong className="stat-role">{user.role}</strong><span className="stat-foot">{users.length} accounts in this demo</span></article>
      </div>
      <section className="content-panel">
        <div className="panel-heading"><div><h3>Quick access</h3><p>Jump into a workspace module.</p></div></div>
        <div className="quick-access-grid">
          {MODULES.filter((module) => !module.adminOnly || isAdmin(user))
            .filter((module) => module.id !== 'customers' || hasPermission(user, 'customers.view', users))
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
  const canAdd = hasPermission(user, 'customers.add', users);
  const canEdit = hasPermission(user, 'customers.edit', users);
  const canDelete = hasPermission(user, 'customers.delete', users);
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

  function save(form) {
    const result = onSave(form, editing?.custNo);
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

function ComingSoon({ label }) {
  return (
    <section className="content-panel coming-soon">
      <span className="feature-icon">···</span>
      <span className="section-kicker">WORKSPACE MODULE</span>
      <h2>{label}</h2>
      <p>This module is coming soon.</p>
    </section>
  );
}

function Dashboard({ user, users, customers, onLogout, onCustomerSave, onCustomerState }) {
  const [activePage, setActivePage] = useState('dashboard');
  const visibleModules = MODULES.filter((module) => {
    if (module.adminOnly && !isAdmin(user)) return false;
    if (module.id === 'customers' && !hasPermission(user, 'customers.view', users)) return false;
    return true;
  });
  const currentPage = visibleModules.find((module) => module.id === activePage) || visibleModules[0];
  const name = `${user.firstName || 'User'} ${user.lastName || ''}`.trim();

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact />
        <nav className="dashboard-nav" aria-label="Main navigation">
          {visibleModules.map((module) => (
            <button
              className={currentPage.id === module.id ? 'nav-item active' : 'nav-item'}
              key={module.id}
              onClick={() => setActivePage(module.id)}
            >
              <span className="nav-initials">{module.initials}</span>{module.label}
            </button>
          ))}
        </nav>
        <div className="account-area">
          <div className="account-user">
            <span className="account-avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="account-copy"><strong>{name}</strong><small>{user.role}</small></span>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </div>
          <button className="button button-ghost logout-button" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="page-heading">
          <div><span className="section-kicker">HOPE, INC. ERP / WORKSPACE</span><h1>{currentPage.label}</h1></div>
          <span className="page-date">{new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date())}</span>
        </div>
        {currentPage.id === 'dashboard' && <Overview user={user} customers={customers} users={users} onNavigate={setActivePage} />}
        {currentPage.id === 'customers' && (
          <CustomersPage user={user} users={users} customers={customers} onSave={onCustomerSave} onChangeState={onCustomerState} />
        )}
        {!['dashboard', 'customers'].includes(currentPage.id) && <ComingSoon label={currentPage.label} />}
        <footer className="dashboard-footer"><Brand compact /><span>© 2026 Hope, Inc. ERP · All rights reserved.</span></footer>
      </main>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(() => readStorage(USERS_KEY, DEFAULT_USERS));
  const [customers, setCustomers] = useState(() => readStorage(CUSTOMERS_KEY, DEFAULT_CUSTOMERS));
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    if (!writeStorage(USERS_KEY, users)) setStorageWarning(true);
  }, [users]);

  useEffect(() => {
    if (!writeStorage(CUSTOMERS_KEY, customers)) setStorageWarning(true);
  }, [customers]);

  function signIn(email) {
    let user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const firstName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'User';
      user = { email, firstName, lastName: '', role: 'user', status: 'active', perms: SAMPLE_USER_PERMS };
      setUsers((current) => [...current, user]);
    }

    const blockedMessages = {
      blocked: 'This account is blocked. Contact an administrator.',
      pending: 'This account is waiting for approval.',
      disapproved: 'This request was not approved.',
    };
    if (blockedMessages[user.status]) return { error: blockedMessages[user.status] };

    setCurrentUser({
      email: user.email,
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      role: user.role,
    });
    setAuthMode(null);
    return {};
  }

  function register({ email, firstName, lastName }) {
    if (users.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'An account with this email already exists. Sign in instead.' };
    }
    setUsers((current) => [...current, { email, firstName, lastName, role: 'user', status: 'pending', perms: [] }]);
    return {};
  }

  function resetPassword() {
    return true;
  }

  function saveCustomer(form, editNo) {
    const custNo = form.custNo.trim();
    const data = {
      custName: form.custName.trim(),
      address: form.address.trim(),
      payterms: form.payterms.trim(),
    };
    if (!custNo || !data.custName || !data.address || !data.payterms) {
      return { error: 'Fill in every field.' };
    }

    if (editNo) {
      setCustomers((current) => current.map((customer) =>
        customer.custNo === editNo
          ? { ...customer, ...data, stamp: makeStamp('EDITED', currentUser) }
          : customer,
      ));
      return {};
    }

    if (customers.some((customer) => customer.custNo.toLowerCase() === custNo.toLowerCase())) {
      return { error: 'That customer number is already in use.' };
    }
    setCustomers((current) => [...current, { custNo, ...data, isDeleted: false, stamp: makeStamp('CREATED', currentUser) }]);
    return {};
  }

  function changeCustomerState(custNo, isDeleted, action) {
    setCustomers((current) => current.map((customer) =>
      customer.custNo === custNo
        ? { ...customer, isDeleted, stamp: makeStamp(action, currentUser) }
        : customer,
    ));
  }

  return (
    <>
      {currentUser ? (
        <Dashboard
          user={currentUser}
          users={users}
          customers={customers}
          onLogout={() => setCurrentUser(null)}
          onCustomerSave={saveCustomer}
          onCustomerState={changeCustomerState}
        />
      ) : (
        <LandingPage openAuth={setAuthMode} />
      )}
      {storageWarning && <div className="storage-warning" role="status">Browser storage is unavailable. Changes will be lost when you leave this page.</div>}
      {authMode && (
        <AuthModal
          key={authMode}
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onLogin={signIn}
          onRegister={register}
          onReset={resetPassword}
        />
      )}
    </>
  );
}
