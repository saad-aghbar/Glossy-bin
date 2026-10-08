export function parseDevOrigins(value: string | undefined) {
  if (!value?.trim()) return [];
  const hosts: string[] = [];
  for (const part of value.split(",")) {
    const host = part.trim().toLowerCase();
    if (!host || host.includes("*") || host.includes("/") || host.includes(":") || host.includes(" ")) continue;
    if (!hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}
