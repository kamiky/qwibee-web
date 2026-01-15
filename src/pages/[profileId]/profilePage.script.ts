import { useTranslations } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";

// Type definitions
interface VideoData {
  id: string;
  price: number;
}

interface ProfilePageData {
  profileId: string;
  videos: VideoData[];
}

export function initProfilePage(data: ProfilePageData) {
  const { profileId: currentProfileId, videos: profileVideos } = data;

  // Detect language from URL
  const lang: Language = window.location.pathname.startsWith("/fr")
    ? "fr"
    : "en";
  const translations = useTranslations(lang);

  // Check if user has access token and verify it
  // Returns { hasAccess: boolean, membership: object | null, purchasedContent: array }
  const checkMembershipAccess = async () => {
    const token = localStorage.getItem("wmf_access_token");

    if (!token) {
      return { hasAccess: false, membership: null, purchasedContent: [] };
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
        return { hasAccess: false, membership: null, purchasedContent: [] };
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

        return {
          hasAccess: !!membership,
          membership: membership || null,
          purchasedContent: purchasedForProfile,
        };
      }

      return { hasAccess: false, membership: null, purchasedContent: [] };
    } catch (error) {
      console.error("Error verifying token:", error);
      return { hasAccess: false, membership: null, purchasedContent: [] };
    }
  };

  // Function to unlock membership videos
  function unlockMembershipVideos() {
    // Find all video cards with membership type
    const membershipVideos = document.querySelectorAll(
      '.video-card[data-video-type="membership"]'
    );

    membershipVideos.forEach((card) => {
      // Remove lock icon
      const lockIcon = card.querySelector(".lock-icon");
      if (lockIcon) {
        lockIcon.remove();
      }

      // Remove custom play icon
      const customPlayIcon = card.querySelector(".custom-play-icon");
      if (customPlayIcon) {
        customPlayIcon.remove();
      }

      // Remove content type badge (Members)
      const contentTypeBadge = card.querySelector(".content-type-badge");
      if (contentTypeBadge) {
        contentTypeBadge.remove();
      }

      // Enable video controls and update source
      const video = card.querySelector(".video-player") as HTMLVideoElement;
      if (video) {
        video.setAttribute("controls", "true");
        const paidSrc = video.getAttribute("data-paid-src");
        if (paidSrc) {
          const source = video.querySelector("source");
          if (source) {
            source.src = paidSrc;
            video.load(); // Reload video with new source
          }
        }
      }

      // Hide locked label
      const lockedLabel = card.querySelector(".locked-label");
      if (lockedLabel) {
        lockedLabel.classList.add("hidden");
      }

      // Show unlocked badge
      const unlockedBadge = card.querySelector(".unlocked-badge");
      if (unlockedBadge) {
        unlockedBadge.classList.remove("hidden");
        unlockedBadge.classList.add("flex");
      }

      // Hide action button
      const actionButton = card.querySelector(".action-button");
      if (actionButton) {
        actionButton.classList.add("hidden");
      }
    });

    console.log(`Unlocked ${membershipVideos.length} membership videos`);
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
      // Not subscribed - show "Subscribe" button
      ctaText.innerHTML = translations.profile.subscribeCta;
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
  function unlockPaidContentVideos(purchasedVideoIds: string[]) {
    // Find all video cards with paid type
    const paidVideos = document.querySelectorAll(
      '.video-card[data-video-type="paid"]'
    );

    paidVideos.forEach((card) => {
      const videoId = card.getAttribute("data-video-id");

      // Check if this video was purchased
      if (videoId && purchasedVideoIds.includes(videoId)) {
        // Remove lock icon
        const lockIcon = card.querySelector(".lock-icon");
        if (lockIcon) {
          lockIcon.remove();
        }

        // Remove custom play icon
        const customPlayIcon = card.querySelector(".custom-play-icon");
        if (customPlayIcon) {
          customPlayIcon.remove();
        }

        // Remove content type badge (-17%)
        const contentTypeBadge = card.querySelector(".content-type-badge");
        if (contentTypeBadge) {
          contentTypeBadge.remove();
        }

        // Update video source to paid version and enable controls
        const video = card.querySelector(".video-player") as HTMLVideoElement;
        if (video) {
          video.setAttribute("controls", "true");
          const paidSrc = video.getAttribute("data-paid-src");
          if (paidSrc) {
            const source = video.querySelector("source");
            if (source) {
              source.src = paidSrc;
              video.load();
            }
          }
        }

        // Hide locked label and pricing
        const lockedLabel = card.querySelector(".locked-label");
        if (lockedLabel) {
          lockedLabel.classList.add("hidden");
        }

        // Hide paid content pricing section
        const paidContentPricing = card.querySelector(".paid-content-pricing");
        if (paidContentPricing) {
          (paidContentPricing as HTMLElement).style.display = "none";
        }

        // Show unlocked badge
        const unlockedBadge = card.querySelector(".unlocked-badge");
        if (unlockedBadge) {
          unlockedBadge.classList.remove("hidden");
          unlockedBadge.classList.add("flex");
        }

        // Hide action button
        const actionButton = card.querySelector(".action-button");
        if (actionButton) {
          actionButton.classList.add("hidden");
        }
      }
    });

    console.log(`Unlocked ${purchasedVideoIds.length} purchased videos`);
  }

  // Function to show paid content pricing for subscribed users
  function showPaidContentPricing() {
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
          (pricingDiv as HTMLElement).style.display = "flex";
          count++;
        }
      }
    });

    console.log(`Showed pricing for ${count} locked paid videos`);
  }

  // Function to show content type badges (Members/-17%) for subscribed users
  function showContentTypeBadges() {
    // Find all content type badges (both membership and paid)
    const badges = document.querySelectorAll('.content-type-badge');

    badges.forEach((badge) => {
      (badge as HTMLElement).style.display = "block";
    });

    console.log(`Showed ${badges.length} content type badges`);
  }

  // Check access on page load and update UI
  checkMembershipAccess().then(
    ({ hasAccess, membership, purchasedContent }) => {
      // Unlock purchased content videos
      if (purchasedContent && purchasedContent.length > 0) {
        unlockPaidContentVideos(purchasedContent);
      }

      if (hasAccess && membership) {
        // Unlock membership videos
        unlockMembershipVideos();

        // Show paid content pricing for subscribed users
        showPaidContentPricing();

        // Show content type badges for subscribed users
        showContentTypeBadges();

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

  // Check for Stripe session success
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  const membershipStatus = urlParams.get("membership");
  const contentPurchaseStatus = urlParams.get("content_purchase");
  const purchasedVideoId = urlParams.get("video_id");

  // Handle successful content purchase
  if (contentPurchaseStatus === "success" && purchasedVideoId) {
    (async () => {
      try {
        // Refresh token to get updated purchased content list
        const token = localStorage.getItem("wmf_access_token");
        if (token) {
          const response = await fetch("/api/auth/verify-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            const data = await response.json();
            const purchasedContent = data.data.purchasedContent || [];
            const purchasedForProfile = purchasedContent
              .filter((pc: any) => pc.profileId === currentProfileId)
              .map((pc: any) => pc.videoId);

            // Unlock the purchased video immediately
            unlockPaidContentVideos(purchasedForProfile);

            // Show success message
            const statusContainer = document.getElementById(
              "membership-status-message"
            );
            const successMsg = document.getElementById("success-message");
            if (statusContainer && successMsg) {
              // Update message for content purchase
              const title = successMsg.querySelector("h3");
              const message = successMsg.querySelector("p");
              if (title) title.textContent = "Content Purchased!";
              if (message)
                message.textContent =
                  "Your content is now unlocked and ready to watch.";

              statusContainer.classList.remove("hidden");
              successMsg.classList.remove("hidden");
              statusContainer.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }
        }

        // Remove query params from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("Error processing content purchase:", error);
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

  // Handle successful Stripe checkout (membership)
  if (sessionId && membershipStatus === "success") {
    (async () => {
      try {
        // Call backend to verify session and get access token
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
          throw new Error("Failed to verify session");
        }

        const data = await response.json();
        const token = data.data.accessToken;

        // Store token in localStorage
        localStorage.setItem("wmf_access_token", token);
        localStorage.setItem("wmf_profile_id", currentProfileId);

        // Unlock membership videos immediately
        unlockMembershipVideos();

        // Show paid content pricing for subscribed users
        showPaidContentPricing();

        // Show content type badges for subscribed users
        showContentTypeBadges();

        // Show success message
        const statusContainer = document.getElementById(
          "membership-status-message"
        );
        const successMsg = document.getElementById("success-message");
        if (statusContainer && successMsg) {
          statusContainer.classList.remove("hidden");
          successMsg.classList.remove("hidden");
          statusContainer.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }

        // Update membership UI
        updateMembershipUI({
          isSubscribed: true,
          isCanceled: false,
          renewalEnabled: true,
          renewalDate: "Feb. 15, 2026", // TODO: Get from API response
          endDate: null,
        });

        // Remove query params from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("Error verifying session:", error);
        alert(
          "Payment successful, but failed to activate membership. Please contact support."
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

      if (!profileId || !membershipPrice) {
        console.error("Missing profile data");
        return;
      }

      // Check if user is logged in
      const token = localStorage.getItem("wmf_access_token");
      if (!token) {
        // User not logged in - redirect to login with redirect URL in query params
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirectUrl}&openStripe=true`;
        return;
      }

      // Open new tab immediately to avoid popup blockers
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
      const token = localStorage.getItem("wmf_access_token");
      if (!token) {
        // User not logged in - redirect to login
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirectUrl}`;
        return;
      }

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

        const currentUrl = window.location.origin + window.location.pathname;
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
              contentPrice: videoData.price,
              successUrl: `${currentUrl}?content_purchase=success&video_id=${videoId}`,
              cancelUrl: `${currentUrl}?content_purchase=canceled`,
              customerEmail,
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
    "wmf_open_stripe_after_login"
  );
  if (shouldOpenStripe === "true") {
    sessionStorage.removeItem("wmf_open_stripe_after_login");

    // Wait a bit for the page to load, then click the CTA button
    setTimeout(() => {
      const btn = document.getElementById("membership-cta-btn");
      if (btn) {
        btn.click();
      }
    }, 500);
  }

  // Handle custom play button clicks
  const customPlayButtons = document.querySelectorAll(".custom-play-icon");
  customPlayButtons.forEach((playButton) => {
    playButton.addEventListener("click", (e) => {
      e.stopPropagation();
      
      const container = (playButton as HTMLElement).closest(".video-container");
      if (!container) return;

      const video = container.querySelector(".video-player") as HTMLVideoElement;
      const lockIcon = container.querySelector(".lock-icon");

      if (video) {
        // Load and play the video
        video.setAttribute("controls", "true");
        video.load();
        video.play().catch((error) => {
          console.error("Error playing video:", error);
        });

        // Hide the custom play icon
        (playButton as HTMLElement).style.display = "none";

        // Hide the lock icon when video starts playing
        if (lockIcon) {
          (lockIcon as HTMLElement).style.display = "none";
        }
      }
    });
  });
}
