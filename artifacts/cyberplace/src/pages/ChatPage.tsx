import { useState, useRef, useEffect, UIEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Terminal, Trash2, ChevronUp } from "lucide-react";
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

function parseMessageContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, '');
      return (
        <pre key={i} className="bg-black/20 dark:bg-white/10 p-2 rounded my-1 overflow-x-auto text-xs font-mono border border-green-500/30">
          <code>{code}</code>
        </pre>
      );
    }
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith('`') && ip.endsWith('`')) {
            return <code key={j} className="bg-black/20 dark:bg-white/10 px-1 rounded text-xs border border-green-500/30">{ip.slice(1, -1)}</code>;
          }
          return ip;
        })}
      </span>
    );
  });
}

export default function ChatPage() {
  const { user, isAuthenticated, isSuperAdmin } = useAuth();
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [limit, setLimit] = useState(50);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const { data: messages, isLoading, error } = useQuery<ChatMessage[]>({
    queryKey: ["community_messages", limit],
    queryFn: async () => {
      const res = await fetch(`/api/chat?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000,
  });

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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;
    sendMessage.mutate(newMessage);
    setNewMessage("");
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
  }, [messages, isScrolledUp]);

  return (
    <div className="flex-1 w-full bg-[#0a0c10] font-mono text-[#c0caf5] pt-[64px] flex flex-col h-[100dvh] transition-colors duration-200 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* btop Style Top HUD Header */}
      <div className="px-3 sm:px-6 py-2.5 bg-[#0e1117] border-b border-[#1e2430] flex items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-emerald-400 font-mono">
                CDCTF_GLOBAL_TERMINAL
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-[#565f89] font-mono">
              {t("STATUS: SECURE_LINK // ACTIVE", "HOLAT: XAVFSIZ ALOQA // FAOL", "СТАТУС: СОЕДИНЕНИЕ // АКТИВНО")}
            </p>
          </div>
        </div>

        {/* Right side btop telemetry gauges */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-[#161b22] border border-[#21262d] flex items-center gap-2">
            <span className="text-[#565f89]">CPU</span>
            <span className="text-emerald-400 font-bold">12%</span>
            <div className="w-12 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
              <div className="w-[12%] h-full bg-emerald-400" />
            </div>
          </div>
          <div className="px-2.5 py-1 rounded bg-[#161b22] border border-[#21262d] flex items-center gap-2">
            <span className="text-[#565f89]">MEM</span>
            <span className="text-cyan-400 font-bold">3.8GB</span>
            <div className="w-12 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
              <div className="w-[35%] h-full bg-cyan-400" />
            </div>
          </div>
          {isAuthenticated && user && (
            <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1.5">
              <span>PTS:</span>
              <span className="text-amber-300 tabular-nums">{user.points.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Terminal Window Frame */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative p-2 sm:p-4">
        <div className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-xl flex flex-col min-h-0 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* btop Box Header Bar */}
          <div className="px-3 py-1.5 bg-[#161b22] border-b border-[#21262d] text-[11px] font-mono flex items-center justify-between text-[#8b949e] shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">proc | filter</span>
              <span className="text-[#30363d]">│</span>
              <span>Sorting: <strong className="text-cyan-400">time lazy</strong></span>
              <span className="text-[#30363d]">│</span>
              <span>Threads: <strong className="text-purple-400">active</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#484f58]">
              <span>[ESC] menu</span>
              <span>[↑/↓] scroll</span>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] font-mono text-xs sm:text-sm"
          >
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
                
                return (
                  <div 
                    key={msg.id} 
                    className="group relative leading-relaxed break-words hover:bg-[#161b22] px-2 py-1 -mx-1 rounded transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2">
                      {/* Timestamp */}
                      <span className="text-[#484f58] select-none shrink-0 font-mono text-[12px]">[{timeStr}]</span>

                      {/* Nickname */}
                      <span className={`${roleColor} hover:underline cursor-pointer`}>{msg.user.nickname}</span>

                      {/* Points badge */}
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d] select-none font-mono">
                        @{msg.user.points}pts
                      </span>

                      {/* Prompt Symbol */}
                      <span className="text-amber-400 font-bold select-none">{promptSymbol}</span>

                      {/* Message Content */}
                      <span className="text-[#c0caf5] select-text">{parseMessageContent(msg.content)}</span>
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (confirm(t("Delete this message?", "Bu xabarni o'chirasizmi?", "Удалить это сообщение?"))) {
                            deleteMessage.mutate(msg.id);
                          }
                        }}
                        disabled={deleteMessage.isPending}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-red-400 hover:bg-red-950/40 rounded border border-red-900/40 transition-all"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* btop Command Input Footer Bar */}
          <div className="p-2.5 sm:p-3 bg-[#161b22] border-t border-[#21262d] shrink-0">
            {isAuthenticated ? (
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5 text-xs font-mono shrink-0 select-none">
                  <span className="text-emerald-400 font-bold hidden sm:inline">
                    {user?.nickname}<span className="text-[#484f58]">@</span>cdctf
                  </span>
                  <span className="text-amber-400 font-bold">:~$</span>
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("type a command or message...", "xabar yoki buyruq kiriting...", "введите команду или сообщение...")}
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
