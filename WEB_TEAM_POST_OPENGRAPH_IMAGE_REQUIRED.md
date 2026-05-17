# Web Team — Post Share Preview Missing Logo

## Issue

When a user shares a SoundBridge post to WhatsApp (or any platform that reads OpenGraph tags), the link preview card shows no image. The SoundBridge logo / post thumbnail is expected to appear in the preview but is blank.

Example share URL:
```
https://soundbridge.live/post/<post_id>
```

---

## Root cause

The `soundbridge.live/post/[id]` page is missing OpenGraph meta tags, specifically `og:image`. Without it, WhatsApp and other platforms have no image to show in the link preview card.

---

## Action required

Add the following `<meta>` tags to the `<head>` of every `soundbridge.live/post/[id]` page (server-rendered or via a dynamic meta tag approach):

```html
<!-- Required for all post pages -->
<meta property="og:title" content="<post author's display name> on SoundBridge" />
<meta property="og:description" content="<first 150 chars of post content>" />
<meta property="og:image" content="https://soundbridge.live/og-logo.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://soundbridge.live/post/<post_id>" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="SoundBridge" />

<!-- Twitter / X card (also used by WhatsApp for fallback) -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://soundbridge.live/og-logo.png" />
```

### Better: use the post's cover image when available

If the post has an `image_url`, use that instead of the static logo so the preview is more engaging:

```html
<meta property="og:image" content="<post.image_url ?? 'https://soundbridge.live/og-logo.png'>" />
```

---

## Static fallback image

`/og-logo.png` (or equivalent) should be a **1200×630px** PNG of the SoundBridge logo on a dark background. This is the standard OG image size for WhatsApp, iMessage, Twitter, and Slack previews.

If this file doesn't exist yet, it needs to be created and placed at a publicly accessible URL.

---

## Verification

After deploying, test with:
- **WhatsApp**: paste `https://soundbridge.live/post/<any_post_id>` into a chat — the preview card should show the logo/image, title, and description within 1–2 minutes (WhatsApp caches previews; use a fresh post ID to bypass cache).
- **Facebook Sharing Debugger**: `https://developers.facebook.com/tools/debug/` — enter the post URL to inspect OG tags and force a cache refresh.
- **Twitter Card Validator**: `https://cards-dev.twitter.com/validator`

---

## Priority

Medium — this affects every post shared externally. The share text and URL work correctly; only the visual preview card is missing.
