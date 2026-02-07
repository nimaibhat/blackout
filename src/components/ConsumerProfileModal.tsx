"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type SeverityLevel = 2 | 3 | 4;
type HomeType = "Single Family" | "Apartment" | "Townhouse" | "Condo";
type DeviceId =
  | "thermostat"
  | "ev_charger"
  | "battery"
  | "solar"
  | "pool_pump"
  | "smart_plugs"
  | "generator";
type GridRegion = "ERCOT" | "CAISO" | "PJM-NYISO" | "MISO" | "SPP";

export interface ConsumerProfile {
  name: string;
  emoji: string;
  location: string;
  zip: string;
  homeType: HomeType;
  sqft: number;
  gridRegion: GridRegion;
  devices: DeviceId[];
  threat: string;
  severity: SeverityLevel;
  readiness: number;
  status: string;
}

interface ConsumerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (profile: ConsumerProfile) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const PREMADE_PROFILES: ConsumerProfile[] = [
  {
    name: "Martinez Family",
    emoji: "👨‍👩‍👧‍👦",
    location: "Austin, TX",
    zip: "78701",
    homeType: "Single Family",
    sqft: 2400,
    gridRegion: "ERCOT",
    devices: ["thermostat", "ev_charger", "battery", "solar", "pool_pump"],
    threat: "Ice storm — 36hr ETA",
    severity: 3,
    readiness: 94,
    status: "PROTECTED",
  },
  {
    name: "Priya Sharma",
    emoji: "👩‍💻",
    location: "Los Angeles, CA",
    zip: "90012",
    homeType: "Apartment",
    sqft: 950,
    gridRegion: "CAISO",
    devices: ["thermostat", "smart_plugs"],
    threat: "Heat wave — active",
    severity: 4,
    readiness: 72,
    status: "AT RISK",
  },
  {
    name: "James & Linda",
    emoji: "👴👵",
    location: "New York, NY",
    zip: "10001",
    homeType: "Condo",
    sqft: 1200,
    gridRegion: "PJM-NYISO",
    devices: ["thermostat", "battery", "generator"],
    threat: "Winter storm watch",
    severity: 2,
    readiness: 88,
    status: "PREPARED",
  },
];

const DEVICE_EMOJI: Record<DeviceId, string> = {
  thermostat: "🌡️",
  ev_charger: "🚗",
  battery: "🔋",
  solar: "☀️",
  pool_pump: "🏊",
  smart_plugs: "🔌",
  generator: "⚡",
};

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  2: "text-yellow-400/70",
  3: "text-orange-400/70",
  4: "text-red-400/70",
};

/* ------------------------------------------------------------------ */
/*  ProfileRow                                                         */
/* ------------------------------------------------------------------ */
function ProfileRow({
  profile,
  index,
  selected,
  onSelect,
}: {
  profile: ConsumerProfile;
  index: number;
  selected: boolean;
  onSelect: (p: ConsumerProfile) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.06 }}
      onClick={() => onSelect(profile)}
      className={`w-full text-left rounded-lg border px-6 py-5 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] ${
        selected
          ? "border-[#22c55e]/50 bg-[#22c55e]/[0.06] shadow-[0_0_20px_rgba(34,197,94,0.1)]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-[#22c55e]/30 hover:bg-white/[0.04]"
      }`}
    >
      {/* Top: avatar + name + region */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{profile.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-mono font-bold text-white/90">
              {profile.name.toLowerCase()}
            </span>
            <span className="text-[10px] font-mono text-[#22c55e]/50">
              @{profile.zip}
            </span>
          </div>
        </div>
        <span className={`text-[9px] font-mono font-semibold ${SEVERITY_COLORS[profile.severity]}`}>
          SEV {profile.severity}
        </span>
      </div>

      {/* Description line */}
      <p className="text-[11px] font-mono text-white/45 mb-1.5">
        {profile.homeType.toLowerCase()} · {profile.sqft.toLocaleString()} sqft · {profile.location.toLowerCase()} · {profile.threat.toLowerCase()}
      </p>

      {/* Devices row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-white/25">
          {profile.devices.map((d) => DEVICE_EMOJI[d]).join("  ")}
        </span>
        <span className="ml-auto text-[9px] font-mono text-[#22c55e]/40">
          {profile.gridRegion} · readiness {profile.readiness}%
        </span>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  ConsumerProfileModal (default export)                              */
/* ------------------------------------------------------------------ */
export default function ConsumerProfileModal({
  isOpen,
  onClose,
  onSelect,
}: ConsumerProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ConsumerProfile | null>(null);
  const [customZip, setCustomZip] = useState("");

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setCustomZip("");
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modal.addEventListener("keydown", handleTab);
    return () => modal.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  const handleSelect = (profile: ConsumerProfile) => {
    setSelected(profile);
    setCustomZip("");
  };

  const handleConnect = () => {
    if (selected) {
      console.log("Selected profile:", selected);
      onSelect(selected);
      onClose();
    }
  };

  const handleCustomSubmit = () => {
    if (customZip.length < 5) return;
    const profile: ConsumerProfile = {
      name: "Custom Home",
      emoji: "🏠",
      location: `ZIP ${customZip}`,
      zip: customZip,
      homeType: "Single Family",
      sqft: 1500,
      gridRegion: "ERCOT",
      devices: ["thermostat"],
      threat: "Pending analysis",
      severity: 2,
      readiness: 50,
      status: "ANALYZING",
    };
    console.log("Custom profile:", profile);
    onSelect(profile);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Terminal modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl mx-4 max-h-[90vh] flex flex-col bg-[#0c0c0c] border border-white/[0.1] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          >
            {/* Scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,197,94,0.012) 2px, rgba(34,197,94,0.012) 4px)",
              }}
            />

            {/* Terminal header bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[11px] font-mono text-white/30 ml-2">citizen@blackout</span>
              <button
                onClick={onClose}
                className="ml-auto text-white/20 hover:text-white/60 transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto px-7 py-6 space-y-5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
            >
              {/* Prompt heading */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-[15px] font-mono font-bold text-white/90">
                  <span className="text-[#22c55e]">$</span> select household
                </p>
                <p className="text-[12px] font-mono text-white/35 mt-1">
                  connect a profile to personalize your dashboard
                </p>
              </motion.div>

              {/* Custom ZIP input */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div
                  className={`flex items-center gap-2 border rounded-lg px-5 py-3.5 transition-colors ${
                    customZip.length > 0
                      ? "border-[#22c55e]/30 bg-[#22c55e]/[0.03]"
                      : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  <span className="text-[13px] font-mono font-bold text-[#22c55e]/60">{">"}</span>
                  <input
                    type="text"
                    maxLength={5}
                    value={customZip}
                    onChange={(e) => {
                      setCustomZip(e.target.value.replace(/\D/g, ""));
                      if (e.target.value.length > 0) setSelected(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCustomSubmit();
                    }}
                    placeholder="enter zip code"
                    className="flex-1 bg-transparent text-[13px] font-mono text-white/70 placeholder:text-white/20 focus:outline-none"
                  />
                  {customZip.length === 5 && (
                    <span className="text-[10px] font-mono text-[#22c55e]/60">press enter</span>
                  )}
                </div>
              </motion.div>

              {/* Demo profiles label */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[11px] font-mono text-white/30"
              >
                or try a demo profile:
              </motion.p>

              {/* Profile rows */}
              <div className="space-y-3">
                {PREMADE_PROFILES.map((profile, i) => (
                  <ProfileRow
                    key={profile.name}
                    profile={profile}
                    index={i}
                    selected={selected?.name === profile.name}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>

            {/* Bottom connect bar */}
            <div className="flex-shrink-0 border-t border-white/[0.06] px-7 py-5">
              <button
                onClick={handleConnect}
                disabled={!selected}
                className={`w-full font-mono text-[13px] tracking-widest uppercase rounded-lg py-3.5 transition-all duration-300 cursor-pointer ${
                  selected
                    ? "border border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/[0.06] hover:bg-[#22c55e]/[0.14] hover:border-[#22c55e]/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                    : "border border-white/[0.06] text-white/15 bg-white/[0.02] cursor-not-allowed"
                }`}
              >
                connect
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
