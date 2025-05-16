[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / XmlMatcherChunk

# Interface: XmlMatcherChunk

Defined in: [utils/xml-matcher.ts:7](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L7)

Represents a chunk of text processed by XmlMatcher, indicating whether
it was part of the matched XML tag's content or outside of it.

## Properties

### data

> **data**: `string`

Defined in: [utils/xml-matcher.ts:11](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L11)

The text content of this chunk.

***

### matched

> **matched**: `boolean`

Defined in: [utils/xml-matcher.ts:9](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/utils/xml-matcher.ts#L9)

True if this chunk was inside the matched XML tag, false otherwise.
