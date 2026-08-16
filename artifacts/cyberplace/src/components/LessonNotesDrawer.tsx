import { useState, useEffect } from "react";
import { FileText, Save, Check, Bookmark, X, StickyNote } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { getLessonNote, saveLessonNote, isLessonBookmarked, toggleBookmarkLesson } from "@/lib/learn-storage";

interface Props {
  lessonId: number;
  lessonTitle: string;
}

export function LessonNotesDrawer({ lessonId, lessonTitle }: Props) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saved, setSaved] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setNoteText(getLessonNote(lessonId));
    setBookmarked(isLessonBookmarked(lessonId));
  }, [lessonId]);

  const handleSave = () => {
    saveLessonNote(lessonId, noteText);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleBookmarkToggle = () => {
    const newState = toggleBookmarkLesson(lessonId);
    setBookmarked(newState);
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5">
        <button
          onClick={handleBookmarkToggle}
          className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center transition-all ${
            bookmarked
              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 scale-105"
              : "bg-card/90 text-foreground border-border hover:border-amber-500/50 hover:text-amber-400"
          }`}
          title={bookmarked ? t("Bookmarked", "Saqlangan", "В закладках") : t("Bookmark Lesson", "Darsni saqlash", "В закладки")}
        >
          <Bookmark className={`w-5 h-5 ${bookmarked ? "fill-current" : ""}`} />
        </button>

        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground border border-primary/40 shadow-xl shadow-primary/20 flex items-center justify-center hover:scale-105 transition-all relative group"
          title={t("My Lesson Notes", "Shaxsiy qaydlar", "Мои заметки")}
        >
          <StickyNote className="w-5 h-5" />
          {noteText.trim().length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-background rounded-full" />
          )}
        </button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base line-clamp-1">{lessonTitle}</h3>
                    <p className="text-xs text-muted-foreground">{t("Personal Study Notes", "Shaxsiy Konspekt", "Личные заметки")}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                  {t("Write your summary, key commands or flags:", "Qisqacha konspekt, kalit buyruqlar yoki flaglar:", "Заметки, ключевые команды или флаги:")}
                </label>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder={t("e.g. grep -rnw '/path' -e 'pattern' command helps find recursive matches...", "masalan: chmod 755 fayllar uchun rwx huquqini beradi...", "например: chmod 755 дает права rwx...")}
                  className="w-full h-72 p-4 text-sm font-mono bg-muted/40 border border-border rounded-2xl focus:outline-none focus:border-primary/50 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={handleBookmarkToggle}
                className={`flex-1 h-11 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  bookmarked
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current text-amber-400" : ""}`} />
                {bookmarked ? t("Saved in Bookmarks", "Saqlangan", "В закладках") : t("Bookmark Lesson", "Saqlash", "В закладки")}
              </button>

              <button
                onClick={handleSave}
                className="cyber-button h-11 px-6 text-xs font-bold gap-2"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                {saved ? t("Saved!", "Saqlandi!", "Сохранено!") : t("Save Note", "Saqlash", "Сохранить")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
