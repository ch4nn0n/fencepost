# Changelog

## [0.12.0](https://github.com/ch4nn0n/fencepost/compare/v0.11.0...v0.12.0) (2026-07-20)


### Features

* **config:** add 'user' reserved import token ([8ab2ec0](https://github.com/ch4nn0n/fencepost/commit/8ab2ec0d7fc3402a3051369efe5ca4823214325f))
* **presets:** allow AskUserQuestion in claude preset ([c4b523e](https://github.com/ch4nn0n/fencepost/commit/c4b523ef7fccfbafc9dde84b74944e0cd8286310))
* **presets:** allow base64 in filesystem preset ([06f5ec7](https://github.com/ch4nn0n/fencepost/commit/06f5ec7addbe7d2c05e2eafe8caecd9bbc04e5a4))
* **presets:** allow Monitor in claude preset ([7c2d54b](https://github.com/ch4nn0n/fencepost/commit/7c2d54b071cd1c50d819a8561d7e6547ea24227f))


### Bug Fixes

* **deps:** bump js-yaml to 4.3.0 ([35aca16](https://github.com/ch4nn0n/fencepost/commit/35aca1602d7e4fbf00affa50a3f58c444ce05ed3))
* **path-match:** resolve symlinks in sandbox containment checks ([b97c9b0](https://github.com/ch4nn0n/fencepost/commit/b97c9b0bbff9a2f0faca773455b31ba2c5a76900))

## [0.11.0](https://github.com/ch4nn0n/fencepost/compare/v0.10.0...v0.11.0) (2026-07-20)


### Features

* **filesystem:** allow bash -n / sh -n syntax checks ([8a4fe2f](https://github.com/ch4nn0n/fencepost/commit/8a4fe2fb1810ef9e391fd9db2d738bd074e48898))
* **helmfile:** strip more connection/behaviour flags in normalise ([633d246](https://github.com/ch4nn0n/fencepost/commit/633d24682fdab2110db6dfd122f658ac14a2095d))
* **skills:** add fencepost-config skill for setup and rule tuning ([98870c7](https://github.com/ch4nn0n/fencepost/commit/98870c7b806826a40cb35a3c6f6b1ad5491b8d87))


### Bug Fixes

* **output:** colour the ask-prompt bullet to match Fencepost ochre ([252882b](https://github.com/ch4nn0n/fencepost/commit/252882b1206a56b6b837f6ffa84b33b028a65b77))
* **output:** don't double the full stop before the deny alternative ([60dd65b](https://github.com/ch4nn0n/fencepost/commit/60dd65b32567ad3e09f9962717e676b5e294aa09))
* **skills:** correct evaluate guidance in fencepost-preset ([5c8f4fd](https://github.com/ch4nn0n/fencepost/commit/5c8f4fd8b66b7dc600516481d789561428993373))

## [0.10.0](https://github.com/ch4nn0n/fencepost/compare/v0.9.0...v0.10.0) (2026-07-17)


### Features

* **output:** bold ochre "Fencepost:" prefix on permission reasons ([ac784ee](https://github.com/ch4nn0n/fencepost/commit/ac784eede7807602f1e3e81f43afaeb5eb98f3e7))


### Bug Fixes

* **output:** use bullet list for ask reason regardless of part count ([98d4e85](https://github.com/ch4nn0n/fencepost/commit/98d4e85ea242d588657891b45e91aa42c6528e41))

## [0.9.0](https://github.com/ch4nn0n/fencepost/compare/v0.8.0...v0.9.0) (2026-07-16)


### Features

* **git preset:** normalise away -C &lt;path&gt; flag ([08328c1](https://github.com/ch4nn0n/fencepost/commit/08328c16ab89773fbd55be5d0aea5d5ea0414da3))
* **output:** point permission prompts at the parts needing review ([3181563](https://github.com/ch4nn0n/fencepost/commit/3181563fe42ab96cc9b8dd7ab46fd50273e45644))
* **presets:** trust fencepost's own audit/verify/evaluate invocations ([b727286](https://github.com/ch4nn0n/fencepost/commit/b727286db9e130acfcf3c74053ecfef639900ab2))


### Bug Fixes

* **test:** handle optional permissionDecisionReason in truncation test ([52a9c7f](https://github.com/ch4nn0n/fencepost/commit/52a9c7f401d547a2bcb3b33185cb2384a0a291c9))

## [0.8.0](https://github.com/ch4nn0n/fencepost/compare/v0.7.0...v0.8.0) (2026-07-16)


### Features

* **audit:** centralise audit log at user level ([d6a2499](https://github.com/ch4nn0n/fencepost/commit/d6a2499534623f0382eb2912b539dc43ef5ee070))

## [0.7.0](https://github.com/ch4nn0n/fencepost/compare/v0.6.0...v0.7.0) (2026-07-14)


### Features

* **config:** add 'all' import token to enable every bundled preset ([c6d4929](https://github.com/ch4nn0n/fencepost/commit/c6d4929b83c9e6364a33993dfd954842a6b431e1))

## [0.6.0](https://github.com/ch4nn0n/fencepost/compare/v0.5.0...v0.6.0) (2026-07-14)


### Features

* **presets:** allow TaskStop in claude preset ([ca96a84](https://github.com/ch4nn0n/fencepost/commit/ca96a84c7bf3e8f9a8e7c44e1531834714c382fc))


### Bug Fixes

* emit explicit allow and align docs with code ([0993947](https://github.com/ch4nn0n/fencepost/commit/0993947bdb99b1189a7c4413cacd14086dee5d25))

## [0.5.0](https://github.com/ch4nn0n/fencepost/compare/v0.4.1...v0.5.0) (2026-07-10)


### Features

* **presets:** allow Agent in claude preset ([65df7ae](https://github.com/ch4nn0n/fencepost/commit/65df7ae2b6aa6355dcbcc037f0de71a29663056f))

## [0.4.1](https://github.com/ch4nn0n/fencepost/compare/v0.4.0...v0.4.1) (2026-07-10)


### Bug Fixes

* flush audit log before process exit ([d5fb82f](https://github.com/ch4nn0n/fencepost/commit/d5fb82f7af22f23e87d2f7b8a689dc069277b8bf))

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
