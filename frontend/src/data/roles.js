// Role definitions and permissions for ColdChain Monitor
// Roles: ADMIN, MANAGER, QA_OFFICER, COMPLIANCE_OFFICER

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  QA_OFFICER: 'QA_OFFICER',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
};

// Route-level access: which roles can visit each route
export const ROUTE_PERMISSIONS = {
  '/':               [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER, ROLES.COMPLIANCE_OFFICER],
  '/shipments':      [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER, ROLES.COMPLIANCE_OFFICER],
  '/shipments/new':  [ROLES.ADMIN, ROLES.MANAGER],
  '/sensors':        [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER, ROLES.COMPLIANCE_OFFICER],
  '/sensors/new':    [ROLES.ADMIN, ROLES.MANAGER],
  '/alerts':         [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER, ROLES.COMPLIANCE_OFFICER],
  '/excursions':     [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER, ROLES.COMPLIANCE_OFFICER],
  '/reports':        [ROLES.ADMIN, ROLES.MANAGER, ROLES.COMPLIANCE_OFFICER],
  '/users':          [ROLES.ADMIN],
};

// Fine-grained action permissions
export const PERMISSIONS = {
  // Alerts
  acknowledgeAlert:    [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER],
  // Excursions
  resolveExcursion:    [ROLES.ADMIN, ROLES.MANAGER, ROLES.QA_OFFICER],
  // Shipments
  createShipment:      [ROLES.ADMIN, ROLES.MANAGER],
  // Sensors
  registerSensor:      [ROLES.ADMIN, ROLES.MANAGER],
  // Reports
  exportReport:        [ROLES.ADMIN, ROLES.MANAGER, ROLES.COMPLIANCE_OFFICER],
  // Users
  manageUsers:         [ROLES.ADMIN],
};

export function hasRouteAccess(role, path) {
  const allowed = ROUTE_PERMISSIONS[path];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function hasPermission(role, action) {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
