import { getDefaultData } from "@/components/aws/store/dataManager";

export function mergeAwsDefaults(defaults, custom) {
  if (!custom || typeof custom !== "object") return structuredClone(defaults);
  const result = structuredClone(defaults);
  for (const key of Object.keys(defaults)) {
    const value = custom[key];
    if (value === null || value === undefined) continue;
    if (
      typeof value === "object" && !Array.isArray(value) &&
      typeof defaults[key] === "object" && defaults[key] !== null && !Array.isArray(defaults[key])
    ) {
      result[key] = mergeAwsDefaults(defaults[key], value);
    } else {
      result[key] = structuredClone(value);
    }
  }
  return result;
}

export function projectAwsState(data) {
  return mergeAwsDefaults(getDefaultData(), data);
}

export function awsProductKeys() {
  return Object.keys(getDefaultData());
}
