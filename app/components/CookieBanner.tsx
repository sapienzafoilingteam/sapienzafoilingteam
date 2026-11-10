"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";
import { cookie } from "../translations/cookie";
import posthog from "posthog-js";
import { Button } from "@sft/design-system";

const consentKey = "cookieConsent";
const acceptedConsent = "accepted-umami";

declare global {
  interface Window {
    umami?: { track: (transform: (pageview: Record<string, unknown>) => Record<string, unknown>) => void };
  }
}

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [analyticsAccepted, setAnalyticsAccepted] = useState(false);
  const [umamiReady, setUmamiReady] = useState(false);
  const { language } = useLanguage();
  const pathname = usePathname();
  const trackablePage = Boolean(
    pathname && !/^\/(?:admin|login)(?:\/|$)/.test(pathname)
  );

  useEffect(() => {
    const syncConsent = () => {
      const consent = localStorage.getItem(consentKey);
      const accepted = consent === acceptedConsent;
      setAnalyticsAccepted(accepted);
      setShowBanner(!accepted && consent !== "rejected");
      if (accepted) posthog.opt_in_capturing();
      else posthog.opt_out_capturing();
    };
    const openPreferences = () => setShowBanner(true);
    const syncOtherTab = (event: StorageEvent) => {
      if (event.key === consentKey || event.key === null) syncConsent();
    };

    syncConsent();
    window.addEventListener("storage", syncOtherTab);
    window.addEventListener("open-cookie-preferences", openPreferences);
    return () => {
      window.removeEventListener("storage", syncOtherTab);
      window.removeEventListener("open-cookie-preferences", openPreferences);
    };
  }, []);

  useEffect(() => {
    if (
      analyticsAccepted && umamiReady && trackablePage &&
      localStorage.getItem(consentKey) === acceptedConsent
    ) {
      window.umami?.track((pageview) => ({ ...pageview, url: pathname, referrer: "", title: "" }));
    }
  }, [analyticsAccepted, umamiReady, trackablePage, pathname]);

  const handleAccept = () => {
    localStorage.setItem(consentKey, acceptedConsent);
    setAnalyticsAccepted(true);
    setShowBanner(false);
    posthog.opt_in_capturing();
  };

  const handleReject = () => {
    localStorage.setItem(consentKey, "rejected");
    setAnalyticsAccepted(false);
    setShowBanner(false);
    posthog.opt_out_capturing();
  };

  return (
    <>
      {analyticsAccepted && trackablePage && (
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "8e192a5d-4d99-4f60-98eb-b89d5a77bdf0"}
          data-domains="sapienzafoilingteam.com,www.sapienzafoilingteam.com"
          data-auto-track="false"
          data-do-not-track="true"
          onReady={() => setUmamiReady(true)}
        />
      )}
      {showBanner && (
        <div
          className="sft-root sft-site-cookie"
          role="region"
          aria-label={
            language === "it" ? "Preferenze cookie" : "Cookie preferences"
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-600">
              {cookie[language].message}
              <Link
                href="/privacy-policy"
                className="text-brand hover:underline ml-1 text-xs"
              >
                {cookie[language].privacyLink}
              </Link>
            </p>
            <div className="sft-site-cookie-actions">
              <Button onClick={handleReject} variant="outline">
                {cookie[language].reject}
              </Button>
              <Button onClick={handleAccept}>{cookie[language].accept}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieBanner;
