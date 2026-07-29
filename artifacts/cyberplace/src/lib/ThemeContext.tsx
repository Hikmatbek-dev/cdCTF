import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  /**
   * Light by default.
   *
   * It was dark, and dark is what a CTF site is expected to look like — but the
   * people this platform is for have never used one, and a near-black terminal
   * page is the single loudest signal that they are in the wrong place. Dark
   * mode is still one click away, and anyone who chose it keeps it: the stored
   * preference is read first.
   */
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("cdctf_theme");
    return stored === "dark" || stored === "light" ? stored : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = theme;
    localStorage.setItem("cdctf_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
