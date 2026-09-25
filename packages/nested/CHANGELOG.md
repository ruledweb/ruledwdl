# Changelog

## [0.1.1] - 2026-09-26

### Fixed
- A sibling that follows a nested child stays beside that child. The layer serializer was climbing only one level, so the sibling was parsed back inside the child.
