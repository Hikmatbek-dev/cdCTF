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
    <div className="flex-1 w-full bg-gray-50 dark:bg-black font-mono text-green-700 dark:text-green-500 pt-[64px] flex flex-col h-[100dvh] transition-colors duration-200">
      <div className="p-3 sm:p-4 border-b border-green-300 dark:border-green-900/50 flex items-center gap-3 shrink-0 bg-gray-50/80 dark:bg-black/80 backdrop-blur transition-colors">
        <Terminal className="w-5 h-5 text-green-600 dark:text-green-400" />
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase text-green-700 dark:text-green-400">
            cdCTF_Global_Terminal
          </h1>
          <p className="text-xs text-green-600 dark:text-green-600/80">
            {t("Secure connection established...", "Xavfsiz aloqa o'rnatildi...", "Защищенное соединение установлено...")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative px-2 sm:px-4">
        {/* Messages Area */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-green-400 dark:scrollbar-thumb-green-900 scrollbar-track-gray-100 dark:scrollbar-track-black"
        >
          {messages && messages.length >= limit && (
            <div className="text-center pb-4">
              <button 
                onClick={() => setLimit(l => l + 50)}
                className="text-xs text-green-600/70 hover:text-green-600 flex items-center justify-center w-full gap-1"
              >
                <ChevronUp className="w-4 h-4" />
                {t("Load older logs...", "Eski loglarni yuklash...", "Загрузить старые логи...")}
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-green-600 dark:text-green-600/70 animate-pulse">
              [INIT] Loading secure comms link...
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-500">
              [ERROR] Connection refused. Matrix glitch detected.
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-green-600/70 dark:text-green-600/50">
              [SYSTEM] No prior logs found. Awaiting input.
            </div>
          ) : (
            messages?.map((msg) => {
              const date = new Date(msg.createdAt);
              const timeStr = date.toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              
              const roleColor = msg.user.role === 'admin' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold';
              const promptSymbol = msg.user.role === 'admin' ? '#' : '$';
              
              return (
                <div key={msg.id} className="group relative text-[13px] sm:text-[14px] leading-relaxed break-words hover:bg-green-500/10 px-2 py-1 -mx-2 rounded transition-colors flex items-start">
                  <div className="flex-1 min-w-0">
                    <span className="text-green-600/70 dark:text-green-600/60 select-none mr-2">[{timeStr}]</span>
                    <span className={`${roleColor}`}>{msg.user.nickname}</span>
                    <span className="text-green-600/80 dark:text-green-500/80 select-none mx-1.5 font-normal">@{msg.user.points}pts</span>
                    <span className="text-amber-500 dark:text-amber-400 font-bold select-none mr-2">{promptSymbol}</span>
                    <span className="text-green-950 dark:text-green-100 font-sans">{parseMessageContent(msg.content)}</span>
                  </div>
                  
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        if (confirm(t("Delete this message?", "Bu xabarni o'chirasizmi?", "Удалить это сообщение?"))) {
                          deleteMessage.mutate(msg.id);
                        }
                      }}
                      disabled={deleteMessage.isPending}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-red-500 hover:bg-red-500/20 rounded transition-all ml-2"
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

        {/* Input Area */}
        <div className="p-2 sm:p-4 border-t border-green-300 dark:border-green-900/50 shrink-0 transition-colors">
          {isAuthenticated ? (
            <form onSubmit={handleSend} className="flex gap-2 items-center">
              <span className="text-green-700 dark:text-green-500 font-bold hidden sm:inline select-none">
                {user?.nickname}
                <span className="text-green-500 dark:text-green-700">@</span>cdctf<span className="text-green-500 dark:text-green-700">:~$</span>
              </span>
              <span className="text-green-700 dark:text-green-500 font-bold sm:hidden select-none">
                ~$
              </span>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t("type a command or message...", "xabar yoki buyruq kiriting...", "введите команду или сообщение...")}
                className="flex-1 bg-transparent text-green-900 dark:text-green-400 border-none outline-none focus:ring-0 placeholder:text-green-400 dark:placeholder:text-green-800 font-mono text-[14px]"
                disabled={sendMessage.isPending}
                maxLength={1000}
                autoFocus
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="px-3 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-400 hover:bg-green-300 dark:hover:bg-green-800/60 rounded text-xs uppercase tracking-widest disabled:opacity-50 transition-colors border border-green-300 dark:border-green-800/50"
              >
                {sendMessage.isPending ? "EXEC..." : "EXEC"}
              </button>
            </form>
          ) : (
            <div className="text-sm text-green-700">
              [SYSTEM] {t("Authentication required.", "Tizimga kirish talab etiladi.", "Требуется аутентификация.")}{" "}
              <Link href="/login" className="text-green-600 dark:text-green-400 hover:underline font-bold">
                ./login.sh
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
