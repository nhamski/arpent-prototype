import { useState, useCallback, useMemo } from 'react';
import { useStoredState } from '../hooks/useStoredState.js';
import './PricingPanel.css';

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '';
const BASE_TRIAL_DAYS = 30;
const MAX_TRIAL_DAYS = 90;
const REVIEW_BONUS = 30;
const REFERRAL_BONUS = 30;
const MIN_REVIEW_WORDS = 50;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[(Math.random() * chars.length) | 0];
  return code;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function daysSince(ts) {
  if (!ts) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}

const DEFAULT_TRIAL = {
  startedAt: null,
  reviewSubmitted: false,
  reviewText: '',
  referralCode: '',
  referralCount: 0,
  plan: null,
};

export function useTrialState() {
  const [trial, setTrial] = useStoredState('arpent.trial', DEFAULT_TRIAL);

  const state = useMemo(() => {
    const started = trial.startedAt || Date.now();
    const reviewBonus = trial.reviewSubmitted ? REVIEW_BONUS : 0;
    const referralBonus = Math.min(trial.referralCount, 1) * REFERRAL_BONUS;
    const totalEarned = Math.min(BASE_TRIAL_DAYS + reviewBonus + referralBonus, MAX_TRIAL_DAYS);
    const elapsed = daysSince(started);
    const remaining = Math.max(0, totalEarned - elapsed);
    const code = trial.referralCode || generateCode();

    return {
      ...trial,
      startedAt: started,
      referralCode: code,
      totalEarned,
      remaining,
      elapsed,
      isActive: trial.plan || remaining > 0,
      isPaid: trial.plan === 'monthly' || trial.plan === 'lifetime',
      isLifetime: trial.plan === 'lifetime',
    };
  }, [trial]);

  return [state, setTrial];
}

export default function PricingPanel({ onClose, user }) {
  const [trial, setTrial] = useTrialState();
  const [reviewText, setReviewText] = useState(trial.reviewText || '');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const wordCount = useMemo(() => countWords(reviewText), [reviewText]);
  const canSubmit = wordCount >= MIN_REVIEW_WORDS && !trial.reviewSubmitted;

  const startTrial = useCallback(() => {
    setTrial((prev) => ({
      ...prev,
      startedAt: prev.startedAt || Date.now(),
      referralCode: prev.referralCode || generateCode(),
    }));
  }, [setTrial]);

  const handleReviewSubmit = useCallback(() => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      setTrial((prev) => ({
        ...prev,
        startedAt: prev.startedAt || Date.now(),
        reviewSubmitted: true,
        reviewText: reviewText,
      }));
      setSubmitting(false);
    }, 600);
  }, [canSubmit, reviewText, setTrial]);

  const handleCopy = useCallback(() => {
    const link = `${window.location.origin}${window.location.pathname}?ref=${trial.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [trial.referralCode]);

  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${trial.referralCode}`;
  const progressPct = Math.round((trial.totalEarned / MAX_TRIAL_DAYS) * 100);

  return (
    <div className="pricing-overlay">
      <div className="pricing-inner">

        <button className="pricing-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Trial Progress */}
        {!trial.isPaid && (
          <div className="trial-banner">
            <div className="trial-label">Free Trial</div>
            <div className="trial-days">
              {trial.totalEarned} <span className="trial-max">/ {MAX_TRIAL_DAYS} days earned</span>
            </div>
            <div className="trial-sub">
              {trial.remaining > 0
                ? `${trial.remaining} days remaining`
                : 'Trial expired'}
            </div>
            <div className="trial-track">
              <div className="trial-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {trial.isPaid && (
          <div className="trial-banner">
            <div className="trial-label">Your Plan</div>
            <div className="trial-days">
              {trial.isLifetime ? 'Lifetime Pro' : 'Monthly'}
            </div>
            <div className="trial-sub">
              {trial.isLifetime ? 'Unlimited access — forever' : '$10/mo — cancel anytime'}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="sh">Choose Your Plan</div>

        <div className="plan-grid">
          {/* Monthly */}
          <div className="plan-card">
            <div className="plan-name">Monthly</div>
            <div className="plan-price">
              <span className="plan-amount">$10</span>
              <span className="plan-period"> / month</span>
            </div>
            <div className="plan-desc">
              Flexible — cancel anytime, no contract.
            </div>
            <ul className="plan-features">
              <li>Full herd tracking</li>
              <li>Live USDA market data</li>
              <li>Pasture & forage tools</li>
              <li>Offline-first PWA</li>
              <li>All future updates</li>
            </ul>
            <button
              className="plan-btn plan-btn-outline"
              onClick={() => setTrial((p) => ({ ...p, plan: 'monthly' }))}
            >
              {trial.plan === 'monthly' ? 'Current Plan' : 'Start Monthly'}
            </button>
          </div>

          {/* Lifetime */}
          <div className="plan-card plan-card-featured">
            <div className="plan-badge">Best Value</div>
            <div className="plan-name">Lifetime Pro</div>
            <div className="plan-price">
              <span className="plan-amount">$499</span>
              <span className="plan-period"> one-time</span>
            </div>
            <div className="plan-desc">
              Pay once, own it forever. Like buying a good tool — it pays for itself.
            </div>
            <div className="premium-perk">
              <span className="premium-perk-icon">📞</span>
              <span className="premium-perk-text">
                <strong>Direct line to the developer.</strong> Call or text for support, feedback, or feature requests.
                {trial.isLifetime && SUPPORT_PHONE && (
                  <> Your line: <strong>{SUPPORT_PHONE}</strong></>
                )}
              </span>
            </div>
            <ul className="plan-features">
              <li>Everything in Monthly</li>
              <li>Zero subscription fees</li>
              <li>Lifetime updates included</li>
              <li>Direct phone/text support</li>
              <li>Priority feature requests</li>
            </ul>
            <button
              className="plan-btn plan-btn-solid"
              onClick={() => setTrial((p) => ({ ...p, plan: 'lifetime' }))}
            >
              {trial.plan === 'lifetime' ? 'Current Plan' : 'Get Lifetime Access'}
            </button>
          </div>
        </div>

        <div className="guarantee">
          <strong>No credit card required to start.</strong> Try everything free for {BASE_TRIAL_DAYS} days — earn up to {MAX_TRIAL_DAYS}.
        </div>

        {/* Earn More Free Days */}
        {!trial.isPaid && (
          <>
            <div className="sh">Earn More Free Days</div>

            {/* Review Widget */}
            <div className="earn-card">
              <div className="earn-header">
                <div className="earn-icon earn-icon-review">📝</div>
                <div>
                  <div className="earn-title">Write a Review</div>
                  <div className="earn-sub">
                    Share how Arpent works in the pasture or sale barn.
                  </div>
                  <div className="earn-reward">+{REVIEW_BONUS} free days</div>
                </div>
              </div>

              {trial.reviewSubmitted ? (
                <div className="review-done">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Review submitted — {REVIEW_BONUS} bonus days added
                </div>
              ) : (
                <>
                  <textarea
                    className="review-area"
                    placeholder="Tell us how Arpent helps you manage your operation. What do you use most — herd tracking, market data, pasture rotation? (50 words minimum)"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="review-footer">
                    <span className={`word-count ${wordCount >= MIN_REVIEW_WORDS ? 'word-count-ok' : ''}`}>
                      {wordCount} / {MIN_REVIEW_WORDS} words
                    </span>
                    <button
                      className="review-submit"
                      disabled={!canSubmit || submitting}
                      onClick={handleReviewSubmit}
                    >
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Referral Widget */}
            <div className="earn-card">
              <div className="earn-header">
                <div className="earn-icon earn-icon-refer">🤝</div>
                <div>
                  <div className="earn-title">Refer a Friend</div>
                  <div className="earn-sub">
                    When they purchase a plan, you both earn free days.
                  </div>
                  <div className="earn-reward">+{REFERRAL_BONUS} free days per paying referral</div>
                </div>
              </div>

              <div className="referral-field">
                <input
                  className="referral-input"
                  value={referralLink}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className={`copy-btn ${copied ? 'copy-btn-copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {trial.referralCount > 0 && (
                <div className="referral-status">
                  {trial.referralCount} referral{trial.referralCount !== 1 ? 's' : ''} converted
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
