'use client';

import React, { useState } from 'react';

const BRAND_DOMAIN_MAP: Record<string, string> = {
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'zomato': 'zomato.com',
  'swiggy': 'swiggy.com',
  'youtube': 'youtube.com',
  'youtube premium': 'youtube.com',
  'canva': 'canva.com',
  'chatgpt': 'openai.com',
  'chatgpt plus': 'openai.com',
  'openai': 'openai.com',
  'claude': 'anthropic.com',
  'claude pro': 'anthropic.com',
  'anthropic': 'anthropic.com',
  'cursor': 'cursor.com',
  'cursor pro': 'cursor.com',
  'github': 'github.com',
  'github copilot': 'github.com',
  'copilot': 'github.com',
  'disney': 'disneyplus.com',
  'disney+': 'disneyplus.com',
  'disney+ hotstar': 'hotstar.com',
  'hotstar': 'hotstar.com',
  'amazon': 'amazon.com',
  'amazon prime': 'amazon.com',
  'prime video': 'amazon.com',
  'apple': 'apple.com',
  'apple one': 'apple.com',
  'apple music': 'apple.com',
  'apple tv+': 'apple.com',
  'icloud': 'apple.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'midjourney': 'midjourney.com',
  'slack': 'slack.com',
  'vercel': 'vercel.com',
  'google': 'google.com',
  'google workspace': 'workspace.google.com',
  'google one': 'one.google.com',
  'adobe': 'adobe.com',
  'creative cloud': 'adobe.com',
  'microsoft': 'microsoft.com',
  'microsoft 365': 'microsoft.com',
  'office 365': 'microsoft.com',
  'dropbox': 'dropbox.com',
  'zoom': 'zoom.us',
  'hulu': 'hulu.com',
  'max': 'max.com',
  'hbo': 'max.com',
  'crunchyroll': 'crunchyroll.com',
  'duolingo': 'duolingo.com',
  'linear': 'linear.app',
  'loom': 'loom.com',
  'grammarly': 'grammarly.com',
  'webflow': 'webflow.com',
  'supabase': 'supabase.com',
  'resend': 'resend.com',
  'datadog': 'datadoghq.com',
  'aws': 'aws.amazon.com',
  'digitalocean': 'digitalocean.com',
  'jira': 'atlassian.com',
  'atlassian': 'atlassian.com',
  'trello': 'trello.com',
  'audible': 'audible.com',
  'blinkist': 'blinkist.com',
  'perplexity': 'perplexity.ai',
};

const PALETTE = [
  'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
  'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
  'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
  'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
  'from-cyan-500/20 to-sky-500/20 text-cyan-400 border-cyan-500/30',
];

export function resolveBrandDomain(name: string, vendor?: string): string {
  const cleanName = (name || '').toLowerCase().trim();
  const cleanVendor = (vendor || '').toLowerCase().trim();

  if (BRAND_DOMAIN_MAP[cleanName]) return BRAND_DOMAIN_MAP[cleanName];

  for (const [key, domain] of Object.entries(BRAND_DOMAIN_MAP)) {
    if (cleanName.includes(key) || cleanVendor.includes(key)) {
      return domain;
    }
  }

  const raw = cleanName.replace(/[^a-z0-9]/g, '');
  return raw ? `${raw}.com` : 'paypal.com';
}

export function getBrandLogoUrl(name: string, vendor?: string): string {
  const domain = resolveBrandDomain(name, vendor);
  return `https://unavatar.io/${domain}?fallback=false`;
}

interface CompanyLogoProps {
  name: string;
  vendor?: string;
  size?: number;
  className?: string;
}

export function CompanyLogo({ name, vendor, size = 32, className = '' }: CompanyLogoProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const logoUrl = getBrandLogoUrl(name, vendor);

  const initial = (name || 'P').trim().charAt(0).toUpperCase();
  const colorIndex = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % PALETTE.length;
  const colorStyle = PALETTE[colorIndex];

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center select-none border ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      {!loadFailed ? (
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-contain p-1 rounded-xl bg-white/[0.04]"
          loading="lazy"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${colorStyle} flex items-center justify-center font-semibold text-xs tracking-tight font-sans`}>
          {initial}
        </div>
      )}
    </div>
  );
}
