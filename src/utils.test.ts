import { describe, it, expect } from "vitest"
import { stripLangTags } from "./utils.js"

describe("stripLangTags", () => {
  it("should remove self-closing lang tags", () => {
    const input = '<lang primary="en-US"/>Hello world'
    const expected = "Hello world"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should remove opening and closing lang tags", () => {
    const input = '<lang primary="en-US">Hello world</lang>'
    const expected = "Hello world"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should remove multiple lang tags", () => {
    const input =
      '<lang primary="en-US">Hello</lang> <lang primary="fr-FR">Bonjour</lang>'
    const expected = "Hello Bonjour"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should handle text without lang tags", () => {
    const input = "Hello world"
    const expected = "Hello world"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should handle empty string", () => {
    const input = ""
    const expected = ""
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should preserve other XML/HTML tags", () => {
    const input = '<lang primary="en-US"/><strong>Hello</strong> <em>world</em>'
    const expected = "<strong>Hello</strong> <em>world</em>"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should handle lang tags with various attributes", () => {
    const input =
      '<lang primary="en-US" secondary="es-ES" confidence="0.95">Hello</lang>'
    const expected = "Hello"
    expect(stripLangTags(input)).toBe(expected)
  })

  it("should handle multiline text with lang tags", () => {
    const input = `<lang primary="en-US">Line 1</lang>
<lang primary="en-US">Line 2</lang>
<lang primary="en-US">Line 3</lang>`
    const expected = `Line 1
Line 2
Line 3`
    expect(stripLangTags(input)).toBe(expected)
  })
})
