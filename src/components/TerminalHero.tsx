"use client";

import { useEffect, useState, type ReactNode } from "react";

type TerminalStep = {
  command: string;
  output: string;
  render?: () => ReactNode;
};

const TYPE_SPEED_MS = 45;
const ERASE_SPEED_MS = 25;
const PAUSE_BEFORE_OUTPUT_MS = 350;
const PAUSE_BEFORE_ERASE_MS = 300;
const PAUSE_BEFORE_NEXT_MS = 500;

// Long outputs need more reading time than short ones.
function holdMsFor(step: TerminalStep) {
  return 1300 + step.output.length * 12;
}

export default function TerminalHero({ authorName }: { authorName: string }) {
  const steps: TerminalStep[] = [
    {
      command: "whoami",
      output: `${authorName} — Embedded Software Engineer\nLinux enthusiast · Open-source tinkerer · Always building something`,
    },
    {
      command: "uname -a",
      output: "shinux · Embedded/Linux · x86_64\nKernel: curiosity-driven · Uptime: still learning",
    },
    {
      command: "cat /proc/shehawey/status",
      output: "Role: Embedded Software Engineer · State: R (running)\nFocus: Embedded Systems · Linux · Networking",
      render: () => (
        <span>
          Role: Embedded Software Engineer · State: <span className="text-accent">R (running)</span>{"\n"}
          Focus: Embedded Systems · Linux · Networking
        </span>
      ),
    },
    {
      command: "systemctl status shehawey",
      output: "● shehawey.service — Embedded Software Engineer\nActive: active (running) · Building · Learning · Debugging",
      render: () => (
        <span>
          <span className="text-accent">●</span> shehawey.service — Embedded Software Engineer{"\n"}
          Active: <span className="text-accent">active (running)</span> · Building · Learning · Debugging
        </span>
      ),
    },
    {
      command: "cat skills.txt",
      output: "C/C++ · Embedded C · STM32 · AVR · ESP32\nFreeRTOS · Embedded Linux · CAN · UART · SPI · I2C · Git",
    },
    {
      command: "echo $TOOLCHAIN",
      output: "GCC · GDB · CMake · Git · VS Code · STM32CubeIDE\nLinux · Docker · Proteus · MATLAB",
    },
  ];

  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function run() {
      let i = 0;
      while (!cancelled) {
        const step = steps[i % steps.length];
        setCurrentStepIndex(i % steps.length);

        for (let c = 1; c <= step.command.length; c++) {
          if (cancelled) return;
          setCommand(step.command.slice(0, c));
          await wait(TYPE_SPEED_MS);
        }
        if (cancelled) return;

        await wait(PAUSE_BEFORE_OUTPUT_MS);
        if (cancelled) return;
        setOutput(step.output);

        await wait(holdMsFor(step));
        if (cancelled) return;
        setOutput("");

        await wait(PAUSE_BEFORE_ERASE_MS);
        for (let c = step.command.length - 1; c >= 0; c--) {
          if (cancelled) return;
          setCommand(step.command.slice(0, c));
          await wait(ERASE_SPEED_MS);
        }
        if (cancelled) return;

        await wait(PAUSE_BEFORE_NEXT_MS);
        i++;
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorName]);

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card font-mono text-xs sm:text-sm shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ms-2 text-xs text-muted">bash</span>
      </div>
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <p className="min-h-[1.25rem] text-start" dir="ltr">
          <span className="text-muted">$</span>{" "}
          <span className="text-accent">{command}</span>
          <span className="animate-pulse text-accent">█</span>
        </p>
        {/* Grid overlay: all outputs share one cell so the tallest reserves
            the height — the box never jumps while the animation types. */}
        <div className="mt-2 grid">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="col-start-1 row-start-1 invisible pointer-events-none select-none text-start whitespace-pre-wrap"
              dir="ltr"
              aria-hidden="true"
            >
              {step.render ? step.render() : step.output}
            </div>
          ))}
          <div
            className="col-start-1 row-start-1 text-muted text-start whitespace-pre-wrap"
            dir="ltr"
          >
            {output ? (
              steps[currentStepIndex]?.render ? (
                steps[currentStepIndex].render!()
              ) : (
                output
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
