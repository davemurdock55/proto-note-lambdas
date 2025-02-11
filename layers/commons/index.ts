export const sendResponse = (payload: any, statusCode: number = 200, headers: any = { "Content-Type": "application/json" }) => {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  };
};
