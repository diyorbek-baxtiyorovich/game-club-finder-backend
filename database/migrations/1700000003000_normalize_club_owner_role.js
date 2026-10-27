export const up = (pgm) => {
  pgm.dropConstraint("users", "users_role_check");
  pgm.sql("UPDATE users SET role = 'club_owner' WHERE role = 'owner';");
  pgm.addConstraint("users", "users_role_check", {
    check: "role IN ('user', 'club_owner', 'admin')",
  });
};

export const down = (pgm) => {
  pgm.dropConstraint("users", "users_role_check");
  pgm.sql("UPDATE users SET role = 'owner' WHERE role = 'club_owner';");
  pgm.addConstraint("users", "users_role_check", {
    check: "role IN ('user', 'owner', 'admin')",
  });
};
