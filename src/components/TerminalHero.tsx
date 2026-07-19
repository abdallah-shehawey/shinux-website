"use client";

import { useEffect, useState } from "react";

type TerminalStep = {
  command: string;
  output: string;
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
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    const steps: TerminalStep[] = [
      {
        command: "whoami",
        output: `${authorName} — embedded systems engineer, Linux tinkerer, open-source enthusiast`,
      },
      {
        command: "cat skills.txt",
        output:
          "C/C++ · Embedded Linux · RTOS · Yocto/Buildroot\nCAN · LIN · UART · SPI · I2C — AUTOSAR stack",
      },
    ];

    let cancelled = false;
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function run() {
      let i = 0;
      while (!cancelled) {
        const step = steps[i % steps.length];

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
  }, [authorName]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card font-mono text-sm shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ms-2 text-xs text-muted">bash</span>
      </div>
      <div className="px-4 py-4">
        <p className="min-h-[1.25rem] text-start" dir="ltr">
          <span className="text-muted">$</span> <span className="text-accent">{command}</span>
          <span className="animate-pulse text-accent">█</span>
        </p>
        <p
          className="mt-2 min-h-[3.75rem] whitespace-pre-wrap text-start text-muted"
          dir="ltr"
        >
          {output}
        </p>
      </div>
    </div>
  );
}
