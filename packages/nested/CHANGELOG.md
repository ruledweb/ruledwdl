# Changelog

## [0.1.2] - 2026-09-26

### Added
- Attach `data-wdl-comp` component metadata on expanded sub-component root elements to preserve macro references.
- Inherit and propagate `data-wdl-loop` collection keys during macro loop expansion.

## [0.1.1] - 2026-09-26

### Fixed
- A sibling that follows a nested child stays beside that child. The layer serializer was climbing only one level, so the sibling was parsed back inside the child.
