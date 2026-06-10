import { describe, it, expect } from "vitest";
import { isAdminRole } from "../shared/types";
import { isAdminRole as isAdminRoleServer } from "../server/services/adminAccess";

describe("admin role helpers", () => {
  it("identifica role admin", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRoleServer("admin")).toBe(true);
  });

  it("rejeita role user", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRoleServer("user")).toBe(false);
  });
});
