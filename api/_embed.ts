// api/_embed.ts
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not set')

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  })

  if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)

  const data: number[] | number[][] = await res.json()

  // sentence-transformers returns float[] for a single string
  if (Array.isArray(data) && typeof data[0] === 'number') return data as number[]
  // fallback: first row of batch response
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0] as number[]

  throw new Error('Unexpected embedding response shape')
}
