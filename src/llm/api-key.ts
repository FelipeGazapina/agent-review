export function readApiKey(envName: string): string {
  const value = process.env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${envName} environment variable not set`);
  }
  return value;
}
