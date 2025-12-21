type ModulePermissions = {
  settings?: {
    data_partition?: string;
    [k: string]: any;
  };
  permissions?: Record<string, string[]>;
};

type Permissions = Record<string, ModulePermissions>;

export function isLocationPartition(
  permissions: Permissions,
  path: string,
  expected: string = "organization"
): boolean {
  // return true
  if (!path) return false;

  const segments = path.replace(/^\//, "").split("/");

  // Find the first segment that is a module key in the permissions object
  const moduleKey = segments.find(seg => seg in permissions);
  if (!moduleKey) return false;

  const dp = permissions[moduleKey]?.settings?.data_partition;
  return dp !== expected;
}