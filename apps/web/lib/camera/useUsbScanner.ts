'use client';
// Lector USB tipo teclado (HID keyboard-wedge): estos dispositivos "escriben"
// el código leído como si fuera un teclado físico, muy rápido, y terminan
// con Enter. Se distingue de tecleo humano por la velocidad entre teclas.
import { useEffect, useRef } from 'react';

const MAX_INTER_KEY_MS = 40;
const MIN_CODE_LENGTH = 3;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useUsbScanner(enabled: boolean, onCode: (code: string) => void) {
  const bufferRef = useRef('');
  const lastKeyAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const now = Date.now();
      const gap = now - lastKeyAtRef.current;
      lastKeyAtRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code.length >= MIN_CODE_LENGTH) onCode(code);
        return;
      }

      if (e.key.length !== 1) return; // ignora Shift, Tab, flechas, etc.

      // Si la tecla llegó lenta (tecleo humano), se asume que empieza un
      // código nuevo en vez de acumularse al anterior.
      bufferRef.current = gap > MAX_INTER_KEY_MS ? e.key : bufferRef.current + e.key;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onCode]);
}
