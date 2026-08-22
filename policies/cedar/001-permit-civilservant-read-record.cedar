permit (
    principal in NL_Gov::Group::"CivilServants",
    action == NL_Gov::Action::"ReadRecord",
    resource
)
when {
    // 1. Ensure the user is an internal employee, not a contractor
    principal.is_contractor == false &&
    
    // 2. Validate mandatory security hygiene from context
    context.mfa_verified == true &&
    
    // 3. Ensure a legal basis string is present (using 'has' for the optional schema field)
    context has legal_basis && context.legal_basis != "Koep"
};
