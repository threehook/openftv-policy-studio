package openftv.authz

import rego.v1

# By default, deny all requests for safety
default allow := false

# Main entry point for evaluation
allow if {
    user_is_global_admin
}

allow if {
    user_belongs_to_tenant
    user_has_required_role
    action_matches_scope
    resource_is_not_classified
    request_within_maintenance_window
}

# --- 1. RBAC: Role & Tenant Verification ---

# Global admins bypass regular restrictions
user_is_global_admin if {
    input.user.global_admin == true
}

# Ensure user belongs to the tenant they are trying to access
user_belongs_to_tenant if {
    input.user.tenant_id == input.resource.tenant_id
}

# Check if user has the role required for the requested action
user_has_required_role if {
    assigned_roles := input.user.roles[_]
    required_role := role_permissions[assigned_roles][_]
    required_role == input.action.type
}

# --- 2. ABAC: Attribute Mapping & Resource Security ---

# Ensure the action scope (read/write) is valid for the resource type
action_matches_scope if {
    allowed_scopes := resource_scopes[input.resource.type]
    input.action.scope == allowed_scopes[_]
}

# Strict ABAC: Regular users cannot touch "highly-classified" data
resource_is_not_classified if {
    input.resource.classification != "highly-classified"
}

# Exception: Managers CAN touch classified data if they belong to HR
resource_is_not_classified if {
    input.resource.classification == "highly-classified"
    "manager" in input.user.roles
    input.user.department == "HR"
}

# --- 3. Environmental Conditions (Time-Bound) ---

# Block destructive operations outside normal maintenance windows
request_within_maintenance_window if {
    input.action.scope != "delete"
}

request_within_maintenance_window if {
    input.action.scope == "delete"
    
    # Ensure execution happens during scheduled weekend maintenance hours
    current_time := input.request.timestamp_ns
    current_day  := time.weekday(current_time)
    
    current_day == "Saturday"
}

# --- 4. Mock Data Tables (Usually injected via OPA Data API) ---

role_permissions := {
    "admin": ["read", "write", "delete"],
    "editor": ["read", "write"],
    "viewer": ["read"]
}

resource_scopes := {
    "financial_records": ["read", "write"],
    "system_logs": ["read"],
    "user_profiles": ["read", "write", "delete"]
}
