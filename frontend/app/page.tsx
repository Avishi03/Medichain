"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStats } from "@/lib/contract";

const ROLE_CARDS = [
  {
    icon:  "🏭",
    title: "Manufacturer",
    desc:  "Register medicine batches on-chain with tamper-proof metadata.",
    href:  "/manufacturer",
    color: "border-primary/20 hover:border-primary/50",
    badge: "Write Access",
  },
  {
    icon:  "🚚",
    title: "Distributor",
    desc:  "Transfer batches securely across the supply chain.",
    href:  "/distributor",
    color: "border-secondary/20 hover:border-secondary/50",
    badge: "Write Access",
  },
  {
    icon:  "💊",
    title: "Pharmacy",
    desc:  "Receive inventory and dispense verified medicines.",
    href:  "/pharmacy",
    color: "border-success/20 hover:border-success/50",
    badge: "Write Access",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🏭",
    title: "Manufacturer Registers",
    desc: "Drug companies register every medicine batch on Ethereum with expiry, quantity, and metadata.",
  },
  {
    step: "02",
    icon: "🚚",
    title: "Supply Chain Tracked",
    desc: "Every handoff — manufacturer → distributor → pharmacy — is recorded immutably on-chain.",
  },
  {
    step: "03",
    icon: "📱",
    title: "Patient Scans QR",
    desc: "Patients scan the QR code on the package to instantly verify authenticity before consuming.",
  },
  {
    step: "04",
    icon: "✅",
    title: "Instant Verification",
    desc: "Green = genuine, Red = recalled or fake. Zero trust required — blockchain doesn't lie.",
  },
];

export default function HomePage() {
  const [stats, setStats] = useState({ batches: BigInt(0), transfers: BigInt(0), recalls: BigInt(0) });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((s) =>
        setStats({ batches: s.totalBatches, transfers: s.totalTransfers, recalls: s.totalRecalls })

      )
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Powered by Ethereum Blockchain
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
            Is Your Medicine{" "}
            <span className="gradient-text">Real?</span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Scan the QR code on any MediChain-registered medicine to instantly
            verify its authenticity, track its journey, and protect your health.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/verify"
              className="btn-primary text-base px-8 py-4 flex items-center gap-2.5 w-full sm:w-auto justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verify a Medicine
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary text-base px-8 py-4 w-full sm:w-auto text-center"
            >
              Industry Portal →
            </Link>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-sm text-muted italic">
            &ldquo;Every Medicine. Verified. Always.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/50 py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Batches Registered", value: statsLoading ? "—" : stats.batches.toString() },
            { label: "Transfers Recorded", value: statsLoading ? "—" : stats.transfers.toString() },
            { label: "Batches Recalled",   value: statsLoading ? "—" : stats.recalls.toString() },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role cards ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Who Uses MediChain?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-sm">
            Every participant in the pharmaceutical supply chain has a dedicated
            role with secure, permissioned blockchain access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {ROLE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`card border transition-all duration-200 hover:shadow-glow group ${card.color}`}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-text-primary">{card.title}</h3>
                <span className="badge-info text-xs">{card.badge}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{card.desc}</p>
              <div className="mt-4 text-primary text-sm font-medium group-hover:underline">
                Go to {card.title} →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="bg-surface/30 border-y border-border px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              How It Works
            </h2>
            <p className="text-text-secondary text-sm max-w-xl mx-auto">
              Four simple steps protect billions of patients from counterfeit medicines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="card relative">
                <div className="absolute -top-3 -left-1 text-5xl font-black text-primary/10">
                  {step.step}
                </div>
                <div className="text-3xl mb-3 relative z-10">{step.icon}</div>
                <h3 className="text-base font-bold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
          Ready to Verify?
        </h2>
        <p className="text-text-secondary mb-8 text-sm">
          No wallet required. No app to install. Just scan the QR code on your
          medicine and get an instant answer.
        </p>
        <Link
          href="/verify"
          className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2"
        >
          Start Verification →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <p className="text-xs text-muted">
          MediChain — Deployed on Ethereum Sepolia Testnet.{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View on GitHub
          </a>{" "}
          ·{" "}
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Etherscan
          </a>
        </p>
      </footer>
    </div>
  );
}
