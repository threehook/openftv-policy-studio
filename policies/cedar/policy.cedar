permit(
  principal,
  action == Action::"ReadDocument",
  resource
) when {
  resource.owner == principal
};
