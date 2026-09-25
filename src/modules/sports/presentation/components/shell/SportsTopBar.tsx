"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Gift,
  Globe,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings as SettingsIcon,
  Shield,
  Users,
} from "lucide-react-sports";
import { OMENX_BASE, omenxUrl } from "../../../infrastructure/omenx-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

// The language choice is local only; nothing reads it (dev reference E-20).
const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Español" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "Deutsch" },
  { code: "PT", label: "Português" },
  { code: "JA", label: "日本語" },
];

const NAV = [
  { label: "Events", href: omenxUrl.events() },
  { label: "Portfolio", href: omenxUrl.portfolio() },
  { label: "Leaderboard", href: `${OMENX_BASE}/leaderboard` },
  { label: "Insights", href: `${OMENX_BASE}/insights` },
];

/** Sticky top bar: logo and sub-brand, links to the main site, equity and the user menu (dev reference §5.1). */
export function SportsTopBar({ userName, userAvatar, equity }: { userName: string; userAvatar: string; equity?: string }) {
  const [language, setLanguage] = useState("EN");

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/30 backdrop-blur-md"
      style={{ background: "linear-gradient(180deg, hsl(222 47% 8% / 0.98) 0%, hsl(222 47% 6% / 0.95) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex w-full min-w-0 items-center justify-between gap-6 px-6 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-4 xl:gap-8">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- "/" is another root layout (a full load either way); plain <a> as on the reference */}
          <a href="/" aria-label="OmenX Sports" className="group flex flex-shrink-0 items-center gap-3 transition-opacity duration-300 hover:opacity-95">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
            <img src="/sports/omenx-logo.svg" alt="OMENX" className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.02]" />

            <span aria-hidden className="relative hidden h-9 w-[3px] overflow-hidden rounded-full bg-white/5 sm:block">
              <span
                className="absolute inset-0 bg-gradient-to-b from-primary via-primary to-accent"
                style={{ boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 60%, transparent)" }}
              />
            </span>

            <span className="hidden flex-col items-start leading-none sm:flex">
              <span className="mb-1 ml-px text-[9px] font-bold uppercase tracking-[0.4em] text-white/30">Zone</span>
              <span
                className="bg-gradient-to-br from-primary to-accent bg-clip-text pr-2 font-display text-2xl font-black italic uppercase tracking-normal text-transparent"
                style={{ filter: "drop-shadow(0 0 15px color-mix(in oklab, var(--primary) 35%, transparent))" }}
              >
                Sports
              </span>
            </span>
          </a>

          <nav className="flex min-w-0 items-center gap-1">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                rel="noopener"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground xl:px-4"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2 xl:gap-4">
          <a
            href={omenxUrl.wallet()}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-border/50 bg-white/[0.04] px-3 py-2 transition-all duration-200 hover:border-win/40 hover:bg-win/5 xl:px-4"
          >
            <span className="hidden text-sm text-muted-foreground xl:inline">Equity:</span>
            <span className="font-mono text-sm font-bold text-win">{equity ?? "$0.00"}</span>
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06] xl:gap-2.5 xl:px-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, as on the reference */}
                <img src={userAvatar} alt={userName} className="h-9 w-9 rounded-full border-2 border-primary/50 object-cover" />
                <span className="max-w-[64px] truncate text-sm font-medium text-foreground xl:max-w-[100px]">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <a href={omenxUrl.account()}>
                  <Gift className="mr-2 h-4 w-4 text-primary" />
                  Rewards
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={omenxUrl.account()}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  Referral
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a href={omenxUrl.settings()}>
                  <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Language</span>
                  <span className="ml-2 text-xs text-muted-foreground">{language}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {LANGUAGES.map((lang) => (
                      <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code)}>
                        <Check className={`mr-2 h-4 w-4 ${language === lang.code ? "text-primary" : "opacity-0"}`} />
                        {lang.code} — {lang.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a href={omenxUrl.transparency()}>
                  <Shield className="mr-2 h-4 w-4 text-emerald-400" />
                  Transparency Audit
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://omenx-helpcenter.lovable.app" target="_blank" rel="noopener noreferrer">
                  <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Help & Support</span>
                  <ExternalLink className="ml-2 h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://discord.gg/qXssm2crf9" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4 text-[#5865F2]" />
                  <span className="flex-1">Join Discord</span>
                  <ExternalLink className="ml-2 h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="text-loss">
                <a href={`${OMENX_BASE}/`}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
