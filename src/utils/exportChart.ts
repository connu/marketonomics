// SVG → PNG chart export with no dependencies: clone the chart's <svg>,
// serialize it into a data: URL (avoids canvas-tainting edge cases of blob
// URLs), rasterize onto a 2x canvas pre-filled with the theme background so
// dark-mode exports don't come out transparent.

export async function exportChartPng(
  container: HTMLElement | null,
  filename: string,
  background: string
): Promise<void> {
  const svg = container?.querySelector('svg')
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(rect.width))
  clone.setAttribute('height', String(rect.height))

  const xml = new XMLSerializer().serializeToString(clone)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG rasterization failed'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  })

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rect.width * scale)
  canvas.height = Math.round(rect.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
