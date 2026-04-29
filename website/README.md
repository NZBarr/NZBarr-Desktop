# NZBarr Website

This folder contains the public NZBarr marketing site for `nzbarr.com`.

## What It Covers

- what NZBarr is
- how the desktop app works
- pricing for Free, Yearly, and Lifetime
- manuals and how-to content
- FAQ content for new users
- the cross-platform support story
- the licensing/backend split for production

## Hosting

Most of the site is static HTML/CSS/JS, but the `payment-complete` flow now posts to a small PHP endpoint so the server can send the email directly.

That means the website should be hosted on a PHP-capable server such as:

- an apache host with PHP enabled
- an nginx host with PHP-FPM
- a shared host like Namecheap that supports PHP

## Local Development

- Point MAMP at the `website/` folder to test the site in a browser, including the `api/license-request.php` endpoint.
- Copy `website/api/config.sample.php` to `website/api/config.php` on the server and fill in the SMTP mailbox password before testing the payment form.
- Keep `website/api/config.php` private and out of any public upload or source control.
- Keep images and other assets inside `website/assets/` so the site remains self-contained.
- When you are happy with the result, copy the full `website/` folder to the server.

## Suggested Domain Layout

- `nzbarr.com` for the marketing site
- `license.nzbarr.com` for the license API

## Content Notes

- Replace the placeholder purchase links with your real checkout or sales pages when ready.
- Update the FAQ and manuals as the app changes.
- The site is intentionally built with plain HTML/CSS/JS, with one small PHP endpoint for the payment form.

## Notes

- The site is intentionally dependency-light.
- The design uses only HTML, CSS, JavaScript, and one PHP endpoint for email delivery.
- The color direction matches the app: dark, champagne, and gold accents.
- The site currently uses `noindex` headers/meta tags because it is still being prepared and tested.
