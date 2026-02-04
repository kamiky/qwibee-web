import { useTranslations } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";
import { storeAuth, getAccessToken } from "@/lib/auth";

// Type definitions
export interface VideoData {
  id: string;
  title: {
    en: string;
    fr: string;
  };
  price: number;
}

export interface ProfilePageData {
  profileId: string;
  displayName: {
    en: string;
    fr: string;
  };
  promotionPercentage: number;
  videos: VideoData[];
  debug: {
    isDebugMode: boolean;
    simulateMode: string | null;
  };
  stripeDebugSecret: string | null;
}

export function initProfilePage(data: ProfilePageData) {
  const {
    profileId: currentProfileId,
    displayName,
    promotionPercentage,
    videos: profileVideos,
    debug,
    stripeDebugSecret,
  } = data;

  // Helper function to calculate promotional price
  const calculatePromotionalPrice = (originalPrice: number): number => {
    if (!promotionPercentage || promotionPercentage === 0) {
      return originalPrice;
    }
    return Math.round(originalPrice * (1 - promotionPercentage / 100));
  };

  // Detect language from URL
  const lang: Language = window.location.pathname.startsWith("/fr")
    ? "fr"
    : "en";
  const translations = useTranslations(lang);

  // Award pending tokens on-demand (simpler than cron for MVP)
  const awardPendingTokens = async () => {
    try {
      // Call backend endpoint to check and award tokens if needed
      // This endpoint checks if any tokens need to be awarded based on nextAwardAt
      const response = await fetch(`${window.location.origin.replace(':4321', ':5002')}/purchase-tokens/award-pending`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "internal", // Simple protection, will be replaced with proper auth
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.awardedCount > 0) {
          console.log(`✅ Awarded ${data.data.awardedCount} token(s)`);
        }
      }
    } catch (error) {
      // Silently fail - this is opportunistic
      console.log("Token award check failed (non-critical):", error);
    }
  };

  // Check if user has access token and verify it
  // Returns { hasAccess: boolean, membership: object | null, purchasedContent: array, purchaseTokens: array }
  const checkMembershipAccess = async () => {
    // Opportunistically try to award tokens (non-blocking)
    awardPendingTokens();

    // Debug mode: simulate different membership levels
    if (debug.isDebugMode) {
      console.log(
        `🔧 Debug mode active: simulate=${debug.simulateMode || "free-only"}`
      );

      if (debug.simulateMode === "all") {
        // Simulate having membership + all content purchased
        console.log("  → Simulating: membership + all paid content unlocked");
        return {
          hasAccess: true,
          membership: { status: "active", profileId: currentProfileId },
          purchasedContent: profileVideos.map((v) => v.id),
          purchaseTokens: [{ profileId: currentProfileId, tokenCount: 3, daysRemaining: 15 }],
        };
      } else if (debug.simulateMode === "membership") {
        // Simulate having membership only (no paid content)
        console.log(
          "  → Simulating: membership only (free + membership content)"
        );
        return {
          hasAccess: true,
          membership: { status: "active", profileId: currentProfileId },
          purchasedContent: [],
          purchaseTokens: [{ profileId: currentProfileId, tokenCount: 1, daysRemaining: 10 }],
        };
      } else {
        // Default debug mode: no membership, no purchased content (free only)
        console.log("  → Simulating: no membership (free content only)");
        return {
          hasAccess: false,
          membership: null,
          purchasedContent: [],
          purchaseTokens: [],
        };
      }
    }

    const token = getAccessToken();

    if (!token) {
      return { hasAccess: false, membership: null, purchasedContent: [], purchaseTokens: [] };
    }

    try {
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return { hasAccess: false, membership: null, purchasedContent: [], purchaseTokens: [] };
      }

      const data = await response.json();

      // Check if user has active membership for this profile
      if (data.data.valid && data.data.memberships) {
        const membership = data.data.memberships.find(
          (m: any) =>
            m.profileId === currentProfileId &&
            (m.status === "active" || m.status === "trialing")
        );

        // Get purchased content for this profile
        const purchasedContent = data.data.purchasedContent || [];
        const purchasedForProfile = purchasedContent
          .filter((pc: any) => pc.profileId === currentProfileId)
          .map((pc: any) => pc.videoId);

        // Get purchase tokens for this profile
        const allTokens = data.data.purchaseTokens || [];
        const tokensForProfile = allTokens.filter((t: any) => t.profileId === currentProfileId);

        return {
          hasAccess: !!membership,
          membership: membership || null,
          purchasedContent: purchasedForProfile,
          purchaseTokens: tokensForProfile,
        };
      }

      return { hasAccess: false, membership: null, purchasedContent: [], purchaseTokens: [] };
    } catch (error) {
      console.error("Error verifying token:", error);
      return { hasAccess: false, membership: null, purchasedContent: [], purchaseTokens: [] };
    }
  };

  // Function to unlock membership videos
  function unlockMembershipVideos(forceReload = false) {
    // In debug mode, access is already simulated server-side, so no need to reload
    if (debug.isDebugMode) {
      console.log(
        "Debug mode: Membership access already simulated server-side, skipping reload"
      );
      return;
    }

    // Only reload if explicitly requested (e.g., after fresh membership activation)
    // Don't reload on every page load if user already has membership
    if (forceReload) {
      console.log("Membership unlocked - reloading to load paid content");
      window.location.reload();
    } else {
      console.log("Membership detected - content already loaded");
    }
  }

  // Function to update membership UI
  const updateMembershipUI = (subscriptionData: any) => {
    const ctaBtn = document.getElementById("membership-cta-btn");
    const ctaText = document.getElementById("membership-cta-text");
    const statusInfo = document.getElementById("membership-status-info");
    const statusText = document.getElementById("membership-status-text");

    if (!ctaBtn || !ctaText || !statusInfo || !statusText) return;

    const { isSubscribed, isCanceled, renewalEnabled, renewalDate, endDate } =
      subscriptionData;
    
    const isFree = ctaBtn.getAttribute("data-is-free") === "true";

    // Remove loading state and enable button
    ctaBtn.removeAttribute("disabled");
    ctaBtn.classList.remove("cursor-wait", "bg-gray-400");
    ctaBtn.classList.add("cursor-pointer");

    // Store subscription state in data attribute
    ctaBtn.setAttribute("data-is-subscribed", isSubscribed ? "true" : "false");

    if (isSubscribed) {
      if (isCanceled || !renewalEnabled) {
        // Subscription canceled or renewal disabled - show "Renew" button
        ctaText.innerHTML = translations.profile.renew;
        ctaBtn.classList.remove(
          "bg-brand-blue-500",
          "hover:bg-brand-blue-600",
          "bg-orange-500",
          "hover:bg-orange-600"
        );
        ctaBtn.classList.add("bg-green-500", "hover:bg-green-600");
        statusText.textContent = `${translations.profile.membershipEndsOn} ${endDate || ""}`;
      } else {
        // Active subscription with renewal - show "Subscribed" button (still clickable to manage)
        ctaText.innerHTML = translations.profile.subscribed;
        ctaBtn.classList.remove(
          "bg-brand-blue-500",
          "hover:bg-brand-blue-600",
          "bg-orange-500",
          "hover:bg-orange-600"
        );
        ctaBtn.classList.add("bg-green-500", "hover:bg-green-600");
        statusText.textContent = `${translations.profile.willRenewOn} ${renewalDate || ""}`;
      }

      // Show status info
      statusInfo.classList.remove("hidden");
    } else {
      // Not subscribed - show appropriate button text based on whether it's free
      if (isFree) {
        ctaText.innerHTML = translations.profile.followCta || "Follow";
      } else {
        ctaText.innerHTML = translations.profile.subscribeCta;
      }
      ctaBtn.classList.remove(
        "bg-orange-500",
        "hover:bg-orange-600",
        "bg-green-500",
        "hover:bg-green-600"
      );
      ctaBtn.classList.add("bg-brand-blue-500", "hover:bg-brand-blue-600");
      statusInfo.classList.add("hidden");
    }
  };

  // Function to unlock paid content videos
  function unlockPaidContentVideos(
    purchasedVideoIds: string[],
    forceReload = false
  ) {
    // In debug mode, access is already simulated server-side, so no need to reload
    if (debug.isDebugMode) {
      console.log(
        "Debug mode: Purchased content access already simulated server-side, skipping reload"
      );
      return;
    }

    // Only reload if explicitly requested (e.g., after fresh content purchase)
    // Don't reload on every page load if user already has purchased content
    if (forceReload && purchasedVideoIds.length > 0) {
      console.log(
        `${purchasedVideoIds.length} videos purchased - reloading to load paid content`
      );
      window.location.reload();
    } else if (purchasedVideoIds.length > 0) {
      console.log(
        `${purchasedVideoIds.length} purchased videos detected - content already loaded`
      );
    }
  }

  // Function to show paid content pricing for subscribed users
  function showPaidContentPricing(hasActivePromotion: boolean = false) {
    // Find all paid content pricing divs that are hidden (only show for locked paid videos)
    const paidVideos = document.querySelectorAll(
      '.video-card[data-video-type="paid"]'
    );

    let count = 0;
    paidVideos.forEach((card) => {
      // Only show pricing if the video still has a lock icon (not purchased yet)
      const lockIcon = card.querySelector(".lock-icon");
      if (lockIcon) {
        const pricingDiv = card.querySelector(".paid-content-pricing");
        if (pricingDiv) {
          // Show/hide the strikethrough original price based on active promotion
          const originalPrice = pricingDiv.querySelector(".text-gray-400");
          if (originalPrice) {
            (originalPrice as HTMLElement).style.display = hasActivePromotion && promotionPercentage > 0 ? "inline" : "none";
          }

          (pricingDiv as HTMLElement).style.display = "flex";
          count++;
        }
      }
    });

    console.log(`Showed pricing for ${count} locked paid videos${hasActivePromotion ? " with promotion" : ""}`);
  }

  // Function to show content type badges (Members/-X%) for subscribed users
  function showContentTypeBadges(hasActivePromotion: boolean = false) {
    // Find all content type badges (both membership and paid)
    const badges = document.querySelectorAll(".content-type-badge");

    badges.forEach((badge) => {
      const videoType = (badge as HTMLElement).getAttribute("data-video-type");
      
      // For paid content badges, only show if there's an active promotion
      if (videoType === "paid") {
        if (hasActivePromotion && promotionPercentage > 0) {
          (badge as HTMLElement).style.display = "block";
        }
      } else {
        // Always show membership badges
        (badge as HTMLElement).style.display = "block";
      }
    });

    console.log(`Showed content type badges${hasActivePromotion ? " with promotion" : ""}`);
  }

  // Display token bar with user's token count
  function displayTokenBar(tokens: any) {
    const tokensBar = document.getElementById("tokens-bar");
    if (!tokensBar || !tokens || tokens.length === 0) {
      return;
    }

    const tokenData = tokens[0]; // Get first token (should be for current profile)
    const tokenCount = tokenData.tokenCount || 0;
    const daysRemaining = tokenData.daysRemaining || 0;

    // Update token count and plurals
    const tokenCountEl = document.getElementById("token-count");
    const tokenPluralEl = document.getElementById("token-plural");
    const daysCountEl = document.getElementById("days-count");
    const daysCountSubtitleEl = document.getElementById("days-count-subtitle");
    const explanationEl = document.getElementById("token-explanation");

    if (tokenCountEl) tokenCountEl.textContent = tokenCount.toString();
    
    // Handle plurals for token
    if (lang === 'en') {
      if (tokenPluralEl) tokenPluralEl.textContent = tokenCount > 1 ? "s" : "";
    } else {
      // French
      if (tokenPluralEl) tokenPluralEl.textContent = tokenCount > 1 ? "s" : "";
    }
    
    // Update days counter on the right side and in subtitle
    if (daysCountEl) daysCountEl.textContent = daysRemaining.toString();
    if (daysCountSubtitleEl) daysCountSubtitleEl.textContent = daysRemaining.toString();

    // Update explanation based on token count
    if (explanationEl) {
      if (tokenCount === 1) {
        explanationEl.textContent = lang === 'en' 
          ? '50% discount on next purchase' 
          : '50% de réduction sur le prochain achat';
      } else if (tokenCount >= 2) {
        explanationEl.textContent = lang === 'en' 
          ? '100% discount on next purchase' 
          : '100% de réduction sur le prochain achat';
      } else {
        // 0 tokens
        explanationEl.textContent = lang === 'en' 
          ? '50% discount on next purchase' 
          : '50% de réduction sur le prochain achat';
      }
    }

    // Show the bar
    tokensBar.classList.remove("hidden");
  }

  // Check if user has active promotion
  function checkActivePromotion(membership: any): { isActive: boolean; expiresAt: Date | null; remainingSeconds: number } {
    if (!membership || !membership.promotionExpiresAt) {
      return { isActive: false, expiresAt: null, remainingSeconds: 0 };
    }

    const expiresAt = new Date(membership.promotionExpiresAt);
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return {
      isActive: remainingSeconds > 0,
      expiresAt: expiresAt,
      remainingSeconds: remainingSeconds,
    };
  }

  // Display promotion countdown timer
  function displayPromotionCountdown(remainingSeconds: number) {
    // Create countdown element if it doesn't exist
    let countdownEl = document.getElementById("promotion-countdown");
    if (!countdownEl) {
      const countdownContainer = document.createElement("div");
      countdownContainer.id = "promotion-countdown-container";
      countdownContainer.className = "fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 sm:px-6 sm:py-4 shadow-2xl";
      const promotionTitle = translations.profile.promotionTitle || "🎉 New Subscriber Offer!";
      const promotionDescription = (translations.profile.promotionDescription || "Get {percentage}% off all one-shot purchases").replace("{percentage}", promotionPercentage.toString());
      const promotionTimeRemaining = translations.profile.promotionTimeRemaining || "Time remaining";
      
      countdownContainer.innerHTML = `
        <div class="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <div class="font-bold text-base sm:text-lg">${promotionTitle}</div>
              <div class="text-xs sm:text-sm opacity-90">${promotionDescription}</div>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xl sm:text-2xl font-bold" id="promotion-countdown">00:00</div>
            <div class="text-xs opacity-90">${promotionTimeRemaining}</div>
          </div>
        </div>
      `;
      document.body.appendChild(countdownContainer);
      
      // Add bottom padding to body to prevent content from being hidden behind the fixed bar
      document.body.style.paddingBottom = "100px";
      
      countdownEl = document.getElementById("promotion-countdown");
    }

    // Update countdown every second
    const updateCountdown = () => {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      if (countdownEl) {
        countdownEl.textContent = timeString;
      }

      if (remainingSeconds <= 0) {
        // Promotion expired - remove countdown and reload page
        const container = document.getElementById("promotion-countdown-container");
        if (container) {
          container.remove();
          // Remove bottom padding
          document.body.style.paddingBottom = "";
        }
        // Reload to update prices
        window.location.reload();
      } else {
        remainingSeconds--;
        setTimeout(updateCountdown, 1000);
      }
    };

    updateCountdown();
  }

  // DEBUG ONLY: Setup debug token button
  function setupDebugTokenButton(hasAccess: boolean) {
    if (!debug.isDebugMode && !window.location.hostname.includes('localhost')) {
      return; // Only in dev
    }

    const debugBtn = document.getElementById("debug-add-token-btn");
    if (!debugBtn) return;

    // Only show if user has active membership
    if (hasAccess) {
      debugBtn.classList.remove("hidden");
      
      debugBtn.addEventListener("click", async () => {
        const token = getAccessToken();
        if (!token) {
          alert("Not authenticated");
          return;
        }

        // Disable button
        debugBtn.setAttribute("disabled", "true");
        const originalText = debugBtn.textContent;
        debugBtn.textContent = "Adding...";

        try {
          const response = await fetch(`${window.location.origin.replace(':4321', ':5002')}/debug/add-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              profileId: currentProfileId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add token");
          }

          const data = await response.json();
          console.log("✅ Debug: Added 1 token. New count:", data.data.tokenCount);

          // Reload page to show updated token count
          window.location.reload();
        } catch (error) {
          console.error("Error adding debug token:", error);
          alert(`Failed to add token: ${error instanceof Error ? error.message : "Unknown error"}`);
          
          // Restore button
          debugBtn.removeAttribute("disabled");
          debugBtn.textContent = originalText;
        }
      });
    }
  }

  // Check access on page load and update UI
  checkMembershipAccess().then(
    ({ hasAccess, membership, purchasedContent, purchaseTokens }) => {
      // Unlock purchased content videos (no reload on normal page load)
      if (purchasedContent && purchasedContent.length > 0) {
        unlockPaidContentVideos(purchasedContent, false);
      }

      // Setup debug token button (dev only)
      setupDebugTokenButton(hasAccess);

      if (hasAccess && membership) {
        // Unlock membership videos (no reload on normal page load)
        unlockMembershipVideos(false);

        // Display token bar if user has active membership
        console.log("Purchase tokens data:", purchaseTokens);
        
        if (purchaseTokens && purchaseTokens.length > 0) {
          console.log("✅ Displaying token bar with data:", purchaseTokens[0]);
          displayTokenBar(purchaseTokens);
        } else {
          // If no token data yet, still show the bar with default values
          // This can happen right after subscription before token record is created
          console.warn("⚠️ No token data available - showing default values");
          const tokensBar = document.getElementById("tokens-bar");
          if (tokensBar) {
            const tokenCountEl = document.getElementById("token-count");
            const tokenPluralEl = document.getElementById("token-plural");
            const daysCountEl = document.getElementById("days-count");
            const daysCountSubtitleEl = document.getElementById("days-count-subtitle");
            const explanationEl = document.getElementById("token-explanation");
            
            if (tokenCountEl) tokenCountEl.textContent = "0";
            if (tokenPluralEl) tokenPluralEl.textContent = ""; // 0 tokens = no 's' in English
            if (daysCountEl) daysCountEl.textContent = "30";
            if (daysCountSubtitleEl) daysCountSubtitleEl.textContent = "30";
            
            // Default explanation for 0 tokens
            if (explanationEl) {
              explanationEl.textContent = lang === 'en' 
                ? '50% discount on next purchase' 
                : '50% de réduction sur le prochain achat';
            }
            
            tokensBar.classList.remove("hidden");
          }
        }

        // Check if user has active promotion
        const promotion = checkActivePromotion(membership);
        const hasActivePromotion = promotion.isActive && promotionPercentage > 0;

        // Show paid content pricing for subscribed users (with promotion if active)
        showPaidContentPricing(hasActivePromotion);

        // Show content type badges for subscribed users (with promotion if active)
        showContentTypeBadges(hasActivePromotion);

        // Display promotion countdown if active
        if (hasActivePromotion) {
          console.log(`🎉 Active promotion: ${promotionPercentage}% off for ${promotion.remainingSeconds} seconds`);
          displayPromotionCountdown(promotion.remainingSeconds);
        }

        // Use real subscription data from backend
        const renewalDate = membership.currentPeriodEnd
          ? new Date(membership.currentPeriodEnd).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null;

        const subscriptionData = {
          isSubscribed: true,
          isCanceled: membership.cancelAtPeriodEnd || false,
          renewalEnabled: !membership.cancelAtPeriodEnd,
          renewalDate: renewalDate,
          endDate: renewalDate,
        };

        updateMembershipUI(subscriptionData);

        console.log("User has active membership access", membership);
      } else {
        // Not subscribed
        updateMembershipUI({
          isSubscribed: false,
          isCanceled: false,
          renewalEnabled: false,
          renewalDate: null,
          endDate: null,
        });
      }
    }
  );

  // Check for Stripe redirect success
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  const membershipStatus = urlParams.get("membership");
  const contentPurchaseStatus = urlParams.get("content_purchase");
  const purchasedVideoId = urlParams.get("video_id");

  // Helper function to show/hide loading overlay
  function showLoadingOverlay(title: string, message: string) {
    const overlay = document.getElementById("payment-verification-overlay");
    const titleEl = document.getElementById("verification-title");
    const messageEl = document.getElementById("verification-message");
    
    if (overlay) {
      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.textContent = message;
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
    }
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById("payment-verification-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
    }
  }

  // Handle successful content purchase
  if (sessionId && contentPurchaseStatus === "success") {
    // Show loading overlay immediately
    showLoadingOverlay(
      "Unlocking your content...",
      "Please wait while we verify your purchase. This usually takes just a few seconds."
    );

    (async () => {
      try {
        console.log("Processing content purchase success...");
        
        // Call backend to verify session and wait for webhook to complete
        const response = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            profileId: currentProfileId,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMessage =
            errorData.error || errorData.message || "Failed to verify purchase";
          console.error("Backend error:", errorData);
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Store auth data in cookies
        storeAuth({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
        });

        console.log("✅ Purchase verified and saved to database!");

        // Remove query params from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Keep loading overlay visible while page reloads
        // Reload the page to show unlocked content
        console.log("Reloading page to show unlocked content...");
        window.location.reload();
      } catch (error) {
        console.error("Error verifying purchase:", error);

        // Hide loading overlay
        hideLoadingOverlay();

        // Remove query params even on error to prevent repeated processing
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Show detailed error message
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        alert(
          `Payment successful, but failed to unlock content.\n\nError: ${errorMessage}\n\nPlease refresh the page in a few moments or contact support.`
        );
      }
    })();
  } else if (contentPurchaseStatus === "canceled") {
    const statusContainer = document.getElementById(
      "membership-status-message"
    );
    const cancelMsg = document.getElementById("cancel-message");
    if (statusContainer && cancelMsg) {
      // Update message for content purchase cancellation
      const title = cancelMsg.querySelector("h3");
      const message = cancelMsg.querySelector("p");
      if (title) title.textContent = "Purchase Cancelled";
      if (message)
        message.textContent =
          "Your content purchase was cancelled. You can try again anytime.";

      statusContainer.classList.remove("hidden");
      cancelMsg.classList.remove("hidden");
      statusContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Handle successful membership checkout
  if (sessionId && membershipStatus === "success") {
    // Show loading overlay immediately
    showLoadingOverlay(
      "Activating your membership...",
      "Please wait while we verify your subscription. This usually takes just a few seconds."
    );

    (async () => {
      try {
        console.log("Processing membership checkout success...");
        
        // Call backend to verify session and wait for webhook to complete
        const response = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            profileId: currentProfileId,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMessage =
            errorData.error || errorData.message || "Failed to verify session";
          console.error("Backend error:", errorData);
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Store auth data in cookies
        storeAuth({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
        });

        console.log("✅ Membership verified and saved to database!");

        // Remove query params from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Keep loading overlay visible while page reloads
        // Reload to show updated membership status
        console.log("Reloading page to show membership access...");
        window.location.reload();
      } catch (error) {
        console.error("Error processing membership:", error);

        // Hide loading overlay
        hideLoadingOverlay();

        // Remove query params even on error
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Show detailed error message
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        alert(
          `Payment successful, but failed to activate membership.\n\nError: ${errorMessage}\n\nPlease refresh the page in a few moments or contact support.`
        );
      }
    })();
  } else if (membershipStatus === "canceled") {
    const statusContainer = document.getElementById(
      "membership-status-message"
    );
    const cancelMsg = document.getElementById("cancel-message");
    if (statusContainer && cancelMsg) {
      statusContainer.classList.remove("hidden");
      cancelMsg.classList.remove("hidden");
      statusContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      const href = anchor.getAttribute("href");
      if (href) {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });

  // Handle membership CTA button click
  const membershipCtaBtn = document.getElementById("membership-cta-btn");
  if (membershipCtaBtn) {
    membershipCtaBtn.addEventListener("click", async () => {
      const isSubscribed =
        membershipCtaBtn.getAttribute("data-is-subscribed") === "true";
      const profileId = membershipCtaBtn.getAttribute("data-profile-id");
      const membershipPrice = membershipCtaBtn.getAttribute(
        "data-membership-price"
      );
      const isFree = membershipCtaBtn.getAttribute("data-is-free") === "true";

      if (!profileId || membershipPrice === null) {
        console.error("Missing profile data");
        return;
      }

      // Check if user is logged in
      const token = getAccessToken();
      if (!token) {
        // User not logged in - redirect to login with redirect URL in query params
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirectUrl}${isFree ? "" : "&openStripe=true"}`;
        return;
      }

      // Handle free membership
      if (isFree && !isSubscribed) {
        // Show loading state
        const ctaText = document.getElementById("membership-cta-text");
        const originalText =
          ctaText?.innerHTML || translations.profile.followCta || "Follow";
        if (ctaText) {
          ctaText.innerHTML = `
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ${translations.profile.loading}
          `;
          ctaText.classList.add("flex", "items-center", "gap-2");
        }

        try {
          const response = await fetch("/api/auth/create-free-membership", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileId,
              token,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to create free membership"
            );
          }

          const data = await response.json();
          console.log("✅ Free membership created:", data);

          // Reload page to show membership content
          window.location.reload();
        } catch (error) {
          console.error("Error creating free membership:", error);
          alert("Failed to follow creator. Please try again.");

          // Restore original text
          if (ctaText) {
            ctaText.innerHTML = originalText;
            ctaText.classList.remove("flex", "items-center", "gap-2");
          }
        }
        return;
      }

      // Open new tab immediately to avoid popup blockers (for paid memberships)
      const stripeWindow = window.open("about:blank", "_blank");

      // Show loading state
      const ctaText = document.getElementById("membership-cta-text");
      const originalText =
        ctaText?.innerHTML || translations.profile.subscribeCta;
      if (ctaText) {
        ctaText.innerHTML = `
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${translations.profile.loading}
        `;
        ctaText.classList.add("flex", "items-center", "gap-2");
      }

      // Show loading message in the new tab
      if (stripeWindow) {
        stripeWindow.document.write(`
          <html>
            <head>
              <title>Loading...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #f9fafb;
                }
                .loader {
                  text-align: center;
                }
                .spinner {
                  border: 3px solid #e5e7eb;
                  border-top: 3px solid #3b82f6;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 16px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="loader">
                <div class="spinner"></div>
                <p>Redirecting to Stripe...</p>
              </div>
            </body>
          </html>
        `);
      }

      try {
        // Extract user email from token
        let customerEmail = null;
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          customerEmail = payload.email;
        } catch (e) {
          console.error("Error decoding token:", e);
        }

        if (isSubscribed) {
          // User is subscribed - redirect to Stripe customer portal (manage subscription)
          const response = await fetch("/api/stripe/create-portal-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerEmail,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to create portal session"
            );
          }

          const data = await response.json();

          // Redirect the opened tab to Stripe customer portal
          if (data.url && stripeWindow) {
            stripeWindow.location.href = data.url;
          } else if (!stripeWindow) {
            // Fallback if popup was blocked
            window.location.href = data.url;
          } else {
            throw new Error("No portal URL received");
          }
        } else {
          // User is not subscribed - redirect to Stripe checkout (payment page)
          const response = await fetch(
            "/api/stripe/create-membership-session",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                profileId,
                membershipPrice: parseInt(membershipPrice),
                customerEmail,
                language: lang,
                displayName: displayName[lang],
                debugSecret: stripeDebugSecret || undefined,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to create checkout session"
            );
          }

          const data = await response.json();

          // Redirect the opened tab to Stripe checkout
          if (data.url && stripeWindow) {
            stripeWindow.location.href = data.url;
          } else if (!stripeWindow) {
            // Fallback if popup was blocked
            window.location.href = data.url;
          } else {
            throw new Error("No checkout URL received");
          }
        }

        // Restore button text
        if (ctaText) {
          ctaText.innerHTML = originalText;
          ctaText.classList.remove("flex", "items-center", "gap-2");
        }
      } catch (error) {
        console.error("Error:", error);

        // Close the loading tab if there was an error
        if (stripeWindow) {
          stripeWindow.close();
        }

        alert(
          `Failed to ${isSubscribed ? "open subscription management" : "start checkout"}. Please try again.`
        );

        // Restore original text
        if (ctaText) {
          ctaText.innerHTML = originalText;
          ctaText.classList.remove("flex", "items-center", "gap-2");
        }
      }
    });
  }

  // Handle "Buy video" button clicks for paid content
  const actionButtons = document.querySelectorAll(
    '.video-card[data-video-type="paid"] .action-button'
  );
  actionButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      const card = (e.target as HTMLElement).closest(".video-card");
      const videoId = card?.getAttribute("data-video-id");

      // Get video price from profiles data
      const videoData = profileVideos.find((v) => v.id === videoId);
      if (!videoData) {
        console.error("Video data not found");
        return;
      }

      // Check if user is logged in
      const token = getAccessToken();
      if (!token) {
        // User not logged in - redirect to login
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirectUrl}`;
        return;
      }

      // Check if user has active promotion and tokens
      const { hasAccess, membership, purchaseTokens } = await checkMembershipAccess();
      const promotion = hasAccess && membership ? checkActivePromotion(membership) : { isActive: false, expiresAt: null, remainingSeconds: 0 };
      
      // Get token count for this profile
      const tokenData = purchaseTokens && purchaseTokens.length > 0 ? purchaseTokens[0] : null;
      const tokenCount = tokenData?.tokenCount || 0;

      console.log(`User has ${tokenCount} tokens for this profile`);

      // Handle 2+ tokens: Unlock for FREE without Stripe
      if (tokenCount >= 2) {
        // Show confirmation dialog
        const confirmMessage = lang === 'en' 
          ? `Use 2 tokens to unlock this content for FREE?\n\nYou have ${tokenCount} tokens.`
          : `Utiliser 2 jetons pour débloquer ce contenu GRATUITEMENT ?\n\nVous avez ${tokenCount} jetons.`;
        
        if (!confirm(confirmMessage)) {
          return;
        }

        // Show loading state
        const originalText = (button as HTMLButtonElement).textContent;
        (button as HTMLButtonElement).disabled = true;
        (button as HTMLButtonElement).textContent = translations.profile.loading;

        try {
          // Extract user email from token
          let customerEmail = null;
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            customerEmail = payload.email;
          } catch (e) {
            console.error("Error decoding token:", e);
            throw new Error("Invalid authentication token");
          }

          // Call backend to unlock content with tokens
          const response = await fetch("/api/stripe/unlock-content-with-tokens", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileId: currentProfileId,
              videoId: videoId,
              customerEmail,
              tokensToUse: 2,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to unlock content");
          }

          const data = await response.json();
          console.log("✅ Content unlocked with tokens:", data);

          // Show success message
          alert(lang === 'en' 
            ? '✅ Content unlocked! Refreshing page...' 
            : '✅ Contenu débloqué ! Actualisation...');

          // Reload page to show unlocked content
          window.location.reload();
        } catch (error) {
          console.error("Error unlocking content with tokens:", error);
          alert(
            lang === 'en'
              ? `Failed to unlock content with tokens.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`
              : `Échec du déblocage avec les jetons.\n\nErreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`
          );

          // Restore original text
          (button as HTMLButtonElement).textContent = originalText;
          (button as HTMLButtonElement).disabled = false;
        }
        return;
      }

      // Handle 1 token or 0 tokens: Use Stripe with discount
      // Open new tab immediately to avoid popup blockers
      const stripeWindow = window.open("about:blank", "_blank");

      // Show loading state
      const originalText = (button as HTMLButtonElement).textContent;
      (button as HTMLButtonElement).disabled = true;
      (button as HTMLButtonElement).textContent = translations.profile.loading;

      // Show loading message in the new tab
      if (stripeWindow) {
        stripeWindow.document.write(`
          <html>
            <head>
              <title>Loading...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #f9fafb;
                }
                .loader {
                  text-align: center;
                }
                .spinner {
                  border: 3px solid #e5e7eb;
                  border-top: 3px solid #3b82f6;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 16px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="loader">
                <div class="spinner"></div>
                <p>Redirecting to Stripe...</p>
              </div>
            </body>
          </html>
        `);
      }

      try {
        // Extract user email from token
        let customerEmail = null;
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          customerEmail = payload.email;
        } catch (e) {
          console.error("Error decoding token:", e);
        }

        // Calculate the price and token usage
        // Priority: 1 token (50% off) > active promotion > full price
        let finalPrice = videoData.price;
        let tokensToUse = 0;
        
        if (tokenCount === 1) {
          // Apply 1 token for 50% discount
          finalPrice = Math.round(videoData.price * 0.5);
          tokensToUse = 1;
          console.log(`🎟️ Using 1 token for 50% discount: ${videoData.price} → ${finalPrice} cents`);
        } else if (promotion.isActive && promotionPercentage > 0) {
          // No tokens, but has active promotion
          finalPrice = calculatePromotionalPrice(videoData.price);
          console.log(`🎉 Applying ${promotionPercentage}% promotion: ${videoData.price} → ${finalPrice} cents`);
        }

        const response = await fetch(
          "/api/stripe/create-content-checkout-session",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileId: currentProfileId,
              videoId: videoId,
              contentPrice: finalPrice,
              tokensToUse: tokensToUse, // Pass tokens to use (0 or 1)
              // Don't pass successUrl/cancelUrl - let backend use defaults with redirect tokens
              customerEmail,
              language: lang,
              videoTitle: videoData.title[lang],
              creatorDisplayName: displayName[lang],
              debugSecret: stripeDebugSecret || undefined,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to create checkout session"
          );
        }

        const data = await response.json();

        // Redirect the opened tab to Stripe checkout
        if (data.url && stripeWindow) {
          stripeWindow.location.href = data.url;
        } else if (!stripeWindow) {
          // Fallback if popup was blocked
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL received");
        }

        // Restore button text
        (button as HTMLButtonElement).textContent = originalText;
        (button as HTMLButtonElement).disabled = false;
      } catch (error) {
        console.error("Error:", error);

        // Close the loading tab if there was an error
        if (stripeWindow) {
          stripeWindow.close();
        }

        alert("Failed to start checkout. Please try again.");

        // Restore original text
        (button as HTMLButtonElement).textContent = originalText;
        (button as HTMLButtonElement).disabled = false;
      }
    });
  });

  // Check if we should open Stripe after login
  const shouldOpenStripe = sessionStorage.getItem(
    "qwb_open_stripe_after_login"
  );
  if (shouldOpenStripe === "true") {
    sessionStorage.removeItem("qwb_open_stripe_after_login");

    // Wait a bit for the page to load, then click the CTA button
    setTimeout(() => {
      const btn = document.getElementById("membership-cta-btn");
      if (btn) {
        btn.click();
      }
    }, 500);
  }

  // Handle custom play button clicks (only for videos, not images)
  const customPlayButtons = document.querySelectorAll(".custom-play-icon");
  customPlayButtons.forEach((playButton) => {
    playButton.addEventListener("click", (e) => {
      e.stopPropagation();

      const container = (playButton as HTMLElement).closest(".video-container");
      if (!container) return;

      const videoElement = container.querySelector(".video-player");
      const thumbnail = container.querySelector(".video-thumbnail");
      const lockIcon = container.querySelector(".lock-icon");
      const durationLabel = container.querySelector(".video-duration");

      // Only handle video elements, skip images
      if (videoElement && videoElement.tagName === "VIDEO") {
        const video = videoElement as HTMLVideoElement;

        // Get the video source (already filtered by access on server side)
        const videoSrc = video.getAttribute("data-video-src");
        const mimetype = video.getAttribute("data-mimetype") || "video/mp4";

        if (videoSrc) {
          // Create and add source element
          video.innerHTML = `<source src="${videoSrc}" type="${mimetype}">`;

          // Load and play the video
          video.setAttribute("controls", "true");
          video.classList.remove("hidden");
          video.load();
          video.play().catch((error) => {
            console.error("Error playing video:", error);
          });

          // Hide the thumbnail
          if (thumbnail) {
            (thumbnail as HTMLElement).style.display = "none";
          }

          // Hide the custom play icon
          (playButton as HTMLElement).style.display = "none";

          // Hide the lock icon when video starts playing
          if (lockIcon) {
            (lockIcon as HTMLElement).style.display = "none";
          }

          // Hide the duration label when controls are shown
          if (durationLabel) {
            (durationLabel as HTMLElement).style.display = "none";
          }
        }
      }
    });
  });

  // Create fullscreen image viewer modal
  const createFullscreenViewer = () => {
    const modal = document.createElement("div");
    modal.id = "fullscreen-image-viewer";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    modal.innerHTML = `
      <button id="close-fullscreen-viewer" class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10" aria-label="Close">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <img id="fullscreen-image" class="object-contain" style="max-width: 80%; max-height: 80%;" alt="Fullscreen image" />
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#close-fullscreen-viewer");
    const image = modal.querySelector("#fullscreen-image") as HTMLImageElement;

    // Close on button click
    closeBtn?.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });

    // Close on background click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });

    return { modal, image };
  };

  // Initialize fullscreen viewer
  const { modal: fullscreenModal, image: fullscreenImage } =
    createFullscreenViewer();

  // Add click handlers to all images
  const imageCards = document.querySelectorAll(".video-card");
  imageCards.forEach((card) => {
    const mediaElement = card.querySelector(".video-player");

    // Only handle images
    if (mediaElement && mediaElement.tagName === "IMG") {
      const img = mediaElement as HTMLImageElement;
      const container = img.closest(".video-container");

      // Make the entire container clickable for images
      if (container) {
        (container as HTMLElement).style.cursor = "pointer";

        container.addEventListener("click", (e) => {
          e.stopPropagation();

          const hasAccess = img.getAttribute("data-has-access") === "true";
          const paidSrc = img.getAttribute("data-paid-src");
          const previewSrc = img.getAttribute("data-preview-src");

          // Show the appropriate image (unlocked or blurred preview)
          const imageSrc = hasAccess ? paidSrc : previewSrc;

          if (imageSrc) {
            fullscreenImage.src = imageSrc;
            fullscreenModal.classList.remove("hidden");
            fullscreenModal.classList.add("flex");
          }
        });
      }
    }
  });
}
