import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const DEFAULT_THEME = {
  mode: "light",
  primary: "#0d6efd",
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  const hexToRGB = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };

  // Apply theme to DOM
  useEffect(() => {
    if (theme.mode === "dark") {
      document.documentElement.setAttribute("data-bs-theme", "dark");
      document.body.classList.add("bg-dark", "text-white");
    } else {
      document.documentElement.removeAttribute("data-bs-theme");
      document.body.classList.remove("bg-dark", "text-white");
    }

    document.documentElement.style.setProperty("--bs-primary", theme.primary);
    document.documentElement.style.setProperty(
      "--bs-primary-rgb",
      hexToRGB(theme.primary),
    );
  }, [theme]);

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shopTheme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThemeState(parsed);
      } catch (err) {
        console.error("Invalid theme in localStorage", err);
        localStorage.removeItem("shopTheme");
      }
    }
    setLoading(false);
  }, []);

  // Save theme to localStorage
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("shopTheme", JSON.stringify(newTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {!loading && children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
