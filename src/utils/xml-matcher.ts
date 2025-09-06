/**
 * @module utils/xml-matcher
 * Provides a utility class for incrementally parsing and extracting content
 * from XML-like text streams. It's designed to be robust against malformed or
 * incomplete XML.
 */

/**
 * Represents a chunk of text processed by {@link XmlMatcher}, indicating whether
 * it was part of the matched XML tag's content or outside of it.
 *
 * @interface XmlMatcherChunk
 */
export interface XmlMatcherChunk {
  /**
   * True if this chunk was inside the matched XML tag, false otherwise.
   * @property {boolean} matched
   */
  matched: boolean;
  /**
   * The text content of this chunk.
   * @property {string} data
   */
  data: string;
}

/**
 * A utility class to find and extract content within a specific XML tag from a stream of text.
 *
 * @remarks
 * It processes text chunks incrementally and yields segments, marking whether each segment
 * was inside or outside the specified XML tag.
 *
 * @example
 * // Given tagName 'think', and input "Some text <think>this is a thought</think> and more text.",
 * // it would yield:
 * // - { matched: false, data: "Some text " }
 * // - { matched: true, data: "this is a thought" }
 * // - { matched: false, data: " and more text." }
 *
 * @class XmlMatcher
 * @template Result - The type of the transformed chunk, defaults to {@link XmlMatcherChunk}.
 */
export class XmlMatcher<Result = XmlMatcherChunk> {
  private index = 0;
  private currentChunks: XmlMatcherChunk[] = [];
  private cachedBuffer: string[] = [];
  private isCurrentlyMatched: boolean = false;
  private tagDepth = 0;
  private pointer = 0; // Tracks overall character position for the `position` logic

  /**
   * Constructs an XmlMatcher.
   *
   * @param tagName The name of the XML tag to match (e.g., "think").
   * @param transform An optional function to transform the yielded {@link XmlMatcherChunk} into a custom Result type.
   * @param position The character position in the input stream at which matching should begin.
   *                 If 0, matching starts immediately. If greater than 0, characters before this
   *                 position are treated as unmatched text until the tag is encountered at or after
   *                 this position. This is useful if the tag is expected after some preamble.
   */
  constructor(
    readonly tagName: string,
    readonly transform?: (chunk: XmlMatcherChunk) => Result,
    readonly position = 0, // Character position to start active matching
  ) {}

  private S_TEXT = 0;
  private S_TAG_OPEN = 1; // Expecting tag name or '/'
  private S_TAG_NAME = 2; // Matching tag name characters
  private S_TAG_CLOSING_SLASH = 3; // Found '</', expecting tag name
  private S_IGNORE_UNTIL_GT = 4; // Inside a tag, but not the one we are tracking (e.g. attributes)

  private state: number = this.S_TEXT;


  private collectCurrentCache(newMatchStatus?: boolean): void {
    if (this.cachedBuffer.length === 0) {
      if (newMatchStatus !== undefined && this.currentChunks.length > 0) {
         // If there's a status change but no new data, ensure the last chunk reflects the old status.
         // This is more about ensuring the `isCurrentlyMatched` reflects the status of yielded data.
      }
      return;
    }

    const data = this.cachedBuffer.join("");
    this.cachedBuffer = [];
    const statusToUse = newMatchStatus === undefined ? this.isCurrentlyMatched : !newMatchStatus; // if newMatchStatus is defined, it means we are exiting a state

    const lastChunk = this.currentChunks.length > 0 ? this.currentChunks[this.currentChunks.length - 1] : null;

    if (lastChunk && lastChunk.matched === statusToUse) {
      lastChunk.data += data;
    } else {
      this.currentChunks.push({
        matched: statusToUse,
        data: data,
      });
    }
  }

  private flushProcessedChunks(): Result[] {
    const chunksToYield = this.currentChunks;
    this.currentChunks = [];
    if (this.transform) {
      return chunksToYield.map(this.transform);
    }
    return chunksToYield as unknown as Result[];
  }

  /**
   * Processes an incoming chunk of text.
   *
   * @param chunk The text chunk to process.
   * @returns An array of transformed results based on the matched segments.
   */
  update(chunk: string): Result[] {
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      this.pointer++;

      if (this.state === this.S_TEXT) {
        if (char === '<' && (this.pointer > this.position || this.isCurrentlyMatched || this.tagDepth > 0) ) {
          this.collectCurrentCache();
          this.state = this.S_TAG_OPEN;
          this.cachedBuffer.push(char);
        } else {
          this.cachedBuffer.push(char);
        }
      } else if (this.state === this.S_TAG_OPEN) { // After '<'
        this.cachedBuffer.push(char);
        if (char === '/') {
          this.state = this.S_TAG_CLOSING_SLASH;
          this.index = 0;
        } else if (char.match(/[a-zA-Z]/)) { // Start of a tag name
          this.state = this.S_TAG_NAME;
          this.index = 0;
          // Re-evaluate this char in S_TAG_NAME state
          this.cachedBuffer.pop(); // Remove char from buffer as it's part of tag name
          i--; // Reprocess this character
        } else { // Not a valid tag start after '<' (e.g., '< foo'), treat as text
          this.state = this.S_TEXT;
        }
      } else if (this.state === this.S_TAG_NAME) { // Matching opening tag name
        if (this.index < this.tagName.length && char === this.tagName[this.index]) {
          this.cachedBuffer.push(char);
          this.index++;
        } else if (char === '>' && this.index === this.tagName.length) { // Matched full <tagName>
          this.cachedBuffer.push(char);
          this.collectCurrentCache(true); // Content before this tag was not matched
          this.isCurrentlyMatched = true;
          this.tagDepth++;
          this.state = this.S_TEXT;
          this.cachedBuffer = []; // Clear buffer like <think>
        } else if ((char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '>') && this.index === this.tagName.length) {
          // Tag name matched, now expecting attributes or '>'
          this.cachedBuffer.push(char);
          if (char === '>') { // Self-closing or no attributes <tagName>
             this.collectCurrentCache(true);
             this.isCurrentlyMatched = true;
             this.tagDepth++;
             this.state = this.S_TEXT;
             this.cachedBuffer = [];
          } else { // Attributes might follow
            this.state = this.S_IGNORE_UNTIL_GT;
          }
        }
        else { // Mismatch or other tag
          this.state = this.S_IGNORE_UNTIL_GT; // Treat as part of some other tag
          this.cachedBuffer.push(char);
        }
      } else if (this.state === this.S_TAG_CLOSING_SLASH) { // After '</'
         this.cachedBuffer.push(char);
        if (this.index < this.tagName.length && char === this.tagName[this.index]) {
          this.index++;
        } else if (char === '>' && this.index === this.tagName.length) { // Matched full </tagName>
          this.collectCurrentCache(false); // Content before this was matched
          this.tagDepth--;
          this.isCurrentlyMatched = (this.tagDepth > 0);
          this.state = this.S_TEXT;
          this.cachedBuffer = []; // Clear buffer like </think>
        } else { // Mismatch or other closing tag
          this.state = this.S_IGNORE_UNTIL_GT; // Treat as part of some other tag
        }
      } else if (this.state === this.S_IGNORE_UNTIL_GT) {
        this.cachedBuffer.push(char);
        if (char === '>') { // End of an ignored tag
          this.state = this.S_TEXT;
        }
      }
    }
    return this.flushProcessedChunks();
  }

  /**
   * Finalizes processing, flushing any remaining buffered text.
   *
   * @param chunk An optional final text chunk to process.
   * @returns An array of transformed results.
   */
  final(chunk?: string): Result[] {
    if (chunk) {
      this.update(chunk); // Process final chunk, which will also call flushProcessedChunks
    }
    this.collectCurrentCache(); // Collect any remaining data in buffer
    return this.flushProcessedChunks();
  }
}