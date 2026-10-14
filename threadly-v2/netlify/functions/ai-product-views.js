const VIEW_PROMPTS = {
  front: "Create a clean e-commerce product photograph showing the exact same item from the front, centered on a neutral light studio background. Preserve the product's real color, silhouette, pattern, material, hardware, branding, and included quantity. Do not add accessories, text, logos, or extra items.",
  side: "Create a product photograph of the exact same item from a clear side or alternate three-quarter angle. Preserve its real color, silhouette, pattern, material, hardware, branding, proportions, and included quantity. Do not invent design details or add text.",
  back: "Create a product photograph showing the back/rear view of the exact same item when physically applicable. Preserve all known design details. If the back cannot be inferred reliably from the source, make a conservative alternate angle rather than inventing features. Neutral studio background; no text.",
  detail: "Create a close-up e-commerce photograph of a real detail visible in the source image, such as texture, stitching, clasp, seams, finish, or print. Preserve the exact product and material; do not invent embellishments or text.",
  model: "Create a tasteful e-commerce lifestyle photograph showing the same product being worn or used by a person, only if this product category is wearable or usable on a person. Keep the item itself faithful to the source image in color, shape, pattern, material, and hardware. Do not add branding or text. For non-wearable products, show it naturally in use instead."
};

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": process.env.URL || "*",
    "access-control-allow-headers": "content-type,x-studio-token",
    "access-control-allow-methods": "POST,OPTIONS"
  },
  body: JSON.stringify(payload)
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST." });

  const expectedToken = process.env.JUNO_AI_STUDIO_TOKEN;
  const suppliedToken = event.headers["x-studio-token"] || event.headers["X-Studio-Token"];
  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return json(401, { error: "AI Studio is not configured or the studio token is invalid. Set JUNO_AI_STUDIO_TOKEN in Netlify environment variables." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return json(503, { error: "Image generation is not configured. Add OPENAI_API_KEY to Netlify environment variables." });
  }

  let input;
  try { input = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Request body must be valid JSON." }); }

  const { imageDataUrl, productName = "Product", category = "fashion accessory", views = ["front", "side", "back", "detail", "model"] } = input;
  if (typeof imageDataUrl !== "string" || !/^data:image\/(png|jpeg|webp);base64,/i.test(imageDataUrl)) {
    return json(400, { error: "Upload a PNG, JPG or WebP product image." });
  }
  const base64 = imageDataUrl.split(",")[1];
  if (!base64 || Buffer.byteLength(base64, "base64") > 12 * 1024 * 1024) {
    return json(413, { error: "Image is empty or exceeds the 12 MB limit." });
  }
  const requestedViews = [...new Set(views)].filter((view) => Object.hasOwn(VIEW_PROMPTS, view)).slice(0, 5);
  if (!requestedViews.length) return json(400, { error: "Choose at least one supported view." });

  const mime = imageDataUrl.slice(5, imageDataUrl.indexOf(";"));
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const source = Buffer.from(base64, "base64");
  const results = [];

  for (const view of requestedViews) {
    try {
      const form = new FormData();
      form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
      form.append("prompt", "Juno ecommerce product photography. Product name: " + String(productName).slice(0, 120) + ". Category: " + String(category).slice(0, 80) + ". " + VIEW_PROMPTS[view] + " This is a generated visual draft, not a verified product specification.");
      form.append("size", "1024x1024");
      form.append("image", new Blob([source], { type: mime }), "source." + ext);
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { authorization: "Bearer " + process.env.OPENAI_API_KEY },
        body: form
      });
      const data = await response.json();
      if (!response.ok) {
        results.push({ view, error: data.error?.message || "Image provider request failed." });
        continue;
      }
      const image = data.data?.[0]?.b64_json;
      if (!image) {
        results.push({ view, error: "The image provider returned no image data." });
        continue;
      }
      results.push({ view, mimeType: "image/png", dataUrl: "data:image/png;base64," + image });
    } catch (error) {
      results.push({ view, error: error?.message || "Image generation failed." });
    }
  }

  return json(200, {
    productName: String(productName).slice(0, 120),
    category: String(category).slice(0, 80),
    generatedAt: new Date().toISOString(),
    reviewRequired: true,
    note: "Inspect every generated view against the original product before publishing. Generated images are returned for review and are not automatically written to the product database.",
    results
  });
};
