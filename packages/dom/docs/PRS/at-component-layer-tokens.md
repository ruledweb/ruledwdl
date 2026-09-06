# `@component` layer tokens in `@ruledwdl/state` and `@ruledwdl/dom`

`@ruledwdl/nested` already models `@id` as a macro leaf. State and DOM used an
HTML-tag charset that does not include `@`, so parse/`tree()` hung and
`layers.append('@id')` became `div.div`.

Fixed in `@ruledwdl/state@0.1.4` and `@ruledwdl/dom@0.1.3`: consume `@name` as a
leaf, serialize it back as `@name`, and do not `createElement('@name')`.
