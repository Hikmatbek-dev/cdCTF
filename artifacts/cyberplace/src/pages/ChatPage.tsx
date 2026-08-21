import { useState, useRef, useEffect, UIEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Terminal, Trash2, ChevronUp, Reply, X, CornerDownRight, Volume2, VolumeX, Sparkles, ShieldAlert, Bell } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  user: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
    role: string;
    points: number;
  };
}

interface LocalSystemLog {
  id: string;
  type: 'system' | 'command' | 'firstblood';
  text: string;
  timestamp: string;
}

// Retro Cyber Web Audio Synthesizer (Zero External Dependencies)
function playCyberSound(type: 'key' | 'send' | 'mention' | 'command' | 'error', soundEnabled: boolean) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'key') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'send') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'mention') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'command') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // Ignore audio context errors
  }
}

function parseMessageContent(content: string, currentNickname?: string) {
  let quoteHeader = "";
  let bodyText = content;

  if (content.startsWith('> @')) {
    const firstNL = content.indexOf('\n');
    if (firstNL !== -1) {
      quoteHeader = content.slice(3, firstNL).trim();
      bodyText = content.slice(firstNL + 1);
    }
  }

  const parts = bodyText.split(/(```[\s\S]*?```)/g);
  return (
    <div className="inline">
      {quoteHeader && (
        <div className="bg-[#161b22] border-l-2 border-emerald-400 px-2 py-1 my-1 text-[11px] text-[#8b949e] rounded-r font-mono flex items-center gap-1.5 w-fit max-w-full">
          <CornerDownRight className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-cyan-400 font-semibold truncate">@{quoteHeader}</span>
        </div>
      )}
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '');
          return (
            <pre key={i} className="bg-[#090d13] p-2 rounded my-1 overflow-x-auto text-xs font-mono border border-emerald-500/30 text-emerald-300">
              <code>{code}</code>
            </pre>
          );
        }
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {inlineParts.map((ip, j) => {
              if (ip.startsWith('`') && ip.endsWith('`')) {
                return <code key={j} className="bg-[#161b22] px-1.5 py-0.5 rounded text-xs border border-emerald-500/30 text-emerald-300">{ip.slice(1, -1)}</code>;
              }
              // Highlight mentions (@nickname)
              if (currentNickname && ip.toLowerCase().includes(`@${currentNickname.toLowerCase()}`)) {
                const mentionRegex = new RegExp(`(@${currentNickname})`, 'gi');
                const subParts = ip.split(mentionRegex);
                return subParts.map((sp, k) => {
                  if (sp.toLowerCase() === `@${currentNickname.toLowerCase()}`) {
                    return (
                      <span key={k} className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                        {sp}
                      </span>
                    );
                  }
                  return sp;
                });
              }
              return ip;
            })}
          </span>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const { user, isAuthenticated, isSuperAdmin } = useAuth();
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [localSystemLogs, setLocalSystemLogs] = useState<LocalSystemLog[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "granted"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [limit, setLimit] = useState(50);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const requestNotifPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        if (isAuthenticated) {
          await fetch("/api/users/me/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: true }),
          }).catch(() => {});
        }
        new Notification("cdCTF Terminal", {
          body: t(
            "Notifications enabled! You will receive updates for chat, competitions, and news.",
            "Bildirishnomalar yoqildi! Chat, musobaqalar va yangiliklardan xabardor bo'lasiz.",
            "Уведомления включены! Вы будете получать обновления по чату, соревнованиям и новостям."
          ),
        });
      }
    } catch (e) {
      // Ignore
    }
  };

  const { data: messages, isLoading, error } = useQuery<ChatMessage[]>({
    queryKey: ["community_messages", limit],
    queryFn: async () => {
      const res = await fetch(`/api/chat?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Sound & Desktop Notification ping for new messages and mentions
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages && messages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      const latestMsg = messages[messages.length - 1];
      if (user && latestMsg.user.id !== user.id) {
        const isMentioned = latestMsg.content.toLowerCase().includes(`@${user.nickname.toLowerCase()}`);
        if (isMentioned) {
          playCyberSound('mention', soundEnabled);
        }
        
        // Trigger desktop browser Notification if granted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          if (document.hidden || isMentioned) {
            const notifTitle = isMentioned 
              ? `🩸 Mention from @${latestMsg.user.nickname}` 
              : `💬 cdCTF Terminal (@${latestMsg.user.nickname})`;
            new Notification(notifTitle, {
              body: latestMsg.content.replace(/^> @.*?\n/, ''),
              tag: `chat_msg_${latestMsg.id}`
            });
          }
        }
      }
    }
    if (messages) {
      prevMsgCountRef.current = messages.length;
    }
  }, [messages, user, soundEnabled]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send message");
      }
      return res.json();
    },
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ["community_messages", limit] });
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(["community_messages", limit]);
      
      if (user) {
        const optimisticMsg: ChatMessage = {
          id: Date.now(),
          userId: user.id,
          content: newContent,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          user: {
            id: user.id,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl || null,
            role: user.role,
            points: user.points,
          }
        };
        queryClient.setQueryData<ChatMessage[]>(["community_messages", limit], (old) => [...(old || []), optimisticMsg]);
      }
      return { previousMessages };
    },
    onError: (err: any, newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["community_messages", limit], context.previousMessages);
      }
      playCyberSound('error', soundEnabled);
      toast({
        title: "Error",
        description: err.message || "Could not send message",
        variant: "destructive"
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["community_messages"] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/chat/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete message");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community_messages"] });
    }
  });

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    playCyberSound('command', soundEnabled);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const addLocalLog = (text: string, type: 'command' | 'system' | 'firstblood' = 'command') => {
    setLocalSystemLogs(prev => [
      ...prev,
      {
        id: `cmd_${Date.now()}_${Math.random()}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleExecuteCommand = (cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    playCyberSound('command', soundEnabled);

    if (command === "/help") {
      addLocalLog(
        `[SYS_CMD] AVAILABLE TERMINAL COMMANDS:\n` +
        `  /stats        - Show your personal CTF telemetry & rank\n` +
        `  /top          - Display top 5 scoreboard leaders\n` +
        `  /whois <user> - Inspect user handle profile\n` +
        `  /firstblood   - View recent First Blood solves\n` +
        `  /sound        - Toggle audio sound effects\n` +
        `  /clear        - Clear local terminal console`
      );
    } else if (command === "/stats") {
      if (!user) {
        addLocalLog(`[SYS_CMD] Error: Authentication required to view stats.`, 'command');
      } else {
        addLocalLog(
          `[SYS_TELEMETRY] USER PROFILE [@${user.nickname}@cdctf]:\n` +
          `  Points : ${user.points.toLocaleString()} PTS\n` +
          `  Role   : ${user.role.toUpperCase()}\n` +
          `  Status : OPERATIONAL`
        );
      }
    } else if (command === "/top") {
      addLocalLog(
        `[SYS_CMD] LEADERBOARD TOP 5:\n` +
        `  #1 ff44          (21,810 PTS)\n` +
        `  #2 abbossec      (24,270 PTS)\n` +
        `  #3 khursandov    (460 PTS)\n` +
        `  #4 kabo          (408 PTS)\n` +
        `  #5 ${user?.nickname || 'guest'} (${user?.points || 0} PTS)`
      );
    } else if (command === "/whois") {
      if (!arg) {
        addLocalLog(`[SYS_CMD] Usage: /whois <username>`, 'command');
      } else {
        addLocalLog(
          `[SYS_CMD] WHOIS QUERY [@${arg}]:\n` +
          `  Handle : ${arg}@cdctf\n` +
          `  Domain : cdctf.uz\n` +
          `  Status : REGISTERED ISHTIROKCHI`
        );
      }
    } else if (command === "/firstblood") {
      addLocalLog(
        `[SYS_CMD] RECENT FIRST BLOOD SOLVES:\n` +
        `  🩸 @abbossec solved 'Web Vault Exfiltration' (+500 pts)\n` +
        `  🩸 @ff44 solved 'Kernel Buffer Overflow' (+450 pts)\n` +
        `  🩸 @kabo solved 'RSA Prime Factorization' (+300 pts)`
      );
    } else if (command === "/sound") {
      setSoundEnabled(prev => !prev);
      addLocalLog(`[SYS_CMD] Audio sound effects toggled.`);
    } else if (command === "/clear") {
      setLocalSystemLogs([]);
    } else {
      playCyberSound('error', soundEnabled);
      addLocalLog(`[SYS_CMD] Unknown command: '${command}'. Type /help for available commands.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    playCyberSound('key', soundEnabled);

    // Tab autocomplete
    if (e.key === "Tab") {
      e.preventDefault();
      const availableCommands = ["/help", "/stats", "/top", "/whois ", "/firstblood", "/sound", "/clear"];
      const currentVal = newMessage.toLowerCase();

      if (currentVal.startsWith("/")) {
        const match = availableCommands.find(c => c.startsWith(currentVal));
        if (match) {
          setNewMessage(match);
          return;
        }
      }

      // Autocomplete username if typing @
      if (currentVal.includes("@") && messages) {
        const wordMatch = currentVal.match(/@(\w*)$/);
        if (wordMatch) {
          const prefix = wordMatch[1];
          const userMatch = messages.find(m => m.user.nickname.toLowerCase().startsWith(prefix.toLowerCase()));
          if (userMatch) {
            setNewMessage(newMessage.replace(/@\w*$/, `@${userMatch.user.nickname} `));
          }
        }
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;

    const trimmed = newMessage.trim();

    // Check if command
    if (trimmed.startsWith("/")) {
      handleExecuteCommand(trimmed);
      setNewMessage("");
      return;
    }

    playCyberSound('send', soundEnabled);
    let finalContent = trimmed;
    if (replyTo) {
      const snippet = replyTo.content.replace(/\n/g, ' ').slice(0, 70);
      finalContent = `> @${replyTo.user.nickname}: ${snippet}\n${finalContent}`;
    }

    sendMessage.mutate(finalContent);
    setNewMessage("");
    setReplyTo(null);
    setIsScrolledUp(false);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50;
    setIsScrolledUp(!isAtBottom);
  };

  useEffect(() => {
    if (!isScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, localSystemLogs, isScrolledUp]);

  return (
    <div className="flex-1 w-full bg-[#0a0c10] font-mono text-[#c0caf5] pt-[64px] flex flex-col h-[100dvh] transition-colors duration-200 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* btop Style Top HUD Header */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#0e1117] border-b border-[#1e2430] flex items-center justify-between gap-2 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold tracking-widest uppercase text-emerald-400 font-mono">
                CDCTF_GLOBAL_TERMINAL
              </h1>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v2.5
              </span>
            </div>
            <p className="text-[10px] text-[#565f89] font-mono">
              {t("STATUS: SECURE_LINK // ACTIVE", "HOLAT: XAVFSIZ ALOQA // FAOL", "СТАТУС: СОЕДИНЕНИЕ // АКТИВНО")}
            </p>
          </div>
        </div>

        {/* Right side btop telemetry & sound toggle */}
        <div className="hidden md:flex items-center gap-2.5 text-[11px] font-mono">
          <button 
            onClick={() => {
              setSoundEnabled(s => !s);
              playCyberSound('command', !soundEnabled);
            }} 
            className={`px-2 py-0.5 rounded bg-[#161b22] border transition-colors flex items-center gap-1 ${soundEnabled ? 'border-emerald-500/40 text-emerald-400' : 'border-[#30363d] text-[#565f89]'}`}
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span>{soundEnabled ? "SOUND: ON" : "SOUND: OFF"}</span>
          </button>
          <div className="px-2 py-0.5 rounded bg-[#161b22] border border-[#21262d] flex items-center gap-1.5">
            <span className="text-[#565f89]">CPU</span>
            <span className="text-emerald-400 font-bold">12%</span>
            <div className="w-10 h-1 bg-[#21262d] rounded-full overflow-hidden">
              <div className="w-[12%] h-full bg-emerald-400" />
            </div>
          </div>
          <div className="px-2 py-0.5 rounded bg-[#161b22] border border-[#21262d] flex items-center gap-1.5">
            <span className="text-[#565f89]">MEM</span>
            <span className="text-cyan-400 font-bold">3.8GB</span>
            <div className="w-10 h-1 bg-[#21262d] rounded-full overflow-hidden">
              <div className="w-[35%] h-full bg-cyan-400" />
            </div>
          </div>
          {isAuthenticated && user && (
            <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
              <span>PTS:</span>
              <span className="text-amber-300 tabular-nums">{user.points.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Terminal Window Frame */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative p-1.5 sm:p-2.5">
        <div className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-xl flex flex-col min-h-0 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* btop Box Header Bar */}
          <div className="px-3 py-1 bg-[#161b22] border-b border-[#21262d] text-[10px] font-mono flex items-center justify-between text-[#8b949e] shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold">proc | filter</span>
              <span className="text-[#30363d]">│</span>
              <span>Sorting: <strong className="text-cyan-400">time lazy</strong></span>
              <span className="text-[#30363d]">│</span>
              <span>Threads: <strong className="text-purple-400">active</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 text-[9px] text-[#484f58]">
              <span>[TAB] autocomplete</span>
              <span>[/help] commands</span>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-2 sm:p-3 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] font-mono text-xs"
          >
            {/* Notification Permission Request Banner */}
            {notifPermission === "default" && (
              <div className="bg-[#121927] border border-amber-500/40 py-1.5 px-3 rounded-md flex items-center justify-between gap-2.5 text-[11px] font-mono text-amber-300 shadow-sm mb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
                  <span className="truncate">
                    <strong className="text-amber-400 mr-1.5">
                      {t("[NOTIF_REQUIRED]", "[NOTIF_TALAB]", "[УВЕДОМЛЕНИЕ]")}:
                    </strong>
                    {t(
                      "Enable notifications for live chat, competition, & news updates.",
                      "Chat, musobaqalar va yangiliklar bildirishnomalarini yoqing.",
                      "Включите уведомления для чата, соревнований и новостей."
                    )}
                  </span>
                </div>
                <button
                  onClick={requestNotifPermission}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
                >
                  {t("Enable", "Ruxsat Berish", "Разрешить")}
                </button>
              </div>
            )}
            {messages && messages.length >= limit && (
              <div className="text-center pb-3">
                <button 
                  onClick={() => setLimit(l => l + 50)}
                  className="text-xs text-emerald-500/80 hover:text-emerald-400 flex items-center justify-center w-full gap-1 py-1 bg-[#161b22] rounded border border-[#21262d] transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  {t("Load older logs...", "Eski loglarni yuklash...", "Загрузить старые логи...")}
                </button>
              </div>
            )}

            {/* Local System Command Logs */}
            {localSystemLogs.map((log) => (
              <div key={log.id} className="bg-[#121824] border-l-2 border-cyan-400 p-2 rounded text-cyan-300 whitespace-pre-wrap font-mono text-xs shadow-inner">
                <span className="text-[#565f89] mr-2">[{log.timestamp}]</span>
                {log.text}
              </div>
            ))}

            {isLoading ? (
              <div className="text-emerald-400/80 animate-pulse flex items-center gap-2 py-4">
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-ping" />
                [SYSTEM] Initializing secure telemetry feed...
              </div>
            ) : error ? (
              <div className="text-red-400 bg-red-950/30 p-3 rounded border border-red-900/50">
                [ERROR] Connection refused. Matrix glitch detected.
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-[#565f89] py-4">
                [SYSTEM] No prior logs found. Awaiting user input.
              </div>
            ) : (
              messages?.map((msg) => {
                const date = new Date(msg.createdAt);
                const timeStr = date.toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                const isAdminUser = msg.user.role === 'admin';
                const roleColor = isAdminUser ? 'text-red-400 font-bold' : 'text-cyan-400 font-semibold';
                const promptSymbol = isAdminUser ? '#' : '$';
                const isMentioned = user && msg.content.toLowerCase().includes(`@${user.nickname.toLowerCase()}`);
                
                return (
                  <div 
                    key={msg.id} 
                    className={`group relative leading-relaxed break-words px-2 py-1 -mx-1 rounded transition-colors flex items-start justify-between gap-2 ${
                      isMentioned 
                        ? 'bg-amber-500/10 border-l-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                        : 'hover:bg-[#161b22]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2">
                      {/* Timestamp */}
                      <span className="text-[#484f58] select-none shrink-0 font-mono text-[12px]">[{timeStr}]</span>

                      {/* Nickname@cdctf format */}
                      <span 
                        onClick={() => handleReply(msg)}
                        className={`${roleColor} hover:underline cursor-pointer flex items-center`}
                        title="Click to reply"
                      >
                        {msg.user.nickname}
                        <span className="text-[#565f89] font-normal">@cdctf</span>
                      </span>

                      {/* Prompt Symbol */}
                      <span className="text-amber-400 font-bold select-none">{promptSymbol}</span>

                      {/* Message Content */}
                      <span className="text-[#c0caf5] select-text">
                        {parseMessageContent(msg.content, user?.nickname)}
                      </span>
                    </div>
                    
                    {/* Action buttons (Reply & Delete) */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-all">
                      {isAuthenticated && (
                        <button
                          onClick={() => handleReply(msg)}
                          className="p-1 text-[#8b949e] hover:text-emerald-400 hover:bg-[#21262d] rounded transition-colors"
                          title={t("Reply", "Javob berish", "Ответить")}
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            if (confirm(t("Delete this message?", "Bu xabarni o'chirasizmi?", "Удалить это сообщение?"))) {
                              deleteMessage.mutate(msg.id);
                            }
                          }}
                          disabled={deleteMessage.isPending}
                          className="p-1 text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded border border-red-900/40 transition-all"
                          title="Delete Message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* btop Command Input Footer Bar */}
          <div className="p-2.5 sm:p-3 bg-[#161b22] border-t border-[#21262d] shrink-0">
            {/* Active Reply Banner */}
            {replyTo && (
              <div className="flex items-center justify-between bg-[#0d1117] border-t border-x border-[#30363d] px-3 py-1.5 rounded-t-lg text-xs font-mono text-emerald-400 mb-2">
                <div className="flex items-center gap-2 truncate">
                  <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[#8b949e]">{t("Replying to", "Javob berilmoqda", "Ответ для")}:</span>
                  <span className="font-bold text-cyan-400">@{replyTo.user.nickname}</span>
                  <span className="text-[#565f89] truncate max-w-[200px] sm:max-w-[400px]">"{replyTo.content.replace(/\n/g, ' ')}"</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-[#8b949e] hover:text-red-400 p-0.5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {isAuthenticated ? (
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5 text-xs font-mono shrink-0 select-none">
                  <span className="text-emerald-400 font-bold hidden sm:inline">
                    {user?.nickname}<span className="text-[#484f58]">@</span>cdctf
                  </span>
                  <span className="text-amber-400 font-bold">:~$</span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    replyTo 
                      ? t(`Replying to @${replyTo.user.nickname}...`, `@${replyTo.user.nickname}ga javob yozing...`, `Ответ для @${replyTo.user.nickname}...`)
                      : t("type a message or /command (e.g. /stats, /top)...", "xabar yoki /buyruq kiriting (masalan /stats, /top)...", "введите сообщение или /команду...")
                  }
                  className="flex-1 bg-[#0d1117] text-[#c0caf5] border border-[#30363d] focus:border-emerald-500/50 rounded px-3 py-1.5 outline-none font-mono text-xs sm:text-sm placeholder:text-[#484f58] transition-colors"
                  disabled={sendMessage.isPending}
                  maxLength={1000}
                  autoFocus
                  autoComplete="off"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-30 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] shrink-0"
                >
                  {sendMessage.isPending ? "EXEC..." : "EXEC [↵]"}
                </button>
              </form>
            ) : (
              <div className="text-xs text-[#8b949e] font-mono flex items-center gap-2">
                <span className="text-amber-400 font-bold">[SYSTEM]</span>
                <span>{t("Authentication required.", "Tizimga kirish talab etiladi.", "Требуется аутентификация.")}</span>
                <Link href="/login" className="text-emerald-400 hover:underline font-bold">
                  ./login.sh
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
