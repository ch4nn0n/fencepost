# Changelog

## [0.4.0](https://github.com/ch4nn0n/fencepost/compare/v0.3.0...v0.4.0) (2026-07-09)


### Features

* **presets:** allow Skill and ToolSearch in claude preset ([8b89844](https://github.com/ch4nn0n/fencepost/commit/8b898447d1ee4ce18d88830ef1246c15f1d1a1ec))


### Bug Fixes

* isolate config tests from the real user config ([e7cf92d](https://github.com/ch4nn0n/fencepost/commit/e7cf92db072620c93730b304f0752951d68707b4))

## [0.3.0](https://github.com/ch4nn0n/fencepost/compare/v0.2.0...v0.3.0) (2026-07-09)


### Features

* **presets:** allow Explore agent in claude preset ([0422251](https://github.com/ch4nn0n/fencepost/commit/0422251d297f4a3a96f168aad16a304149e24ab4))
* unwrap xargs and evaluate its command ([21a67bf](https://github.com/ch4nn0n/fencepost/commit/21a67bf053018de98e6cfd39891ffc8e405a8faf))

## [0.2.0](https://github.com/ch4nn0n/fencepost/compare/v0.1.1...v0.2.0) (2026-07-08)


### Features

* add config JSON schema and docs reference ([7a2ecb7](https://github.com/ch4nn0n/fencepost/commit/7a2ecb7420857fccf93381b1a6dcf845133cc385))


### Bug Fixes

* **plugin:** use ${CLAUDE_PLUGIN_ROOT} for hook and CLI paths ([bcc8e77](https://github.com/ch4nn0n/fencepost/commit/bcc8e770656886dcba830f695180a9049af6c659))

## [0.1.1](https://github.com/ch4nn0n/fencepost/compare/v0.1.0...v0.1.1) (2026-07-08)


### Bug Fixes

* **plugin:** restructure skills so the plugin manifest validates ([91719f9](https://github.com/ch4nn0n/fencepost/commit/91719f92ec13f1f841fb7a0ba4ff7205386ff7ad))

## 0.1.0 (2026-07-08)


### Features

* add app icon matching the fencepost favicon ([593e5cb](https://github.com/ch4nn0n/fencepost/commit/593e5cb086b107c3350d10dedc414f069e79d5ef))
* add gh and playwright presets, /preset and /contribute-preset skills ([757ce40](https://github.com/ch4nn0n/fencepost/commit/757ce403f82f6652681e23cccc3bb9872578ea41))
* add importable presets and align doc drift ([e89b36f](https://github.com/ch4nn0n/fencepost/commit/e89b36f5ea7bb2172bb494ca12d9e06ba9f2ef70))
* add plugin marketplace manifest ([ad015e1](https://github.com/ch4nn0n/fencepost/commit/ad015e15ba927ef9ba41cd47ebe676c3693bd1ad))
* add plugin packaging, tests, and sample fixtures ([c96b376](https://github.com/ch4nn0n/fencepost/commit/c96b376651ea43e72199e0b011c5d71ef7952389))
* add secrets protection via external scanners ([ff6d936](https://github.com/ch4nn0n/fencepost/commit/ff6d936ed5853fe4f275582a967639b58df50720))
* claude-web + filesystem presets, and shell loop/conditional handling ([bde2796](https://github.com/ch4nn0n/fencepost/commit/bde279628b155b5b28ca301c3c342475cfa9a5b7))
* commit fully to the AST bash path (features 19/20/21) ([11ea9b3](https://github.com/ch4nn0n/fencepost/commit/11ea9b3a327133527eeeb9ea62ae70931d95df7d))
* configurable onError posture, fail-closed config, verify command ([69332f9](https://github.com/ch4nn0n/fencepost/commit/69332f9401c5a2eba534d8aa3435a891bc76ada0))
* implement core evaluation pipeline and audit skill ([f635bdb](https://github.com/ch4nn0n/fencepost/commit/f635bdb06a6a4b5c9a8b6f41b5fdc364d5e1488f))
* offer manual-run escape hatch on Bash deny (feature 23) ([6459af6](https://github.com/ch4nn0n/fencepost/commit/6459af6cf96b7f03f15165a58012ce91b2b377d0))
* **presets:** split python-safety per language, widen coverage ([cc4d342](https://github.com/ch4nn0n/fencepost/commit/cc4d3424ef15460f682fae6360ab12f2027435a4))
* scaffold project with types, logger, and utilities ([ea69171](https://github.com/ch4nn0n/fencepost/commit/ea69171ffbdd0e99fc488a21ee5572b6424feb68))
* **secrets:** add betterleaks scanner and raise default scan timeout ([b48b7c4](https://github.com/ch4nn0n/fencepost/commit/b48b7c4d40e09389b4de849585302bee134af22a))
* **secrets:** fail closed when a pinned scanner is unavailable ([c93860f](https://github.com/ch4nn0n/fencepost/commit/c93860ff81b1c22a61682b93cf47749762697635))
* **secrets:** keep version-compat and latency docs in sync automatically ([7661e4f](https://github.com/ch4nn0n/fencepost/commit/7661e4f714e9b2657e01ab87d20bb2f856b01136))
* session guidance, temp sandbox, claude preset, discourage chaining ([c5fa8fe](https://github.com/ch4nn0n/fencepost/commit/c5fa8fec8767c3c80797241117875eb159eab7fd))


### Bug Fixes

* **bash:** canonicalise commands before matching to close quoting bypass ([4a67b0e](https://github.com/ch4nn0n/fencepost/commit/4a67b0eb94b86d0da335844fb9526fe55a5fed16))
* **bash:** evaluate shell-wrapper bodies (sh -c / bash -c / eval) ([1cbf791](https://github.com/ch4nn0n/fencepost/commit/1cbf791bfc76ea99c6c8a0a5a64f8ed4f0730505))
* **bash:** unquote redirect targets so containment can't be bypassed ([ba31cee](https://github.com/ch4nn0n/fencepost/commit/ba31cee3131066893c3b3a0115df9ccc89b7dace))
* **ci:** make the ordering guard noise-robust on shared runners ([a7ec55a](https://github.com/ch4nn0n/fencepost/commit/a7ec55a015bc3847ae417070352551cf19300fa3))
* make the bundle reproducible across machines ([2768dde](https://github.com/ch4nn0n/fencepost/commit/2768dde92978ddcab81537bdaa111a3228ee57a3))
* remove dangling PostToolUse hook registration ([0e9b6c1](https://github.com/ch4nn0n/fencepost/commit/0e9b6c19c2a1b73805f86e71a2801919d05704a2))
* **secrets:** fail closed on the output path so scan failures can't leak ([b3e7498](https://github.com/ch4nn0n/fencepost/commit/b3e7498bfb7a7f197221d5f8f5be25bdfc417a01))
* **secrets:** widen trufflehog version compatibility ([7ad4d1e](https://github.com/ch4nn0n/fencepost/commit/7ad4d1e9527e5b5bd6fd907c4a8da92169dc4738))
