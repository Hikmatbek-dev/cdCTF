import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Terminal } from "lucide-react";
import { Link } from "wouter";

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

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const { t, lang } = useLang();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading, error } = useQuery<ChatMessage[]>({
    queryKey: ["community_messages"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send message");
      }
      return res.json();
    },
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ["community_messages"] });
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(["community_messages"]);
      
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
        queryClient.setQueryData<ChatMessage[]>(["community_messages"], (old) => [...(old || []), optimisticMsg]);
      }
      return { previousMessages };
    },
    onError: (err, newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["community_messages"], context.previousMessages);
      }
      console.error(err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community_messages"] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;
    sendMessage.mutate(newMessage);
    setNewMessage("");
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-green-400 dark:scrollbar-thumb-green-900 scrollbar-track-gray-100 dark:scrollbar-track-black">
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
              
              const roleColor = msg.user.role === 'admin' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-400';
              const promptSymbol = msg.user.role === 'admin' ? '#' : '$';
              
              return (
                <div key={msg.id} className="text-[13px] sm:text-[14px] leading-relaxed break-words hover:bg-green-100 dark:hover:bg-green-950/20 px-1 -mx-1 rounded transition-colors">
                  <span className="text-green-600/80 dark:text-green-700/70 select-none">[{timeStr}]</span>{" "}
                  <span className={`${roleColor} font-bold`}>{msg.user.nickname}</span>
                  <span className="text-green-700 dark:text-green-600 select-none">@{msg.user.points}pts</span>
                  <span className="text-green-600 dark:text-green-500 select-none mr-2">{promptSymbol}</span>
                  <span className="text-green-900 dark:text-green-300">{msg.content}</span>
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
