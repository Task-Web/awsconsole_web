import {
  listInstances,
  launchInstance,
  terminateInstance,
  stopInstance,
  startInstance,
  isDockerAvailable,
  type Ec2Instance,
} from "./docker-client";
import { getPublicKeyForInjection } from "./keypair-manager";

interface StateEc2Entry {
  id?: string;
  name?: string;
  type?: string;
  state?: string;
  ami?: string;
  amiName?: string;
  platform?: string;
  keyPair?: string;
  tags?: { Key: string; Value: string }[];
  az?: string;
  [key: string]: unknown;
}

/**
 * Reconcile the ec2 array in user state with real Docker containers.
 *
 * Logic:
 * - For each instance in state that has no matching Docker container → create one
 * - For each Docker container that has no matching state entry → terminate it
 * - For state entries with state "stopped" but Docker running → stop container
 * - For state entries with state "running" but Docker stopped → start container
 *
 * Returns the reconciled ec2 array (real Docker state).
 */
export async function reconcileEc2(
  userId: string,
  stateEc2: StateEc2Entry[],
  defaultAmiTag?: string
): Promise<Ec2Instance[]> {
  if (!(await isDockerAvailable())) {
    return [];
  }

  // Get current Docker containers for this user
  const dockerInstances = await listInstances(userId);
  const dockerById = new Map(dockerInstances.map((i) => [i.id, i]));

  // Track which Docker instances are accounted for
  const accountedDockerIds = new Set<string>();

  // Process each state entry
  for (const entry of stateEc2) {
    if (!entry.id) continue;

    const dockerInst = dockerById.get(entry.id);

    if (!dockerInst) {
      // Instance in state but not in Docker → create it
      const amiTag = resolveAmiTag(entry) || defaultAmiTag;
      if (!amiTag) continue; // Can't create without an AMI

      let publicKey: string | undefined;
      if (entry.keyPair) {
        const pk = getPublicKeyForInjection(userId, entry.keyPair as string);
        if (pk) publicKey = pk;
      }

      try {
        await launchInstanceWithId(userId, entry, amiTag, publicKey);
      } catch (e) {
        console.error(`Reconcile: failed to create instance ${entry.id}:`, e);
      }
    } else {
      // Instance exists in both state and Docker → reconcile state
      accountedDockerIds.add(entry.id);

      const desiredState = entry.state as string;
      const actualState = dockerInst.state;

      try {
        if (
          desiredState === "stopped" &&
          actualState === "running"
        ) {
          await stopInstance(userId, entry.id);
        } else if (
          desiredState === "running" &&
          actualState === "stopped"
        ) {
          await startInstance(userId, entry.id);
        }
        // "terminated" → will be cleaned up below as "not in state"
        if (desiredState === "terminated" || desiredState === "shutting-down") {
          try {
            await terminateInstance(userId, entry.id);
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error(`Reconcile: failed to update instance ${entry.id}:`, e);
      }
    }
  }

  // Find Docker containers not in state → terminate them
  const stateIds = new Set(stateEc2.map((e) => e.id).filter(Boolean));
  for (const dockerInst of dockerInstances) {
    if (!stateIds.has(dockerInst.id)) {
      try {
        await terminateInstance(userId, dockerInst.id);
      } catch (e) {
        console.error(
          `Reconcile: failed to terminate orphan ${dockerInst.id}:`,
          e
        );
      }
    }
  }

  // Return fresh Docker state
  return await listInstances(userId);
}

/**
 * Try to determine the AMI docker tag from a state entry.
 */
function resolveAmiTag(entry: StateEc2Entry): string | null {
  // If the entry has amiName that matches known patterns
  const name = ((entry.amiName as string) || "").toLowerCase();
  if (name.includes("amazon linux")) return "awsmock-ami:amazon-linux-2023";
  if (name.includes("ubuntu")) return "awsmock-ami:ubuntu-22.04";

  // If there's a direct ami reference that looks like a tag
  const ami = (entry.ami as string) || "";
  if (ami.startsWith("awsmock-ami:")) return ami;

  return null;
}

/**
 * Launch an instance using a specific ID (for reconciliation).
 * Wraps the normal launchInstance but passes through the desired ID.
 */
async function launchInstanceWithId(
  userId: string,
  entry: StateEc2Entry,
  amiTag: string,
  publicKey?: string
): Promise<Ec2Instance> {
  // We need to use launchInstance but it generates its own ID.
  // For reconciliation, we import and use it, then the reconciled list
  // will use the Docker-generated IDs. The state will be overwritten
  // with the fresh Docker list anyway.
  return await launchInstance(userId, {
    name: (entry.name as string) || "Unnamed",
    amiTag,
    amiId: (entry.ami as string) || "",
    amiName: (entry.amiName as string) || "",
    instanceType: (entry.type as string) || "t2.micro",
    platform: (entry.platform as string) || "Linux/UNIX",
    tags: entry.tags || [],
    keyPair: (entry.keyPair as string) || undefined,
    publicKey,
    region: entry.az
      ? (entry.az as string).replace(/[a-z]$/, "")
      : undefined,
  });
}
