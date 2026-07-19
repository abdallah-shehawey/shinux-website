---
title: Camera Module with Raspberry Pi
description: >-
  This guide explains how to interface with the Raspberry Pi Camera Module using
  two different methods: the Command Line Interface (CLI) and Python.
order: 6
tags:
  - embedded linux
draft: false
author: abdallah-shehawey
---
This guide explains how to interface with the Raspberry Pi Camera Module using two different methods: the Command Line Interface (CLI) and Python.

---
## Prerequisites

Ensure your camera module is correctly connected to the Raspberry Pi's CSI port and that your system is up to date.

---
## Method 1: Using the Terminal (cli)

The modern Raspberry Pi OS uses the `rpicam-apps` suite (formerly `libcamera`).

### Basic Preview

To simply open the camera and see a live preview on your monitor:

```text
rpicam-still
```

### Preview with Specific Duration

By default, the preview might close quickly or stay open depending on settings. To keep the preview open for a specific amount of time, use the `-t` flag followed by time in **milliseconds**.

```text
# Open camera for 5 seconds (5000 ms)
rpicam-still -t 5000
```

### Capturing an Image

To save an image to a specific file, use the `-o` (output) flag.

```text
rpicam-still -o path-to-pic.jpg
```

### Adjusting Resolution

High-resolution images take up a lot of storage space. You can resize the image using `--width` and `--height`. Check the terminal logs when running the camera to see supported resolutions.

```text
# Example: Resize to 1640x1232
rpicam-still -o path-to-pic.jpg --width 1640 --height 1232
```

### Flipping the Image

If your camera is mounted upside down or facing backwards, you can rotate the image using:

- `--vflip`: Vertical flip

- `--hflip`: Horizontal flip


```text
rpicam-still -o path-to-pic.jpg --width 1640 --height 1232 --vflip --hflip
```

### Recording Video

To record a video, use the `rpicam-vid` command. The `-t` flag here determines the length of the recording.

```text
# Record a 10-second video (10000 ms)
rpicam-vid -t 10000 -o path-to-vid.mp4
```

---
## Method 2: Using Python (`picamzero`)

For programmatic control, we will use the `picamzero` library. This is a beginner-friendly wrapper for the camera.

### Installation

This library is not installed by default. Update your repositories and install it:

```bash
sudo apt update
sudo apt install python3-picamzero
```

### Create the Python Script

Create a new file to write your code:

```text
nvim camera.py
```

### Script: Taking a Photo

Here is a complete script to configure the camera and take a picture.

```bash
from picamzero import Camera
from time import sleep

# Initialize the camera object
camera = Camera()

# Set the resolution
# Note: (1640, 1232) is a "Tuple". In Python, a Tuple allows us to store
# multiple items (width and height) in a single variable, similar to an array.
camera.still_size = (1640, 1232)

# Flip the camera if it is mounted upside down
camera.flip_camera(hflip=True, vflip=True)

# Important: Wait for the camera sensor to warm up
# (adjusts light levels and white balance)
sleep(2)

# Capture the image
# You can add a `delay` parameter inside take_photo if needed
camera.take_photo("image.jpg")

print("Photo taken successfully.")
```

### Script: Recording Video

Below is the code to record a video segment.

```dockerfile
from picamzero import Camera
from time import sleep

# Initialize the camera
camera = Camera()

# Set resolution and orientation
camera.still_size = (1640, 1232)
camera.flip_camera(hflip=True, vflip=True)

# Warm up the sensor
sleep(2)

print("Starting Video Recording...")

# Record video for a specific duration (e.g., 5 seconds)
# The first argument is the filename, the second is the duration in seconds.
camera.record_video("my_video.mp4", duration=5)

print("Video saved successfully.")
```

### Script: Continuous Capture (data Collection)

This method is ideal for collecting datasets for Deep Learning or Machine Learning. It allows you to run code _between_ every picture (e.g., image processing or sensor readings).

**Option A: Manual Loop (Recommended for processing)**

This script creates a folder and continuously takes photos until you stop it (Ctrl+C).

```dockerfile
from picamzero import Camera
import os
from time import sleep

FOLDER_NAME = 'dataset_images'

# Create directory if it doesn't exist
if not os.path.exists(FOLDER_NAME):
    os.makedirs(FOLDER_NAME)

# Initialize Camera
try:
    camera = Camera()
    camera.still_size = (1640, 1232)
    camera.flip_camera(hflip=True, vflip=True)
    sleep(2) # Warmup
    print("Camera has been initialized...")
except Exception as e:
    print(f"Error initializing camera: {e}")
    exit(1)

counter = 0

try:
    while True:
        file_name = f"{FOLDER_NAME}/image_{counter}.jpg"

        # Take the photo
        camera.take_photo(file_name)
        print(f"Captured: {file_name}")

        # You can add image processing logic here before the next shot

        counter += 1
        sleep(3) # Delay between shots

except KeyboardInterrupt:
    print("\nProcess interrupted by user. Exiting...")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    print("Cleaning up Resources")
```

**Option B: Built-in Sequence (Simpler but Blocking)**

`picamzero` has a built-in function called `capture_sequence`. It is easier to write, but it **blocks execution**. This means you cannot run any image processing or sensor logic between the shots; the program waits until _all_ photos are taken before moving on.

Use this only if you just need to dump images quickly without logic in between.

```ini
# Takes 10 images with a 5-second interval
# Note: You cannot run code between these shots.
camera.capture_sequence(FOLDER_NAME, num_images=10, interval=5)
```
