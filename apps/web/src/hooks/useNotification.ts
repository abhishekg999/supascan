import { useCallback } from "react";

type NotificationType = "success" | "error" | "info";

export function useNotification() {
  return useCallback((message: string, type: NotificationType = "info") => {
    const notification = document.createElement("div");

    const baseClass =
      "fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 font-mono text-sm transition-all duration-300 transform translate-x-full";
    const typeClass =
      type === "success"
        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
        : type === "error"
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-blue-100 text-blue-800 border border-blue-200";

    notification.className = `${baseClass} ${typeClass}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.remove("translate-x-full"), 100);
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }, []);
}
