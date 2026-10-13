import { useEffect, useRef } from "react";
import { clipboardImages, isEditingText } from "./image-input";

/** Active only on intake screens; never consumes ordinary text paste. */
export function useImagePaste(onImages: (files: File[]) => Promise<unknown>, enabled = true) {
  const latest = useRef(onImages); latest.current = onImages;
  const running = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const paste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || isEditingText(event.target)) return;
      const files = clipboardImages(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      if (running.current) return;
      running.current = true;
      void latest.current(files).finally(() => { running.current = false; });
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [enabled]);
}
