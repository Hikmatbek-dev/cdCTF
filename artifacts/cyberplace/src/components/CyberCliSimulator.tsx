import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Terminal as TerminalIcon, Play, RotateCcw, Copy, Check, Sparkles, HelpCircle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

interface CommandOutput {
  command: string;
  output: string | React.ReactNode;
  isError?: boolean;
}

const VIRTUAL_FILES: Record<string, { content: string; type: "file" | "dir" | "exec" }> = {
  "readme.txt": { content: "Welcome to cdCTF Cyber Security Academy!\nPractice CLI commands to master Linux security & CTF challenges.", type: "file" },
  "flag.txt": { content: "cdctf{cl1_l1nux_m4st3r_2026}", type: "file" },
  "config.ini": { content: "[server]\nport=8080\ndebug=true\nsecret_key=SuperSecretToken123!\ndb_host=10.0.0.15\ndb_user=admin", type: "file" },
  "access.log": { content: "192.168.1.10 - GET /index.html 200\n192.168.1.15 - POST /login 401\n10.0.0.45 - GET /admin 403\n192.168.1.99 - POST /api/v1/auth 200\n172.16.0.4 - GET /flag.txt 200", type: "file" },
  "passwords.txt": { content: "admin:5f4dcc3b5aa765d61d8327deb882cf99\nuser:ee11cbb19052e40b07aac0ca060c23ee\nroot:21232f297a57a5a743894a0e4a801fc3", type: "file" },
  "script.sh": { content: "#!/bin/bash\necho 'Starting automated recon...'\nnmap -sV 10.0.0.1\necho 'Recon complete.'", type: "exec" },
  "notes": { content: "", type: "dir" },
};

const ALL_COMMANDS = [
  "help", "ls", "cat", "grep", "pwd", "whoami", 
  "nmap", "ping", "curl", "base64", "history", 
  "clear", "date", "echo"
];

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
      output: (
        <div className="space-y-1">
          <p className="text-emerald-400 font-bold">
            {t("cdCTF Cyber Security Interactive Terminal v3.0 initialized.", "cdCTF Kiber Xavfsizlik Interaktiv Terminali v3.0 ishga tushdi.", "Интерактивный терминал cdCTF Кибербезопасности v3.0 запущен.")}
          </p>
          <p className="text-slate-400 text-[11px]">
            {t("Press Tab for auto-completion. Type 'help' to see all Linux commands.", "Avto-to'ldirish uchun Tab boshing. Buyruqlar ro'yxati uchun 'help' yozing.", "Нажмите Tab для автодополнения. Напишите 'help' для списка команд.")}
          </p>
        </div>
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

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIdx(-1);

    const parts = trimmed.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let outputResult: string | React.ReactNode = "";
    let isErr = false;

    switch (cmd) {
      case "help":
        outputResult = (
          <div className="space-y-1.5 text-slate-300">
            <p className="text-emerald-400 font-bold border-b border-emerald-500/20 pb-1">
              {t("Available Security & Terminal Commands:", "Mavjud Kiber buyruqlar ro'yxati:", "Доступные команды:")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <p><span className="text-amber-300 font-mono font-bold">ls [-la]</span> - {t("List files & permissions", "Fayllar va huquqlarni ko'rsatish", "Показать файлы")}</p>
              <p><span className="text-amber-300 font-mono font-bold">cat &lt;file&gt;</span> - {t("Display file content", "Fayl ichini o'qish", "Прочитать файл")}</p>
              <p><span className="text-amber-300 font-mono font-bold">grep &lt;text&gt; &lt;file&gt;</span> - {t("Search pattern in file", "Fayl ichidan text qidirish", "Поиск фрагмента")}</p>
              <p><span className="text-amber-300 font-mono font-bold">nmap &lt;target&gt;</span> - {t("Network port scanner", "Port skanerini ishlatish", "Сканер портов")}</p>
              <p><span className="text-amber-300 font-mono font-bold">curl &lt;url&gt;</span> - {t("Inspect HTTP endpoint", "HTTP so'rov yuborish", "HTTP запрос")}</p>
              <p><span className="text-amber-300 font-mono font-bold">base64 [-d] &lt;str&gt;</span> - {t("Encode/Decode Base64", "Base64 dekodlash", "Декодировать Base64")}</p>
              <p><span className="text-amber-300 font-mono font-bold">whoami / pwd</span> - {t("User info & working dir", "Foydalanuvchi va papka", "Инфо пользователя")}</p>
              <p><span className="text-amber-300 font-mono font-bold">history / clear</span> - {t("Manage terminal screen", "Terminalni boshqarish", "Управление экраном")}</p>
            </div>
          </div>
        );
        break;

      case "clear":
        setHistory([]);
        setInputVal("");
        return;

      case "history":
        outputResult = (
          <div className="space-y-0.5 text-slate-300 font-mono">
            {commandHistory.map((ch, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-slate-500 w-6 text-right">{idx + 1}</span>
                <span className="text-emerald-300">{ch}</span>
              </div>
            ))}
          </div>
        );
        break;

      case "ls":
        outputResult = (
          <div className="flex flex-wrap gap-4 font-mono">
            {Object.entries(VIRTUAL_FILES).map(([filename, fileInfo]) => (
              <span
                key={filename}
                className={
                  fileInfo.type === "dir"
                    ? "text-cyan-400 font-bold underline"
                    : fileInfo.type === "exec"
                    ? "text-emerald-400 font-bold"
                    : filename === "flag.txt"
                    ? "text-amber-400 font-bold animate-pulse"
                    : "text-slate-200"
                }
              >
                {fileInfo.type === "dir" ? `${filename}/` : filename}
              </span>
            ))}
          </div>
        );
        break;

      case "cat":
        if (!args[0]) {
          outputResult = t("Usage: cat <filename>", "Foydalanish: cat <fayl_nomi>", "Использование: cat <имя_файла>");
          isErr = true;
        } else if (VIRTUAL_FILES[args[0]]) {
          outputResult = (
            <div className="bg-[#080c14] p-2.5 rounded border border-slate-800 font-mono text-slate-200">
              {VIRTUAL_FILES[args[0]].content}
            </div>
          );
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
            const lines = VIRTUAL_FILES[fileName].content.split("\n");
            const matched = lines.filter(l => l.toLowerCase().includes(pattern.toLowerCase()));
            if (matched.length > 0) {
              outputResult = (
                <div className="space-y-0.5 font-mono">
                  {matched.map((line, li) => (
                    <p key={li} className="text-slate-300">
                      {line.split(new RegExp(`(${pattern})`, "gi")).map((part, pi) =>
                        part.toLowerCase() === pattern.toLowerCase() ? (
                          <span key={pi} className="bg-amber-500/30 text-amber-300 font-bold px-1 rounded">
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  ))}
                </div>
              );
            } else {
              outputResult = t("No matches found.", "Mos keluvchi qatorlar topilmadi.", "Совпадений не найдено.");
            }
          } else {
            outputResult = `grep: ${fileName}: ${t("No such file", "Fayl topilmadi", "Файл не найден")}`;
            isErr = true;
          }
        }
        break;

      case "whoami":
        outputResult = "cyber-agent@cdctf-academy (uid=1000)";
        break;

      case "pwd":
        outputResult = "/home/cyber-agent/labs";
        break;

      case "nmap":
        const target = args[0] || "10.0.0.1";
        outputResult = (
          <div className="font-mono text-slate-300 space-y-1">
            <p className="text-slate-400">Starting Nmap 7.95 ( https://nmap.org ) at {new Date().toLocaleTimeString()}</p>
            <p className="text-emerald-400">Nmap scan report for {target}</p>
            <table className="w-full max-w-md text-left text-xs my-1 border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-1">PORT</th>
                  <th className="py-1">STATE</th>
                  <th className="py-1">SERVICE</th>
                  <th className="py-1">VERSION</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800">
                  <td className="py-0.5 text-amber-300 font-bold">22/tcp</td>
                  <td className="text-emerald-400 font-bold">open</td>
                  <td>ssh</td>
                  <td className="text-slate-400">OpenSSH 8.9p1</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-0.5 text-amber-300 font-bold">80/tcp</td>
                  <td className="text-emerald-400 font-bold">open</td>
                  <td>http</td>
                  <td className="text-slate-400">nginx 1.18.0</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-0.5 text-amber-300 font-bold">443/tcp</td>
                  <td className="text-emerald-400 font-bold">open</td>
                  <td>https</td>
                  <td className="text-slate-400">OpenSSL 3.0.2</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-amber-300 font-bold">8080/tcp</td>
                  <td className="text-emerald-400 font-bold">open</td>
                  <td>http-alt</td>
                  <td className="text-slate-400">Node.js Express</td>
                </tr>
              </tbody>
            </table>
            <p className="text-slate-400 text-[11px]">Nmap done: 1 IP address (1 host up) scanned in 0.38 seconds.</p>
          </div>
        );
        break;

      case "curl":
        const url = args[0] || "http://10.0.0.1/api";
        outputResult = (
          <div className="font-mono text-slate-300 space-y-1">
            <p className="text-cyan-400">HTTP/1.1 200 OK</p>
            <p className="text-slate-500 text-[11px]">Server: nginx/1.18.0 | Content-Type: application/json</p>
            <div className="bg-[#080c14] p-2 rounded border border-slate-800 text-amber-300 text-xs">
              {`{ "status": "success", "message": "Access Granted", "endpoint": "${url}" }`}
            </div>
          </div>
        );
        break;

      case "base64":
        if (args[0] === "-d" && args[1]) {
          try {
            outputResult = atob(args[1]);
          } catch {
            outputResult = "base64: invalid input string";
            isErr = true;
          }
        } else if (args[0]) {
          outputResult = btoa(args.join(" "));
        } else {
          outputResult = "Usage: base64 [-d] <string>";
          isErr = true;
        }
        break;

      case "ping":
        const host = args[0] || "127.0.0.1";
        outputResult = `PING ${host} 56(84) bytes of data.\n64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.035 ms\n64 bytes from ${host}: icmp_seq=2 ttl=64 time=0.038 ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
        break;

      case "echo":
        outputResult = args.join(" ");
        break;

      case "date":
        outputResult = new Date().toUTCString();
        break;

      default:
        outputResult = `${cmd}: ${t("command not found. Type 'help' for available commands.", "buyruq topilmadi. 'help' deb yozing.", "команда не найдена. Напишите 'help'.")}`;
        isErr = true;
        break;
    }

    setHistory(prev => [...prev, { command: trimmed, output: outputResult, isError: isErr }]);
    setInputVal("");

    if (onSuccess && (cmd === "cat" && args[0] === "flag.txt")) {
      onSuccess();
    }
  };

  // Tab auto-completion & Arrow Navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const trimmed = inputVal.trim();
      const parts = trimmed.split(" ");
      
      if (parts.length === 1) {
        // Auto-complete command name
        const match = ALL_COMMANDS.filter(c => c.startsWith(parts[0]));
        if (match.length === 1) {
          setInputVal(`${match[0]} `);
        } else if (match.length > 1) {
          setHistory(prev => [...prev, { command: trimmed, output: match.join("   ") }]);
        }
      } else if (parts.length >= 2) {
        // Auto-complete file name
        const lastArg = parts[parts.length - 1];
        const filenames = Object.keys(VIRTUAL_FILES);
        const match = filenames.filter(f => f.startsWith(lastArg));
        if (match.length === 1) {
          parts[parts.length - 1] = match[0];
          setInputVal(parts.join(" "));
        } else if (match.length > 1) {
          setHistory(prev => [...prev, { command: trimmed, output: match.join("   ") }]);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, commandHistory.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const prevIdx = historyIdx - 1;
        setHistoryIdx(prevIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - prevIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal("");
      }
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setHistory([]);
    }
  };

  const handleCopyAll = () => {
    const text = history.map(h => `$ ${h.command}`).join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#060911] shadow-2xl shadow-emerald-500/10 font-mono text-xs">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1424] border-b border-emerald-500/20 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block cursor-pointer hover:opacity-80" onClick={() => setHistory([])} />
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
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Play className="w-3 h-3" />
            <span>Run '{initialCommand}'</span>
          </button>
          <button
            onClick={() => setHistory([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={t("Reset Terminal (Ctrl+L)", "Terminalni qayta yuklash", "Сбросить термнал")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={t("Copy Commands", "Buyruqlarni ko'chirish", "Скопировать команды")}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Output Stream */}
      <div
        className="p-4 h-80 overflow-y-auto space-y-3 cursor-text leading-relaxed select-text bg-[#060911]"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((h, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-slate-500 font-bold">learner@cdctf:~$</span>
              <span className="font-bold text-slate-100">{h.command}</span>
            </div>
            <div className={`whitespace-pre-wrap ${h.isError ? "text-rose-400 font-bold" : "text-slate-300"}`}>
              {h.output}
            </div>
          </div>
        ))}

        {/* Active Command Input Line */}
        <div className="flex items-center gap-2 text-emerald-400 pt-1">
          <span className="text-slate-500 font-bold shrink-0">learner@cdctf:~$</span>
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

      {/* Interactive Command Suggestion Bar */}
      <div className="px-4 py-2.5 bg-[#0b101d] border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-400 font-bold inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          {t("Quick Suggestions:", "Tezkor buyruqlar:", "Быстрый запуск:")}
        </span>
        {["help", "ls -la", "cat readme.txt", "grep secret config.ini", "nmap 10.0.0.1", "cat flag.txt"].map(q => (
          <button
            key={q}
            onClick={() => executeCommand(q)}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700/60 text-slate-300 font-mono transition-all hover:scale-105"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
