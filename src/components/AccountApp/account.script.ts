import { useTranslations } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";
import { profiles } from "@/data/profiles";
import {
  getAuth,
  clearAuth,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth";

// Type definitions
interface AuthData {
  accessToken: string;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
  };
}

interface Membership {
  profileId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  stripeSubscriptionId: string;
}

interface PurchasedContent {
  profileId: string;
  videoId: string;
  amount: number;
  createdAt: string;
}

export function initAccountPage() {
  // Detect language from URL
  const lang: Language = window.location.pathname.startsWith("/fr")
    ? "fr"
    : "en";
  const translations = useTranslations(lang);

  // Note: Auth utility functions now imported from @/lib/auth

  // Get DOM elements
  const loadingContainer = document.getElementById("loading-container");
  const accountContainer = document.getElementById("account-container");
  const notLoggedIn = document.getElementById("not-logged-in");
  const userEmailEl = document.getElementById("user-email");
  const membershipsList = document.getElementById("memberships-list");
  const noMemberships = document.getElementById("no-memberships");
  const purchasedContentList = document.getElementById(
    "purchased-content-list"
  );
  const noPurchasedContent = document.getElementById("no-purchased-content");
  const logoutBtn = document.getElementById("logout-btn");
  const logoutModal = document.getElementById("logout-modal");
  const modalCancel = document.getElementById("modal-cancel");
  const modalConfirm = document.getElementById("modal-confirm");
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  const deleteAccountModal = document.getElementById("delete-account-modal");
  const deleteModalCancel = document.getElementById("delete-modal-cancel");
  const deleteModalConfirm = document.getElementById("delete-modal-confirm");
  const deleteEmailVerification = document.getElementById(
    "delete-email-verification"
  ) as HTMLInputElement | null;
  const deleteUserEmailDisplay = document.getElementById(
    "delete-user-email-display"
  );

  // Get auth data
  const auth = getAuth();

  if (!auth || !auth.user) {
    // Not logged in
    if (loadingContainer) loadingContainer.classList.add("hidden");
    if (notLoggedIn) notLoggedIn.classList.remove("hidden");
  } else {
    // Logged in - show account info
    if (loadingContainer) loadingContainer.classList.add("hidden");
    if (accountContainer) accountContainer.classList.remove("hidden");

    // Display user info
    if (userEmailEl) userEmailEl.textContent = auth.user.email;

    // Load account data (memberships and purchased content in one call)
    loadAccountData();
  }

  async function handleManageSubscription(event: Event) {
    const button = event.target as HTMLButtonElement;
    const subscriptionId = button.getAttribute("data-subscription-id");

    // Open window immediately (synchronously) to avoid popup blocker
    const newWindow = window.open("", "_blank");

    try {
      // Get user email from auth
      const customerEmail = auth?.user?.email;
      if (!customerEmail) {
        alert(translations.account.membership.loginRequired);
        if (newWindow) newWindow.close();
        return;
      }

      // Call API to create portal session
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          returnUrl: window.location.href,
          ...(subscriptionId && { subscriptionId }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create portal session");
      }

      const data = await response.json();

      // Navigate the opened window to Stripe customer portal
      if (data.url && newWindow) {
        newWindow.location.href = data.url;
      } else {
        if (newWindow) newWindow.close();
        throw new Error("No portal URL received");
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert(translations.account.membership.manageFailed);
      if (newWindow) newWindow.close();
    }
  }

  async function handleManageAllSubscriptions() {
    // Open window immediately (synchronously) to avoid popup blocker
    const newWindow = window.open("", "_blank");

    try {
      // Get user email from auth
      const customerEmail = auth?.user?.email;
      if (!customerEmail) {
        alert(translations.account.membership.loginRequired);
        if (newWindow) newWindow.close();
        return;
      }

      // Call API to create portal session (without subscriptionId for general portal)
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create portal session");
      }

      const data = await response.json();

      // Navigate the opened window to Stripe customer portal
      if (data.url && newWindow) {
        newWindow.location.href = data.url;
      } else {
        if (newWindow) newWindow.close();
        throw new Error("No portal URL received");
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert(translations.account.membership.manageFailed);
      if (newWindow) newWindow.close();
    }
  }

  // Load both memberships and purchased content in a single API call
  async function loadAccountData() {
    if (!auth) return;

    try {
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: auth.accessToken }),
      });

      if (!response.ok) throw new Error("Failed to load account data");

      const data = await response.json();
      const memberships = data.data.memberships || [];
      const purchasedContent = data.data.purchasedContent || [];

      // Load memberships
      loadMemberships(memberships);

      // Load purchased content
      loadPurchasedContent(purchasedContent);
    } catch (error) {
      console.error("Error loading account data:", error);
      if (membershipsList) membershipsList.classList.add("hidden");
      if (noMemberships) noMemberships.classList.remove("hidden");
      if (purchasedContentList) purchasedContentList.classList.add("hidden");
      if (noPurchasedContent) noPurchasedContent.classList.remove("hidden");
    }
  }

  function loadPurchasedContent(purchasedContent: PurchasedContent[]) {
    if (purchasedContent.length === 0) {
      if (purchasedContentList) purchasedContentList.classList.add("hidden");
      if (noPurchasedContent) noPurchasedContent.classList.remove("hidden");
    } else {
      if (purchasedContentList) {
        purchasedContentList.innerHTML = purchasedContent
          .map((pc) => {
            // Get profile and video data for display names
            const profile = profiles[pc.profileId];
            const displayName = profile
              ? profile.displayName[lang]
              : pc.profileId;

            const video = profile?.videos.find((v) => v.id === pc.videoId);
            const videoTitle = video ? video.title[lang] : pc.videoId;

            const dateOptions: Intl.DateTimeFormatOptions = {
              year: "numeric",
              month: "short",
              day: "numeric",
            };
            const purchaseDate = new Date(pc.createdAt).toLocaleDateString(
              lang === "fr" ? "fr-FR" : "en-US",
              dateOptions
            );
            const price = `$${(pc.amount / 100).toFixed(2)}`;
            const profileUrl =
              lang === "fr"
                ? `/fr/creator/${pc.profileId}`
                : `/creator/${pc.profileId}`;

            return `
              <div class="bg-gray-50 rounded-lg p-5">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div class="flex-1">
                    <h3 class="font-semibold text-lg text-gray-900">
                      ${videoTitle}
                    </h3>
                    <p class="text-sm text-gray-600">
                      ${displayName}
                    </p>
                    <p class="text-xs text-gray-500">
                      ${translations.account.purchasedContent.purchasedOn} ${purchaseDate} ${translations.account.purchasedContent.for} ${price}
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <a href="${profileUrl}" class="bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-semibold py-3.5 px-6 rounded-full transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto text-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      ${translations.account.purchasedContent.watchNow}
                    </a>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }
  }

  function loadMemberships(memberships: Membership[]) {
    const manageAllBtn = document.getElementById("manage-all-btn");

    if (memberships.length === 0) {
      if (membershipsList) membershipsList.classList.add("hidden");
      if (noMemberships) noMemberships.classList.remove("hidden");
      if (manageAllBtn) manageAllBtn.style.display = "none";
    } else {
      if (manageAllBtn) manageAllBtn.style.display = "flex";
      if (membershipsList) {
        membershipsList.innerHTML = memberships
          .map((m) => {
            // Get profile data for display name
            const profile = profiles[m.profileId];
            const displayName = profile
              ? profile.displayName[lang]
              : m.profileId;

            const dateOptions: Intl.DateTimeFormatOptions = {
              year: "numeric",
              month: "short",
              day: "numeric",
            };

            // Determine status display
            let statusText = "";
            let statusColor = "";
            let renewalText = "";

            if (m.cancelAtPeriodEnd) {
              // Subscription is set to cancel at period end
              statusText = translations.account.membership.canceling;
              statusColor = "text-orange-600";
              renewalText = `${translations.account.membership.willCancelOn} ${new Date(m.currentPeriodEnd).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", dateOptions)}`;
            } else if (m.status === "active" || m.status === "trialing") {
              // Active subscription
              statusText = translations.account.membership.active;
              statusColor = "text-green-600";
              renewalText = `${translations.account.membership.renews} ${new Date(m.currentPeriodEnd).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", dateOptions)}`;
            } else if (m.status === "canceled") {
              // Fully cancelled
              statusText = m.status;
              statusColor = "text-red-600";
              renewalText = `${translations.account.membership.ends} ${new Date(m.currentPeriodEnd).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", dateOptions)}`;
            } else {
              // Other statuses
              statusText = m.status;
              statusColor = "text-yellow-600";
              renewalText = `${translations.account.membership.renews} ${new Date(m.currentPeriodEnd).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", dateOptions)}`;
            }

            const profileUrl =
              lang === "fr"
                ? `/fr/creator/${m.profileId}`
                : `/creator/${m.profileId}`;

            // Determine button label and icon based on cancel status
            const buttonLabel = m.cancelAtPeriodEnd
              ? translations.account.membership.manageSubscription
              : translations.account.membership.cancelSubscription;

            const buttonIcon = m.cancelAtPeriodEnd
              ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>`
              : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>`;

            return `
              <div class="bg-gray-50 rounded-lg p-5">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div class="flex-1">
                    <h3 class="font-semibold text-lg text-gray-900">
                      ${displayName}
                    </h3>
                    <p class="text-sm text-gray-600">
                      ${translations.account.membership.status}: <span class="${statusColor} font-semibold">${statusText}</span>
                    </p>
                    <p class="text-xs text-gray-500">${renewalText}</p>
                  </div>
                  <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <a href="${profileUrl}" class="bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-semibold py-3.5 px-6 rounded-full transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      ${translations.account.membership.viewProfile}
                    </a>
                    <button class="manage-membership-btn bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 whitespace-nowrap text-xs" data-subscription-id="${m.stripeSubscriptionId}">
                      ${buttonIcon}
                      ${buttonLabel}
                    </button>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");

        // Add event listeners to all manage buttons
        const manageBtns = document.querySelectorAll(".manage-membership-btn");
        manageBtns.forEach((btn) => {
          btn.addEventListener("click", handleManageSubscription);
        });
      }
    }
  }

  // Modal functions
  function openModal() {
    if (logoutModal) {
      logoutModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal() {
    if (logoutModal) {
      logoutModal.classList.add("hidden");
      document.body.style.overflow = "unset";
    }
  }

  function openDeleteModal() {
    if (deleteAccountModal) {
      deleteAccountModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      // Populate user email in modal
      if (deleteUserEmailDisplay && auth?.user?.email) {
        deleteUserEmailDisplay.textContent = auth.user.email;
      }

      // Reset verification input and disable confirm button
      if (deleteEmailVerification) {
        deleteEmailVerification.value = "";
      }
      if (deleteModalConfirm) {
        (deleteModalConfirm as HTMLButtonElement).disabled = true;
      }
    }
  }

  function closeDeleteModal() {
    if (deleteAccountModal) {
      deleteAccountModal.classList.add("hidden");
      document.body.style.overflow = "unset";

      // Clear verification input
      if (deleteEmailVerification) {
        deleteEmailVerification.value = "";
      }
    }
  }

  // Logout button click
  if (logoutBtn) {
    logoutBtn.addEventListener("click", openModal);
  }

  // Modal cancel button
  if (modalCancel) {
    modalCancel.addEventListener("click", closeModal);
  }

  // Modal confirm button
  if (modalConfirm) {
    modalConfirm.addEventListener("click", async () => {
      try {
        // Call logout API
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });
        }
      } catch (error) {
        console.error("Error during logout:", error);
      }

      // Clear local auth data
      clearAuth();

      // Redirect to home
      window.location.href = lang === "fr" ? "/fr" : "/";
    });
  }

  // Close modal on backdrop click
  if (logoutModal) {
    logoutModal.addEventListener("click", (e) => {
      if (e.target === logoutModal) {
        closeModal();
      }
    });
  }

  // Delete account button click
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", openDeleteModal);
  }

  // Delete modal cancel button
  if (deleteModalCancel) {
    deleteModalCancel.addEventListener("click", closeDeleteModal);
  }

  // Email verification input - enable/disable confirm button
  if (deleteEmailVerification && deleteModalConfirm) {
    deleteEmailVerification.addEventListener("input", (e) => {
      const inputValue = (e.target as HTMLInputElement).value.trim();
      const userEmail = auth?.user?.email || "";

      // Enable button only if input matches user email exactly
      if (inputValue === userEmail) {
        (deleteModalConfirm as HTMLButtonElement).disabled = false;
      } else {
        (deleteModalConfirm as HTMLButtonElement).disabled = true;
      }
    });
  }

  // Delete modal confirm button
  if (deleteModalConfirm) {
    deleteModalConfirm.addEventListener("click", async () => {
      const originalText = deleteModalConfirm.textContent;
      (deleteModalConfirm as HTMLButtonElement).disabled = true;
      deleteModalConfirm.textContent =
        translations.account.deleteAccountModal.deleting;

      try {
        if (!auth) throw new Error("Not authenticated");

        // Call delete account API
        const response = await fetch("/api/auth/delete-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: auth.user.id,
            confirmDelete: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete account");
        }

        // Clear local auth data
        clearAuth();

        // Store success message in sessionStorage for toast
        sessionStorage.setItem(
          "toast_message",
          translations.account.deleteAccountModal.success
        );
        sessionStorage.setItem("toast_type", "success");

        // Redirect to home
        window.location.href = lang === "fr" ? "/fr" : "/";
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(translations.account.deleteAccountModal.error);

        // Re-enable button
        (deleteModalConfirm as HTMLButtonElement).disabled = false;
        deleteModalConfirm.textContent = originalText;
      }
    });
  }

  // Close delete modal on backdrop click
  if (deleteAccountModal) {
    deleteAccountModal.addEventListener("click", (e) => {
      if (e.target === deleteAccountModal) {
        closeDeleteModal();
      }
    });
  }

  // Close modals on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (logoutModal && !logoutModal.classList.contains("hidden")) {
        closeModal();
      }
      if (
        deleteAccountModal &&
        !deleteAccountModal.classList.contains("hidden")
      ) {
        closeDeleteModal();
      }
    }
  });

  // Manage All Subscriptions button
  const manageAllBtn = document.getElementById("manage-all-btn");
  if (manageAllBtn) {
    manageAllBtn.addEventListener("click", handleManageAllSubscriptions);
  }
}
