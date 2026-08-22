permit (
    principal,
    action == NL_Gov::Action::"ModifyRecord",
    resource
)
when {
    // 1. Enforce that the record is nested inside the Vught municipality domain (Inheritance lookup)
    resource in NL_Gov::SecuredDomain::"Vught_5262" &&
    
    // 2. Clearances must be strictly high-level
    principal.clearance_level >= 3 &&
    
    // 3. Enforce the schema's mandatory digital signature requirement for modifications
    context.digital_signature_token != ""
}
unless {
    // 4. Overriding safety block: If a record specifically flag-requires "four eyes", 
    // a single user is locked out from modification by default.
    resource.requires_four_eyes == true
};
