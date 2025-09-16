"use client";
import { useEffect } from "react";

export default function DeviceAdapt() {
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = (dark: boolean) => {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      };

      apply(mq.matches);

      const handleChange = (ev: MediaQueryListEvent) => apply(ev.matches);
      if (mq.addEventListener) mq.addEventListener("change", handleChange);
      else mq.addListener(handleChange);

      const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isMobile) document.documentElement.classList.add("is-mobile");

      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handleChange);
        else mq.removeListener(handleChange);
      };
    } catch (e) {
      // no-op
    }
  }, []);

  return null;
}
