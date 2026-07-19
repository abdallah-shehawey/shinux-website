---
title: 'Docker Networking: the Ultimate Deep Dive'
description: >-
  This guide is the complete reference for Docker Networking. It covers internal
  architecture, DNS resolution, port mapping, legacy links, and advanced network
  drivers.
order: 5
tags:
  - devops
draft: false
author: abdallah-shehawey
---
This guide is the complete reference for Docker Networking. It covers internal architecture, DNS resolution, port mapping, legacy links, and advanced network drivers.

## Internal Architecture: the "bridge"

When you install Docker, it creates a virtual network interface on the host called `docker0`.

- **IP Address:** Usually starts with `172.17.0.1`.

- **Subnet:** Usually `172.17.0.0/16`.

- **Behavior:** Every new container gets an IP address from this range (e.g., `172.17.0.2`, `172.17.0.3`, `172.17.0.4`, etc.).

### Visualizing the Connection

`Host (Eth0) <==> Docker0 Bridge (172.17.0.1) <==> Container (Eth0)`

## Network Drivers (types) & Examples

Docker creates 3 networks by default, but supports others.

### Bridge (default)

- **Scope:** Local (Single Host).

- **Behavior:** Private internal network. Containers get IPs like `172.17.0.2`.

- **Example:**

```text
docker run ubuntu
# Result: Container gets IP 172.17.0.2, Gateway 172.17.0.1
```

### None (fully Isolated)

- **Scope:** Local.

- **Behavior:** No network card, no IP, no internet.

- **Command:**

```ini
docker run ubuntu --network=none
```

- **Result:** The container is completely isolated from the host and other containers.

### Host (no Isolation)

- **Scope:** Local.

- **Behavior:** Removes network isolation. The container shares the **exact same network namespace** as the host machine.

- **Command:**

```ini
docker run ubuntu --network=host
```

- **Result:** If the web app listens on port 5000 inside, it is accessible directly on the Docker Host at port 5000. No Port Mapping (`-p`) is needed.

### User-defined Bridge (custom Subnets)

You can create your own isolated network and even specify the IP range (Subnet).

**Command:**

```text
docker network create \
  --driver bridge \
  --subnet 182.18.0.0/16 \
  custom-isolated-network
```

**Result:**

- Containers in this network will get IPs like `182.18.0.2`, `182.18.0.3`.

- They are isolated from the default `docker0` network (`172.17.x.x`).

## Port Mapping (publishing)

Since containers are on a private network (`172.17.x.x`), you cannot access them from your browser (localhost) by default. You must "publish" the port.

**Command:**

```text
docker run -p 8080:80 nginx
```

**Breakdown `-p HOST_PORT:CONTAINER_PORT`:**

- **8080 (Host):** The port you will open in your browser (`localhost:8080`).

- **80 (Container):** The port the app inside is listening on.

**What happens if I don't use `-p`?** The container can talk to the internet (download updates), but **nobody** can talk to the container from the outside.

## Container Communication: Dns vs. Ip

This is the most critical concept for developers.

### Scenario A: Default Bridge Network

If you run two containers on the default bridge:

1. They can ping each other by **IP Address** (e.g., `172.17.0.2`).

2. They **CANNOT** ping each other by **Container Name**.

3. _Problem:_ IPs change every time a container restarts.

### Scenario B: User-defined Bridge (embedded Dns)

If you create your own network, Docker runs an internal **DNS Server** at `127.0.0.11`.

**Example:**

```text
# 1. Create Network
docker network create my-net

# 2. Run Database (Name: mysql) -> Gets IP 172.17.0.3
docker run -d --name mysql --network my-net mysql

# 3. Run Web App (Name: web) -> Gets IP 172.17.0.2
docker run -d --name web --network my-net nginx
```

**How it works (Code Example):** Inside your application code, you use the container name `mysql` instead of the IP.

```text
// Inside the 'web' container
mysql.connect('mysql')
// Docker DNS (127.0.0.11) resolves 'mysql' to '172.17.0.3' automatically.
```

## Inspecting Network Details (json Output)

To see the exact IP, Gateway, and MacAddress, use `docker inspect`.

**Command:**

```text
docker inspect blissful_hopper
```

**Example Output (NetworkSettings):**

```json
"NetworkSettings": {
    "Bridge": "",
    "Gateway": "172.17.0.1",
    "IPAddress": "172.17.0.6",
    "MacAddress": "02:42:ac:11:00:06",
    "Networks": {
        "bridge": {
            "Gateway": "172.17.0.1",
            "IPAddress": "172.17.0.6",
            "MacAddress": "02:42:ac:11:00:06"
        }
    }
}
```

## Docker Network Commands Cheat Sheet

|Command|Description|Key Argument|
|---|---|---|
|`docker network ls`|List all networks.||
|`docker network create`|Create a new network.|`--driver bridge`, `--subnet`|
|`docker network rm`|Delete a network.||
|`docker network prune`|Remove all unused networks.||
|`docker network inspect`|View details (Subnet, Connected Containers).||
|`docker network connect`|Attach a **running** container to a network.||
|`docker network disconnect`|Remove a container from a network.||

## Advanced Debugging

### Find Container Ip (the "grep" Method)

```bash
docker inspect <container_id> | grep -A 3 -B 3 -i ip
```

### Verify Dns (inside Container)

To check if networking is working properly inside a container:

```text
docker exec -it <container_id> nslookup <other_container_name>
# OR
docker exec -it <container_id> ping <other_container_name>
```

### Check Host Interfaces (find Docker0)

To see the `docker0` bridge interface on your **Host Machine**:

**Linux/Mac:**

```text
ip addr show docker0
# OR
ifconfig
```

**Windows:**

```text
ipconfig
```

_Look for an adapter named `docker0` or `vEthernet (WSL)`._

## Faq: Important Interview Questions

**Q: Does Docker use the Host's DNS?** **A:** By default, containers inherit the DNS settings (`/etc/resolv.conf`) from the Host machine. However, on User-Defined networks, Docker uses its own embedded DNS server first (`127.0.0.11`) to resolve container names.

**Q: What is the IP `127.0.0.11`?** **A:** This is Docker's embedded DNS server that lives inside every container running on a user-defined network. It routes DNS queries to the correct container IP.

**Q: Can I set a static IP for a container?** **A:** Yes, but **only** on a user-defined network using the `--ip` flag. `docker run --network my-net --ip 172.18.0.22 nginx`
