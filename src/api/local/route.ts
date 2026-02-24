// Simple local route handler for Node.js
// This can be used for local API testing

export const handler = async (request: Request) => {
  try {
    // Simple GET endpoint
    if (request.method === 'GET') {
      return Response.json({
        message: 'Hello from local route!',
        timestamp: new Date().toISOString()
      });
    }

    // Simple POST endpoint
    if (request.method === 'POST') {
      const body = await request.json();
      return Response.json({
        received: body,
        message: 'Data received successfully',
        timestamp: new Date().toISOString()
      });
    }

    // Method not allowed
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
