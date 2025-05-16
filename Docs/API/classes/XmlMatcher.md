[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / XmlMatcher

# Class: XmlMatcher\<Result\>

Defined in: [utils/xml-matcher.ts:25](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L25)

A utility class to find and extract content within a specific XML tag from a stream of text.
It processes text chunks incrementally and yields segments, marking whether each segment
was inside or outside the specified XML tag.

Example: Given tagName 'think', and input "Some text <think>this is a thought</think> and more text.",
it would yield:
- { matched: false, data: "Some text " }
- { matched: true, data: "this is a thought" }
- { matched: false, data: " and more text." }

## Type Parameters

### Result

`Result` = [`XmlMatcherChunk`](../interfaces/XmlMatcherChunk.md)

## Constructors

### Constructor

> **new XmlMatcher**\<`Result`\>(`tagName`, `transform`?, `position`?): `XmlMatcher`\<`Result`\>

Defined in: [utils/xml-matcher.ts:44](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L44)

Constructs an XmlMatcher.

#### Parameters

##### tagName

`string`

The name of the XML tag to match (e.g., "think").

##### transform?

(`chunk`) => `Result`

An optional function to transform the yielded XmlMatcherChunk into a custom Result type.

##### position?

`number` = `0`

The character position in the input stream at which matching should begin.
                If 0, matching starts immediately. If greater than 0, characters before this
                position are treated as unmatched text until the tag is encountered at or after
                this position. This is useful if the tag is expected after some preamble.
                The example code had `this.pointer <= this.position + 1 || this.matched`
                which implies matching can start if we are at/before the desired start position OR if we are already in a matched state.

#### Returns

`XmlMatcher`\<`Result`\>

## Properties

### position

> `readonly` **position**: `number` = `0`

Defined in: [utils/xml-matcher.ts:47](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L47)

The character position in the input stream at which matching should begin.
                If 0, matching starts immediately. If greater than 0, characters before this
                position are treated as unmatched text until the tag is encountered at or after
                this position. This is useful if the tag is expected after some preamble.
                The example code had `this.pointer <= this.position + 1 || this.matched`
                which implies matching can start if we are at/before the desired start position OR if we are already in a matched state.

***

### tagName

> `readonly` **tagName**: `string`

Defined in: [utils/xml-matcher.ts:45](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L45)

The name of the XML tag to match (e.g., "think").

***

### transform()?

> `readonly` `optional` **transform**: (`chunk`) => `Result`

Defined in: [utils/xml-matcher.ts:46](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L46)

An optional function to transform the yielded XmlMatcherChunk into a custom Result type.

#### Parameters

##### chunk

[`XmlMatcherChunk`](../interfaces/XmlMatcherChunk.md)

#### Returns

`Result`

## Methods

### final()

> **final**(`chunk`?): `Result`[]

Defined in: [utils/xml-matcher.ts:181](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L181)

Finalizes processing, flushing any remaining buffered text.

#### Parameters

##### chunk?

`string`

An optional final text chunk to process.

#### Returns

`Result`[]

An array of transformed results.

***

### update()

> **update**(`chunk`): `Result`[]

Defined in: [utils/xml-matcher.ts:98](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L98)

Processes an incoming chunk of text.

#### Parameters

##### chunk

`string`

The text chunk to process.

#### Returns

`Result`[]

An array of transformed results based on the matched segments.
