import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, User } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Send, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Poll for new messages every 3 seconds
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
      // Optimistic update
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
      // Could show a toast here
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col pt-24 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          {t("Community Chat", "Umumiy Chat", "Общий чат")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t(
            "Connect with other users, ask questions, and share your knowledge.",
            "Boshqa foydalanuvchilar bilan bog'laning, savollar bering va tajribangizni ulashing.",
            "Общайтесь с другими пользователями, задавайте вопросы и делитесь знаниями."
          )}
        </p>
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-[600px] shadow-sm">
        {/* Messages Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-background/50 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
              <p>{t("Failed to load messages.", "Xabarlarni yuklashda xatolik yuz berdi.", "Не удалось загрузить сообщения.")}</p>
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p>{t("No messages yet. Be the first to say hi!", "Hali xabarlar yo'q. Birinchi bo'lib yozing!", "Пока нет сообщений. Напишите первым!")}</p>
            </div>
          ) : (
            messages?.map((msg, idx) => {
              const isMe = user?.id === msg.userId;
              const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;
              
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-3`}>
                  {!isMe && showAvatar && (
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-1">
                      {msg.user.nickname[0].toUpperCase()}
                    </div>
                  )}
                  {!isMe && !showAvatar && <div className="w-8 shrink-0" />}
                  
                  <div className={`max-w-[80%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-semibold text-foreground/80">
                          {msg.user.nickname}
                        </span>
                        {msg.user.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive font-bold uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                      </div>
                    )}
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border">
          {isAuthenticated ? (
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t("Write a message...", "Xabar yozing...", "Напишите сообщение...")}
                className="flex-1 h-12 px-4 rounded-xl border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
                disabled={sendMessage.isPending}
                maxLength={1000}
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="h-12 w-12 rounded-xl shrink-0 p-0"
              >
                {sendMessage.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          ) : (
            <div className="h-12 flex items-center justify-center bg-muted/50 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              {t("You must be logged in to chat.", "Chatda yozish uchun tizimga kiring.", "Вы должны войти, чтобы писать в чат.")}{" "}
              <Link href="/login" className="text-primary hover:underline ml-1 font-medium">
                {t("Log in", "Kirish", "Войти")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
