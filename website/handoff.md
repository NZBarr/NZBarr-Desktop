Here’s a short handoff for the website:

The website lives in website/ and is standalone.
We added a screenshot gallery and lightbox click-to-enlarge behavior.
The homepage now features home-page.jpg as the main screenshot.
The gallery page is website/gallery.html.
The lightbox overlay bug was fixed by adding display: none for .lightbox-overlay[hidden] in website/styles.css.
The site now has lighter typography, more professional copy, and sections for:
system requirements
external tools
API keys
drag-and-drop import
screenshots
External helper tools should be described as apps NZBarr calls out to, not as built-in dependencies.
The site is set up for MAMP/local testing before copying to the host.
If we continue later, likely next steps are:
check the gallery visually after the lightbox fix
tighten screenshot captions and spacing
refine the homepage/manual copy further
rename screenshot files to simpler lowercase names if needed for deployment
When you’re back, I’ll pick up from here and continue with the website work.