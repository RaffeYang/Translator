# GitHub / Reddit scoped translation

Goal: Translate only GitHub repository README and Description, and Reddit post titles and bodies.
Architecture: Add strict siteRules with dedicated roots and selectors. Preserve universal=false and X behavior. Allow only explicitly selected GitHub descriptions through the sidebar filter.

- [x] Update static validation to require both sites and strict extraction boundaries; run and observe missing-rule failure.
- [x] Add GitHub README/Description and modern/legacy Reddit post selectors. Exclude comments and code. Add narrowly scoped sidebar exception.
- [x] Update README and version; run Node syntax and static validation. Inspect changes. Live AdGuard verification remains separate.
