# Skill: Vietnamese Static Utility Site

## Purpose
This skill guides AI agents to build and maintain multi-page static utility websites for Vietnamese users.

## Scope
- HTML, CSS, JavaScript static-only implementations.
- Mobile-first UI/UX for fast daily utilities.
- GitHub Pages friendly deployment.

## Design Rules
1. Keep labels and copy in Vietnamese.
2. Priortize common tasks: fewer fields, immediate results.
3. Use consistent navigation and button styles across pages.
4. Keep all utilities client-side and privacy-friendly.
5. Meet baseline accessibility:
    - semantic headings
    - visible focus states
    - aria-live for dynamic outputs
    - tap targets suitable for mobile
  
## Information Architecture
- One utility topic per page.
- Global header + footer reused across pages.

## Perfomance Rules
- No heavy frameworks for initial release.
- Keep CSS and JS modular.
- Avoid external dependencies unless necessary.

## Release Checklist
1. Verify all links and navigation states.
2. Validate utility outputs with manual test cases.
3. Update CHANGELOG.md.
4. Confirm robots.txt and sitemap.xml.
5. Push to main branch and verify GitHub Pages workflow success.
