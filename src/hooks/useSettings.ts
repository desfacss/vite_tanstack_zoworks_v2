import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number;
  setFontSize: (size: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 16,
      setFontSize: (size) => {
        set({ fontSize: size });
        document.documentElement.style.fontSize = `${size}px`;
      },
      zoom: 100,
      setZoom: (zoom) => {
        set({ zoom });
        document.body.style.zoom = `${zoom}%`;
      },
    }),
    { name: 'app-settings' }
  )
);