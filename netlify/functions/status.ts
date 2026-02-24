import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    } as Record<string, string>,
    body: JSON.stringify({
      status: 'ok',
      message: 'Netlify functions server is running',
      timestamp: new Date().toISOString()
    })
  }
}