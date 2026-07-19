---
title: Mqtt Server Setup (pc as Server)
description: >-
  First, update your package lists, install Mosquitto broker and clients,
  enable, and start the service.
order: 903
tags:
  - linux
draft: false
author: abdallah-shehawey
---
First, update your package lists, install Mosquitto broker and clients, enable, and start the service.

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

# Terminal 1 (subscriber)

In one terminal window, subscribe to a topic to listen for messages.

```text
mosquitto_sub -h localhost -t "test/topic"
```

# Terminal 2 (publisher)

In a second terminal window, publish a message to the topic.

```text
mosquitto_pub -h localhost -t "test/topic" -m "Hello World"
```

You should see "Hello World" appear in Terminal 1.
