import { useEffect } from "react"

export type PageSeoOptions = {
  title?: string
  description?: string
  canonical?: string
  ogType?: "website" | "article" | "profile"
  ogImage?: string
  twitterCard?: "summary" | "summary_large_image"
  productPrice?: string
  jsonLd?: Record<string, unknown>
}

const DEFAULT_TITLE = "Skillsbay — Trusted Paid Agent Skills"
const DEFAULT_DESCRIPTION =
  "Buy versioned private skills, verify the purchase on-chain, and install the unlocked release directly into your agent workspace."
const DEFAULT_OG_IMAGE = "/skillsbay-og.png"

function setMetaTag(selector: string, attributeName: string, attributeValue: string, content: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attributeName, attributeValue)
    document.head.appendChild(element)
  }
  element.setAttribute("content", content)
}

function setLinkTag(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!element) {
    element = document.createElement("link")
    element.setAttribute("rel", rel)
    document.head.appendChild(element)
  }
  element.setAttribute("href", href)
}

function setJsonLd(data: Record<string, unknown> | undefined) {
  const SCRIPT_ID = "skillsbay-jsonld"
  let element = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (!data) {
    if (element) element.remove()
    return
  }
  if (!element) {
    element = document.createElement("script")
    element.id = SCRIPT_ID
    element.type = "application/ld+json"
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(data)
}

export function usePageSeo(options: PageSeoOptions) {
  useEffect(() => {
    const origin = window.location.origin
    const title = options.title || DEFAULT_TITLE
    const description = options.description || DEFAULT_DESCRIPTION
    const canonical = options.canonical ? (options.canonical.startsWith("http") ? options.canonical : `${origin}${options.canonical}`) : window.location.href
    const ogImage = options.ogImage ? (options.ogImage.startsWith("http") ? options.ogImage : `${origin}${options.ogImage}`) : `${origin}${DEFAULT_OG_IMAGE}`
    const ogType = options.ogType || "website"
    const twitterCard = options.twitterCard || "summary_large_image"

    // Document title
    document.title = title

    // Standard description & canonical
    setMetaTag('meta[name="description"]', "name", "description", description)
    setLinkTag("canonical", canonical)

    // Open Graph
    setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "Skillsbay")
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType)
    setMetaTag('meta[property="og:title"]', "property", "og:title", title)
    setMetaTag('meta[property="og:description"]', "property", "og:description", description)
    setMetaTag('meta[property="og:url"]', "property", "og:url", canonical)
    setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage)
    setMetaTag('meta[property="og:image:width"]', "property", "og:image:width", "1200")
    setMetaTag('meta[property="og:image:height"]', "property", "og:image:height", "630")
    setMetaTag('meta[property="og:image:alt"]', "property", "og:image:alt", title)

    // Twitter / X
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", twitterCard)
    setMetaTag('meta[name="twitter:site"]', "name", "twitter:site", "@skillsbay")
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title)
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description)
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImage)

    // Product Price if applicable
    if (options.productPrice) {
      setMetaTag('meta[property="product:price:amount"]', "property", "product:price:amount", options.productPrice)
      setMetaTag('meta[property="product:price:currency"]', "property", "product:price:currency", "USD")
    }

    // JSON-LD structured data
    setJsonLd(options.jsonLd)
  }, [
    options.title,
    options.description,
    options.canonical,
    options.ogType,
    options.ogImage,
    options.twitterCard,
    options.productPrice,
    options.jsonLd,
  ])
}
