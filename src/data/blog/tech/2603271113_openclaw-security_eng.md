---
author: Jeff Yang
pubDatetime: 2026-04-18T07:58:52.737Z
modDatetime: 2026-04-18T07:25:46.734Z
title: OpenClaw Security Risks
tags:
  - linux
  - opensource
  - openclaw
  - ai
  - clawhub
  - security
description: OpenClaw security risks - a warning to users and self-hosters
featured: true
Draft: false
---

# OpenClaw Security Risks: A Warning to Users and Self-Hosters

![secImg](../../../assets/images/2603271113_openclaw-security.png)

OpenClaw 🦞 is a popular open-source AI agent platform offering powerful automation capabilities, but recent Reddit discussions and security audits have revealed serious security risks. This article outlines exposed risks, real-world incidents, and actionable remediation suggestions to help you adopt protective measures when self-hosting or decide whether to migrate to a safer alternative.

**Key takeaways**
- Default ports (8000/18789) exposed to the internet; hundreds of thousands of instances online
- Community “skills” carry a high proportion of malicious payloads
- Mandatory isolation, skill whitelisting, and log auditing are recommended

## Overview of Core Vulnerabilities

OpenClaw’s design grants agents broad system access, and the “skills” (contributed by the community) distributed via ClawHub amplify supply-chain risks. Multiple audits show that a significant proportion of thousands of skills contain security issues, with some even containing malicious code (such as downloaders, keyloggers, data exfiltration tools, and command injectors). These skills often reappear after removal, evading simple manual review.

Default deployments often expose ports (such as 8000, 18789, etc.) to the public internet. Scan data shows hundreds of thousands of instances online, with some leaking configurations or databases. Input sources (emails, Markdown, web content) are easily embedded with executable payloads and processed with near-root permissions. In response to these issues, Kaspersky, independent researchers, and community audits have found empirical cases, recommending that OpenClaw be treated as a high-risk service and run with mandatory isolation.

## Threat Landscape

The OpenClaw ecosystem’s broad agent capabilities and community-driven skill marketplace create a large attack surface. In 2025–2026, campaigns have increasingly automated malicious skill propagation, credential exfiltration, and exploitation of exposed gateways. Attackers leverage obfuscated payloads, fake dependencies, and recycled uploads to bypass basic reviews, while exposed Control Gateway (18789) and Vector/API (8000) enable zero-click lateral movement and persistence.

Key observed patterns include skills exfiltrating API keys and host IPs via Discord webhooks or external HTTP endpoints, and widespread port exposure allowing unauthenticated access. Prioritize immediate hardening: bind services to loopback, enforce skill whitelisting, and audit IOCs such as unexpected outbound connections and credential strings in configs. Treat all unaudited skills as potentially malicious and isolate them in containers or dedicated VMs to reduce risk.

## Real Incidents and Attack Chains

A timeline of verifiable incidents compiled by the community and security blogs shows multiple malicious skill propagation events, configuration leaks, and remote execution vulnerabilities due to default configurations.

- **ClawHub Malicious Activity (January–February 2026)**

  Dozens to hundreds of skills were found to contain malicious payloads with encoded obfuscation, fake dependencies, and unencrypted HTTP exfiltration. Some samples deploy encryption ransomware or credential-stealing tools on Windows/macOS/Linux. These skills are often re-uploaded with minor modifications to bypass interception.

  Recommended inspection process (Linux/macOS):

  ```bash
  # Clone skills repo for audit
  git clone https://github.com/openclaw/skills ~/openclaw-skills
  cd ~/openclaw-skills

  # Grep for common malicious patterns (exfil, downloads, encoding)
  grep -r -i "curl.*http\|wget.*http\|base64\|powershell\|cmd.exe\|keylog" . --include="*.json" --include="*.yaml"

  # Check for non-HTTPS endpoints
  grep -r -i "http://" . | grep -v "https"

  # Remove suspicious skills
  find . -name "*research*" -o -name "*hsk*" | xargs rm -rf

  # Reinstall clean: backup first
  cp -r ~/openclaw-skills ~/openclaw-skills.bak
  ```

- **Moltbook Leak Case (February 2026)**

  A popular skill exfiltrated user configurations (including API keys and host IPs) via a Discord webhook, affecting tens of thousands of instances and appearing as data samples on the dark web. Common commands to detect such exfiltration include searching system logs for webhook/HTTP POST behavior and scanning running processes.

  ```bash
  # Scan local OpenClaw logs for exfil (Discord, external APIs)
  sudo journalctl -u openclaw | grep -i "discord\|webhook\|http.*post" | tail -20

  # Check running processes for anomalies
  ps aux | grep openclaw | grep -E "curl|wget|nc"
  kill -9 <PID>  # Kill suspect process

  # Inspect config for leaks
  grep -r "api_key\|token\|webhook" ~/.openclaw/config.yaml
  ```

- **Port Exposure and Remote Execution (Persistent Issue)**

  Large-scale scans show many instances exposed on default ports, and some demos (such as those using Zenity) demonstrate zero-click remote command execution triggered via WebSocket or user input. Attackers exploit these exposed services to automatically propagate malicious skills or execute payloads.

  Quick blocking example:

  ```bash
  # On Ubuntu/Debian (Linux)
  sudo netstat -tuln | grep 8000  # Confirm exposure
  sudo ufw deny 8000  # Block port
  sudo systemctl restart openclaw

  # macOS (use pfctl or firewall)
  sudo pfctl -f /etc/pf.conf  # Edit to block 8000/tcp
  sudo pfctl -E
  ```

## Tiered Hardening Checklist (Practical Priority)

The following actionable hardening suggestions are provided in three tiers, applicable to Linux/macOS environments. Test in a VM before going live.

### Tier 1: Basic Protection (Must Do)

- Disable root login and enable key-based authentication
- Enable host firewall (UFW) and fail2ban; default deny incoming traffic, allow SSH only from trusted IPs
- Bind OpenClaw components to loopback (127.0.0.1); prohibit listening on arbitrary network interfaces

Example:

```bash
# Disable root SSH, enforce keys (Linux)
sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Install fail2ban/UFW
sudo apt update && sudo apt install ufw fail2ban -y
sudo ufw enable; sudo ufw default deny incoming
sudo ufw allow ssh  # From your IP only: sudo ufw allow from <YOUR_IP> to any port 22
```

### Tier 2: Container Isolation (Strongly Recommended)

Use Docker to minimize host exposure, restrict network access and mounted volumes. Security community members such as Simon Willison suggest running non-managed agents only in isolated environments.

```bash
# Pull official image (verify tag)
docker pull openclaw/openclaw:latest

# Run isolated (no ports, minimal volumes)
docker run -d --name secure-claw \
  --network none \  # No network access
  -v /path/to/safe/config:/config:ro \
  -v /tmp/claw-data:/data \
  openclaw/openclaw:latest

# Inspect container
docker logs secure-claw | grep -i "skill\|load"
docker exec secure-claw ps aux  # Check processes
```

### Tier 3: Advanced Isolation and Zero Trust (Enterprise/Multi-tenant)

- Use Tailscale/VPN to maintain access without public-facing ports
- Run agents in a dedicated VLAN/VM, limiting reachable network resources
- Adopt a skill whitelist policy, allowing only audited skills to load

Example (Tailscale + Whitelist):

```bash
# Tailscale VPN (no public ports)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --authkey=<your-key>

# Whitelist skills
nano ~/.openclaw/allowlist.yaml  # Only vetted: - safe-skill-1
openclaw --config ~/.openclaw/config.yaml --skills allowlist.yaml

# Audit runtime
sudo strace -p $(pgrep openclaw) -e trace=execve  # Trace execs
```

Additional recommendations: disable unnecessary tools, enable unattended-upgrades, and periodically audit the skills directory using static/dynamic analysis tools.

## Gateway and Port Context — Why 18789/8000 Are Dangerous

- Gateway (default port 18789) provides a WebSocket channel and control panel; if bound to 0.0.0.0, it becomes visible to the public internet.
- Vector/API (commonly 8000) may also expose sensitive operations or configurations.

Correct practice is to bind these services to loopback:

```bash
openclaw config set gateway.bind "loopback"
openclaw config set vector.bind "loopback"
openclaw config set frontend.bind "loopback"

# Verify
openclaw config get gateway.bind
openclaw gateway status
sudo netstat -tuln | grep -E "18789|8000|3000"
```

And use SSH port forwarding or Tailscale for remote access instead of directly exposing ports.

## Alternative Solutions and Conclusion

If you need an auditable, low-risk agent or automation:

- Prioritize managed cloud APIs (e.g., enterprise-grade LLM services) or audited local frameworks (sandboxed LangChain deployments, audited Auto-GPT forks).
- If you must self-host, default to Docker + private network + strict whitelist policy; treat all skills as potential malicious code.

Summary: OpenClaw’s ease of use comes with significant security costs. The widespread exposure of instances illustrates the danger of default configurations and an open ecosystem. Immediate auditing, isolation, and migration where feasible are the only reasonable strategies to avoid becoming the next victim.

---

## References
- [OpenClaw security worse than expected](https://www.reddit.com/r/AI_Agents/comments/1r3u98p/openclaw_security_is_worse_than_i_expected_and_im/)
- [Selfhosting security minefield](https://www.reddit.com/r/selfhosted/comments/1qwn5i9/selfhosting_openclaw_is_a_security_minefield/)
- [Every vulnerability documented](https://www.reddit.com/r/LocalLLaMA/comments/1r81vw2/every_openclaw_security_vulnerability_documented/)
- [18k instances scanned](https://www.reddit.com/r/MachineLearning/comments/1r30nzv/d_we_scanned_18000_exposed_openclaw_instances_and/)
- [Malicious skill issue](https://github.com/openclaw/openclaw/issues/37664)

tag: #opensource #linux #openclaw #ai #clawhub #skill #security