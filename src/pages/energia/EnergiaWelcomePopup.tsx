import { useEffect, useState } from "react";
import welcomeKing from "@/assets/energia-welcome-king.png";

const KEY = "ev_welcome_seen";

export default function EnergiaWelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    sessionStorage.setItem(KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at center, rgba(13,10,0,0.85), rgba(0,0,0,0.95))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 16,
        animation: "evWelcomeFade 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes evWelcomeFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes evWelcomeZoom { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
      <div
        style={{
          position: "relative",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          animation: "evWelcomeZoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <img
          src={welcomeKing}
          alt="Bem-vindo à plataforma de premiação da Três Lagoas Solar"
          style={{
            width: "100%",
            height: "auto",
            filter: "drop-shadow(0 20px 60px rgba(245,166,35,0.4))",
            pointerEvents: "none",
          }}
        />
        <p
          style={{
            marginTop: 16,
            color: "#A08060",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Toque em qualquer lugar para continuar
        </p>
      </div>
    </div>
  );
}
