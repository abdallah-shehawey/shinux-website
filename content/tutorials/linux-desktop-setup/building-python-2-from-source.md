---
title: Building Python 2 From Source
description: >-
  Some older tools — QuestaSim's license generator among them — still
  hard-depend on Python 2, which modern distros no longer package. Building it
  from source into an isolated location keeps it fully…
order: 17
tags:
  - linux
draft: false
author: abdallah-shehawey
---
Some older tools — QuestaSim's license generator among them — still hard-depend on Python 2, which modern distros no longer package. Building it from source into an isolated location keeps it fully separate from the system Python.

## 1. Install build dependencies

```bash
sudo apt update
sudo apt install build-essential zlib1g-dev libncurses5-dev libgdbm-dev \
  libnss3-dev libssl-dev libreadline-dev libffi-dev wget
```

## 2. Download and extract the source

```bash
cd ~/Downloads
wget https://www.python.org/ftp/python/2.7.18/Python-2.7.18.tgz
tar -xf Python-2.7.18.tgz
cd Python-2.7.18
```

## 3. Build into a private prefix

Installing to a custom prefix (rather than system-wide) means it never conflicts with anything the OS expects Python to be:

```bash
./configure --prefix=$HOME/myApps/python2 --enable-optimizations
make
make install
```

## 4. Alias `python2`

```bash
nano ~/.bashrc
```

Add:

```bash
alias python2='$HOME/myApps/python2/bin/python'
```

```bash
source ~/.bashrc
python2 --version   # Python 2.7.18
```

## 5. Alternative: a virtual environment

If several tools need Python 2, a virtualenv keeps them isolated from each other too:

```bash
wget https://bootstrap.pypa.io/pip/2.7/get-pip.py
python2 get-pip.py
python2 -m pip install virtualenv

$HOME/myApps/python2/bin/virtualenv ~/myApps/python_env/python2_env
```

Activate/deactivate as usual:

```bash
source ~/myApps/python_env/python2_env/bin/activate
python -V   # Python 2.7.18
deactivate
```

The environment persists on disk, so it can be re-activated any time with the same `source` command without rebuilding anything.
