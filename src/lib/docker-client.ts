import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const EC2_NETWORK = process.env.EC2_NETWORK || "awsmock-net";
const EC2_AMI_PATTERN = process.env.EC2_AMI_PATTERN || "awsmock-ami";
const EC2_MAX_PER_USER = parseInt(process.env.EC2_MAX_PER_USER || "5", 10);

// Instance type to resource limits mapping
const INSTANCE_TYPE_LIMITS: Record<
  string,
  { cpus: number; memory: number; memoryLabel: string; vcpus: number }
> = {
  "t2.micro": { cpus: 0.25, memory: 256 * 1024 * 1024, memoryLabel: "256 MB", vcpus: 1 },
  "t2.small": { cpus: 0.5, memory: 512 * 1024 * 1024, memoryLabel: "512 MB", vcpus: 1 },
  "t3.small": { cpus: 0.5, memory: 512 * 1024 * 1024, memoryLabel: "512 MB", vcpus: 1 },
  "t3.medium": { cpus: 1, memory: 1024 * 1024 * 1024, memoryLabel: "1 GB", vcpus: 2 },
  "m5.large": { cpus: 1, memory: 1024 * 1024 * 1024, memoryLabel: "1 GB", vcpus: 2 },
  "c5.xlarge": { cpus: 2, memory: 2048 * 1024 * 1024, memoryLabel: "2 GB", vcpus: 4 },
};

function getResourceLimits(instanceType: string) {
  return INSTANCE_TYPE_LIMITS[instanceType] || INSTANCE_TYPE_LIMITS["t2.micro"];
}

function generateInstanceId(): string {
  const hex = () =>
    Math.random().toString(16).substring(2, 10);
  return `i-${hex()}${hex()}`;
}

// Map Docker container state to AWS-style state
function mapContainerState(dockerState: string): string {
  switch (dockerState) {
    case "running":
      return "running";
    case "exited":
    case "dead":
      return "stopped";
    case "created":
      return "pending";
    case "restarting":
      return "rebooting";
    case "removing":
      return "shutting-down";
    case "paused":
      return "stopped";
    default:
      return "unknown";
  }
}

export interface Ec2Instance {
  id: string;
  name: string;
  type: string;
  state: string;
  publicIp: string;
  privateIp: string;
  az: string;
  ami: string;
  amiName: string;
  platform: string;
  keyPair: string;
  securityGroups: string[];
  launchTime: string;
  monitoring: string;
  iamRole: string;
  rootDeviceType: string;
  rootDeviceName: string;
  volumes: string[];
  tags: { Key: string; Value: string }[];
  containerId: string;
  sshCommand: string;
  vpcId: string;
  subnetId: string;
}

export interface Ec2Ami {
  id: string;
  name: string;
  description: string;
  owner: string;
  state: string;
  architecture: string;
  platform: string;
  rootDeviceType: string;
  virtualization: string;
  created: string;
  public: boolean;
  imageTag: string;
}

// List all Docker images matching the AMI pattern
export async function listAmis(): Promise<Ec2Ami[]> {
  try {
    const images = await docker.listImages();
    const amis: Ec2Ami[] = [];

    for (const image of images) {
      const tags = image.RepoTags || [];
      for (const tag of tags) {
        if (tag.startsWith(`${EC2_AMI_PATTERN}:`)) {
          const imageTag = tag.split(":")[1];
          // Get image details for labels
          const imageInfo = await docker.getImage(tag).inspect();
          const labels = imageInfo.Config?.Labels || {};

          amis.push({
            id: `ami-${image.Id.substring(7, 19)}`,
            name: labels["awsmock.ami.name"] || imageTag,
            description: labels["awsmock.ami.description"] || `Docker image ${tag}`,
            owner: "local",
            state: "available",
            architecture: labels["awsmock.ami.architecture"] || "x86_64",
            platform: labels["awsmock.ami.platform"] || "Linux",
            rootDeviceType: "docker",
            virtualization: "docker",
            created: new Date(imageInfo.Created).toISOString(),
            public: true,
            imageTag: tag,
          });
        }
      }
    }

    return amis;
  } catch (e) {
    console.error("Failed to list AMIs:", e);
    return [];
  }
}

// List all EC2 containers for a specific user
export async function listInstances(userId: string): Promise<Ec2Instance[]> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`awsmock.user_id=${userId}`],
      },
    });

    const instances: Ec2Instance[] = [];

    for (const container of containers) {
      const labels = container.Labels || {};
      const networkSettings = container.NetworkSettings?.Networks?.[EC2_NETWORK];
      const privateIp = networkSettings?.IPAddress || "-";

      instances.push({
        id: labels["awsmock.instance_id"] || container.Id.substring(0, 12),
        name: labels["awsmock.instance_name"] || "Unnamed",
        type: labels["awsmock.instance_type"] || "t2.micro",
        state: mapContainerState(container.State),
        publicIp: privateIp, // In local Docker, public = private
        privateIp,
        az: "local-1a",
        ami: labels["awsmock.ami_id"] || "",
        amiName: labels["awsmock.ami_name"] || "",
        platform: labels["awsmock.platform"] || "Linux/UNIX",
        keyPair: labels["awsmock.key_pair"] || "",
        securityGroups: [],
        launchTime: labels["awsmock.launch_time"] || new Date().toISOString(),
        monitoring: "disabled",
        iamRole: "",
        rootDeviceType: "docker",
        rootDeviceName: "/dev/sda1",
        volumes: [],
        tags: JSON.parse(labels["awsmock.tags"] || "[]"),
        containerId: container.Id,
        sshCommand: privateIp !== "-"
          ? labels["awsmock.key_pair"]
            ? `ssh -i ${labels["awsmock.key_pair"]}.pem root@${privateIp}`
            : `ssh root@${privateIp}`
          : "",
        vpcId: "vpc-docker",
        subnetId: "subnet-docker",
      });
    }

    return instances;
  } catch (e) {
    console.error("Failed to list instances:", e);
    return [];
  }
}

// Get a single instance by ID
export async function getInstance(
  userId: string,
  instanceId: string
): Promise<Ec2Instance | null> {
  const instances = await listInstances(userId);
  return instances.find((i) => i.id === instanceId) || null;
}

// Launch a new EC2 instance (Docker container)
export async function launchInstance(
  userId: string,
  opts: {
    name: string;
    amiTag: string;
    amiId: string;
    amiName: string;
    instanceType: string;
    platform?: string;
    tags?: { Key: string; Value: string }[];
    keyPair?: string;
    publicKey?: string;
  }
): Promise<Ec2Instance> {
  // Check user limit
  const existing = await listInstances(userId);
  if (existing.length >= EC2_MAX_PER_USER) {
    throw new Error(
      `Instance limit reached (${EC2_MAX_PER_USER} per user)`
    );
  }

  const instanceId = generateInstanceId();
  const limits = getResourceLimits(opts.instanceType);
  const launchTime = new Date().toISOString();
  const containerName = `awsmock-${userId.substring(0, 8)}-${instanceId}`;

  // Build startup command that injects SSH public key if provided
  let cmd: string[] | undefined;
  if (opts.publicKey) {
    // Inject public key into authorized_keys, then start sshd
    const escapedKey = opts.publicKey.replace(/'/g, "'\\''");
    cmd = [
      "/bin/sh",
      "-c",
      `mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo '${escapedKey}' > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && /usr/sbin/sshd -D`,
    ];
  }

  const createOpts: Docker.ContainerCreateOptions = {
    Image: opts.amiTag,
    name: containerName,
    Labels: {
      "awsmock.user_id": userId,
      "awsmock.instance_id": instanceId,
      "awsmock.instance_name": opts.name,
      "awsmock.instance_type": opts.instanceType,
      "awsmock.ami_id": opts.amiId,
      "awsmock.ami_name": opts.amiName,
      "awsmock.platform": opts.platform || "Linux/UNIX",
      "awsmock.launch_time": launchTime,
      "awsmock.tags": JSON.stringify(opts.tags || []),
      "awsmock.key_pair": opts.keyPair || "",
      "awsmock.managed": "true",
    },
    HostConfig: {
      NanoCpus: Math.round(limits.cpus * 1e9),
      Memory: limits.memory,
      NetworkMode: EC2_NETWORK,
    },
  };

  if (cmd) {
    createOpts.Cmd = cmd;
  }

  const container = await docker.createContainer(createOpts);
  await container.start();

  // Fetch the container to get its IP
  const info = await container.inspect();
  const privateIp =
    info.NetworkSettings?.Networks?.[EC2_NETWORK]?.IPAddress || "-";

  const keyName = opts.keyPair || "";
  const sshCmd =
    privateIp !== "-"
      ? keyName
        ? `ssh -i ${keyName}.pem root@${privateIp}`
        : `ssh root@${privateIp}`
      : "";

  return {
    id: instanceId,
    name: opts.name,
    type: opts.instanceType,
    state: "running",
    publicIp: privateIp,
    privateIp,
    az: "local-1a",
    ami: opts.amiId,
    amiName: opts.amiName,
    platform: opts.platform || "Linux/UNIX",
    keyPair: keyName,
    securityGroups: [],
    launchTime,
    monitoring: "disabled",
    iamRole: "",
    rootDeviceType: "docker",
    rootDeviceName: "/dev/sda1",
    volumes: [],
    tags: opts.tags || [],
    containerId: info.Id,
    sshCommand: sshCmd,
    vpcId: "vpc-docker",
    subnetId: "subnet-docker",
  };
}

// Find container by instanceId and userId
async function findContainer(
  userId: string,
  instanceId: string
): Promise<Docker.Container | null> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [
        `awsmock.user_id=${userId}`,
        `awsmock.instance_id=${instanceId}`,
      ],
    },
  });

  if (containers.length === 0) return null;
  return docker.getContainer(containers[0].Id);
}

// Stop an instance
export async function stopInstance(
  userId: string,
  instanceId: string
): Promise<void> {
  const container = await findContainer(userId, instanceId);
  if (!container) throw new Error("Instance not found");
  await container.stop();
}

// Start a stopped instance
export async function startInstance(
  userId: string,
  instanceId: string
): Promise<void> {
  const container = await findContainer(userId, instanceId);
  if (!container) throw new Error("Instance not found");
  await container.start();
}

// Terminate (remove) an instance
export async function terminateInstance(
  userId: string,
  instanceId: string
): Promise<void> {
  const container = await findContainer(userId, instanceId);
  if (!container) throw new Error("Instance not found");
  try {
    await container.stop();
  } catch {
    // Already stopped, continue
  }
  await container.remove({ force: true });
}

// Terminate all instances for a user (cleanup)
export async function terminateAllInstances(
  userId: string
): Promise<void> {
  const instances = await listInstances(userId);
  for (const instance of instances) {
    try {
      await terminateInstance(userId, instance.id);
    } catch {
      // Best effort cleanup
    }
  }
}

// Check if Docker is available
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}
