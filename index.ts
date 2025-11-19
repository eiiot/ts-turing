const flags = process.argv.slice(2).filter(n => n.startsWith("-"));
const args = process.argv.slice(2).filter(n => !n.startsWith("-"));

const isVisualMode = flags.includes("-v");

const machineFileName = args[0];
const inputFileName = args[1];

if (!machineFileName) {
  throw new Error("Machine name is required");
}

if (!inputFileName) {
  throw new Error("Input file name is required")
}

const machine = await Bun.file(machineFileName).text();
const input = await Bun.file(inputFileName).text();

const initialHead = input.split("\n")[0]?.indexOf("v");
if (initialHead === -1 || initialHead === undefined) throw new Error("Invalid input: head position")
let head: number = initialHead;
const initialTape = input.split("\n")[1]?.split('');
if (initialTape === undefined) throw new Error("Invalid input: tape empty");
let tape: string[] = initialTape;

const segfault = (s: string | undefined): never => {
  throw new Error(`Segfault on line ${s}`);
}

const logMachine = () => {
  console.log(new Array(head).fill(' ').join('') + 'v')
  console.log(tape.join(''));
}

const tmReturn = (status: string) => {
  logMachine()
  console.log("----")
  console.log("Machine Returned " + status)

  process.exit(0);
}

const readTape = () => {
  if (head < tape.length) {
    if (!tape[head]) {
      return ' ';
    }

    return tape[head];
  }

  return ' ';
}


const lines = machine.split('\n').map(l => l.trim()).filter(l => !!l);

const labels = lines.reduce((acc, curr, i) => {
  if (/^[A-Za-z]+:$/.test(curr)) {
    const key = curr.replace(":", "");
    if (Object.hasOwn(acc, key)) {
      throw new Error("Duplicate label: " + key)
    }

    acc[key] = i;
  }
  return acc;
}, {} as { Start: number, [key: string]: number })

let currLine = labels["Start"];

const INSTRUCTIONS = [
  {
    name: "move",
    matcher: (s: string) => /^Move (Left|Right)$/.test(s),
    exec: (s: string) => {
      if (/Left$/.test(s)) {
        if (head === 0) {
          tape = [' '].concat(tape)
        } else {
          head--;
        }
      } else if (/Right$/.test(s)) {
        head++;
      } else {
        segfault(s)
      }

      currLine++;
    }
  },
  {
    name: "write",
    matcher: (s: string) => /^Write (Blank|'.')$/.test(s),
    exec: (s: string) => {
      const arg = s.split(' ')[1] as string;

      if (arg === "Blank") {
        tape[head] = ' ';
      } else if (/^'.'$/.test(arg)) {
        tape[head] = arg[1] as string;
      } else {
        segfault(s)
      }

      currLine++;
    }
  },
  {
    name: "label",
    matcher: (s: string) => /^[A-Za-z]+:$/.test(s),
    exec: (s: string) => {
      currLine++;
    }
  },
  {
    name: "goto",
    matcher: (s: string) => /^Goto [A-Za-z]+$/.test(s),
    exec: (s: string) => {
      const label = s.split(" ")[1];
      if (!label) throw new Error(`Segfault on line ${s}`);
      const newLine = labels[label]
      if (newLine === undefined) throw new Error("Invalid label " + label + " on line " + currLine)
      currLine = newLine
    }
  },
  {
    name: "return",
    matcher: (s: string) => /^Return (True|False)$/.test(s),
    exec: (s: string) => {
      const arg = s.split(" ")[1] as string;

      tmReturn(arg)
    }
  },
  {
    name: "ifnot",
    matcher: (s: string) => /^If Not (Blank|'.') /.test(s),
    exec: (s: string) => {
      const arg1 = s.split(" ")[2] as string;
      const rest = s.split(" ").slice(3).join(" ");

      if (arg1 === "Blank") {
        if (readTape() !== " ") {
          runLine(rest)
        }
      } else if (arg1[1] !== readTape()) {
        runLine(rest)
      }

      currLine++;
    }
  },
  {
    name: "if",
    matcher: (s: string) => /^If (Blank|'.') /.test(s),
    exec: (s: string) => {
      const arg1 = s.split(" ")[1] as string;
      const rest = s.split(" ").slice(2).join(" ");

      if (arg1 === "Blank" && readTape() === " " || arg1[1] === readTape()) {
        runLine(rest)
      }

      currLine++;
    }
  },
]

const runLine = (line: string) => {
  if (isVisualMode) {
    console.clear();
    logMachine()
    alert(line)
  }

  const instruction = INSTRUCTIONS.find(i => i.matcher(line))

  if (!instruction) throw new Error(`Line ${currLine} is invalid: ${line}`)

  instruction.exec(line);
}

while(currLine <= lines.length) {
  const line = lines[currLine];
  if (!line) throw new Error(`Line ${currLine} is missing`)
  runLine(line)
}

tmReturn("False")
