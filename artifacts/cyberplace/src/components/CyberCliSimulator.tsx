import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Terminal as TerminalIcon, Play, RotateCcw, Copy, Check, Sparkles } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

interface CommandOutput {
  command: string;
  output: string | React.ReactNode;
  isError?: boolean;
}

const VIRTUAL_FILES: Record<string, string> = {
  "readme.txt": "Welcome to cdCTF Cyber Security Academy!\nPractice CLI commands to master Linux security.",
  "flag.txt": "cdctf{cl1_l1nux_m4st3r_2026}",
  "config.ini": "[server]\nport=8080\ndebug=true\nsecret_key=SuperSecretToken123!",
  "access.log": "192.168.1.10 - GET /index.html 200\n192.168.1.15 - POST /login 401\n10.0.0.45 - GET /admin 403\n192.168.1.99 - POST /api/v1/auth 200",
};

interface Props {
  initialCommand?: string;
  expectedOutputPattern?: string;
  onSuccess?: () => void;
}

export function CyberCliSimulator({ initialCommand = "ls -la", onSuccess }: Props) {
  const { t } = useLang();
  const [history, setHistory] = useState<CommandOutput[]>([
    {
      command: "welcome",
      output: t(
        "cdCTF Virtual Linux Sandbox v2.4 initialized. Type 'help' for available commands.",
        "cdCTF Virtual Linux Muhiti ishga tushdi. Buyruqlar ro'yxati uchun 'help' deb yozing.",
        "Виртуальная среда cdCTF Linux запущена. Напишите 'help' для списка команд."
      ),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    setCommandHistory(prev => [trimmed, ...prev]);
    setHistoryIdx(-1);

    const parts = trimmed.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let outputResult: string | React.ReactNode = "";
    let isErr = false;

    switch (cmd) {
      case "help":
        outputResult = (
          <div className="space-y-1 text-slate-300">
            <p className="text-emerald-400 font-bold">{t("Available commands:", "Mavjud buyruqlar:", "Доступные команды:")}</p>
            <p><span className="text-amber-300 font-mono">ls [dir]</span> - {t("List directory contents", "Katalog fayllarini ko'rsatish", "Показать файлы в директории")}</p>
            <p><span className="text-amber-300 font-mono">cat &lt;file&gt;</span> - {t("Read file content", "Fayl ichini o'qish", "Прочитать содержимое файла")}</p>
            <p><span className="text-amber-300 font-mono">grep &lt;pattern&gt; &lt;file&gt;</span> - {t("Search text pattern", "Matn patternini qidirish", "Поиск фрагмента текста")}</p>
            <p><span className="text-amber-300 font-mono">whoami</span> - {t("Print active username", "Joriy foydalanuvchini ko'rsatish", "Имя текущего пользователя")}</p>
            <p><span className="text-amber-300 font-mono">pwd</span> - {t("Print working directory", "Joriy katalogni ko'rsatish", "Текущая директория")}</p>
            <p><span className="text-amber-300 font-mono">nmap &lt;target&gt;</span> - {t("Simulated port scanner", "Port skanerini ishlatish", "Симуляция сканера портов")}</p>
            <p><span className="text-amber-300 font-mono">ping &lt;host&gt;</span> - {t("Simulate network connection test", "Tarmoq ulanishini tekshirish", "Проверка сетевого соединения")}</p>
            <p><span className="text-amber-300 font-mono">clear</span> - {t("Clear screen", "Ekranni tozalash", "Очистить экран")}</p>
          </div>
        );
        break;

      case "clear":
        setHistory([]);
        setInputVal("");
        return;

      case "ls":
        outputResult = Object.keys(VIRTUAL_FILES).join("   ");
        break;

      case "cat":
        if (!args[0]) {
          outputResult = t("Usage: cat <filename>", "Foydalanish: cat <fayl_nomi>", "Использование: cat <имя_файла>");
          isErr = true;
        } else if (VIRTUAL_FILES[args[0]]) {
          outputResult = VIRTUAL_FILES[args[0]];
        } else {
          outputResult = `cat: ${args[0]}: ${t("No such file or directory", "Fayl topilmadi", "Файл не найден")}`;
          isErr = true;
        }
        break;

      case "grep":
        if (args.length < 2) {
          outputResult = t("Usage: grep <pattern> <filename>", "Foydalanish: grep <matn> <fayl>", "Использование: grep <текст> <файл>");
          isErr = true;
        } else {
          const pattern = args[0];
          const fileName = args[1];
          if (VIRTUAL_FILES[fileName]) {
            const lines = VIRTUAL_FILES[fileName].split("\n");
            const matched = lines.filter(l => l.toLowerCase().includes(pattern.toLowerCase()));
            outputResult = matched.length > 0 ? matched.join("\n") : t("No matches found.", "Mos keluvchi qatorlar topilmadi.", "Совпадений не найдено.");
          } else {
            outputResult = `grep: ${fileName}: ${t("No such file", "Fayl topilmadi", "Файл не найден")}`;
            isErr = true;
          }
        }
        break;

      case "whoami":
        outputResult = "cyber-agent@cdctf-academy";
        break;

      case "pwd":
        outputResult = "/home/cyber-agent/labs";
        break;

      case "nmap":
        outputResult = `Starting Nmap 7.94 ( https://nmap.org )\nNmap scan report for ${args[0] || "localhost"}\nPORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n443/tcp  open  https\n8080/tcp open  http-proxy\n\nNmap done: 1 IP address scanned in 0.42 seconds`;
        break;

      case "ping":
        outputResult = `PING ${args[0] || "127.0.0.1"} 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.041 ms\n64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.038 ms\n--- ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
        break;

      case "echo":
        outputResult = args.join(" ");
        break;

      case "date":
        outputResult = new Date().toUTCString();
        break;

      default:
        outputResult = `${cmd}: ${t("command not found. Type 'help' for command list.", "buyruq topilmadi. 'help' deb yozing.", "команда не найдена. Напишите 'help'.")}`;
        isErr = true;
        break;
    }

    setHistory(prev => [...prev, { command: trimmed, output: outputResult, isError: isErr }]);
    setInputVal("");

    if (onSuccess && cmd === "cat" && args[0] === "flag.txt") {
      onSuccess();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, commandHistory.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const prevIdx = historyIdx - 1;
        setHistoryIdx(prevIdx);
        setInputVal(commandHistory[prevIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal("");
      }
    }
  };

  const handleCopyAll = () => {
    const text = history.map(h => `$ ${h.command}\n${typeof h.output === "string" ? h.output : ""}`).join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#0b0f19] shadow-2xl shadow-emerald-500/5 font-mono text-xs">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121827] border-b border-emerald-500/20 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] ml-2">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>cyber-cli@cdctf:~</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => executeCommand(initialCommand)}
            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Run '{initialCommand}'</span>
          </button>
          <button
            onClick={() => setHistory([])}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={t("Reset Terminal", "Terminalni qayta yuklash", "Сбросить термнал")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyAll}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={t("Copy Terminal Output", "Terminal matnini ko'chirish", "Скопировать вывод")}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        className="p-4 max-h-72 overflow-y-auto space-y-3 cursor-text leading-relaxed select-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((h, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-slate-500">learner@cdctf:~$</span>
              <span className="font-bold text-slate-100">{h.command}</span>
            </div>
            <div className={`whitespace-pre-wrap ${h.isError ? "text-rose-400" : "text-slate-300"}`}>
              {h.output}
            </div>
          </div>
        ))}

        {/* Active Input Line */}
        <div className="flex items-center gap-2 text-emerald-400 pt-1">
          <span className="text-slate-500 shrink-0">learner@cdctf:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none border-none text-slate-100 font-mono text-xs p-0 m-0 focus:ring-0"
            autoFocus
            spellCheck={false}
          />
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Quick Command Suggestions */}
      <div className="px-4 py-2 bg-[#0e1320] border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-400 font-bold inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          {t("Quick Run:", "Tezkor buyruqlar:", "Быстрый запуск:")}
        </span>
        {["ls", "cat readme.txt", "grep secret config.ini", "cat flag.txt", "nmap 192.168.1.1"].map(q => (
          <button
            key={q}
            onClick={() => executeCommand(q)}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700/60 text-slate-300 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
