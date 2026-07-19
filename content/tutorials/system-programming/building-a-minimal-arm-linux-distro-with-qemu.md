---
title: Building a Minimal Arm Linux Distro with Qemu
description: >-
  Building a Linux distribution from scratch — kernel, root filesystem, init
  process — makes the pieces that normally hide behind a distro installer
  completely visible. This walks through doing it for…
order: 6
tags:
  - systems
draft: false
author: abdallah-shehawey
---
Building a Linux distribution from scratch — kernel, root filesystem, init process — makes the pieces that normally hide behind a distro installer completely visible. This walks through doing it for an emulated ARM board (QEMU's Versatile PB) rather than real hardware, so nothing here risks bricking anything: a cross-compiled kernel, a hand-built initrd, BusyBox for a shell, and finally a persistent disk image instead of a throwaway RAM disk.

*(Adapted from [lukaszgemborowski's minimalistic-linux-system-on-qemu-arm](https://lukaszgemborowski.github.io/articles/minimalistic-linux-system-on-qemu-arm.html) and the [QEMU Versatile PB docs](https://www.qemu.org/docs/master/system/arm/versatile.html).)*

## Qemu, Emulation, and Virtualization

QEMU ("Quick Emulator") runs a guest built for one architecture on a host with a different one, by translating guest instructions into ones the host CPU understands. That's **emulation** — mimicking hardware that's fundamentally unlike the host (ARM code running on an x86 machine), which is inherently slower since every instruction gets translated. **Virtualization** is a different thing: multiple guests that share the host's own architecture, managed by a hypervisor that hands out real hardware resources directly — closer to native speed. The common flavors: full virtualization (guest OS is unmodified and unaware), hardware-assisted (via Intel VT-x/AMD-V, which is what QEMU uses through KVM on Linux), paravirtualization (guest kernel is modified to talk to the hypervisor directly), and Type-1/bare-metal hypervisors (VMware ESXi, Hyper-V) that run straight on the hardware.

This lesson is squarely in emulation territory: ARM guest code, translated for an x86 host, via `qemu-system-arm`.

## Install Qemu and the Kernel Build Toolchain

```bash
sudo apt update
sudo apt install qemu-system-arm
sudo apt-get install git fakeroot build-essential ncurses-dev xz-utils libssl-dev bc flex libelf-dev bison
```

Compiling an ARM kernel on an x86 host needs a cross-compiler:

```bash
sudo apt install gcc-arm-linux-gnueabi g++-arm-linux-gnueabi
```

**Sanity-check the cross-compiler** before touching the kernel:

```c
// hello.c
#include <stdio.h>
#include <unistd.h>

int main(void)
{
    printf("Hello from QEMU on ARM VersatilePB!\n");
    while (1) { sleep(1); }
    return 0;
}
```

```text
gcc hello.c -o hello_x86.out                              # native build
file hello_x86.out                                          # reports x86-64

arm-linux-gnueabi-gcc --static hello.c -o hello_arm.out    # cross-compiled, statically linked
file hello_arm.out                                           # reports ARM
```

An x86 host can't run the ARM binary directly, but `qemu-user` (QEMU's user-mode emulator, for single programs rather than a whole system) can:

```bash
sudo apt install qemu-user
qemu-arm ./hello_arm.out
```

Statically linking sidesteps needing ARM shared libraries at all. Without `--static`, the dynamic linker path has to be pointed at manually — `arm-linux-gnueabi-gcc -print-sysroot` shows where the cross-toolchain's own minimal filesystem lives, and:

```bash
arm-linux-gnueabi-gcc -print-search-dirs | tr ':' '\n' | xargs -I _ find _ -iname ld-linux.so.3
qemu-arm -L /usr/arm-linux-gnueabi ./test
```

`-L` tells `qemu-arm` where to resolve the guest's dynamic linker and shared libraries from.

## Build the Kernel for Versatile Pb

Download a kernel source tree from [kernel.org](https://www.kernel.org/), extract it, then configure and build for the emulated board:

```ini
tar -xvf linux-X.Y.Z.tar.xz
cd linux-X.Y.Z

make O=./build/ ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- versatile_defconfig
# optional: make O=./build/ ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- menuconfig

time make -j$(nproc) O=./build/ ARCH=arm CROSS_COMPILE=arm-linux-gnueabi-
```

`O=` sets the build output directory, `ARCH=arm` targets ARM, `CROSS_COMPILE=` is the toolchain prefix, and `versatile_defconfig` is the board's default config (`arch/arm/configs/versatile_defconfig`).

Install the compiled modules into what will become the root filesystem:

```ini
mkdir ../rootfs
time make -j$(nproc) modules_install O=./build/ ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- INSTALL_MOD_PATH=../rootfs
```

## First Boot and the Expected Panic

```ini
qemu-system-arm -M versatilepb -kernel build/arch/arm/boot/zImage \
  -dtb build/arch/arm/boot/dts/arm/versatile-pb.dtb \
  -serial stdio -append "serial=ttyAMA0"
```

The kernel boots and immediately panics — there's no root filesystem and no `init` process yet. That's expected; the next steps fix exactly that.

## A Trivial Initrd

Reuse `hello_arm.out` from step 2 as the entire `init` process, then package the rootfs directory as a `cpio` archive (the format the kernel expects for an initrd):

```bash
cp hello_arm.out rootfs/init
cd rootfs/
find . -print0 | cpio --null -ov --format=newc | gzip -9 > ../rootfs.cpio.gz
cd ..
```

(`-print0` null-terminates filenames instead of newline-terminating them, so filenames containing spaces or odd characters survive the pipe to `cpio` intact.)

```ini
qemu-system-arm -M versatilepb \
  -kernel ./linux-X.Y.Z/build/arch/arm/boot/zImage \
  -dtb ./linux-X.Y.Z/build/arch/arm/boot/dts/arm/versatile-pb.dtb \
  -initrd ./rootfs.cpio.gz \
  -serial stdio \
  -append "root=/dev/mem serial=ttyAMA0"
```

This boots and runs the "Hello" loop forever — progress, but not yet a usable system.

## Add a Real Shell with Busybox

BusyBox bundles dozens of standard Unix utilities into one small, statically-linkable binary — exactly what a minimal rootfs needs instead of a real `init` loop.

```ini
tar xvf busybox-1.36.1.tar.bz2
cd busybox-1.36.1

make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- defconfig
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- menuconfig
# Settings ---> [*] Build static binary (no shared libs)

make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- -j$(nproc)
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- install   # lands in _install/
```

```bash
cd _install/
cp -r bin sbin usr ../../rootfs
cp -r linuxrc ../../rootfs
cd ../../
```

## A Real `init` Script

```bash
cd rootfs
mkdir proc sys dev
rm init   # drop the placeholder binary
```

```bash
#!/bin/sh
echo -e "\nHello from the init process\n"

mount -tproc none /proc
mount -tsysfs none /sys
mknod -m660 /dev/mem c 1 1

exec /bin/sh
```

```bash
chmod +x init
find . -print0 | cpio --null -ov --format=newc | gzip -9 > ../rootfs.cpio.gz
cd ..
```

Booting with the same QEMU command as step 5 now drops into an actual `/bin/sh` prompt (`/ #`) — a working, if minimal, Linux system.

## Swapping the Initrd for a Persistent Disk Image

An initrd is RAM-only and disappears on reboot. To simulate a real storage device (an SD card, say), build an `ext2` image instead and boot it as a SCSI disk:

```ini
dd if=/dev/zero of=rootfs.ext2 bs=1M count=256
mkfs.ext2 rootfs.ext2

mkdir temp_mount
sudo mount rootfs.ext2 temp_mount
sudo cp -r rootfs/* temp_mount/
sudo umount temp_mount
```

The kernel needs block-device and SCSI support enabled that a minimal `versatile_defconfig` doesn't include by default — via `menuconfig`, under **Device Drivers**: devtmpfs auto-mounting, the ARM Versatile PB PCI controller, and SCSI disk + `SYM53C8XX`/LSI Logic driver support. Re-run the kernel build after enabling them.

```ini
qemu-system-arm -M versatilepb -m 256M -serial stdio \
  -kernel linux-X.Y.Z/build/arch/arm/boot/zImage \
  -dtb linux-X.Y.Z/build/arch/arm/boot/dts/arm/versatile-pb.dtb \
  -append "console=ttyAMA0 root=/dev/sda rw rootwait" \
  -device lsi53c895a,id=scsi \
  -drive if=none,file=rootfs.ext2,format=raw,id=hd0 \
  -device scsi-hd,drive=hd0,bus=scsi.0
```

`root=/dev/sda rootwait` tells the kernel the root filesystem is the first SCSI disk, and to wait for it to actually be ready rather than assuming it's there instantly — the same pattern real hardware needs for USB or SD-card-backed root filesystems that take a moment to enumerate.

That's the whole loop: cross-compiled kernel, hand-assembled rootfs, BusyBox for utilities, a hand-written `init`, and a persistent disk image standing in for real storage — every piece a full distro normally hides.
